// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type {
  HomepageContent,
  MarshmallowBatchAction,
  MarshmallowMessageStatus as SharedMessageStatus,
  MarshmallowRejectionReason as SharedRejectionReason,
  ReportJobStatus as SharedReportJobStatus,
  ThemeConfig,
  UpdateHomepageSettingsInput,
} from '@tcrn/shared';

import { apiClient, buildApiUrl } from '../core';

export type ReportFormat = 'xlsx' | 'csv';

export interface ReportFilters {
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
}

export interface ReportCreateData {
  talentId: string;
  filters: ReportFilters;
  format?: ReportFormat;
}

export interface ReportJobListItemRecord {
  id: string;
  reportType: string;
  status: SharedReportJobStatus;
  totalRows: number | null;
  fileName: string | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
}

export interface ReportJobListPayload {
  items: ReportJobListItemRecord[];
  meta: {
    total: number;
  };
}

export interface ReportJobCreateResponse {
  jobId: string;
  status: SharedReportJobStatus;
  estimatedRows: number;
  createdAt: string;
}

export interface ReportJobStatusResponse {
  id: string;
  reportType: string;
  status: SharedReportJobStatus;
  progress: {
    totalRows: number | null;
    processedRows: number;
    percentage: number;
  };
  error?: {
    code: string;
    message: string;
  };
  fileName: string | null;
  fileSizeBytes: number | null;
  queuedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    username: string;
  };
}

export interface MfrPreviewRow {
  nickname: string | null;
  platformName: string;
  membershipLevelName: string;
  validFrom: string;
  validTo: string | null;
  statusName: string;
}

export interface ReportSearchResult {
  totalCount: number;
  preview: MfrPreviewRow[];
  filterSummary: {
    platforms: string[];
    dateRange: string | null;
    includeExpired: boolean;
  };
}

export interface ReportDownloadResponse {
  downloadUrl: string;
  expiresIn: number;
  fileName: string | null;
}

export interface ReportCancelResponse {
  id: string;
  status: SharedReportJobStatus;
}

export interface MarshmallowConfigStats {
  totalMessages: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  unreadCount: number;
}

