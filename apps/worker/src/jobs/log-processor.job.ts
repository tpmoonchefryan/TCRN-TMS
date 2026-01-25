// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { PrismaClient } from '@tcrn/database';
import type { Job, Processor } from 'bullmq';

import { logLogger as logger } from '../logger';

/**
 * Technical event log job data
 */
export interface TechEventJobData {
  tenantSchemaName: string;
  occurred_at: string;
  severity: string;
  event_type: string;
  scope: string;
  trace_id?: string;
  span_id?: string;
  source?: string;
  message?: string;
  payload_json?: Record<string, unknown>;
  error_code?: string;
  error_stack?: string;
}

/**
 * Integration log job data
 */
export interface IntegrationJobData {
  tenantSchemaName: string;
  occurred_at: string;
  consumer_id?: string;
  consumer_code?: string;
  direction: string;
  endpoint: string;
  method?: string;
  request_headers?: Record<string, string>;
  request_body?: unknown;
  response_status?: number;
  response_body?: unknown;
  latency_ms?: number;
  error_message?: string;
  trace_id?: string;
}

const lokiUrl = process.env.LOKI_PUSH_URL || 'http://loki:3100/loki/api/v1/push';
const lokiEnabled = process.env.LOKI_ENABLED === 'true';

/**
 * Push to Loki
 */
async function pushToLoki(
  stream: string,
  labels: Record<string, string>,
  timestamp: string,
  data: unknown,
): Promise<void> {
  if (!lokiEnabled) return;

  try {
    const ts = new Date(timestamp);
    const payload = {
      streams: [
        {
          stream: {
            app: 'tcrn-tms',
            stream,
            ...labels,
          },
          values: [
            [(ts.getTime() * 1000000).toString(), JSON.stringify(data)],
          ],
        },
      ],
    };

    const response = await fetch(lokiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      logger.warn(`Loki push failed: ${response.status}`);
    }
  } catch (error) {
    logger.warn(`Loki push error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Tech Event Log Processor
 */
export const processTechEventLog: Processor<TechEventJobData> = async (
  job: Job<TechEventJobData>,
) => {
  const data = job.data;
  const prisma = new PrismaClient();

  try {
    logger.info(`Processing tech event log job ${job.id}`);

    // Write to PostgreSQL using raw SQL for multi-tenant support
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${data.tenantSchemaName}".technical_event_log 
       (id, occurred_at, severity, event_type, scope, trace_id, span_id, source, message, payload_json, error_code, error_stack)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      new Date(data.occurred_at),
      data.severity,
      data.event_type,
      data.scope || 'general',
      data.trace_id || null,
      data.span_id || null,
      data.source || null,
      data.message || null,
      data.payload_json ? JSON.stringify(data.payload_json) : null,
      data.error_code || null,
      data.error_stack || null,
    );

    // Push to Loki
    await pushToLoki(
      'technical_event_log',
      { severity: data.severity, event_type: data.event_type, scope: data.scope || 'general' },
      data.occurred_at,
      data,
    );

    logger.info(`Tech event log job ${job.id} completed`);
  } catch (error) {
    logger.error(`Tech event log job ${job.id} failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Integration Log Processor
 */
export const processIntegrationLog: Processor<IntegrationJobData> = async (
  job: Job<IntegrationJobData>,
) => {
  const data = job.data;
  const prisma = new PrismaClient();

  try {
    logger.info(`Processing integration log job ${job.id}`);

    // Write to PostgreSQL using raw SQL for multi-tenant support
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${data.tenantSchemaName}".integration_log 
       (id, occurred_at, consumer_id, consumer_code, direction, endpoint, method, request_headers, request_body, response_status, response_body, latency_ms, error_message, trace_id)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      new Date(data.occurred_at),
      data.consumer_id || null,
      data.consumer_code || null,
      data.direction,
      data.endpoint,
      data.method || null,
      data.request_headers ? JSON.stringify(data.request_headers) : null,
      data.request_body ? JSON.stringify(data.request_body) : null,
      data.response_status || null,
      data.response_body ? JSON.stringify(data.response_body) : null,
      data.latency_ms || null,
      data.error_message || null,
      data.trace_id || null,
    );

    // Push to Loki
    await pushToLoki(
      'integration_log',
      { direction: data.direction, consumer_code: data.consumer_code || 'unknown', status: data.response_status?.toString() || 'unknown' },
      data.occurred_at,
      data,
    );

    logger.info(`Integration log job ${job.id} completed`);
  } catch (error) {
    logger.error(`Integration log job ${job.id} failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};
