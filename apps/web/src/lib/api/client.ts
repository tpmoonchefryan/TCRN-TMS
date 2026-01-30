/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { useAuthStore } from '@/stores/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
  };
  message?: string;  // Add message for error responses
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    [key: string]: any;
  };
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Important for Refresh Token Cookie
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle 401 Unauthorized (Token Expired)
        if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            // Retry original request with new token
            if (this.accessToken) {
              (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
            }
            const retryResponse = await fetch(url, {
              ...options,
              headers,
              credentials: 'include',
            });
            return await retryResponse.json();
          } else {
            // Refresh failed, logout
            useAuthStore.getState().logout();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }
        }

        // Try to handle standard NestJS error format { statusCode, message, error }
        const errorMessage = data.error?.message 
          || (Array.isArray(data.message) ? data.message.join(', ') : data.message)
          || 'An error occurred';

        const errorCode = data.error?.code || data.error || 'UNKNOWN_ERROR';

        const error: ApiError = {
          code: errorCode,
          message: errorMessage,
          statusCode: response.status,
        };
        throw error;
      }

      return data;
    } catch (error) {
      if ((error as ApiError).statusCode) {
        throw error;
      }
      throw {
        code: 'NETWORK_ERROR',
        message: 'Network error occurred',
        statusCode: 0,
      } as ApiError;
    }
  }

  private async refreshToken(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const tenantCode = useAuthStore.getState().tenantCode;
        const headers = tenantCode ? { 'X-Tenant-ID': tenantCode } : undefined;
        const response = await this.post<{ accessToken?: string }>('/api/v1/auth/refresh', {}, headers);
        if (response.success && response.data?.accessToken) {
          this.setAccessToken(response.data.accessToken);
          return true;
        }
      } catch {
        // Refresh failed
      } finally {
        this.refreshPromise = null;
      }
      return false;
    })();

    return this.refreshPromise;
  }

  async get<T>(endpoint: string, params?: Record<string, any>, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    const filteredParams = params 
      ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
      : undefined;
    const searchParams = filteredParams && Object.keys(filteredParams).length > 0
      ? `?${new URLSearchParams(filteredParams as Record<string, string>).toString()}`
      : '';
    return this.request<T>(`${endpoint}${searchParams}`, { method: 'GET', headers });
  }

  async post<T>(endpoint: string, body: unknown, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    });
  }

  async patch<T>(endpoint: string, body: unknown, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers,
    });
  }

  async put<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// --- API Definitions ---

// Auth API
export const authApi = {
  login: (login: string, password: string, tenantCode: string) =>
    apiClient.post<{
      accessToken?: string;
      expiresIn?: number;
      totpRequired?: boolean;
      passwordResetRequired?: boolean;
      reason?: string;
      sessionToken?: string;
      tenantId?: string;
      user?: any;
    }>('/api/v1/auth/login', { login, password, tenantCode }, { 'X-Tenant-ID': tenantCode }),

  verifyTotp: (sessionToken: string, code: string) =>
    apiClient.post<{
      accessToken?: string;
      expiresIn?: number;
      tenantId?: string;
      user?: any;
    }>('/api/v1/auth/totp/verify', { sessionToken, code }),

  resetPassword: (sessionToken: string, newPassword: string, newPasswordConfirm: string) =>
    apiClient.post<{
      accessToken?: string;
      expiresIn?: number;
      tenantId?: string;
      user?: any;
      message?: string;
    }>('/api/v1/auth/password/reset', { sessionToken, newPassword, newPasswordConfirm }),

  logout: () => apiClient.post('/api/v1/auth/logout', {}),

  refresh: (tenantCode?: string) => apiClient.post<{ accessToken?: string; expiresIn?: number }>('/api/v1/auth/refresh', {}, tenantCode ? { 'X-Tenant-ID': tenantCode } : undefined),

  me: () => apiClient.get<any>('/api/v1/users/me'),

  // Forgot password - request reset email
  forgotPassword: (email: string, tenantCode: string) =>
    apiClient.post<{ message?: string }>('/api/v1/auth/forgot-password', { email, tenantCode }),

  // Reset password using email token
  resetPasswordByToken: (token: string, tenantCode: string, newPassword: string, newPasswordConfirm: string) =>
    apiClient.post<{ message?: string }>('/api/v1/auth/reset-password-by-token', { token, tenantCode, newPassword, newPasswordConfirm }),
};

// User Profile API
export const userApi = {
  // Get current user
  me: () => apiClient.get<any>('/api/v1/users/me'),

  // Update profile
  update: (data: { displayName?: string; phone?: string; preferredLanguage?: string; avatarUrl?: string }) =>
    apiClient.patch<any>('/api/v1/users/me', data),

  // Alias for updateProfile
  updateProfile: (data: { displayName?: string }) =>
    apiClient.patch<any>('/api/v1/users/me', data),

  // Upload avatar
  uploadAvatar: async (file: File): Promise<{ success: boolean; data?: { avatarUrl: string }; error?: any }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/v1/users/me/avatar', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    
    const result = await response.json();
    return {
      success: response.ok,
      data: result.data,
      error: result.error,
    };
  },

  // Delete avatar
  deleteAvatar: () => apiClient.delete<any>('/api/v1/users/me/avatar'),

  // Change password
  changePassword: (data: { currentPassword: string; newPassword: string; newPasswordConfirm: string }) =>
    apiClient.post<any>('/api/v1/users/me/password', data),

  // Request email change (sends verification email to new address)
  requestEmailChange: (newEmail: string) =>
    apiClient.post<any>('/api/v1/users/me/email/request-change', { newEmail }),

  // Confirm email change (verify token from email)
  confirmEmailChange: (token: string) =>
    apiClient.post<any>('/api/v1/users/me/email/confirm', { token }),
};

// Customer API
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

export interface CustomerCreateData {
  talentId: string;
  profileStoreId: string;
  profileType: 'individual' | 'company';
  nickname: string;
  primaryLanguage?: string;
  tags?: string[];
  source?: string;
  notes?: string;
  pii?: {
    realName?: string;
    email?: string;
    phone?: string;
  };
}

export interface CustomerUpdateData {
  nickname?: string;
  tags?: string[];
  notes?: string;
  expectedVersion: number;
}

