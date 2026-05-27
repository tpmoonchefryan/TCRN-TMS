import type { LocalizedText } from '@tcrn/shared';

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

export interface TenantCapabilitySummary {
  enabledCapabilityCodes: string[];
  labels: LocalizedText[];
  displayLabels: string[];
}

export interface TenantCapabilitiesDigest {
  enabledCapabilityCodes: string[];
  summary: TenantCapabilitySummary;
  registryVersion: string;
  version: number;
}

export interface TenantListItem {
  id: string;
  code: string;
  name: string;
  schemaName: string;
  tier: 'ac' | 'standard';
  isActive: boolean;
  settings: Record<string, unknown>;
  capabilities: TenantCapabilitiesDigest;
  stats: TenantStats;
  createdAt: string;
  updatedAt: string;
}

export type TenantDetail = TenantListItem;

export interface TenantActivationResult {
  id: string;
  isActive: boolean;
}

export type ManagedSendingDomainStatus = 'pending_dns' | 'verified' | 'disabled';

export interface ManagedSendingDomainDnsRecord {
  type: 'TXT';
  host: string;
  value: string;
}

export interface ManagedSendingDomain {
  id: string;
  domain: string;
  status: ManagedSendingDomainStatus;
  dnsRecords: ManagedSendingDomainDnsRecord[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TenantSendingDomainsResponse {
  tenantId: string;
  domains: ManagedSendingDomain[];
  defaultDomainId: string | null;
}

export interface ModuleCapabilityDefinition {
  code: string;
  moduleCode: string;
  label: LocalizedText;
  description: LocalizedText;
  status: 'active' | 'deprecated' | 'future';
  assignable: boolean;
  assignmentScope: 'system' | 'ac' | 'tenant';
  runtimeScopes: string[];
  dependencies: string[];
  conflicts: string[];
  menuBindings: string[];
  apiBindings: string[];
  settingsBindings: string[];
  migrationAliases: string[];
  defaultEnabledForStandardTenant: boolean;
  sortOrder: number;
}

export interface ModuleCapabilityRegistry {
  registryVersion: string;
  modules: Array<{
    code: string;
    label: LocalizedText;
    description: LocalizedText;
    sortOrder: number;
  }>;
  capabilities: ModuleCapabilityDefinition[];
}

export interface TenantCapabilityAssignmentView {
  capabilityCode: string;
  moduleCode: string;
  label: LocalizedText;
  description: LocalizedText;
  assignable: boolean;
  editable: boolean;
  enabled: boolean;
  lockedReason: string | null;
  source: string | null;
  updatedAt: string | null;
  note: string | null;
}

export interface TenantCapabilityReadback {
  tenantId: string;
  version: number;
  assignments: TenantCapabilityAssignmentView[];
  effective: {
    tenantId: string;
    scopeType: string;
    scopeId: string | null;
    enabledCapabilityCodes: string[];
    registryVersion: string;
    resolvedAt: string;
    summary: TenantCapabilitySummary;
  };
  registryVersion: string;
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
  };
  enabledCapabilityCodes?: string[];
}

export interface UpdateTenantPayload {
  name?: string;
  settings?: {
    maxTalents?: number;
    maxCustomersPerTalent?: number;
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

export async function listTenants(
  requestEnvelope: RequestEnvelopeFn,
  options: ListTenantsOptions = {}
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

export function readModuleCapabilityRegistry(request: RequestFn) {
  return request<ModuleCapabilityRegistry>('/api/v1/module-capabilities/registry');
}

export function readTenantCapabilities(request: RequestFn, tenantId: string) {
  return request<TenantCapabilityReadback>(`/api/v1/tenants/${tenantId}/capabilities`);
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

export function replaceTenantCapabilities(
  request: RequestFn,
  tenantId: string,
  payload: {
    enabledCapabilityCodes: string[];
    version: number;
    note?: string;
  }
) {
  return request<TenantCapabilityReadback>(`/api/v1/tenants/${tenantId}/capabilities`, {
    method: 'PUT',
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

export function deactivateTenant(request: RequestFn, tenantId: string, reason?: string) {
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

export function readTenantSendingDomains(request: RequestFn, tenantId: string) {
  return request<TenantSendingDomainsResponse>(`/api/v1/email/tenants/${tenantId}/sending-domains`);
}

export function updateTenantSendingDomains(
  request: RequestFn,
  tenantId: string,
  payload: {
    domains: Array<{
      id?: string;
      domain: string;
      status: ManagedSendingDomainStatus;
    }>;
    defaultDomainId?: string | null;
  }
) {
  return request<TenantSendingDomainsResponse>(
    `/api/v1/email/tenants/${tenantId}/sending-domains`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );
}