export interface MarshmallowConfigResponse {
  id: string;
  talentId: string;
  isEnabled: boolean;
  title: string | null;
  welcomeText: string | null;
  placeholderText: string | null;
  thankYouText: string | null;
  allowAnonymous: boolean;
  captchaMode: 'always' | 'never' | 'auto';
  moderationEnabled: boolean;
  autoApprove: boolean;
  profanityFilterEnabled: boolean;
  externalBlocklistEnabled: boolean;
  maxMessageLength: number;
  minMessageLength: number;
  rateLimitPerIp: number;
  rateLimitWindowHours: number;
  reactionsEnabled: boolean;
  allowedReactions: string[];
  theme: Record<string, unknown>;
  avatarUrl: string | null;
  termsContentEn: string | null;
  termsContentZh: string | null;
  termsContentJa: string | null;
  privacyContentEn: string | null;
  privacyContentZh: string | null;
  privacyContentJa: string | null;
  stats: MarshmallowConfigStats;
  marshmallowUrl: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface MarshmallowConfigUpdatePayload {
  isEnabled?: boolean;
  title?: string | null;
  welcomeText?: string | null;
  placeholderText?: string | null;
  thankYouText?: string | null;
  allowAnonymous?: boolean;
  captchaMode?: MarshmallowConfigResponse['captchaMode'];
  moderationEnabled?: boolean;
  autoApprove?: boolean;
  profanityFilterEnabled?: boolean;
  externalBlocklistEnabled?: boolean;
  maxMessageLength?: number;
  minMessageLength?: number;
  rateLimitPerIp?: number;
  rateLimitWindowHours?: number;
  reactionsEnabled?: boolean;
  allowedReactions?: string[];
  theme?: Record<string, unknown>;
  avatarUrl?: string | null;
  termsContentEn?: string | null;
  termsContentZh?: string | null;
  termsContentJa?: string | null;
  privacyContentEn?: string | null;
  privacyContentZh?: string | null;
  privacyContentJa?: string | null;
  version: number;
}

export interface MarshmallowMessageRecord {
  id: string;
  content: string;
  senderName: string | null;
  isAnonymous: boolean;
  status: SharedMessageStatus;
  rejectionReason: SharedRejectionReason | null;
  isRead: boolean;
  isStarred: boolean;
  isPinned: boolean;
  replyContent: string | null;
  repliedAt: string | null;
  repliedBy: { id: string; username: string } | null;
  reactionCounts: Record<string, number>;
  profanityFlags: string[];
  imageUrl?: string | null;
  imageUrls?: string[];
  socialLink?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface MarshmallowMessageStats {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  unreadCount: number;
}

export interface MarshmallowMessageListPayload {
  items: MarshmallowMessageRecord[];
  meta: {
    total: number;
    stats: MarshmallowMessageStats;
  };
}

export interface MarshmallowModerationResponse {
  id: string;
  status: SharedMessageStatus;
  moderatedAt?: string | null;
}

export interface MarshmallowMessageUpdateResponse {
  id: string;
  isRead: boolean;
  isStarred: boolean;
  isPinned: boolean;
}

export interface MarshmallowReplyResponse {
  id: string;
  replyContent: string | null;
  repliedAt?: string | null;
  repliedBy: { id: string; username: string };
}

export interface MarshmallowBatchActionResponse {
  processed: number;
  action: MarshmallowBatchAction;
}

export interface MarshmallowAvatarUploadResponse {
  url: string;
}

export type HomepageVersionStatus = 'draft' | 'published' | 'archived';

export interface HomepageVersionUser {
  id: string;
  username: string;
}

export interface HomepageSnapshotVersion {
  id: string;
  versionNumber: number;
  content: HomepageContent;
  theme: ThemeConfig;
  publishedAt: string | null;
  publishedBy: HomepageVersionUser | null;
  createdAt: string;
}

export interface HomepageVersionRecord extends HomepageSnapshotVersion {
  status: HomepageVersionStatus;
  createdBy: HomepageVersionUser | null;
}

export interface HomepageVersionListItem {
  id: string;
  versionNumber: number;
  status: HomepageVersionStatus;
  contentPreview: string;
  componentCount: number;
  publishedAt: string | null;
  publishedBy: HomepageVersionUser | null;
  createdAt: string;
  createdBy: HomepageVersionUser | null;
}

export interface HomepageVersionListPayload {
  items: HomepageVersionListItem[];
  meta: {
    total: number;
  };
}

export interface HomepageResponse {
  id: string;
  talentId: string;
  isPublished: boolean;
  publishedVersion: HomepageSnapshotVersion | null;
  draftVersion: HomepageSnapshotVersion | null;
  customDomain: string | null;
  customDomainVerified: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
  analyticsId: string | null;
  homepagePath: string | null;
  homepageUrl: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface HomepageDraftSavePayload {
  content: HomepageContent;
  theme?: ThemeConfig;
}

export interface HomepageDraftSaveResponse {
  draftVersion: {
    id: string;
    versionNumber: number;
    contentHash: string;
    updatedAt: string;
  };
  isNewVersion: boolean;
}

export interface HomepagePublishResponse {
  publishedVersion: {
    id: string;
    versionNumber: number;
    publishedAt: string;
  };
  homepageUrl: string;
  cdnPurgeStatus: 'success' | 'pending' | 'failed';
}

export interface HomepageUnpublishResponse {
  isPublished: boolean;
  unpublishedAt: string;
}

export type HomepageSettingsUpdatePayload = Omit<UpdateHomepageSettingsInput, 'version'> & {
  version: number;
};

export type HomepageEditableSettings = Pick<
  HomepageResponse,
  'homepagePath' | 'seoTitle' | 'seoDescription' | 'ogImageUrl' | 'analyticsId'
>;

export interface HomepageRestoreVersionResponse {
  newDraftVersion: {
    id: string;
    versionNumber: number;
  };
  restoredFrom: {
    id: string;
    versionNumber: number;
  };
}

export interface PublicHomepageTalent {
  displayName: string;
  avatarUrl: string | null;
  timezone?: string | null;
}

export interface PublicHomepageResponse {
  talent: PublicHomepageTalent;
  content: HomepageContent;
  theme: ThemeConfig;
  seo: {
    title: string | null;
    description: string | null;
    ogImageUrl: string | null;
  };
  updatedAt: string;
}

export interface PublicMarshmallowLocalizedContent {
  en: string | null;
  zh: string | null;
  ja: string | null;
}

export interface PublicMarshmallowTalent {
  displayName: string;
  avatarUrl: string | null;
}

export interface PublicMarshmallowConfigResponse {
  talent: PublicMarshmallowTalent;
  title: string | null;
  welcomeText: string | null;
  placeholderText: string | null;
  allowAnonymous: boolean;
  maxMessageLength: number;
  minMessageLength: number;
  reactionsEnabled: boolean;
  allowedReactions: string[];
  theme: Record<string, unknown>;
  terms: PublicMarshmallowLocalizedContent;
  privacy: PublicMarshmallowLocalizedContent;
}

export interface PublicMarshmallowSubmitPayload {
  content: string;
  senderName?: string;
  isAnonymous: boolean;
  turnstileToken?: string;
  fingerprint: string;
  honeypot?: string;
  socialLink?: string;
  selectedImageUrls?: string[];
}

export interface PublicMarshmallowSubmitResponse {
  id: string;
  status: SharedMessageStatus;
  message: string;
}

export interface PublicMarshmallowReplyUser {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  email?: string | null;
}

export interface PublicMarshmallowMessageRecord {
  id: string;
  content: string;
  senderName: string | null;
  isAnonymous: boolean;
  isRead: boolean;
  replyContent: string | null;
  repliedAt: string | null;
  repliedBy: PublicMarshmallowReplyUser | null;
  reactionCounts: Record<string, number>;
  userReactions: string[];
  createdAt: string;
  imageUrl?: string | null;
  imageUrls?: string[];
}

export interface PublicMarshmallowMessagesResponse {
  messages: PublicMarshmallowMessageRecord[];
  cursor: string | null;
  hasMore: boolean;
}

export interface PublicMarshmallowReadResponse {
  success: boolean;
  isRead?: boolean;
  error?: string;
}

export interface PublicMarshmallowSsoUser {
  id: string;
  displayName: string;
  email: string;
  talentId: string;
}

export interface PublicMarshmallowValidateSsoResponse {
  valid: boolean;
  user: PublicMarshmallowSsoUser | null;
}

export interface PublicMarshmallowReplyResponse {
  success: boolean;
  replyContent?: string;
  repliedAt?: string;
  repliedBy?: { id: string; displayName: string };
  error?: string;
}

export interface PublicMarshmallowPreviewImageResponse {
  images: string[];
  error?: string;
}

export interface PublicMarshmallowReactionResponse {
  added: boolean;
  counts: Record<string, number>;
}

export const reportApi = {
  list: (talentId: string, page?: number, pageSize?: number) =>
    apiClient.get<ReportJobListPayload>('/api/v1/reports/mfr/jobs', {
      talentId,
      page: page || 1,
      pageSize: pageSize || 20,
    }),

  create: (data: ReportCreateData) =>
    apiClient.post<ReportJobCreateResponse>('/api/v1/reports/mfr/jobs', {
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

  search: (talentId: string, filters: ReportFilters, previewLimit?: number) =>
    apiClient.post<ReportSearchResult>('/api/v1/reports/mfr/search', {
      talentId,
      filters,
      previewLimit: previewLimit || 20,
    }),

  getStatus: (jobId: string, talentId: string) =>
    apiClient.get<ReportJobStatusResponse>(`/api/v1/reports/mfr/jobs/${jobId}`, { talent_id: talentId }),

  getDownloadUrl: (jobId: string, talentId: string) =>
    apiClient.get<ReportDownloadResponse>(`/api/v1/reports/mfr/jobs/${jobId}/download`, {
      talent_id: talentId,
    }),

  cancel: (jobId: string, talentId: string) =>
    apiClient.delete<ReportCancelResponse>(`/api/v1/reports/mfr/jobs/${jobId}?talent_id=${talentId}`),
};

export const marshmallowApi = {
  getConfig: (talentId: string) =>
    apiClient.get<MarshmallowConfigResponse>(`/api/v1/talents/${talentId}/marshmallow/config`),

  updateConfig: (talentId: string, config: MarshmallowConfigUpdatePayload) =>
    apiClient.patch<MarshmallowConfigResponse>(`/api/v1/talents/${talentId}/marshmallow/config`, config),

  uploadAvatar: async (talentId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = apiClient.getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      buildApiUrl(`/api/v1/talents/${talentId}/marshmallow/avatar`),
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
    return result.data as MarshmallowAvatarUploadResponse;
  },

  getMessages: (talentId: string, status?: SharedMessageStatus, pageSize: number = 100) =>
    apiClient.get<MarshmallowMessageListPayload>(`/api/v1/talents/${talentId}/marshmallow/messages`, {
      ...(status ? { status } : {}),
      pageSize,
    }),

  approveMessage: (talentId: string, messageId: string) =>
    apiClient.post<MarshmallowModerationResponse>(
      `/api/v1/talents/${talentId}/marshmallow/messages/${messageId}/approve`,
      {},
    ),

  rejectMessage: (talentId: string, messageId: string, reason: SharedRejectionReason, note?: string) =>
    apiClient.post<MarshmallowModerationResponse>(
      `/api/v1/talents/${talentId}/marshmallow/messages/${messageId}/reject`,
      {
        reason,
        note,
      },
    ),

  unrejectMessage: (talentId: string, messageId: string) =>
    apiClient.post<MarshmallowModerationResponse>(
      `/api/v1/talents/${talentId}/marshmallow/messages/${messageId}/unreject`,
      {},
    ),

  updateMessage: (
    talentId: string,
    messageId: string,
    data: { isRead?: boolean; isStarred?: boolean; isPinned?: boolean },
  ) =>
    apiClient.patch<MarshmallowMessageUpdateResponse>(
      `/api/v1/talents/${talentId}/marshmallow/messages/${messageId}`,
      data,
    ),

  replyMessage: (talentId: string, messageId: string, content: string) =>
    apiClient.post<MarshmallowReplyResponse>(
      `/api/v1/talents/${talentId}/marshmallow/messages/${messageId}/reply`,
      {
        content,
      },
    ),

  batchAction: (
    talentId: string,
    action: MarshmallowBatchAction,
    messageIds: string[],
    reason?: SharedRejectionReason,
  ) =>
    apiClient.post<MarshmallowBatchActionResponse>(`/api/v1/talents/${talentId}/marshmallow/messages/batch`, {
      action,
      messageIds,
      rejectionReason: reason,
    }),

  generateSsoToken: (talentId: string) =>
    apiClient.post<{ token: string; expiresIn: number; expiresAt: string }>(
      `/api/v1/talents/${talentId}/marshmallow/sso-token`,
      {},
    ),
};

export const homepageApi = {
  get: (talentId: string) =>
    apiClient.get<HomepageResponse>(`/api/v1/talents/${talentId}/homepage`, { _t: Date.now() }),

  saveDraft: (talentId: string, draft: HomepageDraftSavePayload) =>
    apiClient.put<HomepageDraftSaveResponse>(`/api/v1/talents/${talentId}/homepage/draft`, draft),

  publish: (talentId: string) =>
    apiClient.post<HomepagePublishResponse>(`/api/v1/talents/${talentId}/homepage/publish`, {}),

  unpublish: (talentId: string) =>
    apiClient.post<HomepageUnpublishResponse>(`/api/v1/talents/${talentId}/homepage/unpublish`, {}),

  updateSettings: (talentId: string, settings: HomepageSettingsUpdatePayload) =>
    apiClient.patch<HomepageResponse>(`/api/v1/talents/${talentId}/homepage/settings`, settings),

  listVersions: (talentId: string, page?: number, pageSize?: number) =>
    apiClient.get<HomepageVersionListPayload>(`/api/v1/talents/${talentId}/homepage/versions`, { page, pageSize }),

  getVersion: (talentId: string, versionId: string) =>
    apiClient.get<HomepageVersionRecord>(`/api/v1/talents/${talentId}/homepage/versions/${versionId}`),

  restoreVersion: (talentId: string, versionId: string) =>
    apiClient.post<HomepageRestoreVersionResponse>(
      `/api/v1/talents/${talentId}/homepage/versions/${versionId}/restore`,
      {},
    ),
};

export const publicApi = {
  getHomepage: (talentPath: string) =>
    apiClient.get<PublicHomepageResponse>(`/api/v1/public/homepage/${talentPath}`),

  getMarshmallowConfig: (talentPath: string) =>
    apiClient.get<PublicMarshmallowConfigResponse>(`/api/v1/public/marshmallow/${talentPath}/config`),

  submitMarshmallow: (
    talentPath: string,
    data: PublicMarshmallowSubmitPayload,
  ) => apiClient.post<PublicMarshmallowSubmitResponse>(`/api/v1/public/marshmallow/${talentPath}/submit`, data),

  getPublicMessages: (
    talentPath: string,
    cursor?: string,
    limit?: number,
    fingerprint?: string,
    bustCache?: boolean,
  ) =>
    apiClient.get<PublicMarshmallowMessagesResponse>(`/api/v1/public/marshmallow/${talentPath}/messages`, {
      cursor,
      limit: limit?.toString(),
      fingerprint,
      ...(bustCache ? { _t: Date.now().toString() } : {}),
    }),

  markMarshmallowRead: (talentPath: string, messageId: string, fingerprint: string) =>
    apiClient.post<PublicMarshmallowReadResponse>(
      `/api/v1/public/marshmallow/${talentPath}/messages/${messageId}/mark-read`,
      { fingerprint },
    ),

  validateSsoToken: (token: string) =>
    apiClient.post<PublicMarshmallowValidateSsoResponse>('/api/v1/public/marshmallow/validate-sso', { token }),

  markMarshmallowReadAuth: (talentPath: string, messageId: string, ssoToken: string) =>
    apiClient.post<PublicMarshmallowReadResponse>(
      `/api/v1/public/marshmallow/${talentPath}/messages/${messageId}/mark-read-auth`,
      { ssoToken },
    ),

  replyMarshmallowAuth: (
    talentPath: string,
    messageId: string,
    content: string,
    ssoToken: string,
  ) =>
    apiClient.post<PublicMarshmallowReplyResponse>(
      `/api/v1/public/marshmallow/${talentPath}/messages/${messageId}/reply-auth`,
      {
        ssoToken,
        content,
      },
    ),

  toggleMarshmallowReaction: (messageId: string, reaction: string, fingerprint: string) =>
    apiClient.post<PublicMarshmallowReactionResponse>(`/api/v1/public/marshmallow/messages/${messageId}/react`, {
      reaction,
      fingerprint,
    }),

  previewMarshmallowImage: (url: string) =>
    apiClient.post<PublicMarshmallowPreviewImageResponse>('/api/v1/public/marshmallow/preview-image', {
      url,
    }),
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
