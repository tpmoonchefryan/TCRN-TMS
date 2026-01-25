// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { PrismaClient } from '@tcrn/database';
import { Worker } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { CronJob } from 'cron';
import Redis from 'ioredis';

import { emailJobProcessor } from './jobs/email.job';
import { importJobProcessor } from './jobs/import.job';
import { processLogCleanup } from './jobs/log-cleanup.job';
import { processTechEventLog, processIntegrationLog } from './jobs/log-processor.job';
import { marshmallowExportJobProcessor } from './jobs/marshmallow-export.job';
import { membershipRenewalJobProcessor, scheduleMembershipRenewalJob } from './jobs/membership-renewal.job';
import { permissionJobProcessor } from './jobs/permission.job';
import { piiCleanupJobProcessor, schedulePiiCleanupJob } from './jobs/pii-cleanup.job';
import { piiHealthCheckJobProcessor, setupPiiHealthCheckCron } from './jobs/pii-health-check.job';
import { reportJobProcessor } from './jobs/report.job';
import { workerLogger as logger } from './logger';
import { setupQueues, QUEUE_NAMES, membershipRenewalQueue, piiCleanupQueue, logCleanupQueue, piiHealthCheckQueue } from './queues';

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

  // Import Job Worker (PRD §11.7)
  const importWorker = new Worker(QUEUE_NAMES.IMPORT, importJobProcessor, {
    connection,
    concurrency: 1, // Single-threaded processing
    limiter: {
      max: 1,
      duration: 1000,
    },
  });
  workers.push(importWorker);
  logger.info('Import worker initialized');

  // Report Job Worker (PRD §20.1)
  const reportWorker = new Worker(QUEUE_NAMES.REPORT, reportJobProcessor, {
    connection,
    concurrency: 1, // PRD §20.1: Worker concurrency=1
    limiter: {
      max: 1,
      duration: 1000,
    },
  });
  workers.push(reportWorker);
  logger.info('Report worker initialized');

  // Permission Calculation Worker (PRD §12.6)
  const permissionWorker = new Worker(QUEUE_NAMES.PERMISSION, permissionJobProcessor, {
    connection,
    concurrency: 1,
  });
  workers.push(permissionWorker);
  logger.info('Permission worker initialized');

  // Membership Renewal Worker (PRD §11.6)
  const membershipRenewalWorker = new Worker(
    QUEUE_NAMES.MEMBERSHIP_RENEWAL,
    membershipRenewalJobProcessor,
    {
      connection,
      concurrency: 1,
    }
  );
  workers.push(membershipRenewalWorker);
  logger.info('Membership renewal worker initialized');

  // Log Worker (PRD §15) - handles both tech events and integration logs
  const logWorker = new Worker(
    QUEUE_NAMES.LOG,
    async (job) => {
      const { type } = job.data;
      if (type === 'tech_event') {
        return processTechEventLog(job);
      } else if (type === 'integration_log') {
        return processIntegrationLog(job);
      }
      throw new Error(`Unknown log job type: ${type}`);
    },
    {
      connection,
      concurrency: 5, // Higher concurrency for log processing
      limiter: {
        max: 100,
        duration: 1000, // Rate limit to 100/s
      },
    }
  );
  workers.push(logWorker);
  logger.info('Log worker initialized');

  // PII Cleanup Worker (PRD §11 - Orphan PII cleanup)
  const piiCleanupWorker = new Worker(
    QUEUE_NAMES.PII_CLEANUP,
    piiCleanupJobProcessor,
    {
      connection,
      concurrency: 1, // Single-threaded for safety
    }
  );
  workers.push(piiCleanupWorker);
  logger.info('PII cleanup worker initialized');

  // Export Worker (handles marshmallow exports and other export types)
  const exportWorker = new Worker(
    QUEUE_NAMES.EXPORT,
    async (job) => {
      // Route to appropriate processor based on job name
      if (job.name === 'marshmallow-export') {
        return marshmallowExportJobProcessor(job);
      }
      // Add other export types here
      throw new Error(`Unknown export job type: ${job.name}`);
    },
    {
      connection,
      concurrency: 2, // Allow 2 concurrent exports
    }
  );
  workers.push(exportWorker);
  logger.info('Export worker initialized');

  // Log Cleanup Worker (PRD §15 - Log retention)
  const logCleanupWorker = new Worker(
    QUEUE_NAMES.LOG_CLEANUP,
    processLogCleanup,
    {
      connection,
      concurrency: 1, // Single-threaded for safety
    }
  );
  workers.push(logCleanupWorker);
  logger.info('Log cleanup worker initialized');

  // PII Health Check Worker (PRD §11 - PII service health monitoring)
  const piiHealthCheckWorker = new Worker(
    QUEUE_NAMES.PII_HEALTH_CHECK,
    piiHealthCheckJobProcessor,
    {
      connection,
      concurrency: 1, // Single-threaded
    }
  );
  workers.push(piiHealthCheckWorker);
  logger.info('PII health check worker initialized');

  // Email Worker (Tencent Cloud SES)
  const emailWorker = new Worker(
    QUEUE_NAMES.EMAIL,
    emailJobProcessor,
    {
      connection,
      concurrency: 5, // Allow 5 concurrent emails
      limiter: {
        max: 10,
        duration: 1000, // Rate limit: 10 emails per second
      },
    }
  );
  workers.push(emailWorker);
  logger.info('Email worker initialized');

  // Setup worker event handlers
  workers.forEach((worker) => {
    worker.on('completed', (job) => {
      logger.info(`Job ${job.id} completed in queue ${job.queueName}`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`Job ${job?.id} failed in queue ${job?.queueName}: ${err.message}`);
    });

    worker.on('error', (err) => {
      logger.error(`Worker error: ${err.message}`);
    });

    worker.on('progress', (job, progress) => {
      logger.info(`Job ${job.id} progress: ${progress}%`);
    });
  });

  logger.info('All workers initialized');

  // Setup scheduled jobs
  if (enableScheduledJobs) {
    await setupScheduledJobs();
  }
}

/**
 * Get all active tenants from the database
 */
async function getActiveTenants(): Promise<Array<{ id: string; code: string; schemaName: string }>> {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  
  try {
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, code: true, schemaName: true },
    });
    return tenants;
  } catch (error: any) {
    logger.error(`Failed to fetch active tenants: ${error.message}`);
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
          } catch (error: any) {
            logger.error(`Failed to schedule membership renewal for tenant ${tenant.code}: ${error.message}`);
          }
        }
        
        logger.info(`Membership renewal scheduled for ${tenants.length} tenants`);
      } catch (error: any) {
        logger.error(`Failed to schedule membership renewal: ${error.message}`);
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
      } catch (error: any) {
        logger.error(`Failed to trigger permission refresh: ${error.message}`);
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
      } catch (error: any) {
        logger.error(`Failed to schedule PII cleanup: ${error.message}`);
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
          } catch (error: any) {
            logger.error(`Failed to schedule log cleanup for tenant ${tenant.code}: ${error.message}`);
          }
        }
      } catch (error: any) {
        logger.error(`Failed to schedule log cleanup: ${error.message}`);
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
  } catch (error: any) {
    logger.error(`Failed to setup PII health check cron: ${error.message}`);
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

process.on('unhandledRejection', (reason: any, _promise) => {
  logger.error(`Unhandled rejection: ${reason?.message || reason}`);
});

// Start workers
initializeWorkers().catch((err) => {
  logger.error(`Failed to initialize workers: ${err.message}`);
  process.exit(1);
});
