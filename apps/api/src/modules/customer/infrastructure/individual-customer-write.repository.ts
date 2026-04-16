// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { Prisma, type PrismaClient } from '@tcrn/database';

import { DatabaseService } from '../../database';
import type {
  IndividualCustomerCreatedRecord,
  IndividualCustomerUpdatedRecord,
  IndividualCustomerUpdateInput,
} from '../domain/individual-customer-write.policy';
import type { CustomerAction } from '../dto/customer.dto';

type IndividualCustomerWriteDatabaseClient = Prisma.TransactionClient | PrismaClient;

@Injectable()
export class IndividualCustomerWriteRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  withTransaction<T>(
    operation: (prisma: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.databaseService.getPrisma().$transaction((prisma) => operation(prisma));
  }

  async findActiveStatusId(
    prisma: IndividualCustomerWriteDatabaseClient,
    tenantSchema: string,
    statusCode: string,
  ): Promise<string | null> {
    const statuses = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id
       FROM "${tenantSchema}".customer_status
       WHERE code = $1
         AND is_active = true
       LIMIT 1`,
      statusCode,
    );

    return statuses[0]?.id ?? null;
  }

  async findActiveConsumer(
    prisma: IndividualCustomerWriteDatabaseClient,
    tenantSchema: string,
    consumerCode: string,
  ): Promise<{ id: string } | null> {
    const consumers = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id
       FROM "${tenantSchema}".consumer
       WHERE code = $1
         AND is_active = true
       LIMIT 1`,
      consumerCode,
    );

    return consumers[0] ?? null;
  }

  async createCustomerProfile(
    prisma: IndividualCustomerWriteDatabaseClient,
    tenantSchema: string,
    args: {
      talentId: string;
      profileStoreId: string;
      nickname: string;
      primaryLanguage?: string | null;
      statusId: string | null;
      tags: string[];
      source?: string | null;
      notes?: string | null;
      userId: string;
    },
  ): Promise<IndividualCustomerCreatedRecord> {
    const customers = await prisma.$queryRawUnsafe<IndividualCustomerCreatedRecord[]>(
      `INSERT INTO "${tenantSchema}".customer_profile (
         id, talent_id, profile_store_id, origin_talent_id,
         profile_type, nickname, primary_language, status_id, tags, source,
         notes, created_by, updated_by, created_at, updated_at
       )
       VALUES (
         gen_random_uuid(), $1::uuid, $2::uuid, $1::uuid,
         'individual', $3, $4, $5::uuid, $6::text[], $7,
         $8, $9::uuid, $9::uuid, NOW(), NOW()
       )
       RETURNING id, nickname, created_at as "createdAt"`,
      args.talentId,
      args.profileStoreId,
      args.nickname,
      args.primaryLanguage ?? null,
      args.statusId,
      args.tags,
      args.source ?? null,
      args.notes ?? null,
      args.userId,
    );

    return customers[0];
  }

  insertExternalId(
    prisma: IndividualCustomerWriteDatabaseClient,
    tenantSchema: string,
    args: {
      customerId: string;
      profileStoreId: string;
      consumerId: string;
      externalId: string;
      userId: string;
    },
  ) {
    return prisma.$executeRawUnsafe(
      `INSERT INTO "${tenantSchema}".customer_external_id (
         id, customer_id, profile_store_id, consumer_id, external_id, created_by, created_at
       )
       VALUES (
         gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4, $5::uuid, NOW()
       )`,
      args.customerId,
      args.profileStoreId,
      args.consumerId,
      args.externalId,
      args.userId,
    );
  }

  async updateCustomerProfile(
    prisma: IndividualCustomerWriteDatabaseClient,
    tenantSchema: string,
    args: {
      customerId: string;
      talentId: string;
      userId: string;
      update: IndividualCustomerUpdateInput;
    },
  ): Promise<IndividualCustomerUpdatedRecord> {
    const setParts = [
      'last_modified_talent_id = $1::uuid',
      'updated_by = $2::uuid',
      'updated_at = NOW()',
      'version = version + 1',
    ];
    const params: Array<string | string[]> = [args.talentId, args.userId];
    let paramIndex = 3;

    if (args.update.nickname !== undefined) {
      setParts.push(`nickname = $${paramIndex++}`);
      params.push(args.update.nickname);
    }
    if (args.update.primaryLanguage !== undefined) {
      setParts.push(`primary_language = $${paramIndex++}`);
      params.push(args.update.primaryLanguage);
    }
    if (args.update.statusId !== undefined) {
      setParts.push(`status_id = $${paramIndex++}::uuid`);
      params.push(args.update.statusId);
    }
    if (args.update.tags !== undefined) {
      setParts.push(`tags = $${paramIndex++}::text[]`);
      params.push(args.update.tags);
    }
    if (args.update.notes !== undefined) {
      setParts.push(`notes = $${paramIndex++}`);
      params.push(args.update.notes);
    }

    const rows = await prisma.$queryRawUnsafe<IndividualCustomerUpdatedRecord[]>(
      `UPDATE "${tenantSchema}".customer_profile
       SET ${setParts.join(', ')}
       WHERE id = $${paramIndex}::uuid
       RETURNING
         id,
         nickname,
         version,
         updated_at as "updatedAt"`,
      ...params,
      args.customerId,
    );

    return rows[0];
  }

  insertAccessLog(
    prisma: IndividualCustomerWriteDatabaseClient,
    tenantSchema: string,
    args: {
      customerId: string;
      profileStoreId: string;
      talentId: string;
      action: CustomerAction;
      userId: string;
      userName: string;
      ipAddress?: string;
      userAgent?: string;
      requestId: string;
      fieldChanges?: string;
    },
  ) {
    if (args.fieldChanges !== undefined) {
      return prisma.$executeRawUnsafe(
        `INSERT INTO "${tenantSchema}".customer_access_log (
           id, customer_id, profile_store_id, talent_id, action,
           field_changes, operator_id, operator_name, ip_address, user_agent, request_id, occurred_at
         ) VALUES (
           gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4,
           $5::jsonb, $6::uuid, $7, $8::inet, $9, $10, NOW()
         )`,
        args.customerId,
        args.profileStoreId,
        args.talentId,
        args.action,
        args.fieldChanges,
        args.userId,
        args.userName,
        args.ipAddress ?? '0.0.0.0',
        args.userAgent,
        args.requestId,
      );
    }

    return prisma.$executeRawUnsafe(
      `INSERT INTO "${tenantSchema}".customer_access_log (
         id, customer_id, profile_store_id, talent_id, action,
         operator_id, operator_name, ip_address, user_agent, request_id, occurred_at
       ) VALUES (
         gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4,
         $5::uuid, $6, $7::inet, $8, $9, NOW()
       )`,
      args.customerId,
      args.profileStoreId,
      args.talentId,
      args.action,
      args.userId,
      args.userName,
      args.ipAddress ?? '0.0.0.0',
      args.userAgent,
      args.requestId,
    );
  }
}
