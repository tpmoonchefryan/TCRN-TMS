// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createWorkerRuntimeShell } from '../worker-runtime-shell';

function createLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
  };
}

function createProcessHarness() {
  const handlers = new Map<string, (...args: unknown[]) => void>();

  return {
    handlers,
    processRef: {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        handlers.set(event, handler);
      }),
    },
  };
}

function createShell(overrides: Partial<Parameters<typeof createWorkerRuntimeShell>[0]> = {}) {
  const logger = createLogger();
  const redisConnection = {
    quit: vi.fn().mockResolvedValue(undefined),
  };
  const setupQueuesFn = vi.fn().mockResolvedValue(undefined);
  const createWorkersFn = vi.fn().mockReturnValue([]);
  const setupScheduledJobsRuntimeFn = vi.fn().mockResolvedValue({
    prisma: { $disconnect: vi.fn().mockResolvedValue(undefined) },
    cronJobs: [],
  });
  const exitProcess = vi.fn((_: number) => undefined as never);
  const processHarness = createProcessHarness();
  const options = {
    connection: {} as never,
    redisConnection,
    logger,
    processRef: processHarness.processRef,
    exitProcess,
    setupQueuesFn,
    createWorkersFn,
    setupScheduledJobsRuntimeFn,
    ...overrides,
  };

  const shell = createWorkerRuntimeShell(options);

  return {
    shell,
    logger,
    redisConnection,
    setupQueuesFn: options.setupQueuesFn,
    createWorkersFn: options.createWorkersFn,
    setupScheduledJobsRuntimeFn: options.setupScheduledJobsRuntimeFn,
    exitProcess,
    processHarness,
  };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('createWorkerRuntimeShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('captures created workers and scheduled resources when initialization succeeds', async () => {
    const workerA = { close: vi.fn().mockResolvedValue(undefined) };
    const workerB = { close: vi.fn().mockResolvedValue(undefined) };
    const cronJob = { stop: vi.fn() };
    const prisma = { $disconnect: vi.fn().mockResolvedValue(undefined) };
    const createWorkersFn = vi.fn().mockReturnValue([workerA, workerB]);
    const setupScheduledJobsRuntimeFn = vi.fn().mockResolvedValue({
      prisma,
      cronJobs: [cronJob],
    });
    const runtime = createShell({
      createWorkersFn,
      setupScheduledJobsRuntimeFn,
    });

    await runtime.shell.initialize();

    expect(createWorkersFn).toHaveBeenCalledTimes(1);
    expect(setupScheduledJobsRuntimeFn).toHaveBeenCalledWith(runtime.logger);
    expect(runtime.shell.getState()).toMatchObject({
      workers: [workerA, workerB],
      cronJobs: [cronJob],
      prisma,
    });
  });

  it('skips scheduled runtime when scheduled jobs are disabled', async () => {
    const runtime = createShell({
      enableScheduledJobs: false,
    });

    await runtime.shell.initialize();

    expect(runtime.setupScheduledJobsRuntimeFn).not.toHaveBeenCalled();
    expect(runtime.shell.getState()).toMatchObject({
      workers: [],
      cronJobs: [],
    });
  });

  it('shuts resources down once even when multiple shutdown calls race', async () => {
    const workerA = { close: vi.fn().mockResolvedValue(undefined) };
    const workerB = { close: vi.fn().mockResolvedValue(undefined) };
    const cronJob = { stop: vi.fn() };
    const prisma = { $disconnect: vi.fn().mockResolvedValue(undefined) };
    const runtime = createShell({
      createWorkersFn: vi.fn().mockReturnValue([workerA, workerB]),
      setupScheduledJobsRuntimeFn: vi.fn().mockResolvedValue({
        prisma,
        cronJobs: [cronJob],
      }),
    });

    await runtime.shell.initialize();
    await Promise.all([runtime.shell.shutdown(0), runtime.shell.shutdown(0)]);

    expect(cronJob.stop).toHaveBeenCalledTimes(1);
    expect(workerA.close).toHaveBeenCalledTimes(1);
    expect(workerB.close).toHaveBeenCalledTimes(1);
    expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
    expect(runtime.redisConnection.quit).toHaveBeenCalledTimes(1);
    expect(runtime.exitProcess).toHaveBeenCalledWith(0);
    expect(runtime.exitProcess).toHaveBeenCalledTimes(1);
  });

  it('registers process handlers only once and keeps unhandled rejections non-fatal', async () => {
    const runtime = createShell();

    runtime.shell.registerProcessHandlers();
    runtime.shell.registerProcessHandlers();

    expect(runtime.processHarness.processRef.on).toHaveBeenCalledTimes(4);

    runtime.processHarness.handlers.get('unhandledRejection')?.(new Error('queue drift'));

    expect(runtime.logger.error).toHaveBeenCalledWith('Unhandled rejection: queue drift');
    expect(runtime.exitProcess).not.toHaveBeenCalled();
  });

  it('routes SIGTERM and SIGINT through the shared shutdown path', async () => {
    const runtime = createShell();

    runtime.shell.registerProcessHandlers();
    runtime.processHarness.handlers.get('SIGTERM')?.();
    runtime.processHarness.handlers.get('SIGINT')?.();
    await flushMicrotasks();

    expect(runtime.redisConnection.quit).toHaveBeenCalledTimes(1);
    expect(runtime.exitProcess).toHaveBeenCalledTimes(1);
    expect(runtime.exitProcess).toHaveBeenCalledWith(0);
  });

  it('logs uncaught exceptions and shuts down through the shared exit path', async () => {
    const runtime = createShell();

    runtime.shell.registerProcessHandlers();
    runtime.processHarness.handlers.get('uncaughtException')?.(new Error('fatal crash'));
    await flushMicrotasks();

    expect(runtime.logger.error).toHaveBeenCalledWith('Uncaught exception: fatal crash');
    expect(runtime.redisConnection.quit).toHaveBeenCalledTimes(1);
    expect(runtime.exitProcess).toHaveBeenCalledWith(0);
  });

  it('logs initialization failures and exits with code 1', async () => {
    const runtime = createShell({
      setupQueuesFn: vi.fn().mockRejectedValue(new Error('redis unavailable')),
    });

    await runtime.shell.start();

    expect(runtime.processHarness.processRef.on).toHaveBeenCalledTimes(4);
    expect(runtime.logger.error).toHaveBeenCalledWith(
      'Failed to initialize workers: redis unavailable'
    );
    expect(runtime.exitProcess).toHaveBeenCalledWith(1);
  });
});
