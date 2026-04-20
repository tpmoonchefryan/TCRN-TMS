// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  DEFAULT_EMAIL_FROM_ADDRESS,
  DEFAULT_EMAIL_FROM_NAME,
  DEFAULT_EMAIL_PROVIDER,
  DEFAULT_TENCENT_SES_REGION,
  type StoredEmailConfig,
} from '@tcrn/shared';

import type {
  DecryptedEmailConfig,
  EmailConfigResponse,
  SaveEmailConfigDto,
} from '../dto/email-config.dto';

interface EmailConfigMaskOptions {
  lastUpdated?: Date;
  maskValue: (value: string) => string;
}

interface EmailConfigEnvFallbackInput {
  secretId?: string;
  secretKey?: string;
  region?: string;
  fromAddress?: string;
  fromName?: string;
  replyTo?: string;
}

export const buildDecryptedEmailConfig = (
  storedConfig: StoredEmailConfig,
  decryptField: (value: string) => string,
): DecryptedEmailConfig => {
  const result: DecryptedEmailConfig = {
    provider: storedConfig.provider,
  };

  if (storedConfig.tencentSes) {
    result.tencentSes = {
      secretId: decryptField(storedConfig.tencentSes.secretId ?? ''),
      secretKey: decryptField(storedConfig.tencentSes.secretKey ?? ''),
      region: storedConfig.tencentSes.region || DEFAULT_TENCENT_SES_REGION,
      fromAddress: storedConfig.tencentSes.fromAddress ?? '',
      fromName: storedConfig.tencentSes.fromName ?? '',
      replyTo: storedConfig.tencentSes.replyTo,
    };
  }

  if (storedConfig.smtp) {
    result.smtp = {
      host: storedConfig.smtp.host ?? '',
      port: storedConfig.smtp.port ?? 465,
      secure: storedConfig.smtp.secure ?? true,
      username: storedConfig.smtp.username ?? '',
      password: decryptField(storedConfig.smtp.password ?? ''),
      fromAddress: storedConfig.smtp.fromAddress ?? '',
      fromName: storedConfig.smtp.fromName ?? '',
    };
  }

  if (storedConfig.tenantSenderOverrides) {
    result.tenantSenderOverrides = storedConfig.tenantSenderOverrides;
  }

  return result;
};

export const buildMaskedEmailConfigResponse = (
  config: DecryptedEmailConfig,
  options: EmailConfigMaskOptions,
): EmailConfigResponse => {
  const response: EmailConfigResponse = {
    provider: config.provider,
    isConfigured: true,
    lastUpdated: options.lastUpdated?.toISOString(),
  };

  if (config.tencentSes) {
    response.tencentSes = {
      secretId: options.maskValue(config.tencentSes.secretId),
      secretKey: options.maskValue(config.tencentSes.secretKey),
      region: config.tencentSes.region || DEFAULT_TENCENT_SES_REGION,
      fromAddress: config.tencentSes.fromAddress,
      fromName: config.tencentSes.fromName,
      replyTo: config.tencentSes.replyTo,
    };
  }

  if (config.smtp) {
    response.smtp = {
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      username: config.smtp.username,
      password: options.maskValue(config.smtp.password),
      fromAddress: config.smtp.fromAddress,
      fromName: config.smtp.fromName,
    };
  }

  if (config.tenantSenderOverrides) {
    response.tenantSenderOverrides = config.tenantSenderOverrides;
  }

  return response;
};

