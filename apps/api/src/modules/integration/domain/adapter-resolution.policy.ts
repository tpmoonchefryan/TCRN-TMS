// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { OwnerType } from '../dto/integration.dto';

export interface EffectiveAdapterResolutionTarget {
  ownerType: OwnerType;
  ownerId: string | null;
  platformCode: string;
  adapterType?: string;
}

export interface EffectiveAdapterScope {
  ownerType: OwnerType;
  ownerId: string | null;
}

export interface TalentAdapterHierarchyRecord {
  id: string;
  subsidiaryId: string | null;
}

export interface SubsidiaryAdapterScopeRecord {
  id: string;
}

export interface EffectiveAdapterLookupRow {
  id: string;
  ownerType: OwnerType;
  ownerId: string | null;
  platformId: string;
  platformCode: string;
  platformDisplayName: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  adapterType: string;
  inherit: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface EffectiveAdapterConfigRow {
  adapterId: string;
  id: string;
  configKey: string;
  configValue: string;
  isSecret: boolean;
}

export interface EffectiveAdapterOverrideRow {
  adapterId: string;
  ownerType: OwnerType;
  ownerId: string | null;
  isDisabled: boolean;
}

export interface EffectiveAdapterResolvedConfig {
  id: string;
  configKey: string;
  configValue: string;
  isSecret: boolean;
}

export interface EffectiveAdapterResolutionResult {
  id: string;
  ownerType: OwnerType;
  ownerId: string | null;
  platform: {
    id: string;
    code: string;
    displayName: string;
  };
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  adapterType: string;
  inherit: boolean;
  isActive: boolean;
  isInherited: boolean;
  resolvedFrom: EffectiveAdapterScope;
  configs: EffectiveAdapterResolvedConfig[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export const buildEffectiveAdapterScopeKey = (
  scope: EffectiveAdapterScope,
): string => `${scope.ownerType}:${scope.ownerId ?? 'tenant-root'}`;

export const buildEffectiveAdapterLineage = (
  target: EffectiveAdapterScope,
  talentSubsidiaryId: string | null,
): EffectiveAdapterScope[] => {
  if (target.ownerType === OwnerType.TENANT) {
    return [{ ownerType: OwnerType.TENANT, ownerId: null }];
  }

  if (target.ownerType === OwnerType.SUBSIDIARY) {
    return [
      target,
      { ownerType: OwnerType.TENANT, ownerId: null },
    ];
  }

  return [
    target,
    ...(talentSubsidiaryId
      ? [{ ownerType: OwnerType.SUBSIDIARY, ownerId: talentSubsidiaryId }]
      : []),
    { ownerType: OwnerType.TENANT, ownerId: null },
  ];
};

export const selectEffectiveAdapter = (args: {
  target: EffectiveAdapterScope;
  lineage: EffectiveAdapterScope[];
  adapters: EffectiveAdapterLookupRow[];
  overrides: EffectiveAdapterOverrideRow[];
}): EffectiveAdapterLookupRow | null => {
  const adapterByScope = new Map<string, EffectiveAdapterLookupRow>();
  const disabledOverrideKeys = new Set(
    args.overrides
      .filter((override) => override.isDisabled)
      .map((override) => `${override.adapterId}:${buildEffectiveAdapterScopeKey(override)}`),
  );

  for (const adapter of args.adapters) {
    const scopeKey = buildEffectiveAdapterScopeKey({
      ownerType: adapter.ownerType,
      ownerId: adapter.ownerId,
    });

    if (!adapterByScope.has(scopeKey)) {
      adapterByScope.set(scopeKey, adapter);
    }
  }

  for (const [index, scope] of args.lineage.entries()) {
    const adapter = adapterByScope.get(buildEffectiveAdapterScopeKey(scope));

    if (!adapter) {
      continue;
    }

    const isTargetScope =
      scope.ownerType === args.target.ownerType &&
      scope.ownerId === args.target.ownerId;

    if (isTargetScope) {
      return adapter.isActive ? adapter : null;
    }

    if (!adapter.isActive || !adapter.inherit) {
      return null;
    }

    const blockingScopes = args.lineage.slice(0, index);
    const isDisabledInDescendantScope = blockingScopes.some((blockingScope) =>
      disabledOverrideKeys.has(
        `${adapter.id}:${buildEffectiveAdapterScopeKey(blockingScope)}`,
      ),
    );

    return isDisabledInDescendantScope ? null : adapter;
  }

  return null;
};

export const buildEffectiveAdapterResolutionResult = (
  adapter: EffectiveAdapterLookupRow,
  target: EffectiveAdapterScope,
  configs: EffectiveAdapterResolvedConfig[],
): EffectiveAdapterResolutionResult => ({
  id: adapter.id,
  ownerType: adapter.ownerType,
  ownerId: adapter.ownerId,
  platform: {
    id: adapter.platformId,
    code: adapter.platformCode,
    displayName: adapter.platformDisplayName,
  },
  code: adapter.code,
  nameEn: adapter.nameEn,
  nameZh: adapter.nameZh,
  nameJa: adapter.nameJa,
  adapterType: adapter.adapterType,
  inherit: adapter.inherit,
  isActive: adapter.isActive,
  isInherited:
    adapter.ownerType !== target.ownerType ||
    adapter.ownerId !== target.ownerId,
  resolvedFrom: {
    ownerType: adapter.ownerType,
    ownerId: adapter.ownerId,
  },
  configs,
  createdAt: adapter.createdAt.toISOString(),
  updatedAt: adapter.updatedAt.toISOString(),
  version: adapter.version,
});
