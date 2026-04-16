// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { ChangeLogService, TechEventLogService } from '../../log';
import { ApiKeyApplicationService } from '../application/api-key.service';
import {
  generateApiKeyMaterial,
  hashApiKey,
  isIpAllowed,
} from '../domain/api-key.policy';
import { ApiKeyRepository } from '../infrastructure/api-key.repository';

@Injectable()
export class ApiKeyService {
  constructor(
    databaseService: DatabaseService,
    changeLogService: ChangeLogService,
    techEventLog: TechEventLogService,
    private readonly apiKeyApplicationService: ApiKeyApplicationService = new ApiKeyApplicationService(
      new ApiKeyRepository(databaseService),
      changeLogService,
      techEventLog,
    ),
  ) {}

  generateApiKey() {
    return generateApiKeyMaterial();
  }

  hashApiKey(key: string): string {
    return hashApiKey(key);
  }

  async validateApiKey(key: string, tenantSchema?: string) {
    return this.apiKeyApplicationService.validateApiKey(key, tenantSchema);
  }

  async regenerateKey(consumerId: string, context: RequestContext) {
    return this.apiKeyApplicationService.regenerateKey(consumerId, context);
  }

  isIpAllowed(clientIp: string, allowedIps: string[]): boolean {
    return isIpAllowed(clientIp, allowedIps);
  }
}
