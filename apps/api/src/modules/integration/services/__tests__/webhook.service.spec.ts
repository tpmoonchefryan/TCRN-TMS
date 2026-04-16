// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { ErrorCodes } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../../database';
import { ChangeLogService } from '../../../log';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookEventType,
} from '../../dto/integration.dto';
import { AdapterCryptoService } from '../adapter-crypto.service';
import { WebhookService } from '../webhook.service';

describe('WebhookService', () => {
  let service: WebhookService;
  let mockDatabaseService: Pick<DatabaseService, 'getPrisma'>;
  let mockCryptoService: Pick<AdapterCryptoService, 'encrypt'>;
  let mockChangeLogService: Pick<ChangeLogService, 'create'>;
  let mockConfigService: Pick<ConfigService, 'get'>;
  let mockPrisma: {
    webhook: {
      create: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $executeRawUnsafe: ReturnType<typeof vi.fn>;
    $queryRawUnsafe: ReturnType<typeof vi.fn>;
    $transaction: ReturnType<typeof vi.fn>;
  };

  const baseDate = new Date('2026-03-30T00:00:00.000Z');
  const mockContext = {
    tenantId: 'tenant-1',
    userId: 'user-1',
  };
  const tenantContext = {
    ...mockContext,
    tenantSchema: 'tenant_test',
  };

  const buildWebhookRecord = (overrides: Record<string, unknown> = {}) => ({
    id: 'webhook-1',
    code: 'TEST_WEBHOOK',
    nameEn: 'Test Webhook',
    nameZh: null,
    nameJa: null,
    url: 'https://example.com/webhook',
    secret: 'encrypted-secret',
    events: [WebhookEventType.CUSTOMER_CREATED],
    headers: { 'x-custom-header': 'value' },
    retryPolicy: { maxRetries: 3, backoffMs: 1000 },
    isActive: true,
    lastTriggeredAt: null,
    lastStatus: null,
    consecutiveFailures: 0,
    disabledAt: null,
    createdAt: baseDate,
    updatedAt: baseDate,
    createdBy: 'user-1',
    updatedBy: 'user-1',
    version: 1,
    ...overrides,
  });

  beforeEach(() => {
    mockPrisma = {
      webhook: {
        create: vi.fn().mockResolvedValue({ id: 'webhook-1' }),
        delete: vi.fn().mockResolvedValue(undefined),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue(undefined),
      },
      $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
      $queryRawUnsafe: vi.fn(),
      $transaction: vi.fn().mockImplementation(async (callback) => callback(mockPrisma)),
    };

    mockDatabaseService = {
      getPrisma: vi.fn().mockReturnValue(mockPrisma),
    };

    mockCryptoService = {
      encrypt: vi.fn((value: string) => `encrypted:${value}`),
    };

    mockChangeLogService = {
      create: vi.fn().mockResolvedValue(undefined),
    };

    mockConfigService = {
      get: vi.fn().mockReturnValue(true),
    };

    service = new WebhookService(
      mockDatabaseService as DatabaseService,
      mockCryptoService as AdapterCryptoService,
      mockChangeLogService as ChangeLogService,
      mockConfigService as ConfigService,
    );
  });

  it('normalizes legacy retry policy keys when reading webhook detail', async () => {
    mockPrisma.webhook.findUnique.mockResolvedValue(
      buildWebhookRecord({
        headers: {
          'x-custom-header': 'value',
          invalid: 123,
        },
        retryPolicy: {
          max_retries: 5,
          backoff_ms: 2500,
        },
      }),
    );

    const result = await service.findById('webhook-1');

    expect(result.headers).toEqual({ 'x-custom-header': 'value' });
    expect(result.retryPolicy).toEqual({
      maxRetries: 5,
      backoffMs: 2500,
    });
  });

  it('uses tenant-schema raw SQL for webhook list reads', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([
      buildWebhookRecord({
        id: 'webhook-tenant-1',
        code: 'TENANT_WEBHOOK',
        createdAt: baseDate,
      }),
    ]);

    const result = await service.findMany(tenantContext);

    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledOnce();
    expect(result).toEqual([
      {
        id: 'webhook-tenant-1',
        code: 'TENANT_WEBHOOK',
        nameEn: 'Test Webhook',
        nameZh: null,
        nameJa: null,
        url: 'https://example.com/webhook',
        events: [WebhookEventType.CUSTOMER_CREATED],
        isActive: true,
        lastTriggeredAt: null,
        lastStatus: null,
        consecutiveFailures: 0,
        createdAt: baseDate.toISOString(),
      },
    ]);
  });

  it('keeps not-found detail semantics after read extraction', async () => {
    mockPrisma.webhook.findUnique.mockResolvedValue(null);

    await expect(service.findById('missing-webhook')).rejects.toMatchObject({
      response: {
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Webhook not found',
      },
    });
  });

  it('serializes create retry policy to camelCase JSON with defaults', async () => {
    mockPrisma.webhook.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        buildWebhookRecord({
          retryPolicy: { maxRetries: 5, backoffMs: 1000 },
        }),
      );

    const dto = {
      code: 'TEST_WEBHOOK',
      nameEn: 'Test Webhook',
      url: 'https://example.com/webhook',
      events: [WebhookEventType.CUSTOMER_CREATED],
      retryPolicy: { maxRetries: 5 },
    } as CreateWebhookDto;

    await service.create(dto, mockContext);

    expect(mockPrisma.webhook.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          retryPolicy: {
            maxRetries: 5,
            backoffMs: 1000,
          },
        }),
      }),
    );
  });

  it('serializes update retry policy to camelCase JSON with defaults', async () => {
    mockPrisma.webhook.findUnique
      .mockResolvedValueOnce(buildWebhookRecord({ version: 3 }))
      .mockResolvedValueOnce(
        buildWebhookRecord({
          retryPolicy: { maxRetries: 3, backoffMs: 2400 },
          version: 4,
        }),
      );

    const dto = {
      retryPolicy: { backoffMs: 2400 },
      version: 3,
    } as UpdateWebhookDto;

    await service.update('webhook-1', dto, mockContext);

    expect(mockPrisma.webhook.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          retryPolicy: {
            maxRetries: 3,
            backoffMs: 2400,
          },
          updatedBy: 'user-1',
          version: { increment: 1 },
        }),
      }),
    );
  });

  it('returns active-state payload when deactivating a webhook', async () => {
    mockPrisma.webhook.findUnique.mockResolvedValue(
      buildWebhookRecord({
        consecutiveFailures: 2,
      }),
    );

    const result = await service.deactivate('webhook-1', mockContext);

    expect(result).toEqual({
      id: 'webhook-1',
      isActive: false,
    });
    expect(mockPrisma.webhook.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isActive: false,
          disabledAt: expect.any(Date),
          consecutiveFailures: 2,
          updatedBy: 'user-1',
          version: { increment: 1 },
        }),
      }),
    );
  });
});
