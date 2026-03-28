/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { apiClient } from '../core';

export interface CustomerListParams {
  talentId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  tags?: string;
  statusId?: string;
  profileType?: 'individual' | 'company';
  isActive?: boolean;
}

export interface AddressData {
  typeCode: string;
  countryCode: string;
  province?: string;
  city?: string;
  district?: string;
  street?: string;
  postalCode?: string;
  isPrimary?: boolean;
}

export interface PiiUpdateData {
  givenName?: string;
  familyName?: string;
  phoneNumbers?: Array<{ typeCode: string; number: string; isPrimary?: boolean }>;
  emails?: Array<{ typeCode: string; address: string; isPrimary?: boolean }>;
  addresses?: AddressData[];
}

export interface PiiAccessTokenData {
  accessToken: string;
  piiProfileId: string;
  piiServiceUrl: string;
  expiresIn: number;
}

export interface CustomerCreateData {
  talentId: string;
  profileStoreId: string;
  profileType: 'individual' | 'company';
  nickname: string;
  primaryLanguage?: string;
  statusCode?: string;
  tags?: string[];
  source?: string;
  notes?: string;
  pii?: PiiUpdateData;
}

export interface CustomerUpdateData {
  nickname?: string;
  tags?: string[];
  notes?: string;
  expectedVersion: number;
}

export interface CustomerStatusSummary {
  id: string;
  code: string;
  name: string;
  color: string | null;
}

export interface CustomerMembershipSummary {
  highestLevel: {
    platformCode: string;
    platformName: string;
    levelCode: string;
    levelName: string;
    color: string | null;
  };
  activeCount: number;
  totalCount: number;
}

