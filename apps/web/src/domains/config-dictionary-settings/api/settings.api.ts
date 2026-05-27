import {
  type ArtistLifecycleFlow,
  type LocalizedText,
  normalizeSupportedUiLocale,
  type PartialLocalizedText,
  type PublicPresenceTemplateTypeCode,
  type SupportedUiLocale,
} from '@tcrn/shared';

import {
  type ApiPaginationMeta,
  type ApiSuccessEnvelope,
  buildFallbackPagination,
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

export type TenantSenderDomainStatus = 'pending_dns' | 'verified' | 'disabled';

export interface TenantSenderDomainOption {
  id: string;
  domain: string;
  status: TenantSenderDomainStatus;
  selectable: boolean;
}

export interface TenantSenderDomainsResponse {
  domains: TenantSenderDomainOption[];
  defaultDomainId: string | null;
  fromName: string | null;
  replyTo: string | null;
}

export interface UpdateTenantSenderDomainsPayload {
  defaultDomainId: string | null;
  fromName?: string | null;
  replyTo?: string | null;
}

export type TenantTurnstileSource = 'tenant' | 'environment' | 'none';
export type TenantTurnstileSecretMutation = 'keep' | 'replace' | 'clear';

export interface TenantTurnstileSettingsResponse {
  siteKey: string | null;
  effectiveSiteKey: string | null;
  source: TenantTurnstileSource;
  environment: 'development' | 'test' | 'staging' | 'production';
  siteKeyConfigured: boolean;
  secretKeyConfigured: boolean;
  providerReady: boolean;
  runtimeBypass: boolean;
  ready: boolean;
  secretKeyMasked: string | null;
}

export interface UpdateTenantTurnstileSettingsPayload {
  siteKey?: string | null;
  secretKeyMutation?: TenantTurnstileSecretMutation;
  secretKey?: string | null;
}

export type SsoProviderType = 'oidc';
export type SsoOwnerScope = 'tenant_product' | 'ac_platform' | 'external_tool_readiness';

export interface ManagedSsoProvider {
  id: string;
  tenantId: string;
  code: string;
  displayName: LocalizedText;
  providerType: SsoProviderType;
  ownerScope: SsoOwnerScope;
  issuerUrl: string | null;
  authorizationUrl: string | null;
  tokenUrl: string | null;
  userinfoUrl: string | null;
  jwksUrl: string | null;
  clientId: string | null;
  clientSecretConfigured: boolean;
  redirectUri: string | null;
  scopes: string[];
  claimMappingPolicy: Record<string, string>;
  enabled: boolean;
}

export interface UpsertManagedSsoProviderInput {
  code: string;
  displayName: LocalizedText;
  providerType: SsoProviderType;
  ownerScope: SsoOwnerScope;
  issuerUrl?: string | null;
  authorizationUrl?: string | null;
  tokenUrl?: string | null;
  userinfoUrl?: string | null;
  jwksUrl?: string | null;
  clientId?: string | null;
  clientSecretRef?: string | null;
  redirectUri?: string | null;
  scopes?: string[];
  claimMappingPolicy?: Record<string, string>;
  isEnabled?: boolean;
}

export type TalentLifecycleStatus = 'draft' | 'published' | 'disabled';

export interface ProfileStoreListItem {
  id: string;
  code: string;
  name: LocalizedText;
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
    pagination: ApiPaginationMeta;
  };
}

interface ProfileStoreListApiResponse {
  items: ProfileStoreListItem[];
  meta?: {
    pagination?: Partial<ApiPaginationMeta> & {
      totalItems?: number;
    };
  };
}

export interface ProfileStoreDetailResponse {
  id: string;
  code: string;
  name: LocalizedText;
  description: LocalizedText;
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
  name: LocalizedText;
  description?: PartialLocalizedText;
  isDefault?: boolean;
}

