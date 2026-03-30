// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@tcrn/database';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

import { DatabaseService } from '../../database';
import type {
  DecryptedEmailConfig,
  EmailConfigResponse,
  EmailProvider,
  SaveEmailConfigDto,
} from '../dto/email-config.dto';

const EMAIL_CONFIG_KEY = 'email.config';
const DEFAULT_EMAIL_PROVIDER: EmailProvider = 'tencent_ses';
const DEFAULT_TENCENT_SES_REGION = 'ap-hongkong';
const DEFAULT_EMAIL_FROM_ADDRESS = 'noreply@tcrn.app';
const DEFAULT_EMAIL_FROM_NAME = 'TCRN TMS';

type StoredTencentSesConfig = {
  secretId?: string;
  secretKey?: string;
  region?: string;
  fromAddress?: string;
  fromName?: string;
  replyTo?: string;
};

type StoredSmtpConfig = {
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  password?: string;
  fromAddress?: string;
  fromName?: string;
};

type StoredEmailConfig = {
  provider: EmailProvider;
  tencentSes?: StoredTencentSesConfig;
  smtp?: StoredSmtpConfig;
};

type JsonObject = {
  [key: string]: Prisma.InputJsonValue;
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

function normalizeStoredEmailConfig(value: unknown): StoredEmailConfig {
  if (!isRecord(value)) {
    return { provider: DEFAULT_EMAIL_PROVIDER };
  }

  return {
    provider: isEmailProvider(value.provider) ? value.provider : DEFAULT_EMAIL_PROVIDER,
    tencentSes: normalizeTencentSesConfig(value.tencentSes),
    smtp: normalizeSmtpConfig(value.smtp),
  };
}

/**
 * Email Configuration Service
 * Manages email provider configuration with encrypted credentials storage
 */
@Injectable()
export class EmailConfigService {
  private readonly logger = new Logger(EmailConfigService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 12;
  private readonly authTagLength = 16;

  // Sensitive fields that need encryption
  private readonly sensitiveFields = {
    tencentSes: ['secretId', 'secretKey'],
    smtp: ['password'],
  };

  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get encryption key from environment
   */
  private getEncryptionKey(): Buffer {
    const key = this.configService.get<string>('EMAIL_CONFIG_ENCRYPTION_KEY');

    if (!key || key.length !== 64) {
      this.logger.warn('EMAIL_CONFIG_ENCRYPTION_KEY not configured properly, using fallback');
      // Fallback for development only
      return Buffer.alloc(32, 'email-dev-key');
    }

    return Buffer.from(key, 'hex');
  }

  /**
   * Encrypt a sensitive value
   */
  private encrypt(plaintext: string): string {
    const key = this.getEncryptionKey();
    const iv = randomBytes(this.ivLength);

    const cipher = createCipheriv(this.algorithm, key, iv, {
      authTagLength: this.authTagLength,
    });

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  /**
   * Decrypt a sensitive value
   */
  private decrypt(ciphertext: string): string {
    const key = this.getEncryptionKey();
    const parts = ciphertext.split(':');

    if (parts.length !== 3) {
      throw new BadRequestException({
        code: 'INVALID_CIPHERTEXT',
        message: 'Invalid encrypted value format',
      });
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];

    const decipher = createDecipheriv(this.algorithm, key, iv, {
      authTagLength: this.authTagLength,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Check if a value is encrypted
   */
  private isEncrypted(value: string): boolean {
    const parts = value.split(':');
    return parts.length === 3;
  }

  /**
   * Mask a sensitive value for display
   */
  private maskValue(value: string): string {
    if (!value) return '';
    if (value.length <= 8) return '***';
    return `${value.substring(0, 4)}***${value.substring(value.length - 4)}`;
  }

  /**
   * Get email configuration (masked for display)
   */
  async getConfig(): Promise<EmailConfigResponse> {
    const prisma = this.db.getPrisma();
    const config = await prisma.globalConfig.findUnique({
      where: { key: EMAIL_CONFIG_KEY },
    });

    if (!config || !config.value) {
      return {
        provider: 'tencent_ses',
        isConfigured: false,
      };
    }

    const decrypted = this.decryptConfig(normalizeStoredEmailConfig(config.value));

    // Mask sensitive fields
    const response: EmailConfigResponse = {
      provider: decrypted.provider,
      isConfigured: true,
      lastUpdated: config.updatedAt.toISOString(),
    };

    if (decrypted.tencentSes) {
      response.tencentSes = {
        secretId: this.maskValue(decrypted.tencentSes.secretId),
        secretKey: this.maskValue(decrypted.tencentSes.secretKey),
        region: decrypted.tencentSes.region || DEFAULT_TENCENT_SES_REGION,
        fromAddress: decrypted.tencentSes.fromAddress,
        fromName: decrypted.tencentSes.fromName,
        replyTo: decrypted.tencentSes.replyTo,
      };
    }

    if (decrypted.smtp) {
      response.smtp = {
        host: decrypted.smtp.host,
        port: decrypted.smtp.port,
        secure: decrypted.smtp.secure,
        username: decrypted.smtp.username,
        password: this.maskValue(decrypted.smtp.password),
        fromAddress: decrypted.smtp.fromAddress,
        fromName: decrypted.smtp.fromName,
      };
    }

    return response;
  }

  /**
   * Save email configuration
   */
  async saveConfig(dto: SaveEmailConfigDto): Promise<EmailConfigResponse> {
    const prisma = this.db.getPrisma();

    // Get existing config to merge with new values
    const existingConfig = await prisma.globalConfig.findUnique({
      where: { key: EMAIL_CONFIG_KEY },
    });

    let existingDecrypted: DecryptedEmailConfig | null = null;
    if (existingConfig?.value) {
      existingDecrypted = this.decryptConfig(normalizeStoredEmailConfig(existingConfig.value));
    }

    const newConfig = this.buildStoredConfig(dto, existingDecrypted);

    await prisma.globalConfig.upsert({
      where: { key: EMAIL_CONFIG_KEY },
      update: {
        value: newConfig,
        updatedAt: new Date(),
        description: 'Email provider configuration',
      },
      create: {
        key: EMAIL_CONFIG_KEY,
        value: newConfig,
        description: 'Email provider configuration',
      },
    });

    this.logger.log(`Email configuration saved (provider: ${dto.provider})`);

    return this.getConfig();
  }

  /**
   * Get decrypted email configuration (internal use only)
   */
  async getDecryptedConfig(): Promise<DecryptedEmailConfig | null> {
    const prisma = this.db.getPrisma();
    const config = await prisma.globalConfig.findUnique({
      where: { key: EMAIL_CONFIG_KEY },
    });

    if (!config || !config.value) {
      // Fallback to environment variables
      return this.getEnvFallbackConfig();
    }

    return this.decryptConfig(normalizeStoredEmailConfig(config.value));
  }

  /**
   * Decrypt stored config object
   */
  private decryptConfig(storedConfig: StoredEmailConfig): DecryptedEmailConfig {
    const result: DecryptedEmailConfig = {
      provider: storedConfig.provider,
    };

    if (storedConfig.tencentSes) {
      result.tencentSes = {
        secretId: this.decryptField(storedConfig.tencentSes.secretId ?? ''),
        secretKey: this.decryptField(storedConfig.tencentSes.secretKey ?? ''),
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
        password: this.decryptField(storedConfig.smtp.password ?? ''),
        fromAddress: storedConfig.smtp.fromAddress ?? '',
        fromName: storedConfig.smtp.fromName ?? '',
      };
    }

    return result;
  }

  private buildStoredConfig(
    dto: SaveEmailConfigDto,
    existingDecrypted: DecryptedEmailConfig | null,
  ): JsonObject {
    const newConfig: JsonObject = {
      provider: dto.provider,
    };

    if (dto.tencentSes) {
      const sesConfig: JsonObject = {
        region: dto.tencentSes.region || DEFAULT_TENCENT_SES_REGION,
        fromAddress: dto.tencentSes.fromAddress,
        fromName: dto.tencentSes.fromName,
      };

      if (dto.tencentSes.replyTo) {
        sesConfig.replyTo = dto.tencentSes.replyTo;
      }

      const secretId = this.resolveEncryptedSecret(
        dto.tencentSes.secretId,
        existingDecrypted?.tencentSes?.secretId,
      );
      if (secretId) {
        sesConfig.secretId = secretId;
      }

      const secretKey = this.resolveEncryptedSecret(
        dto.tencentSes.secretKey,
        existingDecrypted?.tencentSes?.secretKey,
      );
      if (secretKey) {
        sesConfig.secretKey = secretKey;
      }

      newConfig.tencentSes = sesConfig;
    }

    if (dto.smtp) {
      const smtpConfig: JsonObject = {
        host: dto.smtp.host,
        port: dto.smtp.port,
        secure: dto.smtp.secure,
        username: dto.smtp.username,
        fromAddress: dto.smtp.fromAddress,
        fromName: dto.smtp.fromName,
      };

      const password = this.resolveEncryptedSecret(
        dto.smtp.password,
        existingDecrypted?.smtp?.password,
      );
      if (password) {
        smtpConfig.password = password;
      }

      newConfig.smtp = smtpConfig;
    }

    return newConfig;
  }

  private resolveEncryptedSecret(value: string | undefined, existingPlaintext?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    if (value.includes('***') && existingPlaintext) {
      return this.encrypt(existingPlaintext);
    }

    return this.encrypt(value);
  }

  /**
   * Decrypt a field if it's encrypted
   */
  private decryptField(value: string): string {
    if (!value) return '';
    if (this.isEncrypted(value)) {
      try {
        return this.decrypt(value);
      } catch {
        this.logger.warn('Failed to decrypt field, returning as-is');
        return value;
      }
    }
    return value;
  }

  /**
   * Get fallback config from environment variables
   */
  private getEnvFallbackConfig(): DecryptedEmailConfig | null {
    const secretId = this.configService.get<string>('TENCENT_SES_SECRET_ID');
    const secretKey = this.configService.get<string>('TENCENT_SES_SECRET_KEY');

    if (secretId && secretKey) {
      return {
        provider: DEFAULT_EMAIL_PROVIDER,
        tencentSes: {
          secretId,
          secretKey,
          region: this.configService.get<string>('TENCENT_SES_REGION') || DEFAULT_TENCENT_SES_REGION,
          fromAddress:
            this.configService.get<string>('TENCENT_SES_FROM_ADDRESS') || DEFAULT_EMAIL_FROM_ADDRESS,
          fromName: this.configService.get<string>('TENCENT_SES_FROM_NAME') || DEFAULT_EMAIL_FROM_NAME,
          replyTo: this.configService.get<string>('TENCENT_SES_REPLY_TO'),
        },
      };
    }

    return null;
  }

  /**
   * Check if email is configured
   */
  async isConfigured(): Promise<boolean> {
    const config = await this.getDecryptedConfig();
    
    if (!config) return false;

    if (config.provider === 'tencent_ses') {
      return !!(config.tencentSes?.secretId && config.tencentSes?.secretKey);
    }

    if (config.provider === 'smtp') {
      return !!(config.smtp?.host && config.smtp?.username && config.smtp?.password);
    }

    return false;
  }
}
