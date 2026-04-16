// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

export type SettingsScopeType = 'tenant' | 'subsidiary' | 'talent';

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
