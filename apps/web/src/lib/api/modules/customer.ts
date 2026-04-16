// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { ApiResponse } from '../core';
import { apiClient, buildApiUrl } from '../core';

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

export interface CompanyPiiData {
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactDepartment?: string;
}

export type CustomerProfileType = 'individual' | 'company';

export interface CustomerPiiPortalSessionResponse {
  redirectUrl: string;
  expiresAt: string;
}

export interface CustomerIndividualCreateResponse {
  id: string;
  profileType: 'individual';
  nickname: string;
  createdAt: string;
}

export interface CustomerProfileMutationResponse {
  id: string;
  nickname: string;
  version: number;
  updatedAt: string;
}

export interface CustomerActivationResponse {
  id: string;
  isActive: boolean;
}

export interface CustomerPiiUpdateResponse {
  id: string;
  message: string;
}

export interface CustomerCreateData {
  talentId: string;
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
  piiReadbackEnabled: boolean;
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
  businessSegment: CustomerCompanyBusinessSegment | null;
}

export interface CustomerDetailBase {
  id: string;
  profileType: CustomerProfileType;
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

const buildTalentCustomersPath = (talentId: string) => `/api/v1/talents/${talentId}/customers`;

const buildTalentCustomerPath = (talentId: string, customerId: string) =>
  `${buildTalentCustomersPath(talentId)}/${customerId}`;

const buildTalentCustomerIndividualsPath = (talentId: string, customerId?: string) =>
  customerId
    ? `${buildTalentCustomersPath(talentId)}/individuals/${customerId}`
    : `${buildTalentCustomersPath(talentId)}/individuals`;

const buildTalentCustomerCompaniesPath = (talentId: string, customerId?: string) =>
  customerId
    ? `${buildTalentCustomersPath(talentId)}/companies/${customerId}`
    : `${buildTalentCustomersPath(talentId)}/companies`;

const buildTalentCustomerPiiPortalPath = (
  talentId: string,
  customerId: string,
  profileType: CustomerProfileType,
) =>
  profileType === 'company'
    ? `${buildTalentCustomerCompaniesPath(talentId, customerId)}/pii-portal-session`
    : `${buildTalentCustomerIndividualsPath(talentId, customerId)}/pii-portal-session`;

const buildPlatformIdentitiesPath = (talentId: string, customerId: string) =>
  `${buildTalentCustomerPath(talentId, customerId)}/platform-identities`;

const buildMembershipsPath = (talentId: string, customerId: string) =>
  `${buildTalentCustomerPath(talentId, customerId)}/memberships`;

const buildExternalIdsPath = (talentId: string, customerId: string) =>
  `${buildTalentCustomerPath(talentId, customerId)}/external-ids`;

const buildCustomerImportPath = (talentId: string) => `/api/v1/talents/${talentId}/imports/customers`;

const buildCustomerImportTypePath = (talentId: string, type: CustomerImportType) =>
  `${buildCustomerImportPath(talentId)}/${type}`;

const buildCustomerImportJobPath = (
  talentId: string,
  type: CustomerImportType,
  jobId: string,
) => `${buildCustomerImportTypePath(talentId, type)}/${jobId}`;

export const customerApi = {
  list: (params: CustomerListParams) =>
    apiClient.get<CustomerListItemResponse[]>(buildTalentCustomersPath(params.talentId), {
      page: params.page?.toString(),
      pageSize: params.pageSize?.toString(),
      search: params.search,
      tags: params.tags,
      statusId: params.statusId,
      profileType: params.profileType,
      isActive: params.isActive?.toString(),
    }),

  get: (id: string, talentId: string) =>
    apiClient.get<CustomerDetailResponse>(buildTalentCustomerPath(talentId, id)),

  createPiiPortalSession: (
    id: string,
    talentId: string,
    profileType: CustomerProfileType = 'individual',
  ) =>
    apiClient.post<CustomerPiiPortalSessionResponse>(
      buildTalentCustomerPiiPortalPath(talentId, id, profileType),
      {},
    ),

  create: (data: CustomerCreateData) =>
    apiClient.post<CustomerIndividualCreateResponse>(buildTalentCustomerIndividualsPath(data.talentId), {
      nickname: data.nickname,
      primaryLanguage: data.primaryLanguage,
      statusCode: data.statusCode,
      tags: data.tags,
      source: data.source,
      notes: data.notes,
      pii: data.pii,
    }),

  update: (id: string, data: CustomerUpdateData, talentId: string) =>
    apiClient.patch<CustomerProfileMutationResponse>(
      buildTalentCustomerIndividualsPath(talentId, id),
      {
        nickname: data.nickname,
        tags: data.tags,
        notes: data.notes,
        version: data.expectedVersion,
      },
    ),

  deactivate: (id: string, reasonCode: string, version: number, talentId: string) =>
    apiClient.post<CustomerActivationResponse>(
      `${buildTalentCustomerPath(talentId, id)}/deactivate`,
      { reasonCode, version },
    ),

  reactivate: (id: string, talentId: string) =>
    apiClient.post<CustomerActivationResponse>(
      `${buildTalentCustomerPath(talentId, id)}/reactivate`,
      {},
    ),

  updatePii: (id: string, pii: PiiUpdateData, version: number, talentId: string) =>
    apiClient.patch<CustomerPiiUpdateResponse>(
      `${buildTalentCustomerIndividualsPath(talentId, id)}/pii`,
      { pii, version },
    ),
};

export const createPiiPortalSession = async (
  customerId: string,
  talentId: string,
  profileType?: CustomerProfileType,
) => {
  return customerApi.createPiiPortalSession(customerId, talentId, profileType);
};

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
  pii?: CompanyPiiData;
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
  pii?: CompanyPiiData;
  version: number;
}

