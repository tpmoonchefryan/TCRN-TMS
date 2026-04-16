// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { ConfigEntity, DictionaryRecord } from '@/domains/config-dictionary-settings/components/shared-constants';
import {
  configEntityApi,
  type ConfigurationEntityRecord,
  dictionaryApi,
  subsidiaryApi,
  type SubsidiaryRecord,
  type SystemDictionaryItemRecord,
  tenantApi,
  type TenantRecord,
  type TenantSettingsRecord,
  type TenantStatsRecord,
} from '@/lib/api/modules/configuration';

export interface TenantSettingsScreenState {
  id: TenantRecord['id'];
  code: TenantRecord['code'];
  name: TenantRecord['name'];
  tier: TenantRecord['tier'];
  isActive: TenantRecord['isActive'];
  createdAt: TenantRecord['createdAt'];
  settings: TenantSettingsRecord | null;
  stats?: TenantStatsRecord;
}

export interface SubsidiarySettingsScreenState {
  id: SubsidiaryRecord['id'];
  code: SubsidiaryRecord['code'];
  displayName: string;
  path: SubsidiaryRecord['path'];
  parentId: SubsidiaryRecord['parentId'];
  isActive: SubsidiaryRecord['isActive'];
  createdAt: SubsidiaryRecord['createdAt'];
  updatedAt?: SubsidiaryRecord['updatedAt'];
  childrenCount: number;
  talentCount: number;
  version: SubsidiaryRecord['version'];
}

export const settingsManagementApi = {
  getTenant: (tenantId: string) => tenantApi.get(tenantId),

  updateTenant: (tenantId: string, payload: Parameters<typeof tenantApi.update>[1]) =>
    tenantApi.update(tenantId, payload),

  getSubsidiary: (subsidiaryId: string) => subsidiaryApi.get(subsidiaryId),

  updateSubsidiary: (subsidiaryId: string, payload: Parameters<typeof subsidiaryApi.update>[1]) =>
    subsidiaryApi.update(subsidiaryId, payload),

  listConfigEntities: (
    entityType: string,
    params: Parameters<typeof configEntityApi.list>[1],
  ) => configEntityApi.list(entityType, params),

  updateConfigEntity: (
    entityType: string,
    entityId: string,
    payload: Parameters<typeof configEntityApi.update>[2],
  ) => configEntityApi.update(entityType, entityId, payload),

  createConfigEntity: (
    entityType: string,
    payload: Parameters<typeof configEntityApi.create>[1],
  ) => configEntityApi.create(entityType, payload),

  deactivateConfigEntity: (entityType: string, entityId: string, version: number) =>
    configEntityApi.deactivate(entityType, entityId, version),

  reactivateConfigEntity: (entityType: string, entityId: string, version: number) =>
    configEntityApi.reactivate(entityType, entityId, version),

  listDictionaryItems: (dictionaryType: string) => dictionaryApi.getByType(dictionaryType),
};

export function createTenantFallbackState(params: {
  tenantCode: string | null;
  tenantId: string;
  tenantNameFallback?: string;
}): TenantSettingsScreenState {
  const { tenantCode, tenantId, tenantNameFallback } = params;

  return {
    id: tenantId,
    code: tenantCode || 'TENANT',
    name: tenantCode || tenantNameFallback || 'TENANT',
    tier: 'standard',
    isActive: true,
    createdAt: new Date().toISOString(),
    settings: null,
  };
}

export function mapTenantRecordToSettingsState(
  tenant: TenantRecord,
): TenantSettingsScreenState {
  return {
    id: tenant.id,
    code: tenant.code,
    name: tenant.name,
    tier: tenant.tier,
    isActive: tenant.isActive,
    createdAt: tenant.createdAt,
    settings: tenant.settings ?? null,
    stats: tenant.stats,
  };
}

export function formatConfigEntityOwnerLevel(
  ownerType?: 'tenant' | 'subsidiary' | 'talent' | null,
): string {
  switch (ownerType) {
    case 'subsidiary':
      return 'Subsidiary';
    case 'talent':
      return 'Talent';
    default:
      return 'Tenant';
  }
}

export function mapSubsidiaryRecordToSettingsState(
  subsidiary: SubsidiaryRecord,
): SubsidiarySettingsScreenState {
  return {
    id: subsidiary.id,
    code: subsidiary.code,
    displayName: subsidiary.name || subsidiary.nameEn || subsidiary.code,
    path: subsidiary.path,
    parentId: subsidiary.parentId || null,
    isActive: subsidiary.isActive,
    createdAt: subsidiary.createdAt,
    updatedAt: subsidiary.updatedAt,
    childrenCount: subsidiary.childrenCount ?? 0,
    talentCount: subsidiary.talentCount ?? 0,
    version: subsidiary.version,
  };
}

export function mapConfigurationEntities(
  entities: ConfigurationEntityRecord[],
): ConfigEntity[] {
  return entities.map((entity) => ({
    id: entity.id,
    code: entity.code,
    nameEn: entity.nameEn,
    nameZh: entity.nameZh ?? '',
    nameJa: entity.nameJa ?? '',
    ownerType: entity.ownerType ?? 'tenant',
    ownerLevel: formatConfigEntityOwnerLevel(entity.ownerType),
    isActive: entity.isActive,
    isForceUse: entity.isForceUse ?? false,
    isSystem: entity.isSystem ?? false,
    sortOrder: entity.sortOrder,
    inheritedFrom: entity.isInherited ? formatConfigEntityOwnerLevel(entity.ownerType) : undefined,
  }));
}

export function mapDictionaryItems(
  items: SystemDictionaryItemRecord[],
): DictionaryRecord[] {
  return items.map((item) => ({
    code: item.code,
    nameEn: item.nameEn,
    nameZh: item.nameZh ?? '',
    nameJa: item.nameJa ?? '',
    isActive: item.isActive,
  }));
}
