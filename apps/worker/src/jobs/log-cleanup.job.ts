// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { PrismaClient } from '@tcrn/database';
import type { Job, Processor } from 'bullmq';

import { logLogger as logger } from '../logger';

/**
 * Log cleanup job data
 */
export interface LogCleanupJobData {
  tenantSchemaName: string;
}

/**
 * Get retention period in days based on environment
 */
function getRetentionDays(): number {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return parseInt(process.env.LOG_RETENTION_DAYS || '60', 10);
    case 'staging':
      return parseInt(process.env.LOG_RETENTION_DAYS || '30', 10);
    default:
      return parseInt(process.env.LOG_RETENTION_DAYS || '7', 10);
  }
}

/**
 * Log Cleanup Processor
 * Handles log partition management and old log cleanup
 * Should be scheduled to run daily (e.g., at 3 AM)
 */
export const processLogCleanup: Processor<LogCleanupJobData> = async (
  job: Job<LogCleanupJobData>,
) => {
  const data = job.data;
  const prisma = new PrismaClient();
  const startTime = Date.now();

  try {
    logger.info(`Starting log cleanup job ${job.id} for schema ${data.tenantSchemaName}`);

    const retentionDays = getRetentionDays();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Delete old change logs
    const changeLogResult = await prisma.$executeRawUnsafe(
      `DELETE FROM "${data.tenantSchemaName}".change_log WHERE occurred_at < $1`,
      cutoffDate,
    );

    // Delete old technical event logs
    const techEventResult = await prisma.$executeRawUnsafe(
      `DELETE FROM "${data.tenantSchemaName}".technical_event_log WHERE occurred_at < $1`,
      cutoffDate,
    );

    // Delete old integration logs
    const integrationResult = await prisma.$executeRawUnsafe(
      `DELETE FROM "${data.tenantSchemaName}".integration_log WHERE occurred_at < $1`,
      cutoffDate,
    );

    const duration = Date.now() - startTime;

    logger.info(
      `Log cleanup job ${job.id} completed in ${duration}ms: change_logs=${changeLogResult}, tech_events=${techEventResult}, integration_logs=${integrationResult}`,
    );

    // Log completion event
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${data.tenantSchemaName}".technical_event_log 
       (id, occurred_at, severity, event_type, scope, source, message, payload_json)
       VALUES (gen_random_uuid(), NOW(), 'info', 'LOG_CLEANUP_COMPLETED', 'general', 'log-cleanup-job', $1, $2)`,
      `Log cleanup completed in ${duration}ms`,
      JSON.stringify({
        retention_days: retentionDays,
        duration_ms: duration,
        deleted_change_logs: changeLogResult,
        deleted_tech_events: techEventResult,
        deleted_integration_logs: integrationResult,
      }),
    );
  } catch (error) {
    logger.error(`Log cleanup job ${job.id} failed: ${error instanceof Error ? error.message : String(error)}`);

    // Log error event
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${data.tenantSchemaName}".technical_event_log 
         (id, occurred_at, severity, event_type, scope, source, message, payload_json)
         VALUES (gen_random_uuid(), NOW(), 'error', 'SYSTEM_ERROR', 'general', 'log-cleanup-job', $1, $2)`,
        'Log cleanup job failed',
        JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      );
    } catch {
      // Ignore logging errors
    }

    throw error;
  } finally {
    await prisma.$disconnect();
  }
};
