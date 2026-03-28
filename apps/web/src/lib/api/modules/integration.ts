/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { apiClient } from '../core';

export const integrationApi = {
  listPlatforms: () => apiClient.get<any[]>('/api/v1/configuration-entity/social-platform'),

  createPlatform: (data: {
    code: string;
    displayName: string;
    nameEn: string;
    nameZh?: string;
    nameJa?: string;
    iconUrl?: string;
    baseUrl?: string;
    profileUrlTemplate?: string;
    color?: string;
    sortOrder?: number;
    isActive?: boolean;
  }) => apiClient.post<any>('/api/v1/configuration-entity/social-platform', data),

  updatePlatform: (
    id: string,
    data: {
      displayName?: string;
      nameEn?: string;
      nameZh?: string;
      nameJa?: string;
      iconUrl?: string;
      baseUrl?: string;
      profileUrlTemplate?: string;
      color?: string;
      sortOrder?: number;
      isActive?: boolean;
      version: number;
    },
  ) => apiClient.patch<any>(`/api/v1/configuration-entity/social-platform/${id}`, data),

  deletePlatform: (id: string) =>
    apiClient.delete<any>(`/api/v1/configuration-entity/social-platform/${id}`),

  listAdapters: () => apiClient.get<any[]>('/api/v1/integration/adapters'),

  getAdapter: (id: string) => apiClient.get<any>(`/api/v1/integration/adapters/${id}`),

  createAdapter: (data: {
    platformId: string;
    code: string;
    nameEn: string;
    nameZh?: string;
    nameJa?: string;
    adapterType: 'oauth' | 'api_key' | 'webhook';
    inherit?: boolean;
    ownerType?: 'tenant' | 'subsidiary' | 'talent';
    ownerId?: string;
  }) => apiClient.post<any>('/api/v1/integration/adapters', data),

  updateAdapter: (
    id: string,
    data: { nameEn?: string; nameJa?: string; description?: string; version: number },
  ) => apiClient.patch<any>(`/api/v1/integration/adapters/${id}`, data),

  deactivateAdapter: (id: string) =>
    apiClient.post<any>(`/api/v1/integration/adapters/${id}/deactivate`, {}),

  reactivateAdapter: (id: string) =>
    apiClient.post<any>(`/api/v1/integration/adapters/${id}/reactivate`, {}),

  disableAdapter: (id: string, scopeType: string, scopeId: string) =>
    apiClient.post<any>(`/api/v1/integration/adapters/${id}/disable`, { scopeType, scopeId }),

  enableAdapter: (id: string, scopeType: string, scopeId: string) =>
    apiClient.post<any>(`/api/v1/integration/adapters/${id}/enable`, { scopeType, scopeId }),

  updateAdapterConfigs: (
    id: string,
    data: { configs: Array<{ configKey: string; configValue: string }>; adapterVersion: number },
  ) => apiClient.put<any>(`/api/v1/integration/adapters/${id}/configs`, data),

  revealConfig: (adapterId: string, configKey: string) =>
    apiClient.post<any>(
      `/api/v1/integration/adapters/${adapterId}/configs/${configKey}/reveal`,
      {},
    ),

  listWebhooks: () => apiClient.get<any[]>('/api/v1/integration/webhooks'),

  getWebhook: (id: string) => apiClient.get<any>(`/api/v1/integration/webhooks/${id}`),

  getWebhookEvents: () => apiClient.get<any[]>('/api/v1/integration/webhooks/events'),

  createWebhook: (data: { name: string; targetUrl: string; events: string[]; secret?: string }) =>
    apiClient.post<any>('/api/v1/integration/webhooks', {
      code: data.name.toUpperCase().replace(/\s+/g, '_'),
      nameEn: data.name,
      url: data.targetUrl,
      events: data.events,
      secret: data.secret,
    }),

  updateWebhook: (
    id: string,
    data: { name?: string; targetUrl?: string; events?: string[]; version: number },
  ) =>
    apiClient.patch<any>(`/api/v1/integration/webhooks/${id}`, {
      nameEn: data.name,
      url: data.targetUrl,
      events: data.events,
      version: data.version,
    }),

  deleteWebhook: (id: string) => apiClient.delete<any>(`/api/v1/integration/webhooks/${id}`),

  deactivateWebhook: (id: string) =>
    apiClient.post<any>(`/api/v1/integration/webhooks/${id}/deactivate`, {}),

  reactivateWebhook: (id: string) =>
    apiClient.post<any>(`/api/v1/integration/webhooks/${id}/reactivate`, {}),

  regenerateConsumerKey: (consumerId: string) =>
    apiClient.post<any>(`/api/v1/integration/consumers/${consumerId}/regenerate-key`, {}),
};
