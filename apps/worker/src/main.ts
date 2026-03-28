// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { ConnectionOptions, Worker } from 'bullmq';
import { CronJob } from 'cron';
import Redis from 'ioredis';

import { PrismaClient } from '@tcrn/database';

import { workerLogger as logger } from './logger';
import { setupQueues } from './queues';
import { createWorkers } from './worker-runtime';
import { setupScheduledJobsRuntime } from './worker-schedules';

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

async function setupScheduledJobs(): Promise<void> {
  const scheduledJobsRuntime = await setupScheduledJobsRuntime(logger);
  prisma = scheduledJobsRuntime.prisma;
  cronJobs.push(...scheduledJobsRuntime.cronJobs);
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
