/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { apiClient } from '../core';

export interface OrganizationTreeResponse {
  tenantId: string;
  subsidiaries: Array<{
    id: string;
    code: string;
    displayName: string;
    parentId?: string | null;
    path: string;
    talents: Array<{
      id: string;
      code: string;
      displayName: string;
      avatarUrl?: string;
      subsidiaryId?: string | null;
      subsidiaryName?: string;
      path: string;
    }>;
    children: any[];
  }>;
  directTalents: Array<{
    id: string;
    code: string;
    displayName: string;
    avatarUrl?: string;
    subsidiaryId?: string | null;
    path: string;
  }>;
}

export const organizationApi = {
  getTree: (params?: { search?: string; includeInactive?: boolean }) =>
    apiClient.get<OrganizationTreeResponse>('/api/v1/organization/tree', params),

  getSubsidiaries: () => apiClient.get<any[]>('/api/v1/organization/subsidiaries'),

  getSubsidiary: (id: string) => apiClient.get<any>(`/api/v1/organization/subsidiaries/${id}`),

  createSubsidiary: (data: { code: string; displayName: string; parentId?: string }) =>
    apiClient.post<any>('/api/v1/organization/subsidiaries', data),

  updateSubsidiary: (id: string, data: { displayName?: string }) =>
    apiClient.patch<any>(`/api/v1/organization/subsidiaries/${id}`, data),

  getTalents: (subsidiaryId?: string) =>
    apiClient.get<any[]>('/api/v1/talents', subsidiaryId ? { subsidiaryId } : undefined),

  getTalent: (id: string) => apiClient.get<any>(`/api/v1/talents/${id}`),

  createTalent: (data: {
    code: string;
    displayName: string;
    nameEn: string;
    profileStoreId: string;
    subsidiaryId?: string;
    nameZh?: string;
    nameJa?: string;
    descriptionEn?: string;
    descriptionZh?: string;
    descriptionJa?: string;
    avatarUrl?: string;
    homepagePath?: string;
    timezone?: string;
    settings?: Record<string, unknown>;
  }) => apiClient.post<any>('/api/v1/talents', data),

  updateTalent: (
    id: string,
    data: {
      displayName?: string;
      avatarUrl?: string;
      nameEn?: string;
      nameZh?: string;
      nameJa?: string;
      descriptionEn?: string;
      descriptionZh?: string;
      descriptionJa?: string;
      homepagePath?: string;
      timezone?: string;
      settings?: Record<string, unknown>;
      version: number;
    }
  ) => apiClient.patch<any>(`/api/v1/talents/${id}`, data),
};
