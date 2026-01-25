// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tcrn/database';
import { ErrorCodes } from '@tcrn/shared';
import * as crypto from 'crypto';

export interface GeneratedApiKey {
  apiKey: string;
  apiKeyPrefix: string;
}

/**
 * Consumer Key Service
 * Handles API Key generation and verification for Consumer entities
 */
@Injectable()
export class ConsumerKeyService {
  private readonly KEY_LENGTH = 32;
  private readonly PREFIX_LENGTH = 8;

  /**
   * Generate a new API key for a consumer
   */
  async generateApiKey(
    consumerId: string,
    tenantSchema: string,
    userId: string
  ): Promise<GeneratedApiKey> {
    // Verify consumer exists
    const consumer = await prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
      `SELECT id, code FROM "${tenantSchema}".consumer WHERE id = $1::uuid`,
      consumerId
    );

    if (consumer.length === 0) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Consumer not found',
      });
    }

    // Generate random API key
    const apiKey = this.generateRandomKey();
    const apiKeyPrefix = apiKey.substring(0, this.PREFIX_LENGTH);
    const apiKeyHash = this.hashKey(apiKey);

    // Update consumer with new key
    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".consumer
      SET api_key_hash = $2, api_key_prefix = $3, updated_at = now(), updated_by = $4::uuid, version = version + 1
      WHERE id = $1::uuid
    `, consumerId, apiKeyHash, apiKeyPrefix, userId);

    return {
      apiKey,
      apiKeyPrefix,
    };
  }

  /**
   * Rotate (regenerate) API key for a consumer
   */
  async rotateApiKey(
    consumerId: string,
    tenantSchema: string,
    userId: string
  ): Promise<GeneratedApiKey> {
    // Same as generate - just regenerate the key
    return this.generateApiKey(consumerId, tenantSchema, userId);
  }

  /**
   * Revoke API key for a consumer
   */
  async revokeApiKey(
    consumerId: string,
    tenantSchema: string,
    userId: string
  ): Promise<void> {
    // Verify consumer exists
    const consumer = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "${tenantSchema}".consumer WHERE id = $1::uuid`,
      consumerId
    );

    if (consumer.length === 0) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Consumer not found',
      });
    }

    // Clear API key
    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".consumer
      SET api_key_hash = NULL, api_key_prefix = NULL, updated_at = now(), updated_by = $2::uuid, version = version + 1
      WHERE id = $1::uuid
    `, consumerId, userId);
  }

  /**
   * Verify an API key against stored hash
   */
  async verifyApiKey(
    apiKey: string,
    tenantSchema: string
  ): Promise<{ consumerId: string; consumerCode: string } | null> {
    const prefix = apiKey.substring(0, this.PREFIX_LENGTH);
    const hash = this.hashKey(apiKey);

    // Find consumer by prefix and hash
    const consumers = await prisma.$queryRawUnsafe<Array<{ id: string; code: string; apiKeyHash: string }>>(
      `SELECT id, code, api_key_hash as "apiKeyHash" 
       FROM "${tenantSchema}".consumer 
       WHERE api_key_prefix = $1 AND is_active = true`,
      prefix
    );

    // Verify hash matches
    for (const consumer of consumers) {
      if (consumer.apiKeyHash === hash) {
        return {
          consumerId: consumer.id,
          consumerCode: consumer.code,
        };
      }
    }

    return null;
  }

  /**
   * Check if consumer has an API key set
   */
  async hasApiKey(consumerId: string, tenantSchema: string): Promise<boolean> {
    const result = await prisma.$queryRawUnsafe<Array<{ hasKey: boolean }>>(
      `SELECT (api_key_hash IS NOT NULL) as "hasKey" 
       FROM "${tenantSchema}".consumer 
       WHERE id = $1::uuid`,
      consumerId
    );

    return result.length > 0 && result[0].hasKey;
  }

  /**
   * Generate a random API key
   */
  private generateRandomKey(): string {
    // Generate URL-safe base64 string
    const bytes = crypto.randomBytes(this.KEY_LENGTH);
    return bytes.toString('base64url').substring(0, this.KEY_LENGTH);
  }

  /**
   * Hash an API key using SHA-256
   */
  private hashKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }
}
