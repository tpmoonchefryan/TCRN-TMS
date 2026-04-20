import type { SupportedUiLocale } from '@tcrn/shared';

export type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

export type IntegrationTab = 'adapters' | 'webhooks' | 'api-keys' | 'email';

export type AdapterType = 'oauth' | 'api_key' | 'webhook';
export type OwnerType = 'tenant' | 'subsidiary' | 'talent';
export interface IntegrationAdapterScope {
  ownerType: OwnerType;
  ownerId: string | null;
}
export type WebhookEventType =
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deactivated'
  | 'membership.created'
  | 'membership.expired'
  | 'membership.renewed'
  | 'marshmallow.received'
  | 'marshmallow.approved'
  | 'report.completed'
  | 'report.failed'
  | 'import.completed'
  | 'import.failed';

export type ConsumerCategory = 'internal' | 'external' | 'partner';
export type EmailProvider = 'tencent_ses' | 'smtp';
export type EmailTemplateCategory = 'system' | 'business';
export type EmailLocale = SupportedUiLocale;

export interface SocialPlatformRecord {
  id: string;
  ownerType?: OwnerType | null;
  ownerId?: string | null;
  code: string;
  name: string;
  nameEn: string;
  nameZh?: string | null;
  nameJa?: string | null;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  isForceUse?: boolean;
  isSystem?: boolean;
  isInherited?: boolean;
  isDisabledHere?: boolean;
  canDisable?: boolean;
  createdAt?: string;
  updatedAt?: string;
  version: number;
  displayName?: string | null;
  iconUrl?: string | null;
  baseUrl?: string | null;
  profileUrlTemplate?: string | null;
  color?: string | null;
}

export interface IntegrationConsumerRecord {
  id: string;
  ownerType?: OwnerType | null;
  ownerId?: string | null;
  code: string;
  name: string;
  nameEn: string;
  nameZh?: string | null;
  nameJa?: string | null;
  translations?: Record<string, string>;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  isForceUse?: boolean;
  isSystem?: boolean;
  isInherited?: boolean;
  isDisabledHere?: boolean;
  canDisable?: boolean;
  createdAt?: string;
  updatedAt?: string;
  version: number;
  consumerCategory: ConsumerCategory;
  contactName?: string | null;
  contactEmail?: string | null;
  apiKeyHash?: string | null;
  apiKeyPrefix?: string | null;
  allowedIps?: string[] | null;
  rateLimit?: number | null;
  notes?: string | null;
}

export interface ConsumerKeyMutationResponse {
  message: string;
  apiKey?: string;
  apiKeyPrefix?: string;
}

