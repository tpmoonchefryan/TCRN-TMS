// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { ConnectionOptions, Job } from 'bullmq';
import { Queue } from 'bullmq';

const EXPORT_QUEUE_NAMES = ['export', 'marshmallow-export'] as const;
const IMPORT_QUEUE_NAME = 'import';
const EXPORT_QUEUE_JOB_STATES = ['waiting', 'active', 'delayed', 'failed', 'completed'] as const;
const IMPORT_QUEUE_JOB_STATES = ['waiting', 'active', 'delayed', 'failed', 'completed'] as const;
type ExportQueueName = (typeof EXPORT_QUEUE_NAMES)[number];

interface ExportQueueJobData {
  jobId?: string;
  tenantSchema?: string;
}

interface ImportQueueJobData {
  jobId?: string;
  tenantSchemaName?: string;
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
  queueName: ExportQueueName,
  fn: (queue: Queue<ExportQueueJobData>) => Promise<T>
): Promise<T> {
  const queue = new Queue<ExportQueueJobData>(queueName, {
    connection: createBullMqConnectionFromEnv(),
  });

  try {
    return await fn(queue);
  } finally {
    await queue.close();
  }
}

async function withAllExportQueues<T>(
  fn: (queueName: ExportQueueName, queue: Queue<ExportQueueJobData>) => Promise<T>
): Promise<T[]> {
  const results: T[] = [];

  for (const queueName of EXPORT_QUEUE_NAMES) {
    results.push(await withExportQueue(queueName, (queue) => fn(queueName, queue)));
  }

  return results;
}

async function withImportQueue<T>(
  fn: (queue: Queue<ImportQueueJobData>) => Promise<T>
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
  queue: Queue<ExportQueueJobData>
): Promise<Array<Job<ExportQueueJobData>>> {
  return queue.getJobs([...EXPORT_QUEUE_JOB_STATES], 0, -1, true);
}

async function getImportQueueJobs(
  queue: Queue<ImportQueueJobData>
): Promise<Array<Job<ImportQueueJobData>>> {
  return queue.getJobs([...IMPORT_QUEUE_JOB_STATES], 0, -1, true);
}

export async function removeExportQueueJobsByDataJobIds(jobIds: Iterable<string>): Promise<number> {
  const ids = new Set([...jobIds].filter(Boolean));
  if (ids.size === 0) {
    return 0;
  }

  const removedCounts = await withAllExportQueues(async (_queueName, queue) => {
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

  return removedCounts.reduce((total, count) => total + count, 0);
}

export async function purgeWaitingExportJobsForTenantTestSchemas(): Promise<number> {
  const removedCounts = await withAllExportQueues(async (_queueName, queue) => {
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

  return removedCounts.reduce((total, count) => total + count, 0);
}

export async function findExportQueueJobByDataJobId(
  jobId: string
): Promise<{ job: Job<ExportQueueJobData>; queueName: ExportQueueName } | null> {
  const results = await withAllExportQueues(async (queueName, queue) => {
    const jobs = await getExportQueueJobs(queue);
    const job = jobs.find((candidate) => candidate.data?.jobId === jobId) ?? null;

    if (!job) {
      return null;
    }

    return { job, queueName };
  });

  return results.find((result) => result !== null) ?? null;
}

export async function removeImportQueueJobsByDataJobIds(jobIds: Iterable<string>): Promise<number> {
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

export async function purgeWaitingImportJobsForTenantTestSchemas(): Promise<number> {
  return withImportQueue(async (queue) => {
    const jobs = await queue.getJobs(['waiting'], 0, -1, true);
    let removed = 0;

    for (const job of jobs) {
      const tenantSchema = job.data?.tenantSchemaName;
      if (!tenantSchema?.startsWith('tenant_test_')) {
        continue;
      }

      await job.remove();
      removed++;
    }

    return removed;
  });
}

export async function findImportQueueJobByDataJobId(
  jobId: string
): Promise<Job<ImportQueueJobData> | null> {
  return withImportQueue(async (queue) => {
    const jobs = await getImportQueueJobs(queue);
    return jobs.find((job) => job.data?.jobId === jobId) ?? null;
  });
}
