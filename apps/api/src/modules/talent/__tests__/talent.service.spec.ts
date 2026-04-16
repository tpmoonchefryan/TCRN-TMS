// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TalentCustomDomainService } from '../application/talent-custom-domain.service';
import { TalentLifecycleService } from '../application/talent-lifecycle.service';
import { TalentReadService } from '../application/talent-read.service';
import { TalentWriteService } from '../application/talent-write.service';
import { TalentService } from '../talent.service';

describe('TalentService facade', () => {
  const mockReadService = {
    findById: vi.fn(),
    findByCode: vi.fn(),
    findByHomepagePath: vi.fn(),
    findByCustomDomain: vi.fn(),
    getProfileStoreById: vi.fn(),
    getTalentStats: vi.fn(),
    getExternalPagesDomainConfig: vi.fn(),
    list: vi.fn(),
  } as unknown as TalentReadService;

  const mockLifecycleService = {
    getPublishReadiness: vi.fn(),
    publish: vi.fn(),
    disable: vi.fn(),
    reEnable: vi.fn(),
    move: vi.fn(),
  } as unknown as TalentLifecycleService;

  const mockWriteService = {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as TalentWriteService;

  const mockCustomDomainService = {
    getCustomDomainConfig: vi.fn(),
    setCustomDomain: vi.fn(),
    verifyCustomDomain: vi.fn(),
    updateServicePaths: vi.fn(),
    updateSslMode: vi.fn(),
  } as unknown as TalentCustomDomainService;

  const service = new TalentService(
    undefined,
    mockReadService,
    mockLifecycleService,
    mockWriteService,
    mockCustomDomainService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates talent read/resource paths to the layered read service', async () => {
    vi.mocked(mockReadService.findById).mockResolvedValue({
      id: 'talent-123',
      code: 'TALENT001',
    } as never);
    vi.mocked(mockReadService.findByCode).mockResolvedValue({
      id: 'talent-123',
      code: 'TALENT001',
    } as never);
    vi.mocked(mockReadService.findByHomepagePath).mockResolvedValue({
      id: 'talent-123',
      homepagePath: '/test-talent',
    } as never);
    vi.mocked(mockReadService.findByCustomDomain).mockResolvedValue({
      id: 'talent-123',
      code: 'TALENT001',
    } as never);
    vi.mocked(mockReadService.getProfileStoreById).mockResolvedValue({
      id: 'store-123',
      code: 'DEFAULT',
    } as never);
    vi.mocked(mockReadService.getTalentStats).mockResolvedValue({
      customerCount: 3,
      pendingMessagesCount: 1,
    });
    vi.mocked(mockReadService.getExternalPagesDomainConfig).mockResolvedValue({
      homepage: null,
      marshmallow: null,
    });
    vi.mocked(mockReadService.list).mockResolvedValue({
      data: [{ id: 'talent-123', code: 'TALENT001' }] as never,
      total: 1,
    });

    await expect(service.findById('talent-123', 'tenant_test')).resolves.toMatchObject({
      id: 'talent-123',
    });
    await expect(service.findByCode('TALENT001', 'tenant_test')).resolves.toMatchObject({
      code: 'TALENT001',
    });
    await expect(
      service.findByHomepagePath('/test-talent', 'tenant_test'),
    ).resolves.toMatchObject({
      homepagePath: '/test-talent',
    });
    await expect(
      service.findByCustomDomain('Talent.Example.com', 'tenant_test'),
    ).resolves.toMatchObject({
      id: 'talent-123',
    });
    await expect(
      service.getProfileStoreById('store-123', 'tenant_test'),
    ).resolves.toMatchObject({
      code: 'DEFAULT',
    });
    await expect(service.getTalentStats('talent-123', 'tenant_test')).resolves.toEqual({
      customerCount: 3,
      pendingMessagesCount: 1,
    });
    await expect(
      service.getExternalPagesDomainConfig('talent-123', 'tenant_test'),
    ).resolves.toEqual({
      homepage: null,
      marshmallow: null,
    });
    await expect(service.list('tenant_test')).resolves.toEqual({
      data: [{ id: 'talent-123', code: 'TALENT001' }],
      total: 1,
    });
  });

  it('delegates talent lifecycle/readiness paths to the layered lifecycle service', async () => {
    vi.mocked(mockLifecycleService.getPublishReadiness).mockResolvedValue({
      id: 'talent-123',
      lifecycleStatus: 'draft',
      targetState: 'published',
      recommendedAction: 'publish',
      canEnterPublishedState: true,
      blockers: [],
      warnings: [],
      version: 1,
    } as never);
    vi.mocked(mockLifecycleService.publish).mockResolvedValue({
      id: 'talent-123',
      lifecycleStatus: 'published',
      version: 2,
    } as never);
    vi.mocked(mockLifecycleService.disable).mockResolvedValue({
      id: 'talent-123',
      lifecycleStatus: 'disabled',
      version: 2,
    } as never);
    vi.mocked(mockLifecycleService.reEnable).mockResolvedValue({
      id: 'talent-123',
      lifecycleStatus: 'published',
      version: 2,
    } as never);
    vi.mocked(mockLifecycleService.move).mockRejectedValue({
      response: {
        code: 'RES_CONFLICT',
      },
    });

    await expect(
      service.getPublishReadiness('talent-123', 'tenant_test'),
    ).resolves.toMatchObject({
      recommendedAction: 'publish',
    });
    await expect(
      service.publish('talent-123', 'tenant_test', 1, 'user-1'),
    ).resolves.toMatchObject({
      lifecycleStatus: 'published',
    });
    await expect(
      service.disable('talent-123', 'tenant_test', 1, 'user-1'),
    ).resolves.toMatchObject({
      lifecycleStatus: 'disabled',
    });
    await expect(
      service.reEnable('talent-123', 'tenant_test', 1, 'user-1'),
    ).resolves.toMatchObject({
      lifecycleStatus: 'published',
    });
    await expect(
      service.move('talent-123', 'tenant_test', 'subsidiary-456', 1, 'user-1'),
    ).rejects.toMatchObject({
      response: {
        code: 'RES_CONFLICT',
      },
    });
  });

  it('delegates talent write paths to the layered write service', async () => {
    vi.mocked(mockWriteService.create).mockResolvedValue({
      id: 'talent-123',
      code: 'TALENT001',
    } as never);
    vi.mocked(mockWriteService.update).mockResolvedValue({
      id: 'talent-123',
      version: 2,
    } as never);
    vi.mocked(mockWriteService.delete).mockResolvedValue({
      id: 'talent-123',
      deleted: true,
    } as never);

    await expect(
      service.create(
        'tenant_test',
        {
          profileStoreId: 'store-123',
          code: 'TALENT001',
          nameEn: 'Talent',
          displayName: 'Talent',
        },
        'user-1',
      ),
    ).resolves.toMatchObject({
      id: 'talent-123',
    });
    await expect(
      service.update(
        'talent-123',
        'tenant_test',
        { version: 1, displayName: 'Talent 2' },
        'user-1',
      ),
    ).resolves.toMatchObject({
      version: 2,
    });
    await expect(
      service.delete('talent-123', 'tenant_test', { version: 2 }),
    ).resolves.toEqual({
      id: 'talent-123',
      deleted: true,
    });
  });

  it('delegates talent custom-domain paths to the layered custom-domain service', async () => {
    vi.mocked(mockCustomDomainService.getCustomDomainConfig).mockResolvedValue({
      customDomain: 'talent.example.com',
      customDomainVerified: true,
    } as never);
    vi.mocked(mockCustomDomainService.setCustomDomain).mockResolvedValue({
      customDomain: 'talent.example.com',
      token: 'token-123',
      txtRecord: 'tcrn-verify=token-123',
    } as never);
    vi.mocked(mockCustomDomainService.verifyCustomDomain).mockResolvedValue({
      verified: true,
      message: 'Domain verified successfully',
    } as never);
    vi.mocked(mockCustomDomainService.updateServicePaths).mockResolvedValue({
      homepageCustomPath: 'homepage',
      marshmallowCustomPath: 'marshmallow',
    } as never);
    vi.mocked(mockCustomDomainService.updateSslMode).mockResolvedValue({
      customDomainSslMode: 'cloudflare',
    } as never);

    await expect(
      service.getCustomDomainConfig('talent-123', 'tenant_test'),
    ).resolves.toMatchObject({
      customDomain: 'talent.example.com',
    });
    await expect(
      service.setCustomDomain('talent-123', 'tenant_test', 'talent.example.com'),
    ).resolves.toMatchObject({
      token: 'token-123',
    });
    await expect(
      service.verifyCustomDomain('talent-123', 'tenant_test'),
    ).resolves.toEqual({
      verified: true,
      message: 'Domain verified successfully',
    });
    await expect(
      service.updateServicePaths('talent-123', 'tenant_test', {
        homepageCustomPath: '/homepage',
      }),
    ).resolves.toMatchObject({
      homepageCustomPath: 'homepage',
    });
    await expect(
      service.updateSslMode('talent-123', 'tenant_test', 'cloudflare'),
    ).resolves.toEqual({
      customDomainSslMode: 'cloudflare',
    });
  });
});
