// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { ConnectionOptions } from 'bullmq';
import Redis from 'ioredis';

import { workerLogger as logger } from './logger';
import { createWorkerRuntimeShell } from './worker-runtime-shell';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const enableScheduledJobs = process.env.ENABLE_SCHEDULED_JOBS !== 'false';

const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

const connection = redisConnection as unknown as ConnectionOptions;

const workerRuntimeShell = createWorkerRuntimeShell({
  connection,
  redisConnection,
  enableScheduledJobs,
  logger,
});

void workerRuntimeShell.start();
