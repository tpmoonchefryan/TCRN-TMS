import {
  type ApiSuccessEnvelope,
  type PaginatedResult,
  resolveApiPagination,
} from '@/platform/http/api';

export type CustomerProfileType = 'individual' | 'company';

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

export interface CustomerListItem {
  id: string;
  profileType: CustomerProfileType;
  nickname: string;
  primaryLanguage: string | null;
  status: CustomerStatusSummary | null;
  tags: string[];
  isActive: boolean;
  companyShortName: string | null;
  originTalent: {
    id: string;
    displayName: string;
  } | null;
  membershipSummary: CustomerMembershipSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDetailResponse {
  id: string;
  profileType: CustomerProfileType;
  nickname: string;
  isActive: boolean;
  version: number;
}

export interface CustomerActivationResponse {
  id: string;
  isActive: boolean;
}

interface CustomerCreateBaseInput {
  nickname: string;
  primaryLanguage?: string;
  statusCode?: string;
  tags?: string[];
  source?: string;
  notes?: string;
  externalId?: string;
  consumerCode?: string;
}

export type CreateIndividualCustomerInput = CustomerCreateBaseInput;

export interface CreateCompanyCustomerInput extends CustomerCreateBaseInput {
  companyLegalName: string;
  companyShortName?: string;
  registrationNumber?: string;
  vatId?: string;
  establishmentDate?: string;
  businessSegmentCode?: string;
  website?: string;
}

export interface CustomerCreateResponse {
  id: string;
  nickname: string;
  profileType: CustomerProfileType;
  createdAt: string;
}

export interface CustomerSocialPlatformOption {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  nameZh?: string | null;
  nameJa?: string | null;
  isActive: boolean;
}

export interface CustomerMembershipLevelOption {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  nameZh?: string | null;
  nameJa?: string | null;
  typeId: string;
  rank: number;
  color: string | null;
  badgeUrl: string | null;
  isActive: boolean;
}

export interface CustomerMembershipTypeOption {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  nameZh?: string | null;
  nameJa?: string | null;
  classId: string;
  externalControl: boolean;
  defaultRenewalDays: number;
  isActive: boolean;
  levels: CustomerMembershipLevelOption[];
}

export interface CustomerMembershipClassOption {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  nameZh?: string | null;
  nameJa?: string | null;
  isActive: boolean;
  types: CustomerMembershipTypeOption[];
}

export interface CreateCustomerMembershipInput {
  platformCode: string;
  membershipLevelCode: string;
  validFrom: string;
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
  note: string | null;
  createdAt: string;
}

export interface ListCustomersOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  hasMembership?: boolean;
}

interface DeactivateCustomerInput {
  version: number;
  reasonCode?: string;
}

type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;
type RequestEnvelopeFn = <T>(path: string, init?: RequestInit) => Promise<ApiSuccessEnvelope<T>>;

const CONFIGURATION_ENTITY_PAGE_SIZE = 100;
const MAX_CONFIGURATION_ENTITY_PAGES = 100;

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

export function listCustomers(
  requestEnvelope: RequestEnvelopeFn,
  talentId: string,
  options: ListCustomersOptions = {},
) : Promise<PaginatedResult<CustomerListItem>> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const query = buildQueryString({
    page,
    pageSize,
    search: options.search,
    isActive: options.isActive,
    hasMembership: options.hasMembership,
  });

  return requestEnvelope<CustomerListItem[]>(`/api/v1/talents/${talentId}/customers${query}`).then((envelope) => ({
    items: envelope.data,
    pagination: resolveApiPagination(envelope.meta, page, pageSize, envelope.data.length),
  }));
}

export function readCustomerDetail(request: RequestFn, talentId: string, customerId: string) {
  return request<CustomerDetailResponse>(`/api/v1/talents/${talentId}/customers/${customerId}`);
}

export function deactivateCustomer(
  request: RequestFn,
  talentId: string,
  customerId: string,
  input: DeactivateCustomerInput,
) {
  return request<CustomerActivationResponse>(`/api/v1/talents/${talentId}/customers/${customerId}/deactivate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export function reactivateCustomer(request: RequestFn, talentId: string, customerId: string) {
  return request<CustomerActivationResponse>(`/api/v1/talents/${talentId}/customers/${customerId}/reactivate`, {
    method: 'POST',
  });
}

export function createIndividualCustomer(
  request: RequestFn,
  talentId: string,
  input: CreateIndividualCustomerInput,
) {
  return request<CustomerCreateResponse>(`/api/v1/talents/${talentId}/customers/individuals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export function createCompanyCustomer(
  request: RequestFn,
  talentId: string,
  input: CreateCompanyCustomerInput,
) {
  return request<CustomerCreateResponse>(`/api/v1/talents/${talentId}/customers/companies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export async function listCustomerSocialPlatforms(request: RequestFn): Promise<CustomerSocialPlatformOption[]> {
  const items: CustomerSocialPlatformOption[] = [];

  for (let page = 1; page <= MAX_CONFIGURATION_ENTITY_PAGES; page += 1) {
    const batch = await request<CustomerSocialPlatformOption[]>(
      `/api/v1/configuration-entity/social-platform${buildQueryString({
        page,
        pageSize: CONFIGURATION_ENTITY_PAGE_SIZE,
      })}`,
    );

    items.push(...batch);

    if (batch.length < CONFIGURATION_ENTITY_PAGE_SIZE) {
      break;
    }
  }

  return items.filter((item) => item.isActive);
}

export function listCustomerMembershipTree(
  request: RequestFn,
  talentId: string,
) {
  return request<CustomerMembershipClassOption[]>(
    `/api/v1/configuration-entity/membership-tree${buildQueryString({
      scopeType: 'talent',
      scopeId: talentId,
    })}`,
  );
}

export function createCustomerMembership(
  request: RequestFn,
  talentId: string,
  customerId: string,
  input: CreateCustomerMembershipInput,
) {
  return request<CustomerMembershipCreateResponse>(
    `/api/v1/talents/${talentId}/customers/${customerId}/memberships`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  );
}
