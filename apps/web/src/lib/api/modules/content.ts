/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { apiClient } from '../core';

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
  list: (talentId: string, page?: number, pageSize?: number) =>
    apiClient.get<{ items: any[]; meta: { total: number } }>('/api/v1/reports/mfr/jobs', {
      talentId,
      page: page || 1,
      pageSize: pageSize || 20,
    }),

  create: (data: ReportCreateData) =>
    apiClient.post<{ jobId: string; status: string; createdAt: string }>('/api/v1/reports/mfr/jobs', {
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
    }),

  search: (talentId: string, filters: ReportCreateData['filters'], previewLimit?: number) =>
    apiClient.post<any>('/api/v1/reports/mfr/search', {
      talentId,
      filters,
      previewLimit: previewLimit || 20,
    }),

  getStatus: (jobId: string, talentId: string) =>
    apiClient.get<any>(`/api/v1/reports/mfr/jobs/${jobId}`, { talent_id: talentId }),

  getDownloadUrl: (jobId: string, talentId: string) =>
    apiClient.get<{ downloadUrl: string }>(`/api/v1/reports/mfr/jobs/${jobId}/download`, {
      talent_id: talentId,
    }),

  cancel: (jobId: string, talentId: string) =>
    apiClient.delete<any>(`/api/v1/reports/mfr/jobs/${jobId}?talent_id=${talentId}`),
};

export const marshmallowApi = {
  getConfig: (talentId: string) =>
    apiClient.get<any>(`/api/v1/talents/${talentId}/marshmallow/config`),

  updateConfig: (talentId: string, config: any) =>
    apiClient.patch<any>(`/api/v1/talents/${talentId}/marshmallow/config`, config),

  uploadAvatar: async (talentId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = apiClient.getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/talents/${talentId}/marshmallow/avatar`,
      {
        method: 'POST',
        body: formData,
        headers,
      },
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

  approveMessage: (talentId: string, messageId: string) =>
    apiClient.post<any>(`/api/v1/talents/${talentId}/marshmallow/messages/${messageId}/approve`, {}),

  rejectMessage: (talentId: string, messageId: string, reason: string, note?: string) =>
    apiClient.post<any>(`/api/v1/talents/${talentId}/marshmallow/messages/${messageId}/reject`, {
      reason,
      note,
    }),

  unrejectMessage: (talentId: string, messageId: string) =>
    apiClient.post<any>(`/api/v1/talents/${talentId}/marshmallow/messages/${messageId}/unreject`, {}),

  updateMessage: (
    talentId: string,
    messageId: string,
    data: { isRead?: boolean; isStarred?: boolean; isPinned?: boolean },
  ) => apiClient.patch<any>(`/api/v1/talents/${talentId}/marshmallow/messages/${messageId}`, data),

  replyMessage: (talentId: string, messageId: string, content: string) =>
    apiClient.post<any>(`/api/v1/talents/${talentId}/marshmallow/messages/${messageId}/reply`, {
      content,
    }),

  batchAction: (
    talentId: string,
    action: 'approve' | 'reject' | 'delete',
    messageIds: string[],
    reason?: string,
  ) =>
    apiClient.post<any>(`/api/v1/talents/${talentId}/marshmallow/messages/batch`, {
      action,
      messageIds,
      reason,
    }),

  generateSsoToken: (talentId: string) =>
    apiClient.post<{ token: string; expiresIn: number; expiresAt: string }>(
      `/api/v1/talents/${talentId}/marshmallow/sso-token`,
      {},
    ),
};

export const homepageApi = {
  get: (talentId: string) => apiClient.get<any>(`/api/v1/talents/${talentId}/homepage`, { _t: Date.now() }),

  saveDraft: (talentId: string, draft: { content: any; theme?: any; settings?: any }) =>
    apiClient.put<any>(`/api/v1/talents/${talentId}/homepage/draft`, draft),

  publish: (talentId: string) => apiClient.post<any>(`/api/v1/talents/${talentId}/homepage/publish`, {}),

  unpublish: (talentId: string) =>
    apiClient.post<any>(`/api/v1/talents/${talentId}/homepage/unpublish`, {}),

  updateSettings: (talentId: string, settings: any) =>
    apiClient.patch<any>(`/api/v1/talents/${talentId}/homepage/settings`, settings),

  listVersions: (talentId: string, page?: number, pageSize?: number) =>
    apiClient.get<any>(`/api/v1/talents/${talentId}/homepage/versions`, { page, pageSize }),

  getVersion: (talentId: string, versionId: string) =>
    apiClient.get<any>(`/api/v1/talents/${talentId}/homepage/versions/${versionId}`),

  restoreVersion: (talentId: string, versionId: string) =>
    apiClient.post<any>(`/api/v1/talents/${talentId}/homepage/versions/${versionId}/restore`, {}),
};

export const publicApi = {
  getHomepage: (talentPath: string) => apiClient.get<any>(`/api/v1/public/homepage/${talentPath}`),

  getMarshmallowConfig: (talentPath: string) =>
    apiClient.get<any>(`/api/v1/public/marshmallow/${talentPath}/config`),

  submitMarshmallow: (
    talentPath: string,
    data: {
      content: string;
      senderName?: string;
      isAnonymous: boolean;
      turnstileToken?: string;
      fingerprint: string;
      honeypot?: string;
      socialLink?: string;
      selectedImageUrls?: string[];
    },
  ) => apiClient.post<any>(`/api/v1/public/marshmallow/${talentPath}/submit`, data),

  getPublicMessages: (
    talentPath: string,
    cursor?: string,
    limit?: number,
    fingerprint?: string,
    bustCache?: boolean,
  ) =>
    apiClient.get<any>(`/api/v1/public/marshmallow/${talentPath}/messages`, {
      cursor,
      limit: limit?.toString(),
      fingerprint,
      ...(bustCache ? { _t: Date.now().toString() } : {}),
    }),

  markMarshmallowRead: (talentPath: string, messageId: string, fingerprint: string) =>
    apiClient.post<{ success: boolean; isRead: boolean }>(
      `/api/v1/public/marshmallow/${talentPath}/messages/${messageId}/mark-read`,
      { fingerprint },
    ),

  validateSsoToken: (token: string) =>
    apiClient.post<{
      valid: boolean;
      user: { id: string; displayName: string; email: string; talentId: string } | null;
    }>('/api/v1/public/marshmallow/validate-sso', { token }),

  markMarshmallowReadAuth: (talentPath: string, messageId: string, ssoToken: string) =>
    apiClient.post<{ success: boolean; isRead: boolean }>(
      `/api/v1/public/marshmallow/${talentPath}/messages/${messageId}/mark-read-auth`,
      { ssoToken },
    ),

  replyMarshmallowAuth: (
    talentPath: string,
    messageId: string,
    content: string,
    ssoToken: string,
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
      { url },
    ),
};

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
  create: (
    talentId: string,
    data: {
      format: 'csv' | 'json' | 'xlsx';
      status?: string[];
      startDate?: string;
      endDate?: string;
      includeRejected?: boolean;
    },
  ) =>
    apiClient.post<{ jobId: string; status: string }>(
      `/api/v1/talents/${talentId}/marshmallow/export`,
      data,
    ),

  get: (talentId: string, jobId: string) =>
    apiClient.get<MarshmallowExportJob>(`/api/v1/talents/${talentId}/marshmallow/export/${jobId}`),

  getDownloadUrl: (talentId: string, jobId: string) =>
    apiClient.get<{ url: string }>(`/api/v1/talents/${talentId}/marshmallow/export/${jobId}/download`),
};
