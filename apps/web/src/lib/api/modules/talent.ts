/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { apiClient } from '../core';

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
    },
  ) => apiClient.patch<any>(`/api/v1/talents/${id}`, data),

  move: (id: string, data: { newSubsidiaryId?: string | null; version: number }) =>
    apiClient.post<any>(`/api/v1/talents/${id}/move`, data),

  deactivate: (id: string, version: number) =>
    apiClient.post<any>(`/api/v1/talents/${id}/deactivate`, { version }),

  reactivate: (id: string, version: number) =>
    apiClient.post<any>(`/api/v1/talents/${id}/reactivate`, { version }),
};
