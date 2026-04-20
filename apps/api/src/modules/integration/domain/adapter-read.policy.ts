// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { type OwnerType } from '../dto/integration.dto';
import { buildNameTranslations } from './name-translation.policy';

export interface IntegrationAdapterOwnerScope {
  ownerType: OwnerType;
  ownerId: string | null;
}

export interface IntegrationAdapterListRow {
  id: string;
  ownerType: OwnerType;
  ownerId: string | null;
  platformId: string;
  platformCode: string;
  platformDisplayName: string;
  platformIconUrl: string | null;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  extraData: Record<string, unknown> | null;
  adapterType: string;
  inherit: boolean;
  isActive: boolean;
  configCount: number;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface IntegrationAdapterDetailRow {
  id: string;
  ownerType: OwnerType;
  ownerId: string | null;
  platformId: string;
  platformRecordId: string;
  platformCode: string;
  platformDisplayName: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  extraData: Record<string, unknown> | null;
  adapterType: string;
  inherit: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
}

export interface IntegrationAdapterConfigRow {
  id: string;
  configKey: string;
  configValue: string;
  isSecret: boolean;
}

export const isSameAdapterOwner = (
  ownerType: string | null,
  ownerId: string | null,
  scope: IntegrationAdapterOwnerScope,
) => ownerType === scope.ownerType && ownerId === scope.ownerId;

export const mapIntegrationAdapterListItem = (
  adapter: IntegrationAdapterListRow,
  scope: IntegrationAdapterOwnerScope,
) => ({
  id: adapter.id,
  ownerType: adapter.ownerType,
  ownerId: adapter.ownerId,
  platformId: adapter.platformId,
  platform: {
    code: adapter.platformCode,
    displayName: adapter.platformDisplayName,
    iconUrl: adapter.platformIconUrl,
  },
  code: adapter.code,
  nameEn: adapter.nameEn,
  nameZh: adapter.nameZh,
  nameJa: adapter.nameJa,
  translations: buildNameTranslations(adapter),
  adapterType: adapter.adapterType,
  inherit: adapter.inherit,
  isActive: adapter.isActive,
  isInherited: !isSameAdapterOwner(adapter.ownerType, adapter.ownerId, scope),
  configCount: adapter.configCount,
  createdAt: adapter.createdAt.toISOString(),
  updatedAt: adapter.updatedAt.toISOString(),
  version: adapter.version,
});

export const mapIntegrationAdapterDetail = (
  adapter: IntegrationAdapterDetailRow,
  configs: IntegrationAdapterConfigRow[],
) => ({
  id: adapter.id,
  ownerType: adapter.ownerType,
  ownerId: adapter.ownerId,
  platform: {
    id: adapter.platformRecordId,
    code: adapter.platformCode,
    displayName: adapter.platformDisplayName,
  },
  code: adapter.code,
  nameEn: adapter.nameEn,
  nameZh: adapter.nameZh,
  nameJa: adapter.nameJa,
  translations: buildNameTranslations(adapter),
  adapterType: adapter.adapterType,
  inherit: adapter.inherit,
  isActive: adapter.isActive,
  configs: configs.map((config) => ({
    id: config.id,
    configKey: config.configKey,
    configValue: config.isSecret ? '******' : config.configValue,
    isSecret: config.isSecret,
  })),
  createdAt: adapter.createdAt.toISOString(),
  updatedAt: adapter.updatedAt.toISOString(),
  createdBy: adapter.createdBy,
  updatedBy: adapter.updatedBy,
  version: adapter.version,
});
