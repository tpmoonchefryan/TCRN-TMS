// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { ConfigEntity, DictionaryRecord } from '@/components/shared/constants';
import type { TalentGetResponse } from '@/lib/api/modules/talent';

import type { TalentData } from './types';

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

export function mapConfigEntities(items: Record<string, unknown>[]): ConfigEntity[] {
  return items.map((item) => ({
    id: (item.id as string) || '',
    code: (item.code as string) || '',
    nameEn: (item.nameEn as string) || '',
    nameZh: (item.nameZh as string) || '',
    nameJa: (item.nameJa as string) || '',
    ownerType: ((item.ownerType as 'tenant' | 'subsidiary' | 'talent') || 'tenant'),
    ownerLevel: (item.ownerLevel as string) || 'Tenant',
    isActive: (item.isActive as boolean) ?? true,
    isForceUse: (item.isForceUse as boolean) ?? false,
    isSystem: (item.isSystem as boolean) ?? false,
    sortOrder: (item.sortOrder as number) || 0,
    inheritedFrom: (item.inheritedFrom as string) || undefined,
  }));
}

export function mapDictionaryRecords(items: Record<string, unknown>[]): DictionaryRecord[] {
  return items.map((item) => ({
    code: (item.code as string) || '',
    nameEn: (item.nameEn as string) || '',
    nameZh: (item.nameZh as string) || '',
    nameJa: (item.nameJa as string) || '',
    isActive: (item.isActive as boolean) ?? true,
  }));
}
