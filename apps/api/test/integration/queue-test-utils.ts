// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { ConnectionOptions, Job } from 'bullmq';
import { Queue } from 'bullmq';

const EXPORT_QUEUE_NAME = 'export';
const IMPORT_QUEUE_NAME = 'import';
const EXPORT_QUEUE_JOB_STATES = ['waiting', 'active', 'delayed', 'failed', 'completed'] as const;
const IMPORT_QUEUE_JOB_STATES = ['waiting', 'active', 'delayed', 'failed', 'completed'] as const;

interface ExportQueueJobData {
  jobId?: string;
  tenantSchema?: string;
}

interface ImportQueueJobData {
  jobId?: string;
}

export function createBullMqConnectionFromEnv(): ConnectionOptions {
  const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
  const dbValue = redisUrl.pathname.replace(/^\//, '');
  const db = dbValue ? Number(dbValue) : undefined;

  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || '6379'),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    db: Number.isNaN(db ?? Number.NaN) ? undefined : db,
    ...(redisUrl.protocol === 'rediss:' ? { tls: {} } : {}),
  } as ConnectionOptions;
}

async function withExportQueue<T>(
  fn: (queue: Queue<ExportQueueJobData>) => Promise<T>,
): Promise<T> {
  const queue = new Queue<ExportQueueJobData>(EXPORT_QUEUE_NAME, {
    connection: createBullMqConnectionFromEnv(),
  });

  try {
    return await fn(queue);
  } finally {
    await queue.close();
  }
}

async function withImportQueue<T>(
  fn: (queue: Queue<ImportQueueJobData>) => Promise<T>,
): Promise<T> {
  const queue = new Queue<ImportQueueJobData>(IMPORT_QUEUE_NAME, {
    connection: createBullMqConnectionFromEnv(),
  });

  try {
    return await fn(queue);
  } finally {
    await queue.close();
  }
}

async function getExportQueueJobs(
  queue: Queue<ExportQueueJobData>,
): Promise<Array<Job<ExportQueueJobData>>> {
  return queue.getJobs([...EXPORT_QUEUE_JOB_STATES], 0, -1, true);
}

async function getImportQueueJobs(
  queue: Queue<ImportQueueJobData>,
): Promise<Array<Job<ImportQueueJobData>>> {
  return queue.getJobs([...IMPORT_QUEUE_JOB_STATES], 0, -1, true);
}

export async function removeExportQueueJobsByDataJobIds(
  jobIds: Iterable<string>,
): Promise<number> {
  const ids = new Set([...jobIds].filter(Boolean));
  if (ids.size === 0) {
    return 0;
  }

  return withExportQueue(async (queue) => {
    const jobs = await getExportQueueJobs(queue);
    let removed = 0;

    for (const job of jobs) {
      const queueJobId = job.data?.jobId;
      if (!queueJobId || !ids.has(queueJobId)) {
        continue;
      }

      await job.remove();
      removed++;
    }

    return removed;
  });
}

export async function purgeWaitingExportJobsForTenantTestSchemas(): Promise<number> {
  return withExportQueue(async (queue) => {
    const jobs = await queue.getJobs(['waiting'], 0, -1, true);
    let removed = 0;

    for (const job of jobs) {
      const tenantSchema = job.data?.tenantSchema;
      if (!tenantSchema?.startsWith('tenant_test_')) {
        continue;
      }

      await job.remove();
      removed++;
    }

    return removed;
  });
}

export async function removeImportQueueJobsByDataJobIds(
  jobIds: Iterable<string>,
): Promise<number> {
  const ids = new Set([...jobIds].filter(Boolean));
  if (ids.size === 0) {
    return 0;
  }

  return withImportQueue(async (queue) => {
    const jobs = await getImportQueueJobs(queue);
    let removed = 0;

    for (const job of jobs) {
      const queueJobId = job.data?.jobId;
      if (!queueJobId || !ids.has(queueJobId)) {
        continue;
      }

      await job.remove();
      removed++;
    }

    return removed;
  });
}

export async function findImportQueueJobByDataJobId(
  jobId: string,
): Promise<Job<ImportQueueJobData> | null> {
  return withImportQueue(async (queue) => {
    const jobs = await getImportQueueJobs(queue);
    return jobs.find((job) => job.data?.jobId === jobId) ?? null;
  });
}