export const customerApi = {
  list: (params: CustomerListParams) =>
    apiClient.get<any[]>('/api/v1/customers', {
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
    apiClient.get<any>(
      `/api/v1/customers/${id}`,
      undefined,
      talentId ? { 'X-Talent-Id': talentId } : undefined
    ),

  // Request PII access token (backend returns JWT for PII service)
  requestPiiAccess: (id: string, talentId: string) =>
    apiClient.post<{ accessToken: string; piiProfileId: string }>(
      `/api/v1/customers/individuals/${id}/request-pii-access`,
      {},
      { 'X-Talent-Id': talentId }
    ),

  // Create individual customer (backend path: /customers/individuals)
  create: (data: CustomerCreateData) =>
    apiClient.post<any>('/api/v1/customers/individuals', {
      talentId: data.talentId,
      profileStoreId: data.profileStoreId,
      profileType: data.profileType,
      nickname: data.nickname,
      primaryLanguage: data.primaryLanguage,
      tags: data.tags,
      source: data.source,
      notes: data.notes,
      pii: data.pii,
    }),

  // Update individual customer (backend path: /customers/individuals/:id)
  update: (id: string, data: CustomerUpdateData, talentId: string) =>
    apiClient.patch<any>(
      `/api/v1/customers/individuals/${id}`,
      {
        nickname: data.nickname,
        tags: data.tags,
        notes: data.notes,
        version: data.expectedVersion,
      },
      { 'X-Talent-Id': talentId }
    ),

  deactivate: (id: string, reasonCode: string, version: number, talentId: string) =>
    apiClient.post<any>(
      `/api/v1/customers/${id}/deactivate`,
      { reasonCode, version },
      { 'X-Talent-Id': talentId }
    ),

  reactivate: (id: string, talentId: string) =>
    apiClient.post<any>(
      `/api/v1/customers/${id}/reactivate`,
      {},
      { 'X-Talent-Id': talentId }
    ),

  // Update PII data for individual customer
  updatePii: (id: string, pii: PiiUpdateData, version: number, talentId: string) =>
    apiClient.patch<any>(
      `/api/v1/customers/individuals/${id}/pii`,
      { pii, version },
      { 'X-Talent-Id': talentId }
    ),
};

// PII Update Data interface
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
  phoneNumbers?: Array<{ countryCode: string; number: string; type?: string; isPrimary?: boolean }>;
  emails?: Array<{ address: string; type?: string; isPrimary?: boolean }>;
  addresses?: AddressData[];
}

// Request PII access token first, then use it to fetch PII from PII service
// This follows the PRD §11.6 data flow: request token -> use token with PII service
export const requestPiiAccessToken = async (customerId: string, talentId: string, accessReason: string) => {
  const response = await apiClient.post<{ accessToken: string; piiProfileId: string }>(
    `/api/v1/customers/individuals/${customerId}/request-pii-access`,
    {},
    { 'X-Talent-Id': talentId, 'X-PII-Access-Reason': accessReason }
  );
  return response;
};

export const getPiiWithReason = async (customerId: string, reason: string) => {
  // This is a simplified wrapper. In a real implementation this might chain the token request
  // and the PII service fetch. For now we point to the access request endpoint.
  // Note: The UI expects response.data.pii, which requires the backend to return PII directly 
  // or this function to handle the fetch. 
  // Assuming a 'retrieve' endpoint exists or using access request as placeholder.
  return apiClient.post<{ pii: any }>(
    `/api/v1/customers/individuals/${customerId}/retrieve-pii`, 
    { reason }
  );
};

// Company Customer API
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

// Platform Identity API
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
    apiClient.get<any[]>(`/api/v1/customers/${customerId}/platform-identities`, undefined, { 'X-Talent-Id': talentId }),
  
  create: (customerId: string, data: CreatePlatformIdentityData, talentId: string) =>
    apiClient.post<any>(`/api/v1/customers/${customerId}/platform-identities`, data, { 'X-Talent-Id': talentId }),
  
  update: (customerId: string, identityId: string, data: UpdatePlatformIdentityData, talentId: string) =>
    apiClient.patch<any>(`/api/v1/customers/${customerId}/platform-identities/${identityId}`, data, { 'X-Talent-Id': talentId }),
  
  history: (customerId: string, talentId: string, query?: { platformCode?: string; changeType?: string; page?: number; pageSize?: number }) =>
    apiClient.get<any[]>(`/api/v1/customers/${customerId}/platform-identities/history`, query, { 'X-Talent-Id': talentId }),
};

// Membership API
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
  list: (customerId: string, talentId: string, query?: { platformCode?: string; isActive?: boolean; includeExpired?: boolean; page?: number; pageSize?: number }) =>
    apiClient.get<any[]>(`/api/v1/customers/${customerId}/memberships`, query, { 'X-Talent-Id': talentId }),
  
  create: (customerId: string, data: CreateMembershipData, talentId: string) =>
    apiClient.post<any>(`/api/v1/customers/${customerId}/memberships`, data, { 'X-Talent-Id': talentId }),
  
  update: (customerId: string, recordId: string, data: UpdateMembershipData, talentId: string) =>
    apiClient.patch<any>(`/api/v1/customers/${customerId}/memberships/${recordId}`, data, { 'X-Talent-Id': talentId }),
};