export interface CustomerCompanyCreateResponse {
  id: string;
  profileType: 'company';
  nickname: string;
  company: Pick<CustomerCompanyDetailData, 'companyLegalName' | 'companyShortName'>;
  createdAt: string;
}

export const companyCustomerApi = {
  create: (data: CompanyCreateData) =>
    apiClient.post<CustomerCompanyCreateResponse>(buildTalentCustomerCompaniesPath(data.talentId), {
      nickname: data.nickname,
      primaryLanguage: data.primaryLanguage,
      statusCode: data.statusCode,
      tags: data.tags,
      source: data.source,
      notes: data.notes,
      companyLegalName: data.companyLegalName,
      companyShortName: data.companyShortName,
      registrationNumber: data.registrationNumber,
      vatId: data.vatId,
      establishmentDate: data.establishmentDate,
      businessSegmentCode: data.businessSegmentCode,
      website: data.website,
      pii: data.pii,
    }),

  update: (id: string, data: CompanyUpdateData, talentId: string) =>
    apiClient.patch<CustomerProfileMutationResponse>(
      buildTalentCustomerCompaniesPath(talentId, id),
      data,
    ),
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

export interface CustomerPlatformIdentityCreateResponse {
  id: string;
  platform: {
    id: string;
    code: string;
    name: string;
  };
  platformUid: string;
  platformNickname: string | null;
  profileUrl: string | null;
  isVerified: boolean;
  isCurrent: boolean;
  capturedAt: string;
}

export interface CustomerPlatformIdentityUpdateResponse {
  id: string;
  platformUid: string;
  platformNickname: string | null;
  profileUrl: string | null;
  isVerified: boolean;
  isCurrent: boolean;
  updatedAt: string;
}

export const platformIdentityApi = {
  list: (customerId: string, talentId: string) =>
    apiClient.get<CustomerPlatformIdentity[]>(buildPlatformIdentitiesPath(talentId, customerId)),

  create: (customerId: string, data: CreatePlatformIdentityData, talentId: string) =>
    apiClient.post<CustomerPlatformIdentityCreateResponse>(
      buildPlatformIdentitiesPath(talentId, customerId),
      data,
    ),

  update: (
    customerId: string,
    identityId: string,
    data: UpdatePlatformIdentityData,
    talentId: string,
  ) =>
    apiClient.patch<CustomerPlatformIdentityUpdateResponse>(
      `${buildPlatformIdentitiesPath(talentId, customerId)}/${identityId}`,
      data,
    ),

  history: (
    customerId: string,
    talentId: string,
    query?: { platformCode?: string; changeType?: string; page?: number; pageSize?: number },
  ) =>
    apiClient.get<CustomerPlatformIdentityHistoryResponse>(
      `${buildPlatformIdentitiesPath(talentId, customerId)}/history`,
      query,
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

export interface CustomerMembershipCreateResponse {
  id: string;
  platform: {
    code: string;
    name: string;
  };
  membershipLevel: {
    code: string;
    name: string;
  };
  validFrom: string;
  validTo: string | null;
  autoRenew: boolean;
  createdAt: string;
}

export interface CustomerMembershipUpdateResponse {
  id: string;
  validTo: string | null;
  autoRenew: boolean;
  note: string | null;
  updatedAt: string;
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
      buildMembershipsPath(talentId, customerId),
      query,
    ),

  create: (customerId: string, data: CreateMembershipData, talentId: string) =>
    apiClient.post<CustomerMembershipCreateResponse>(
      buildMembershipsPath(talentId, customerId),
      data,
    ),

  update: (customerId: string, recordId: string, data: UpdateMembershipData, talentId: string) =>
    apiClient.patch<CustomerMembershipUpdateResponse>(
      `${buildMembershipsPath(talentId, customerId)}/${recordId}`,
      data,
    ),
};

type CustomerImportType = 'individuals' | 'companies';
type CustomerImportJobType = 'individual_import' | 'company_import';
type CustomerImportJobStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'partial'
  | 'failed'
  | 'cancelled';

export interface CustomerImportProgress {
  totalRows: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  warningRows: number;
  percentage: number;
}

export interface CustomerImportJobResponse {
  id: string;
  jobType: CustomerImportJobType;
  status: CustomerImportJobStatus;
  fileName: string;
  consumerCode: string | null;
  progress: CustomerImportProgress;
  startedAt: string | null;
  completedAt: string | null;
  estimatedRemainingSeconds: number | null;
  createdAt: string;
  createdBy: {
    id: string;
    username: string;
  };
}

export interface CustomerImportJobListResponse {
  items: CustomerImportJobResponse[];
  meta: {
    total: number;
  };
}

export interface CustomerImportJobCreateResponse {
  id: string;
  status: CustomerImportJobStatus;
  fileName: string;
  totalRows: number;
  createdAt: string;
}

export interface CustomerImportCancelResponse {
  message: string;
}

const parseUploadResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw {
      code: payload.error?.code || 'UNKNOWN_ERROR',
      message: payload.error?.message || payload.message || 'An error occurred',
      statusCode: response.status,
    };
  }

  return payload;
};

