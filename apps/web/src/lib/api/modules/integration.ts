// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type {
  AdapterListQueryInput,
  CreateAdapterInput,
  CreateWebhookInput,
  IntegrationAdapterType,
  IntegrationOwnerType,
  UpdateAdapterInput,
  UpdateWebhookInput,
  WebhookEventDefinition,
  WebhookEventType,
} from '@tcrn/shared';

import { apiClient } from '../core';

export type IntegrationAdapterScope =
  | { ownerType: 'tenant' }
  | { ownerType: 'subsidiary'; subsidiaryId: string }
  | { ownerType: 'talent'; talentId: string };

function buildAdapterCollectionPath(scope: IntegrationAdapterScope): string {
  switch (scope.ownerType) {
    case 'subsidiary':
      return `/api/v1/subsidiaries/${scope.subsidiaryId}/integration/adapters`;
    case 'talent':
      return `/api/v1/talents/${scope.talentId}/integration/adapters`;
    case 'tenant':
    default:
      return '/api/v1/integration/adapters';
  }
}

function buildScopedAdapterActionPath(
  scope: Exclude<IntegrationAdapterScope, { ownerType: 'tenant' }>,
  adapterId: string,
  action: 'disable' | 'enable',
): string {
  const basePath = buildAdapterCollectionPath(scope);
  return `${basePath}/${adapterId}/${action}`;
}

function buildEffectiveAdapterPath(
  scope: IntegrationAdapterScope,
  platformCode: string,
): string {
  const basePath = buildAdapterCollectionPath(scope);
  return `${basePath}/effective/${encodeURIComponent(platformCode)}`;
}

export interface IntegrationPlatformRecord {
  id: string;
  ownerType?: IntegrationOwnerType | null;
  ownerId?: string | null;
  code: string;
  name: string;
  nameEn: string;
  nameZh?: string | null;
  nameJa?: string | null;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  isForceUse?: boolean;
  isSystem?: boolean;
  isInherited?: boolean;
  isDisabledHere?: boolean;
  canDisable?: boolean;
  createdAt?: string;
  updatedAt?: string;
  version: number;
  displayName?: string | null;
  iconUrl?: string | null;
  baseUrl?: string | null;
  profileUrlTemplate?: string | null;
  color?: string | null;
}

export interface CreateIntegrationPlatformPayload {
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  displayName?: string;
  iconUrl?: string;
  baseUrl?: string;
  profileUrlTemplate?: string;
  color?: string;
  sortOrder?: number;
  isForceUse?: boolean;
}

export interface UpdateIntegrationPlatformPayload {
  nameEn?: string;
  nameZh?: string;
  nameJa?: string;
  displayName?: string;
  iconUrl?: string;
  baseUrl?: string;
  profileUrlTemplate?: string;
  color?: string;
  sortOrder?: number;
  isForceUse?: boolean;
  version: number;
}

export interface IntegrationActivationResponse {
  id: string;
  isActive: boolean;
  deactivatedAt?: string;
}

export type IntegrationConsumerCategory = 'internal' | 'external' | 'partner';

export interface IntegrationConsumerRecord {
  id: string;
  ownerType?: IntegrationOwnerType | null;
  ownerId?: string | null;
  code: string;
  name: string;
  nameEn: string;
  nameZh?: string | null;
  nameJa?: string | null;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  isForceUse?: boolean;
  isSystem?: boolean;
  isInherited?: boolean;
  isDisabledHere?: boolean;
  canDisable?: boolean;
  createdAt?: string;
  updatedAt?: string;
  version: number;
  consumerCategory: IntegrationConsumerCategory;
  contactName?: string | null;
  contactEmail?: string | null;
  apiKeyPrefix?: string | null;
  allowedIps?: string[] | null;
  rateLimit?: number | null;
  notes?: string | null;
}

export interface CreateIntegrationConsumerPayload {
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  consumerCategory: IntegrationConsumerCategory;
  contactName?: string;
  contactEmail?: string;
  allowedIps?: string[];
  rateLimit?: number;
  notes?: string;
  sortOrder?: number;
  isForceUse?: boolean;
}

export interface UpdateIntegrationConsumerPayload {
  nameEn?: string;
  nameZh?: string;
  nameJa?: string;
  consumerCategory?: IntegrationConsumerCategory;
  contactName?: string;
  contactEmail?: string;
  allowedIps?: string[];
  rateLimit?: number;
  notes?: string;
  sortOrder?: number;
  isForceUse?: boolean;
  version: number;
}

export interface ConsumerKeyMutationResponse {
  message: string;
  apiKey?: string;
  apiKeyPrefix?: string;
}

