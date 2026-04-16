// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { Prisma, type PrismaClient } from '@tcrn/database';

import { DatabaseService } from '../../database';
import type {
  IndividualCustomerPiiCustomerRecord,
  IndividualCustomerPiiTalentRecord,
} from '../domain/individual-customer-pii.policy';
import type { CustomerAction } from '../dto/customer.dto';

type IndividualCustomerPiiDatabaseClient = Prisma.TransactionClient | PrismaClient;

@Injectable()
export class IndividualCustomerPiiRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  withTransaction<T>(
    operation: (prisma: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.databaseService.getPrisma().$transaction((prisma) => operation(prisma));
  }

  async findCustomerRecord(
    tenantSchema: string,
    customerId: string,
  ): Promise<IndividualCustomerPiiCustomerRecord | null> {
    const customers = await this.databaseService.getPrisma().$queryRawUnsafe<
      IndividualCustomerPiiCustomerRecord[]
    >(
      `SELECT
         id,
         profile_type as "profileType",
         profile_store_id as "profileStoreId",
         version,
         nickname,
         primary_language as "primaryLanguage",
         status_id as "statusId",
         tags,
         notes
       FROM "${tenantSchema}".customer_profile
       WHERE id = $1::uuid`,
      customerId,
    );

    return customers[0] ?? null;
  }

  async findTalentProfileStore(
    tenantSchema: string,
    talentId: string,
  ): Promise<IndividualCustomerPiiTalentRecord | null> {
    const talents = await this.databaseService.getPrisma().$queryRawUnsafe<
      IndividualCustomerPiiTalentRecord[]
    >(
      `SELECT
         id,
         profile_store_id as "profileStoreId"
       FROM "${tenantSchema}".talent
       WHERE id = $1::uuid`,
      talentId,
    );

    return talents[0] ?? null;
  }

  insertAccessLog(
    prisma: IndividualCustomerPiiDatabaseClient,
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
    },
  ) {
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

  insertPiiUpdateAccessLog(
    prisma: IndividualCustomerPiiDatabaseClient,
    tenantSchema: string,
    args: {
      customerId: string;
      profileStoreId: string;
      talentId: string;
      action: CustomerAction;
      fieldChanges: string;
      userId: string;
      userName: string;
      ipAddress?: string;
      userAgent?: string;
      requestId: string;
    },
  ) {
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

  incrementCustomerVersion(
    prisma: IndividualCustomerPiiDatabaseClient,
    tenantSchema: string,
    args: {
      customerId: string;
      talentId: string;
      userId: string;
    },
  ) {
    return prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".customer_profile
       SET last_modified_talent_id = $2::uuid,
           updated_by = $3::uuid,
           version = version + 1,
           updated_at = NOW()
       WHERE id = $1::uuid`,
      args.customerId,
      args.talentId,
      args.userId,
    );
  }
}