const uploadCustomerImportFile = async (
  type: CustomerImportType,
  file: File,
  talentId: string,
): Promise<ApiResponse<CustomerImportJobCreateResponse>> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(buildApiUrl(buildCustomerImportTypePath(talentId, type)), {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  return parseUploadResponse<CustomerImportJobCreateResponse>(response);
};

const throwCustomerImportError = (code: string): never => {
  const error = new Error();
  (error as Error & { code: string }).code = code;
  throw error;
};

export const customerImportApi = {
  downloadIndividualTemplate: async (talentId: string) => {
    const response = await fetch(
      buildApiUrl(`${buildCustomerImportTypePath(talentId, 'individuals')}/template`),
      {
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throwCustomerImportError('CUSTOMER_IMPORT_TEMPLATE_DOWNLOAD_FAILED');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'individual_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  },

  downloadCompanyTemplate: async (talentId: string) => {
    const response = await fetch(
      buildApiUrl(`${buildCustomerImportTypePath(talentId, 'companies')}/template`),
      {
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throwCustomerImportError('CUSTOMER_IMPORT_TEMPLATE_DOWNLOAD_FAILED');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'company_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  },

  uploadIndividual: async (file: File, talentId: string) => {
    return uploadCustomerImportFile('individuals', file, talentId);
  },

  uploadCompany: async (file: File, talentId: string) => {
    return uploadCustomerImportFile('companies', file, talentId);
  },

  getJob: (type: CustomerImportType, jobId: string, talentId: string) =>
    apiClient.get<CustomerImportJobResponse>(buildCustomerImportJobPath(talentId, type, jobId)),

  listJobs: (talentId: string, query?: { status?: string; page?: number; pageSize?: number }) =>
    apiClient.get<CustomerImportJobListResponse>(buildCustomerImportPath(talentId), query),

  downloadErrors: async (type: 'individuals' | 'companies', jobId: string, talentId: string) => {
    const response = await fetch(
      buildApiUrl(`${buildCustomerImportJobPath(talentId, type, jobId)}/errors`),
      {
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throwCustomerImportError('CUSTOMER_IMPORT_ERRORS_DOWNLOAD_FAILED');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_${jobId}_errors.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  cancel: (type: CustomerImportType, jobId: string, talentId: string) =>
    apiClient.delete<CustomerImportCancelResponse>(buildCustomerImportJobPath(talentId, type, jobId)),
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
    apiClient.get<ExternalIdRecord[]>(buildExternalIdsPath(talentId, customerId)),

  create: (customerId: string, data: CreateExternalIdData, talentId: string) =>
    apiClient.post<ExternalIdRecord>(buildExternalIdsPath(talentId, customerId), data),

  delete: (customerId: string, externalIdId: string, talentId: string) =>
    apiClient.delete<{ message: string }>(
      `${buildExternalIdsPath(talentId, customerId)}/${externalIdId}`,
    ),
};