// Customer Import API
export const customerImportApi = {
  downloadIndividualTemplate: async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/imports/customers/individuals/template`, {
      credentials: 'include',
    });
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
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/imports/customers/companies/template`, {
      credentials: 'include',
    });
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
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/imports/customers/individuals`, {
      method: 'POST',
      body: formData,
      headers: { 'X-Talent-Id': talentId },
      credentials: 'include',
    });
    return response.json();
  },
  
  uploadCompany: async (file: File, talentId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/imports/customers/companies`, {
      method: 'POST',
      body: formData,
      headers: { 'X-Talent-Id': talentId },
      credentials: 'include',
    });
    return response.json();
  },
  
  getJob: (type: 'individuals' | 'companies', jobId: string) =>
    apiClient.get<any>(`/api/v1/imports/customers/${type}/${jobId}`),
  
  listJobs: (talentId: string, query?: { status?: string; page?: number; pageSize?: number }) =>
    apiClient.get<any[]>('/api/v1/imports/customers', query, { 'X-Talent-Id': talentId }),
  
  downloadErrors: async (type: 'individuals' | 'companies', jobId: string) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/imports/customers/${type}/${jobId}/errors`, {
      credentials: 'include',
    });
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

// Customer External ID API
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
    apiClient.get<ExternalIdRecord[]>(`/api/v1/customers/${customerId}/external-ids`, undefined, { 'X-Talent-Id': talentId }),
  
  create: (customerId: string, data: CreateExternalIdData, talentId: string) =>
    apiClient.post<ExternalIdRecord>(`/api/v1/customers/${customerId}/external-ids`, data, { 'X-Talent-Id': talentId }),
  
  delete: (customerId: string, externalIdId: string, _talentId: string) =>
    apiClient.delete<{ message: string }>(`/api/v1/customers/${customerId}/external-ids/${externalIdId}`),
};

// Talent API
export const talentApi = {
  list: (subsidiaryId?: string) =>
    apiClient.get<any[]>('/api/v1/talents', subsidiaryId ? { subsidiaryId } : undefined),

  get: (id: string) =>
    apiClient.get<any>(`/api/v1/talents/${id}`),

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
  }) =>
    apiClient.post<any>('/api/v1/talents', data),

  update: (id: string, data: {
    nameEn?: string;
    nameZh?: string;
    nameJa?: string;
    displayName?: string;
    descriptionEn?: string;
    avatarUrl?: string;
    homepagePath?: string;
    timezone?: string;
    version: number;
  }) =>
    apiClient.patch<any>(`/api/v1/talents/${id}`, data),

  move: (id: string, data: { newSubsidiaryId?: string | null; version: number }) =>
    apiClient.post<any>(`/api/v1/talents/${id}/move`, data),

  deactivate: (id: string, version: number) =>
    apiClient.post<any>(`/api/v1/talents/${id}/deactivate`, { version }),

  reactivate: (id: string, version: number) =>
    apiClient.post<any>(`/api/v1/talents/${id}/reactivate`, { version }),
};

// Organization API
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
    children: any[]; // Recursive type
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
  
  getSubsidiaries: () =>
    apiClient.get<any[]>('/api/v1/organization/subsidiaries'),
  
  getSubsidiary: (id: string) =>
    apiClient.get<any>(`/api/v1/organization/subsidiaries/${id}`),
  
  createSubsidiary: (data: { code: string; displayName: string; parentId?: string }) =>
    apiClient.post<any>('/api/v1/organization/subsidiaries', data),
  
  updateSubsidiary: (id: string, data: { displayName?: string }) =>
    apiClient.patch<any>(`/api/v1/organization/subsidiaries/${id}`, data),
  
  getTalents: (subsidiaryId?: string) =>
    apiClient.get<any[]>('/api/v1/talents', subsidiaryId ? { subsidiaryId } : undefined),
  
  getTalent: (id: string) =>
    apiClient.get<any>(`/api/v1/talents/${id}`),
  
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
  }) =>
    apiClient.post<any>('/api/v1/talents', data),
  
  updateTalent: (id: string, data: { 
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
  }) =>
    apiClient.patch<any>(`/api/v1/talents/${id}`, data),
};

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
    apiClient.get<{ downloadUrl: string }>(`/api/v1/reports/mfr/jobs/${jobId}/download`, { talent_id: talentId }),

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
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/talents/${talentId}/marshmallow/avatar`, {
      method: 'POST',
      body: formData,
      headers,
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    
    const result = await response.json();
    return result.data;
  },

  getMessages: (talentId: string, status?: string, pageSize: number = 100) =>
    apiClient.get<any[]>(`/api/v1/talents/${talentId}/marshmallow/messages`, { 
      ...(status ? { status } : {}),
      pageSize 
    }),

  // Approve message (backend uses separate endpoints for approve/reject)
  approveMessage: (talentId: string, messageId: string) =>
    apiClient.post<any>(`/api/v1/talents/${talentId}/marshmallow/messages/${messageId}/approve`, {}),

  // Reject message (reason must be one of: profanity, spam, harassment, off_topic, duplicate, external_link, other)
  rejectMessage: (talentId: string, messageId: string, reason: string, note?: string) =>
    apiClient.post<any>(`/api/v1/talents/${talentId}/marshmallow/messages/${messageId}/reject`, { reason, note }),

  // Unreject message - restore rejected message to pending status
  unrejectMessage: (talentId: string, messageId: string) =>
    apiClient.post<any>(`/api/v1/talents/${talentId}/marshmallow/messages/${messageId}/unreject`, {}),

  // Update message (read, starred, pinned status)
  updateMessage: (talentId: string, messageId: string, data: { isRead?: boolean; isStarred?: boolean; isPinned?: boolean }) =>
    apiClient.patch<any>(`/api/v1/talents/${talentId}/marshmallow/messages/${messageId}`, data),

  // Reply to message
  replyMessage: (talentId: string, messageId: string, content: string) =>
    apiClient.post<any>(`/api/v1/talents/${talentId}/marshmallow/messages/${messageId}/reply`, { content }),

  // Batch action on messages
  batchAction: (talentId: string, action: 'approve' | 'reject' | 'delete', messageIds: string[], reason?: string) =>
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
    apiClient.get<any>(`/api/v1/talents/${talentId}/homepage`),

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
  getHomepage: (talentPath: string) =>
    apiClient.get<any>(`/api/v1/public/homepage/${talentPath}`),

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
      honeypot?: string;  // Hidden field for bot detection
      socialLink?: string;
      selectedImageUrls?: string[];
    }
  ) =>
    apiClient.post<any>(`/api/v1/public/marshmallow/${talentPath}/submit`, data),

  // Get public messages (approved ones)
  // Note: _t parameter is used for cache-busting to ensure fresh data
  getPublicMessages: (talentPath: string, cursor?: string, limit?: number, fingerprint?: string, bustCache?: boolean) =>
    apiClient.get<any>(`/api/v1/public/marshmallow/${talentPath}/messages`, { 
      cursor, 
      limit: limit?.toString(), 
      fingerprint,
      ...(bustCache ? { _t: Date.now().toString() } : {})
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

  replyMarshmallowAuth: (talentPath: string, messageId: string, content: string, ssoToken: string) =>
    apiClient.post<{
      success: boolean;
      replyContent: string;
      repliedAt: string;
      repliedBy: { id: string; displayName: string };
    }>(
      `/api/v1/public/marshmallow/${talentPath}/messages/${messageId}/reply-auth`,
      { ssoToken, content }
    ),

  previewMarshmallowImage: (url: string) =>
    apiClient.post<{ success: boolean; imageUrl?: string; images?: string[]; error?: string }>(
      '/api/v1/public/marshmallow/preview-image',
      { url }
    ),
};

// Security API
export const securityApi = {
  generateFingerprint: () =>
    apiClient.post<any>('/api/v1/security/fingerprint', {}),

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
    if (query?.includeInherited !== undefined) params.append('includeInherited', String(query.includeInherited));
    if (query?.includeDisabled !== undefined) params.append('includeDisabled', String(query.includeDisabled));
    if (query?.includeInactive !== undefined) params.append('includeInactive', String(query.includeInactive));
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

  deleteBlocklistEntry: (id: string) =>
    apiClient.delete<any>(`/api/v1/blocklist-entries/${id}`),

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
  getIpRules: () =>
    apiClient.get<any[]>('/api/v1/ip-access-rules'),

  createIpRule: (rule: {
    ruleType: string;
    ipPattern: string;
    scope: string;
    reason?: string;
  }) =>
    apiClient.post<any>('/api/v1/ip-access-rules', {
      ruleType: rule.ruleType,
      ipPattern: rule.ipPattern,
      scope: rule.scope,
      reason: rule.reason,
    }),

  deleteIpRule: (id: string) =>
    apiClient.delete<any>(`/api/v1/ip-access-rules/${id}`),

  checkIpAccess: (ip: string, scope: 'global' | 'admin' | 'public' | 'api' = 'global') =>
    apiClient.post<{ allowed: boolean; reason?: string; matched_rule?: any; matchedRule?: any }>(
      '/api/v1/ip-access-rules/check',
      { ip, scope }
    ),
};

// Tenant API (Platform Admin)
export const tenantApi = {
  list: () =>
    apiClient.get<any[]>('/api/v1/tenants'),

  get: (id: string) =>
    apiClient.get<any>(`/api/v1/tenants/${id}`),

  create: (data: any) =>
    apiClient.post<any>('/api/v1/tenants', data),

  update: (id: string, data: any) =>
    apiClient.patch<any>(`/api/v1/tenants/${id}`, data),

  activate: (id: string) =>
    apiClient.post<any>(`/api/v1/tenants/${id}/activate`, {}),

  deactivate: (id: string, reason?: string) =>
    apiClient.post<any>(`/api/v1/tenants/${id}/deactivate`, { reason }),
};

// Configuration Entity API (Generic CRUD for config entities)
export const configEntityApi = {
  // List entities by type
  list: (entityType: string, params?: { 
    scopeType?: string; 
    scopeId?: string; 
    includeInherited?: boolean;
    includeInactive?: boolean;
    search?: string;
    parentId?: string;
    page?: number;
    pageSize?: number;
  }) =>
    apiClient.get<any[]>(`/api/v1/configuration-entity/${entityType}`, params),

  // Create entity
  create: (entityType: string, data: {
    code: string;
    nameEn: string;
    nameZh?: string;
    nameJa?: string;
    descriptionEn?: string;
    sortOrder?: number;
    isForceUse?: boolean;
    ownerType?: string;
    ownerId?: string;
    [key: string]: unknown;
  }) =>
    apiClient.post<any>(`/api/v1/configuration-entity/${entityType}`, data),

  // Get entity by ID
  get: (entityType: string, id: string) =>
    apiClient.get<any>(`/api/v1/configuration-entity/${entityType}/${id}`),

  // Update entity
  update: (entityType: string, id: string, data: { version: number; [key: string]: unknown }) =>
    apiClient.patch<any>(`/api/v1/configuration-entity/${entityType}/${id}`, data),

  // Deactivate entity
  deactivate: (entityType: string, id: string, version: number) =>
    apiClient.post<any>(`/api/v1/configuration-entity/${entityType}/${id}/deactivate`, { version }),

  // Reactivate entity
  reactivate: (entityType: string, id: string, version: number) =>
    apiClient.post<any>(`/api/v1/configuration-entity/${entityType}/${id}/reactivate`, { version }),
};

// Profile Store API (PII data storage configuration)
export const profileStoreApi = {
  // List profile stores
  list: (params?: { page?: number; pageSize?: number; includeInactive?: boolean }) =>
    apiClient.get<{ items: any[]; meta: any }>('/api/v1/profile-stores', params),

  // Get profile store by ID
  get: (id: string) =>
    apiClient.get<any>(`/api/v1/profile-stores/${id}`),

  // Create profile store
  create: (data: {
    code: string;
    nameEn: string;
    nameZh?: string;
    nameJa?: string;
    descriptionEn?: string;
    descriptionZh?: string;
    descriptionJa?: string;
    piiServiceConfigCode: string;
    isDefault?: boolean;
  }) =>
    apiClient.post<any>('/api/v1/profile-stores', data),

  // Update profile store
  update: (id: string, data: {
    nameEn?: string;
    nameZh?: string;
    nameJa?: string;
    descriptionEn?: string;
    descriptionZh?: string;
    descriptionJa?: string;
    piiServiceConfigCode?: string;
    isDefault?: boolean;
    isActive?: boolean;
    version: number;
  }) =>
    apiClient.patch<any>(`/api/v1/profile-stores/${id}`, data),
};

// PII Service Config API (PII proxy service configuration)
export const piiServiceConfigApi = {
  // List PII service configs
  list: (params?: { page?: number; pageSize?: number; includeInactive?: boolean }) =>
    apiClient.get<{ items: any[]; meta: any }>('/api/v1/pii-service-configs', params),

  // Get PII service config by ID
  get: (id: string) =>
    apiClient.get<any>(`/api/v1/pii-service-configs/${id}`),

  // Create PII service config
  create: (data: {
    code: string;
    nameEn: string;
    nameZh?: string;
    nameJa?: string;
    descriptionEn?: string;
    apiUrl: string;
    authType: 'mtls' | 'api_key';
    apiKey?: string;
    mtlsClientCert?: string;
    mtlsClientKey?: string;
    mtlsCaCert?: string;
    healthCheckUrl?: string;
    healthCheckIntervalSec?: number;
  }) =>
    apiClient.post<any>('/api/v1/pii-service-configs', data),

  // Update PII service config
  update: (id: string, data: {
    nameEn?: string;
    nameZh?: string;
    nameJa?: string;
    descriptionEn?: string;
    apiUrl?: string;
    authType?: 'mtls' | 'api_key';
    apiKey?: string;
    healthCheckUrl?: string;
    healthCheckIntervalSec?: number;
    isActive?: boolean;
    version: number;
  }) =>
    apiClient.patch<any>(`/api/v1/pii-service-configs/${id}`, data),

  // Test PII service connection
  testConnection: (id: string) =>
    apiClient.post<any>(`/api/v1/pii-service-configs/${id}/test`, {}),
};

// System Dictionary API (Read for all tenants, Write for AC only)
export const dictionaryApi = {
  // List dictionary types
  listTypes: () =>
    apiClient.get<any[]>('/api/v1/system-dictionary'),

  // Get dictionary items by type
  getByType: (type: string, params?: { search?: string; includeInactive?: boolean; page?: number; pageSize?: number }) =>
    apiClient.get<any[]>(`/api/v1/system-dictionary/${type}`, params),

  // Get single dictionary item
  getItem: (type: string, code: string) =>
    apiClient.get<any>(`/api/v1/system-dictionary/${type}/${code}`),

  // =====================================================
  // AC Tenant Only Operations
  // =====================================================

  // Create dictionary type (AC only)
  createType: (data: {
    code: string;
    nameEn: string;
    nameZh?: string;
    nameJa?: string;
    descriptionEn?: string;
    descriptionZh?: string;
    descriptionJa?: string;
    sortOrder?: number;
  }) =>
    apiClient.post<any>('/api/v1/system-dictionary', data),

  // Update dictionary type (AC only)
  updateType: (typeCode: string, data: {
    nameEn?: string;
    nameZh?: string;
    nameJa?: string;
    descriptionEn?: string;
    descriptionZh?: string;
    descriptionJa?: string;
    sortOrder?: number;
    version: number;
  }) =>
    apiClient.put<any>(`/api/v1/system-dictionary/${typeCode}`, data),

  // Create dictionary item (AC only)
  createItem: (typeCode: string, data: {
    code: string;
    nameEn: string;
    nameZh?: string;
    nameJa?: string;
    descriptionEn?: string;
    descriptionZh?: string;
    descriptionJa?: string;
    sortOrder?: number;
    extraData?: Record<string, unknown>;
  }) =>
    apiClient.post<any>(`/api/v1/system-dictionary/${typeCode}/items`, data),

  // Update dictionary item (AC only)
  updateItem: (typeCode: string, itemId: string, data: {
    nameEn?: string;
    nameZh?: string;
    nameJa?: string;
    descriptionEn?: string;
    descriptionZh?: string;
    descriptionJa?: string;
    sortOrder?: number;
    extraData?: Record<string, unknown>;
    version: number;
  }) =>
    apiClient.put<any>(`/api/v1/system-dictionary/${typeCode}/items/${itemId}`, data),

  // Deactivate dictionary item (AC only)
  deactivateItem: (typeCode: string, itemId: string, _version: number) =>
    apiClient.delete<any>(`/api/v1/system-dictionary/${typeCode}/items/${itemId}`),

  // Reactivate dictionary item (AC only)
  reactivateItem: (typeCode: string, itemId: string, version: number) =>
    apiClient.post<any>(`/api/v1/system-dictionary/${typeCode}/items/${itemId}/reactivate`, { version }),
};

// Integration API (API Consumers / Adapters)
export const integrationApi = {
  // Social Platforms (via Configuration Entity API)
  // Endpoint: /api/v1/configuration-entity/social-platform
  listPlatforms: () =>
    apiClient.get<any[]>('/api/v1/configuration-entity/social-platform'),

  createPlatform: (data: {
    code: string;
    displayName: string;
    nameEn: string;
    nameZh?: string;
    nameJa?: string;
    iconUrl?: string;
    baseUrl?: string;
    profileUrlTemplate?: string;
    color?: string;
    sortOrder?: number;
    isActive?: boolean;
  }) =>
    apiClient.post<any>('/api/v1/configuration-entity/social-platform', data),

  updatePlatform: (id: string, data: {
    displayName?: string;
    nameEn?: string;
    nameZh?: string;
    nameJa?: string;
    iconUrl?: string;
    baseUrl?: string;
    profileUrlTemplate?: string;
    color?: string;
    sortOrder?: number;
    isActive?: boolean;
    version: number;
  }) =>
    apiClient.patch<any>(`/api/v1/configuration-entity/social-platform/${id}`, data),

  deletePlatform: (id: string) =>
    apiClient.delete<any>(`/api/v1/configuration-entity/social-platform/${id}`),

  // Adapters (Consumers)
  listAdapters: () =>
    apiClient.get<any[]>('/api/v1/integration/adapters'),

  getAdapter: (id: string) =>
    apiClient.get<any>(`/api/v1/integration/adapters/${id}`),

  createAdapter: (data: { 
    platformId: string;
    code: string; 
    nameEn: string; 
    nameZh?: string;
    nameJa?: string; 
    adapterType: 'oauth' | 'api_key' | 'webhook';
    inherit?: boolean;
    ownerType?: 'tenant' | 'subsidiary' | 'talent';
    ownerId?: string;
  }) =>
    apiClient.post<any>('/api/v1/integration/adapters', data),

  updateAdapter: (id: string, data: { nameEn?: string; nameJa?: string; description?: string; version: number }) =>
    apiClient.patch<any>(`/api/v1/integration/adapters/${id}`, data),

  deactivateAdapter: (id: string) =>
    apiClient.post<any>(`/api/v1/integration/adapters/${id}/deactivate`, {}),

  reactivateAdapter: (id: string) =>
    apiClient.post<any>(`/api/v1/integration/adapters/${id}/reactivate`, {}),

  disableAdapter: (id: string, scopeType: string, scopeId: string) =>
    apiClient.post<any>(`/api/v1/integration/adapters/${id}/disable`, { scopeType, scopeId }),

  enableAdapter: (id: string, scopeType: string, scopeId: string) =>
    apiClient.post<any>(`/api/v1/integration/adapters/${id}/enable`, { scopeType, scopeId }),

  // Adapter Configs
  updateAdapterConfigs: (id: string, data: { configs: Array<{ configKey: string; configValue: string }>; adapterVersion: number }) =>
    apiClient.put<any>(`/api/v1/integration/adapters/${id}/configs`, data),

  revealConfig: (adapterId: string, configKey: string) =>
    apiClient.post<any>(`/api/v1/integration/adapters/${adapterId}/configs/${configKey}/reveal`, {}),

  // Webhooks
  listWebhooks: () =>
    apiClient.get<any[]>('/api/v1/integration/webhooks'),

  getWebhook: (id: string) =>
    apiClient.get<any>(`/api/v1/integration/webhooks/${id}`),

  getWebhookEvents: () =>
    apiClient.get<any[]>('/api/v1/integration/webhooks/events'),

  createWebhook: (data: { name: string; targetUrl: string; events: string[]; secret?: string }) =>
    apiClient.post<any>('/api/v1/integration/webhooks', {
      code: data.name.toUpperCase().replace(/\s+/g, '_'),
      nameEn: data.name,
      url: data.targetUrl,
      events: data.events,
      secret: data.secret,
    }),

  updateWebhook: (id: string, data: { name?: string; targetUrl?: string; events?: string[]; version: number }) =>
    apiClient.patch<any>(`/api/v1/integration/webhooks/${id}`, {
      nameEn: data.name,
      url: data.targetUrl,
      events: data.events,
      version: data.version,
    }),

  deleteWebhook: (id: string) =>
    apiClient.delete<any>(`/api/v1/integration/webhooks/${id}`),

  deactivateWebhook: (id: string) =>
    apiClient.post<any>(`/api/v1/integration/webhooks/${id}/deactivate`, {}),

  reactivateWebhook: (id: string) =>
    apiClient.post<any>(`/api/v1/integration/webhooks/${id}/reactivate`, {}),

  // Consumer API Key
  regenerateConsumerKey: (consumerId: string) =>
    apiClient.post<any>(`/api/v1/integration/consumers/${consumerId}/regenerate-key`, {}),
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
  }) =>
    apiClient.get<any>('/api/v1/logs/changes', { params }),

  // Technical Events
  getTechEvents: (params?: {
    scope?: string;
    severity?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) =>
    apiClient.get<any>('/api/v1/logs/events', { params }),

  // Integration Logs
  getIntegrationLogs: (params?: {
    direction?: string;
    status?: string;
    endpoint?: string;
    consumerId?: string;
    page?: number;
    pageSize?: number;
  }) =>
    apiClient.get<any>('/api/v1/logs/integrations', { params }),

  getIntegrationLogByTrace: (traceId: string) =>
    apiClient.get<any>(`/api/v1/logs/integrations/trace/${traceId}`),

  getFailedIntegrations: (params?: { page?: number; pageSize?: number }) =>
    apiClient.get<any>('/api/v1/logs/integrations/failed', { params }),

  // Loki Search
  searchLoki: (params: {
    query: string;
    timeRange: string;
    limit?: number;
    app?: string;
  }) =>
    apiClient.post<any>('/api/v1/logs/search', params),
};


