import type { SupportedUiLocale } from '@tcrn/shared';

export type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

export type PlatformToolConnectionEnvironment = 'local' | 'shared_dev' | 'staging' | 'production';
export type PlatformToolFamily =
  | 'identity_provider'
  | 'observability_console'
  | 'runtime_flags'
  | 'webhook_delivery'
  | 'event_backbone'
  | 'api_gateway'
  | 'internal_tooling'
  | 'developer_portal'
  | 'external_authorization';
export type PlatformToolLocalDevMode =
  | 'disabled'
  | 'stubbed'
  | 'compose_opt_in'
  | 'external_provided';

export interface PlatformToolDefinitionRecord {
  code: string;
  family: PlatformToolFamily;
  displayKey: string;
  label: string;
  localizedLabel: Partial<Record<SupportedUiLocale, string>> & {
    zh_HANS?: string;
    zh_HANT?: string;
  };
  defaultState: string;
  ownerPhase: string;
  humanUi: boolean;
  deepLink: boolean;
  allowedLocalDevModes: PlatformToolLocalDevMode[];
  ssoRequirement: 'required' | 'not_applicable';
  licensePosture: string;
  defaultConnection: 'none';
  sortOrder: number;
  sourceOfTruthBoundary: string;
}

export interface PlatformToolConnectionRecord {
  id: string | null;
  tenantId?: string;
  toolCode: string;
  environment: PlatformToolConnectionEnvironment;
  deploymentMode: PlatformToolLocalDevMode;
  localDevMode: PlatformToolLocalDevMode;
  endpointUrl: string | null;
  internalServiceUrl: string | null;
  namespace: string | null;
  serviceName: string | null;
  enabled: boolean;
  readinessState: string;
  ssoReadinessState: 'blocked' | 'ready' | 'not_applicable';
  healthStatus: string;
  lastCheckedAt: string | null;
  configVersion: number;
  version: number;
}

export interface PlatformToolConfigValueRecord {
  configKey: string;
  isSecret: boolean;
  value: unknown;
  secretRef: string | null;
  secretStatus: string;
  updatedAt: string;
}

export interface PlatformToolSsoReadinessRecord {
  status: 'blocked' | 'ready' | 'not_applicable';
  failClosed: boolean;
  evidence: Record<string, unknown>;
}

export interface PlatformToolHealthSnapshotRecord {
  id: string;
  status: string;
  latencyMs: number | null;
  safeDetails: Record<string, unknown>;
  checkedAt: string;
  checkedBy: string | null;
}

export interface PlatformToolAuditRecord {
  id: string;
  toolCode: string;
  action: string;
  afterState: Record<string, unknown> | null;
  createdAt: string;
}

export interface PlatformToolConnectionBundle {
  definition: PlatformToolDefinitionRecord;
  connection: PlatformToolConnectionRecord;
  configValues: PlatformToolConfigValueRecord[];
  ssoReadiness: PlatformToolSsoReadinessRecord;
  healthSnapshots: PlatformToolHealthSnapshotRecord[];
  auditTrail: PlatformToolAuditRecord[];
}

export interface UpsertPlatformToolConnectionPayload {
  environment?: PlatformToolConnectionEnvironment;
  deploymentMode?: PlatformToolLocalDevMode;
  localDevMode?: PlatformToolLocalDevMode;
  endpointUrl?: string | null;
  internalServiceUrl?: string | null;
  namespace?: string | null;
  serviceName?: string | null;
  enabled?: boolean;
  version?: number;
  configs?: Array<{
    configKey: string;
    mutation: 'keep' | 'replace' | 'clear' | 'reference';
    isSecret?: boolean;
    configValue?: Record<string, unknown>;
    secretRef?: string;
  }>;
}

export interface PlatformToolDeepLinkReadiness {
  toolCode: string;
  environment: PlatformToolConnectionEnvironment;
  state: string;
  url: string | null;
  opensInNewTab: boolean;
}

export interface PlatformToolHealthCheckResult {
  toolCode: string;
  environment: PlatformToolConnectionEnvironment;
  snapshot: PlatformToolHealthSnapshotRecord;
}

export interface PlatformToolListOptions {
  environment?: PlatformToolConnectionEnvironment;
  family?: PlatformToolFamily | 'all';
}

function buildQueryString(input: Record<string, string | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (!value || value === 'all') {
      continue;
    }

    params.set(key, value);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

function buildJsonRequestInit(method: 'PATCH' | 'POST', body?: unknown): RequestInit {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

export function listPlatformToolConnections(
  request: RequestFn,
  options: PlatformToolListOptions = {}
) {
  return request<PlatformToolConnectionBundle[]>(
    `/api/v1/platform-tools/connections${buildQueryString({
      environment: options.environment,
      family: options.family === 'all' ? undefined : options.family,
    })}`
  );
}

export function readPlatformToolConnection(
  request: RequestFn,
  toolCode: string,
  environment: PlatformToolConnectionEnvironment
) {
  return request<PlatformToolConnectionBundle>(
    `/api/v1/platform-tools/connections/${encodeURIComponent(toolCode)}${buildQueryString({
      environment,
    })}`
  );
}

export function savePlatformToolConnection(
  request: RequestFn,
  toolCode: string,
  payload: UpsertPlatformToolConnectionPayload
) {
  return request<PlatformToolConnectionBundle>(
    `/api/v1/platform-tools/connections/${encodeURIComponent(toolCode)}`,
    buildJsonRequestInit('PATCH', payload)
  );
}

export function runPlatformToolHealthCheck(
  request: RequestFn,
  toolCode: string,
  environment: PlatformToolConnectionEnvironment
) {
  return request<PlatformToolHealthCheckResult>(
    `/api/v1/platform-tools/connections/${encodeURIComponent(toolCode)}/health-check${buildQueryString({
      environment,
    })}`,
    buildJsonRequestInit('POST')
  );
}

export function readPlatformToolDeepLink(
  request: RequestFn,
  toolCode: string,
  environment: PlatformToolConnectionEnvironment
) {
  return request<PlatformToolDeepLinkReadiness>(
    `/api/v1/platform-tools/connections/${encodeURIComponent(toolCode)}/deep-link${buildQueryString({
      environment,
    })}`
  );
}
