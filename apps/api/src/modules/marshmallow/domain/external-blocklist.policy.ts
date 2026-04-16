// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { ExternalBlocklistItem } from '../dto/external-blocklist.dto';
import { OwnerType, PatternType } from '../dto/external-blocklist.dto';

export const EXTERNAL_BLOCKLIST_CACHE_KEY_PREFIX = 'external_blocklist:';
export const EXTERNAL_BLOCKLIST_CACHE_KEY_PATTERN = `${EXTERNAL_BLOCKLIST_CACHE_KEY_PREFIX}*`;

export interface ExternalBlocklistScope {
  type: OwnerType;
  id: string | null;
}

export interface RawExternalBlocklistPatternRecord {
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
  inherit: boolean;
  sortOrder: number;
  isActive: boolean;
  isForceUse: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface ExternalBlocklistDisableCandidate {
  id: string;
  ownerType: string;
  ownerId: string | null;
  isForceUse: boolean;
  nameEn: string;
}

export interface ExternalBlocklistItemWithMeta extends ExternalBlocklistItem {
  sortOrder: number;
  isForceUse: boolean;
  isSystem: boolean;
  isInherited: boolean;
  isDisabledHere: boolean;
  canDisable: boolean;
}

export function getExternalBlocklistScope(
  type: OwnerType,
  id: string | null,
): ExternalBlocklistScope {
  return { type, id };
}

export function assertValidExternalBlocklistPattern(
  patternType: string,
  pattern: string,
): void {
  if (patternType !== PatternType.URL_REGEX) {
    return;
  }

  new RegExp(pattern);
}

export function isExternalBlocklistInherited(
  item: Pick<RawExternalBlocklistPatternRecord, 'ownerType' | 'ownerId'>,
  scopeType: OwnerType,
  scopeId: string | null,
): boolean {
  return item.ownerType !== scopeType || item.ownerId !== scopeId;
}

export function normalizeExternalBlocklistItem(
  item: RawExternalBlocklistPatternRecord,
): ExternalBlocklistItem {
  return {
    id: item.id,
    ownerType: item.ownerType,
    ownerId: item.ownerId,
    pattern: item.pattern,
    patternType: item.patternType,
    nameEn: item.nameEn,
    nameZh: item.nameZh,
    nameJa: item.nameJa,
    description: item.description,
    category: item.category,
    severity: item.severity,
    action: item.action,
    replacement: item.replacement,
    inherit: item.inherit,
    sortOrder: item.sortOrder,
    isActive: item.isActive,
    isForceUse: item.isForceUse,
    isSystem: item.isSystem,
    createdAt: new Date(item.createdAt).toISOString(),
    updatedAt: new Date(item.updatedAt).toISOString(),
    version: item.version,
  };
}

export function mapExternalBlocklistItemWithMeta(
  item: RawExternalBlocklistPatternRecord,
  scopeType: OwnerType,
  scopeId: string | null,
  disabledIds: ReadonlySet<string>,
): ExternalBlocklistItemWithMeta {
  const normalized = normalizeExternalBlocklistItem(item);
  const isInherited = isExternalBlocklistInherited(item, scopeType, scopeId);
  const isDisabledHere = disabledIds.has(item.id);

  return {
    ...normalized,
    sortOrder: item.sortOrder,
    isForceUse: item.isForceUse,
    isSystem: item.isSystem,
    isInherited,
    isDisabledHere,
    canDisable: !item.isForceUse && isInherited,
  };
}