// Subsidiary API
export const subsidiaryApi = {
  list: () =>
    apiClient.get<any[]>('/api/v1/subsidiaries'),

  get: (id: string) =>
    apiClient.get<any>(`/api/v1/subsidiaries/${id}`),

  create: (data: {
    code: string;
    nameEn: string;
    parentId?: string | null;
    nameZh?: string;
    nameJa?: string;
    descriptionEn?: string;
    sortOrder?: number;
  }) =>
    apiClient.post<any>('/api/v1/subsidiaries', data),

  update: (id: string, data: {
    nameEn?: string;
    nameZh?: string;
    nameJa?: string;
    descriptionEn?: string;
    sortOrder?: number;
    version: number;
  }) =>
    apiClient.patch<any>(`/api/v1/subsidiaries/${id}`, data),

  move: (id: string, data: { newParentId?: string | null; version: number }) =>
    apiClient.post<any>(`/api/v1/subsidiaries/${id}/move`, data),

  deactivate: (id: string, version: number) =>
    apiClient.post<any>(`/api/v1/subsidiaries/${id}/deactivate`, { version }),

  reactivate: (id: string, version: number) =>
    apiClient.post<any>(`/api/v1/subsidiaries/${id}/reactivate`, { version }),
};

// System User API (backend path: /system-users)
export const systemUserApi = {
  list: (params?: { search?: string; roleId?: string; isActive?: boolean; page?: number; pageSize?: number }) =>
    apiClient.get<any[]>('/api/v1/system-users', params),

  get: (id: string) =>
    apiClient.get<any>(`/api/v1/system-users/${id}`),

  create: (data: { username: string; email: string; password: string; displayName?: string; forceReset?: boolean }) =>
    apiClient.post<any>('/api/v1/system-users', data),

  update: (id: string, data: { displayName?: string; phone?: string; preferredLanguage?: string }) =>
    apiClient.patch<any>(`/api/v1/system-users/${id}`, data),

  resetPassword: (id: string, options?: { newPassword?: string; forceReset?: boolean }) =>
    apiClient.post<any>(`/api/v1/system-users/${id}/reset-password`, options || {}),

  deactivate: (id: string) =>
    apiClient.post<any>(`/api/v1/system-users/${id}/deactivate`, {}),

  reactivate: (id: string) =>
    apiClient.post<any>(`/api/v1/system-users/${id}/reactivate`, {}),

  getScopeAccess: (id: string) =>
    apiClient.get<Array<{ id: string; scopeType: string; scopeId: string | null; includeSubunits: boolean }>>(`/api/v1/system-users/${id}/scope-access`),

  setScopeAccess: (id: string, accesses: Array<{ scopeType: string; scopeId?: string; includeSubunits?: boolean }>) =>
    apiClient.post<any>(`/api/v1/system-users/${id}/scope-access`, { accesses }),
};

