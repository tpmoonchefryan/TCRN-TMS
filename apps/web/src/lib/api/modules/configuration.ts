/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { apiClient } from '../core';

export interface LocalizedOptionRecord {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  nameZh?: string | null;
  nameJa?: string | null;
}

export interface SystemDictionaryItemRecord extends LocalizedOptionRecord {
  dictionaryCode: string;
  descriptionEn?: string | null;
  descriptionZh?: string | null;
  descriptionJa?: string | null;
  sortOrder: number;
  isActive: boolean;
  extraData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ConfigurationEntityRecord extends LocalizedOptionRecord {
  ownerType?: string | null;
  ownerId?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  descriptionZh?: string | null;
  descriptionJa?: string | null;
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
  membershipClassId?: string;
  membershipTypeId?: string;
  rank?: number;
  color?: string | null;
  badgeUrl?: string | null;
  externalControl?: boolean;
  defaultRenewalDays?: number;
}

export interface MembershipTreeLevel extends LocalizedOptionRecord {
  typeId: string;
  rank: number;
  color: string | null;
  badgeUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface MembershipTreeType extends LocalizedOptionRecord {
  classId: string;
  externalControl: boolean;
  defaultRenewalDays: number;
  sortOrder: number;
  isActive: boolean;
  levels: MembershipTreeLevel[];
}

export interface MembershipTreeClass extends LocalizedOptionRecord {
  sortOrder: number;
  isActive: boolean;
  types: MembershipTreeType[];
}

export type TenantTier = 'ac' | 'standard';

export interface TenantSettingsRecord {
  maxTalents?: number;
  maxCustomersPerTalent?: number;
  features?: string[];
  [key: string]: unknown;
}

export interface TenantStatsRecord {
  subsidiaryCount: number;
  talentCount: number;
  userCount: number;
}

export interface TenantRecord {
  id: string;
  code: string;
  name: string;
  schemaName?: string;
  tier: TenantTier;
  isActive: boolean;
  settings?: TenantSettingsRecord | null;
  stats?: TenantStatsRecord;
  createdAt: string;
  updatedAt?: string;
}

export interface TenantCreatePayload {
  code: string;
  name: string;
  settings?: TenantSettingsRecord;
  adminUser: {
    username: string;
    email: string;
    password: string;
    displayName?: string;
  };
}

export interface TenantCreateResponse {
  id: string;
  code: string;
  name: string;
  schemaName: string;
  tier: TenantTier;
  isActive: boolean;
  adminUser: {
    username: string;
    email: string;
  };
  createdAt: string;
}

export interface TenantUpdatePayload {
  name?: string;
  settings?: TenantSettingsRecord;
  version?: number;
}

export interface TenantUpdateResponse {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  settings?: TenantSettingsRecord | null;
  updatedAt: string;
}

export interface TenantActivationResponse {
  id: string;
  isActive: boolean;
  activatedAt?: string;
  deactivatedAt?: string;
}

export const tenantApi = {
  list: () => apiClient.get<TenantRecord[]>('/api/v1/tenants'),

  get: (id: string) => apiClient.get<TenantRecord>(`/api/v1/tenants/${id}`),

  create: (data: TenantCreatePayload) => apiClient.post<TenantCreateResponse>('/api/v1/tenants', data),

  update: (id: string, data: TenantUpdatePayload) =>
    apiClient.patch<TenantUpdateResponse>(`/api/v1/tenants/${id}`, data),

  activate: (id: string) => apiClient.post<TenantActivationResponse>(`/api/v1/tenants/${id}/activate`, {}),

  deactivate: (id: string, reason?: string) =>
    apiClient.post<TenantActivationResponse>(`/api/v1/tenants/${id}/deactivate`, { reason }),
};

export const configEntityApi = {
  list: (
    entityType: string,
    params?: {
      scopeType?: string;
      scopeId?: string;
      includeInherited?: boolean;
      includeInactive?: boolean;
      search?: string;
      parentId?: string;
      page?: number;
      pageSize?: number;
    },
  ) => apiClient.get<any[]>(`/api/v1/configuration-entity/${entityType}`, params),

  create: (
    entityType: string,
    data: {
      code: string;
      nameEn: string;
      nameZh?: string;
      nameJa?: string;
      descriptionEn?: string;
      sortOrder?: number;
      isForceUse?: boolean;
      ownerType?: string;
      ownerId?: string;
      [key: string]: unknown;
    },
  ) => apiClient.post<any>(`/api/v1/configuration-entity/${entityType}`, data),

  get: (entityType: string, id: string) =>
    apiClient.get<any>(`/api/v1/configuration-entity/${entityType}/${id}`),

  update: (entityType: string, id: string, data: { version: number; [key: string]: unknown }) =>
    apiClient.patch<any>(`/api/v1/configuration-entity/${entityType}/${id}`, data),

  deactivate: (entityType: string, id: string, version: number) =>
    apiClient.post<any>(`/api/v1/configuration-entity/${entityType}/${id}/deactivate`, {
      version,
    }),

  reactivate: (entityType: string, id: string, version: number) =>
    apiClient.post<any>(`/api/v1/configuration-entity/${entityType}/${id}/reactivate`, {
      version,
    }),
};

export const profileStoreApi = {
  list: (params?: { page?: number; pageSize?: number; includeInactive?: boolean }) =>
    apiClient.get<{ items: any[]; meta: any }>('/api/v1/profile-stores', params),

  get: (id: string) => apiClient.get<any>(`/api/v1/profile-stores/${id}`),

  create: (data: {
    code: string;
    nameEn: string;
    nameZh?: string;
    nameJa?: string;
    descriptionEn?: string;
    descriptionZh?: string;
    descriptionJa?: string;
    piiServiceConfigCode: string;
    isDefault?: boolean;
  }) => apiClient.post<any>('/api/v1/profile-stores', data),

  update: (
    id: string,
    data: {
      nameEn?: string;
      nameZh?: string;
      nameJa?: string;
      descriptionEn?: string;
      descriptionZh?: string;
      descriptionJa?: string;
      piiServiceConfigCode?: string;
      isDefault?: boolean;
      isActive?: boolean;
      version: number;
    },
  ) => apiClient.patch<any>(`/api/v1/profile-stores/${id}`, data),
};

export const piiServiceConfigApi = {
  list: (params?: { page?: number; pageSize?: number; includeInactive?: boolean }) =>
    apiClient.get<{ items: any[]; meta: any }>('/api/v1/pii-service-configs', params),

  get: (id: string) => apiClient.get<any>(`/api/v1/pii-service-configs/${id}`),

  create: (data: {
    code: string;
    nameEn: string;
    nameZh?: string;
    nameJa?: string;
    descriptionEn?: string;
    apiUrl: string;
    authType: 'mtls' | 'api_key';
    apiKey?: string;
    mtlsClientCert?: string;
    mtlsClientKey?: string;
    mtlsCaCert?: string;
    healthCheckUrl?: string;
    healthCheckIntervalSec?: number;
  }) => apiClient.post<any>('/api/v1/pii-service-configs', data),

  update: (
    id: string,
    data: {
      nameEn?: string;
      nameZh?: string;
      nameJa?: string;
      descriptionEn?: string;
      apiUrl?: string;
      authType?: 'mtls' | 'api_key';
      apiKey?: string;
      healthCheckUrl?: string;
      healthCheckIntervalSec?: number;
      isActive?: boolean;
      version: number;
    },
  ) => apiClient.patch<any>(`/api/v1/pii-service-configs/${id}`, data),

  testConnection: (id: string) => apiClient.post<any>(`/api/v1/pii-service-configs/${id}/test`, {}),
};

export const dictionaryApi = {
  listTypes: () => apiClient.get<any[]>('/api/v1/system-dictionary'),

  getByType: (
    type: string,
    params?: { search?: string; includeInactive?: boolean; page?: number; pageSize?: number },
  ) => apiClient.get<any[]>(`/api/v1/system-dictionary/${type}`, params),

  getItem: (type: string, code: string) =>
    apiClient.get<any>(`/api/v1/system-dictionary/${type}/${code}`),

  createType: (data: {
    code: string;
    nameEn: string;
    nameZh?: string;
    nameJa?: string;
    descriptionEn?: string;
    descriptionZh?: string;
    descriptionJa?: string;
    sortOrder?: number;
  }) => apiClient.post<any>('/api/v1/system-dictionary', data),

  updateType: (
    typeCode: string,
    data: {
      nameEn?: string;
      nameZh?: string;
      nameJa?: string;
      descriptionEn?: string;
      descriptionZh?: string;
      descriptionJa?: string;
      sortOrder?: number;
      version: number;
    },
  ) => apiClient.put<any>(`/api/v1/system-dictionary/${typeCode}`, data),

  createItem: (
    typeCode: string,
    data: {
      code: string;
      nameEn: string;
      nameZh?: string;
      nameJa?: string;
      descriptionEn?: string;
      descriptionZh?: string;
      descriptionJa?: string;
      sortOrder?: number;
      extraData?: Record<string, unknown>;
    },
  ) => apiClient.post<any>(`/api/v1/system-dictionary/${typeCode}/items`, data),

  updateItem: (
    typeCode: string,
    itemId: string,
    data: {
      nameEn?: string;
      nameZh?: string;
      nameJa?: string;
      descriptionEn?: string;
      descriptionZh?: string;
      descriptionJa?: string;
      sortOrder?: number;
      extraData?: Record<string, unknown>;
      version: number;
    },
  ) => apiClient.put<any>(`/api/v1/system-dictionary/${typeCode}/items/${itemId}`, data),

  deactivateItem: (typeCode: string, itemId: string, _version: number) =>
    apiClient.delete<any>(`/api/v1/system-dictionary/${typeCode}/items/${itemId}`),

  reactivateItem: (typeCode: string, itemId: string, version: number) =>
    apiClient.post<any>(`/api/v1/system-dictionary/${typeCode}/items/${itemId}/reactivate`, {
      version,
    }),
};

export const subsidiaryApi = {
  list: () => apiClient.get<any[]>('/api/v1/subsidiaries'),

  get: (id: string) => apiClient.get<any>(`/api/v1/subsidiaries/${id}`),

  create: (data: {
    code: string;
    nameEn: string;
    parentId?: string | null;
    nameZh?: string;
    nameJa?: string;
    descriptionEn?: string;
    sortOrder?: number;
  }) => apiClient.post<any>('/api/v1/subsidiaries', data),

  update: (
    id: string,
    data: {
      nameEn?: string;
      nameZh?: string;
      nameJa?: string;
      descriptionEn?: string;
      sortOrder?: number;
      version: number;
    },
  ) => apiClient.patch<any>(`/api/v1/subsidiaries/${id}`, data),

  move: (id: string, data: { newParentId?: string | null; version: number }) =>
    apiClient.post<any>(`/api/v1/subsidiaries/${id}/move`, data),

  deactivate: (id: string, version: number) =>
    apiClient.post<any>(`/api/v1/subsidiaries/${id}/deactivate`, { version }),

  reactivate: (id: string, version: number) =>
    apiClient.post<any>(`/api/v1/subsidiaries/${id}/reactivate`, { version }),
};

export interface ScopeSettingsResponse {
  scopeType: 'tenant' | 'subsidiary' | 'talent';
  scopeId: string | null;
  settings: Record<string, unknown>;
  overrides: string[];
  inheritedFrom: Record<string, string>;
  version: number;
}

export const settingsApi = {
  getTenantSettings: () => apiClient.get<ScopeSettingsResponse>('/api/v1/organization/settings'),

  updateTenantSettings: (settings: Record<string, unknown>, version: number) =>
    apiClient.put<ScopeSettingsResponse>('/api/v1/organization/settings', { settings, version }),

  getSubsidiarySettings: (id: string) =>
    apiClient.get<ScopeSettingsResponse>(`/api/v1/subsidiaries/${id}/settings`),

  updateSubsidiarySettings: (id: string, settings: Record<string, unknown>, version: number) =>
    apiClient.put<ScopeSettingsResponse>(`/api/v1/subsidiaries/${id}/settings`, {
      settings,
      version,
    }),

  resetSubsidiarySetting: (id: string, field: string) =>
    apiClient.put<ScopeSettingsResponse>(`/api/v1/subsidiaries/${id}/settings/reset`, { field }),

  getTalentSettings: (id: string) =>
    apiClient.get<ScopeSettingsResponse>(`/api/v1/talents/${id}/settings`),

  updateTalentSettings: (id: string, settings: Record<string, unknown>, version: number) =>
    apiClient.put<ScopeSettingsResponse>(`/api/v1/talents/${id}/settings`, { settings, version }),

  resetTalentSetting: (id: string, field: string) =>
    apiClient.put<ScopeSettingsResponse>(`/api/v1/talents/${id}/settings/reset`, { field }),
};

export const systemDictionaryApi = {
  get: <T extends SystemDictionaryItemRecord = SystemDictionaryItemRecord>(
    dictionaryType: string,
    query?: { search?: string; includeInactive?: boolean; page?: number; pageSize?: number },
  ) => apiClient.get<T[]>(`/api/v1/system-dictionary/${dictionaryType}`, query),

  getItems: (dictionaryType: string, query?: { isActive?: boolean }) =>
    apiClient.get<any[]>(`/api/v1/system-dictionary/${dictionaryType}/items`, query),
};

export const configurationEntityApi = {
  list: <T extends ConfigurationEntityRecord = ConfigurationEntityRecord>(
    entityType: string,
    query?: Record<string, string | number | boolean | undefined>,
  ) => apiClient.get<T[]>(`/api/v1/configuration-entity/${entityType}`, query),

  get: <T extends ConfigurationEntityRecord = ConfigurationEntityRecord>(entityType: string, id: string) =>
    apiClient.get<T>(`/api/v1/configuration-entity/${entityType}/${id}`),

  create: (entityType: string, data: Record<string, any>) =>
    apiClient.post<any>(`/api/v1/configuration-entity/${entityType}`, data),

  update: (entityType: string, id: string, data: Record<string, any>) =>
    apiClient.patch<any>(`/api/v1/configuration-entity/${entityType}/${id}`, data),

  delete: (entityType: string, id: string) =>
    apiClient.delete<any>(`/api/v1/configuration-entity/${entityType}/${id}`),

  getMembershipTypesByClass: <T extends ConfigurationEntityRecord = ConfigurationEntityRecord>(
    classId: string,
    query?: Record<string, string | number | boolean | undefined>,
  ) => apiClient.get<T[]>(`/api/v1/configuration-entity/membership-classes/${classId}/types`, query),

  getMembershipLevelsByType: <T extends ConfigurationEntityRecord = ConfigurationEntityRecord>(
    typeId: string,
    query?: Record<string, string | number | boolean | undefined>,
  ) => apiClient.get<T[]>(`/api/v1/configuration-entity/membership-types/${typeId}/levels`, query),

  getMembershipTree: (query?: {
    scopeType?: 'tenant' | 'subsidiary' | 'talent';
    scopeId?: string;
    includeInactive?: boolean;
  }) => apiClient.get<MembershipTreeClass[]>('/api/v1/configuration-entity/membership-tree', query),
};

export interface ExternalBlocklistPattern {
  id: string;
  ownerType: 'tenant' | 'subsidiary' | 'talent';
  ownerId: string | null;
  pattern: string;
  patternType: 'domain' | 'url_regex' | 'keyword';
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  description: string | null;
  category: string | null;
  severity: 'low' | 'medium' | 'high';
  action: 'reject' | 'flag' | 'replace';
  replacement: string;
  inherit: boolean;
  sortOrder?: number;
  isActive: boolean;
  isForceUse?: boolean;
  isSystem?: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  isInherited?: boolean;
  isDisabledHere?: boolean;
  canDisable?: boolean;
}

export const externalBlocklistApi = {
  list: (query?: {
    scopeType?: 'tenant' | 'subsidiary' | 'talent';
    scopeId?: string;
    category?: string;
    includeInherited?: boolean;
    includeDisabled?: boolean;
    includeInactive?: boolean;
    page?: number;
    pageSize?: number;
    ownerType?: 'tenant' | 'subsidiary' | 'talent';
    ownerId?: string;
    isActive?: boolean;
  }) => {
    const params: Record<string, string> = {};
    if (query?.scopeType) params.scopeType = query.scopeType;
    else if (query?.ownerType) params.scopeType = query.ownerType;
    if (query?.scopeId) params.scopeId = query.scopeId;
    else if (query?.ownerId) params.scopeId = query.ownerId;
    if (query?.category) params.category = query.category;
    if (query?.includeInherited !== undefined) {
      params.includeInherited = String(query.includeInherited);
    }
    if (query?.includeDisabled !== undefined) {
      params.includeDisabled = String(query.includeDisabled);
    }
    if (query?.includeInactive !== undefined) {
      params.includeInactive = String(query.includeInactive);
    }
    if (query?.page) params.page = String(query.page);
    if (query?.pageSize) params.pageSize = String(query.pageSize);
    return apiClient.get<ExternalBlocklistPattern[]>('/api/v1/external-blocklist', params);
  },

  getForScope: (scopeType: 'tenant' | 'subsidiary' | 'talent', scopeId: string) =>
    apiClient.get<ExternalBlocklistPattern[]>(
      `/api/v1/external-blocklist/scope/${scopeType}/${scopeId}`,
    ),

  getForTalent: (talentId: string) =>
    apiClient.get<ExternalBlocklistPattern[]>(`/api/v1/external-blocklist/talent/${talentId}`),

  get: (id: string) => apiClient.get<ExternalBlocklistPattern>(`/api/v1/external-blocklist/${id}`),

  create: (data: {
    ownerType: 'tenant' | 'subsidiary' | 'talent';
    ownerId?: string;
    pattern: string;
    patternType: 'domain' | 'url_regex' | 'keyword';
    nameEn: string;
    nameZh?: string;
    nameJa?: string;
    description?: string;
    category?: string;
    severity?: 'low' | 'medium' | 'high';
    action?: 'reject' | 'flag' | 'replace';
    replacement?: string;
    inherit?: boolean;
    sortOrder?: number;
    isForceUse?: boolean;
  }) => apiClient.post<ExternalBlocklistPattern>('/api/v1/external-blocklist', data),

  update: (
    id: string,
    data: {
      pattern?: string;
      patternType?: 'domain' | 'url_regex' | 'keyword';
      nameEn?: string;
      nameZh?: string;
      nameJa?: string;
      description?: string;
      category?: string;
      severity?: 'low' | 'medium' | 'high';
      action?: 'reject' | 'flag' | 'replace';
      replacement?: string;
      inherit?: boolean;
      sortOrder?: number;
      isActive?: boolean;
      isForceUse?: boolean;
      version: number;
    },
  ) => apiClient.patch<ExternalBlocklistPattern>(`/api/v1/external-blocklist/${id}`, data),

  delete: (id: string) => apiClient.delete<{ message: string }>(`/api/v1/external-blocklist/${id}`),

  disable: (id: string, scope: { scopeType?: string; scopeId?: string }) =>
    apiClient.post<{ id: string; disabled: boolean }>(`/api/v1/external-blocklist/${id}/disable`, scope),

  enable: (id: string, scope: { scopeType?: string; scopeId?: string }) =>
    apiClient.post<{ id: string; enabled: boolean }>(`/api/v1/external-blocklist/${id}/enable`, scope),

  batchToggle: (ids: string[], isActive: boolean) =>
    apiClient.post<{ updated: number }>('/api/v1/external-blocklist/batch-toggle', {
      ids,
      isActive,
    }),
};

export const talentDomainApi = {
  setHomepageDomain: (talentId: string, customDomain: string | null) =>
    apiClient.post<{ customDomain: string | null; token: string | null; txtRecord: string | null }>(
      `/api/v1/talents/${talentId}/homepage/domain`,
      { customDomain },
    ),

  verifyHomepageDomain: (talentId: string) =>
    apiClient.post<{ verified: boolean; message: string }>(
      `/api/v1/talents/${talentId}/homepage/verify-domain`,
      {},
    ),

  setMarshmallowDomain: (talentId: string, customDomain: string | null) =>
    apiClient.post<{ customDomain: string | null; token: string | null; txtRecord: string | null }>(
      `/api/v1/talents/${talentId}/marshmallow/config/domain`,
      { customDomain },
    ),

  verifyMarshmallowDomain: (talentId: string) =>
    apiClient.post<{ verified: boolean; message: string }>(
      `/api/v1/talents/${talentId}/marshmallow/config/verify-domain`,
      {},
    ),

  getConfig: (talentId: string) =>
    apiClient.get<{
      customDomain: string | null;
      customDomainVerified: boolean;
      customDomainVerificationToken: string | null;
      customDomainSslMode: 'auto' | 'self_hosted' | 'cloudflare';
      homepageCustomPath: string | null;
      marshmallowCustomPath: string | null;
    }>(`/api/v1/talents/${talentId}/custom-domain`),

  setDomain: (talentId: string, customDomain: string | null) =>
    apiClient.post<{
      customDomain: string | null;
      token: string | null;
      txtRecord: string | null;
    }>(`/api/v1/talents/${talentId}/custom-domain`, { customDomain }),

  verifyDomain: (talentId: string) =>
    apiClient.post<{ verified: boolean; message: string }>(
      `/api/v1/talents/${talentId}/custom-domain/verify`,
      {},
    ),

  updatePaths: (
    talentId: string,
    paths: { homepageCustomPath?: string; marshmallowCustomPath?: string },
  ) =>
    apiClient.patch<{
      homepageCustomPath: string | null;
      marshmallowCustomPath: string | null;
    }>(`/api/v1/talents/${talentId}/custom-domain/paths`, paths),

  updateSslMode: (talentId: string, sslMode: 'auto' | 'self_hosted' | 'cloudflare') =>
    apiClient.patch<{ customDomainSslMode: string }>(`/api/v1/talents/${talentId}/custom-domain/ssl-mode`, {
      sslMode,
    }),
};

export interface PlatformConfigEntry<TValue = unknown> {
  key: string;
  value: TValue;
  description?: string | null;
}

export const platformConfigApi = {
  get: <TValue = unknown>(key: string) =>
    apiClient.get<PlatformConfigEntry<TValue>>(`/api/v1/platform/config/${key}`),

  set: <TValue = unknown>(key: string, value: TValue) =>
    apiClient.put<PlatformConfigEntry<TValue>>(`/api/v1/platform/config/${key}`, { value }),
};

export interface EmailConfigResponse {
  provider: 'tencent_ses' | 'smtp';
  tencentSes?: {
    secretId: string;
    secretKey: string;
    region: string;
    fromAddress: string;
    fromName: string;
    replyTo?: string;
  };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromAddress: string;
    fromName: string;
  };
  isConfigured: boolean;
  lastUpdated?: string;
}

export interface SaveEmailConfigPayload {
  provider: 'tencent_ses' | 'smtp';
  tencentSes?: {
    secretId: string;
    secretKey: string;
    region: string;
    fromAddress: string;
    fromName: string;
    replyTo?: string;
  };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromAddress: string;
    fromName: string;
  };
}

export interface EmailTestResult {
  success: boolean;
  message: string;
  error?: string;
}

export const emailConfigApi = {
  get: () => apiClient.get<EmailConfigResponse>('/api/v1/email/config'),

  save: (config: SaveEmailConfigPayload) =>
    apiClient.put<EmailConfigResponse>('/api/v1/email/config', config),

  testConnection: () => apiClient.post<EmailTestResult>('/api/v1/email/config/test-connection', {}),

  test: (testEmail: string) =>
    apiClient.post<EmailTestResult>('/api/v1/email/config/test', { testEmail }),
};
