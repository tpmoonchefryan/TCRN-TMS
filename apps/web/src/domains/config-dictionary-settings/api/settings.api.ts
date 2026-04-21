import { normalizeSupportedUiLocale, type SupportedUiLocale } from '@tcrn/shared';

import {
  type ApiSuccessEnvelope,
  type PaginatedResult,
  resolveApiPagination,
} from '@/platform/http/api';

export interface ScopeSettingsResponse {
  scopeType: 'tenant' | 'subsidiary' | 'talent';
  scopeId: string | null;
  settings: Record<string, unknown>;
  overrides: string[];
  inheritedFrom: Record<string, string>;
  version: number;
}

export type TalentLifecycleStatus = 'draft' | 'published' | 'disabled';

export interface ProfileStoreListItem {
  id: string;
  code: string;
  name: string;
  nameZh: string | null;
  nameJa: string | null;
  translations: Record<string, string>;
  talentCount: number;
  customerCount: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  version: number;
}

export interface ProfileStoreListResponse {
  items: ProfileStoreListItem[];
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

export interface ProfileStoreDetailResponse {
  id: string;
  code: string;
  name: string;
  nameZh: string | null;
  nameJa: string | null;
  translations: Record<string, string>;
  description: string | null;
  descriptionZh: string | null;
  descriptionJa: string | null;
  descriptionTranslations: Record<string, string>;
  talentCount: number;
  customerCount: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CreateProfileStoreInput {
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  translations?: Record<string, string>;
  descriptionEn?: string;
  descriptionZh?: string;
  descriptionJa?: string;
  descriptionTranslations?: Record<string, string>;
  isDefault?: boolean;
}

export interface UpdateProfileStoreInput {
  nameEn?: string;
  nameZh?: string;
  nameJa?: string;
  translations?: Record<string, string>;
  descriptionEn?: string;
  descriptionZh?: string;
  descriptionJa?: string;
  descriptionTranslations?: Record<string, string>;
  isDefault?: boolean;
  isActive?: boolean;
  version: number;
}

export interface ProfileStoreCreateResponse {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ProfileStoreUpdateResponse {
  id: string;
  code: string;
  version: number;
  updatedAt: string;
}

export type ConfigEntityScopeType = 'tenant' | 'subsidiary' | 'talent';

export type ScopedConfigEntityType =
  | 'channel-category'
  | 'business-segment'
  | 'communication-type'
  | 'address-type'
  | 'customer-status'
  | 'reason-category'
  | 'inactivation-reason'
  | 'membership-class'
  | 'membership-type'
  | 'membership-level'
  | 'consent';

export interface ConfigEntityRecord {
  id: string;
  ownerType: ConfigEntityScopeType | null;
  ownerId: string | null;
  code: string | null;
  name: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  translations: Record<string, string>;
  description: string | null;
  descriptionEn: string | null;
  descriptionZh: string | null;
  descriptionJa: string | null;
  descriptionTranslations: Record<string, string>;
  sortOrder: number;
  isActive: boolean;
  isForceUse: boolean;
  isSystem: boolean;
  isInherited: boolean;
  isDisabledHere: boolean;
  canDisable: boolean;
  extraData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  contentTranslations?: Record<string, string>;
  color?: string | null;
  channelCategoryId?: string | null;
  reasonCategoryId?: string | null;
  consentVersion?: string | null;
  effectiveFrom?: string | null;
  expiresAt?: string | null;
  contentMarkdownEn?: string | null;
  contentMarkdownZh?: string | null;
  contentMarkdownJa?: string | null;
  contentUrl?: string | null;
  isRequired?: boolean;
  membershipClassId?: string | null;
  membershipTypeId?: string | null;
  externalControl?: boolean;
  defaultRenewalDays?: number | null;
  rank?: number | null;
  badgeUrl?: string | null;
  [key: string]: unknown;
}

export interface ListConfigEntitiesOptions {
  scopeType: ConfigEntityScopeType;
  scopeId?: string;
  includeInherited?: boolean;
  includeDisabled?: boolean;
  includeInactive?: boolean;
  ownerOnly?: boolean;
  search?: string;
  parentId?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
}

export interface CreateConfigEntityInput {
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  translations?: Record<string, string>;
  descriptionEn?: string;
  descriptionZh?: string;
  descriptionJa?: string;
  descriptionTranslations?: Record<string, string>;
  sortOrder?: number;
  ownerType?: ConfigEntityScopeType;
  ownerId?: string;
  color?: string;
  channelCategoryId?: string;
  reasonCategoryId?: string;
  membershipClassId?: string;
  membershipTypeId?: string;
  externalControl?: boolean;
  defaultRenewalDays?: number;
  rank?: number;
  badgeUrl?: string;
  consentVersion?: string;
  effectiveFrom?: string;
  expiresAt?: string;
  contentMarkdownEn?: string;
  contentMarkdownZh?: string;
  contentMarkdownJa?: string;
  contentTranslations?: Record<string, string>;
  contentUrl?: string;
  isRequired?: boolean;
}

export interface UpdateConfigEntityInput extends Omit<CreateConfigEntityInput, 'code' | 'ownerType' | 'ownerId'> {
  version: number;
}

export interface SubsidiaryDetailResponse {
  id: string;
  parentId: string | null;
  code: string;
  path: string;
  depth: number;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  name: string;
  descriptionEn: string | null;
  descriptionZh: string | null;
  descriptionJa: string | null;
  sortOrder: number;
  isActive: boolean;
  childrenCount: number;
  talentCount: number;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface TalentProfileStoreBinding {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  translations: Record<string, string>;
  isDefault: boolean;
  piiProxyUrl: string | null;
}

export interface TalentDetailStats {
  customerCount: number;
  homepageVersionCount: number;
  marshmallowMessageCount: number;
}

export interface TalentExternalPagesDomain {
  homepage?: {
    isPublished?: boolean;
  };
  marshmallow?: {
    isEnabled?: boolean;
  };
}

export interface TalentDetailResponse {
  id: string;
  subsidiaryId: string | null;
  profileStoreId: string | null;
  profileStore: TalentProfileStoreBinding | null;
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
  timezone: string | null;
  lifecycleStatus: TalentLifecycleStatus;
  publishedAt: string | null;
  publishedBy: string | null;
  isActive: boolean;
  settings: Record<string, unknown>;
  stats: TalentDetailStats;
  externalPagesDomain: TalentExternalPagesDomain;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface TalentPublishReadinessIssue {
  code: string;
  message: string;
}

export interface TalentPublishReadinessResponse {
  id: string;
  lifecycleStatus: TalentLifecycleStatus;
  targetState: string;
  recommendedAction: string;
  canEnterPublishedState: boolean;
  blockers: TalentPublishReadinessIssue[];
  warnings: TalentPublishReadinessIssue[];
  version: number;
}

export interface TalentLifecycleMutationInput {
  version: number;
}

export interface TalentLifecycleMutationResponse {
  id: string;
  lifecycleStatus: TalentLifecycleStatus;
  publishedAt: string | null;
  publishedBy: string | null;
  isActive: boolean;
  version: number;
}

export interface TenantSettingsDraft {
  defaultLanguage: SupportedUiLocale;
  timezone: string;
  allowCustomHomepage: boolean;
}

export type SubsidiarySettingsDraft = TenantSettingsDraft;
export type TalentSettingsDraft = TenantSettingsDraft;

export interface UpdateSettingsInput {
  settings: Record<string, unknown>;
  version: number;
}

export interface ProfileStoreListOptions {
  page?: number;
  pageSize?: number;
  includeInactive?: boolean;
  search?: string;
}

type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;
export type RequestEnvelopeFn = <T>(path: string, init?: RequestInit) => Promise<ApiSuccessEnvelope<T>>;

function readString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function buildJsonRequestInit(method: 'POST' | 'PATCH', body?: unknown): RequestInit {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

function withLocaleHeaders(locale?: string, headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);

  if (locale) {
    nextHeaders.set('Accept-Language', locale);
  }

  return nextHeaders;
}

function buildQueryString(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    query.set(key, String(value));
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export function buildTenantSettingsDraft(settings: Record<string, unknown>): TenantSettingsDraft {
  return {
    defaultLanguage: normalizeSupportedUiLocale(readString(settings.defaultLanguage, 'zh_HANS')) ?? 'zh_HANS',
    timezone: readString(settings.timezone, 'Asia/Shanghai'),
    allowCustomHomepage: settings.allowCustomHomepage !== false,
  };
}

export const buildTalentSettingsDraft = buildTenantSettingsDraft;
export const buildSubsidiarySettingsDraft = buildTenantSettingsDraft;

export function buildTenantSettingsUpdatePayload(draft: TenantSettingsDraft): Record<string, unknown> {
  return {
    defaultLanguage: draft.defaultLanguage,
    timezone: draft.timezone,
    allowCustomHomepage: draft.allowCustomHomepage,
  };
}

export const buildTalentSettingsUpdatePayload = buildTenantSettingsUpdatePayload;
export const buildSubsidiarySettingsUpdatePayload = buildTenantSettingsUpdatePayload;

export function isTenantSettingsDraftDirty(source: TenantSettingsDraft, draft: TenantSettingsDraft) {
  return (
    source.defaultLanguage !== draft.defaultLanguage ||
    source.timezone !== draft.timezone ||
    source.allowCustomHomepage !== draft.allowCustomHomepage
  );
}

export const isTalentSettingsDraftDirty = isTenantSettingsDraftDirty;
export const isSubsidiarySettingsDraftDirty = isTenantSettingsDraftDirty;

export function readTenantSettings(request: RequestFn) {
  return request<ScopeSettingsResponse>('/api/v1/organization/settings');
}

export function updateTenantSettings(request: RequestFn, input: UpdateSettingsInput) {
  return request<ScopeSettingsResponse>('/api/v1/organization/settings', buildJsonRequestInit('PATCH', input));
}

export function listProfileStores(request: RequestFn, options: ProfileStoreListOptions = {}) {
  const params = new URLSearchParams();
  params.set('page', String(options.page ?? 1));
  params.set('pageSize', String(options.pageSize ?? 20));
  if (options.includeInactive !== undefined) {
    params.set('includeInactive', String(options.includeInactive));
  }
  if (options.search?.trim()) {
    params.set('search', options.search.trim());
  }

  return request<ProfileStoreListResponse>(`/api/v1/profile-stores?${params.toString()}`);
}

export function readProfileStoreDetail(request: RequestFn, profileStoreId: string) {
  return request<ProfileStoreDetailResponse>(`/api/v1/profile-stores/${profileStoreId}`);
}

export function createProfileStore(request: RequestFn, input: CreateProfileStoreInput) {
  return request<ProfileStoreCreateResponse>('/api/v1/profile-stores', buildJsonRequestInit('POST', input));
}

export function updateProfileStore(
  request: RequestFn,
  profileStoreId: string,
  input: UpdateProfileStoreInput,
) {
  return request<ProfileStoreUpdateResponse>(
    `/api/v1/profile-stores/${profileStoreId}`,
    buildJsonRequestInit('PATCH', input),
  );
}

export function listConfigEntities(
  request: RequestFn,
  entityType: ScopedConfigEntityType,
  options: ListConfigEntitiesOptions,
  locale?: string,
) {
  return request<ConfigEntityRecord[]>(
    `/api/v1/configuration-entity/${entityType}${buildQueryString({
      scopeType: options.scopeType,
      scopeId: options.scopeId,
      includeInherited: options.includeInherited,
      includeDisabled: options.includeDisabled,
      includeInactive: options.includeInactive,
      ownerOnly: options.ownerOnly,
      search: options.search,
      parentId: options.parentId,
      page: options.page,
      pageSize: options.pageSize,
      sort: options.sort,
    })}`,
    {
      headers: withLocaleHeaders(locale),
    },
  );
}

const CONFIG_ENTITY_BULK_PAGE_SIZE = 100;
const MAX_CONFIG_ENTITY_BULK_PAGES = 100;

export async function listConfigEntitiesPage(
  requestEnvelope: RequestEnvelopeFn,
  entityType: ScopedConfigEntityType,
  options: ListConfigEntitiesOptions,
  locale?: string,
): Promise<PaginatedResult<ConfigEntityRecord>> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const query = buildQueryString({
    scopeType: options.scopeType,
    scopeId: options.scopeId,
    includeInherited: options.includeInherited,
    includeDisabled: options.includeDisabled,
    includeInactive: options.includeInactive,
    ownerOnly: options.ownerOnly,
    search: options.search,
    parentId: options.parentId,
    page,
    pageSize,
    sort: options.sort,
  });

  const envelope = await requestEnvelope<ConfigEntityRecord[]>(
    `/api/v1/configuration-entity/${entityType}${query}`,
    {
      headers: withLocaleHeaders(locale),
    },
  );

  return {
    items: envelope.data,
    pagination: resolveApiPagination(envelope.meta, page, pageSize, envelope.data.length),
  };
}

export async function listAllConfigEntities(
  requestEnvelope: RequestEnvelopeFn,
  entityType: ScopedConfigEntityType,
  options: Omit<ListConfigEntitiesOptions, 'page' | 'pageSize'>,
  locale?: string,
): Promise<ConfigEntityRecord[]> {
  const items: ConfigEntityRecord[] = [];

  for (let page = 1; page <= MAX_CONFIG_ENTITY_BULK_PAGES; page += 1) {
    const response = await listConfigEntitiesPage(requestEnvelope, entityType, {
      ...options,
      page,
      pageSize: CONFIG_ENTITY_BULK_PAGE_SIZE,
    }, locale);

    items.push(...response.items);

    if (!response.pagination.hasNext || response.items.length < CONFIG_ENTITY_BULK_PAGE_SIZE) {
      break;
    }
  }

  return items;
}

export function readConfigEntityDetail(
  request: RequestFn,
  entityType: ScopedConfigEntityType,
  entityId: string,
  locale?: string,
) {
  return request<ConfigEntityRecord>(`/api/v1/configuration-entity/${entityType}/${entityId}`, {
    headers: withLocaleHeaders(locale),
  });
}

export function createConfigEntity(
  request: RequestFn,
  entityType: ScopedConfigEntityType,
  input: CreateConfigEntityInput,
  locale?: string,
) {
  return request<ConfigEntityRecord>(
    `/api/v1/configuration-entity/${entityType}`,
    {
      ...buildJsonRequestInit('POST', input),
      headers: withLocaleHeaders(locale, {
        'Content-Type': 'application/json',
      }),
    },
  );
}

export function updateConfigEntity(
  request: RequestFn,
  entityType: ScopedConfigEntityType,
  entityId: string,
  input: UpdateConfigEntityInput,
  locale?: string,
) {
  return request<ConfigEntityRecord>(
    `/api/v1/configuration-entity/${entityType}/${entityId}`,
    {
      ...buildJsonRequestInit('PATCH', input),
      headers: withLocaleHeaders(locale, {
        'Content-Type': 'application/json',
      }),
    },
  );
}

export function deactivateConfigEntity(
  request: RequestFn,
  entityType: ScopedConfigEntityType,
  entityId: string,
  version: number,
) {
  return request<{ id: string; isActive: boolean; deactivatedAt: string }>(
    `/api/v1/configuration-entity/${entityType}/${entityId}/deactivate`,
    buildJsonRequestInit('POST', { version }),
  );
}

export function reactivateConfigEntity(
  request: RequestFn,
  entityType: ScopedConfigEntityType,
  entityId: string,
  version: number,
) {
  return request<{ id: string; isActive: boolean }>(
    `/api/v1/configuration-entity/${entityType}/${entityId}/reactivate`,
    buildJsonRequestInit('POST', { version }),
  );
}

export function disableInheritedConfigEntity(
  request: RequestFn,
  entityType: ScopedConfigEntityType,
  entityId: string,
  scopeType: Exclude<ConfigEntityScopeType, 'tenant'>,
  scopeId: string,
) {
  return request<{ message: string }>(
    `/api/v1/configuration-entity/${entityType}/${entityId}/disable`,
    buildJsonRequestInit('POST', { scopeType, scopeId }),
  );
}

export function enableInheritedConfigEntity(
  request: RequestFn,
  entityType: ScopedConfigEntityType,
  entityId: string,
  scopeType: Exclude<ConfigEntityScopeType, 'tenant'>,
  scopeId: string,
) {
  return request<{ message: string }>(
    `/api/v1/configuration-entity/${entityType}/${entityId}/enable`,
    buildJsonRequestInit('POST', { scopeType, scopeId }),
  );
}

export function readSubsidiaryDetail(request: RequestFn, subsidiaryId: string) {
  return request<SubsidiaryDetailResponse>(`/api/v1/subsidiaries/${subsidiaryId}`);
}

export function readSubsidiarySettings(request: RequestFn, subsidiaryId: string) {
  return request<ScopeSettingsResponse>(`/api/v1/subsidiaries/${subsidiaryId}/settings`);
}

export function updateSubsidiarySettings(request: RequestFn, subsidiaryId: string, input: UpdateSettingsInput) {
  return request<ScopeSettingsResponse>(
    `/api/v1/subsidiaries/${subsidiaryId}/settings`,
    buildJsonRequestInit('PATCH', input),
  );
}

export function readTalentDetail(request: RequestFn, talentId: string) {
  return request<TalentDetailResponse>(`/api/v1/talents/${talentId}`);
}

export function readTalentSettings(request: RequestFn, talentId: string) {
  return request<ScopeSettingsResponse>(`/api/v1/talents/${talentId}/settings`);
}

export function updateTalentSettings(request: RequestFn, talentId: string, input: UpdateSettingsInput) {
  return request<ScopeSettingsResponse>(
    `/api/v1/talents/${talentId}/settings`,
    buildJsonRequestInit('PATCH', input),
  );
}

export function readTalentPublishReadiness(request: RequestFn, talentId: string) {
  return request<TalentPublishReadinessResponse>(`/api/v1/talents/${talentId}/publish-readiness`);
}

export function publishTalent(
  request: RequestFn,
  talentId: string,
  input: TalentLifecycleMutationInput,
) {
  return request<TalentLifecycleMutationResponse>(
    `/api/v1/talents/${talentId}/publish`,
    buildJsonRequestInit('POST', input),
  );
}

export function disableTalent(
  request: RequestFn,
  talentId: string,
  input: TalentLifecycleMutationInput,
) {
  return request<TalentLifecycleMutationResponse>(
    `/api/v1/talents/${talentId}/disable`,
    buildJsonRequestInit('POST', input),
  );
}

export function reEnableTalent(
  request: RequestFn,
  talentId: string,
  input: TalentLifecycleMutationInput,
) {
  return request<TalentLifecycleMutationResponse>(
    `/api/v1/talents/${talentId}/re-enable`,
    buildJsonRequestInit('POST', input),
  );
}
