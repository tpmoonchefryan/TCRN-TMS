// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DatabaseService } from '../../database';

import type {
  SaveEmailConfigDto,
  EmailConfigResponse,
  DecryptedEmailConfig,
  EmailProvider,
} from '../dto/email-config.dto';

const EMAIL_CONFIG_KEY = 'email.config';

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

    const storedConfig = config.value as Record<string, unknown>;
    const decrypted = this.decryptConfig(storedConfig);

    // Mask sensitive fields
    const response: EmailConfigResponse = {
      provider: (decrypted.provider as EmailProvider) || 'tencent_ses',
      isConfigured: true,
      lastUpdated: config.updatedAt.toISOString(),
    };

    if (decrypted.tencentSes) {
      response.tencentSes = {
        secretId: this.maskValue(decrypted.tencentSes.secretId),
        secretKey: this.maskValue(decrypted.tencentSes.secretKey),
        region: decrypted.tencentSes.region || 'ap-hongkong',
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
      existingDecrypted = this.decryptConfig(existingConfig.value as Record<string, unknown>);
    }

    // Build new config with encryption
    const newConfig: Record<string, unknown> = {
      provider: dto.provider,
    };

    if (dto.tencentSes) {
      const sesConfig: Record<string, unknown> = {
        region: dto.tencentSes.region || 'ap-hongkong',
        fromAddress: dto.tencentSes.fromAddress,
        fromName: dto.tencentSes.fromName,
        replyTo: dto.tencentSes.replyTo,
      };
      
      // Encrypt secretId
      const secretId = dto.tencentSes.secretId;
      if (secretId && typeof secretId === 'string') {
        if (secretId.includes('***') && existingDecrypted?.tencentSes?.secretId) {
          sesConfig.secretId = this.encrypt(existingDecrypted.tencentSes.secretId);
        } else {
          sesConfig.secretId = this.encrypt(secretId);
        }
      }
      
      // Encrypt secretKey
      const secretKey = dto.tencentSes.secretKey;
      if (secretKey && typeof secretKey === 'string') {
        if (secretKey.includes('***') && existingDecrypted?.tencentSes?.secretKey) {
          sesConfig.secretKey = this.encrypt(existingDecrypted.tencentSes.secretKey);
        } else {
          sesConfig.secretKey = this.encrypt(secretKey);
        }
      }
      
      newConfig.tencentSes = sesConfig;
    }

    if (dto.smtp) {
      const smtpConfig: Record<string, unknown> = {
        host: dto.smtp.host,
        port: dto.smtp.port,
        secure: dto.smtp.secure,
        username: dto.smtp.username,
        fromAddress: dto.smtp.fromAddress,
        fromName: dto.smtp.fromName,
      };
      
      // Encrypt password
      const password = dto.smtp.password;
      if (password && typeof password === 'string') {
        // If the value looks masked, use the existing encrypted value
        if (password.includes('***') && existingDecrypted?.smtp?.password) {
          smtpConfig.password = this.encrypt(existingDecrypted.smtp.password);
        } else {
          smtpConfig.password = this.encrypt(password);
        }
      }
      
      newConfig.smtp = smtpConfig;
    }

    // Upsert the config - cast to any to satisfy Prisma's Json type
    await prisma.globalConfig.upsert({
      where: { key: EMAIL_CONFIG_KEY },
      update: {
        value: newConfig as object,
        updatedAt: new Date(),
        description: 'Email provider configuration',
      },
      create: {
        key: EMAIL_CONFIG_KEY,
        value: newConfig as object,
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

    const storedConfig = config.value as Record<string, unknown>;
    return this.decryptConfig(storedConfig);
  }

  /**
   * Decrypt stored config object
   */
  private decryptConfig(storedConfig: Record<string, unknown>): DecryptedEmailConfig {
    const result: DecryptedEmailConfig = {
      provider: (storedConfig.provider as EmailProvider) || 'tencent_ses',
    };

    if (storedConfig.tencentSes) {
      const sesConfig = storedConfig.tencentSes as Record<string, unknown>;
      result.tencentSes = {
        secretId: this.decryptField(sesConfig.secretId as string),
        secretKey: this.decryptField(sesConfig.secretKey as string),
        region: (sesConfig.region as string) || 'ap-hongkong',
        fromAddress: sesConfig.fromAddress as string,
        fromName: sesConfig.fromName as string,
        replyTo: sesConfig.replyTo as string | undefined,
      };
    }

    if (storedConfig.smtp) {
      const smtpConfig = storedConfig.smtp as Record<string, unknown>;
      result.smtp = {
        host: smtpConfig.host as string,
        port: smtpConfig.port as number,
        secure: smtpConfig.secure as boolean,
        username: smtpConfig.username as string,
        password: this.decryptField(smtpConfig.password as string),
        fromAddress: smtpConfig.fromAddress as string,
        fromName: smtpConfig.fromName as string,
      };
    }

    return result;
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
        provider: 'tencent_ses',
        tencentSes: {
          secretId,
          secretKey,
          region: this.configService.get<string>('TENCENT_SES_REGION') || 'ap-hongkong',
          fromAddress: this.configService.get<string>('TENCENT_SES_FROM_ADDRESS') || 'noreply@tcrn.app',
          fromName: this.configService.get<string>('TENCENT_SES_FROM_NAME') || 'TCRN TMS',
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
