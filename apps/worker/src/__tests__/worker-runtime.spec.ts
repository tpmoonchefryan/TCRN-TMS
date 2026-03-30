// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { Job } from 'bullmq';
import { describe, expect, it, vi } from 'vitest';

import { QUEUE_NAMES } from '../queues';
import {
  attachWorkerEventHandlers,
  createLogJobProcessor,
  getWorkerDefinitions,
  WORKER_GROUPS,
} from '../worker-runtime';

describe('WORKER_GROUPS', () => {
  it('groups every queue-backed worker exactly once by task domain', () => {
    expect(WORKER_GROUPS.map((group) => group.domain)).toEqual([
      'customer-data',
      'platform-maintenance',
      'observability',
    ]);

    const definitions = getWorkerDefinitions();
    const queueNames = definitions.map((definition) => definition.queueName);

    expect(queueNames).toEqual([
      QUEUE_NAMES.IMPORT,
      QUEUE_NAMES.REPORT,
      QUEUE_NAMES.EXPORT,
      QUEUE_NAMES.EMAIL,
      QUEUE_NAMES.MEMBERSHIP_RENEWAL,
      QUEUE_NAMES.PII_CLEANUP,
      QUEUE_NAMES.LOG_CLEANUP,
      QUEUE_NAMES.PII_HEALTH_CHECK,
      QUEUE_NAMES.LOG,
    ]);
    expect(new Set(queueNames).size).toBe(queueNames.length);
  });

  it('preserves queue concurrency and rate-limit guardrails in the runtime registry', () => {
    const definitionsByQueue = new Map(
      getWorkerDefinitions().map((definition) => [definition.queueName, definition])
    );

    expect(definitionsByQueue.get(QUEUE_NAMES.IMPORT)?.options).toMatchObject({
      concurrency: 1,
      limiter: { max: 1, duration: 1000 },
    });
    expect(definitionsByQueue.get(QUEUE_NAMES.REPORT)?.options).toMatchObject({
      concurrency: 1,
      limiter: { max: 1, duration: 1000 },
    });
    expect(definitionsByQueue.get(QUEUE_NAMES.LOG)?.options).toMatchObject({
      concurrency: 5,
      limiter: { max: 100, duration: 1000 },
    });
    expect(definitionsByQueue.get(QUEUE_NAMES.EMAIL)?.options).toMatchObject({
      concurrency: 5,
      limiter: { max: 10, duration: 1000 },
    });
    expect(definitionsByQueue.get(QUEUE_NAMES.EXPORT)?.options).toMatchObject({
      concurrency: 2,
    });
  });
});

describe('createLogJobProcessor', () => {
  it('routes tech_event jobs to the tech-event processor', async () => {
    const processTechEventLog = vi.fn().mockResolvedValue({ kind: 'tech' });
    const processIntegrationLog = vi.fn();
    const processor = createLogJobProcessor({
      processTechEventLog,
      processIntegrationLog,
    });

    const result = await processor({
      data: { type: 'tech_event' },
    } as Job<{ type: string }>);

    expect(processTechEventLog).toHaveBeenCalledTimes(1);
    expect(processIntegrationLog).not.toHaveBeenCalled();
    expect(result).toEqual({ kind: 'tech' });
  });

  it('routes integration_log jobs to the integration-log processor', async () => {
    const processTechEventLog = vi.fn();
    const processIntegrationLog = vi.fn().mockResolvedValue({ kind: 'integration' });
    const processor = createLogJobProcessor({
      processTechEventLog,
      processIntegrationLog,
    });

    const result = await processor({
      data: { type: 'integration_log' },
    } as Job<{ type: string }>);

    expect(processIntegrationLog).toHaveBeenCalledTimes(1);
    expect(processTechEventLog).not.toHaveBeenCalled();
    expect(result).toEqual({ kind: 'integration' });
  });

  it('rejects unknown log job types', async () => {
    const processor = createLogJobProcessor({
      processTechEventLog: vi.fn(),
      processIntegrationLog: vi.fn(),
    });

    await expect(
      processor({
        data: { type: 'unknown-log-type' },
      } as Job<{ type: string }>)
    ).rejects.toThrow('Unknown log job type: unknown-log-type');
  });
});

describe('attachWorkerEventHandlers', () => {
  it('registers the standard BullMQ event hooks and logs through the provided logger', () => {
    const on = vi.fn();
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };

    attachWorkerEventHandlers([{ on }], logger);

    expect(on).toHaveBeenCalledTimes(4);

    const handlers = new Map(
      on.mock.calls.map(([event, handler]) => [
        event as string,
        handler as (...args: unknown[]) => void,
      ])
    );

    handlers.get('completed')?.({ id: 'job-1', queueName: 'log' });
    handlers.get('failed')?.({ id: 'job-2', queueName: 'export' }, new Error('boom'));
    handlers.get('error')?.(new Error('worker boom'));
    handlers.get('progress')?.({ id: 'job-3' }, 42);

    expect(logger.info).toHaveBeenCalledWith('Job job-1 completed in queue log');
    expect(logger.error).toHaveBeenCalledWith('Job job-2 failed in queue export: boom');
    expect(logger.error).toHaveBeenCalledWith('Worker error: worker boom');
    expect(logger.info).toHaveBeenCalledWith('Job job-3 progress: 42%');
  });
});