export interface CustomerListItemResponse {
  id: string;
  profileType: 'individual' | 'company';
  nickname: string;
  primaryLanguage: string | null;
  status: CustomerStatusSummary | null;
  tags: string[];
  isActive: boolean;
  companyShortName: string | null;
  membershipSummary: CustomerMembershipSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerTalentSummary {
  id: string;
  code: string;
  displayName: string;
}

export interface CustomerProfileStoreSummary {
  id: string;
  code: string;
  name: string;
}

export interface CustomerInactivationReasonSummary {
  id: string;
  code: string;
  name: string;
}

export interface CustomerRecentAccessLogEntry {
  talent: {
    id: string;
    displayName: string;
  };
  action: string;
  operator: {
    id: string;
    username: string;
  } | null;
  occurredAt: string;
}

export interface CustomerIndividualDetailData {
  rmProfileId: string;
  piiLoaded: boolean;
}

export interface CustomerCompanyBusinessSegment {
  id: string;
  code: string;
  name: string;
}

export interface CustomerCompanyDetailData {
  companyLegalName: string;
  companyShortName: string | null;
  registrationNumber: string | null;
  vatId: string | null;
  establishmentDate: string | null;
  website: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactDepartment: string | null;
  businessSegment: CustomerCompanyBusinessSegment | null;
}

export interface CustomerDetailBase {
  id: string;
  profileType: 'individual' | 'company';
  talentId: string;
  nickname: string;
  primaryLanguage: string | null;
  status: CustomerStatusSummary | null;
  inactivationReason: CustomerInactivationReasonSummary | null;
  tags: string[];
  source: string | null;
  notes: string | null;
  isActive: boolean;
  inactivatedAt: string | null;
  profileStore: CustomerProfileStoreSummary;
  originTalent: CustomerTalentSummary;
  lastModifiedTalent: CustomerTalentSummary | null;
  membershipSummary: CustomerMembershipSummary | null;
  platformIdentityCount: number;
  recentAccessHistory: CustomerRecentAccessLogEntry[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CustomerIndividualDetailResponse extends CustomerDetailBase {
  profileType: 'individual';
  individual: CustomerIndividualDetailData;
  company?: never;
}

export interface CustomerCompanyDetailResponse extends CustomerDetailBase {
  profileType: 'company';
  company: CustomerCompanyDetailData;
  individual?: never;
}

export type CustomerDetailResponse =
  | CustomerIndividualDetailResponse
  | CustomerCompanyDetailResponse;

export interface CustomerPlatformIdentity {
  id: string;
  platform: {
    id: string;
    code: string;
    name: string;
    iconUrl?: string | null;
    color?: string | null;
  };
  platformUid: string;
  platformNickname: string | null;
  platformAvatarUrl: string | null;
  profileUrl: string | null;
  isVerified: boolean;
  isCurrent: boolean;
  capturedAt: string;
  updatedAt: string;
}

export interface CustomerPlatformIdentityHistoryItem {
  id: string;
  identityId: string;
  platform: {
    code: string;
    name: string;
  };
  changeType: string;
  oldValue: string | null;
  newValue: string | null;
  capturedAt: string;
  capturedBy: string | null;
}

export interface CustomerPlatformIdentityHistoryResponse {
  items: CustomerPlatformIdentityHistoryItem[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface CustomerMembershipRecord {
  id: string;
  platform: {
    code: string;
    name: string;
  };
  membershipClass: {
    code: string;
    name: string;
  };
  membershipType: {
    code: string;
    name: string;
  };
  membershipLevel: {
    code: string;
    name: string;
    rank: number;
    color: string | null;
    badgeUrl: string | null;
  };
  validFrom: string;
  validTo: string | null;
  autoRenew: boolean;
  isExpired: boolean;
  note: string | null;
  createdAt: string;
}

export interface CustomerMembershipListResponse {
  items: CustomerMembershipRecord[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    summary: {
      activeCount: number;
      expiredCount: number;
      totalCount: number;
    };
  };
}

export const customerApi = {
  list: (params: CustomerListParams) =>
    apiClient.get<CustomerListItemResponse[]>('/api/v1/customers', {
      talentId: params.talentId,
      page: params.page?.toString(),
      pageSize: params.pageSize?.toString(),
      search: params.search,
      tags: params.tags,
      statusId: params.statusId,
      profileType: params.profileType,
      isActive: params.isActive?.toString(),
    }),

  get: (id: string, talentId?: string) =>
    apiClient.get<CustomerDetailResponse>(
      `/api/v1/customers/${id}`,
      undefined,
      talentId ? { 'X-Talent-Id': talentId } : undefined,
    ),

  requestPiiAccess: (id: string, talentId: string, accessReason?: string) =>
    apiClient.post<PiiAccessTokenData>(
      `/api/v1/customers/individuals/${id}/request-pii-access`,
      {},
      {
        'X-Talent-Id': talentId,
        ...(accessReason ? { 'X-PII-Access-Reason': accessReason } : {}),
      },
    ),

  create: (data: CustomerCreateData) =>
    apiClient.post<any>('/api/v1/customers/individuals', {
      talentId: data.talentId,
      profileStoreId: data.profileStoreId,
      profileType: data.profileType,
      nickname: data.nickname,
      primaryLanguage: data.primaryLanguage,
      statusCode: data.statusCode,
      tags: data.tags,
      source: data.source,
      notes: data.notes,
      pii: data.pii,
    }),

  update: (id: string, data: CustomerUpdateData, talentId: string) =>
    apiClient.patch<any>(
      `/api/v1/customers/individuals/${id}`,
      {
        nickname: data.nickname,
        tags: data.tags,
        notes: data.notes,
        version: data.expectedVersion,
      },
      { 'X-Talent-Id': talentId },
    ),

  deactivate: (id: string, reasonCode: string, version: number, talentId: string) =>
    apiClient.post<any>(
      `/api/v1/customers/${id}/deactivate`,
      { reasonCode, version },
      { 'X-Talent-Id': talentId },
    ),

  reactivate: (id: string, talentId: string) =>
    apiClient.post<any>(`/api/v1/customers/${id}/reactivate`, {}, { 'X-Talent-Id': talentId }),

  updatePii: (id: string, pii: PiiUpdateData, version: number, talentId: string) =>
    apiClient.patch<any>(
      `/api/v1/customers/individuals/${id}/pii`,
      { pii, version },
      { 'X-Talent-Id': talentId },
    ),
};

export const requestPiiAccessToken = async (
  customerId: string,
  talentId: string,
  accessReason?: string,
) => {
  return customerApi.requestPiiAccess(customerId, talentId, accessReason);
};

export const getPiiWithReason = async (customerId: string, reason: string) =>
  apiClient.post<{ pii: any }>(`/api/v1/customers/individuals/${customerId}/retrieve-pii`, {
    reason,
  });

export interface CompanyCreateData {
  talentId: string;
  nickname: string;
  primaryLanguage?: string;
  statusCode?: string;
  tags?: string[];
  source?: string;
  notes?: string;
  companyLegalName: string;
  companyShortName?: string;
  registrationNumber?: string;
  vatId?: string;
  establishmentDate?: string;
  businessSegmentCode?: string;
  website?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactDepartment?: string;
}

export interface CompanyUpdateData {
  nickname?: string;
  primaryLanguage?: string;
  statusCode?: string;
  tags?: string[];
  notes?: string;
  companyLegalName?: string;
  companyShortName?: string;
  registrationNumber?: string;
  vatId?: string;
  establishmentDate?: string;
  businessSegmentCode?: string;
  website?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactDepartment?: string;
  version: number;
}

export const companyCustomerApi = {
  create: (data: CompanyCreateData, talentId: string) =>
    apiClient.post<any>('/api/v1/customers/companies', data, { 'X-Talent-Id': talentId }),

  update: (id: string, data: CompanyUpdateData, talentId: string) =>
    apiClient.patch<any>(`/api/v1/customers/companies/${id}`, data, { 'X-Talent-Id': talentId }),
};

export interface CreatePlatformIdentityData {
  platformCode: string;
  platformUid: string;
  platformNickname?: string;
  platformAvatarUrl?: string;
  isVerified?: boolean;
}

export interface UpdatePlatformIdentityData {
  platformUid?: string;
  platformNickname?: string;
  platformAvatarUrl?: string;
  isVerified?: boolean;
  isCurrent?: boolean;
}

export const platformIdentityApi = {
  list: (customerId: string, talentId: string) =>
    apiClient.get<CustomerPlatformIdentity[]>(
      `/api/v1/customers/${customerId}/platform-identities`,
      undefined,
      { 'X-Talent-Id': talentId },
    ),

  create: (customerId: string, data: CreatePlatformIdentityData, talentId: string) =>
    apiClient.post<any>(`/api/v1/customers/${customerId}/platform-identities`, data, {
      'X-Talent-Id': talentId,
    }),

  update: (
    customerId: string,
    identityId: string,
    data: UpdatePlatformIdentityData,
    talentId: string,
  ) =>
    apiClient.patch<any>(
      `/api/v1/customers/${customerId}/platform-identities/${identityId}`,
      data,
      { 'X-Talent-Id': talentId },
    ),

  history: (
    customerId: string,
    talentId: string,
    query?: { platformCode?: string; changeType?: string; page?: number; pageSize?: number },
  ) =>
    apiClient.get<CustomerPlatformIdentityHistoryResponse>(
      `/api/v1/customers/${customerId}/platform-identities/history`,
      query,
      { 'X-Talent-Id': talentId },
    ),
};

export interface CreateMembershipData {
  platformCode: string;
  membershipLevelCode: string;
  validFrom: string;
  validTo?: string;
  autoRenew?: boolean;
  note?: string;
}

export interface UpdateMembershipData {
  validTo?: string;
  autoRenew?: boolean;
  note?: string;
}

export const membershipApi = {
  list: (
    customerId: string,
    talentId: string,
    query?: {
      platformCode?: string;
      isActive?: boolean;
      includeExpired?: boolean;
      page?: number;
      pageSize?: number;
    },
  ) =>
    apiClient.get<CustomerMembershipListResponse>(
      `/api/v1/customers/${customerId}/memberships`,
      query,
      { 'X-Talent-Id': talentId },
    ),

  create: (customerId: string, data: CreateMembershipData, talentId: string) =>
    apiClient.post<any>(`/api/v1/customers/${customerId}/memberships`, data, {
      'X-Talent-Id': talentId,
    }),

  update: (customerId: string, recordId: string, data: UpdateMembershipData, talentId: string) =>
    apiClient.patch<any>(`/api/v1/customers/${customerId}/memberships/${recordId}`, data, {
      'X-Talent-Id': talentId,
    }),
};

export const customerImportApi = {
  downloadIndividualTemplate: async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/imports/customers/individuals/template`,
      {
        credentials: 'include',
      },
    );
    if (!response.ok) throw new Error('Failed to download template');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'individual_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  },

  downloadCompanyTemplate: async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/imports/customers/companies/template`,
      {
        credentials: 'include',
      },
    );
    if (!response.ok) throw new Error('Failed to download template');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'company_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  },

  uploadIndividual: async (file: File, talentId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/imports/customers/individuals`,
      {
        method: 'POST',
        body: formData,
        headers: { 'X-Talent-Id': talentId },
        credentials: 'include',
      },
    );
    return response.json();
  },

  uploadCompany: async (file: File, talentId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/imports/customers/companies`,
      {
        method: 'POST',
        body: formData,
        headers: { 'X-Talent-Id': talentId },
        credentials: 'include',
      },
    );
    return response.json();
  },

  getJob: (type: 'individuals' | 'companies', jobId: string) =>
    apiClient.get<any>(`/api/v1/imports/customers/${type}/${jobId}`),

  listJobs: (talentId: string, query?: { status?: string; page?: number; pageSize?: number }) =>
    apiClient.get<any[]>('/api/v1/imports/customers', query, { 'X-Talent-Id': talentId }),

  downloadErrors: async (type: 'individuals' | 'companies', jobId: string) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/imports/customers/${type}/${jobId}/errors`,
      {
        credentials: 'include',
      },
    );
    if (!response.ok) throw new Error('Failed to download errors');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_${jobId}_errors.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  cancel: (type: 'individuals' | 'companies', jobId: string) =>
    apiClient.delete<any>(`/api/v1/imports/customers/${type}/${jobId}`),
};

export interface CreateExternalIdData {
  consumerCode: string;
  externalId: string;
}

export interface ExternalIdRecord {
  id: string;
  consumer: {
    id: string;
    code: string;
    name: string;
  };
  externalId: string;
  createdAt: string;
  createdBy?: string;
}

export const externalIdApi = {
  list: (customerId: string, talentId: string) =>
    apiClient.get<ExternalIdRecord[]>(`/api/v1/customers/${customerId}/external-ids`, undefined, {
      'X-Talent-Id': talentId,
    }),

  create: (customerId: string, data: CreateExternalIdData, talentId: string) =>
    apiClient.post<ExternalIdRecord>(`/api/v1/customers/${customerId}/external-ids`, data, {
      'X-Talent-Id': talentId,
    }),

  delete: (customerId: string, externalIdId: string, _talentId: string) =>
    apiClient.delete<{ message: string }>(
      `/api/v1/customers/${customerId}/external-ids/${externalIdId}`,
    ),
};
