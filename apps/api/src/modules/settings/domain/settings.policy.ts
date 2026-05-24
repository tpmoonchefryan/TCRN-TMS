// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { ArtistLifecycleFlow } from '@tcrn/shared';

export type SettingsScopeType = 'tenant' | 'subsidiary' | 'talent';
export type TurnstileConfigSource = 'tenant' | 'environment' | 'none';
export type TurnstileRuntimeEnvironment = 'development' | 'test' | 'staging' | 'production';
export type SettingsWriteScope = 'scope-overridable' | 'tenant-only';
export type SettingsUpdateSurface = 'general' | 'dedicated';

export interface ScopeSettings {
  scopeType: SettingsScopeType;
  scopeId: string | null;
  settings: Record<string, unknown>;
  overrides: string[];
  inheritedFrom: Record<string, string>;
  version: number;
}

export interface ScopeOwnSettingsRecord {
  settings: Record<string, unknown>;
  version: number;
}

export interface SettingsScopeRef {
  type: SettingsScopeType;
  id: string | null;
}

export interface StoredTenantTurnstileSettings {
  siteKey: string | null;
  secretKeyEncrypted: string | null;
  updatedAt: string | null;
}

export interface TenantTurnstileRuntimeConfig {
  source: TurnstileConfigSource;
  siteKey: string | null;
  secretKey: string | null;
  tenantSiteKey: string | null;
  tenantSecretKeyConfigured: boolean;
}

export interface TenantTurnstileSettingsResponse {
  siteKey: string | null;
  effectiveSiteKey: string | null;
  source: TurnstileConfigSource;
  environment: TurnstileRuntimeEnvironment;
  siteKeyConfigured: boolean;
  secretKeyConfigured: boolean;
  providerReady: boolean;
  runtimeBypass: boolean;
  ready: boolean;
  secretKeyMasked: string | null;
}

export interface UpdateTenantTurnstileSettingsInput {
  siteKey?: string | null;
  secretKeyMutation?: 'keep' | 'replace' | 'clear';
  secretKey?: string | null;
}

export interface SettingsContractDefinition {
  key: string;
  updateSurface: SettingsUpdateSurface;
  writeScope: SettingsWriteScope;
}

export interface ArtistLifecycleFlowValidationIssue {
  message: string;
  path: string[];
}

export interface ArtistLifecycleFlowSettingsResponse {
  flow: ArtistLifecycleFlow;
  inheritedFrom: 'default' | 'tenant';
  scopeId: string | null;
  scopeType: SettingsScopeType;
  validationIssues: ArtistLifecycleFlowValidationIssue[];
  version: number;
  writable: boolean;
}

export const TENANT_TURNSTILE_SETTINGS_KEY = 'turnstileConfig';
export const ARTIST_LIFECYCLE_FLOW_SETTINGS_KEY = 'artistLifecycleFlow';
export const TURNSTILE_SECRET_MASK = '********';

export const DEFAULT_SETTINGS: Record<string, unknown> = {
  defaultLanguage: 'en',
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  currency: 'USD',
  customerImportEnabled: true,
  maxImportRows: 50000,
  totpRequiredForAll: false,
  allowMarshmallow: true,
  passwordPolicy: {
    minLength: 12,
    requireSpecial: true,
    maxAgeDays: 90,
  },
};

export const SETTINGS_CONTRACT_DEFINITIONS: SettingsContractDefinition[] = [
  {
    key: 'defaultLanguage',
    writeScope: 'scope-overridable',
    updateSurface: 'general',
  },
  {
    key: 'timezone',
    writeScope: 'scope-overridable',
    updateSurface: 'general',
  },
  {
    key: 'dateFormat',
    writeScope: 'scope-overridable',
    updateSurface: 'general',
  },
  {
    key: 'currency',
    writeScope: 'scope-overridable',
    updateSurface: 'general',
  },
  {
    key: 'customerImportEnabled',
    writeScope: 'scope-overridable',
    updateSurface: 'general',
  },
  {
    key: 'maxImportRows',
    writeScope: 'scope-overridable',
    updateSurface: 'general',
  },
  {
    key: 'totpRequiredForAll',
    writeScope: 'scope-overridable',
    updateSurface: 'general',
  },
  {
    key: 'allowMarshmallow',
    writeScope: 'scope-overridable',
    updateSurface: 'general',
  },
  {
    key: 'passwordPolicy',
    writeScope: 'tenant-only',
    updateSurface: 'general',
  },
  {
    key: TENANT_TURNSTILE_SETTINGS_KEY,
    writeScope: 'tenant-only',
    updateSurface: 'dedicated',
  },
  {
    key: ARTIST_LIFECYCLE_FLOW_SETTINGS_KEY,
    writeScope: 'tenant-only',
    updateSurface: 'dedicated',
  },
];

