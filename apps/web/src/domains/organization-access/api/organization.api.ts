export interface OrganizationTalent {
  id: string;
  code: string;
  name: string;
  displayName: string;
  avatarUrl: string | null;
  subsidiaryId: string | null;
  subsidiaryName?: string | null;
  path: string;
  homepagePath: string | null;
  lifecycleStatus: 'draft' | 'published' | 'disabled';
  publishedAt: string | null;
  isActive: boolean;
}

export interface OrganizationNode {
  id: string;
  code: string;
  displayName: string;
  parentId: string | null;
  path: string;
  talents: OrganizationTalent[];
  children: OrganizationNode[];
}

export interface OrganizationTreeResponse {
  tenantId: string;
  subsidiaries: OrganizationNode[];
  directTalents: OrganizationTalent[];
}

export interface OrganizationTreeOptions {
  includeInactive?: boolean;
  search?: string;
}

export interface CreateOrganizationTalentInput {
  subsidiaryId?: string | null;
  profileStoreId: string;
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  translations?: Record<string, string>;
  displayName: string;
  timezone?: string;
}

export interface OrganizationTalentCreateResponse {
  id: string;
  subsidiaryId: string | null;
  code: string;
  path: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  translations: Record<string, string>;
  name: string;
  displayName: string;
  avatarUrl: string | null;
  homepagePath: string | null;
  timezone: string | null;
  lifecycleStatus: 'draft' | 'published' | 'disabled';
  publishedAt: string | null;
  publishedBy: string | null;
  isActive: boolean;
  createdAt: string;
  version: number;
}

export interface OrganizationTalentLifecycleResponse {
  id: string;
  lifecycleStatus: 'draft' | 'published' | 'disabled';
  publishedAt: string | null;
  publishedBy: string | null;
  isActive: boolean;
  version: number;
}

export interface OrganizationTalentLifecycleInput {
  version: number;
}

export interface CreateOrganizationSubsidiaryInput {
  parentId?: string | null;
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  translations?: Record<string, string>;
  descriptionEn?: string;
  descriptionZh?: string;
  descriptionJa?: string;
  sortOrder?: number;
}

export interface OrganizationSubsidiaryCreateResponse {
  id: string;
  parentId: string | null;
  code: string;
  path: string;
  depth: number;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  translations: Record<string, string>;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  version: number;
}

type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

function buildJsonRequestInit(method: 'POST' | 'PATCH', body?: unknown): RequestInit {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

export function readOrganizationTree(
  request: RequestFn,
  options: OrganizationTreeOptions = {},
) {
  const params = new URLSearchParams();
  params.set('includeInactive', String(options.includeInactive ?? false));
  if (options.search) {
    params.set('search', options.search);
  }

  return request<OrganizationTreeResponse>(
    `/api/v1/organization/tree?${params.toString()}`,
  );
}

export function createOrganizationTalent(
  request: RequestFn,
  input: CreateOrganizationTalentInput,
) {
  return request<OrganizationTalentCreateResponse>(
    '/api/v1/talents',
    buildJsonRequestInit('POST', input),
  );
}

export function createOrganizationSubsidiary(
  request: RequestFn,
  input: CreateOrganizationSubsidiaryInput,
) {
  return request<OrganizationSubsidiaryCreateResponse>(
    '/api/v1/subsidiaries',
    buildJsonRequestInit('POST', input),
  );
}

export function disableOrganizationTalent(
  request: RequestFn,
  talentId: string,
  input: OrganizationTalentLifecycleInput,
) {
  return request<OrganizationTalentLifecycleResponse>(
    `/api/v1/talents/${talentId}/disable`,
    buildJsonRequestInit('POST', input),
  );
}

export function reEnableOrganizationTalent(
  request: RequestFn,
  talentId: string,
  input: OrganizationTalentLifecycleInput,
) {
  return request<OrganizationTalentLifecycleResponse>(
    `/api/v1/talents/${talentId}/re-enable`,
    buildJsonRequestInit('POST', input),
  );
}
