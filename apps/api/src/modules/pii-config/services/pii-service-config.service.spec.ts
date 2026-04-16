// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PiiServiceConfigApplicationService } from '../application/pii-service-config.service';
import { PiiServiceConfigService } from './pii-service-config.service';

describe('PiiServiceConfigService', () => {
  const context: RequestContext = {
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userId: 'user-1',
    userName: 'Admin',
    ipAddress: '127.0.0.1',
    requestId: 'req-1',
  };

  const mockApplicationService = {
    findMany: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    testConnection: vi.fn(),
  } as unknown as PiiServiceConfigApplicationService;

  const service = new PiiServiceConfigService(mockApplicationService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates read/write paths to the layered application service', async () => {
    vi.mocked(mockApplicationService.findMany).mockResolvedValue({
      items: [],
      meta: {
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
        },
      },
    });
    vi.mocked(mockApplicationService.findById).mockResolvedValue({
      id: 'config-1',
      code: 'DEFAULT_PII',
      name: 'Default PII',
      nameZh: '默认 PII',
      nameJa: 'デフォルト PII',
      description: 'Primary PII service',
      descriptionZh: '主 PII 服务',
      descriptionJa: 'メイン PII サービス',
      apiUrl: 'https://pii.example.com',
      authType: 'mtls',
      healthCheckUrl: 'https://pii.example.com/health',
      healthCheckIntervalSec: 60,
      isHealthy: true,
      lastHealthCheckAt: new Date('2026-04-14T00:00:00.000Z'),
      isActive: true,
      profileStoreCount: 2,
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
      updatedAt: new Date('2026-04-14T00:05:00.000Z'),
      version: 1,
    });
    vi.mocked(mockApplicationService.create).mockResolvedValue({
      id: 'config-1',
      code: 'DEFAULT_PII',
      name: 'Default PII',
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
    });
    vi.mocked(mockApplicationService.update).mockResolvedValue({
      id: 'config-1',
      code: 'DEFAULT_PII',
      version: 2,
      updatedAt: new Date('2026-04-14T00:05:00.000Z'),
    });

    await expect(service.findMany({}, context)).resolves.toMatchObject({ items: [] });
    await expect(service.findById('config-1', context)).resolves.toMatchObject({
      code: 'DEFAULT_PII',
    });
    await expect(
      service.create(
        {
          code: 'DEFAULT_PII',
          nameEn: 'Default PII',
          apiUrl: 'https://pii.example.com',
          authType: 'mtls' as never,
        },
        context,
      ),
    ).resolves.toMatchObject({ code: 'DEFAULT_PII' });
    await expect(
      service.update(
        'config-1',
        {
          version: 1,
          nameEn: 'Updated',
        },
        context,
      ),
    ).resolves.toMatchObject({ version: 2 });
  });

  it('delegates testConnection to the layered application service', async () => {
    vi.mocked(mockApplicationService.testConnection).mockResolvedValue({
      status: 'ok',
      latencyMs: 42,
      testedAt: new Date('2026-04-14T00:10:00.000Z'),
    } as never);

    await expect(
      service.testConnection('config-1', context),
    ).resolves.toMatchObject({
      status: 'ok',
      latencyMs: 42,
    });

    expect(mockApplicationService.testConnection).toHaveBeenCalledWith(
      'config-1',
      context,
    );
  });
});
