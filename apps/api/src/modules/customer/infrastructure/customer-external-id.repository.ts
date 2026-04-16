// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';

import type {
  CustomerExternalIdAccessRecord,
  CustomerExternalIdRecord,
} from '../domain/customer-external-id.policy';

@Injectable()
export class CustomerExternalIdRepository {
  async findCustomerAccessRecord(
    tenantSchema: string,
    customerId: string,
    talentId: string,
  ): Promise<CustomerExternalIdAccessRecord | null> {
    const customers = await prisma.$queryRawUnsafe<CustomerExternalIdAccessRecord[]>(
      `SELECT
         cp.id,
         cp.profile_store_id as "profileStoreId",
         cp.nickname
       FROM "${tenantSchema}".customer_profile cp
       JOIN "${tenantSchema}".talent t ON t.profile_store_id = cp.profile_store_id
       WHERE cp.id = $1::uuid
         AND t.id = $2::uuid
         AND t.profile_store_id IS NOT NULL`,
      customerId,
      talentId,
    );

    return customers[0] ?? null;
  }

  findByCustomer(
    tenantSchema: string,
    customerId: string,
  ): Promise<CustomerExternalIdRecord[]> {
    return prisma.$queryRawUnsafe<CustomerExternalIdRecord[]>(
      `SELECT
         cei.id,
         c.id as "consumerId",
         c.code as "consumerCode",
         c.name_en as "consumerName",
         cei.external_id as "externalId",
         cei.created_at as "createdAt",
         cei.created_by as "createdBy"
       FROM "${tenantSchema}".customer_external_id cei
       JOIN "${tenantSchema}".consumer c ON c.id = cei.consumer_id
       WHERE cei.customer_id = $1::uuid
       ORDER BY cei.created_at DESC`,
      customerId,
    );
  }

  async findActiveConsumerByCode(
    tenantSchema: string,
    consumerCode: string,
  ): Promise<{ id: string; code: string; nameEn: string } | null> {
    const consumers = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      nameEn: string;
    }>>(
      `SELECT id, code, name_en as "nameEn"
       FROM "${tenantSchema}".consumer
       WHERE code = $1
         AND is_active = true`,
      consumerCode,
    );

    return consumers[0] ?? null;
  }

  async findDuplicateExternalId(
    tenantSchema: string,
    profileStoreId: string,
    consumerId: string,
    externalId: string,
  ): Promise<{ id: string } | null> {
    const records = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id
       FROM "${tenantSchema}".customer_external_id
       WHERE profile_store_id = $1::uuid
         AND consumer_id = $2::uuid
         AND external_id = $3`,
      profileStoreId,
      consumerId,
      externalId,
    );

    return records[0] ?? null;
  }

  async create(
    tenantSchema: string,
    args: {
      customerId: string;
      profileStoreId: string;
      consumerId: string;
      externalId: string;
      userId: string;
    },
  ): Promise<{ id: string; externalId: string; createdAt: Date }> {
    const records = await prisma.$queryRawUnsafe<Array<{
      id: string;
      externalId: string;
      createdAt: Date;
    }>>(
      `INSERT INTO "${tenantSchema}".customer_external_id (
         id, customer_id, profile_store_id, consumer_id, external_id, created_by, created_at
       ) VALUES (
         gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4, $5::uuid, NOW()
       )
       RETURNING id, external_id as "externalId", created_at as "createdAt"`,
      args.customerId,
      args.profileStoreId,
      args.consumerId,
      args.externalId,
      args.userId,
    );

    return records[0];
  }

  insertChangeLog(
    tenantSchema: string,
    args: {
      action: 'create' | 'delete';
      objectId: string;
      objectName: string;
      diff: string;
      userId: string;
      ipAddress?: string;
    },
  ) {
    return prisma.$executeRawUnsafe(
      `INSERT INTO "${tenantSchema}".change_log (
         id, action, object_type, object_id, object_name, diff, operator_id, ip_address, occurred_at
       ) VALUES (
         gen_random_uuid(), $1, 'customer_external_id', $2::uuid, $3, $4::jsonb, $5::uuid, $6::inet, NOW()
       )`,
      args.action,
      args.objectId,
      args.objectName,
      args.diff,
      args.userId,
      args.ipAddress ?? '0.0.0.0',
    );
  }

  async findOwnedExternalId(
    tenantSchema: string,
    customerId: string,
    externalIdId: string,
  ): Promise<{ id: string; externalId: string; consumerCode: string } | null> {
    const records = await prisma.$queryRawUnsafe<Array<{
      id: string;
      externalId: string;
      consumerCode: string;
    }>>(
      `SELECT
         cei.id,
         cei.external_id as "externalId",
         c.code as "consumerCode"
       FROM "${tenantSchema}".customer_external_id cei
       JOIN "${tenantSchema}".consumer c ON c.id = cei.consumer_id
       WHERE cei.id = $1::uuid
         AND cei.customer_id = $2::uuid`,
      externalIdId,
      customerId,
    );

    return records[0] ?? null;
  }

  delete(tenantSchema: string, externalIdId: string) {
    return prisma.$executeRawUnsafe(
      `DELETE FROM "${tenantSchema}".customer_external_id WHERE id = $1::uuid`,
      externalIdId,
    );
  }

  async findCustomerByExternalId(
    tenantSchema: string,
    consumerCode: string,
    externalId: string,
    profileStoreId: string,
  ): Promise<{ id: string; nickname: string; profileStoreId: string } | null> {
    const records = await prisma.$queryRawUnsafe<Array<{
      id: string;
      nickname: string;
      profileStoreId: string;
    }>>(
      `SELECT
         cp.id,
         cp.nickname,
         cp.profile_store_id as "profileStoreId"
       FROM "${tenantSchema}".customer_external_id cei
       JOIN "${tenantSchema}".consumer c ON c.id = cei.consumer_id
       JOIN "${tenantSchema}".customer_profile cp ON cp.id = cei.customer_id
       WHERE cei.profile_store_id = $1::uuid
         AND c.code = $2
         AND cei.external_id = $3`,
      profileStoreId,
      consumerCode,
      externalId,
    );

    return records[0] ?? null;
  }

  async existsInProfileStore(
    tenantSchema: string,
    consumerCode: string,
    externalId: string,
    profileStoreId: string,
  ): Promise<boolean> {
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count
       FROM "${tenantSchema}".customer_external_id cei
       JOIN "${tenantSchema}".consumer c ON c.id = cei.consumer_id
       WHERE cei.profile_store_id = $1::uuid
         AND c.code = $2
         AND cei.external_id = $3`,
      profileStoreId,
      consumerCode,
      externalId,
    );

    return Number(countResult[0]?.count ?? 0) > 0;
  }
}
