// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, NotFoundException } from '@nestjs/common';
import { LogSeverity } from '@tcrn/shared';
import { ErrorCodes, type RequestContext, TechEventType } from '@tcrn/shared';

import { ChangeLogService, TechEventLogService } from '../../log';
import {
  API_KEY_REGENERATION_WARNING,
  generateApiKeyMaterial,
  getApiKeyStoredPrefix,
  hashApiKey,
  isManagedApiKey,
} from '../domain/api-key.policy';
import { ApiKeyRepository } from '../infrastructure/api-key.repository';
import { getApiKeyTenantSchema, validateApiKeyTenantSchema } from './api-key-context.util';

@Injectable()
export class ApiKeyApplicationService {
  constructor(
    private readonly apiKeyRepository: ApiKeyRepository,
    private readonly changeLogService: ChangeLogService,
    private readonly techEventLog: TechEventLogService,
  ) {}

  async validateApiKey(key: string, tenantSchema?: string) {
    if (!isManagedApiKey(key)) {
      return null;
    }

    const hash = hashApiKey(key);
    const prefix = getApiKeyStoredPrefix(key);

    return this.apiKeyRepository.withTransaction(async (prisma) => {
      const schemas = tenantSchema
        ? [validateApiKeyTenantSchema(tenantSchema)]
        : (await this.apiKeyRepository.getActiveTenantSchemas(prisma)).map((schema) =>
            validateApiKeyTenantSchema(schema),
          );

      for (const schema of schemas) {
        const consumer = await this.apiKeyRepository.findConsumerByApiKey(
          prisma,
          schema,
          prefix,
          hash,
        );

        if (consumer) {
          return consumer;
        }
      }

      return null;
    });
  }

  async regenerateKey(consumerId: string, context: RequestContext) {
    const tenantSchema = getApiKeyTenantSchema(context);
    const { key, prefix, hash } = generateApiKeyMaterial();

    const consumer = await this.apiKeyRepository.withTransaction(async (prisma) => {
      const consumerRecord = await this.apiKeyRepository.findConsumerForRegeneration(
        prisma,
        consumerId,
        tenantSchema,
      );

      if (!consumerRecord) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Consumer not found',
        });
      }

      await this.apiKeyRepository.updateConsumerApiKey(
        prisma,
        consumerId,
        tenantSchema,
        hash,
        prefix,
        context.userId ?? null,
      );

      await this.changeLogService.create(
        prisma,
        {
          action: 'regenerate_key',
          objectType: 'consumer',
          objectId: consumerId,
          objectName: consumerRecord.code,
          newValue: { apiKeyPrefix: prefix },
        },
        context,
      );

      return consumerRecord;
    });

    await this.techEventLog.log(
      {
        eventType: TechEventType.SECURITY_EVENT,
        scope: 'security',
        severity: LogSeverity.WARN,
        payload: {
          action: 'api_key_regenerated',
          consumerId,
          ...(tenantSchema ? {} : { consumerCode: consumer.code }),
          newKeyPrefix: prefix,
          userId: context.userId,
        },
      },
      context,
    );

    return {
      apiKey: key,
      apiKeyPrefix: prefix,
      generatedAt: new Date().toISOString(),
      warning: API_KEY_REGENERATION_WARNING,
    };
  }
}
