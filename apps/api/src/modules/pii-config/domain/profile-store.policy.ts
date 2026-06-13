// SPDX-License-Identifier: Apache-2.0
import {
  mergeLocalizedText,
  normalizeLocalizedText,
  type LocalizedText,
  type PartialLocalizedText,
} from '@tcrn/shared';

import type { CreateProfileStoreDto, UpdateProfileStoreDto } from '../dto/pii-config.dto';

export interface ProfileStoreListRow {
  id: string;
  code: string;
  name: LocalizedText;
  extraData: Record<string, unknown> | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  version: number;
}

export interface ProfileStoreDetailRow extends ProfileStoreListRow {
  description: LocalizedText;
  updatedAt: Date;
}

export interface ProfileStoreCreatePayload {
  code: string;
  name: LocalizedText;
  description: LocalizedText;
  isDefault: boolean;
}

export interface ProfileStoreCreateRow {
  id: string;
  code: string;
  name: LocalizedText;
  isDefault: boolean;
  createdAt: Date;
}

export interface ProfileStoreUpdateLookupRow {
  id: string;
  code: string;
  name: LocalizedText;
  description: LocalizedText;
  extraData: Record<string, unknown> | null;
  isActive: boolean;
  isDefault: boolean;
  version: number;
}

export interface ProfileStoreUpdateRow extends ProfileStoreUpdateLookupRow {
  updatedAt: Date;
}

export interface ProfileStoreFieldChange {
  field: 'name' | 'description' | 'isActive' | 'isDefault';
  value: unknown;
}

export const buildProfileStoreCreatePayload = (
  dto: CreateProfileStoreDto
): ProfileStoreCreatePayload => ({
  code: dto.code,
  name: dto.name,
  description: normalizeLocalizedText(dto.description, dto.name.en),
  isDefault: dto.isDefault ?? false,
});

export const buildProfileStoreListItem = (
  row: ProfileStoreListRow,
  talentCount: number,
  customerCount: number
) => ({
  id: row.id,
  code: row.code,
  name: row.name,
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
  customerCount: number
) => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
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
  name: row.name,
  isDefault: row.isDefault,
  createdAt: row.createdAt,
});

export const buildProfileStoreUpdateChanges = (
  dto: UpdateProfileStoreDto,
  current: ProfileStoreUpdateLookupRow
): ProfileStoreFieldChange[] => {
  const changes: ProfileStoreFieldChange[] = [];

  if (dto.name !== undefined) {
    changes.push({
      field: 'name',
      value: mergeLocalizedText(current.name, dto.name),
    });
  }

  if (dto.description !== undefined) {
    changes.push({
      field: 'description',
      value: normalizeLocalizedText(
        {
          ...current.description,
          ...(dto.description as PartialLocalizedText),
        },
        current.description.en
      ),
    });
  }

  if (dto.isActive !== undefined) {
    changes.push({ field: 'isActive', value: dto.isActive });
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
  updated: ProfileStoreUpdateRow
) => ({
  oldValue: {
    name: previous.name,
    description: previous.description,
    isActive: previous.isActive,
    isDefault: previous.isDefault,
  },
  newValue: {
    name: updated.name,
    description: updated.description,
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
