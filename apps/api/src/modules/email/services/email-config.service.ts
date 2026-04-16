// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DatabaseService } from '../../database';
import { EmailConfigApplicationService } from '../application/email-config.service';
import type {
  DecryptedEmailConfig,
  EmailConfigResponse,
  SaveEmailConfigDto,
} from '../dto/email-config.dto';
import { EmailConfigRepository } from '../infrastructure/email-config.repository';
import { EmailConfigCryptoService } from '../infrastructure/email-config-crypto.service';

@Injectable()
export class EmailConfigService {
  constructor(
    databaseService: DatabaseService,
    configService: ConfigService,
    private readonly emailConfigApplicationService: EmailConfigApplicationService = new EmailConfigApplicationService(
      new EmailConfigRepository(databaseService),
      new EmailConfigCryptoService(configService),
      configService,
    ),
  ) {}

  getConfig(): Promise<EmailConfigResponse> {
    return this.emailConfigApplicationService.getConfig();
  }

  saveConfig(dto: SaveEmailConfigDto): Promise<EmailConfigResponse> {
    return this.emailConfigApplicationService.saveConfig(dto);
  }

  getDecryptedConfig(): Promise<DecryptedEmailConfig | null> {
    return this.emailConfigApplicationService.getDecryptedConfig();
  }

  isConfigured(): Promise<boolean> {
    return this.emailConfigApplicationService.isConfigured();
  }
}