export const buildStoredEmailConfig = (
  dto: SaveEmailConfigDto,
  existingDecrypted: DecryptedEmailConfig | null,
  encryptSecret: (value: string) => string,
): StoredEmailConfig => {
  const newConfig: StoredEmailConfig = {
    provider: dto.provider,
  };

  if (dto.tencentSes) {
    const tencentSes: NonNullable<StoredEmailConfig['tencentSes']> = {
      region: dto.tencentSes.region || DEFAULT_TENCENT_SES_REGION,
      fromAddress: dto.tencentSes.fromAddress,
      fromName: dto.tencentSes.fromName,
    };

    if (dto.tencentSes.replyTo) {
      tencentSes.replyTo = dto.tencentSes.replyTo;
    }

    const secretId = resolveStoredSecret(
      dto.tencentSes.secretId,
      existingDecrypted?.tencentSes?.secretId,
      encryptSecret,
    );
    if (secretId) {
      tencentSes.secretId = secretId;
    }

    const secretKey = resolveStoredSecret(
      dto.tencentSes.secretKey,
      existingDecrypted?.tencentSes?.secretKey,
      encryptSecret,
    );
    if (secretKey) {
      tencentSes.secretKey = secretKey;
    }

    newConfig.tencentSes = tencentSes;
  }

  if (dto.smtp) {
    const smtp: NonNullable<StoredEmailConfig['smtp']> = {
      host: dto.smtp.host,
      port: dto.smtp.port,
      secure: dto.smtp.secure,
      username: dto.smtp.username,
      fromAddress: dto.smtp.fromAddress,
      fromName: dto.smtp.fromName,
    };

    const password = resolveStoredSecret(
      dto.smtp.password,
      existingDecrypted?.smtp?.password,
      encryptSecret,
    );
    if (password) {
      smtp.password = password;
    }

    newConfig.smtp = smtp;
  }

  const tenantSenderOverrides = normalizeTenantSenderOverrides(
    dto.tenantSenderOverrides ?? existingDecrypted?.tenantSenderOverrides,
  );

  if (tenantSenderOverrides) {
    newConfig.tenantSenderOverrides = tenantSenderOverrides;
  }

  return newConfig;
};

const normalizeTenantSenderOverrides = (
  value: DecryptedEmailConfig['tenantSenderOverrides'] | undefined,
): DecryptedEmailConfig['tenantSenderOverrides'] | undefined => {
  if (!value) {
    return undefined;
  }

  const entries = Object.entries(value)
    .map(([tenantSchema, override]) => {
      const normalized = {
        fromAddress: override.fromAddress?.trim() || undefined,
        fromName: override.fromName?.trim() || undefined,
        replyTo: override.replyTo?.trim() || undefined,
      };

      return [tenantSchema.trim(), normalized] as const;
    })
    .filter((entry) => {
      const [tenantSchema, override] = entry;
      return tenantSchema.length > 0 && !!(override.fromAddress || override.fromName || override.replyTo);
    });

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

export const buildEnvFallbackEmailConfig = (
  input: EmailConfigEnvFallbackInput,
): DecryptedEmailConfig | null => {
  if (!input.secretId || !input.secretKey) {
    return null;
  }

  return {
    provider: DEFAULT_EMAIL_PROVIDER,
    tencentSes: {
      secretId: input.secretId,
      secretKey: input.secretKey,
      region: input.region || DEFAULT_TENCENT_SES_REGION,
      fromAddress: input.fromAddress || DEFAULT_EMAIL_FROM_ADDRESS,
      fromName: input.fromName || DEFAULT_EMAIL_FROM_NAME,
      replyTo: input.replyTo,
    },
  };
};

export const isEmailConfigured = (
  config: DecryptedEmailConfig | null,
): boolean => {
  if (!config) {
    return false;
  }

  if (config.provider === 'tencent_ses') {
    return !!(config.tencentSes?.secretId && config.tencentSes?.secretKey);
  }

  if (config.provider === 'smtp') {
    return !!(config.smtp?.host && config.smtp?.username && config.smtp?.password);
  }

  return false;
};

const resolveStoredSecret = (
  value: string | undefined,
  existingPlaintext: string | undefined,
  encryptSecret: (value: string) => string,
): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (value.includes('***') && existingPlaintext) {
    return encryptSecret(existingPlaintext);
  }

  return encryptSecret(value);
};
