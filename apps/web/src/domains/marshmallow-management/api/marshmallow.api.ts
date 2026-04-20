export type CaptchaMode = 'always' | 'never' | 'auto';
export type MarshmallowMessageStatus = 'pending' | 'approved' | 'rejected' | 'spam';
export type MarshmallowExportFormat = 'csv' | 'json' | 'xlsx';

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
  captchaMode: CaptchaMode;
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

export interface UpdateMarshmallowConfigInput {
  isEnabled: boolean;
  title?: string;
  welcomeText?: string;
  placeholderText?: string;
  thankYouText?: string;
  allowAnonymous: boolean;
  captchaMode: CaptchaMode;
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
  version: number;
}

export interface MarshmallowMessageListItem {
  id: string;
  content: string;
  senderName: string | null;
  isAnonymous: boolean;
  status: MarshmallowMessageStatus;
  rejectionReason: string | null;
  isRead: boolean;
  isStarred: boolean;
  isPinned: boolean;
  replyContent: string | null;
  repliedAt: string | null;
  repliedBy: {
    id: string;
    username: string;
  } | null;
  reactionCounts: Record<string, number>;
  profanityFlags: string[];
  imageUrl: string | null;
  imageUrls: string[];
  socialLink: string | null;
  createdAt: string;
}

export interface MarshmallowMessageListResponse {
  items: MarshmallowMessageListItem[];
  meta: {
    total: number;
    stats: {
      pendingCount: number;
      approvedCount: number;
      rejectedCount: number;
      unreadCount: number;
    };
  };
}

export interface MarshmallowModerationResponse {
  id: string;
  status: MarshmallowMessageStatus;
  moderatedAt: string | null;
}

export interface MarshmallowMessageUpdateResponse {
  id: string;
  isRead: boolean;
  isStarred: boolean;
  isPinned: boolean;
}

export interface MarshmallowExportCreateResponse {
  jobId: string;
  status: string;
}

export interface MarshmallowExportJobResponse {
  id: string;
  status: string;
  format: MarshmallowExportFormat;
  fileName: string | null;
  totalRecords: number;
  processedRecords: number;
  downloadUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface MarshmallowExportDownloadResponse {
  url: string;
}

interface ListMessagesOptions {
  page?: number;
  pageSize?: number;
  status?: MarshmallowMessageStatus;
  keyword?: string;
  hasReply?: boolean;
}

interface CreateExportOptions {
  format: MarshmallowExportFormat;
  status?: MarshmallowMessageStatus[];
  includeRejected?: boolean;
}

type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

function buildQueryString(input: Record<string, string | number | boolean | null | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function readMarshmallowConfig(request: RequestFn, talentId: string) {
  return request<MarshmallowConfigResponse>(`/api/v1/talents/${talentId}/marshmallow/config`);
}

export function updateMarshmallowConfig(
  request: RequestFn,
  talentId: string,
  input: UpdateMarshmallowConfigInput,
) {
  return request<MarshmallowConfigResponse>(`/api/v1/talents/${talentId}/marshmallow/config`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export function listMarshmallowMessages(
  request: RequestFn,
  talentId: string,
  options: ListMessagesOptions = {},
) {
  const query = buildQueryString({
    page: options.page ?? 1,
    pageSize: options.pageSize ?? 20,
    status: options.status,
    keyword: options.keyword,
    hasReply: options.hasReply,
  });

  return request<MarshmallowMessageListResponse>(`/api/v1/talents/${talentId}/marshmallow/messages${query}`);
}

export function approveMarshmallowMessage(request: RequestFn, talentId: string, messageId: string) {
  return request<MarshmallowModerationResponse>(
    `/api/v1/talents/${talentId}/marshmallow/messages/${messageId}/approve`,
    {
      method: 'POST',
    },
  );
}

export function rejectMarshmallowMessage(request: RequestFn, talentId: string, messageId: string) {
  return request<MarshmallowModerationResponse>(
    `/api/v1/talents/${talentId}/marshmallow/messages/${messageId}/reject`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'manual',
      }),
    },
  );
}

export function unrejectMarshmallowMessage(request: RequestFn, talentId: string, messageId: string) {
  return request<MarshmallowModerationResponse>(
    `/api/v1/talents/${talentId}/marshmallow/messages/${messageId}/unreject`,
    {
      method: 'POST',
    },
  );
}

export function updateMarshmallowMessage(
  request: RequestFn,
  talentId: string,
  messageId: string,
  input: {
    isRead?: boolean;
    isStarred?: boolean;
    isPinned?: boolean;
  },
) {
  return request<MarshmallowMessageUpdateResponse>(
    `/api/v1/talents/${talentId}/marshmallow/messages/${messageId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  );
}

export function createMarshmallowExport(
  request: RequestFn,
  talentId: string,
  options: CreateExportOptions,
) {
  return request<MarshmallowExportCreateResponse>(`/api/v1/talents/${talentId}/marshmallow/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      format: options.format,
      status: options.status,
      includeRejected: options.includeRejected,
    }),
  });
}

export function readMarshmallowExportJob(request: RequestFn, talentId: string, jobId: string) {
  return request<MarshmallowExportJobResponse>(`/api/v1/talents/${talentId}/marshmallow/export/${jobId}`);
}

export function downloadMarshmallowExport(request: RequestFn, talentId: string, jobId: string) {
  return request<MarshmallowExportDownloadResponse>(
    `/api/v1/talents/${talentId}/marshmallow/export/${jobId}/download`,
  );
}
