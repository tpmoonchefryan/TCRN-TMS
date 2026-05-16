// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ConnectionOptions } from 'bullmq';
import Redis from 'ioredis';

import { workerLogger as logger } from './logger';
import { createWorkerRuntimeShell } from './worker-runtime-shell';

const workerEntryDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(workerEntryDir, '..', '..', '..');

for (const envFile of ['.env.local', '.env']) {
  const envPath = resolve(repoRoot, envFile);
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }
}

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const enableScheduledJobs = process.env.ENABLE_SCHEDULED_JOBS !== 'false';

async function bootstrap() {
  const redisConnection = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    retryStrategy: () => null,
  });
  let firstRedisErrorMessage: string | null = null;

  redisConnection.on('error', (error) => {
    firstRedisErrorMessage ??= error instanceof Error ? error.message : String(error);
  });

  try {
    await redisConnection.connect();
  } catch (error) {
    const redisFailureMessage =
      firstRedisErrorMessage
      ?? (error instanceof Error ? error.message : String(error));
    logger.error(
      `Unable to connect to Redis at ${redisUrl}: ${redisFailureMessage}. Start local infra first with "pnpm infra:up" or "docker compose --env-file .env.local up -d postgres redis minio nats".`
    );
    process.exit(1);
  }

  const connection = redisConnection as unknown as ConnectionOptions;

  const workerRuntimeShell = createWorkerRuntimeShell({
    connection,
    redisConnection,
    enableScheduledJobs,
    logger,
  });

  await workerRuntimeShell.start();
}

void bootstrap();
