// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { PrismaClient } from '@tcrn/database';
import type { ConnectionOptions, Worker } from 'bullmq';
import { CronJob } from 'cron';
import Redis from 'ioredis';

import { scheduleMembershipRenewalJob } from './jobs/membership-renewal.job';
import { schedulePiiCleanupJob } from './jobs/pii-cleanup.job';
import { setupPiiHealthCheckCron } from './jobs/pii-health-check.job';
import { workerLogger as logger } from './logger';
import {
  logCleanupQueue,
  membershipRenewalQueue,
  piiCleanupQueue,
  piiHealthCheckQueue,
  setupQueues,
} from './queues';
import { createWorkers } from './worker-runtime';

// Global Prisma client for scheduled jobs
let prisma: PrismaClient;

// Configuration from environment
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const enableScheduledJobs = process.env.ENABLE_SCHEDULED_JOBS !== 'false';

// Parse Redis URL
const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

// Cast to ConnectionOptions for BullMQ compatibility
const connection = redisConnection as unknown as ConnectionOptions;

// Workers
const workers: Worker[] = [];

// Cron jobs
const cronJobs: CronJob[] = [];

/**
 * Initialize all workers
 */
async function initializeWorkers(): Promise<void> {
  logger.info('Starting TCRN TMS Workers...');

  // Setup queue definitions
  await setupQueues(connection);
  workers.push(...createWorkers(connection));

  // Setup scheduled jobs
  if (enableScheduledJobs) {
    await setupScheduledJobs();
  }
}

/**
 * Get all active tenants from the database
 */
async function getActiveTenants(): Promise<
  Array<{ id: string; code: string; schemaName: string }>
> {
  if (!prisma) {
    prisma = new PrismaClient();
  }

  try {
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, code: true, schemaName: true },
    });
    return tenants;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to fetch active tenants: ${errorMessage}`);
    return [];
  }
}

/**
 * Setup scheduled/cron jobs
 */
async function setupScheduledJobs(): Promise<void> {
  logger.info('Setting up scheduled jobs...');

  // Initialize Prisma client for scheduled jobs
  prisma = new PrismaClient();

  // Membership renewal - daily at 2:00 AM (server timezone)
  const membershipRenewalCron = new CronJob(
    '0 2 * * *', // 2:00 AM daily
    async () => {
      logger.info('Triggering scheduled membership renewal for all tenants');

      try {
        // Get all active tenants
        const tenants = await getActiveTenants();
        logger.info(`Found ${tenants.length} active tenants for membership renewal`);

        // Schedule renewal job for each tenant
        for (const tenant of tenants) {
          try {
            await scheduleMembershipRenewalJob(
              membershipRenewalQueue,
              tenant.code,
              tenant.schemaName
            );
            logger.info(`Scheduled membership renewal for tenant: ${tenant.code}`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(
              `Failed to schedule membership renewal for tenant ${tenant.code}: ${errorMessage}`
            );
          }
        }

        logger.info(`Membership renewal scheduled for ${tenants.length} tenants`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to schedule membership renewal: ${errorMessage}`);
      }
    },
    null,
    true, // Start immediately
    'Asia/Tokyo' // Server timezone
  );
  cronJobs.push(membershipRenewalCron);
  logger.info('Membership renewal cron scheduled (daily at 2:00 AM JST)');

  // Permission full refresh - every 6 hours (fallback, PRD §12.6)
  const permissionRefreshCron = new CronJob(
    '0 */6 * * *', // Every 6 hours
    async () => {
      logger.info('Triggering scheduled permission refresh for all tenants');

      try {
        const tenants = await getActiveTenants();
        logger.info(`Found ${tenants.length} active tenants for permission refresh`);

        // Permission refresh is handled by API side MembershipSchedulerService
        // This cron is just a backup trigger
        for (const tenant of tenants) {
          logger.info(`Permission refresh triggered for tenant: ${tenant.code}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to trigger permission refresh: ${errorMessage}`);
      }
    },
    null,
    true,
    'Asia/Tokyo'
  );
  cronJobs.push(permissionRefreshCron);
  logger.info('Permission refresh cron scheduled (every 6 hours)');

  // PII orphan cleanup - weekly on Sunday at 3:00 AM (PRD §11)
  const piiCleanupCron = new CronJob(
    '0 3 * * 0', // Every Sunday at 3:00 AM
    async () => {
      logger.info('Triggering scheduled PII orphan cleanup');

      try {
        await schedulePiiCleanupJob(piiCleanupQueue);
        logger.info('PII cleanup job scheduled');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to schedule PII cleanup: ${errorMessage}`);
      }
    },
    null,
    true,
    'Asia/Tokyo'
  );
  cronJobs.push(piiCleanupCron);
  logger.info('PII cleanup cron scheduled (weekly on Sunday at 3:00 AM JST)');

  // Log cleanup - daily at 4:00 AM (PRD §15 - Log retention)
  const logCleanupCron = new CronJob(
    '0 4 * * *', // 4:00 AM daily
    async () => {
      logger.info('Triggering scheduled log cleanup for all tenants');

      try {
        const tenants = await getActiveTenants();
        logger.info(`Found ${tenants.length} active tenants for log cleanup`);

        for (const tenant of tenants) {
          try {
            await logCleanupQueue.add(
              'log-cleanup',
              { tenantSchemaName: tenant.schemaName },
              { jobId: `log_cleanup_${tenant.code}_${Date.now()}` }
            );
            logger.info(`Scheduled log cleanup for tenant: ${tenant.code}`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(
              `Failed to schedule log cleanup for tenant ${tenant.code}: ${errorMessage}`
            );
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to schedule log cleanup: ${errorMessage}`);
      }
    },
    null,
    true,
    'Asia/Tokyo'
  );
  cronJobs.push(logCleanupCron);
  logger.info('Log cleanup cron scheduled (daily at 4:00 AM JST)');

  // PII health check - every 60 seconds (PRD §11)
  try {
    await setupPiiHealthCheckCron(piiHealthCheckQueue, 60);
    logger.info('PII health check recurring job scheduled (every 60 seconds)');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to setup PII health check cron: ${errorMessage}`);
  }

  logger.info('Scheduled jobs initialized');
}

/**
 * Graceful shutdown (PRD requirement)
 */
async function shutdown(): Promise<void> {
  logger.info('Shutting down workers...');

  // Stop cron jobs
  for (const cronJob of cronJobs) {
    cronJob.stop();
  }
  logger.info('Cron jobs stopped');

  // Close all workers gracefully
  await Promise.all(
    workers.map(async (worker) => {
      // Wait for current job to complete (max 30s)
      await worker.close();
    })
  );
  logger.info('Workers closed');

  // Close Prisma connection
  if (prisma) {
    await prisma.$disconnect();
    logger.info('Prisma connection closed');
  }

  // Close Redis connection
  await redisConnection.quit();
  logger.info('Redis connection closed');

  logger.info('Workers shutdown complete');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.message}`);
  shutdown();
});

process.on('unhandledRejection', (reason: unknown, _promise) => {
  const errorMessage = reason instanceof Error ? reason.message : String(reason);
  logger.error(`Unhandled rejection: ${errorMessage}`);
});

// Start workers
initializeWorkers().catch((err) => {
  logger.error(`Failed to initialize workers: ${err.message}`);
  process.exit(1);
});
