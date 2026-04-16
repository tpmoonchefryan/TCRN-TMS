// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { ConnectionOptions } from 'bullmq';
import { Queue } from 'bullmq';

import { workerLogger as logger } from '../logger';

// Queue definitions
export const QUEUE_NAMES = {
  IMPORT: 'import',
  REPORT: 'report',
  MEMBERSHIP_RENEWAL: 'membership-renewal',
  LOG: 'log',
  LOG_CLEANUP: 'log-cleanup',
  EXPORT: 'export',
  MARSHMALLOW_EXPORT: 'marshmallow-export',
  EMAIL: 'email',
} as const;

// Queue instances
let importQueue: Queue;
let reportQueue: Queue;
let membershipRenewalQueue: Queue;
let logQueue: Queue;
let logCleanupQueue: Queue;
let exportQueue: Queue;
let marshmallowExportQueue: Queue;
let emailQueue: Queue;

/**
 * Setup queue definitions
 */
export async function setupQueues(connection: ConnectionOptions): Promise<void> {
  // Import queue (PRD §11.7)
  importQueue = new Queue(QUEUE_NAMES.IMPORT, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    },
  });

  // Report queue (PRD §20)
  reportQueue = new Queue(QUEUE_NAMES.REPORT, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 24 * 3600,
        count: 100,
      },
      removeOnFail: {
        age: 7 * 24 * 3600,
      },
    },
  });

  // Membership renewal queue (PRD §11.6)
  membershipRenewalQueue = new Queue(QUEUE_NAMES.MEMBERSHIP_RENEWAL, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        age: 7 * 24 * 3600, // Keep for 7 days
        count: 50,
      },
      removeOnFail: {
        age: 14 * 24 * 3600, // Keep failed for 14 days
      },
    },
  });

  // Log queue (PRD §15)
  logQueue = new Queue(QUEUE_NAMES.LOG, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 500,
      },
      removeOnComplete: {
        age: 3600, // 1 hour
        count: 10000,
      },
      removeOnFail: {
        age: 24 * 3600,
      },
    },
  });

  // Log cleanup queue (PRD §15 - Log retention)
  logCleanupQueue = new Queue(QUEUE_NAMES.LOG_CLEANUP, {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        age: 7 * 24 * 3600, // Keep for 7 days
        count: 50,
      },
      removeOnFail: {
        age: 14 * 24 * 3600,
      },
    },
  });

  // Export queue (marshmallow, customer export, etc.)
  exportQueue = new Queue(QUEUE_NAMES.EXPORT, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 7 * 24 * 3600, // Keep for 7 days
        count: 100,
      },
      removeOnFail: {
        age: 14 * 24 * 3600,
      },
    },
  });

  // Dedicated marshmallow export queue
  marshmallowExportQueue = new Queue(QUEUE_NAMES.MARSHMALLOW_EXPORT, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 7 * 24 * 3600, // Keep for 7 days
        count: 100,
      },
      removeOnFail: {
        age: 14 * 24 * 3600,
      },
    },
  });

  // Email queue (Tencent SES)
  emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // 5s, 10s, 20s
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep for 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed for 7 days
      },
    },
  });

  logger.info(`Queues initialized: ${Object.values(QUEUE_NAMES).join(', ')}`);
}

export {
  emailQueue,
  exportQueue,
  importQueue,
  logCleanupQueue,
  logQueue,
  marshmallowExportQueue,
  membershipRenewalQueue,
  reportQueue,
};
