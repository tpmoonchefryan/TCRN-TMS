// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { Prisma } from '@tcrn/database';

import { DatabaseService } from '../../database';
import { type ValidatedConsumerRow } from '../domain/api-key.policy';

interface ConsumerLookupRecord {
  id: string;
  code: string;
}

@Injectable()
export class ApiKeyRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  withTransaction<T>(
    operation: (prisma: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.databaseService.getPrisma().$transaction((prisma) => operation(prisma));
  }

  async getActiveTenantSchemas(prisma: Prisma.TransactionClient): Promise<string[]> {
    const tenants = await prisma.$queryRawUnsafe<Array<{ schemaName: string }>>(
      `
        SELECT schema_name as "schemaName"
        FROM public.tenant
        WHERE is_active = true
      `,
    );

    return tenants.map((tenant) => tenant.schemaName);
  }

  async findConsumerByApiKey(
    prisma: Prisma.TransactionClient,
    tenantSchema: string,
    prefix: string,
    hash: string,
  ): Promise<ValidatedConsumerRow | null> {
    const consumers = await prisma.$queryRawUnsafe<Array<ValidatedConsumerRow>>(
      `
        SELECT
          c.id,
          c.code,
          c.allowed_ips as "allowedIps",
          t.id as "tenantId",
          t.schema_name as "tenantSchema"
        FROM "${tenantSchema}".consumer c
        JOIN public.tenant t ON t.schema_name = $3
        WHERE c.api_key_prefix = $1
          AND c.api_key_hash = $2
          AND c.is_active = true
        LIMIT 1
      `,
      prefix,
      hash,
      tenantSchema,
    );

    return consumers[0] ?? null;
  }

  async findConsumerForRegeneration(
    prisma: Prisma.TransactionClient,
    consumerId: string,
    tenantSchema: string | null,
  ): Promise<ConsumerLookupRecord | null> {
    if (tenantSchema) {
      const consumers = await prisma.$queryRawUnsafe<Array<ConsumerLookupRecord>>(
        `
          SELECT id, code
          FROM "${tenantSchema}".consumer
          WHERE id = $1::uuid
          LIMIT 1
        `,
        consumerId,
      );

      return consumers[0] ?? null;
    }

    return prisma.consumer.findUnique({
      where: { id: consumerId },
      select: {
        id: true,
        code: true,
      },
    });
  }

  async updateConsumerApiKey(
    prisma: Prisma.TransactionClient,
    consumerId: string,
    tenantSchema: string | null,
    hash: string,
    prefix: string,
    userId: string | null,
  ): Promise<void> {
    if (tenantSchema) {
      await prisma.$executeRawUnsafe(
        `
          UPDATE "${tenantSchema}".consumer
          SET
            api_key_hash = $2,
            api_key_prefix = $3,
            updated_by = $4::uuid,
            version = version + 1,
            updated_at = NOW()
          WHERE id = $1::uuid
        `,
        consumerId,
        hash,
        prefix,
        userId,
      );

      return;
    }

    await prisma.consumer.update({
      where: { id: consumerId },
      data: {
        apiKeyHash: hash,
        apiKeyPrefix: prefix,
        updatedBy: userId,
        version: { increment: 1 },
      },
    });
  }
}