// Permission API
export const permissionApi = {
  list: (params?: { resourceCode?: string; action?: string; isActive?: boolean }) =>
    apiClient.get<any[]>('/api/v1/permissions', params),

  getResources: () =>
    apiClient.get<any[]>('/api/v1/permissions/resources'),
  
  check: (checks: Array<{ resource: string; action: string; scopeType?: string; scopeId?: string }>) =>
    apiClient.post<{ results: Array<{ resource: string; action: string; allowed: boolean }> }>('/api/v1/permissions/check', { checks }),

  // Get current user's effective permissions
  getMyPermissions: (params?: { scopeType?: string; scopeId?: string }) =>
    apiClient.get<{
      userId: string;
      scope: { type: string; id: string | null; name: string | null };
      permissions: Record<string, 'grant' | 'deny'>;
      roles: Array<{
        code: string;
        name: string;
        source: 'direct' | 'inherited';
        scopeType: string;
        scopeId: string | null;
      }>;
    }>('/api/v1/users/me/permissions', params),
};

// Delegated Admin API
export interface DelegatedAdmin {
  id: string;
  scopeType: 'subsidiary' | 'talent';
  scopeId: string;
  scopeName: string | null;
  delegateType: 'user' | 'role';
  delegateId: string;
  delegateName: string | null;
  grantedAt: string;
  grantedBy: {
    id: string;
    username: string | null;
  } | null;
}

