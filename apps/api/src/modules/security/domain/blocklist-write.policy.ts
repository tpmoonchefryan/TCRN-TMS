// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type {
  CreateBlocklistDto,
  DisableScopeDto,
  UpdateBlocklistDto,
} from '../dto/security.dto';

export interface BlocklistWriteLookupRow {
  id: string;
  extraData: Record<string, unknown> | null;
  nameEn: string;
  nameJa: string | null;
  nameZh: string | null;
  version: number;
}

export interface BlocklistScopeEntryRow {
  id: string;
  ownerType: string;
  ownerId: string | null;
  isForceUse: boolean;
  nameEn: string;
}

export const isValidBlocklistRegexPattern = (pattern: string): boolean => {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
};

export const buildBlocklistCreateLogPayload = (dto: CreateBlocklistDto) => ({
  pattern: dto.pattern,
  patternType: dto.patternType,
});

export const buildBlocklistUpdateData = (dto: UpdateBlocklistDto) => {
  const updateData: Record<string, unknown> = {};
  const fields = [
    'pattern',
    'patternType',
    'nameEn',
    'nameZh',
    'nameJa',
    'translations',
    'description',
    'category',
    'severity',
    'action',
    'replacement',
    'scope',
    'inherit',
    'sortOrder',
    'isForceUse',
  ] as const;

  for (const field of fields) {
    if (dto[field] !== undefined) {
      updateData[field] = dto[field];
    }
  }

  return updateData;
};

export const isCurrentScopeOwner = (
  entry: Pick<BlocklistScopeEntryRow, 'ownerType' | 'ownerId'>,
  scope: DisableScopeDto,
): boolean =>
  entry.ownerType === scope.scopeType &&
  entry.ownerId === (scope.scopeId ?? null);
