// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class EmailConfigCryptoService {
  private readonly logger = new Logger(EmailConfigCryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 12;
  private readonly authTagLength = 16;

  constructor(
    private readonly configService: ConfigService,
  ) {}

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

  decrypt(ciphertext: string): string {
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

  decryptField(value: string): string {
    if (!value) {
      return '';
    }

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

  maskValue(value: string): string {
    if (!value) {
      return '';
    }

    if (value.length <= 8) {
      return '***';
    }

    return `${value.substring(0, 4)}***${value.substring(value.length - 4)}`;
  }

  private getEncryptionKey(): Buffer {
    const key = this.configService.get<string>('EMAIL_CONFIG_ENCRYPTION_KEY');

    if (!key || key.length !== 64) {
      this.logger.warn('EMAIL_CONFIG_ENCRYPTION_KEY not configured properly, using fallback');
      return Buffer.alloc(32, 'email-dev-key');
    }

    return Buffer.from(key, 'hex');
  }

  private isEncrypted(value: string): boolean {
    return value.split(':').length === 3;
  }
}
