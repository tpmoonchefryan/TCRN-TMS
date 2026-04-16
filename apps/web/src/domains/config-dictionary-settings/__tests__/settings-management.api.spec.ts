// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, expect, it } from 'vitest';

import {
  createTenantFallbackState,
  mapConfigurationEntities,
  mapDictionaryItems,
  mapSubsidiaryRecordToSettingsState,
} from '@/domains/config-dictionary-settings/api/settings-management.api';

describe('settings-management.api', () => {
  it('creates a tenant fallback state from runtime auth data', () => {
    expect(
      createTenantFallbackState({
        tenantId: 'tenant-1',
        tenantCode: 'ACME',
      }),
    ).toMatchObject({
      id: 'tenant-1',
      code: 'ACME',
      name: 'ACME',
      tier: 'standard',
      isActive: true,
      settings: null,
    });
  });

  it('maps subsidiary, configuration entity, and dictionary records for settings screens', () => {
    expect(
      mapSubsidiaryRecordToSettingsState({
        id: 'subsidiary-1',
        code: 'SUB_1',
        depth: 1,
        name: 'Subsidiary One',
        nameEn: 'Subsidiary One',
        nameZh: null,
        nameJa: null,
        path: 'sub-1',
        parentId: null,
        sortOrder: 1,
        isActive: true,
        createdAt: '2026-04-11T00:00:00.000Z',
        updatedAt: '2026-04-12T00:00:00.000Z',
        childrenCount: 2,
        talentCount: 3,
        version: 7,
      }),
    ).toEqual({
      id: 'subsidiary-1',
      code: 'SUB_1',
      displayName: 'Subsidiary One',
      path: 'sub-1',
      parentId: null,
      isActive: true,
      createdAt: '2026-04-11T00:00:00.000Z',
      updatedAt: '2026-04-12T00:00:00.000Z',
      childrenCount: 2,
      talentCount: 3,
      version: 7,
    });

    expect(
      mapConfigurationEntities([
        {
          id: 'entity-1',
          code: 'STATUS_A',
          name: 'Status A',
          nameEn: 'Status A',
          nameZh: null,
          nameJa: null,
          ownerType: 'subsidiary',
          sortOrder: 1,
          isActive: true,
          isForceUse: true,
          isSystem: false,
          isInherited: false,
          version: 2,
        },
      ]),
    ).toEqual([
      {
        id: 'entity-1',
        code: 'STATUS_A',
        nameEn: 'Status A',
        nameZh: '',
        nameJa: '',
        ownerType: 'subsidiary',
        ownerLevel: 'Subsidiary',
        isActive: true,
        isForceUse: true,
        isSystem: false,
        sortOrder: 1,
        inheritedFrom: undefined,
      },
    ]);

    expect(
      mapDictionaryItems([
        {
          id: 'dict-1',
          dictionaryCode: 'countries',
          code: 'CN',
          name: 'China',
          nameEn: 'China',
          nameZh: '中国',
          nameJa: '中国',
          descriptionEn: null,
          descriptionZh: null,
          descriptionJa: null,
          sortOrder: 1,
          isActive: true,
          extraData: null,
          createdAt: '2026-04-11T00:00:00.000Z',
          updatedAt: '2026-04-11T00:00:00.000Z',
          version: 1,
        },
      ]),
    ).toEqual([
      {
        code: 'CN',
        nameEn: 'China',
        nameZh: '中国',
        nameJa: '中国',
        isActive: true,
      },
    ]);
  });
});
