// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { UpdateAdapterDto } from '../dto/integration.dto';
import { buildNameTranslations } from './name-translation.policy';
import type { IntegrationAdapterOwnerScope } from './adapter-read.policy';

export interface IntegrationAdapterMutationRecord {
  id: string;
  ownerType: string | null;
  ownerId: string | null;
  platformId: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  extraData: Record<string, unknown> | null;
  adapterType: string;
  inherit: boolean;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
}

export interface IntegrationAdapterPlatformRecord {
  id: string;
  code: string;
  displayName: string;
  iconUrl: string | null;
}

export interface IntegrationAdapterStoredConfigRecord {
  id: string;
  configKey: string;
  configValue: string;
  isSecret: boolean;
}

export interface IntegrationAdapterOverrideRecord {
  isDisabled: boolean;
}

export interface AdapterUpdateMutationPlan {
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  extraData: Record<string, unknown> | null;
  inherit: boolean;
  oldValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
}

export const SECRET_CONFIG_KEYS = [
  'client_secret',
  'access_token',
  'refresh_token',
  'api_key',
  'api_secret',
  'verify_token',
] as const;

export const ADAPTER_SECRET_REVEAL_EXPIRY_SECONDS = 30;

export const isSecretAdapterConfigKey = (configKey: string): boolean =>
  SECRET_CONFIG_KEYS.includes(configKey as (typeof SECRET_CONFIG_KEYS)[number]);

export const hasAdapterVersionMismatch = (
  adapter: IntegrationAdapterMutationRecord,
  version: number,
) => adapter.version !== version;

export const buildAdapterUpdateMutationPlan = (
  adapter: IntegrationAdapterMutationRecord,
  dto: UpdateAdapterDto,
  nextTranslations: Record<string, string>,
  nextExtraData: Record<string, unknown> | null,
): AdapterUpdateMutationPlan => {
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};
  const nextNameEn = dto.nameEn ?? adapter.nameEn;
  const nextNameZh = dto.nameZh ?? adapter.nameZh;
  const nextNameJa = dto.nameJa ?? adapter.nameJa;
  const nextInherit = dto.inherit ?? adapter.inherit;

  if (dto.nameEn !== undefined) {
    oldValue.nameEn = adapter.nameEn;
    newValue.nameEn = nextNameEn;
  }

  if (dto.nameZh !== undefined) {
    oldValue.nameZh = adapter.nameZh;
    newValue.nameZh = nextNameZh;
  }

  if (dto.nameJa !== undefined) {
    oldValue.nameJa = adapter.nameJa;
    newValue.nameJa = nextNameJa;
  }

  if (dto.translations !== undefined) {
    oldValue.translations = buildNameTranslations(adapter);
    newValue.translations = nextTranslations;
  }

  if (dto.inherit !== undefined) {
    oldValue.inherit = adapter.inherit;
    newValue.inherit = nextInherit;
  }

  return {
    nameEn: nextNameEn,
    nameZh: nextNameZh,
    nameJa: nextNameJa,
    extraData: nextExtraData,
    inherit: nextInherit,
    oldValue,
    newValue,
  };
};

export const canMutateInheritedAdapterAtScope = (
  scope: IntegrationAdapterOwnerScope,
) => scope.ownerId !== null;

export const isAdapterOwnedByScope = (
  adapter: IntegrationAdapterMutationRecord,
  scope: IntegrationAdapterOwnerScope,
) => adapter.ownerType === scope.ownerType && adapter.ownerId === scope.ownerId;

export const buildAdapterConfigUpdateResult = (
  updatedCount: number,
  adapterVersion: number,
) => ({
  updatedCount,
  adapterVersion,
});

export const buildAdapterActiveStateResult = (id: string, isActive: boolean) => ({
  id,
  isActive,
});

export const buildInheritedAdapterScopeStateResult = (
  adapterId: string,
  code: string,
  scope: IntegrationAdapterOwnerScope,
  isDisabledHere: boolean,
) => ({
  id: adapterId,
  code,
  ownerType: scope.ownerType,
  ownerId: scope.ownerId,
  isDisabledHere,
});