export interface IntegrationPlatformSummary {
  code: string;
  displayName: string;
  iconUrl?: string | null;
}

export interface IntegrationPlatformDetailSummary extends IntegrationPlatformSummary {
  id: string;
}

export interface IntegrationAdapterConfigRecord {
  id: string;
  configKey: string;
  configValue: string;
  isSecret: boolean;
}

export interface IntegrationAdapterListItemRecord {
  id: string;
  ownerType: IntegrationOwnerType | null;
  ownerId: string | null;
  platformId: string;
  platform: IntegrationPlatformSummary;
  code: string;
  nameEn: string;
  nameZh?: string | null;
  nameJa?: string | null;
  adapterType: IntegrationAdapterType;
  inherit: boolean;
  isActive: boolean;
  isInherited?: boolean;
  configCount: number;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface IntegrationAdapterDetailRecord {
  id: string;
  ownerType: IntegrationOwnerType | null;
  ownerId: string | null;
  platform: IntegrationPlatformDetailSummary;
  code: string;
  nameEn: string;
  nameZh?: string | null;
  nameJa?: string | null;
  adapterType: IntegrationAdapterType;
  inherit: boolean;
  isActive: boolean;
  configs: IntegrationAdapterConfigRecord[];
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
}

export interface EffectiveIntegrationAdapterRecord extends IntegrationAdapterDetailRecord {
  isInherited: boolean;
  resolvedFrom: {
    ownerType: IntegrationOwnerType;
    ownerId: string | null;
  };
}

const TENANT_ADAPTER_SCOPE: IntegrationAdapterScope = { ownerType: 'tenant' };

export interface UpdateAdapterConfigsPayload {
  configs: Array<{
    configKey: string;
    configValue: string;
  }>;
  adapterVersion: number;
}

export interface UpdateAdapterConfigsResponse {
  updatedCount: number;
  adapterVersion: number;
}

export interface RevealAdapterConfigResponse {
  configKey: string;
  configValue: string;
  revealedAt: string;
  expiresInSeconds?: number;
}

export interface IntegrationActiveStateResponse {
  id: string;
  isActive: boolean;
}

export interface IntegrationInheritedAdapterOverrideResponse {
  id: string;
  code: string;
  ownerType: Exclude<IntegrationOwnerType, 'tenant'>;
  ownerId: string;
  isDisabledHere: boolean;
}

export interface IntegrationWebhookListItemRecord {
  id: string;
  code: string;
  nameEn: string;
  nameZh?: string | null;
  nameJa?: string | null;
  url: string;
  events: WebhookEventType[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  lastStatus: number | null;
  consecutiveFailures: number;
  createdAt: string;
}

export interface IntegrationWebhookDetailRecord extends IntegrationWebhookListItemRecord {
  secret: string | null;
  headers: Record<string, string>;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  disabledAt: string | null;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
}

export interface IntegrationDeleteWebhookResponse {
  id: string;
  deleted: boolean;
}

export const integrationApi = {
  listPlatforms: () =>
    apiClient.get<IntegrationPlatformRecord[]>('/api/v1/configuration-entity/social-platform'),

  createPlatform: (data: CreateIntegrationPlatformPayload) =>
    apiClient.post<IntegrationPlatformRecord>('/api/v1/configuration-entity/social-platform', data),

  updatePlatform: (id: string, data: UpdateIntegrationPlatformPayload) =>
    apiClient.patch<IntegrationPlatformRecord>(`/api/v1/configuration-entity/social-platform/${id}`, data),

  deactivatePlatform: (id: string, version: number) =>
    apiClient.post<IntegrationActivationResponse>(
      `/api/v1/configuration-entity/social-platform/${id}/deactivate`,
      { version },
    ),

  reactivatePlatform: (id: string, version: number) =>
    apiClient.post<IntegrationActivationResponse>(
      `/api/v1/configuration-entity/social-platform/${id}/reactivate`,
      { version },
    ),

  deletePlatform: (id: string) =>
    apiClient.delete<{ message: string }>(`/api/v1/configuration-entity/social-platform/${id}`),

  listConsumers: () => apiClient.get<IntegrationConsumerRecord[]>('/api/v1/configuration-entity/consumer'),

  createConsumer: (data: CreateIntegrationConsumerPayload) =>
    apiClient.post<IntegrationConsumerRecord>('/api/v1/configuration-entity/consumer', data),

  updateConsumer: (id: string, data: UpdateIntegrationConsumerPayload) =>
    apiClient.patch<IntegrationConsumerRecord>(`/api/v1/configuration-entity/consumer/${id}`, data),

  generateConsumerKey: (consumerId: string) =>
    apiClient.post<ConsumerKeyMutationResponse>(
      `/api/v1/configuration-entity/consumer/${consumerId}/generate-key`,
      {},
    ),

  rotateConsumerKey: (consumerId: string) =>
    apiClient.post<ConsumerKeyMutationResponse>(
      `/api/v1/configuration-entity/consumer/${consumerId}/rotate-key`,
      {},
    ),

  revokeConsumerKey: (consumerId: string) =>
    apiClient.post<ConsumerKeyMutationResponse>(
      `/api/v1/configuration-entity/consumer/${consumerId}/revoke-key`,
      {},
    ),

  listAdapters: (
    scope: IntegrationAdapterScope = TENANT_ADAPTER_SCOPE,
    query?: AdapterListQueryInput,
  ) => apiClient.get<IntegrationAdapterListItemRecord[]>(buildAdapterCollectionPath(scope), query),

  resolveEffectiveAdapter: (
    scope: IntegrationAdapterScope = TENANT_ADAPTER_SCOPE,
    platformCode: string,
    adapterType?: IntegrationAdapterType,
  ) => apiClient.get<EffectiveIntegrationAdapterRecord | null>(
    buildEffectiveAdapterPath(scope, platformCode),
    adapterType ? { adapterType } : undefined,
  ),

  getAdapter: (id: string) =>
    apiClient.get<IntegrationAdapterDetailRecord>(`/api/v1/integration/adapters/${id}`),

  createAdapter: (
    scope: IntegrationAdapterScope = TENANT_ADAPTER_SCOPE,
    data: CreateAdapterInput,
  ) => apiClient.post<IntegrationAdapterDetailRecord>(buildAdapterCollectionPath(scope), data),

  updateAdapter: (id: string, data: UpdateAdapterInput) =>
    apiClient.patch<IntegrationAdapterDetailRecord>(`/api/v1/integration/adapters/${id}`, data),

  deactivateAdapter: (id: string) =>
    apiClient.post<IntegrationActiveStateResponse>(`/api/v1/integration/adapters/${id}/deactivate`, {}),

  reactivateAdapter: (id: string) =>
    apiClient.post<IntegrationActiveStateResponse>(`/api/v1/integration/adapters/${id}/reactivate`, {}),

  disableAdapter: (
    scope: Exclude<IntegrationAdapterScope, { ownerType: 'tenant' }>,
    id: string,
  ) => apiClient.post<IntegrationInheritedAdapterOverrideResponse>(
    buildScopedAdapterActionPath(scope, id, 'disable'),
    {},
  ),

  enableAdapter: (
    scope: Exclude<IntegrationAdapterScope, { ownerType: 'tenant' }>,
    id: string,
  ) => apiClient.post<IntegrationInheritedAdapterOverrideResponse>(
    buildScopedAdapterActionPath(scope, id, 'enable'),
    {},
  ),

  updateAdapterConfigs: (id: string, data: UpdateAdapterConfigsPayload) =>
    apiClient.patch<UpdateAdapterConfigsResponse>(`/api/v1/integration/adapters/${id}/configs`, data),

  revealConfig: (adapterId: string, configKey: string) =>
    apiClient.post<RevealAdapterConfigResponse>(
      `/api/v1/integration/adapters/${adapterId}/configs/${configKey}/reveal`,
      {},
    ),

  listWebhooks: () => apiClient.get<IntegrationWebhookListItemRecord[]>('/api/v1/integration/webhooks'),

  getWebhook: (id: string) =>
    apiClient.get<IntegrationWebhookDetailRecord>(`/api/v1/integration/webhooks/${id}`),

  getWebhookEvents: () =>
    apiClient.get<WebhookEventDefinition[]>('/api/v1/integration/webhooks/events'),

  createWebhook: (data: CreateWebhookInput) =>
    apiClient.post<IntegrationWebhookDetailRecord>('/api/v1/integration/webhooks', data),

  updateWebhook: (id: string, data: UpdateWebhookInput) =>
    apiClient.patch<IntegrationWebhookDetailRecord>(`/api/v1/integration/webhooks/${id}`, data),

  deleteWebhook: (id: string) =>
    apiClient.delete<IntegrationDeleteWebhookResponse>(`/api/v1/integration/webhooks/${id}`),

  deactivateWebhook: (id: string) =>
    apiClient.post<IntegrationActiveStateResponse>(`/api/v1/integration/webhooks/${id}/deactivate`, {}),

  reactivateWebhook: (id: string) =>
    apiClient.post<IntegrationActiveStateResponse>(`/api/v1/integration/webhooks/${id}/reactivate`, {}),
};
