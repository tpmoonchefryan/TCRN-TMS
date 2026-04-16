// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { apiClient } from '../core';

export type TalentLifecycleStatus = 'draft' | 'published' | 'disabled';

export interface TalentSettingsPayload {
  inheritTimezone?: boolean | null;
  homepageEnabled?: boolean | null;
  marshmallowEnabled?: boolean | null;
  [key: string]: unknown;
}

export interface TalentProfileStoreSummary {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  isDefault: boolean;
  piiProxyUrl: string | null;
}

export interface TalentExternalPageDomainConfig {
  isPublished?: boolean;
  isEnabled?: boolean;
  path?: string | null;
  customDomain: string | null;
  customDomainVerified: boolean;
  customDomainVerificationToken: string | null;
}

export interface TalentExternalPagesDomain {
  homepage: TalentExternalPageDomainConfig | null;
  marshmallow: TalentExternalPageDomainConfig | null;
}

export interface TalentStatsSummary {
  customerCount: number;
  pendingMessagesCount: number;
}

export interface TalentLifecycleIssue {
  code: string;
  message: string;
}

export interface TalentPublishReadiness {
  id: string;
  lifecycleStatus: TalentLifecycleStatus;
  targetState: 'published';
  recommendedAction: 'publish' | 're-enable' | null;
  canEnterPublishedState: boolean;
  blockers: TalentLifecycleIssue[];
  warnings: TalentLifecycleIssue[];
  version: number;
}

export interface TalentListItem {
  id: string;
  subsidiaryId: string | null;
  code: string;
  path: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  name: string;
  displayName: string;
  avatarUrl: string | null;
  homepagePath: string | null;
  timezone: string;
  lifecycleStatus: TalentLifecycleStatus;
  publishedAt: string | null;
  publishedBy: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CreateTalentPayload {
  code: string;
  nameEn: string;
  displayName: string;
  profileStoreId: string;
  subsidiaryId?: string | null;
  nameZh?: string;
  nameJa?: string;
  descriptionEn?: string;
  descriptionZh?: string;
  descriptionJa?: string;
  avatarUrl?: string;
  homepagePath?: string;
  timezone?: string;
  settings?: TalentSettingsPayload;
}

export interface TalentCreateResponse {
  id: string;
  subsidiaryId: string | null;
  code: string;
  path: string;
  nameEn: string;
  name: string;
  displayName: string;
  avatarUrl: string | null;
  homepagePath: string | null;
  timezone: string;
  lifecycleStatus: TalentLifecycleStatus;
  publishedAt: string | null;
  publishedBy: string | null;
  isActive: boolean;
  createdAt: string;
  version: number;
}

export interface TalentGetResponse {
  id: string;
  subsidiaryId: string | null;
  profileStoreId: string | null;
  profileStore: TalentProfileStoreSummary | null;
  code: string;
  path: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  name: string;
  displayName: string;
  descriptionEn: string | null;
  descriptionZh: string | null;
  descriptionJa: string | null;
  avatarUrl: string | null;
  homepagePath: string | null;
  timezone: string;
  lifecycleStatus: TalentLifecycleStatus;
  publishedAt: string | null;
  publishedBy: string | null;
  isActive: boolean;
  settings: TalentSettingsPayload | null;
  stats: TalentStatsSummary;
  externalPagesDomain: TalentExternalPagesDomain;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface UpdateTalentPayload {
  nameEn?: string;
  nameZh?: string;
  nameJa?: string;
  displayName?: string;
  descriptionEn?: string;
  descriptionZh?: string;
  descriptionJa?: string;
  avatarUrl?: string;
  homepagePath?: string;
  timezone?: string;
  settings?: TalentSettingsPayload;
  version: number;
}

export interface TalentUpdateResponse {
  id: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  name: string;
  displayName: string;
  homepagePath: string | null;
  lifecycleStatus: TalentLifecycleStatus;
  publishedAt: string | null;
  publishedBy: string | null;
  isActive: boolean;
  updatedAt: string;
  version: number;
}

export interface TalentLifecycleMutationPayload {
  version: number;
}

export interface TalentActivationResponse {
  id: string;
  lifecycleStatus: TalentLifecycleStatus;
  publishedAt: string | null;
  publishedBy: string | null;
  isActive: boolean;
  version: number;
}

export interface TalentDeleteResponse {
  id: string;
  deleted: true;
}

export const talentApi = {
  list: (subsidiaryId?: string) =>
    apiClient.get<TalentListItem[]>(
      '/api/v1/talents',
      subsidiaryId ? { subsidiaryId } : undefined
    ),

  get: (id: string) => apiClient.get<TalentGetResponse>(`/api/v1/talents/${id}`),

  create: (data: CreateTalentPayload) => apiClient.post<TalentCreateResponse>('/api/v1/talents', data),

  update: (id: string, data: UpdateTalentPayload) =>
    apiClient.patch<TalentUpdateResponse>(`/api/v1/talents/${id}`, data),

  delete: (id: string, version: number) =>
    apiClient.delete<TalentDeleteResponse>(`/api/v1/talents/${id}?version=${version}`),

  getPublishReadiness: (id: string) =>
    apiClient.get<TalentPublishReadiness>(`/api/v1/talents/${id}/publish-readiness`),

  publish: (id: string, data: TalentLifecycleMutationPayload) =>
    apiClient.post<TalentActivationResponse>(`/api/v1/talents/${id}/publish`, data),

  disable: (id: string, data: TalentLifecycleMutationPayload) =>
    apiClient.post<TalentActivationResponse>(`/api/v1/talents/${id}/disable`, data),

  reEnable: (id: string, data: TalentLifecycleMutationPayload) =>
    apiClient.post<TalentActivationResponse>(`/api/v1/talents/${id}/re-enable`, data),
};
