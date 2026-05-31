// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { describe, expect, it, vi } from 'vitest';

import { EventBackboneRepository } from './event-backbone.repository';

describe('EventBackboneRepository', () => {
  it('requires an explicit tenant schema before writing outbox rows', async () => {
    const query = vi.fn();
    const repository = new EventBackboneRepository({
      getPrisma: () => ({
        $queryRawUnsafe: query,
      }),
    } as never);

    await expect(
      repository.insertOutboxIfAbsent('', {
        eventCode: 'job.email.failed',
        eventFamily: 'job',
        payloadVersion: '1',
        producer: 'worker.email',
        scopeClass: 'tenant',
        piiClass: 'restricted',
        idempotencyKey: 'TEST_P8_EVENT_email_failed',
        payloadHash: 'hash',
        payloadEnvelope: {},
        redactedPayload: {},
        bridgeMode: 'disabled',
      })
    ).rejects.toThrow('Event backbone tenant schema is required');
    expect(query).not.toHaveBeenCalled();
  });

  it('uses idempotent insert and readback in the requested tenant schema', async () => {
    const created = {
      id: 'outbox-1',
      event_code: 'job.email.failed',
      event_family: 'job',
      idempotency_key: 'TEST_P8_EVENT_email_failed',
      payload_hash: 'hash',
      bridge_mode: 'disabled',
      publish_status: 'pending',
      created_at: new Date('2026-05-31T00:00:00.000Z'),
    };
    const query = vi.fn().mockResolvedValueOnce([created]);
    const repository = new EventBackboneRepository({
      getPrisma: () => ({
        $queryRawUnsafe: query,
      }),
    } as never);

    await expect(
      repository.insertOutboxIfAbsent('tenant_ac', {
        eventCode: 'job.email.failed',
        eventFamily: 'job',
        payloadVersion: '1',
        producer: 'worker.email',
        scopeClass: 'tenant',
        piiClass: 'restricted',
        idempotencyKey: 'TEST_P8_EVENT_email_failed',
        payloadHash: 'hash',
        payloadEnvelope: {},
        redactedPayload: {},
        bridgeMode: 'disabled',
      })
    ).resolves.toEqual(created);
    expect(query.mock.calls[0][0]).toContain('INSERT INTO "tenant_ac".event_backbone_outbox');
    expect(query.mock.calls[0][0]).toContain('ON CONFLICT (idempotency_key) DO NOTHING');
  });

  it('reads the existing outbox row when an idempotent insert loses the conflict race', async () => {
    const existing = {
      id: 'outbox-existing',
      event_code: 'job.email.failed',
      event_family: 'job',
      idempotency_key: 'TEST_P8_EVENT_email_failed',
      payload_hash: 'hash',
      bridge_mode: 'disabled',
      publish_status: 'pending',
      created_at: new Date('2026-05-31T00:00:00.000Z'),
    };
    const query = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([existing]);
    const repository = new EventBackboneRepository({
      getPrisma: () => ({
        $queryRawUnsafe: query,
      }),
    } as never);

    await expect(
      repository.insertOutboxIfAbsent('tenant_ac', {
        eventCode: 'job.email.failed',
        eventFamily: 'job',
        payloadVersion: '1',
        producer: 'worker.email',
        scopeClass: 'tenant',
        piiClass: 'restricted',
        idempotencyKey: 'TEST_P8_EVENT_email_failed',
        payloadHash: 'hash',
        payloadEnvelope: {},
        redactedPayload: {},
        bridgeMode: 'disabled',
      })
    ).resolves.toEqual(existing);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0]).toContain('FROM "tenant_ac".event_backbone_outbox');
    expect(query.mock.calls[1][0]).toContain('WHERE idempotency_key = $1');
    expect(query.mock.calls[1][1]).toBe('TEST_P8_EVENT_email_failed');
  });

  it('runs outbox work inside the Prisma transaction client', async () => {
    const transactionClient = {
      $queryRawUnsafe: vi.fn(),
    };
    const transaction = vi.fn(async (callback) => callback(transactionClient));
    const repository = new EventBackboneRepository({
      getPrisma: () => ({
        $transaction: transaction,
      }),
    } as never);

    await expect(
      repository.withOutboxTransaction(async (client) => {
        expect(client).toBe(transactionClient);
        return 'committed';
      })
    ).resolves.toBe('committed');

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transactionClient.$queryRawUnsafe).not.toHaveBeenCalled();
  });
});
