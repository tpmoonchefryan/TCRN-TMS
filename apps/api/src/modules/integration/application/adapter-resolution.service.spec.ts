// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { NotFoundException } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OwnerType } from '../dto/integration.dto';
import { AdapterResolutionRepository } from '../infrastructure/adapter-resolution.repository';
import { AdapterCryptoService } from '../services/adapter-crypto.service';
import { AdapterResolutionApplicationService } from './adapter-resolution.service';

describe('AdapterResolutionApplicationService', () => {
  const context: RequestContext = {
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userId: 'user-1',
    userName: 'Tester',
    ipAddress: '127.0.0.1',
    userAgent: 'Vitest',
    requestId: 'req-1',
  };

  const mockRepository = {
    findTalentHierarchy: vi.fn(),
    findSubsidiaryScope: vi.fn(),
    findAdapters: vi.fn(),
    findConfigs: vi.fn(),
    findOverrides: vi.fn(),
  } as unknown as AdapterResolutionRepository;

  const mockCryptoService = {
    decrypt: vi.fn((value: string) => `decrypted:${value}`),
    isEncrypted: vi.fn((value: string) => value.startsWith('enc:')),
  } as unknown as AdapterCryptoService;

  const service = new AdapterResolutionApplicationService(
    mockRepository,
    mockCryptoService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockRepository.findConfigs).mockResolvedValue([]);
    vi.mocked(mockRepository.findOverrides).mockResolvedValue([]);
  });

  it('resolves the nearest talent-owned adapter before parent scopes', async () => {
    vi.mocked(mockRepository.findTalentHierarchy).mockResolvedValue({
      id: 'talent-1',
      subsidiaryId: 'subsidiary-1',
    });
    vi.mocked(mockRepository.findAdapters).mockResolvedValue([
      {
        id: 'tenant-adapter',
        ownerType: OwnerType.TENANT,
        ownerId: null,
        platformId: 'platform-1',
        platformCode: 'TCRN_PII_PLATFORM',
        platformDisplayName: 'TCRN PII Platform',
        code: 'TENANT_PII',
        nameEn: 'Tenant PII',
        nameZh: null,
        nameJa: null,
        adapterType: 'api_key',
        inherit: true,
        isActive: true,
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
        updatedAt: new Date('2026-04-14T00:00:00.000Z'),
        version: 1,
      },
      {
        id: 'subsidiary-adapter',
        ownerType: OwnerType.SUBSIDIARY,
        ownerId: 'subsidiary-1',
        platformId: 'platform-1',
        platformCode: 'TCRN_PII_PLATFORM',
        platformDisplayName: 'TCRN PII Platform',
        code: 'SUBSIDIARY_PII',
        nameEn: 'Subsidiary PII',
        nameZh: null,
        nameJa: null,
        adapterType: 'api_key',
        inherit: true,
        isActive: true,
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
        updatedAt: new Date('2026-04-14T00:00:00.000Z'),
        version: 2,
      },
      {
        id: 'talent-adapter',
        ownerType: OwnerType.TALENT,
        ownerId: 'talent-1',
        platformId: 'platform-1',
        platformCode: 'TCRN_PII_PLATFORM',
        platformDisplayName: 'TCRN PII Platform',
        code: 'TALENT_PII',
        nameEn: 'Talent PII',
        nameZh: null,
        nameJa: null,
        adapterType: 'api_key',
        inherit: true,
        isActive: true,
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
        updatedAt: new Date('2026-04-14T00:00:00.000Z'),
        version: 3,
      },
    ]);
    vi.mocked(mockRepository.findConfigs).mockResolvedValue([
      {
        adapterId: 'talent-adapter',
        id: 'cfg-1',
        configKey: 'api_key',
        configValue: 'enc:secret',
        isSecret: true,
      },
    ]);

    await expect(
      service.resolveEffectiveAdapter(
        {
          ownerType: OwnerType.TALENT,
          ownerId: 'talent-1',
          platformCode: 'TCRN_PII_PLATFORM',
          adapterType: 'api_key',
        },
        context,
      ),
    ).resolves.toEqual({
      id: 'talent-adapter',
      ownerType: OwnerType.TALENT,
      ownerId: 'talent-1',
      platform: {
        id: 'platform-1',
        code: 'TCRN_PII_PLATFORM',
        displayName: 'TCRN PII Platform',
      },
      code: 'TALENT_PII',
      nameEn: 'Talent PII',
      nameZh: null,
      nameJa: null,
      adapterType: 'api_key',
      inherit: true,
      isActive: true,
      isInherited: false,
      resolvedFrom: {
        ownerType: OwnerType.TALENT,
        ownerId: 'talent-1',
      },
      configs: [
        {
          id: 'cfg-1',
          configKey: 'api_key',
          configValue: 'decrypted:enc:secret',
          isSecret: true,
        },
      ],
      createdAt: '2026-04-14T00:00:00.000Z',
      updatedAt: '2026-04-14T00:00:00.000Z',
      version: 3,
    });
  });

  it('inherits the nearest active parent adapter when no local adapter exists', async () => {
    vi.mocked(mockRepository.findTalentHierarchy).mockResolvedValue({
      id: 'talent-1',
      subsidiaryId: 'subsidiary-1',
    });
    vi.mocked(mockRepository.findAdapters).mockResolvedValue([
      {
        id: 'tenant-adapter',
        ownerType: OwnerType.TENANT,
        ownerId: null,
        platformId: 'platform-1',
        platformCode: 'TCRN_PII_PLATFORM',
        platformDisplayName: 'TCRN PII Platform',
        code: 'TENANT_PII',
        nameEn: 'Tenant PII',
        nameZh: null,
        nameJa: null,
        adapterType: 'api_key',
        inherit: true,
        isActive: true,
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
        updatedAt: new Date('2026-04-14T00:00:00.000Z'),
        version: 1,
      },
      {
        id: 'subsidiary-adapter',
        ownerType: OwnerType.SUBSIDIARY,
        ownerId: 'subsidiary-1',
        platformId: 'platform-1',
        platformCode: 'TCRN_PII_PLATFORM',
        platformDisplayName: 'TCRN PII Platform',
        code: 'SUBSIDIARY_PII',
        nameEn: 'Subsidiary PII',
        nameZh: null,
        nameJa: null,
        adapterType: 'api_key',
        inherit: true,
        isActive: true,
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
        updatedAt: new Date('2026-04-14T00:00:00.000Z'),
        version: 2,
      },
    ]);

    const resolved = await service.resolveEffectiveAdapter(
      {
        ownerType: OwnerType.TALENT,
        ownerId: 'talent-1',
        platformCode: 'TCRN_PII_PLATFORM',
        adapterType: 'api_key',
      },
      context,
    );

    expect(resolved?.id).toBe('subsidiary-adapter');
    expect(resolved?.isInherited).toBe(true);
    expect(resolved?.resolvedFrom).toEqual({
      ownerType: OwnerType.SUBSIDIARY,
      ownerId: 'subsidiary-1',
    });
  });

  it('fails closed when the nearest parent adapter is inactive instead of falling back higher', async () => {
    vi.mocked(mockRepository.findTalentHierarchy).mockResolvedValue({
      id: 'talent-1',
      subsidiaryId: 'subsidiary-1',
    });
    vi.mocked(mockRepository.findAdapters).mockResolvedValue([
      {
        id: 'tenant-adapter',
        ownerType: OwnerType.TENANT,
        ownerId: null,
        platformId: 'platform-1',
        platformCode: 'TCRN_PII_PLATFORM',
        platformDisplayName: 'TCRN PII Platform',
        code: 'TENANT_PII',
        nameEn: 'Tenant PII',
        nameZh: null,
        nameJa: null,
        adapterType: 'api_key',
        inherit: true,
        isActive: true,
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
        updatedAt: new Date('2026-04-14T00:00:00.000Z'),
        version: 1,
      },
      {
        id: 'subsidiary-adapter',
        ownerType: OwnerType.SUBSIDIARY,
        ownerId: 'subsidiary-1',
        platformId: 'platform-1',
        platformCode: 'TCRN_PII_PLATFORM',
        platformDisplayName: 'TCRN PII Platform',
        code: 'SUBSIDIARY_PII',
        nameEn: 'Subsidiary PII',
        nameZh: null,
        nameJa: null,
        adapterType: 'api_key',
        inherit: true,
        isActive: false,
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
        updatedAt: new Date('2026-04-14T00:00:00.000Z'),
        version: 2,
      },
    ]);

    await expect(
      service.resolveEffectiveAdapter(
        {
          ownerType: OwnerType.TALENT,
          ownerId: 'talent-1',
          platformCode: 'TCRN_PII_PLATFORM',
        },
        context,
      ),
    ).resolves.toBeNull();
  });

  it('fails closed when an inherited tenant adapter is disabled at the subsidiary scope', async () => {
    vi.mocked(mockRepository.findTalentHierarchy).mockResolvedValue({
      id: 'talent-1',
      subsidiaryId: 'subsidiary-1',
    });
    vi.mocked(mockRepository.findAdapters).mockResolvedValue([
      {
        id: 'tenant-adapter',
        ownerType: OwnerType.TENANT,
        ownerId: null,
        platformId: 'platform-1',
        platformCode: 'TCRN_PII_PLATFORM',
        platformDisplayName: 'TCRN PII Platform',
        code: 'TENANT_PII',
        nameEn: 'Tenant PII',
        nameZh: null,
        nameJa: null,
        adapterType: 'api_key',
        inherit: true,
        isActive: true,
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
        updatedAt: new Date('2026-04-14T00:00:00.000Z'),
        version: 1,
      },
    ]);
    vi.mocked(mockRepository.findOverrides).mockResolvedValue([
      {
        adapterId: 'tenant-adapter',
        ownerType: OwnerType.SUBSIDIARY,
        ownerId: 'subsidiary-1',
        isDisabled: true,
      },
    ]);

    await expect(
      service.resolveEffectiveAdapter(
        {
          ownerType: OwnerType.TALENT,
          ownerId: 'talent-1',
          platformCode: 'TCRN_PII_PLATFORM',
        },
        context,
      ),
    ).resolves.toBeNull();
  });

  it('supports direct tenant-root resolution', async () => {
    vi.mocked(mockRepository.findAdapters).mockResolvedValue([
      {
        id: 'tenant-adapter',
        ownerType: OwnerType.TENANT,
        ownerId: null,
        platformId: 'platform-1',
        platformCode: 'TCRN_PII_PLATFORM',
        platformDisplayName: 'TCRN PII Platform',
        code: 'TENANT_PII',
        nameEn: 'Tenant PII',
        nameZh: null,
        nameJa: null,
        adapterType: 'api_key',
        inherit: false,
        isActive: true,
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
        updatedAt: new Date('2026-04-14T00:00:00.000Z'),
        version: 1,
      },
    ]);

    const resolved = await service.resolveEffectiveAdapter(
      {
        ownerType: OwnerType.TENANT,
        ownerId: null,
        platformCode: 'TCRN_PII_PLATFORM',
      },
      context,
    );

    expect(resolved?.id).toBe('tenant-adapter');
    expect(mockRepository.findTalentHierarchy).not.toHaveBeenCalled();
    expect(mockRepository.findSubsidiaryScope).not.toHaveBeenCalled();
  });

  it('throws when talent scope resolution targets a missing talent', async () => {
    vi.mocked(mockRepository.findTalentHierarchy).mockResolvedValue(null);

    await expect(
      service.resolveEffectiveAdapter(
        {
          ownerType: OwnerType.TALENT,
          ownerId: 'missing-talent',
          platformCode: 'TCRN_PII_PLATFORM',
        },
        context,
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
