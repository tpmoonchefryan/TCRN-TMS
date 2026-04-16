// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { ConfigEntity, DictionaryRecord } from '@/components/shared/constants';
import type { TalentGetResponse } from '@/lib/api/modules/talent';

import type { TalentData } from './types';

type ConfigEntitySource = {
  id: string;
  code: string;
  nameEn: string;
  nameZh?: string | null;
  nameJa?: string | null;
  ownerType?: 'tenant' | 'subsidiary' | 'talent' | null;
  ownerLevel?: string;
  isActive?: boolean;
  isForceUse?: boolean;
  isSystem?: boolean;
  sortOrder?: number;
  isInherited?: boolean;
  inheritedFrom?: string;
};

type DictionaryRecordSource = {
  code: string;
  nameEn: string;
  nameZh?: string | null;
  nameJa?: string | null;
  isActive?: boolean;
};

function formatOwnerLevel(ownerType?: 'tenant' | 'subsidiary' | 'talent' | null): string {
  switch (ownerType) {
    case 'subsidiary':
      return 'Subsidiary';
    case 'talent':
      return 'Talent';
    default:
      return 'Tenant';
  }
}

export function mapTalentApiResponseToTalentData(
  data: TalentGetResponse,
  subsidiaryId?: string
): TalentData {
  return {
    id: data.id,
    code: data.code,
    displayName: data.displayName || data.nameEn || data.code,
    avatarUrl: data.avatarUrl || null,
    path: data.path || `/${data.code}/`,
    subsidiaryId: data.subsidiaryId || subsidiaryId || null,
    profileStoreId: data.profileStoreId || null,
    profileStore: data.profileStore || null,
    homepagePath: data.homepagePath || data.code.toLowerCase(),
    timezone: data.timezone || 'UTC',
    lifecycleStatus: data.lifecycleStatus,
    publishedAt: data.publishedAt,
    isActive: data.isActive ?? true,
    createdAt: data.createdAt,
    customerCount: data.stats?.customerCount || 0,
    version: data.version || 1,
    settings: {
      inheritTimezone: data.settings?.inheritTimezone ?? true,
      homepageEnabled: data.settings?.homepageEnabled ?? true,
      marshmallowEnabled: data.settings?.marshmallowEnabled ?? true,
    },
    externalPagesDomain: {
      homepage: data.externalPagesDomain?.homepage || null,
      marshmallow: data.externalPagesDomain?.marshmallow || null,
    },
  };
}

export function mapConfigEntities(items: ConfigEntitySource[]): ConfigEntity[] {
  return items.map((item) => ({
    id: item.id,
    code: item.code,
    nameEn: item.nameEn,
    nameZh: item.nameZh ?? '',
    nameJa: item.nameJa ?? '',
    ownerType: item.ownerType ?? 'tenant',
    ownerLevel: formatOwnerLevel(item.ownerType),
    isActive: item.isActive ?? true,
    isForceUse: item.isForceUse ?? false,
    isSystem: item.isSystem ?? false,
    sortOrder: item.sortOrder ?? 0,
    inheritedFrom:
      item.inheritedFrom ?? (item.isInherited ? formatOwnerLevel(item.ownerType) : undefined),
  }));
}

export function mapDictionaryRecords(items: DictionaryRecordSource[]): DictionaryRecord[] {
  return items.map((item) => ({
    code: item.code,
    nameEn: item.nameEn,
    nameZh: item.nameZh ?? '',
    nameJa: item.nameJa ?? '',
    isActive: item.isActive ?? true,
  }));
}
