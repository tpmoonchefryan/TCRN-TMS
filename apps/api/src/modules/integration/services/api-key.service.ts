// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { randomBytes, createHash } from 'crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import { LogSeverity } from '@tcrn/shared';
import { ErrorCodes, TechEventType, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { ChangeLogService, TechEventLogService } from '../../log';

@Injectable()
export class ApiKeyService {
  private readonly keyPrefix = 'tcrn_';
  private readonly keyLength = 32; // 32 bytes = 64 hex chars

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly changeLogService: ChangeLogService,
    private readonly techEventLog: TechEventLogService,
  ) {}

  /**
   * Generate a new API key
   * Format: tcrn_{64 hex chars}
   */
  generateApiKey(): { key: string; prefix: string; hash: string } {
    const randomPart = randomBytes(this.keyLength).toString('hex');
    const key = `${this.keyPrefix}${randomPart}`;
    const prefix = key.substring(0, 12); // tcrn_xxxx
    const hash = this.hashApiKey(key);

    return { key, prefix, hash };
  }

  /**
   * Hash API key using SHA256
   */
  hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  /**
   * Validate API key and return consumer
   */
  async validateApiKey(key: string) {
    if (!key.startsWith(this.keyPrefix)) {
      return null;
    }

    const prisma = this.databaseService.getPrisma();
    const hash = this.hashApiKey(key);

    const consumer = await prisma.consumer.findFirst({
      where: {
        apiKeyHash: hash,
        isActive: true,
      },
    });

    return consumer;
  }

  /**
   * Regenerate API key for a consumer
   */
  async regenerateKey(consumerId: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();

    const consumer = await prisma.consumer.findUnique({
      where: { id: consumerId },
    });

    if (!consumer) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Consumer not found',
      });
    }

    const { key, prefix, hash } = this.generateApiKey();

    await prisma.$transaction(async (tx) => {
      await tx.consumer.update({
        where: { id: consumerId },
        data: {
          apiKeyHash: hash,
          apiKeyPrefix: prefix,
          updatedBy: context.userId,
          version: { increment: 1 },
        },
      });

      await this.changeLogService.create(tx, {
        action: 'regenerate_key',
        objectType: 'consumer',
        objectId: consumerId,
        objectName: consumer.code,
        newValue: { apiKeyPrefix: prefix },
      }, context);
    });

    // Log security event
    await this.techEventLog.log({
      eventType: TechEventType.SECURITY_EVENT,
      scope: 'security',
      severity: LogSeverity.WARN,
      payload: {
        action: 'api_key_regenerated',
        consumerId,
        consumerCode: consumer.code,
        newKeyPrefix: prefix,
        userId: context.userId,
      },
    });

    return {
      apiKey: key,
      apiKeyPrefix: prefix,
      generatedAt: new Date().toISOString(),
      warning: '请立即保存此 API Key，它不会再次显示。',
    };
  }

  /**
   * Check if IP is allowed for consumer
   */
  isIpAllowed(clientIp: string, allowedIps: string[]): boolean {
    if (!allowedIps || allowedIps.length === 0) {
      return true;
    }

    return allowedIps.some((allowed) => {
      // Check exact match
      if (clientIp === allowed) {
        return true;
      }

      // Check CIDR (simplified, just prefix match for common cases)
      if (allowed.includes('/')) {
        const [subnet] = allowed.split('/');
        return clientIp.startsWith(subnet.slice(0, -1));
      }

      return false;
    });
  }
}
