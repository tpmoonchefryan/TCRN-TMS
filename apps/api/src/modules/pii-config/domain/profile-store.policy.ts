// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type {
  CreateProfileStoreDto,
  UpdateProfileStoreDto,
} from '../dto/pii-config.dto';

export interface ProfileStoreListRow {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  version: number;
}

export interface ProfileStoreDetailRow {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  descriptionEn: string | null;
  descriptionZh: string | null;
  descriptionJa: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface ProfileStoreCreatePayload {
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  descriptionEn: string | null;
  descriptionZh: string | null;
  descriptionJa: string | null;
  isDefault: boolean;
}

export interface ProfileStoreCreateRow {
  id: string;
  code: string;
  nameEn: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface ProfileStoreUpdateLookupRow {
  id: string;
  code: string;
  nameEn: string;
  isActive: boolean;
  isDefault: boolean;
  version: number;
}

export interface ProfileStoreUpdateRow {
  id: string;
  code: string;
  nameEn: string;
  isActive: boolean;
  isDefault: boolean;
  version: number;
  updatedAt: Date;
}

export interface ProfileStoreFieldChange {
  field:
    | 'nameEn'
    | 'nameZh'
    | 'nameJa'
    | 'descriptionEn'
    | 'descriptionZh'
    | 'descriptionJa'
    | 'isActive'
    | 'isDefault';
  value: unknown;
}

export const buildProfileStoreCreatePayload = (
  dto: CreateProfileStoreDto,
): ProfileStoreCreatePayload => ({
  code: dto.code,
  nameEn: dto.nameEn,
  nameZh: dto.nameZh || null,
  nameJa: dto.nameJa || null,
  descriptionEn: dto.descriptionEn || null,
  descriptionZh: dto.descriptionZh || null,
  descriptionJa: dto.descriptionJa || null,
  isDefault: dto.isDefault ?? false,
});

export const buildProfileStoreListItem = (
  row: ProfileStoreListRow,
  talentCount: number,
  customerCount: number,
) => ({
  id: row.id,
  code: row.code,
  name: row.nameEn,
  nameZh: row.nameZh,
  nameJa: row.nameJa,
  talentCount,
  customerCount,
  isDefault: row.isDefault,
  isActive: row.isActive,
  createdAt: row.createdAt,
  version: row.version,
});

export const buildProfileStoreDetailResponse = (
  row: ProfileStoreDetailRow,
  talentCount: number,
  customerCount: number,
) => ({
  id: row.id,
  code: row.code,
  name: row.nameEn,
  nameZh: row.nameZh,
  nameJa: row.nameJa,
  description: row.descriptionEn,
  descriptionZh: row.descriptionZh,
  descriptionJa: row.descriptionJa,
  talentCount,
  customerCount,
  isDefault: row.isDefault,
  isActive: row.isActive,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  version: row.version,
});

export const buildProfileStoreCreateResponse = (row: ProfileStoreCreateRow) => ({
  id: row.id,
  code: row.code,
  name: row.nameEn,
  isDefault: row.isDefault,
  createdAt: row.createdAt,
});

export const buildProfileStoreUpdateChanges = (
  dto: UpdateProfileStoreDto,
): ProfileStoreFieldChange[] => {
  const changes: ProfileStoreFieldChange[] = [];

  const textFields = [
    'nameEn',
    'nameZh',
    'nameJa',
    'descriptionEn',
    'descriptionZh',
    'descriptionJa',
    'isActive',
  ] as const;

  for (const field of textFields) {
    const value = dto[field];
    if (value !== undefined) {
      changes.push({ field, value });
    }
  }

  if (dto.isDefault === true) {
    changes.push({
      field: 'isDefault',
      value: true,
    });
  }

  return changes;
};

export const buildProfileStoreUpdateAudit = (
  previous: ProfileStoreUpdateLookupRow,
  updated: ProfileStoreUpdateRow,
) => ({
  oldValue: {
    nameEn: previous.nameEn,
    isActive: previous.isActive,
    isDefault: previous.isDefault,
  },
  newValue: {
    nameEn: updated.nameEn,
    isActive: updated.isActive,
    isDefault: updated.isDefault,
  },
});

export const buildProfileStoreUpdateResponse = (row: ProfileStoreUpdateRow) => ({
  id: row.id,
  code: row.code,
  version: row.version,
  updatedAt: row.updatedAt,
});
