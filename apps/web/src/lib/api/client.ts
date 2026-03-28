import { apiClient } from './core';

/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

export type { ApiError, ApiResponse } from './core';
export { apiClient, registerAuthClientHooks } from './core';
export { authApi, userApi } from './modules/auth';
export * from './modules/customer';
export { integrationApi } from './modules/integration';
export type { OrganizationTreeResponse } from './modules/organization';
export { organizationApi } from './modules/organization';
export { permissionApi } from './modules/permission';
export * from './modules/user-management';

// Talent API
export const talentApi = {
  list: (subsidiaryId?: string) =>
    apiClient.get<any[]>('/api/v1/talents', subsidiaryId ? { subsidiaryId } : undefined),

  get: (id: string) => apiClient.get<any>(`/api/v1/talents/${id}`),

  create: (data: {
    code: string;
    nameEn: string;
    displayName: string;
    profileStoreId: string;
    subsidiaryId?: string | null;
    nameZh?: string;
    nameJa?: string;
    descriptionEn?: string;
    avatarUrl?: string;
    homepagePath?: string;
    timezone?: string;
  }) => apiClient.post<any>('/api/v1/talents', data),

  update: (
    id: string,
    data: {
      nameEn?: string;
      nameZh?: string;
      nameJa?: string;
      displayName?: string;
      descriptionEn?: string;
      avatarUrl?: string;
      homepagePath?: string;
      timezone?: string;
      socialLinks?: Array<{ platform: string; url: string }>;
      version: number;
    }
  ) => apiClient.patch<any>(`/api/v1/talents/${id}`, data),

  move: (id: string, data: { newSubsidiaryId?: string | null; version: number }) =>
    apiClient.post<any>(`/api/v1/talents/${id}/move`, data),

  deactivate: (id: string, version: number) =>
    apiClient.post<any>(`/api/v1/talents/${id}/deactivate`, { version }),

  reactivate: (id: string, version: number) =>
    apiClient.post<any>(`/api/v1/talents/${id}/reactivate`, { version }),
};

// Organization API
// Report API
export type ReportFormat = 'xlsx' | 'csv';

export interface ReportCreateData {
  reportType: string;
  talentId: string;
  filters: {
    platformCodes?: string[];
    membershipClassCodes?: string[];
    membershipTypeCodes?: string[];
    membershipLevelCodes?: string[];
    statusCodes?: string[];
    validFromStart?: string;
    validFromEnd?: string;
    validToStart?: string;
    validToEnd?: string;
    includeExpired?: boolean;
    includeInactive?: boolean;
  };
  format?: ReportFormat;
  options?: {
    includePii?: boolean;
    language?: string;
  };
}

export const reportApi = {
  // List report jobs for a talent
  list: (talentId: string, page?: number, pageSize?: number) =>
    apiClient.get<{ items: any[]; meta: { total: number } }>('/api/v1/reports/mfr/jobs', {
      talentId,
      page: page || 1,
      pageSize: pageSize || 20,
    }),

  // MFR Report: Create job (backend path: /reports/mfr/jobs)
  create: (data: ReportCreateData) =>
    apiClient.post<{ jobId: string; status: string; createdAt: string }>(
      '/api/v1/reports/mfr/jobs',
      {
        talentId: data.talentId,
        filters: {
          platformCodes: data.filters.platformCodes,
          membershipClassCodes: data.filters.membershipClassCodes,
          membershipTypeCodes: data.filters.membershipTypeCodes,
          membershipLevelCodes: data.filters.membershipLevelCodes,
          statusCodes: data.filters.statusCodes,
          validFromStart: data.filters.validFromStart,
          validFromEnd: data.filters.validFromEnd,
          validToStart: data.filters.validToStart,
          validToEnd: data.filters.validToEnd,
          includeExpired: data.filters.includeExpired,
          includeInactive: data.filters.includeInactive,
        },
        format: data.format || 'xlsx',
      }
    ),

  // Search/preview MFR data
  search: (talentId: string, filters: ReportCreateData['filters'], previewLimit?: number) =>
    apiClient.post<any>('/api/v1/reports/mfr/search', {
      talentId,
      filters,
      previewLimit: previewLimit || 20,
    }),

  // Get job status (backend path: /reports/mfr/jobs/:jobId)
  getStatus: (jobId: string, talentId: string) =>
    apiClient.get<any>(`/api/v1/reports/mfr/jobs/${jobId}`, { talent_id: talentId }),

  // Get download URL (backend path: /reports/mfr/jobs/:jobId/download)
  getDownloadUrl: (jobId: string, talentId: string) =>
    apiClient.get<{ downloadUrl: string }>(`/api/v1/reports/mfr/jobs/${jobId}/download`, {
      talent_id: talentId,
    }),

  // Cancel job
  cancel: (jobId: string, talentId: string) =>
    apiClient.delete<any>(`/api/v1/reports/mfr/jobs/${jobId}?talent_id=${talentId}`),
};

