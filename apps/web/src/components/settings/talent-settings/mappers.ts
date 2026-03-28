// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { ConfigEntity, DictionaryRecord } from '@/components/shared/constants';

import type { TalentData } from './types';

interface TalentApiResponseData {
  id: string;
  code: string;
  displayName?: string | null;
  nameEn?: string | null;
  avatarUrl?: string | null;
  path?: string | null;
  subsidiaryId?: string | null;
  subsidiary?: {
    displayName?: string | null;
  } | null;
  profileStoreId?: string | null;
  profileStore?: TalentData['profileStore'] | null;
  homepagePath?: string | null;
  timezone?: string | null;
  isActive?: boolean | null;
  createdAt: string;
  version?: number | null;
  settings?: {
    inheritTimezone?: boolean | null;
    homepageEnabled?: boolean | null;
    marshmallowEnabled?: boolean | null;
  } | null;
  externalPagesDomain?: TalentData['externalPagesDomain'] | null;
  _count?: {
    customers?: number | null;
  } | null;
  stats?: {
    customerCount?: number | null;
  } | null;
}

export function mapTalentApiResponseToTalentData(
  data: TalentApiResponseData,
  subsidiaryId?: string
): TalentData {
  return {
    id: data.id,
    code: data.code,
    displayName: data.displayName || data.nameEn || data.code,
    avatarUrl: data.avatarUrl || null,
    path: data.path || `/${data.code}/`,
    subsidiaryId: data.subsidiaryId || subsidiaryId || null,
    subsidiaryName: data.subsidiary?.displayName || null,
    profileStoreId: data.profileStoreId || null,
    profileStore: data.profileStore || null,
    homepagePath: data.homepagePath || data.code.toLowerCase(),
    timezone: data.timezone || 'UTC',
    isActive: data.isActive ?? true,
    createdAt: data.createdAt,
    customerCount: data._count?.customers || data.stats?.customerCount || 0,
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
