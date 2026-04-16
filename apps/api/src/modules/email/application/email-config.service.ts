// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_EMAIL_PROVIDER } from '@tcrn/shared';

import {
  buildDecryptedEmailConfig,
  buildEnvFallbackEmailConfig,
  buildMaskedEmailConfigResponse,
  buildStoredEmailConfig,
  isEmailConfigured,
} from '../domain/email-config.policy';
import type {
  DecryptedEmailConfig,
  EmailConfigResponse,
  SaveEmailConfigDto,
} from '../dto/email-config.dto';
import { EmailConfigRepository } from '../infrastructure/email-config.repository';
import { EmailConfigCryptoService } from '../infrastructure/email-config-crypto.service';

@Injectable()
export class EmailConfigApplicationService {
  private readonly logger = new Logger(EmailConfigApplicationService.name);

  constructor(
    private readonly emailConfigRepository: EmailConfigRepository,
    private readonly emailConfigCryptoService: EmailConfigCryptoService,
    private readonly configService: ConfigService,
  ) {}

  async getConfig(): Promise<EmailConfigResponse> {
    const storedConfig = await this.emailConfigRepository.findStoredConfig();

    if (!storedConfig) {
      return {
        provider: DEFAULT_EMAIL_PROVIDER,
        isConfigured: false,
      };
    }

    const decrypted = buildDecryptedEmailConfig(
      storedConfig.value,
      (value) => this.emailConfigCryptoService.decryptField(value),
    );

    return buildMaskedEmailConfigResponse(decrypted, {
      lastUpdated: storedConfig.updatedAt,
      maskValue: (value) => this.emailConfigCryptoService.maskValue(value),
    });
  }

  async saveConfig(dto: SaveEmailConfigDto): Promise<EmailConfigResponse> {
    const existingStoredConfig = await this.emailConfigRepository.findStoredConfig();
    const existingDecrypted = existingStoredConfig
      ? buildDecryptedEmailConfig(
        existingStoredConfig.value,
        (value) => this.emailConfigCryptoService.decryptField(value),
      )
      : null;

    const newConfig = buildStoredEmailConfig(
      dto,
      existingDecrypted,
      (value) => this.emailConfigCryptoService.encrypt(value),
    );

    await this.emailConfigRepository.saveStoredConfig(newConfig);

    this.logger.log(`Email configuration saved (provider: ${dto.provider})`);

    return this.getConfig();
  }

  async getDecryptedConfig(): Promise<DecryptedEmailConfig | null> {
    const storedConfig = await this.emailConfigRepository.findStoredConfig();

    if (!storedConfig) {
      return this.getEnvFallbackConfig();
    }

    return buildDecryptedEmailConfig(
      storedConfig.value,
      (value) => this.emailConfigCryptoService.decryptField(value),
    );
  }

  async isConfigured(): Promise<boolean> {
    return isEmailConfigured(await this.getDecryptedConfig());
  }

  private getEnvFallbackConfig(): DecryptedEmailConfig | null {
    return buildEnvFallbackEmailConfig({
      secretId: this.configService.get<string>('TENCENT_SES_SECRET_ID'),
      secretKey: this.configService.get<string>('TENCENT_SES_SECRET_KEY'),
      region: this.configService.get<string>('TENCENT_SES_REGION'),
      fromAddress: this.configService.get<string>('TENCENT_SES_FROM_ADDRESS'),
      fromName: this.configService.get<string>('TENCENT_SES_FROM_NAME'),
      replyTo: this.configService.get<string>('TENCENT_SES_REPLY_TO'),
    });
  }
}
