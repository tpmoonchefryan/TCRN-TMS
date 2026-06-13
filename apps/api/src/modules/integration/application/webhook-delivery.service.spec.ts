// SPDX-License-Identifier: Apache-2.0
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';

import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { WebhookDeliveryApplicationService } from './webhook-delivery.service';

const baseDate = new Date('2026-05-31T00:00:00.000Z');

const context: RequestContext = {
  tenantId: '11111111-1111-4111-8111-111111111111',
  tenantSchema: 'tenant_test',
  userId: '22222222-2222-4222-8222-222222222222',
  requestId: 'trace-webhook-delivery-test',
};

const webhookRecord = {
  id: '33333333-3333-4333-8333-333333333333',
  code: 'CUSTOMER_LIFECYCLE',
  name: { en: 'Customer lifecycle' },
  extraData: { definitionKey: 'customer-lifecycle' },
  url: 'https://example.com/webhook',
  secret: 'encrypted-secret',
  events: ['customer.created', 'customer.updated', 'customer.deactivated'],
  headers: {},
  retryPolicy: { maxRetries: 3, backoffMs: 1000 },
  isActive: true,
  lastTriggeredAt: null,
  lastStatus: null,
  consecutiveFailures: 0,
  disabledAt: null,
  createdAt: baseDate,
  updatedAt: baseDate,
  createdBy: context.userId ?? null,
  updatedBy: context.userId ?? null,
  version: 1,
};

function duplicateTestPayload(reason = 'operator dry-run test') {
  return {
    eventId: 'evt-original',
    eventCode: 'customer.created',
    payloadVersion: 'v1',
    tenantId: context.tenantId,
    subsidiaryId: null,
    talentId: null,
    occurredAt: '2026-05-31T00:00:00.000Z',
    idempotencyKey: 'same-operation',
    correlationId: context.requestId,
    producer: 'customer-profile',
    data: {
      fixture: 'test_delivery',
      webhookId: webhookRecord.id,
      reason,
    },
    redaction: {
      piiClass: 'reference',
      policy: 'customer_reference_only',
    },
  };
}

const duplicateOutbox = {
  id: '44444444-4444-4444-8444-444444444444',
  webhookId: webhookRecord.id,
  eventId: 'evt-duplicate',
  eventCode: 'customer.created',
  payloadVersion: 'v1',
  tenantId: context.tenantId ?? null,
  subsidiaryId: null,
  talentId: null,
  idempotencyKey: 'same-operation',
  payloadHash: 'hash-duplicate',
  payloadEnvelope: duplicateTestPayload(),
  redactedPayload: {
    eventCode: 'customer.created',
    payloadVersion: 'v1',
    tenantId: context.tenantId,
    idempotencyKey: 'same-operation',
    dataSummary: { objectKeys: ['fixture', 'reason', 'webhookId'], rawPayloadStored: false },
  },
  dispatchMode: 'disabled',
  status: 'pending',
  attemptCount: 1,
  nextAttemptAt: null,
  availableAt: baseDate,
  deliveredAt: null,
  deadLetteredAt: null,
  dlqReason: null,
  correlationId: context.requestId ?? null,
  traceId: context.requestId ?? null,
  replayOfOutboxId: null,
  createdAt: baseDate,
};

function buildService(overrides: Record<string, unknown> = {}) {
  const deliveryRepository = {
    withTransaction: vi.fn(async (callback) => callback({})),
    insertOutboxIfAbsent: vi.fn().mockResolvedValue({ record: duplicateOutbox, created: false }),
    insertAttempt: vi.fn(),
    listAttempts: vi.fn(),
    findAttemptById: vi.fn(),
    findOutboxById: vi.fn(),
    ...overrides,
  };
  const webhookReadRepository = {
    findById: vi.fn().mockResolvedValue(webhookRecord),
  };
  const cryptoService = {
    decrypt: vi.fn().mockReturnValue('delivery-secret'),
  };
  const changeLogService = {
    create: vi.fn(),
  };
  const configService = {
    get: vi.fn((key: string, defaultValue?: unknown) => {
      if (key === 'WEBHOOK_TARGET_RESOLVE_DNS') {
        return false;
      }

      return defaultValue;
    }),
  };

  return {
    deliveryRepository,
    webhookReadRepository,
    service: new WebhookDeliveryApplicationService(
      deliveryRepository as never,
      webhookReadRepository as never,
      cryptoService as never,
      changeLogService as never,
      configService as unknown as ConfigService
    ),
  };
}

