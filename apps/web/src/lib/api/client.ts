import { apiClient } from './core';

/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

export type { ApiError, ApiResponse } from './core';
export { apiClient, registerAuthClientHooks } from './core';
export { authApi, userApi } from './modules/auth';
export * from './modules/configuration';
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
