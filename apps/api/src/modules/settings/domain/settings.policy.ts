// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

export type SettingsScopeType = 'tenant' | 'subsidiary' | 'talent';
export type TurnstileConfigSource = 'tenant' | 'environment' | 'none';
export type TurnstileRuntimeEnvironment = 'development' | 'test' | 'staging' | 'production';

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

export const TENANT_TURNSTILE_SETTINGS_KEY = 'turnstileConfig';
export const TURNSTILE_SECRET_MASK = '********';

export const DEFAULT_SETTINGS: Record<string, unknown> = {
  defaultLanguage: 'en',
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  currency: 'USD',
  customerImportEnabled: true,
  maxImportRows: 50000,
  totpRequiredForAll: false,
  allowCustomHomepage: true,
  allowMarshmallow: true,
  passwordPolicy: {
    minLength: 12,
    requireSpecial: true,
    maxAgeDays: 90,
  },
};

export function normalizeTurnstileRuntimeEnvironment(
  value: string | null | undefined,
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

export function readStoredTenantTurnstileSettings(
  settings: Record<string, unknown> | null,
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

export function hasStoredTenantTurnstileSettings(
  settings: StoredTenantTurnstileSettings,
): boolean {
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
