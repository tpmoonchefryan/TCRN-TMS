// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../database';
import { ChangeLogService } from '../../log';
import { ProfileStoreRepository } from '../infrastructure/profile-store.repository';
import { ProfileStoreApplicationService } from './profile-store.service';

describe('ProfileStoreApplicationService', () => {
  const context: RequestContext = {
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userId: 'user-1',
    userName: 'Admin',
    ipAddress: '127.0.0.1',
    requestId: 'req-1',
  };

  const mockRepository = {
    findMany: vi.fn(),
    countMany: vi.fn(),
    countTalentByStoreId: vi.fn(),
    countCustomerByStoreId: vi.fn(),
    findById: vi.fn(),
    findByCode: vi.fn(),
    unsetDefaultStores: vi.fn(),
    create: vi.fn(),
    findForUpdate: vi.fn(),
    update: vi.fn(),
  } as unknown as ProfileStoreRepository;

  const mockDatabaseService = {
    calculatePaginationMeta: vi.fn(),
  } as unknown as DatabaseService;

  const mockChangeLogService = {
    createDirect: vi.fn(),
  } as unknown as ChangeLogService;

  const service = new ProfileStoreApplicationService(
    mockRepository,
    mockDatabaseService,
    mockChangeLogService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockDatabaseService.calculatePaginationMeta).mockReturnValue({
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    } as never);
  });

  it('returns mapped list items with pagination metadata', async () => {
    vi.mocked(mockRepository.findMany).mockResolvedValue([
      {
        id: 'store-1',
        code: 'DEFAULT_STORE',
        nameEn: 'Default Profile Store',
        nameZh: null,
        nameJa: null,
        extraData: {
          translations: {
            fr: 'Magasin de profils par défaut',
          },
        },
        isDefault: true,
        isActive: true,
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
        version: 1,
      },
    ]);
    vi.mocked(mockRepository.countMany).mockResolvedValue(1);
    vi.mocked(mockRepository.countTalentByStoreId).mockResolvedValue(2);
    vi.mocked(mockRepository.countCustomerByStoreId).mockResolvedValue(10);

    await expect(service.findMany({}, context)).resolves.toEqual({
      items: [
        {
          id: 'store-1',
          code: 'DEFAULT_STORE',
          name: 'Default Profile Store',
          nameZh: null,
          nameJa: null,
          translations: {
            en: 'Default Profile Store',
            fr: 'Magasin de profils par défaut',
          },
          talentCount: 2,
          customerCount: 10,
          isDefault: true,
          isActive: true,
          createdAt: new Date('2026-04-14T00:00:00.000Z'),
          version: 1,
        },
      ],
      meta: {
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
        },
      },
    });

    expect(mockRepository.findMany).toHaveBeenCalledWith('tenant_test', false, undefined, 20, 0);
    expect(mockRepository.countMany).toHaveBeenCalledWith('tenant_test', false, undefined);
  });

  it('passes the normalized search keyword into repository pagination queries', async () => {
    vi.mocked(mockRepository.findMany).mockResolvedValue([]);
    vi.mocked(mockRepository.countMany).mockResolvedValue(0);

    await service.findMany(
      {
        search: '  archive  ',
        page: 2,
        pageSize: 50,
        includeInactive: true,
      },
      context,
    );

    expect(mockRepository.findMany).toHaveBeenCalledWith('tenant_test', true, 'archive', 50, 50);
    expect(mockRepository.countMany).toHaveBeenCalledWith('tenant_test', true, 'archive');
  });

  it('fails closed when the detail record does not exist', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    await expect(
      service.findById('missing-store', context),
    ).rejects.toThrow(NotFoundException);
  });

  it('fails closed on duplicate create code', async () => {
    vi.mocked(mockRepository.findByCode).mockResolvedValue({ id: 'existing' });

    await expect(
      service.create(
        {
          code: 'DEFAULT_STORE',
          nameEn: 'Default Profile Store',
        },
        context,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('creates a default profile store without any pii binding contract', async () => {
    vi.mocked(mockRepository.findByCode).mockResolvedValue(null);
    vi.mocked(mockRepository.unsetDefaultStores).mockResolvedValue(undefined as never);
    vi.mocked(mockRepository.create).mockResolvedValue({
      id: 'store-1',
      code: 'DEFAULT_STORE',
      nameEn: 'Default Profile Store',
      isDefault: true,
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
    });
    vi.mocked(mockChangeLogService.createDirect).mockResolvedValue(undefined as never);

    await expect(
      service.create(
        {
          code: 'DEFAULT_STORE',
          nameEn: 'Default Profile Store',
          isDefault: true,
        },
        context,
      ),
    ).resolves.toEqual({
      id: 'store-1',
      code: 'DEFAULT_STORE',
      name: 'Default Profile Store',
      isDefault: true,
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
    });

    expect(mockRepository.unsetDefaultStores).toHaveBeenCalledWith('tenant_test');
    expect(mockRepository.create).toHaveBeenCalledWith(
      'tenant_test',
      {
        code: 'DEFAULT_STORE',
        nameEn: 'Default Profile Store',
        nameZh: null,
        nameJa: null,
        descriptionEn: null,
        descriptionZh: null,
        descriptionJa: null,
        extraData: null,
        isDefault: true,
      },
      'user-1',
    );
  });

  it('persists managed translation maps into profile-store payloads and exposes them in detail responses', async () => {
    vi.mocked(mockRepository.findByCode).mockResolvedValue(null);
    vi.mocked(mockRepository.create).mockResolvedValue({
      id: 'store-1',
      code: 'DEFAULT_STORE',
      nameEn: 'Default Profile Store',
      isDefault: false,
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
    });
    vi.mocked(mockChangeLogService.createDirect).mockResolvedValue(undefined as never);

    await service.create(
      {
        code: 'DEFAULT_STORE',
        nameEn: 'Default Profile Store',
        translations: {
          fr: 'Magasin de profils par défaut',
          zh_HANT: '預設檔案庫',
        },
        descriptionEn: 'Primary customer profile store',
        descriptionTranslations: {
          fr: 'Magasin principal des profils clients',
        },
      },
      context,
    );

    expect(mockRepository.create).toHaveBeenCalledWith(
      'tenant_test',
      {
        code: 'DEFAULT_STORE',
        nameEn: 'Default Profile Store',
        nameZh: null,
        nameJa: null,
        descriptionEn: 'Primary customer profile store',
        descriptionZh: null,
        descriptionJa: null,
        extraData: {
          translations: {
            fr: 'Magasin de profils par défaut',
            zh_HANT: '預設檔案庫',
          },
          descriptionTranslations: {
            fr: 'Magasin principal des profils clients',
          },
        },
        isDefault: false,
      },
      'user-1',
    );

    vi.mocked(mockRepository.findById).mockResolvedValue({
      id: 'store-1',
      code: 'DEFAULT_STORE',
      nameEn: 'Default Profile Store',
      nameZh: '默认档案库',
      nameJa: 'デフォルトプロフィールストア',
      descriptionEn: 'Primary customer profile store',
      descriptionZh: '主要客户档案库',
      descriptionJa: '主要な顧客プロフィールストア',
      extraData: {
        translations: {
          fr: 'Magasin de profils par défaut',
          zh_HANT: '預設檔案庫',
        },
        descriptionTranslations: {
          fr: 'Magasin principal des profils clients',
        },
      },
      isDefault: false,
      isActive: true,
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
      updatedAt: new Date('2026-04-14T00:10:00.000Z'),
      version: 1,
    });
    vi.mocked(mockRepository.countTalentByStoreId).mockResolvedValue(2);
    vi.mocked(mockRepository.countCustomerByStoreId).mockResolvedValue(10);

    await expect(service.findById('store-1', context)).resolves.toMatchObject({
      id: 'store-1',
      translations: {
        en: 'Default Profile Store',
        zh_HANS: '默认档案库',
        zh_HANT: '預設檔案庫',
        ja: 'デフォルトプロフィールストア',
        fr: 'Magasin de profils par défaut',
      },
      descriptionTranslations: {
        en: 'Primary customer profile store',
        zh_HANS: '主要客户档案库',
        ja: '主要な顧客プロフィールストア',
        fr: 'Magasin principal des profils clients',
      },
    });
  });

  it('fails closed on optimistic-lock mismatch during update', async () => {
    vi.mocked(mockRepository.findForUpdate).mockResolvedValue({
      id: 'store-1',
      code: 'DEFAULT_STORE',
      nameEn: 'Old Name',
      nameZh: null,
      nameJa: null,
      descriptionEn: null,
      descriptionZh: null,
      descriptionJa: null,
      extraData: null,
      isActive: true,
      isDefault: true,
      version: 1,
    });

    await expect(
      service.update(
        'store-1',
        {
          version: 2,
          nameEn: 'New Name',
        },
        context,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('fails closed when trying to deactivate a store that still has customers', async () => {
    vi.mocked(mockRepository.findForUpdate).mockResolvedValue({
      id: 'store-1',
      code: 'DEFAULT_STORE',
      nameEn: 'Default Profile Store',
      nameZh: null,
      nameJa: null,
      descriptionEn: null,
      descriptionZh: null,
      descriptionJa: null,
      extraData: null,
      isActive: true,
      isDefault: true,
      version: 1,
    });
    vi.mocked(mockRepository.countCustomerByStoreId).mockResolvedValue(3);

    await expect(
      service.update(
        'store-1',
        {
          version: 1,
          isActive: false,
        },
        context,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('fails closed when trying to unset the default flag directly', async () => {
    vi.mocked(mockRepository.findForUpdate).mockResolvedValue({
      id: 'store-1',
      code: 'DEFAULT_STORE',
      nameEn: 'Default Profile Store',
      nameZh: null,
      nameJa: null,
      descriptionEn: null,
      descriptionZh: null,
      descriptionJa: null,
      extraData: null,
      isActive: true,
      isDefault: true,
      version: 1,
    });

    await expect(
      service.update(
        'store-1',
        {
          version: 1,
          isDefault: false,
        },
        context,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('promotes another store to default and writes audit without pii metadata', async () => {
    vi.mocked(mockRepository.findForUpdate).mockResolvedValue({
      id: 'store-2',
      code: 'SECONDARY_STORE',
      nameEn: 'Secondary Store',
      nameZh: null,
      nameJa: null,
      descriptionEn: null,
      descriptionZh: null,
      descriptionJa: null,
      extraData: null,
      isActive: true,
      isDefault: false,
      version: 1,
    });
    vi.mocked(mockRepository.unsetDefaultStores).mockResolvedValue(undefined as never);
    vi.mocked(mockRepository.update).mockResolvedValue({
      id: 'store-2',
      code: 'SECONDARY_STORE',
      nameEn: 'Secondary Store',
      nameZh: null,
      nameJa: null,
      descriptionEn: null,
      descriptionZh: null,
      descriptionJa: null,
      extraData: null,
      isActive: true,
      isDefault: true,
      version: 2,
      updatedAt: new Date('2026-04-14T00:10:00.000Z'),
    });
    vi.mocked(mockChangeLogService.createDirect).mockResolvedValue(undefined as never);

    await expect(
      service.update(
        'store-2',
        {
          version: 1,
          isDefault: true,
        },
        context,
      ),
    ).resolves.toEqual({
      id: 'store-2',
      code: 'SECONDARY_STORE',
      version: 2,
      updatedAt: new Date('2026-04-14T00:10:00.000Z'),
    });

    expect(mockRepository.unsetDefaultStores).toHaveBeenCalledWith('tenant_test');
    expect(mockRepository.update).toHaveBeenCalledWith(
      'tenant_test',
      'store-2',
      [
        {
          field: 'isDefault',
          value: true,
        },
      ],
      'user-1',
    );
  });

  it('preserves the version-only update path', async () => {
    vi.mocked(mockRepository.findForUpdate).mockResolvedValue({
      id: 'store-1',
      code: 'DEFAULT_STORE',
      nameEn: 'Default Profile Store',
      nameZh: null,
      nameJa: null,
      descriptionEn: null,
      descriptionZh: null,
      descriptionJa: null,
      extraData: null,
      isActive: true,
      isDefault: true,
      version: 1,
    });
    vi.mocked(mockRepository.update).mockResolvedValue({
      id: 'store-1',
      code: 'DEFAULT_STORE',
      nameEn: 'Default Profile Store',
      nameZh: null,
      nameJa: null,
      descriptionEn: null,
      descriptionZh: null,
      descriptionJa: null,
      extraData: null,
      isActive: true,
      isDefault: true,
      version: 2,
      updatedAt: new Date('2026-04-14T00:10:00.000Z'),
    });
    vi.mocked(mockChangeLogService.createDirect).mockResolvedValue(undefined as never);

    await expect(
      service.update(
        'store-1',
        {
          version: 1,
        },
        context,
      ),
    ).resolves.toEqual({
      id: 'store-1',
      code: 'DEFAULT_STORE',
      version: 2,
      updatedAt: new Date('2026-04-14T00:10:00.000Z'),
    });

    expect(mockRepository.update).toHaveBeenCalledWith(
      'tenant_test',
      'store-1',
      [],
      'user-1',
    );
  });
});
