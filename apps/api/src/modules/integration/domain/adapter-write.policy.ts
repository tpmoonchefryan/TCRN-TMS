// SPDX-License-Identifier: Apache-2.0
import { ADAPTER_CONFIG_KEYS, type LocalizedText } from '@tcrn/shared';

import type { UpdateAdapterDto } from '../dto/integration.dto';
import type { IntegrationAdapterOwnerScope } from './adapter-read.policy';

export interface IntegrationAdapterMutationRecord {
  id: string;
  ownerType: string | null;
  ownerId: string | null;
  platformId: string;
  code: string;
  name: LocalizedText;
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
  name: LocalizedText;
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
  name: LocalizedText;
  extraData: Record<string, unknown> | null;
  inherit: boolean;
  oldValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
}

export type AdapterConfigMutationType = 'keep' | 'replace' | 'clear';

export interface AdapterConfigMutationInput {
  configKey: string;
  mutation?: AdapterConfigMutationType;
  configValue?: string;
}

export interface AdapterConfigMutationPlan {
  configKey: string;
  mutation: AdapterConfigMutationType;
  configValue?: string;
  isSecret: boolean;
  isRequiredSecret: boolean;
}

export const SECRET_CONFIG_KEYS = [
  'client_secret',
  'access_token',
  'refresh_token',
  'api_key',
  'api_secret',
  'verify_token',
  'token',
] as const;

export const ADAPTER_SECRET_REVEAL_EXPIRY_SECONDS = 30;

export const isSecretAdapterConfigKey = (configKey: string): boolean =>
  SECRET_CONFIG_KEYS.includes(configKey as (typeof SECRET_CONFIG_KEYS)[number]);

export const resolveAdapterConfigMutationType = (
  config: AdapterConfigMutationInput
): AdapterConfigMutationType => config.mutation ?? 'replace';

export const isRequiredSecretAdapterConfigKey = (
  adapterType: string,
  configKey: string
): boolean => {
  if (!(adapterType in ADAPTER_CONFIG_KEYS)) {
    return false;
  }

  return ADAPTER_CONFIG_KEYS[adapterType as keyof typeof ADAPTER_CONFIG_KEYS].some(
    (definition) => definition.key === configKey && definition.secret && definition.required
  );
};

export const buildAdapterConfigMutationPlan = (
  adapter: IntegrationAdapterMutationRecord,
  config: AdapterConfigMutationInput
): AdapterConfigMutationPlan => {
  const mutation = resolveAdapterConfigMutationType(config);
  const isSecret = isSecretAdapterConfigKey(config.configKey);

  return {
    configKey: config.configKey,
    mutation,
    configValue: config.configValue,
    isSecret,
    isRequiredSecret:
      isSecret && isRequiredSecretAdapterConfigKey(adapter.adapterType, config.configKey),
  };
};

export const hasAdapterVersionMismatch = (
  adapter: IntegrationAdapterMutationRecord,
  version: number
) => adapter.version !== version;

export const buildAdapterUpdateMutationPlan = (
  adapter: IntegrationAdapterMutationRecord,
  dto: UpdateAdapterDto,
  nextName: LocalizedText
): AdapterUpdateMutationPlan => {
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};
  const nextInherit = dto.inherit ?? adapter.inherit;

  if (dto.name !== undefined) {
    oldValue.name = adapter.name;
    newValue.name = nextName;
  }

  if (dto.inherit !== undefined) {
    oldValue.inherit = adapter.inherit;
    newValue.inherit = nextInherit;
  }

  return {
    name: nextName,
    extraData: adapter.extraData,
    inherit: nextInherit,
    oldValue,
    newValue,
  };
};

export const canMutateInheritedAdapterAtScope = (scope: IntegrationAdapterOwnerScope) =>
  scope.ownerId !== null;

export const isAdapterOwnedByScope = (
  adapter: IntegrationAdapterMutationRecord,
  scope: IntegrationAdapterOwnerScope
) => adapter.ownerType === scope.ownerType && adapter.ownerId === scope.ownerId;

export const buildAdapterConfigUpdateResult = (updatedCount: number, adapterVersion: number) => ({
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
  isDisabledHere: boolean
) => ({
  id: adapterId,
  code,
  ownerType: scope.ownerType,
  ownerId: scope.ownerId,
  isDisabledHere,
});