export interface UpdateProfileStoreInput {
  name?: PartialLocalizedText;
  description?: PartialLocalizedText;
  isDefault?: boolean;
  isActive?: boolean;
  version: number;
}

export interface ProfileStoreCreateResponse {
  id: string;
  code: string;
  name: LocalizedText;
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
  | 'artist-stage'
  | 'business-segment'
  | 'communication-type'
  | 'address-type'
  | 'customer-status'
  | 'reason-category'
  | 'inactivation-reason'
  | 'membership-class'
  | 'membership-type'
  | 'membership-level'
  | 'profile-store'
  | 'consent'
  | 'homepage-template-asset'
  | 'homepage-component-asset'
  | 'custom-domain';

export interface ConfigEntityRecord {
  id: string;
  ownerType: ConfigEntityScopeType | null;
  ownerId: string | null;
  code: string | null;
  name: LocalizedText;
  localizedName: string;
  description: LocalizedText | null;
  localizedDescription: string | null;
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
  contentMarkdown?: LocalizedText | null;
  color?: string | null;
  artistStatusCode?: 'draft' | 'published' | 'disabled' | null;
  homepageTemplateTypeCode?: PublicPresenceTemplateTypeCode | null;
  channelCategoryId?: string | null;
  reasonCategoryId?: string | null;
  consentVersion?: string | null;
  effectiveFrom?: string | null;
  expiresAt?: string | null;
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
  name: LocalizedText;
  description?: PartialLocalizedText | null;
  sortOrder?: number;
  ownerType?: ConfigEntityScopeType;
  ownerId?: string;
  color?: string;
  artistStatusCode?: 'draft' | 'published' | 'disabled';
  homepageTemplateTypeCode?: PublicPresenceTemplateTypeCode;
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
  contentMarkdown?: PartialLocalizedText | null;
  contentUrl?: string;
  isRequired?: boolean;
}

export interface UpdateConfigEntityInput extends Omit<
  CreateConfigEntityInput,
  'code' | 'ownerType' | 'ownerId'
> {
  version: number;
}

export interface SubsidiaryDetailResponse {
  id: string;
  parentId: string | null;
  code: string;
  path: string;
  depth: number;
  name: LocalizedText;
  localizedName: string;
  description: LocalizedText;
  localizedDescription: string | null;
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
  name: LocalizedText;
  isDefault: boolean;
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
  name: LocalizedText;
  localizedName: string;
  displayName: string;
  description: LocalizedText;
  localizedDescription: string | null;
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

export interface PasswordPolicyDraft {
  minLength: number;
  requireSpecial: boolean;
  maxAgeDays: number;
}

export interface TenantSettingsDraft {
  defaultLanguage: SupportedUiLocale;
  timezone: string;
  dateFormat: string;
  currency: string;
  customerImportEnabled: boolean;
  maxImportRows: number;
  totpRequiredForAll: boolean;
  allowMarshmallow: boolean;
  passwordPolicy: PasswordPolicyDraft;
}

export type SubsidiarySettingsDraft = TenantSettingsDraft;
export type TalentSettingsDraft = TenantSettingsDraft;

export interface UpdateSettingsInput {
  settings: Record<string, unknown>;
  version: number;
}

export interface ArtistLifecycleFlowSettingsResponse {
  scopeType: ConfigEntityScopeType;
  scopeId: string | null;
  inheritedFrom: 'tenant' | 'default';
  writable: boolean;
  version: number;
  flow: ArtistLifecycleFlow;
  validationIssues: Array<{
    path: string[];
    message: string;
  }>;
}

export interface UpdateArtistLifecycleFlowInput {
  flow: ArtistLifecycleFlow;
}

export interface ProfileStoreListOptions {
  page?: number;
  pageSize?: number;
  includeInactive?: boolean;
  search?: string;
}

type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;
export type RequestEnvelopeFn = <T>(
  path: string,
  init?: RequestInit
) => Promise<ApiSuccessEnvelope<T>>;

function readString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
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

function readFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readPositiveNumber(value: unknown) {
  const parsed = readFiniteNumber(value);

  return parsed !== null && parsed > 0 ? parsed : null;
}

function readInteger(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isInteger(value) ? value : fallback;
}

function readNonNegativeNumber(value: unknown) {
  const parsed = readFiniteNumber(value);

  return parsed !== null && parsed >= 0 ? parsed : null;
}

function normalizeProfileStoreListResponse(
  response: ProfileStoreListApiResponse,
  page: number,
  pageSize: number
): ProfileStoreListResponse {
  const items = response.items ?? [];
  const pagination = response.meta?.pagination;

  if (!pagination) {
    return {
      items,
      meta: {
        pagination: buildFallbackPagination(items.length, page, pageSize),
      },
    };
  }

  const normalizedPage = readPositiveNumber(pagination.page) ?? page;
  const normalizedPageSize = readPositiveNumber(pagination.pageSize) ?? pageSize;
  const totalCount =
    readNonNegativeNumber(pagination.totalCount) ??
    readNonNegativeNumber(pagination.totalItems) ??
    items.length;
  const totalPages =
    readPositiveNumber(pagination.totalPages) ??
    Math.max(1, Math.ceil(totalCount / normalizedPageSize));

  return {
    items,
    meta: {
      pagination: {
        page: normalizedPage,
        pageSize: normalizedPageSize,
        totalCount,
        totalPages,
        hasNext:
          typeof pagination.hasNext === 'boolean'
            ? pagination.hasNext
            : normalizedPage < totalPages,
        hasPrev: typeof pagination.hasPrev === 'boolean' ? pagination.hasPrev : normalizedPage > 1,
      },
    },
  };
}

export function buildTenantSettingsDraft(settings: Record<string, unknown>): TenantSettingsDraft {
  const passwordPolicy =
    settings.passwordPolicy &&
    typeof settings.passwordPolicy === 'object' &&
    !Array.isArray(settings.passwordPolicy)
      ? (settings.passwordPolicy as Record<string, unknown>)
      : {};

  return {
    defaultLanguage:
      normalizeSupportedUiLocale(readString(settings.defaultLanguage, 'zh_HANS')) ?? 'zh_HANS',
    timezone: readString(settings.timezone, 'Asia/Shanghai'),
    dateFormat: readString(settings.dateFormat, 'YYYY-MM-DD'),
    currency: readString(settings.currency, 'USD'),
    customerImportEnabled: readBoolean(settings.customerImportEnabled, true),
    maxImportRows: readInteger(settings.maxImportRows, 50000),
    totpRequiredForAll: readBoolean(settings.totpRequiredForAll, false),
    allowMarshmallow: settings.allowMarshmallow !== false,
    passwordPolicy: {
      minLength: readInteger(passwordPolicy.minLength, 12),
      requireSpecial: readBoolean(passwordPolicy.requireSpecial, true),
      maxAgeDays: readInteger(passwordPolicy.maxAgeDays, 90),
    },
  };
}

export const buildTalentSettingsDraft = buildTenantSettingsDraft;
export const buildSubsidiarySettingsDraft = buildTenantSettingsDraft;

export function buildTenantSettingsUpdatePayload(
  draft: TenantSettingsDraft
): Record<string, unknown> {
  return {
    defaultLanguage: draft.defaultLanguage,
    timezone: draft.timezone,
    dateFormat: draft.dateFormat,
    currency: draft.currency,
    customerImportEnabled: draft.customerImportEnabled,
    maxImportRows: draft.maxImportRows,
    totpRequiredForAll: draft.totpRequiredForAll,
    allowMarshmallow: draft.allowMarshmallow,
    passwordPolicy: {
      minLength: draft.passwordPolicy.minLength,
      requireSpecial: draft.passwordPolicy.requireSpecial,
      maxAgeDays: draft.passwordPolicy.maxAgeDays,
    },
  };
}

export const buildTalentSettingsUpdatePayload = buildTenantSettingsUpdatePayload;
export const buildSubsidiarySettingsUpdatePayload = buildTenantSettingsUpdatePayload;

export function isTenantSettingsDraftDirty(
  source: TenantSettingsDraft,
  draft: TenantSettingsDraft
) {
  return (
    source.defaultLanguage !== draft.defaultLanguage ||
    source.timezone !== draft.timezone ||
    source.dateFormat !== draft.dateFormat ||
    source.currency !== draft.currency ||
    source.customerImportEnabled !== draft.customerImportEnabled ||
    source.maxImportRows !== draft.maxImportRows ||
    source.totpRequiredForAll !== draft.totpRequiredForAll ||
    source.allowMarshmallow !== draft.allowMarshmallow ||
    source.passwordPolicy.minLength !== draft.passwordPolicy.minLength ||
    source.passwordPolicy.requireSpecial !== draft.passwordPolicy.requireSpecial ||
    source.passwordPolicy.maxAgeDays !== draft.passwordPolicy.maxAgeDays
  );
}

export const isTalentSettingsDraftDirty = isTenantSettingsDraftDirty;
export const isSubsidiarySettingsDraftDirty = isTenantSettingsDraftDirty;

export function readTenantSettings(request: RequestFn) {
  return request<ScopeSettingsResponse>('/api/v1/organization/settings');
}

export function updateTenantSettings(request: RequestFn, input: UpdateSettingsInput) {
  return request<ScopeSettingsResponse>(
    '/api/v1/organization/settings',
    buildJsonRequestInit('PATCH', input)
  );
}

export function readTenantArtistLifecycleFlow(request: RequestFn) {
  return request<ArtistLifecycleFlowSettingsResponse>(
    '/api/v1/organization/settings/artist-lifecycle-flow'
  );
}

export function updateTenantArtistLifecycleFlow(
  request: RequestFn,
  input: UpdateArtistLifecycleFlowInput
) {
  return request<ArtistLifecycleFlowSettingsResponse>(
    '/api/v1/organization/settings/artist-lifecycle-flow',
    buildJsonRequestInit('PATCH', input)
  );
}

export function readTenantSenderDomains(request: RequestFn) {
  return request<TenantSenderDomainsResponse>('/api/v1/email/sender-domains');
}

export function updateTenantSenderDomains(
  request: RequestFn,
  input: UpdateTenantSenderDomainsPayload
) {
  return request<TenantSenderDomainsResponse>(
    '/api/v1/email/sender-domains',
    buildJsonRequestInit('PATCH', input)
  );
}

export function readTenantTurnstileSettings(request: RequestFn) {
  return request<TenantTurnstileSettingsResponse>('/api/v1/organization/settings/turnstile');
}

export function updateTenantTurnstileSettings(
  request: RequestFn,
  input: UpdateTenantTurnstileSettingsPayload
) {
  return request<TenantTurnstileSettingsResponse>(
    '/api/v1/organization/settings/turnstile',
    buildJsonRequestInit('PATCH', input)
  );
}

export function listManagedSsoProviders(request: RequestFn, ownerScope?: SsoOwnerScope) {
  const params = new URLSearchParams();
  if (ownerScope) {
    params.set('ownerScope', ownerScope);
  }

  const queryString = params.toString();
  return request<ManagedSsoProvider[]>(
    `/api/v1/auth/sso/admin/providers${queryString ? `?${queryString}` : ''}`
  );
}

export function upsertManagedSsoProvider(
  request: RequestFn,
  providerCode: string,
  input: UpsertManagedSsoProviderInput
) {
  return request<ManagedSsoProvider>(
    `/api/v1/auth/sso/admin/providers/${encodeURIComponent(providerCode)}`,
    buildJsonRequestInit('PATCH', input)
  );
}

export async function listProfileStores(request: RequestFn, options: ProfileStoreListOptions = {}) {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (options.includeInactive !== undefined) {
    params.set('includeInactive', String(options.includeInactive));
  }
  if (options.search?.trim()) {
    params.set('search', options.search.trim());
  }

  const response = await request<ProfileStoreListApiResponse>(
    `/api/v1/profile-stores?${params.toString()}`
  );

  return normalizeProfileStoreListResponse(response, page, pageSize);
}

export function readProfileStoreDetail(request: RequestFn, profileStoreId: string) {
  return request<ProfileStoreDetailResponse>(`/api/v1/profile-stores/${profileStoreId}`);
}

export function createProfileStore(request: RequestFn, input: CreateProfileStoreInput) {
  return request<ProfileStoreCreateResponse>(
    '/api/v1/profile-stores',
    buildJsonRequestInit('POST', input)
  );
}

export function updateProfileStore(
  request: RequestFn,
  profileStoreId: string,
  input: UpdateProfileStoreInput
) {
  return request<ProfileStoreUpdateResponse>(
    `/api/v1/profile-stores/${profileStoreId}`,
    buildJsonRequestInit('PATCH', input)
  );
}

export function listConfigEntities(
  request: RequestFn,
  entityType: ScopedConfigEntityType,
  options: ListConfigEntitiesOptions,
  locale?: string
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
    }
  );
}

