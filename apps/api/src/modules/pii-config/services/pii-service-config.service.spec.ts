// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createLocalizedText, type RequestContext } from '@tcrn/shared';

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
  const defaultPiiName = createLocalizedText({
    en: 'Default PII',
    zh_HANS: '默认 PII',
    ja: 'デフォルト PII',
  });
  const defaultPiiDescription = createLocalizedText({
    en: 'Primary PII service',
    zh_HANS: '主 PII 服务',
    ja: 'メイン PII サービス',
  });

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
          totalCount: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      },
    });
    vi.mocked(mockApplicationService.findById).mockResolvedValue({
      id: 'config-1',
      code: 'DEFAULT_PII',
      name: defaultPiiName,
      description: defaultPiiDescription,
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
      name: defaultPiiName,
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
          name: defaultPiiName,
          apiUrl: 'https://pii.example.com',
          authType: 'mtls' as never,
        },
        context
      )
    ).resolves.toMatchObject({ code: 'DEFAULT_PII' });
    await expect(
      service.update(
        'config-1',
        {
          version: 1,
          name: { en: 'Updated' },
        },
        context
      )
    ).resolves.toMatchObject({ version: 2 });
  });

  it('delegates testConnection to the layered application service', async () => {
    vi.mocked(mockApplicationService.testConnection).mockResolvedValue({
      status: 'ok',
      latencyMs: 42,
      testedAt: new Date('2026-04-14T00:10:00.000Z'),
    } as never);

    await expect(service.testConnection('config-1', context)).resolves.toMatchObject({
      status: 'ok',
      latencyMs: 42,
    });

    expect(mockApplicationService.testConnection).toHaveBeenCalledWith('config-1', context);
  });
});
