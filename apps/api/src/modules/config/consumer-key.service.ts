// SPDX-License-Identifier: Apache-2.0
import { Injectable, NotFoundException } from '@nestjs/common';

import { prisma } from '@tcrn/database';
import { ErrorCodes } from '@tcrn/shared';

import {
  generateApiKeyMaterial,
  getApiKeyStoredPrefix,
  hashApiKey,
  isManagedApiKey,
} from '../integration/domain/api-key.policy';

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

    const { key: apiKey, prefix: apiKeyPrefix, hash: apiKeyHash } = generateApiKeyMaterial();

    // Update consumer with new key
    await prisma.$executeRawUnsafe(
      `
      UPDATE "${tenantSchema}".consumer
      SET api_key_hash = $2, api_key_prefix = $3, updated_at = now(), updated_by = $4::uuid, version = version + 1
      WHERE id = $1::uuid
    `,
      consumerId,
      apiKeyHash,
      apiKeyPrefix,
      userId
    );

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
  async revokeApiKey(consumerId: string, tenantSchema: string, userId: string): Promise<void> {
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
    await prisma.$executeRawUnsafe(
      `
      UPDATE "${tenantSchema}".consumer
      SET api_key_hash = NULL, api_key_prefix = NULL, updated_at = now(), updated_by = $2::uuid, version = version + 1
      WHERE id = $1::uuid
    `,
      consumerId,
      userId
    );
  }

  /**
   * Verify an API key against stored hash
   */
  async verifyApiKey(
    apiKey: string,
    tenantSchema: string
  ): Promise<{ consumerId: string; consumerCode: string } | null> {
    if (!isManagedApiKey(apiKey)) {
      return null;
    }

    const prefix = getApiKeyStoredPrefix(apiKey);
    const hash = hashApiKey(apiKey);

    // Find consumer by prefix and hash
    const consumers = await prisma.$queryRawUnsafe<
      Array<{ id: string; code: string; apiKeyHash: string }>
    >(
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
}