describe('WebhookDeliveryApplicationService', () => {
  it('returns the existing outbox on atomic idempotency conflict without inserting another attempt', async () => {
    const { service, deliveryRepository } = buildService();

    const result = await service.createTestDelivery(
      webhookRecord.id,
      {
        reason: 'operator dry-run test',
        dryRun: true,
        idempotencyKey: 'same-operation',
      },
      context
    );

    expect(result).toMatchObject({
      accepted: false,
      duplicate: true,
      outboxId: duplicateOutbox.id,
      attemptId: null,
      idempotencyKey: 'same-operation',
    });
    expect(deliveryRepository.insertOutboxIfAbsent).toHaveBeenCalledOnce();
    expect(deliveryRepository.insertAttempt).not.toHaveBeenCalled();
  });

  it('rejects an idempotency conflict owned by another webhook in the same tenant', async () => {
    const { service, deliveryRepository } = buildService({
      insertOutboxIfAbsent: vi.fn().mockResolvedValue({
        record: {
          ...duplicateOutbox,
          webhookId: '99999999-9999-4999-8999-999999999999',
        },
        created: false,
      }),
    });

    await expect(
      service.createTestDelivery(
        webhookRecord.id,
        {
          reason: 'operator dry-run test',
          dryRun: true,
          idempotencyKey: 'same-operation',
        },
        context
      )
    ).rejects.toMatchObject({
      response: {
        code: ErrorCodes.RES_CONFLICT,
        message: 'Webhook delivery idempotency key is already used for a different operation',
      },
    });
    expect(deliveryRepository.insertAttempt).not.toHaveBeenCalled();
  });

  it('rejects an idempotency conflict with a different stable payload', async () => {
    const { service, deliveryRepository } = buildService({
      insertOutboxIfAbsent: vi.fn().mockResolvedValue({
        record: {
          ...duplicateOutbox,
          payloadEnvelope: duplicateTestPayload('different original reason'),
        },
        created: false,
      }),
    });

    await expect(
      service.createTestDelivery(
        webhookRecord.id,
        {
          reason: 'operator dry-run test',
          dryRun: true,
          idempotencyKey: 'same-operation',
        },
        context
      )
    ).rejects.toMatchObject({
      response: {
        code: ErrorCodes.RES_CONFLICT,
      },
    });
    expect(deliveryRepository.insertAttempt).not.toHaveBeenCalled();
  });

  it('fails closed when delivery context has no tenant schema or tenant id', async () => {
    const { service } = buildService();

    await expect(
      service.createTestDelivery(
        webhookRecord.id,
        { reason: 'missing tenant', dryRun: true },
        { userId: context.userId }
      )
    ).rejects.toMatchObject({
      response: {
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Webhook tenant schema context is required',
      },
    });

    await expect(
      service.createTestDelivery(
        webhookRecord.id,
        { reason: 'missing tenant id', dryRun: true },
        { tenantSchema: context.tenantSchema, userId: context.userId }
      )
    ).rejects.toMatchObject({
      response: {
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Webhook delivery requires tenant context',
      },
    });
  });

  it('requires DNS validation before non-dry-run local or provider dispatch can be enabled', async () => {
    const { service } = buildService({
      insertOutboxIfAbsent: vi.fn().mockResolvedValue({ record: duplicateOutbox, created: false }),
    });
    const configService = (service as unknown as { configService: ConfigService }).configService;
    vi.mocked(configService.get).mockImplementation((key: string, defaultValue?: unknown) => {
      if (key === 'WEBHOOK_DELIVERY_DISPATCH_MODE') {
        return 'local_dispatch';
      }

      if (key === 'WEBHOOK_TARGET_RESOLVE_DNS') {
        return false;
      }

      return defaultValue;
    });

    await expect(
      service.createTestDelivery(
        webhookRecord.id,
        { reason: 'non dry-run dispatch', dryRun: false },
        context
      )
    ).rejects.toMatchObject({
      response: {
        code: ErrorCodes.RES_CONFLICT,
        message: 'Webhook non-dry-run dispatch requires DNS target validation',
      },
    });
  });
});
