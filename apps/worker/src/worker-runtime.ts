// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type {
  ConnectionOptions,
  Job,
  Processor,
  Worker as BullWorker,
  WorkerOptions,
} from 'bullmq';
import { Worker } from 'bullmq';

import { emailJobProcessor } from './jobs/email.job';
import { exportJobProcessor } from './jobs/export.job';
import { importJobProcessor } from './jobs/import.job';
import { processLogCleanup } from './jobs/log-cleanup.job';
import { processIntegrationLog, processTechEventLog } from './jobs/log-processor.job';
import { membershipRenewalJobProcessor } from './jobs/membership-renewal.job';
import { permissionJobProcessor } from './jobs/permission.job';
import { piiCleanupJobProcessor } from './jobs/pii-cleanup.job';
import { piiHealthCheckJobProcessor } from './jobs/pii-health-check.job';
import { reportJobProcessor } from './jobs/report.job';
import { workerLogger as logger } from './logger';
import { QUEUE_NAMES } from './queues';

type WorkerProcessor = (job: Job<unknown, unknown, string>) => Promise<unknown>;
type WorkerQueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

interface LogJobData {
  type?: string;
}

export interface WorkerEventLogger {
  info: (message: string) => void;
  error: (message: string) => void;
}

export interface WorkerDefinition {
  queueName: WorkerQueueName;
  processor: WorkerProcessor;
  options: Pick<WorkerOptions, 'concurrency' | 'limiter'>;
  initializedMessage: string;
}

export interface WorkerGroupDefinition {
  domain: 'customer-data' | 'platform-maintenance' | 'observability';
  definitions: readonly WorkerDefinition[];
}

export interface LogJobProcessors {
  processTechEventLog: WorkerProcessor;
  processIntegrationLog: WorkerProcessor;
}

const SINGLE_JOB_PER_SECOND = {
  max: 1,
  duration: 1000,
} as const;

const LOG_RATE_LIMIT = {
  max: 100,
  duration: 1000,
} as const;

const EMAIL_RATE_LIMIT = {
  max: 10,
  duration: 1000,
} as const;

export function createLogJobProcessor(
  processors: LogJobProcessors = {
    processIntegrationLog: processIntegrationLog as WorkerProcessor,
    processTechEventLog: processTechEventLog as WorkerProcessor,
  }
): Processor<LogJobData, unknown, string> {
  return async (job: Job<LogJobData, unknown, string>) => {
    const { type } = job.data;

    if (type === 'tech_event') {
      return processors.processTechEventLog(job);
    }

    if (type === 'integration_log') {
      return processors.processIntegrationLog(job);
    }

    throw new Error(`Unknown log job type: ${type}`);
  };
}

const LOG_JOB_PROCESSOR = createLogJobProcessor();

export const WORKER_GROUPS: readonly WorkerGroupDefinition[] = [
  {
    domain: 'customer-data',
    definitions: [
      {
        queueName: QUEUE_NAMES.IMPORT,
        processor: importJobProcessor as WorkerProcessor,
        options: {
          concurrency: 1,
          limiter: SINGLE_JOB_PER_SECOND,
        },
        initializedMessage: 'Import worker initialized',
      },
      {
        queueName: QUEUE_NAMES.REPORT,
        processor: reportJobProcessor as WorkerProcessor,
        options: {
          concurrency: 1,
          limiter: SINGLE_JOB_PER_SECOND,
        },
        initializedMessage: 'Report worker initialized',
      },
      {
        queueName: QUEUE_NAMES.EXPORT,
        processor: exportJobProcessor as WorkerProcessor,
        options: {
          concurrency: 2,
        },
        initializedMessage: 'Export worker initialized',
      },
      {
        queueName: QUEUE_NAMES.EMAIL,
        processor: emailJobProcessor as WorkerProcessor,
        options: {
          concurrency: 5,
          limiter: EMAIL_RATE_LIMIT,
        },
        initializedMessage: 'Email worker initialized',
      },
    ],
  },
  {
    domain: 'platform-maintenance',
    definitions: [
      {
        queueName: QUEUE_NAMES.PERMISSION,
        processor: permissionJobProcessor as WorkerProcessor,
        options: {
          concurrency: 1,
        },
        initializedMessage: 'Permission worker initialized',
      },
      {
        queueName: QUEUE_NAMES.MEMBERSHIP_RENEWAL,
        processor: membershipRenewalJobProcessor as WorkerProcessor,
        options: {
          concurrency: 1,
        },
        initializedMessage: 'Membership renewal worker initialized',
      },
      {
        queueName: QUEUE_NAMES.PII_CLEANUP,
        processor: piiCleanupJobProcessor as WorkerProcessor,
        options: {
          concurrency: 1,
        },
        initializedMessage: 'PII cleanup worker initialized',
      },
      {
        queueName: QUEUE_NAMES.LOG_CLEANUP,
        processor: processLogCleanup as WorkerProcessor,
        options: {
          concurrency: 1,
        },
        initializedMessage: 'Log cleanup worker initialized',
      },
      {
        queueName: QUEUE_NAMES.PII_HEALTH_CHECK,
        processor: piiHealthCheckJobProcessor as WorkerProcessor,
        options: {
          concurrency: 1,
        },
        initializedMessage: 'PII health check worker initialized',
      },
    ],
  },
  {
    domain: 'observability',
    definitions: [
      {
        queueName: QUEUE_NAMES.LOG,
        processor: LOG_JOB_PROCESSOR as WorkerProcessor,
        options: {
          concurrency: 5,
          limiter: LOG_RATE_LIMIT,
        },
        initializedMessage: 'Log worker initialized',
      },
    ],
  },
] as const;

export function getWorkerDefinitions(): WorkerDefinition[] {
  return WORKER_GROUPS.flatMap((group) => group.definitions);
}

export function attachWorkerEventHandlers(
  workers: readonly Pick<BullWorker, 'on'>[],
  eventLogger: WorkerEventLogger = logger
): void {
  for (const worker of workers) {
    worker.on('completed', (job) => {
      eventLogger.info(`Job ${job.id} completed in queue ${job.queueName}`);
    });

    worker.on('failed', (job, error) => {
      eventLogger.error(`Job ${job?.id} failed in queue ${job?.queueName}: ${error.message}`);
    });

    worker.on('error', (error) => {
      eventLogger.error(`Worker error: ${error.message}`);
    });

    worker.on('progress', (job, progress) => {
      eventLogger.info(`Job ${job.id} progress: ${progress}%`);
    });
  }
}

export function createWorkers(connection: ConnectionOptions): BullWorker[] {
  const workers = getWorkerDefinitions().map((definition) => {
    const worker = new Worker(definition.queueName, definition.processor, {
      connection,
      ...definition.options,
    });

    logger.info(definition.initializedMessage);
    return worker;
  });

  attachWorkerEventHandlers(workers, logger);
  logger.info('All workers initialized');

  return workers;
}
