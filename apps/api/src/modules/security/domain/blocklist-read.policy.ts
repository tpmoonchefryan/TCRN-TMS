// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { BlocklistListQueryDto } from '../dto/security.dto';

export type OwnerType = 'tenant' | 'subsidiary' | 'talent';

export interface BlocklistScopeRef {
  type: OwnerType;
  id: string | null;
}

export interface BlocklistListOptions {
  page: number;
  pageSize: number;
  scopeType: OwnerType;
  scopeId: string | null;
  category?: string;
  patternType?: string;
  scope?: string;
  includeInherited: boolean;
  includeDisabled: boolean;
  includeInactive: boolean;
}

export interface BlocklistListRow {
  id: string;
  ownerType: string;
  ownerId: string | null;
  pattern: string;
  patternType: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  description: string | null;
  category: string | null;
  severity: string;
  action: string;
  replacement: string;
  scope: string[];
  inherit: boolean;
  sortOrder: number;
  isActive: boolean;
  isForceUse: boolean;
  isSystem: boolean;
  matchCount: number;
  lastMatchedAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
  version: number;
}

export interface BlocklistDetailRow {
  id: string;
  ownerType: string;
  ownerId: string | null;
  pattern: string;
  patternType: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  description: string | null;
  category: string | null;
  severity: string;
  action: string;
  replacement: string;
  scope: string[];
  inherit: boolean;
  sortOrder: number;
  isActive: boolean;
  isForceUse: boolean;
  isSystem: boolean;
  matchCount: number;
  lastMatchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
}

export interface BlocklistEntryWithMeta {
  id: string;
  ownerType: string;
  ownerId: string | null;
  pattern: string;
  patternType: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  description: string | null;
  category: string | null;
  severity: string;
  action: string;
  replacement: string;
  scope: string[];
  inherit: boolean;
  sortOrder: number;
  isActive: boolean;
  isForceUse: boolean;
  isSystem: boolean;
  matchCount: number;
  lastMatchedAt: string | null;
  createdAt: string;
  createdBy: string | null;
  version: number;
  isInherited: boolean;
  isDisabledHere: boolean;
  canDisable: boolean;
}

export const normalizeBlocklistListOptions = (
  query: BlocklistListQueryDto,
): BlocklistListOptions => ({
  page: query.page ?? 1,
  pageSize: query.pageSize ?? 20,
  scopeType: query.scopeType ?? 'tenant',
  scopeId: query.scopeId ?? null,
  category: query.category,
  patternType: query.patternType,
  scope: query.scope,
  includeInherited: query.includeInherited ?? true,
  includeDisabled: query.includeDisabled ?? false,
  includeInactive: query.includeInactive ?? false,
});

export const buildBlocklistListItem = (
  row: BlocklistListRow,
  options: Pick<BlocklistListOptions, 'scopeType' | 'scopeId'>,
  disabledIds: Set<string>,
): BlocklistEntryWithMeta => {
  const isInherited =
    row.ownerType !== options.scopeType || row.ownerId !== options.scopeId;

  return {
    ...row,
    lastMatchedAt: row.lastMatchedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    isInherited,
    isDisabledHere: disabledIds.has(row.id),
    canDisable: !row.isForceUse && isInherited,
  };
};

export const buildBlocklistDetailResponse = (row: BlocklistDetailRow) => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  lastMatchedAt: row.lastMatchedAt?.toISOString() ?? null,
});