const SETTINGS_CONTRACT_BY_KEY = new Map(
  SETTINGS_CONTRACT_DEFINITIONS.map((definition) => [definition.key, definition])
);

export function normalizeTurnstileRuntimeEnvironment(
  value: string | null | undefined
): TurnstileRuntimeEnvironment {
  if (value === 'production' || value === 'staging' || value === 'test') {
    return value;
  }

  return 'development';
}

export function normalizeNullableSettingString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

export function createEmptyArtistLifecycleFlow(): ArtistLifecycleFlow {
  return {
    nodes: [],
    transitions: [],
    homepagePolicyByStage: [],
  };
}

export function normalizeStoredArtistLifecycleFlow(value: unknown): ArtistLifecycleFlow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createEmptyArtistLifecycleFlow();
  }

  const record = value as Record<string, unknown>;

  return {
    nodes: Array.isArray(record.nodes) ? (record.nodes as ArtistLifecycleFlow['nodes']) : [],
    transitions: Array.isArray(record.transitions)
      ? (record.transitions as ArtistLifecycleFlow['transitions'])
      : [],
    homepagePolicyByStage: Array.isArray(record.homepagePolicyByStage)
      ? (record.homepagePolicyByStage as ArtistLifecycleFlow['homepagePolicyByStage'])
      : [],
  };
}

export function getSettingsContractDefinition(key: string): SettingsContractDefinition | null {
  return SETTINGS_CONTRACT_BY_KEY.get(key) ?? null;
}

export function isTenantOnlySettingsKey(key: string): boolean {
  return getSettingsContractDefinition(key)?.writeScope === 'tenant-only';
}

export function canUpdateSettingsKeyThroughGeneralSettings(key: string): boolean {
  return (getSettingsContractDefinition(key)?.updateSurface ?? 'general') === 'general';
}

export function readStoredTenantTurnstileSettings(
  settings: Record<string, unknown> | null
): StoredTenantTurnstileSettings {
  const raw = settings?.[TENANT_TURNSTILE_SETTINGS_KEY];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      siteKey: null,
      secretKeyEncrypted: null,
      updatedAt: null,
    };
  }

  const record = raw as Record<string, unknown>;

  return {
    siteKey: normalizeNullableSettingString(record.siteKey),
    secretKeyEncrypted: normalizeNullableSettingString(record.secretKeyEncrypted),
    updatedAt: normalizeNullableSettingString(record.updatedAt),
  };
}

export function hasStoredTenantTurnstileSettings(settings: StoredTenantTurnstileSettings): boolean {
  return Boolean(settings.siteKey || settings.secretKeyEncrypted);
}

export function buildTenantTurnstileSettingsResponse(params: {
  source: TurnstileConfigSource;
  nodeEnv: string | null | undefined;
  tenantSiteKey: string | null;
  effectiveSiteKey: string | null;
  effectiveSecretKey: string | null;
  tenantSecretKeyConfigured: boolean;
}): TenantTurnstileSettingsResponse {
  const environment = normalizeTurnstileRuntimeEnvironment(params.nodeEnv);
  const siteKeyConfigured = Boolean(params.effectiveSiteKey?.trim());
  const secretKeyConfigured = Boolean(params.effectiveSecretKey?.trim());
  const providerReady = siteKeyConfigured && secretKeyConfigured;
  const runtimeBypass = environment === 'development' || environment === 'test';

  return {
    siteKey: params.tenantSiteKey,
    effectiveSiteKey: params.effectiveSiteKey,
    source: params.source,
    environment,
    siteKeyConfigured,
    secretKeyConfigured,
    providerReady,
    runtimeBypass,
    ready: runtimeBypass || providerReady,
    secretKeyMasked: params.tenantSecretKeyConfigured ? TURNSTILE_SECRET_MASK : null,
  };
}

export function createDefaultInheritedFrom(): Record<string, string> {
  return Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map((key) => [key, 'default']));
}

export function getScopeName(scopeType: SettingsScopeType): string {
  if (scopeType === 'tenant') {
    return 'Tenant';
  }
  if (scopeType === 'subsidiary') {
    return 'Subsidiary';
  }
  return 'Talent';
}
