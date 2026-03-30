// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { EmailProvider } from '../schemas/email';

export const EMAIL_CONFIG_KEY = 'email.config';
export const DEFAULT_EMAIL_PROVIDER: EmailProvider = 'tencent_ses';
export const DEFAULT_TENCENT_SES_REGION = 'ap-hongkong';
export const DEFAULT_EMAIL_FROM_ADDRESS = 'noreply@tcrn.app';
export const DEFAULT_EMAIL_FROM_NAME = 'TCRN TMS';

export type StoredTencentSesConfig = {
  secretId?: string;
  secretKey?: string;
  region?: string;
  fromAddress?: string;
  fromName?: string;
  replyTo?: string;
};

export type StoredSmtpConfig = {
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  password?: string;
  fromAddress?: string;
  fromName?: string;
};

export type StoredEmailConfig = {
  provider: EmailProvider;
  tencentSes?: StoredTencentSesConfig;
  smtp?: StoredSmtpConfig;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEmailProvider(value: unknown): value is EmailProvider {
  return value === 'tencent_ses' || value === 'smtp';
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function normalizeTencentSesConfig(value: unknown): StoredTencentSesConfig | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    secretId: getString(value.secretId),
    secretKey: getString(value.secretKey),
    region: getString(value.region),
    fromAddress: getString(value.fromAddress),
    fromName: getString(value.fromName),
    replyTo: getString(value.replyTo),
  };
}

function normalizeSmtpConfig(value: unknown): StoredSmtpConfig | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    host: getString(value.host),
    port: getNumber(value.port),
    secure: getBoolean(value.secure),
    username: getString(value.username),
    password: getString(value.password),
    fromAddress: getString(value.fromAddress),
    fromName: getString(value.fromName),
  };
}

export function normalizeStoredEmailConfig(value: unknown): StoredEmailConfig {
  if (!isRecord(value)) {
    return { provider: DEFAULT_EMAIL_PROVIDER };
  }

  return {
    provider: isEmailProvider(value.provider) ? value.provider : DEFAULT_EMAIL_PROVIDER,
    tencentSes: normalizeTencentSesConfig(value.tencentSes),
    smtp: normalizeSmtpConfig(value.smtp),
  };
}
