// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { platformConfigApi } from '@/lib/api/modules/configuration';

export const PLATFORM_CONFIG_KEYS = {
  baseDomain: 'system.baseDomain',
  platformName: 'system.platformName',
  supportEmail: 'system.supportEmail',
  adminEmail: 'system.adminEmail',
  sessionTimeout: 'security.sessionTimeout',
  maxLoginAttempts: 'security.maxLoginAttempts',
  logRetention: 'data.logRetention',
} as const;

export const platformSettingsDomainApi = {
  getEntry: <TValue,>(key: string) => platformConfigApi.get<TValue>(key),
  setEntry: <TValue,>(key: string, value: TValue) => platformConfigApi.set(key, value),
};
