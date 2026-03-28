// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { PrismaClient } from '@tcrn/database';
import type { ConnectionOptions, Worker as BullWorker } from 'bullmq';
import type { CronJob } from 'cron';
import type Redis from 'ioredis';

import { workerLogger as logger } from './logger';
import { setupQueues } from './queues';
import { createWorkers } from './worker-runtime';
import { setupScheduledJobsRuntime } from './worker-schedules';

type RuntimeProcessEvent = 'SIGINT' | 'SIGTERM' | 'uncaughtException' | 'unhandledRejection';

type ExitProcess = (code: number) => never;
type RuntimeProcessHandler = (...args: unknown[]) => void;
type RuntimeProcess = {
  on: (event: RuntimeProcessEvent, handler: RuntimeProcessHandler) => void;
};

type ManagedWorker = Pick<BullWorker, 'close'>;
type ManagedCronJob = Pick<CronJob, 'stop'>;
type ManagedPrismaClient = Pick<PrismaClient, '$disconnect'>;
type ManagedRedisConnection = Pick<Redis, 'quit'>;

export interface WorkerRuntimeShellLogger {
  info: (message: string) => void;
  error: (message: string) => void;
}

export interface WorkerRuntimeShellState {
  workers: ManagedWorker[];
  cronJobs: ManagedCronJob[];
  prisma?: ManagedPrismaClient;
}

export interface WorkerRuntimeShellOptions {
  connection: ConnectionOptions;
  redisConnection: ManagedRedisConnection;
  enableScheduledJobs?: boolean;
  logger?: WorkerRuntimeShellLogger;
  processRef?: RuntimeProcess;
  exitProcess?: ExitProcess;
  setupQueuesFn?: typeof setupQueues;
  createWorkersFn?: typeof createWorkers;
  setupScheduledJobsRuntimeFn?: typeof setupScheduledJobsRuntime;
}

export interface WorkerRuntimeShell {
  initialize: () => Promise<void>;
  shutdown: (exitCode?: number) => Promise<void>;
  registerProcessHandlers: () => void;
  start: () => Promise<void>;
  getState: () => Readonly<WorkerRuntimeShellState>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createWorkerRuntimeShell({
  connection,
  redisConnection,
  enableScheduledJobs = true,
  logger: runtimeLogger = logger,
  processRef = process,
  exitProcess = (code) => process.exit(code),
  setupQueuesFn = setupQueues,
  createWorkersFn = createWorkers,
  setupScheduledJobsRuntimeFn = setupScheduledJobsRuntime,
}: WorkerRuntimeShellOptions): WorkerRuntimeShell {
  const state: WorkerRuntimeShellState = {
    workers: [],
    cronJobs: [],
  };

  let handlersRegistered = false;
  let shutdownPromise: Promise<void> | undefined;

  async function initialize(): Promise<void> {
    runtimeLogger.info('Starting TCRN TMS Workers...');

    await setupQueuesFn(connection);
    state.workers.push(...createWorkersFn(connection));

    if (!enableScheduledJobs) {
      return;
    }

    const scheduledJobsRuntime = await setupScheduledJobsRuntimeFn(runtimeLogger);
    state.prisma = scheduledJobsRuntime.prisma;
    state.cronJobs.push(...scheduledJobsRuntime.cronJobs);
  }

  async function shutdown(exitCode = 0): Promise<void> {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    shutdownPromise = (async () => {
      runtimeLogger.info('Shutting down workers...');

      for (const cronJob of state.cronJobs) {
        cronJob.stop();
      }
      runtimeLogger.info('Cron jobs stopped');

      await Promise.all(
        state.workers.map(async (worker) => {
          await worker.close();
        })
      );
      runtimeLogger.info('Workers closed');

      if (state.prisma) {
        await state.prisma.$disconnect();
        runtimeLogger.info('Prisma connection closed');
      }

      await redisConnection.quit();
      runtimeLogger.info('Redis connection closed');

      runtimeLogger.info('Workers shutdown complete');
      exitProcess(exitCode);
    })();

    return shutdownPromise;
  }

  function registerProcessHandlers(): void {
    if (handlersRegistered) {
      return;
    }

    handlersRegistered = true;

    processRef.on('SIGTERM', () => {
      void shutdown();
    });
    processRef.on('SIGINT', () => {
      void shutdown();
    });
    processRef.on('uncaughtException', (error) => {
      runtimeLogger.error(`Uncaught exception: ${getErrorMessage(error)}`);
      void shutdown();
    });
    processRef.on('unhandledRejection', (reason) => {
      runtimeLogger.error(`Unhandled rejection: ${getErrorMessage(reason)}`);
    });
  }

  async function start(): Promise<void> {
    registerProcessHandlers();

    try {
      await initialize();
    } catch (error) {
      runtimeLogger.error(`Failed to initialize workers: ${getErrorMessage(error)}`);
      exitProcess(1);
    }
  }

  return {
    initialize,
    shutdown,
    registerProcessHandlers,
    start,
    getState: () => state,
  };
}
