import type { LocalizedText } from '@tcrn/shared';

export type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

export type RuntimeFlagEnvironment = 'local' | 'shared_dev' | 'staging' | 'production';

export interface RuntimeFlagAdapterDefinition {
  code: string;
  label: string;
  localizedLabel: LocalizedText;
  kind: string;
  platformToolCode: string | null;
  defaultEnabled: boolean;
  defaultReadinessState: string;
  ownerPhase: string;
  humanUi: boolean;
  deepLink: boolean;
  evaluationCapability: string;
  localDevModes: readonly string[];
  ssoRequirement: string;
  licensePosture: string;
  sourceOfTruthBoundary: string;
  defaultNoProviderBehavior: string;
  sortOrder: number;
}

export interface RuntimeFlagDefinition {
  code: string;
  label: string;
  localizedLabel: LocalizedText;
  category: string;
  status: string;
  ownerModule: string;
  defaultValue: boolean | string | number;
  failBehavior: string;
  allowedContextKeys: readonly string[];
  providerMapping: {
    adapterCode: string;
    providerKey: string | null;
  };
  hasProductEffect: boolean;
  expiresAt: string | null;
  auditPolicy: string;
  description: string;
  updatedAt: string;
  sortOrder: number;
}

export interface RuntimeFlagKillSwitch {
  id: string;
  flagCode: string;
  status: string;
  affectedBehavior: string;
  reason: string;
  rollbackInstruction: string;
  source: string;
  expiresAt: string;
  activatedBy: string | null;
  deactivatedBy: string | null;
  deactivatedAt: string | null;
  auditMetadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RuntimeFlagProviderReadiness {
  adapterCode: string;
  environment: RuntimeFlagEnvironment;
  profile: {
    platformToolCode: string;
    connectionId: string | null;
    enabled: boolean;
    deploymentMode: string;
    localDevMode: string;
    readinessState: string;
    healthStatus: string;
    ssoState: string;
    endpointConfigured: boolean;
    lastCheckedAt: string | null;
    configVersion: number;
  };
  sourceOfTruthBoundary: string;
}

export interface RuntimeFlagSummary {
  checkedAt: string;
  environment: RuntimeFlagEnvironment;
  summary: {
    registeredFlagCount: number;
    activeKillSwitchCount: number;
    providerMode: string;
    providerHealth: string;
    lastEvaluationFallback: string;
    lastAuditEvent: string | null;
  };
  adapters: Array<{
    definition: RuntimeFlagAdapterDefinition;
    profile: {
      adapterCode: string;
      enabled: boolean;
      readinessState: string;
      providerMode: string;
      platformToolCode: string | null;
      platformToolConnectionId: string | null;
      healthStatus: string;
      ssoState: string;
      endpointConfigured: boolean;
    };
  }>;
  definitions: RuntimeFlagDefinition[];
  activeKillSwitches: RuntimeFlagKillSwitch[];
  policy: {
    productAuthority: string;
    providerAuthority: string;
    rawProviderRuleEditingAllowed: false;
    providerMayCreateUnknownFlags: false;
    tenantSettingsFeaturesAllowed: false;
    globalConfigFeatureFlagsAllowed: false;
  };
}

export interface RuntimeFlagEvaluationResult {
  flagCode: string;
  value: boolean | string | number;
  variant: string;
  reason: string;
  source: string;
  defaulted: boolean;
  fallback: boolean;
  providerStatus: string;
  correlationId: string | null;
  context: Record<string, unknown>;
  blockedContextKeys: string[];
  entitlementAuthority: string;
  killSwitch: RuntimeFlagKillSwitch | null;
}

export interface RuntimeFlagKillSwitchPayload {
  flagCode: string;
  affectedBehavior: string;
  reason: string;
  expiresAt: string;
  rollbackInstruction: string;
  explicitConfirmation: boolean;
  metadata?: Record<string, unknown>;
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

export function readRuntimeFlagSummary(
  request: RequestFn,
  options: { environment?: RuntimeFlagEnvironment } = {}
) {
  return request<RuntimeFlagSummary>(
    `/api/v1/runtime-flags/summary${buildQueryString({
      environment: options.environment ?? 'local',
    })}`
  );
}

export function readRuntimeFlagProviderReadiness(
  request: RequestFn,
  options: { environment?: RuntimeFlagEnvironment } = {}
) {
  return request<RuntimeFlagProviderReadiness>(
    `/api/v1/runtime-flags/provider-readiness${buildQueryString({
      environment: options.environment ?? 'local',
    })}`
  );
}

export function evaluateRuntimeFlag(
  request: RequestFn,
  flagCode: string,
  context: Record<string, unknown>
) {
  return request<RuntimeFlagEvaluationResult>('/api/v1/runtime-flags/evaluate', {
    method: 'POST',
    body: JSON.stringify({ flagCode, context }),
  });
}

export function activateRuntimeKillSwitch(
  request: RequestFn,
  payload: RuntimeFlagKillSwitchPayload
) {
  return request<{ killSwitch: RuntimeFlagKillSwitch; auditState: string }>(
    '/api/v1/runtime-flags/kill-switches',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export function deactivateRuntimeKillSwitch(
  request: RequestFn,
  switchId: string,
  payload: { rollbackInstruction: string; metadata?: Record<string, unknown> }
) {
  return request<{ killSwitch: RuntimeFlagKillSwitch; auditState: string }>(
    `/api/v1/runtime-flags/kill-switches/${encodeURIComponent(switchId)}/deactivate`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
}
