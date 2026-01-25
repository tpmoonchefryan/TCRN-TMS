// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// PII Service Health Check Job Processor (PRD §11 - PII Data Separation)

import { PrismaClient } from '@tcrn/database';
import type { Job, Processor, Queue } from 'bullmq';

import { piiHealthCheckLogger as logger } from '../logger';

/**
 * PII health check job data
 */
export interface PiiHealthCheckJobData {
  jobId: string;
  checkAll?: boolean; // If true, check all configs. Otherwise, only active ones.
}

/**
 * PII health check result for a single config
 */
export interface PiiHealthCheckResult {
  configId: string;
  configCode: string;
  apiUrl: string;
  status: 'ok' | 'error' | 'timeout';
  latencyMs: number;
  errorMessage?: string;
  checkedAt: string;
}

/**
 * PII health check job result
 */
export interface PiiHealthCheckJobResult {
  totalConfigs: number;
  healthyCount: number;
  unhealthyCount: number;
  results: PiiHealthCheckResult[];
}

/**
 * Health check timeout in milliseconds
 */
const HEALTH_CHECK_TIMEOUT_MS = 10000;

/**
 * Check health of a single PII service
 */
async function checkPiiServiceHealth(
  apiUrl: string
): Promise<{ status: 'ok' | 'error' | 'timeout'; latencyMs: number; error?: string }> {
  const startTime = Date.now();
  const healthUrl = `${apiUrl.replace(/\/+$/, '')}/health`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      return {
        status: 'error',
        latencyMs,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json() as { status?: string };
    
    if (data.status === 'ok') {
      return { status: 'ok', latencyMs };
    }

    return {
      status: 'error',
      latencyMs,
      error: `Health status: ${data.status || 'unknown'}`,
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;

    if (error.name === 'AbortError') {
      return {
        status: 'timeout',
        latencyMs,
        error: `Request timed out after ${HEALTH_CHECK_TIMEOUT_MS}ms`,
      };
    }

    return {
      status: 'error',
      latencyMs,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * PII health check job processor
 * Checks health of all configured PII services and updates their status
 */
export const piiHealthCheckJobProcessor: Processor<PiiHealthCheckJobData, PiiHealthCheckJobResult> = async (
  job: Job<PiiHealthCheckJobData, PiiHealthCheckJobResult>
) => {
  const { jobId, checkAll } = job.data;
  const startTime = Date.now();

  logger.info(`Processing PII health check job ${jobId}`);

  const prisma = new PrismaClient();
  const result: PiiHealthCheckJobResult = {
    totalConfigs: 0,
    healthyCount: 0,
    unhealthyCount: 0,
    results: [],
  };

  try {
    // 1. Get all PII service configurations
    const configs = await prisma.piiServiceConfig.findMany({
      where: checkAll ? {} : { isActive: true },
      select: {
        id: true,
        code: true,
        apiUrl: true,
        isHealthy: true,
        lastHealthCheckAt: true,
      },
    });

    result.totalConfigs = configs.length;
    logger.info(`Found ${configs.length} PII service configs to check`);

    if (configs.length === 0) {
      logger.info('No PII service configs found');
      return result;
    }

    // 2. Check health of each service
    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      logger.info(`Checking PII service: ${config.code} (${config.apiUrl})`);

      const healthResult = await checkPiiServiceHealth(config.apiUrl);
      const isHealthy = healthResult.status === 'ok';

      // Store result
      result.results.push({
        configId: config.id,
        configCode: config.code,
        apiUrl: config.apiUrl,
        status: healthResult.status,
        latencyMs: healthResult.latencyMs,
        errorMessage: healthResult.error,
        checkedAt: new Date().toISOString(),
      });

      if (isHealthy) {
        result.healthyCount++;
      } else {
        result.unhealthyCount++;
      }

      // 3. Update config status in database
      const statusChanged = config.isHealthy !== isHealthy;
      
      await prisma.piiServiceConfig.update({
        where: { id: config.id },
        data: {
          isHealthy,
          lastHealthCheckAt: new Date(),
        },
      });

      if (statusChanged) {
        logger.warn(
          `PII service ${config.code} status changed: ${config.isHealthy ? 'healthy' : 'unhealthy'} → ${isHealthy ? 'healthy' : 'unhealthy'}`
        );
      }

      // Update progress
      const progress = Math.round(((i + 1) / configs.length) * 100);
      await job.updateProgress(progress);
    }

    const duration = Date.now() - startTime;
    logger.info(`PII health check job ${jobId} completed in ${duration}ms`);
    logger.info(`Healthy: ${result.healthyCount}/${result.totalConfigs}, Unhealthy: ${result.unhealthyCount}`);

    return result;
  } catch (error: any) {
    logger.error(`PII health check job ${jobId} failed: ${error.message}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Schedule a PII health check job
 * Called by cron scheduler (recommended: every 60 seconds)
 */
export async function schedulePiiHealthCheckJob(queue: Queue): Promise<string> {
  const jobId = `pii_health_${Date.now()}`;

  await queue.add(
    'pii-health-check',
    {
      jobId,
      checkAll: false, // Only check active configs
    },
    {
      jobId,
      removeOnComplete: {
        count: 100, // Keep last 100 health check results
      },
      removeOnFail: {
        count: 50,
      },
    }
  );

  logger.info(`Scheduled PII health check job ${jobId}`);
  return jobId;
}

/**
 * Setup recurring PII health check
 * Uses BullMQ's repeatJobKey to ensure only one job at a time
 */
export async function setupPiiHealthCheckCron(queue: Queue, intervalSeconds: number = 60): Promise<void> {
  await queue.add(
    'pii-health-check',
    {
      jobId: 'pii_health_cron',
      checkAll: false,
    },
    {
      repeat: {
        every: intervalSeconds * 1000,
      },
      jobId: 'pii-health-check-cron',
      removeOnComplete: {
        count: 100,
      },
      removeOnFail: {
        count: 50,
      },
    }
  );

  logger.info(`Setup PII health check cron job (every ${intervalSeconds}s)`);
}
