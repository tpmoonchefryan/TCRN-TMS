// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { apiClient } from '../core';

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
  updatedAt: string;
  version: number;
}

export interface MoveTalentPayload {
  newSubsidiaryId?: string | null;
  version: number;
}

export interface TalentMoveResponse {
  id: string;
  subsidiaryId: string | null;
  path: string;
  version: number;
}

export interface TalentActivationResponse {
  id: string;
  isActive: boolean;
  version: number;
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

  move: (id: string, data: MoveTalentPayload) =>
    apiClient.post<TalentMoveResponse>(`/api/v1/talents/${id}/move`, data),

  deactivate: (id: string, version: number) =>
    apiClient.post<TalentActivationResponse>(`/api/v1/talents/${id}/deactivate`, { version }),

  reactivate: (id: string, version: number) =>
    apiClient.post<TalentActivationResponse>(`/api/v1/talents/${id}/reactivate`, { version }),
};
