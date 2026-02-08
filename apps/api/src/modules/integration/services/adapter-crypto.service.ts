// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException,Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCodes } from '@tcrn/shared';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class AdapterCryptoService {
  private readonly logger = new Logger(AdapterCryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 12;
  private readonly authTagLength = 16;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get encryption key from environment
   */
  private getEncryptionKey(): Buffer {
    const key = this.configService.get<string>('ADAPTER_ENCRYPTION_KEY');

    if (!key || key.length !== 64) {
      this.logger.warn('ADAPTER_ENCRYPTION_KEY not configured properly, using fallback');
      // Fallback for development only
      return Buffer.alloc(32, 'dev-key-only');
    }

    return Buffer.from(key, 'hex');
  }

  /**
   * Encrypt a config value
   * Format: iv:authTag:ciphertext (all base64)
   */
  encrypt(plaintext: string): string {
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
   * Decrypt a config value
   */
  decrypt(ciphertext: string): string {
    const key = this.getEncryptionKey();
    const parts = ciphertext.split(':');

    if (parts.length !== 3) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FIELD_INVALID,
        message: 'Invalid ciphertext format',
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
  isEncrypted(value: string): boolean {
    const parts = value.split(':');
    return parts.length === 3;
  }
}