// Marshmallow API (Admin)
export const marshmallowApi = {
  getConfig: (talentId: string) =>
    apiClient.get<any>(`/api/v1/talents/${talentId}/marshmallow/config`),

  updateConfig: (talentId: string, config: any) =>
    apiClient.patch<any>(`/api/v1/talents/${talentId}/marshmallow/config`, config),

  uploadAvatar: async (talentId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    // Use raw fetch for multipart/form-data because JSON stringification in ApiClient breaks FormData
    // Alternatively, extend ApiClient to support FormData, but using fetch here is simpler for now
    // We need to manually add Authorization header
    const token = apiClient.getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Note: Do NOT set Content-Type header manually for FormData, let browser set it with boundary
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/talents/${talentId}/marshmallow/avatar`,
      {
        method: 'POST',
        body: formData,
        headers,
      }
    );

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const result = await response.json();
    return result.data;
  },

  getMessages: (talentId: string, status?: string, pageSize: number = 100) =>
    apiClient.get<any[]>(`/api/v1/talents/${talentId}/marshmallow/messages`, {
      ...(status ? { status } : {}),
      pageSize,
    }),

  // Approve message (backend uses separate endpoints for approve/reject)
  approveMessage: (talentId: string, messageId: string) =>
    apiClient.post<any>(
      `/api/v1/talents/${talentId}/marshmallow/messages/${messageId}/approve`,
      {}
    ),

  // Reject message (reason must be one of: profanity, spam, harassment, off_topic, duplicate, external_link, other)
  rejectMessage: (talentId: string, messageId: string, reason: string, note?: string) =>
    apiClient.post<any>(`/api/v1/talents/${talentId}/marshmallow/messages/${messageId}/reject`, {
      reason,
      note,
    }),

  // Unreject message - restore rejected message to pending status
  unrejectMessage: (talentId: string, messageId: string) =>
    apiClient.post<any>(
      `/api/v1/talents/${talentId}/marshmallow/messages/${messageId}/unreject`,
      {}
    ),

  // Update message (read, starred, pinned status)
  updateMessage: (
    talentId: string,
    messageId: string,
    data: { isRead?: boolean; isStarred?: boolean; isPinned?: boolean }
  ) => apiClient.patch<any>(`/api/v1/talents/${talentId}/marshmallow/messages/${messageId}`, data),

  // Reply to message
  replyMessage: (talentId: string, messageId: string, content: string) =>
    apiClient.post<any>(`/api/v1/talents/${talentId}/marshmallow/messages/${messageId}/reply`, {
      content,
    }),

  // Batch action on messages
  batchAction: (
    talentId: string,
    action: 'approve' | 'reject' | 'delete',
    messageIds: string[],
    reason?: string
  ) =>
    apiClient.post<any>(`/api/v1/talents/${talentId}/marshmallow/messages/batch`, {
      action,
      messageIds,
      reason,
    }),

  // Generate SSO token for streamer mode on public page
  generateSsoToken: (talentId: string) =>
    apiClient.post<{ token: string; expiresIn: number; expiresAt: string }>(
      `/api/v1/talents/${talentId}/marshmallow/sso-token`,
      {}
    ),
};

// Homepage Management API (Admin)
export const homepageApi = {
  // Get homepage configuration
  get: (talentId: string) =>
    apiClient.get<any>(`/api/v1/talents/${talentId}/homepage`, { _t: Date.now() }),

  // Save draft
  saveDraft: (talentId: string, draft: { content: any; theme?: any; settings?: any }) =>
    apiClient.put<any>(`/api/v1/talents/${talentId}/homepage/draft`, draft),

  // Publish homepage
  publish: (talentId: string) =>
    apiClient.post<any>(`/api/v1/talents/${talentId}/homepage/publish`, {}),

  // Unpublish homepage
  unpublish: (talentId: string) =>
    apiClient.post<any>(`/api/v1/talents/${talentId}/homepage/unpublish`, {}),

  // Update settings
  updateSettings: (talentId: string, settings: any) =>
    apiClient.patch<any>(`/api/v1/talents/${talentId}/homepage/settings`, settings),

  // List versions
  listVersions: (talentId: string, page?: number, pageSize?: number) =>
    apiClient.get<any>(`/api/v1/talents/${talentId}/homepage/versions`, { page, pageSize }),

  // Get version detail
  getVersion: (talentId: string, versionId: string) =>
    apiClient.get<any>(`/api/v1/talents/${talentId}/homepage/versions/${versionId}`),

  // Restore version
  restoreVersion: (talentId: string, versionId: string) =>
    apiClient.post<any>(`/api/v1/talents/${talentId}/homepage/versions/${versionId}/restore`, {}),
};

// Public API (No Auth Required)
export const publicApi = {
  getHomepage: (talentPath: string) => apiClient.get<any>(`/api/v1/public/homepage/${talentPath}`),

  getMarshmallowConfig: (talentPath: string) =>
    apiClient.get<any>(`/api/v1/public/marshmallow/${talentPath}/config`),

  // Submit marshmallow message (backend path: /public/marshmallow/:path/submit)
  submitMarshmallow: (
    talentPath: string,
    data: {
      content: string;
      senderName?: string;
      isAnonymous: boolean;
      turnstileToken?: string;
      fingerprint: string;
      honeypot?: string; // Hidden field for bot detection
      socialLink?: string;
      selectedImageUrls?: string[];
    }
  ) => apiClient.post<any>(`/api/v1/public/marshmallow/${talentPath}/submit`, data),

  // Get public messages (approved ones)
  // Note: _t parameter is used for cache-busting to ensure fresh data
  getPublicMessages: (
    talentPath: string,
    cursor?: string,
    limit?: number,
    fingerprint?: string,
    bustCache?: boolean
  ) =>
    apiClient.get<any>(`/api/v1/public/marshmallow/${talentPath}/messages`, {
      cursor,
      limit: limit?.toString(),
      fingerprint,
      ...(bustCache ? { _t: Date.now().toString() } : {}),
    }),

  // Mark message as read (for streamers during broadcasts)
  markMarshmallowRead: (talentPath: string, messageId: string, fingerprint: string) =>
    apiClient.post<{ success: boolean; isRead: boolean }>(
      `/api/v1/public/marshmallow/${talentPath}/messages/${messageId}/mark-read`,
      { fingerprint }
    ),

  // SSO-authenticated endpoints (for streamer mode)
  validateSsoToken: (token: string) =>
    apiClient.post<{
      valid: boolean;
      user: { id: string; displayName: string; email: string; talentId: string } | null;
    }>('/api/v1/public/marshmallow/validate-sso', { token }),

  markMarshmallowReadAuth: (talentPath: string, messageId: string, ssoToken: string) =>
    apiClient.post<{ success: boolean; isRead: boolean }>(
      `/api/v1/public/marshmallow/${talentPath}/messages/${messageId}/mark-read-auth`,
      { ssoToken }
    ),

  replyMarshmallowAuth: (
    talentPath: string,
    messageId: string,
    content: string,
    ssoToken: string
  ) =>
    apiClient.post<{
      success: boolean;
      replyContent: string;
      repliedAt: string;
      repliedBy: { id: string; displayName: string };
    }>(`/api/v1/public/marshmallow/${talentPath}/messages/${messageId}/reply-auth`, {
      ssoToken,
      content,
    }),

  previewMarshmallowImage: (url: string) =>
    apiClient.post<{ success: boolean; imageUrl?: string; images?: string[]; error?: string }>(
      '/api/v1/public/marshmallow/preview-image',
      { url }
    ),
};

// Security API
export const securityApi = {
  generateFingerprint: () => apiClient.post<any>('/api/v1/security/fingerprint', {}),

  // Blocklist
  getBlocklistEntries: (query?: {
    scopeType?: string;
    scopeId?: string;
    includeInherited?: boolean;
    includeDisabled?: boolean;
    includeInactive?: boolean;
  }) => {
    const params = new URLSearchParams();
    if (query?.scopeType) params.append('scopeType', query.scopeType);
    if (query?.scopeId) params.append('scopeId', query.scopeId);
    if (query?.includeInherited !== undefined)
      params.append('includeInherited', String(query.includeInherited));
    if (query?.includeDisabled !== undefined)
      params.append('includeDisabled', String(query.includeDisabled));
    if (query?.includeInactive !== undefined)
      params.append('includeInactive', String(query.includeInactive));
    const queryStr = params.toString();
    return apiClient.get<any[]>(`/api/v1/blocklist-entries${queryStr ? `?${queryStr}` : ''}`);
  },

  createBlocklistEntry: (entry: {
    ownerType?: string;
    ownerId?: string;
    pattern: string;
    patternType: string;
    nameEn: string;
    action: string;
    severity: string;
    scope: string[];
    sortOrder?: number;
    isForceUse?: boolean;
  }) =>
    apiClient.post<any>('/api/v1/blocklist-entries', {
      ownerType: entry.ownerType ?? 'tenant',
      ownerId: entry.ownerId,
      pattern: entry.pattern,
      patternType: entry.patternType,
      nameEn: entry.nameEn,
      action: entry.action,
      severity: entry.severity,
      scope: entry.scope,
      sortOrder: entry.sortOrder ?? 0,
      isForceUse: entry.isForceUse ?? false,
    }),

  updateBlocklistEntry: (id: string, entry: any) =>
    apiClient.patch<any>(`/api/v1/blocklist-entries/${id}`, entry),

  deleteBlocklistEntry: (id: string) => apiClient.delete<any>(`/api/v1/blocklist-entries/${id}`),

  disableBlocklistEntry: (id: string, scope: { scopeType?: string; scopeId?: string }) =>
    apiClient.post<any>(`/api/v1/blocklist-entries/${id}/disable`, scope),

  enableBlocklistEntry: (id: string, scope: { scopeType?: string; scopeId?: string }) =>
    apiClient.post<any>(`/api/v1/blocklist-entries/${id}/enable`, scope),

  testBlocklistPattern: (testContent: string, pattern: string, patternType: string) =>
    apiClient.post<{ matched: boolean; positions: number[] }>('/api/v1/blocklist-entries/test', {
      testContent,
      pattern,
      patternType,
    }),

  // IP Rules
  getIpRules: () => apiClient.get<any[]>('/api/v1/ip-access-rules'),

  createIpRule: (rule: { ruleType: string; ipPattern: string; scope: string; reason?: string }) =>
    apiClient.post<any>('/api/v1/ip-access-rules', {
      ruleType: rule.ruleType,
      ipPattern: rule.ipPattern,
      scope: rule.scope,
      reason: rule.reason,
    }),

  deleteIpRule: (id: string) => apiClient.delete<any>(`/api/v1/ip-access-rules/${id}`),

  checkIpAccess: (ip: string, scope: 'global' | 'admin' | 'public' | 'api' = 'global') =>
    apiClient.post<{ allowed: boolean; reason?: string; matched_rule?: any; matchedRule?: any }>(
      '/api/v1/ip-access-rules/check',
      { ip, scope }
    ),

  // Rate Limit Stats
  getRateLimitStats: () =>
    apiClient.get<{
      summary: {
        totalRequests24h: number;
        blockedRequests24h: number;
        uniqueIPs24h: number;
        currentlyBlocked: number;
      };
      topEndpoints: Array<{
        endpoint: string;
        method: string;
        current: number;
        limit: number;
        resetIn: number;
      }>;
      topIPs: Array<{
        ip: string;
        requests: number;
        blocked: boolean;
        lastSeen: string;
      }>;
      lastUpdated: string;
    }>('/api/v1/rate-limit/stats'),
};

// Tenant API (Platform Admin)
export const tenantApi = {
  list: () => apiClient.get<any[]>('/api/v1/tenants'),

  get: (id: string) => apiClient.get<any>(`/api/v1/tenants/${id}`),

  create: (data: any) => apiClient.post<any>('/api/v1/tenants', data),

  update: (id: string, data: any) => apiClient.patch<any>(`/api/v1/tenants/${id}`, data),

  activate: (id: string) => apiClient.post<any>(`/api/v1/tenants/${id}/activate`, {}),

  deactivate: (id: string, reason?: string) =>
    apiClient.post<any>(`/api/v1/tenants/${id}/deactivate`, { reason }),
};

// Configuration Entity API (Generic CRUD for config entities)
export const configEntityApi = {
  // List entities by type
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
    }
  ) => apiClient.get<any[]>(`/api/v1/configuration-entity/${entityType}`, params),

  // Create entity
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
    }
  ) => apiClient.post<any>(`/api/v1/configuration-entity/${entityType}`, data),

  // Get entity by ID
  get: (entityType: string, id: string) =>
    apiClient.get<any>(`/api/v1/configuration-entity/${entityType}/${id}`),

  // Update entity
  update: (entityType: string, id: string, data: { version: number; [key: string]: unknown }) =>
    apiClient.patch<any>(`/api/v1/configuration-entity/${entityType}/${id}`, data),

  // Deactivate entity
  deactivate: (entityType: string, id: string, version: number) =>
    apiClient.post<any>(`/api/v1/configuration-entity/${entityType}/${id}/deactivate`, { version }),

  // Reactivate entity
  reactivate: (entityType: string, id: string, version: number) =>
    apiClient.post<any>(`/api/v1/configuration-entity/${entityType}/${id}/reactivate`, { version }),
};

// Profile Store API (PII data storage configuration)
export const profileStoreApi = {
  // List profile stores
  list: (params?: { page?: number; pageSize?: number; includeInactive?: boolean }) =>
    apiClient.get<{ items: any[]; meta: any }>('/api/v1/profile-stores', params),

  // Get profile store by ID
  get: (id: string) => apiClient.get<any>(`/api/v1/profile-stores/${id}`),

  // Create profile store
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

  // Update profile store
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
    }
  ) => apiClient.patch<any>(`/api/v1/profile-stores/${id}`, data),
};

// PII Service Config API (PII proxy service configuration)
export const piiServiceConfigApi = {
  // List PII service configs
  list: (params?: { page?: number; pageSize?: number; includeInactive?: boolean }) =>
    apiClient.get<{ items: any[]; meta: any }>('/api/v1/pii-service-configs', params),

  // Get PII service config by ID
  get: (id: string) => apiClient.get<any>(`/api/v1/pii-service-configs/${id}`),

  // Create PII service config
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

  // Update PII service config
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
    }
  ) => apiClient.patch<any>(`/api/v1/pii-service-configs/${id}`, data),

  // Test PII service connection
  testConnection: (id: string) => apiClient.post<any>(`/api/v1/pii-service-configs/${id}/test`, {}),
};

// System Dictionary API (Read for all tenants, Write for AC only)
export const dictionaryApi = {
  // List dictionary types
  listTypes: () => apiClient.get<any[]>('/api/v1/system-dictionary'),

  // Get dictionary items by type
  getByType: (
    type: string,
    params?: { search?: string; includeInactive?: boolean; page?: number; pageSize?: number }
  ) => apiClient.get<any[]>(`/api/v1/system-dictionary/${type}`, params),

  // Get single dictionary item
  getItem: (type: string, code: string) =>
    apiClient.get<any>(`/api/v1/system-dictionary/${type}/${code}`),

  // =====================================================
  // AC Tenant Only Operations
  // =====================================================

  // Create dictionary type (AC only)
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

  // Update dictionary type (AC only)
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
    }
  ) => apiClient.put<any>(`/api/v1/system-dictionary/${typeCode}`, data),

  // Create dictionary item (AC only)
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
    }
  ) => apiClient.post<any>(`/api/v1/system-dictionary/${typeCode}/items`, data),

  // Update dictionary item (AC only)
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
    }
  ) => apiClient.put<any>(`/api/v1/system-dictionary/${typeCode}/items/${itemId}`, data),

  // Deactivate dictionary item (AC only)
  deactivateItem: (typeCode: string, itemId: string, _version: number) =>
    apiClient.delete<any>(`/api/v1/system-dictionary/${typeCode}/items/${itemId}`),

  // Reactivate dictionary item (AC only)
  reactivateItem: (typeCode: string, itemId: string, version: number) =>
    apiClient.post<any>(`/api/v1/system-dictionary/${typeCode}/items/${itemId}/reactivate`, {
      version,
    }),
};

// Log API
export const logApi = {
  // Change Logs
  getChangeLogs: (params?: {
    objectType?: string;
    action?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => apiClient.get<any>('/api/v1/logs/changes', { params }),

  // Technical Events
  getTechEvents: (params?: {
    scope?: string;
    severity?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => apiClient.get<any>('/api/v1/logs/events', { params }),

  // Integration Logs
  getIntegrationLogs: (params?: {
    direction?: string;
    status?: string;
    endpoint?: string;
    consumerId?: string;
    page?: number;
    pageSize?: number;
  }) => apiClient.get<any>('/api/v1/logs/integrations', { params }),

  getIntegrationLogByTrace: (traceId: string) =>
    apiClient.get<any>(`/api/v1/logs/integrations/trace/${traceId}`),

  getFailedIntegrations: (params?: { page?: number; pageSize?: number }) =>
    apiClient.get<any>('/api/v1/logs/integrations/failed', { params }),

  // Loki Search
  searchLoki: (params: { query: string; timeRange: string; limit?: number; app?: string }) =>
    apiClient.post<any>('/api/v1/logs/search', params),

  // Unified log search (for LogViewer component)
  searchUnified: (params?: {
    keyword?: string;
    stream?: string;
    severity?: string;
    start?: string;
    end?: string;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.keyword) queryParams.append('keyword', params.keyword);
    if (params?.stream) queryParams.append('stream', params.stream);
    if (params?.severity) queryParams.append('severity', params.severity);
    if (params?.start) queryParams.append('start', params.start);
    if (params?.end) queryParams.append('end', params.end);
    if (params?.limit) queryParams.append('limit', String(params.limit));
    const queryStr = queryParams.toString();
    return apiClient.get<
      Array<{
        timestamp: string;
        level: string;
        message: string;
        source: string;
        metadata?: Record<string, unknown>;
      }>
    >(`/api/v1/logs/search${queryStr ? `?${queryStr}` : ''}`);
  },
};

// Subsidiary API
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
    }
  ) => apiClient.patch<any>(`/api/v1/subsidiaries/${id}`, data),

  move: (id: string, data: { newParentId?: string | null; version: number }) =>
    apiClient.post<any>(`/api/v1/subsidiaries/${id}/move`, data),

  deactivate: (id: string, version: number) =>
    apiClient.post<any>(`/api/v1/subsidiaries/${id}/deactivate`, { version }),

  reactivate: (id: string, version: number) =>
    apiClient.post<any>(`/api/v1/subsidiaries/${id}/reactivate`, { version }),
};

// Scope Settings API (Hierarchical settings with inheritance)
export interface ScopeSettingsResponse {
  scopeType: 'tenant' | 'subsidiary' | 'talent';
  scopeId: string | null;
  settings: Record<string, unknown>;
  overrides: string[];
  inheritedFrom: Record<string, string>;
  version: number;
}

export const settingsApi = {
  // Get tenant settings
  getTenantSettings: () => apiClient.get<ScopeSettingsResponse>('/api/v1/organization/settings'),

  // Update tenant settings
  updateTenantSettings: (settings: Record<string, unknown>, version: number) =>
    apiClient.put<ScopeSettingsResponse>('/api/v1/organization/settings', { settings, version }),

  // Get subsidiary settings (with inheritance)
  getSubsidiarySettings: (id: string) =>
    apiClient.get<ScopeSettingsResponse>(`/api/v1/subsidiaries/${id}/settings`),

  // Update subsidiary settings
  updateSubsidiarySettings: (id: string, settings: Record<string, unknown>, version: number) =>
    apiClient.put<ScopeSettingsResponse>(`/api/v1/subsidiaries/${id}/settings`, {
      settings,
      version,
    }),

  // Reset subsidiary setting field to inherited value
  resetSubsidiarySetting: (id: string, field: string) =>
    apiClient.put<ScopeSettingsResponse>(`/api/v1/subsidiaries/${id}/settings/reset`, { field }),

  // Get talent settings (with inheritance)
  getTalentSettings: (id: string) =>
    apiClient.get<ScopeSettingsResponse>(`/api/v1/talents/${id}/settings`),

  // Update talent settings
  updateTalentSettings: (id: string, settings: Record<string, unknown>, version: number) =>
    apiClient.put<ScopeSettingsResponse>(`/api/v1/talents/${id}/settings`, { settings, version }),

  // Reset talent setting field to inherited value
  resetTalentSetting: (id: string, field: string) =>
    apiClient.put<ScopeSettingsResponse>(`/api/v1/talents/${id}/settings/reset`, { field }),
};

// System Dictionary API
export const systemDictionaryApi = {
  // Get dictionary by type
  get: (dictionaryType: string) =>
    apiClient.get<any>(`/api/v1/system-dictionary/${dictionaryType}`),

  // Get items for a dictionary type
  getItems: (dictionaryType: string, query?: { isActive?: boolean }) =>
    apiClient.get<any[]>(`/api/v1/system-dictionary/${dictionaryType}/items`, query),
};

// Configuration Entity API
export const configurationEntityApi = {
  // List configuration entities by type
  list: (entityType: string, query?: Record<string, any>) =>
    apiClient.get<any[]>(`/api/v1/configuration-entity/${entityType}`, query),

  // Get single configuration entity
  get: (entityType: string, id: string) =>
    apiClient.get<any>(`/api/v1/configuration-entity/${entityType}/${id}`),

  // Create configuration entity
  create: (entityType: string, data: Record<string, any>) =>
    apiClient.post<any>(`/api/v1/configuration-entity/${entityType}`, data),

  // Update configuration entity
  update: (entityType: string, id: string, data: Record<string, any>) =>
    apiClient.patch<any>(`/api/v1/configuration-entity/${entityType}/${id}`, data),

  // Delete/deactivate configuration entity
  delete: (entityType: string, id: string) =>
    apiClient.delete<any>(`/api/v1/configuration-entity/${entityType}/${id}`),

  // Get membership types by class ID
  getMembershipTypesByClass: (classId: string) =>
    apiClient.get<any[]>(`/api/v1/configuration-entity/membership-classes/${classId}/types`),

  // Get membership levels by type ID
  getMembershipLevelsByType: (typeId: string) =>
    apiClient.get<any[]>(`/api/v1/configuration-entity/membership-types/${typeId}/levels`),
};

// External Blocklist API (for URL/Domain filtering)
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
  // Inheritance metadata
  isInherited?: boolean;
  isDisabledHere?: boolean;
  canDisable?: boolean;
}

export const externalBlocklistApi = {
  // List patterns with filtering and inheritance support
  list: (query?: {
    scopeType?: 'tenant' | 'subsidiary' | 'talent';
    scopeId?: string;
    category?: string;
    includeInherited?: boolean;
    includeDisabled?: boolean;
    includeInactive?: boolean;
    page?: number;
    pageSize?: number;
    // Legacy params
    ownerType?: 'tenant' | 'subsidiary' | 'talent';
    ownerId?: string;
    isActive?: boolean;
  }) => {
    // Map legacy params to new params
    const params: Record<string, string> = {};
    if (query?.scopeType) params.scopeType = query.scopeType;
    else if (query?.ownerType) params.scopeType = query.ownerType;
    if (query?.scopeId) params.scopeId = query.scopeId;
    else if (query?.ownerId) params.scopeId = query.ownerId;
    if (query?.category) params.category = query.category;
    if (query?.includeInherited !== undefined)
      params.includeInherited = String(query.includeInherited);
    if (query?.includeDisabled !== undefined)
      params.includeDisabled = String(query.includeDisabled);
    if (query?.includeInactive !== undefined)
      params.includeInactive = String(query.includeInactive);
    if (query?.page) params.page = String(query.page);
    if (query?.pageSize) params.pageSize = String(query.pageSize);
    return apiClient.get<ExternalBlocklistPattern[]>('/api/v1/external-blocklist', params);
  },

  // Get patterns with inheritance for a specific scope
  getForScope: (scopeType: 'tenant' | 'subsidiary' | 'talent', scopeId: string) =>
    apiClient.get<ExternalBlocklistPattern[]>(
      `/api/v1/external-blocklist/scope/${scopeType}/${scopeId}`
    ),

  // Get patterns with inheritance for a talent (legacy)
  getForTalent: (talentId: string) =>
    apiClient.get<ExternalBlocklistPattern[]>(`/api/v1/external-blocklist/talent/${talentId}`),

  // Get single pattern
  get: (id: string) => apiClient.get<ExternalBlocklistPattern>(`/api/v1/external-blocklist/${id}`),

  // Create pattern
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

  // Update pattern
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
    }
  ) => apiClient.patch<ExternalBlocklistPattern>(`/api/v1/external-blocklist/${id}`, data),

  // Delete pattern
  delete: (id: string) => apiClient.delete<{ message: string }>(`/api/v1/external-blocklist/${id}`),

  // Disable inherited pattern in current scope
  disable: (id: string, scope: { scopeType?: string; scopeId?: string }) =>
    apiClient.post<{ id: string; disabled: boolean }>(
      `/api/v1/external-blocklist/${id}/disable`,
      scope
    ),

  // Enable previously disabled pattern in current scope
  enable: (id: string, scope: { scopeType?: string; scopeId?: string }) =>
    apiClient.post<{ id: string; enabled: boolean }>(
      `/api/v1/external-blocklist/${id}/enable`,
      scope
    ),

  // Batch toggle active status
  batchToggle: (ids: string[], isActive: boolean) =>
    apiClient.post<{ updated: number }>('/api/v1/external-blocklist/batch-toggle', {
      ids,
      isActive,
    }),
};

// Talent Domain API (for custom domain configuration)
export const talentDomainApi = {
  // Homepage domain (legacy - kept for backward compatibility)
  setHomepageDomain: (talentId: string, customDomain: string | null) =>
    apiClient.post<{ customDomain: string | null; token: string | null; txtRecord: string | null }>(
      `/api/v1/talents/${talentId}/homepage/domain`,
      { customDomain }
    ),
  verifyHomepageDomain: (talentId: string) =>
    apiClient.post<{ verified: boolean; message: string }>(
      `/api/v1/talents/${talentId}/homepage/verify-domain`,
      {}
    ),

  // Marshmallow domain (legacy - kept for backward compatibility)
  setMarshmallowDomain: (talentId: string, customDomain: string | null) =>
    apiClient.post<{ customDomain: string | null; token: string | null; txtRecord: string | null }>(
      `/api/v1/talents/${talentId}/marshmallow/config/domain`,
      { customDomain }
    ),
  verifyMarshmallowDomain: (talentId: string) =>
    apiClient.post<{ verified: boolean; message: string }>(
      `/api/v1/talents/${talentId}/marshmallow/config/verify-domain`,
      {}
    ),

  // Unified custom domain management
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
      {}
    ),

  updatePaths: (
    talentId: string,
    paths: { homepageCustomPath?: string; marshmallowCustomPath?: string }
  ) =>
    apiClient.patch<{
      homepageCustomPath: string | null;
      marshmallowCustomPath: string | null;
    }>(`/api/v1/talents/${talentId}/custom-domain/paths`, paths),

  updateSslMode: (talentId: string, sslMode: 'auto' | 'self_hosted' | 'cloudflare') =>
    apiClient.patch<{
      customDomainSslMode: string;
    }>(`/api/v1/talents/${talentId}/custom-domain/ssl-mode`, { sslMode }),
};

// Platform Config API (for AC tenant admin)
export const platformConfigApi = {
  // Get platform config
  get: (key: string) =>
    apiClient.get<{ key: string; value: any }>(`/api/v1/platform/config/${key}`),

  // Update platform config (AC only)
  set: (key: string, value: any) =>
    apiClient.put<{ key: string; value: any }>(`/api/v1/platform/config/${key}`, { value }),
};

// Marshmallow Export API
export interface MarshmallowExportJob {
  id: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  format: 'csv' | 'json' | 'xlsx';
  fileName: string | null;
  totalRecords: number;
  processedRecords: number;
  downloadUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
  completedAt: string | null;
}

export const marshmallowExportApi = {
  // Create export job
  create: (
    talentId: string,
    data: {
      format: 'csv' | 'json' | 'xlsx';
      status?: string[];
      startDate?: string;
      endDate?: string;
      includeRejected?: boolean;
    }
  ) =>
    apiClient.post<{ jobId: string; status: string }>(
      `/api/v1/talents/${talentId}/marshmallow/export`,
      data
    ),

  // Get job status
  get: (talentId: string, jobId: string) =>
    apiClient.get<MarshmallowExportJob>(`/api/v1/talents/${talentId}/marshmallow/export/${jobId}`),

  // Get download URL
  getDownloadUrl: (talentId: string, jobId: string) =>
    apiClient.get<{ url: string }>(
      `/api/v1/talents/${talentId}/marshmallow/export/${jobId}/download`
    ),
};

// Email Configuration API - for AC tenant to manage email settings
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
  // Get email configuration (masked)
  get: () => apiClient.get<EmailConfigResponse>('/api/v1/email/config'),

  // Save email configuration
  save: (config: SaveEmailConfigPayload) =>
    apiClient.put<EmailConfigResponse>('/api/v1/email/config', config),

  // Test connection
  testConnection: () => apiClient.post<EmailTestResult>('/api/v1/email/config/test-connection', {}),

  // Send test email
  test: (testEmail: string) =>
    apiClient.post<EmailTestResult>('/api/v1/email/config/test', { testEmail }),
};