export interface IntegrationAdapterListItemRecord {
  id: string;
  ownerType: OwnerType | null;
  ownerId: string | null;
  platformId: string;
  platform: {
    code: string;
    displayName: string;
    iconUrl?: string | null;
  };
  code: string;
  nameEn: string;
  nameZh?: string | null;
  nameJa?: string | null;
  translations?: Record<string, string>;
  adapterType: AdapterType;
  inherit: boolean;
  isActive: boolean;
  isInherited?: boolean;
  configCount: number;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface IntegrationAdapterConfigRecord {
  id: string;
  configKey: string;
  configValue: string;
  isSecret: boolean;
}

export interface IntegrationAdapterDetailRecord {
  id: string;
  ownerType: OwnerType | null;
  ownerId: string | null;
  platform: {
    id: string;
    code: string;
    displayName: string;
  };
  code: string;
  nameEn: string;
  nameZh?: string | null;
  nameJa?: string | null;
  translations?: Record<string, string>;
  adapterType: AdapterType;
  inherit: boolean;
  isActive: boolean;
  configs: IntegrationAdapterConfigRecord[];
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
}

export interface UpdateAdapterConfigsResponse {
  updatedCount: number;
  adapterVersion: number;
}

export interface RevealAdapterConfigResponse {
  configKey: string;
  configValue: string;
  revealedAt: string;
  expiresInSeconds?: number;
}

export interface IntegrationActivationResponse {
  id: string;
  isActive: boolean;
  deactivatedAt?: string;
}

export interface WebhookEventDefinition {
  event: WebhookEventType;
  name: string;
  description: string;
  category: string;
}

export interface IntegrationWebhookListItemRecord {
  id: string;
  code: string;
  nameEn: string;
  nameZh?: string | null;
  nameJa?: string | null;
  translations?: Record<string, string>;
  url: string;
  events: WebhookEventType[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  lastStatus: number | null;
  consecutiveFailures: number;
  createdAt: string;
}

export interface IntegrationWebhookDetailRecord extends IntegrationWebhookListItemRecord {
  secret: string | null;
  headers: Record<string, string>;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  disabledAt: string | null;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
}

export interface IntegrationDeleteWebhookResponse {
  id: string;
  deleted: boolean;
}

export interface EmailConfigResponse {
  provider: EmailProvider;
  tencentSes?: {
    secretId: string;
    secretKey: string;
    region?: string;
    fromAddress: string;
    fromName: string;
    replyTo?: string;
  } | null;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromAddress: string;
    fromName: string;
  } | null;
  isConfigured: boolean;
  lastUpdated?: string | null;
  tenantSenderOverrides?: Record<string, TenantSenderOverride>;
}

export interface TenantSenderOverride {
  fromAddress?: string;
  fromName?: string;
  replyTo?: string;
}

export interface SaveEmailConfigPayload {
  provider: EmailProvider;
  tencentSes?: {
    secretId: string;
    secretKey: string;
    region?: string;
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
  tenantSenderOverrides?: Record<string, TenantSenderOverride>;
}

export interface EmailActionResult {
  success: boolean;
  message: string;
  error?: string | null;
}

export interface EmailSenderTenantTarget {
  id: string;
  code: string;
  name: string;
  schemaName: string;
}

export interface EmailTemplateRecord {
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  translations?: Record<string, string>;
  subjectEn: string;
  subjectZh: string | null;
  subjectJa: string | null;
  subjectTranslations?: Record<string, string>;
  bodyHtmlEn: string;
  bodyHtmlZh: string | null;
  bodyHtmlJa: string | null;
  bodyHtmlTranslations?: Record<string, string>;
  bodyTextEn: string | null;
  bodyTextZh: string | null;
  bodyTextJa: string | null;
  bodyTextTranslations?: Record<string, string>;
  variables: string[];
  category: EmailTemplateCategory;
  isActive: boolean;
}

export interface EmailTemplatePreviewResponse {
  subject: string;
  htmlBody: string;
  textBody: string | null;
}

export interface ListTenantAdaptersOptions {
  platformId?: string;
  adapterType?: AdapterType;
  includeInherited?: boolean;
  includeDisabled?: boolean;
}

export interface CreateTenantAdapterPayload {
  platformId: string;
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  translations?: Record<string, string>;
  adapterType: AdapterType;
  inherit?: boolean;
  configs?: Array<{
    configKey: string;
    configValue: string;
  }>;
}

export interface UpdateTenantAdapterPayload {
  nameEn?: string;
  nameZh?: string;
  nameJa?: string;
  translations?: Record<string, string>;
  inherit?: boolean;
  version: number;
}

export interface UpdateTenantAdapterConfigsPayload {
  configs: Array<{
    configKey: string;
    configValue: string;
  }>;
  adapterVersion: number;
}

export interface CreateWebhookPayload {
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  translations?: Record<string, string>;
  url: string;
  secret?: string;
  events: WebhookEventType[];
  headers?: Record<string, string>;
  retryPolicy?: {
    maxRetries?: number;
    backoffMs?: number;
  };
}

export interface UpdateWebhookPayload {
  nameEn?: string;
  nameZh?: string;
  nameJa?: string;
  translations?: Record<string, string>;
  url?: string;
  secret?: string;
  events?: WebhookEventType[];
  headers?: Record<string, string>;
  retryPolicy?: {
    maxRetries?: number;
    backoffMs?: number;
  };
  version: number;
}

export interface CreateConsumerPayload {
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  translations?: Record<string, string>;
  consumerCategory: ConsumerCategory;
  contactName?: string;
  contactEmail?: string;
  allowedIps?: string[];
  rateLimit?: number;
  notes?: string;
}

export interface UpdateConsumerPayload {
  nameEn?: string;
  nameZh?: string;
  nameJa?: string;
  translations?: Record<string, string>;
  consumerCategory?: ConsumerCategory;
  contactName?: string;
  contactEmail?: string;
  allowedIps?: string[];
  rateLimit?: number;
  notes?: string;
  version: number;
}

export interface CreateEmailTemplatePayload {
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  translations?: Record<string, string>;
  subjectEn: string;
  subjectZh?: string;
  subjectJa?: string;
  subjectTranslations?: Record<string, string>;
  bodyHtmlEn: string;
  bodyHtmlZh?: string;
  bodyHtmlJa?: string;
  bodyHtmlTranslations?: Record<string, string>;
  bodyTextEn?: string;
  bodyTextZh?: string;
  bodyTextJa?: string;
  bodyTextTranslations?: Record<string, string>;
  variables?: string[];
  category: EmailTemplateCategory;
}

export interface UpdateEmailTemplatePayload {
  nameEn?: string;
  nameZh?: string;
  nameJa?: string;
  translations?: Record<string, string>;
  subjectEn?: string;
  subjectZh?: string;
  subjectJa?: string;
  subjectTranslations?: Record<string, string>;
  bodyHtmlEn?: string;
  bodyHtmlZh?: string;
  bodyHtmlJa?: string;
  bodyHtmlTranslations?: Record<string, string>;
  bodyTextEn?: string;
  bodyTextZh?: string;
  bodyTextJa?: string;
  bodyTextTranslations?: Record<string, string>;
  variables?: string[];
  category?: EmailTemplateCategory;
  isActive?: boolean;
}

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

function buildJsonRequestInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

function buildAdapterCollectionPath(scope: IntegrationAdapterScope) {
  if (scope.ownerType === 'tenant') {
    return '/api/v1/integration/adapters';
  }

  const scopeKey = scope.ownerType === 'subsidiary' ? 'subsidiaries' : 'talents';
  return `/api/v1/${scopeKey}/${encodeURIComponent(scope.ownerId ?? '')}/integration/adapters`;
}

const CONFIGURATION_ENTITY_PAGE_SIZE = 100;
const MAX_CONFIGURATION_ENTITY_PAGES = 100;

async function listConfigurationEntitiesAcrossPages<T>(
  request: RequestFn,
  entityType: 'social-platform' | 'consumer',
  includeInactive: boolean,
): Promise<T[]> {
  const items: T[] = [];

  for (let page = 1; page <= MAX_CONFIGURATION_ENTITY_PAGES; page += 1) {
    const batch = await request<T[]>(
      `/api/v1/configuration-entity/${entityType}${buildQueryString({
        includeInactive,
        page,
        pageSize: CONFIGURATION_ENTITY_PAGE_SIZE,
      })}`,
    );

    items.push(...batch);

    if (batch.length < CONFIGURATION_ENTITY_PAGE_SIZE) {
      break;
    }
  }

  return items;
}

export function listSocialPlatforms(request: RequestFn) {
  return listConfigurationEntitiesAcrossPages<SocialPlatformRecord>(request, 'social-platform', false);
}

export function listConsumers(request: RequestFn) {
  return listConfigurationEntitiesAcrossPages<IntegrationConsumerRecord>(request, 'consumer', true);
}

export function createConsumer(request: RequestFn, payload: CreateConsumerPayload) {
  return request<IntegrationConsumerRecord>(
    '/api/v1/configuration-entity/consumer',
    buildJsonRequestInit('POST', payload),
  );
}

export function updateConsumer(request: RequestFn, consumerId: string, payload: UpdateConsumerPayload) {
  return request<IntegrationConsumerRecord>(
    `/api/v1/configuration-entity/consumer/${consumerId}`,
    buildJsonRequestInit('PATCH', payload),
  );
}

export function deactivateConsumer(
  request: RequestFn,
  consumerId: string,
  version: number,
) {
  return request<IntegrationActivationResponse>(
    `/api/v1/configuration-entity/consumer/${consumerId}/deactivate`,
    buildJsonRequestInit('POST', { version }),
  );
}

export function reactivateConsumer(
  request: RequestFn,
  consumerId: string,
  version: number,
) {
  return request<IntegrationActivationResponse>(
    `/api/v1/configuration-entity/consumer/${consumerId}/reactivate`,
    buildJsonRequestInit('POST', { version }),
  );
}

export function generateConsumerKey(request: RequestFn, consumerId: string) {
  return request<ConsumerKeyMutationResponse>(
    `/api/v1/configuration-entity/consumer/${consumerId}/generate-key`,
    buildJsonRequestInit('POST'),
  );
}

export function rotateConsumerKey(request: RequestFn, consumerId: string) {
  return request<ConsumerKeyMutationResponse>(
    `/api/v1/configuration-entity/consumer/${consumerId}/rotate-key`,
    buildJsonRequestInit('POST'),
  );
}

export function revokeConsumerKey(request: RequestFn, consumerId: string) {
  return request<ConsumerKeyMutationResponse>(
    `/api/v1/configuration-entity/consumer/${consumerId}/revoke-key`,
    buildJsonRequestInit('POST'),
  );
}

export function listTenantAdapters(
  request: RequestFn,
  options: ListTenantAdaptersOptions = {},
) {
  return request<IntegrationAdapterListItemRecord[]>(
    `/api/v1/integration/adapters${buildQueryString({
      platformId: options.platformId,
      adapterType: options.adapterType,
      includeInherited: options.includeInherited ?? true,
      includeDisabled: options.includeDisabled ?? true,
    })}`,
  );
}

export function listScopedAdapters(
  request: RequestFn,
  scope: IntegrationAdapterScope,
  options: ListTenantAdaptersOptions = {},
) {
  return request<IntegrationAdapterListItemRecord[]>(
    `${buildAdapterCollectionPath(scope)}${buildQueryString({
      platformId: options.platformId,
      adapterType: options.adapterType,
      includeInherited: options.includeInherited ?? true,
      includeDisabled: options.includeDisabled ?? true,
    })}`,
  );
}

export function readTenantAdapter(request: RequestFn, adapterId: string) {
  return request<IntegrationAdapterDetailRecord>(`/api/v1/integration/adapters/${adapterId}`);
}

export function createTenantAdapter(request: RequestFn, payload: CreateTenantAdapterPayload) {
  return request<IntegrationAdapterDetailRecord>(
    '/api/v1/integration/adapters',
    buildJsonRequestInit('POST', payload),
  );
}

export function createScopedAdapter(
  request: RequestFn,
  scope: IntegrationAdapterScope,
  payload: CreateTenantAdapterPayload,
) {
  return request<IntegrationAdapterDetailRecord>(
    buildAdapterCollectionPath(scope),
    buildJsonRequestInit('POST', payload),
  );
}

export function updateTenantAdapter(
  request: RequestFn,
  adapterId: string,
  payload: UpdateTenantAdapterPayload,
) {
  return request<IntegrationAdapterDetailRecord>(
    `/api/v1/integration/adapters/${adapterId}`,
    buildJsonRequestInit('PATCH', payload),
  );
}

export function updateTenantAdapterConfigs(
  request: RequestFn,
  adapterId: string,
  payload: UpdateTenantAdapterConfigsPayload,
) {
  return request<UpdateAdapterConfigsResponse>(
    `/api/v1/integration/adapters/${adapterId}/configs`,
    buildJsonRequestInit('PATCH', payload),
  );
}

export function revealTenantAdapterConfig(
  request: RequestFn,
  adapterId: string,
  configKey: string,
) {
  return request<RevealAdapterConfigResponse>(
    `/api/v1/integration/adapters/${adapterId}/configs/${encodeURIComponent(configKey)}/reveal`,
    buildJsonRequestInit('POST'),
  );
}

export function deactivateTenantAdapter(request: RequestFn, adapterId: string) {
  return request<IntegrationActivationResponse>(
    `/api/v1/integration/adapters/${adapterId}/deactivate`,
    buildJsonRequestInit('POST'),
  );
}

export function reactivateTenantAdapter(request: RequestFn, adapterId: string) {
  return request<IntegrationActivationResponse>(
    `/api/v1/integration/adapters/${adapterId}/reactivate`,
    buildJsonRequestInit('POST'),
  );
}

export function disableInheritedScopedAdapter(
  request: RequestFn,
  scope: Exclude<IntegrationAdapterScope, { ownerType: 'tenant' }>,
  adapterId: string,
) {
  return request<IntegrationActivationResponse>(
    `${buildAdapterCollectionPath(scope)}/${encodeURIComponent(adapterId)}/disable`,
    buildJsonRequestInit('POST'),
  );
}

export function enableInheritedScopedAdapter(
  request: RequestFn,
  scope: Exclude<IntegrationAdapterScope, { ownerType: 'tenant' }>,
  adapterId: string,
) {
  return request<IntegrationActivationResponse>(
    `${buildAdapterCollectionPath(scope)}/${encodeURIComponent(adapterId)}/enable`,
    buildJsonRequestInit('POST'),
  );
}

export function listWebhooks(request: RequestFn) {
  return request<IntegrationWebhookListItemRecord[]>('/api/v1/integration/webhooks');
}

export function listWebhookEvents(request: RequestFn) {
  return request<WebhookEventDefinition[]>('/api/v1/integration/webhooks/events');
}

export function readWebhook(request: RequestFn, webhookId: string) {
  return request<IntegrationWebhookDetailRecord>(`/api/v1/integration/webhooks/${webhookId}`);
}

export function createWebhook(request: RequestFn, payload: CreateWebhookPayload) {
  return request<IntegrationWebhookDetailRecord>(
    '/api/v1/integration/webhooks',
    buildJsonRequestInit('POST', payload),
  );
}

export function updateWebhook(
  request: RequestFn,
  webhookId: string,
  payload: UpdateWebhookPayload,
) {
  return request<IntegrationWebhookDetailRecord>(
    `/api/v1/integration/webhooks/${webhookId}`,
    buildJsonRequestInit('PATCH', payload),
  );
}

export function deleteWebhook(request: RequestFn, webhookId: string) {
  return request<IntegrationDeleteWebhookResponse>(`/api/v1/integration/webhooks/${webhookId}`, {
    method: 'DELETE',
  });
}

export function deactivateWebhook(request: RequestFn, webhookId: string) {
  return request<IntegrationActivationResponse>(
    `/api/v1/integration/webhooks/${webhookId}/deactivate`,
    buildJsonRequestInit('POST'),
  );
}

export function reactivateWebhook(request: RequestFn, webhookId: string) {
  return request<IntegrationActivationResponse>(
    `/api/v1/integration/webhooks/${webhookId}/reactivate`,
    buildJsonRequestInit('POST'),
  );
}

export function readEmailConfig(request: RequestFn) {
  return request<EmailConfigResponse>('/api/v1/email/config');
}

export function saveEmailConfig(request: RequestFn, payload: SaveEmailConfigPayload) {
  return request<EmailConfigResponse>('/api/v1/email/config', buildJsonRequestInit('PATCH', payload));
}

export function testEmailConnection(request: RequestFn) {
  return request<EmailActionResult>('/api/v1/email/config/test-connection', buildJsonRequestInit('POST'));
}

export function sendEmailTest(request: RequestFn, testEmail: string) {
  return request<EmailActionResult>(
    '/api/v1/email/config/test',
    buildJsonRequestInit('POST', { testEmail }),
  );
}

export function listEmailSenderTenants(request: RequestFn) {
  return request<EmailSenderTenantTarget[]>('/api/v1/tenants?page=1&pageSize=100&tier=standard&isActive=true');
}

export function listEmailTemplates(
  request: RequestFn,
  options: {
    category?: EmailTemplateCategory;
    isActive?: boolean;
  } = {},
) {
  return request<EmailTemplateRecord[]>(
    `/api/v1/email-templates${buildQueryString({
      category: options.category,
      isActive: options.isActive,
    })}`,
  );
}

export function createEmailTemplate(request: RequestFn, payload: CreateEmailTemplatePayload) {
  return request<EmailTemplateRecord>(
    '/api/v1/email-templates',
    buildJsonRequestInit('POST', payload),
  );
}

export function updateEmailTemplate(
  request: RequestFn,
  code: string,
  payload: UpdateEmailTemplatePayload,
) {
  return request<EmailTemplateRecord>(
    `/api/v1/email-templates/${encodeURIComponent(code)}`,
    buildJsonRequestInit('PATCH', payload),
  );
}

export function deactivateEmailTemplate(request: RequestFn, code: string) {
  return request<EmailTemplateRecord>(`/api/v1/email-templates/${encodeURIComponent(code)}`, {
    method: 'DELETE',
  });
}

export function reactivateEmailTemplate(request: RequestFn, code: string) {
  return request<EmailTemplateRecord>(
    `/api/v1/email-templates/${encodeURIComponent(code)}/reactivate`,
    buildJsonRequestInit('POST'),
  );
}

export function previewEmailTemplate(
  request: RequestFn,
  code: string,
  locale: EmailLocale | undefined,
  variables: Record<string, string>,
) {
  return request<EmailTemplatePreviewResponse>(
    `/api/v1/email-templates/${encodeURIComponent(code)}/preview`,
    buildJsonRequestInit('POST', { locale, variables }),
  );
}
