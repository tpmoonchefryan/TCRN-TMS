// SPDX-License-Identifier: Apache-2.0
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ErrorCodes } from '@tcrn/shared';

@Injectable()
export class SettingsSecretCryptoService {
  private readonly logger = new Logger(SettingsSecretCryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly authTagLength = 16;
  private readonly ivLength = 12;

  constructor(private readonly configService: ConfigService) {}

  encrypt(plaintext: string): string {
    const key = this.getEncryptionKey();
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, key, iv, {
      authTagLength: this.authTagLength,
    });

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted].join(
      ':'
    );
  }

  decrypt(ciphertext: string): string {
    const key = this.getEncryptionKey();
    const parts = ciphertext.split(':');

    if (parts.length !== 4 || parts[0] !== 'v1') {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FIELD_INVALID,
        message: 'Invalid encrypted settings value format',
      });
    }

    const decipher = createDecipheriv(this.algorithm, key, Buffer.from(parts[1], 'base64'), {
      authTagLength: this.authTagLength,
    });
    decipher.setAuthTag(Buffer.from(parts[2], 'base64'));

    let decrypted = decipher.update(parts[3], 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  decryptStoredSecret(value: string | null): string | null {
    if (!value) {
      return null;
    }

    if (!this.isEncrypted(value)) {
      this.logger.warn('Ignoring non-encrypted tenant settings secret');
      return null;
    }

    try {
      return this.decrypt(value);
    } catch {
      this.logger.warn('Failed to decrypt tenant settings secret');
      return null;
    }
  }

  isEncrypted(value: string): boolean {
    const parts = value.split(':');
    return parts.length === 4 && parts[0] === 'v1';
  }

  private getEncryptionKey(): Buffer {
    const configuredKey =
      this.configService.get<string>('SETTINGS_SECRET_ENCRYPTION_KEY') ??
      this.configService.get<string>('EMAIL_CONFIG_ENCRYPTION_KEY');

    if (configuredKey && /^[0-9a-fA-F]{64}$/.test(configuredKey)) {
      return Buffer.from(configuredKey, 'hex');
    }

    const nodeEnv = this.configService.get<string>('NODE_ENV');
    if (nodeEnv === 'production' || nodeEnv === 'staging') {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Settings secret encryption key is not configured',
      });
    }

    this.logger.warn('SETTINGS_SECRET_ENCRYPTION_KEY not configured, using development fallback');
    return Buffer.alloc(32, 'settings-dev-key');
  }
}