const CONFIG_ENTITY_BULK_PAGE_SIZE = 100;
const MAX_CONFIG_ENTITY_BULK_PAGES = 100;

export async function listConfigEntitiesPage(
  requestEnvelope: RequestEnvelopeFn,
  entityType: ScopedConfigEntityType,
  options: ListConfigEntitiesOptions,
  locale?: string
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
    }
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
  locale?: string
): Promise<ConfigEntityRecord[]> {
  const items: ConfigEntityRecord[] = [];

  for (let page = 1; page <= MAX_CONFIG_ENTITY_BULK_PAGES; page += 1) {
    const response = await listConfigEntitiesPage(
      requestEnvelope,
      entityType,
      {
        ...options,
        page,
        pageSize: CONFIG_ENTITY_BULK_PAGE_SIZE,
      },
      locale
    );

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
  locale?: string
) {
  return request<ConfigEntityRecord>(`/api/v1/configuration-entity/${entityType}/${entityId}`, {
    headers: withLocaleHeaders(locale),
  });
}

export function createConfigEntity(
  request: RequestFn,
  entityType: ScopedConfigEntityType,
  input: CreateConfigEntityInput,
  locale?: string
) {
  return request<ConfigEntityRecord>(`/api/v1/configuration-entity/${entityType}`, {
    ...buildJsonRequestInit('POST', input),
    headers: withLocaleHeaders(locale, {
      'Content-Type': 'application/json',
    }),
  });
}

export function updateConfigEntity(
  request: RequestFn,
  entityType: ScopedConfigEntityType,
  entityId: string,
  input: UpdateConfigEntityInput,
  locale?: string
) {
  return request<ConfigEntityRecord>(`/api/v1/configuration-entity/${entityType}/${entityId}`, {
    ...buildJsonRequestInit('PATCH', input),
    headers: withLocaleHeaders(locale, {
      'Content-Type': 'application/json',
    }),
  });
}

export function deactivateConfigEntity(
  request: RequestFn,
  entityType: ScopedConfigEntityType,
  entityId: string,
  version: number
) {
  return request<{ id: string; isActive: boolean; deactivatedAt: string }>(
    `/api/v1/configuration-entity/${entityType}/${entityId}/deactivate`,
    buildJsonRequestInit('POST', { version })
  );
}

export function reactivateConfigEntity(
  request: RequestFn,
  entityType: ScopedConfigEntityType,
  entityId: string,
  version: number
) {
  return request<{ id: string; isActive: boolean }>(
    `/api/v1/configuration-entity/${entityType}/${entityId}/reactivate`,
    buildJsonRequestInit('POST', { version })
  );
}

export function disableInheritedConfigEntity(
  request: RequestFn,
  entityType: ScopedConfigEntityType,
  entityId: string,
  scopeType: Exclude<ConfigEntityScopeType, 'tenant'>,
  scopeId: string
) {
  return request<{ message: string }>(
    `/api/v1/configuration-entity/${entityType}/${entityId}/disable`,
    buildJsonRequestInit('POST', { scopeType, scopeId })
  );
}

export function enableInheritedConfigEntity(
  request: RequestFn,
  entityType: ScopedConfigEntityType,
  entityId: string,
  scopeType: Exclude<ConfigEntityScopeType, 'tenant'>,
  scopeId: string
) {
  return request<{ message: string }>(
    `/api/v1/configuration-entity/${entityType}/${entityId}/enable`,
    buildJsonRequestInit('POST', { scopeType, scopeId })
  );
}

export function readSubsidiaryDetail(request: RequestFn, subsidiaryId: string) {
  return request<SubsidiaryDetailResponse>(`/api/v1/subsidiaries/${subsidiaryId}`);
}

export function readSubsidiarySettings(request: RequestFn, subsidiaryId: string) {
  return request<ScopeSettingsResponse>(`/api/v1/subsidiaries/${subsidiaryId}/settings`);
}

export function readSubsidiaryArtistLifecycleFlow(request: RequestFn, subsidiaryId: string) {
  return request<ArtistLifecycleFlowSettingsResponse>(
    `/api/v1/subsidiaries/${subsidiaryId}/settings/artist-lifecycle-flow`
  );
}

export function updateSubsidiarySettings(
  request: RequestFn,
  subsidiaryId: string,
  input: UpdateSettingsInput
) {
  return request<ScopeSettingsResponse>(
    `/api/v1/subsidiaries/${subsidiaryId}/settings`,
    buildJsonRequestInit('PATCH', input)
  );
}

export function readTalentDetail(request: RequestFn, talentId: string) {
  return request<TalentDetailResponse>(`/api/v1/talents/${talentId}`);
}

export function readTalentSettings(request: RequestFn, talentId: string) {
  return request<ScopeSettingsResponse>(`/api/v1/talents/${talentId}/settings`);
}

export function readTalentArtistLifecycleFlow(request: RequestFn, talentId: string) {
  return request<ArtistLifecycleFlowSettingsResponse>(
    `/api/v1/talents/${talentId}/settings/artist-lifecycle-flow`
  );
}

export function updateTalentSettings(
  request: RequestFn,
  talentId: string,
  input: UpdateSettingsInput
) {
  return request<ScopeSettingsResponse>(
    `/api/v1/talents/${talentId}/settings`,
    buildJsonRequestInit('PATCH', input)
  );
}

export function readTalentPublishReadiness(request: RequestFn, talentId: string) {
  return request<TalentPublishReadinessResponse>(`/api/v1/talents/${talentId}/publish-readiness`);
}

export function publishTalent(
  request: RequestFn,
  talentId: string,
  input: TalentLifecycleMutationInput
) {
  return request<TalentLifecycleMutationResponse>(
    `/api/v1/talents/${talentId}/publish`,
    buildJsonRequestInit('POST', input)
  );
}

export function disableTalent(
  request: RequestFn,
  talentId: string,
  input: TalentLifecycleMutationInput
) {
  return request<TalentLifecycleMutationResponse>(
    `/api/v1/talents/${talentId}/disable`,
    buildJsonRequestInit('POST', input)
  );
}

export function reEnableTalent(
  request: RequestFn,
  talentId: string,
  input: TalentLifecycleMutationInput
) {
  return request<TalentLifecycleMutationResponse>(
    `/api/v1/talents/${talentId}/re-enable`,
    buildJsonRequestInit('POST', input)
  );
}