export const delegatedAdminApi = {
  list: (params?: { scopeType?: 'subsidiary' | 'talent'; scopeId?: string }) =>
    apiClient.get<DelegatedAdmin[]>('/api/v1/delegated-admins', params),

  create: (data: {
    scopeType: 'subsidiary' | 'talent';
    scopeId: string;
    delegateType: 'user' | 'role';
    delegateId: string;
  }) =>
    apiClient.post<DelegatedAdmin>('/api/v1/delegated-admins', data),

  delete: (id: string) =>
    apiClient.delete<{ message: string }>(`/api/v1/delegated-admins/${id}`),

  getMyScopes: () =>
    apiClient.get<Array<{ scopeType: 'subsidiary' | 'talent'; scopeId: string }>>('/api/v1/delegated-admins/my-scopes'),
};

// System Role API
export const systemRoleApi = {
  list: (params?: { isActive?: boolean; isSystem?: boolean; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    if (params?.isSystem !== undefined) searchParams.set('isSystem', String(params.isSystem));
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return apiClient.get<any[]>(`/api/v1/system-roles${query ? `?${query}` : ''}`);
  },

  get: (id: string) =>
    apiClient.get<any>(`/api/v1/system-roles/${id}`),

  create: (data: { 
    code: string; 
    nameEn: string; 
    nameZh?: string; 
    nameJa?: string; 
    description?: string; 
    isActive?: boolean;
    permissions?: Array<{ resource: string; action: string }>;
  }) =>
    apiClient.post<any>('/api/v1/system-roles', data),

  update: (id: string, data: { 
    nameEn?: string; 
    nameZh?: string; 
    nameJa?: string; 
    description?: string; 
    isActive?: boolean;
    permissions?: Array<{ resource: string; action: string }>;
  }) =>
    apiClient.patch<any>(`/api/v1/system-roles/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<any>(`/api/v1/system-roles/${id}`),
};

// Auth extension API (missing endpoints)
export const authExtApi = {
  // Verify recovery code (alternative to TOTP)
  verifyRecoveryCode: (sessionToken: string, recoveryCode: string) =>
    apiClient.post<any>('/api/v1/auth/recovery-code/verify', { sessionToken, recoveryCode }),

  // Logout from all devices
  logoutAll: () =>
    apiClient.post<any>('/api/v1/auth/logout-all', {}),
};

// User Profile TOTP API
export const totpApi = {
  // Initialize TOTP setup
  setup: () =>
    apiClient.post<{ secret: string; qrCode: string; otpauthUrl: string }>('/api/v1/users/me/totp/setup', {}),

  // Enable TOTP (requires verification code)
  enable: (code: string) =>
    apiClient.post<{ enabled: boolean; recoveryCodes: string[] }>('/api/v1/users/me/totp/enable', { code }),

  // Disable TOTP
  disable: (password: string) =>
    apiClient.post<{ disabled: boolean }>('/api/v1/users/me/totp/disable', { password }),

  // Regenerate recovery codes
  regenerateRecoveryCodes: (password: string) =>
    apiClient.post<{ recoveryCodes: string[] }>('/api/v1/users/me/recovery-codes/regenerate', { password }),
};

// Scope Settings API (Hierarchical settings with inheritance)
export interface ScopeSettingsResponse {
  scopeType: 'tenant' | 'subsidiary' | 'talent';
  scopeId: string | null;
  settings: Record<string, unknown>;
  overrides: string[];
  inheritedFrom: Record<string, string>;
  version: number;
}

export const settingsApi = {
  // Get tenant settings
  getTenantSettings: () =>
    apiClient.get<ScopeSettingsResponse>('/api/v1/organization/settings'),

  // Update tenant settings
  updateTenantSettings: (settings: Record<string, unknown>, version: number) =>
    apiClient.put<ScopeSettingsResponse>('/api/v1/organization/settings', { settings, version }),

  // Get subsidiary settings (with inheritance)
  getSubsidiarySettings: (id: string) =>
    apiClient.get<ScopeSettingsResponse>(`/api/v1/subsidiaries/${id}/settings`),

  // Update subsidiary settings
  updateSubsidiarySettings: (id: string, settings: Record<string, unknown>, version: number) =>
    apiClient.put<ScopeSettingsResponse>(`/api/v1/subsidiaries/${id}/settings`, { settings, version }),

  // Reset subsidiary setting field to inherited value
  resetSubsidiarySetting: (id: string, field: string) =>
    apiClient.put<ScopeSettingsResponse>(`/api/v1/subsidiaries/${id}/settings/reset`, { field }),

  // Get talent settings (with inheritance)
  getTalentSettings: (id: string) =>
    apiClient.get<ScopeSettingsResponse>(`/api/v1/talents/${id}/settings`),

  // Update talent settings
  updateTalentSettings: (id: string, settings: Record<string, unknown>, version: number) =>
    apiClient.put<ScopeSettingsResponse>(`/api/v1/talents/${id}/settings`, { settings, version }),

  // Reset talent setting field to inherited value
  resetTalentSetting: (id: string, field: string) =>
    apiClient.put<ScopeSettingsResponse>(`/api/v1/talents/${id}/settings/reset`, { field }),
};

// System Dictionary API
export const systemDictionaryApi = {
  // Get dictionary by type
  get: (dictionaryType: string) =>
    apiClient.get<any>(`/api/v1/system-dictionary/${dictionaryType}`),
  
  // Get items for a dictionary type
  getItems: (dictionaryType: string, query?: { isActive?: boolean }) =>
    apiClient.get<any[]>(`/api/v1/system-dictionary/${dictionaryType}/items`, query),
};

// Configuration Entity API
export const configurationEntityApi = {
  // List configuration entities by type
  list: (entityType: string, query?: Record<string, any>) =>
    apiClient.get<any[]>(`/api/v1/configuration-entity/${entityType}`, query),
  
  // Get single configuration entity
  get: (entityType: string, id: string) =>
    apiClient.get<any>(`/api/v1/configuration-entity/${entityType}/${id}`),
  
  // Create configuration entity
  create: (entityType: string, data: Record<string, any>) =>
    apiClient.post<any>(`/api/v1/configuration-entity/${entityType}`, data),
  
  // Update configuration entity
  update: (entityType: string, id: string, data: Record<string, any>) =>
    apiClient.patch<any>(`/api/v1/configuration-entity/${entityType}/${id}`, data),
  
  // Delete/deactivate configuration entity
  delete: (entityType: string, id: string) =>
    apiClient.delete<any>(`/api/v1/configuration-entity/${entityType}/${id}`),

  // Get membership types by class ID
  getMembershipTypesByClass: (classId: string) =>
    apiClient.get<any[]>(`/api/v1/configuration-entity/membership-classes/${classId}/types`),

  // Get membership levels by type ID
  getMembershipLevelsByType: (typeId: string) =>
    apiClient.get<any[]>(`/api/v1/configuration-entity/membership-types/${typeId}/levels`),
};

// External Blocklist API (for URL/Domain filtering)
export interface ExternalBlocklistPattern {
  id: string;
  ownerType: 'tenant' | 'subsidiary' | 'talent';
  ownerId: string | null;
  pattern: string;
  patternType: 'domain' | 'url_regex' | 'keyword';
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  description: string | null;
  category: string | null;
  severity: 'low' | 'medium' | 'high';
  action: 'reject' | 'flag' | 'replace';
  replacement: string;
  inherit: boolean;
  sortOrder?: number;
  isActive: boolean;
  isForceUse?: boolean;
  isSystem?: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  // Inheritance metadata
  isInherited?: boolean;
  isDisabledHere?: boolean;
  canDisable?: boolean;
}

export const externalBlocklistApi = {
  // List patterns with filtering and inheritance support
  list: (query?: {
    scopeType?: 'tenant' | 'subsidiary' | 'talent';
    scopeId?: string;
    category?: string;
    includeInherited?: boolean;
    includeDisabled?: boolean;
    includeInactive?: boolean;
    page?: number;
    pageSize?: number;
    // Legacy params
    ownerType?: 'tenant' | 'subsidiary' | 'talent';
    ownerId?: string;
    isActive?: boolean;
  }) => {
    // Map legacy params to new params
    const params: Record<string, string> = {};
    if (query?.scopeType) params.scopeType = query.scopeType;
    else if (query?.ownerType) params.scopeType = query.ownerType;
    if (query?.scopeId) params.scopeId = query.scopeId;
    else if (query?.ownerId) params.scopeId = query.ownerId;
    if (query?.category) params.category = query.category;
    if (query?.includeInherited !== undefined) params.includeInherited = String(query.includeInherited);
    if (query?.includeDisabled !== undefined) params.includeDisabled = String(query.includeDisabled);
    if (query?.includeInactive !== undefined) params.includeInactive = String(query.includeInactive);
    if (query?.page) params.page = String(query.page);
    if (query?.pageSize) params.pageSize = String(query.pageSize);
    return apiClient.get<ExternalBlocklistPattern[]>('/api/v1/external-blocklist', params);
  },

  // Get patterns with inheritance for a specific scope
  getForScope: (scopeType: 'tenant' | 'subsidiary' | 'talent', scopeId: string) =>
    apiClient.get<ExternalBlocklistPattern[]>(`/api/v1/external-blocklist/scope/${scopeType}/${scopeId}`),

  // Get patterns with inheritance for a talent (legacy)
  getForTalent: (talentId: string) =>
    apiClient.get<ExternalBlocklistPattern[]>(`/api/v1/external-blocklist/talent/${talentId}`),

  // Get single pattern
  get: (id: string) =>
    apiClient.get<ExternalBlocklistPattern>(`/api/v1/external-blocklist/${id}`),

  // Create pattern
  create: (data: {
    ownerType: 'tenant' | 'subsidiary' | 'talent';
    ownerId?: string;
    pattern: string;
    patternType: 'domain' | 'url_regex' | 'keyword';
    nameEn: string;
    nameZh?: string;
    nameJa?: string;
    description?: string;
    category?: string;
    severity?: 'low' | 'medium' | 'high';
    action?: 'reject' | 'flag' | 'replace';
    replacement?: string;
    inherit?: boolean;
    sortOrder?: number;
    isForceUse?: boolean;
  }) =>
    apiClient.post<ExternalBlocklistPattern>('/api/v1/external-blocklist', data),

  // Update pattern
  update: (id: string, data: {
    pattern?: string;
    patternType?: 'domain' | 'url_regex' | 'keyword';
    nameEn?: string;
    nameZh?: string;
    nameJa?: string;
    description?: string;
    category?: string;
    severity?: 'low' | 'medium' | 'high';
    action?: 'reject' | 'flag' | 'replace';
    replacement?: string;
    inherit?: boolean;
    sortOrder?: number;
    isActive?: boolean;
    isForceUse?: boolean;
    version: number;
  }) =>
    apiClient.patch<ExternalBlocklistPattern>(`/api/v1/external-blocklist/${id}`, data),

  // Delete pattern
  delete: (id: string) =>
    apiClient.delete<{ message: string }>(`/api/v1/external-blocklist/${id}`),

  // Disable inherited pattern in current scope
  disable: (id: string, scope: { scopeType?: string; scopeId?: string }) =>
    apiClient.post<{ id: string; disabled: boolean }>(`/api/v1/external-blocklist/${id}/disable`, scope),

  // Enable previously disabled pattern in current scope
  enable: (id: string, scope: { scopeType?: string; scopeId?: string }) =>
    apiClient.post<{ id: string; enabled: boolean }>(`/api/v1/external-blocklist/${id}/enable`, scope),

  // Batch toggle active status
  batchToggle: (ids: string[], isActive: boolean) =>
    apiClient.post<{ updated: number }>('/api/v1/external-blocklist/batch-toggle', { ids, isActive }),
};

// Talent Domain API (for custom domain configuration)
export const talentDomainApi = {
  // Homepage domain
  setHomepageDomain: (talentId: string, customDomain: string | null) =>
    apiClient.post<{ customDomain: string | null; token: string | null; txtRecord: string | null }>(
      `/api/v1/talents/${talentId}/homepage/domain`,
      { customDomain }
    ),
  verifyHomepageDomain: (talentId: string) =>
    apiClient.post<{ verified: boolean; message: string }>(
      `/api/v1/talents/${talentId}/homepage/verify-domain`,
      {}
    ),

  // Marshmallow domain
  setMarshmallowDomain: (talentId: string, customDomain: string | null) =>
    apiClient.post<{ customDomain: string | null; token: string | null; txtRecord: string | null }>(
      `/api/v1/talents/${talentId}/marshmallow/config/domain`,
      { customDomain }
    ),
  verifyMarshmallowDomain: (talentId: string) =>
    apiClient.post<{ verified: boolean; message: string }>(
      `/api/v1/talents/${talentId}/marshmallow/config/verify-domain`,
      {}
    ),
};

// Platform Config API (for AC tenant admin)
export const platformConfigApi = {
  // Get platform config
  get: (key: string) =>
    apiClient.get<{ key: string; value: any }>(`/api/v1/platform/config/${key}`),

  // Update platform config (AC only)
  set: (key: string, value: any) =>
    apiClient.put<{ key: string; value: any }>(`/api/v1/platform/config/${key}`, { value }),
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
  create: (talentId: string, data: {
    format: 'csv' | 'json' | 'xlsx';
    status?: string[];
    startDate?: string;
    endDate?: string;
    includeRejected?: boolean;
  }) =>
    apiClient.post<{ jobId: string; status: string }>(`/api/v1/talents/${talentId}/marshmallow/export`, data),

  // Get job status
  get: (talentId: string, jobId: string) =>
    apiClient.get<MarshmallowExportJob>(`/api/v1/talents/${talentId}/marshmallow/export/${jobId}`),

  // Get download URL
  getDownloadUrl: (talentId: string, jobId: string) =>
    apiClient.get<{ url: string }>(`/api/v1/talents/${talentId}/marshmallow/export/${jobId}/download`),
};

// User Role API - for managing user role assignments
export const userRoleApi = {
  // Get user roles (optionally filtered by scope)
  getUserRoles: (userId: string, scopeType?: string, scopeId?: string) =>
    apiClient.get<any[]>(`/api/v1/users/${userId}/roles`, { scopeType, scopeId }),

  // Assign role to user
  assignRole: (userId: string, data: {
    roleId?: string;
    roleCode?: string;
    scopeType: string;
    scopeId?: string;
    inherit?: boolean;
  }) => {
    // Build payload, only include roleId/roleCode if they have actual values
    const payload: Record<string, unknown> = {
      scopeType: data.scopeType,
      scopeId: data.scopeId,
      inherit: data.inherit,
    };
    if (data.roleCode && data.roleCode.trim()) {
      payload.roleCode = data.roleCode.trim();
    }
    if (data.roleId && data.roleId.trim()) {
      payload.roleId = data.roleId.trim();
    }
    return apiClient.post<any>(`/api/v1/users/${userId}/roles`, payload);
  },

  // Remove role assignment
  removeRole: (userId: string, assignmentId: string) =>
    apiClient.delete<any>(`/api/v1/users/${userId}/roles/${assignmentId}`),

  // Update role inheritance
  updateRoleInherit: (userId: string, assignmentId: string, inherit: boolean) =>
    apiClient.patch<any>(`/api/v1/users/${userId}/roles/${assignmentId}`, { inherit }),
};

// Email Configuration API - for AC tenant to manage email settings
export interface EmailConfigResponse {
  provider: 'tencent_ses' | 'smtp';
  tencentSes?: {
    secretId: string;
    secretKey: string;
    region: string;
    fromAddress: string;
    fromName: string;
    replyTo?: string;
  };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromAddress: string;
    fromName: string;
  };
  isConfigured: boolean;
  lastUpdated?: string;
}

export interface SaveEmailConfigPayload {
  provider: 'tencent_ses' | 'smtp';
  tencentSes?: {
    secretId: string;
    secretKey: string;
    region: string;
    fromAddress: string;
    fromName: string;
    replyTo?: string;
  };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromAddress: string;
    fromName: string;
  };
}

export interface EmailTestResult {
  success: boolean;
  message: string;
  error?: string;
}

export const emailConfigApi = {
  // Get email configuration (masked)
  get: () =>
    apiClient.get<EmailConfigResponse>('/api/v1/email/config'),

  // Save email configuration
  save: (config: SaveEmailConfigPayload) =>
    apiClient.put<EmailConfigResponse>('/api/v1/email/config', config),

  // Test connection
  testConnection: () =>
    apiClient.post<EmailTestResult>('/api/v1/email/config/test-connection', {}),

  // Send test email
  test: (testEmail: string) =>
    apiClient.post<EmailTestResult>('/api/v1/email/config/test', { testEmail }),
};
