import {
  type ApiSuccessEnvelope,
  type PaginatedResult,
  resolveApiPagination,
} from '@/platform/http/api';

export interface TenantStats {
  subsidiaryCount: number;
  talentCount: number;
  userCount: number;
}

export interface TenantListItem {
  id: string;
  code: string;
  name: string;
  schemaName: string;
  tier: 'ac' | 'standard';
  isActive: boolean;
  settings: Record<string, unknown>;
  stats: TenantStats;
  createdAt: string;
  updatedAt: string;
}

export type TenantDetail = TenantListItem;

export interface TenantActivationResult {
  id: string;
  isActive: boolean;
}

export interface CreateTenantPayload {
  code: string;
  name: string;
  adminUser: {
    username: string;
    email: string;
    password: string;
    displayName?: string;
  };
  settings?: {
    maxTalents?: number;
    maxCustomersPerTalent?: number;
    features?: string[];
  };
}

export interface UpdateTenantPayload {
  name?: string;
  settings?: {
    maxTalents?: number;
    maxCustomersPerTalent?: number;
    features?: string[];
  };
  version?: number;
}

export interface ListTenantsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  tier?: 'ac' | 'standard';
  isActive?: boolean;
}

type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;
type RequestEnvelopeFn = <T>(path: string, init?: RequestInit) => Promise<ApiSuccessEnvelope<T>>;

function buildQueryString(
  input: Record<string, string | number | boolean | null | undefined>,
) {
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

export async function listTenants(
  requestEnvelope: RequestEnvelopeFn,
  options: ListTenantsOptions = {},
): Promise<PaginatedResult<TenantListItem>> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const query = buildQueryString({
    page,
    pageSize,
    search: options.search,
    tier: options.tier,
    isActive: options.isActive,
  });

  const envelope = await requestEnvelope<TenantListItem[]>(`/api/v1/tenants${query}`);

  return {
    items: envelope.data,
    pagination: resolveApiPagination(envelope.meta, page, pageSize, envelope.data.length),
  };
}

export function readTenant(request: RequestFn, tenantId: string) {
  return request<TenantDetail>(`/api/v1/tenants/${tenantId}`);
}

export function createTenant(request: RequestFn, payload: CreateTenantPayload) {
  return request<TenantListItem>('/api/v1/tenants', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export function updateTenant(request: RequestFn, tenantId: string, payload: UpdateTenantPayload) {
  return request<TenantDetail>(`/api/v1/tenants/${tenantId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export function activateTenant(request: RequestFn, tenantId: string) {
  return request<TenantActivationResult>(`/api/v1/tenants/${tenantId}/activate`, {
    method: 'POST',
  });
}

export function deactivateTenant(
  request: RequestFn,
  tenantId: string,
  reason?: string,
) {
  return request<TenantActivationResult>(`/api/v1/tenants/${tenantId}/deactivate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reason,
    }),
  });
}
