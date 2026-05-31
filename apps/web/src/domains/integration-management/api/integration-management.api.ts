import type {
  IntegrationAdapterDefinition,
  IntegrationWebhookDefinition,
  LocalizedText,
  PartialLocalizedText,
  SupportedUiLocale,
} from '@tcrn/shared';

export type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

export type IntegrationTab = 'adapters' | 'webhooks' | 'api-keys' | 'email';

export type AdapterType = 'oauth' | 'api_key' | 'webhook' | 'ai';
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
  name: LocalizedText;
  localizedName: string;
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
  name: LocalizedText;
  localizedName: string;
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
  name: LocalizedText;
  definitionKey?: string;
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
  name: LocalizedText;
  definitionKey?: string;
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
  eventCode?: WebhookEventType;
  name: string;
  label?: LocalizedText;
  description: string;
  descriptionText?: LocalizedText;
  category: string;
  definitionKey?: string;
  payloadVersion?: string;
  producer?: string;
  piiClass?: 'none' | 'reference' | 'limited_pii';
  retention?: string;
  subscriptionEligible?: boolean;
  deprecated?: boolean;
  schemaRef?: string;
  redactionPolicy?: string;
}

export interface IntegrationWebhookListItemRecord {
  id: string;
  code: string;
  name: LocalizedText;
  definitionKey?: string;
  monitoredTalentIds: string[];
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

export type WebhookDeliveryAttemptStatus =
  | 'dry_run'
  | 'pending'
  | 'delivered'
  | 'failed'
  | 'retry_scheduled'
  | 'dead_lettered'
  | 'replayed'
  | 'blocked';

export interface WebhookDeliveryAttemptRecord {
  id: string;
  outboxId: string;
  webhookId: string | null;
  eventCode: WebhookEventType;
  payloadVersion: string;
  idempotencyKey: string;
  payloadHash: string;
  attemptNumber: number;
  status: WebhookDeliveryAttemptStatus;
  dispatchMode: 'disabled' | 'local_stub' | 'local_dispatch' | 'provider_dispatch';
  endpointUrl: string;
  requestHeaders: Record<string, unknown>;
  requestBodySummary: unknown;
  responseStatus: number | null;
  responseBodySummary: unknown;
  errorCode: string | null;
  errorMessage: string | null;
  latencyMs: number | null;
  nextRetryAt: string | null;
  deliveredAt: string | null;
  replayReason: string | null;
  traceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDeliveryAttemptPage {
  items: WebhookDeliveryAttemptRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WebhookDeliveryOperationPayload {
  reason: string;
  dryRun?: boolean;
  sampleEventCode?: WebhookEventType;
  idempotencyKey?: string;
}

export interface WebhookDeliveryOperationResult {
  accepted: boolean;
  duplicate: boolean;
  dryRun: boolean;
  dispatchMode: WebhookDeliveryAttemptRecord['dispatchMode'];
  status: WebhookDeliveryAttemptStatus | 'duplicate';
  webhookId: string;
  outboxId: string;
  attemptId: string | null;
  eventCode: WebhookEventType;
  payloadVersion: string;
  idempotencyKey: string;
  traceId: string | null;
  redacted: true;
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
  name: LocalizedText;
  subject: LocalizedText;
  bodyHtml: LocalizedText;
  bodyText: LocalizedText;
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
  definitionKey?: string;
  platformId?: string;
  code?: string;
  name?: LocalizedText;
  adapterType?: AdapterType;
  inherit?: boolean;
  configs?: Array<{
    configKey: string;
    configValue: string;
  }>;
}

export interface UpdateTenantAdapterPayload {
  name?: PartialLocalizedText;
  inherit?: boolean;
  version: number;
}

export interface UpdateTenantAdapterConfigsPayload {
  configs: Array<{
    configKey: string;
    mutation?: 'keep' | 'replace' | 'clear';
    configValue?: string;
  }>;
  adapterVersion: number;
}

export interface CreateWebhookPayload {
  definitionKey?: string;
  code?: string;
  name?: LocalizedText;
  url: string;
  secret?: string;
  events?: WebhookEventType[];
  headers?: Record<string, string>;
  monitoredTalentIds?: string[];
  retryPolicy?: {
    maxRetries?: number;
    backoffMs?: number;
  };
}

export interface UpdateWebhookPayload {
  name?: PartialLocalizedText;
  url?: string;
  secret?: string;
  events?: WebhookEventType[];
  headers?: Record<string, string>;
  monitoredTalentIds?: string[];
  retryPolicy?: {
    maxRetries?: number;
    backoffMs?: number;
  };
  version: number;
}

export interface CreateConsumerPayload {
  code: string;
  name: LocalizedText;
  consumerCategory: ConsumerCategory;
  contactName?: string;
  contactEmail?: string;
  allowedIps?: string[];
  rateLimit?: number;
  notes?: string;
}

export interface UpdateConsumerPayload {
  name?: PartialLocalizedText;
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
  name: LocalizedText;
  subject: LocalizedText;
  bodyHtml: LocalizedText;
  bodyText?: LocalizedText;
  variables?: string[];
  category: EmailTemplateCategory;
}

export interface UpdateEmailTemplatePayload {
  name?: PartialLocalizedText;
  subject?: PartialLocalizedText;
  bodyHtml?: PartialLocalizedText;
  bodyText?: PartialLocalizedText;
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
const EMAIL_SENDER_TENANT_PAGE_SIZE = 100;
const MAX_EMAIL_SENDER_TENANT_PAGES = 100;

async function listConfigurationEntitiesAcrossPages<T>(
  request: RequestFn,
  entityType: 'social-platform' | 'consumer',
  includeInactive: boolean
): Promise<T[]> {
  const items: T[] = [];

  for (let page = 1; page <= MAX_CONFIGURATION_ENTITY_PAGES; page += 1) {
    const batch = await request<T[]>(
      `/api/v1/configuration-entity/${entityType}${buildQueryString({
        includeInactive,
        page,
        pageSize: CONFIGURATION_ENTITY_PAGE_SIZE,
      })}`
    );

    items.push(...batch);

    if (batch.length < CONFIGURATION_ENTITY_PAGE_SIZE) {
      break;
    }
  }

  return items;
}

export function listSocialPlatforms(request: RequestFn) {
  return listConfigurationEntitiesAcrossPages<SocialPlatformRecord>(
    request,
    'social-platform',
    false
  );
}

export function listConsumers(request: RequestFn) {
  return listConfigurationEntitiesAcrossPages<IntegrationConsumerRecord>(request, 'consumer', true);
}

export function listAdapterDefinitions(request: RequestFn) {
  return request<IntegrationAdapterDefinition[]>('/api/v1/integration/adapter-definitions');
}

export function listWebhookDefinitions(request: RequestFn) {
  return request<IntegrationWebhookDefinition[]>('/api/v1/integration/webhook-definitions');
}

export function createConsumer(request: RequestFn, payload: CreateConsumerPayload) {
  return request<IntegrationConsumerRecord>(
    '/api/v1/configuration-entity/consumer',
    buildJsonRequestInit('POST', payload)
  );
}

export function updateConsumer(
  request: RequestFn,
  consumerId: string,
  payload: UpdateConsumerPayload
) {
  return request<IntegrationConsumerRecord>(
    `/api/v1/configuration-entity/consumer/${consumerId}`,
    buildJsonRequestInit('PATCH', payload)
  );
}

export function deactivateConsumer(request: RequestFn, consumerId: string, version: number) {
  return request<IntegrationActivationResponse>(
    `/api/v1/configuration-entity/consumer/${consumerId}/deactivate`,
    buildJsonRequestInit('POST', { version })
  );
}

export function reactivateConsumer(request: RequestFn, consumerId: string, version: number) {
  return request<IntegrationActivationResponse>(
    `/api/v1/configuration-entity/consumer/${consumerId}/reactivate`,
    buildJsonRequestInit('POST', { version })
  );
}

export function generateConsumerKey(request: RequestFn, consumerId: string) {
  return request<ConsumerKeyMutationResponse>(
    `/api/v1/configuration-entity/consumer/${consumerId}/generate-key`,
    buildJsonRequestInit('POST')
  );
}

export function rotateConsumerKey(request: RequestFn, consumerId: string) {
  return request<ConsumerKeyMutationResponse>(
    `/api/v1/configuration-entity/consumer/${consumerId}/rotate-key`,
    buildJsonRequestInit('POST')
  );
}

export function revokeConsumerKey(request: RequestFn, consumerId: string) {
  return request<ConsumerKeyMutationResponse>(
    `/api/v1/configuration-entity/consumer/${consumerId}/revoke-key`,
    buildJsonRequestInit('POST')
  );
}

export function listTenantAdapters(request: RequestFn, options: ListTenantAdaptersOptions = {}) {
  return request<IntegrationAdapterListItemRecord[]>(
    `/api/v1/integration/adapters${buildQueryString({
      platformId: options.platformId,
      adapterType: options.adapterType,
      includeInherited: options.includeInherited ?? true,
      includeDisabled: options.includeDisabled ?? true,
    })}`
  );
}

export function listScopedAdapters(
  request: RequestFn,
  scope: IntegrationAdapterScope,
  options: ListTenantAdaptersOptions = {}
) {
  return request<IntegrationAdapterListItemRecord[]>(
    `${buildAdapterCollectionPath(scope)}${buildQueryString({
      platformId: options.platformId,
      adapterType: options.adapterType,
      includeInherited: options.includeInherited ?? true,
      includeDisabled: options.includeDisabled ?? true,
    })}`
  );
}

export function readTenantAdapter(request: RequestFn, adapterId: string) {
  return request<IntegrationAdapterDetailRecord>(`/api/v1/integration/adapters/${adapterId}`);
}

export function createTenantAdapter(request: RequestFn, payload: CreateTenantAdapterPayload) {
  return request<IntegrationAdapterDetailRecord>(
    '/api/v1/integration/adapters',
    buildJsonRequestInit('POST', payload)
  );
}

export function createScopedAdapter(
  request: RequestFn,
  scope: IntegrationAdapterScope,
  payload: CreateTenantAdapterPayload
) {
  return request<IntegrationAdapterDetailRecord>(
    buildAdapterCollectionPath(scope),
    buildJsonRequestInit('POST', payload)
  );
}

export function updateTenantAdapter(
  request: RequestFn,
  adapterId: string,
  payload: UpdateTenantAdapterPayload
) {
  return request<IntegrationAdapterDetailRecord>(
    `/api/v1/integration/adapters/${adapterId}`,
    buildJsonRequestInit('PATCH', payload)
  );
}

export function updateTenantAdapterConfigs(
  request: RequestFn,
  adapterId: string,
  payload: UpdateTenantAdapterConfigsPayload
) {
  return request<UpdateAdapterConfigsResponse>(
    `/api/v1/integration/adapters/${adapterId}/configs`,
    buildJsonRequestInit('PATCH', payload)
  );
}

export function revealTenantAdapterConfig(
  request: RequestFn,
  adapterId: string,
  configKey: string
) {
  return request<RevealAdapterConfigResponse>(
    `/api/v1/integration/adapters/${adapterId}/configs/${encodeURIComponent(configKey)}/reveal`,
    buildJsonRequestInit('POST')
  );
}

export function deactivateTenantAdapter(request: RequestFn, adapterId: string) {
  return request<IntegrationActivationResponse>(
    `/api/v1/integration/adapters/${adapterId}/deactivate`,
    buildJsonRequestInit('POST')
  );
}

export function reactivateTenantAdapter(request: RequestFn, adapterId: string) {
  return request<IntegrationActivationResponse>(
    `/api/v1/integration/adapters/${adapterId}/reactivate`,
    buildJsonRequestInit('POST')
  );
}

export function disableInheritedScopedAdapter(
  request: RequestFn,
  scope: Exclude<IntegrationAdapterScope, { ownerType: 'tenant' }>,
  adapterId: string
) {
  return request<IntegrationActivationResponse>(
    `${buildAdapterCollectionPath(scope)}/${encodeURIComponent(adapterId)}/disable`,
    buildJsonRequestInit('POST')
  );
}

export function enableInheritedScopedAdapter(
  request: RequestFn,
  scope: Exclude<IntegrationAdapterScope, { ownerType: 'tenant' }>,
  adapterId: string
) {
  return request<IntegrationActivationResponse>(
    `${buildAdapterCollectionPath(scope)}/${encodeURIComponent(adapterId)}/enable`,
    buildJsonRequestInit('POST')
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
    buildJsonRequestInit('POST', payload)
  );
}

export function updateWebhook(
  request: RequestFn,
  webhookId: string,
  payload: UpdateWebhookPayload
) {
  return request<IntegrationWebhookDetailRecord>(
    `/api/v1/integration/webhooks/${webhookId}`,
    buildJsonRequestInit('PATCH', payload)
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
    buildJsonRequestInit('POST')
  );
}

export function reactivateWebhook(request: RequestFn, webhookId: string) {
  return request<IntegrationActivationResponse>(
    `/api/v1/integration/webhooks/${webhookId}/reactivate`,
    buildJsonRequestInit('POST')
  );
}

export function listWebhookDeliveryAttempts(request: RequestFn, webhookId: string) {
  return request<WebhookDeliveryAttemptPage>(
    `/api/v1/integration/webhooks/${webhookId}/delivery-attempts`
  );
}

export function createWebhookTestDelivery(
  request: RequestFn,
  webhookId: string,
  payload: WebhookDeliveryOperationPayload
) {
  return request<WebhookDeliveryOperationResult>(
    `/api/v1/integration/webhooks/${webhookId}/test-delivery`,
    buildJsonRequestInit('POST', payload)
  );
}

export function replayWebhookDeliveryAttempt(
  request: RequestFn,
  webhookId: string,
  attemptId: string,
  payload: WebhookDeliveryOperationPayload
) {
  return request<WebhookDeliveryOperationResult>(
    `/api/v1/integration/webhooks/${webhookId}/delivery-attempts/${attemptId}/replay`,
    buildJsonRequestInit('POST', payload)
  );
}

export function readEmailConfig(request: RequestFn) {
  return request<EmailConfigResponse>('/api/v1/email/config');
}

export function saveEmailConfig(request: RequestFn, payload: SaveEmailConfigPayload) {
  return request<EmailConfigResponse>(
    '/api/v1/email/config',
    buildJsonRequestInit('PATCH', payload)
  );
}

export function testEmailConnection(request: RequestFn) {
  return request<EmailActionResult>(
    '/api/v1/email/config/test-connection',
    buildJsonRequestInit('POST')
  );
}

export function sendEmailTest(request: RequestFn, testEmail: string) {
  return request<EmailActionResult>(
    '/api/v1/email/config/test',
    buildJsonRequestInit('POST', { testEmail })
  );
}

export async function listEmailSenderTenants(
  request: RequestFn
): Promise<EmailSenderTenantTarget[]> {
  const tenants: EmailSenderTenantTarget[] = [];

  for (let page = 1; page <= MAX_EMAIL_SENDER_TENANT_PAGES; page += 1) {
    const batch = await request<EmailSenderTenantTarget[]>(
      `/api/v1/tenants${buildQueryString({
        page,
        pageSize: EMAIL_SENDER_TENANT_PAGE_SIZE,
        tier: 'standard',
        isActive: true,
      })}`
    );

    tenants.push(...batch);

    if (batch.length < EMAIL_SENDER_TENANT_PAGE_SIZE) {
      break;
    }
  }

  return tenants;
}

export function listEmailTemplates(
  request: RequestFn,
  options: {
    category?: EmailTemplateCategory;
    isActive?: boolean;
  } = {}
) {
  return request<EmailTemplateRecord[]>(
    `/api/v1/email-templates${buildQueryString({
      category: options.category,
      isActive: options.isActive,
    })}`
  );
}

export function createEmailTemplate(request: RequestFn, payload: CreateEmailTemplatePayload) {
  return request<EmailTemplateRecord>(
    '/api/v1/email-templates',
    buildJsonRequestInit('POST', payload)
  );
}

export function updateEmailTemplate(
  request: RequestFn,
  code: string,
  payload: UpdateEmailTemplatePayload
) {
  return request<EmailTemplateRecord>(
    `/api/v1/email-templates/${encodeURIComponent(code)}`,
    buildJsonRequestInit('PATCH', payload)
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
    buildJsonRequestInit('POST')
  );
}

export function previewEmailTemplate(
  request: RequestFn,
  code: string,
  locale: EmailLocale | undefined,
  variables: Record<string, string>
) {
  return request<EmailTemplatePreviewResponse>(
    `/api/v1/email-templates/${encodeURIComponent(code)}/preview`,
    buildJsonRequestInit('POST', { locale, variables })
  );
}
