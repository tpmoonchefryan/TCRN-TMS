// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { Prisma, type PrismaClient } from '@tcrn/database';

import { DatabaseService } from '../../database';
import type {
  CompanyCustomerAccessRecord,
  CompanyCustomerCreatedRecord,
  CompanyCustomerInfoUpdateInput,
  CompanyCustomerProfileUpdateInput,
  CompanyCustomerTalentRecord,
  CompanyCustomerUpdatedRecord,
} from '../domain/company-customer.policy';
import type { CustomerAction } from '../dto/customer.dto';

type CompanyCustomerDatabaseClient = Prisma.TransactionClient | PrismaClient;

@Injectable()
export class CompanyCustomerRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  withTransaction<T>(
    operation: (prisma: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.databaseService.getPrisma().$transaction((prisma) => operation(prisma));
  }

  async findTalentProfileStore(
    prisma: CompanyCustomerDatabaseClient,
    tenantSchema: string,
    talentId: string,
  ): Promise<CompanyCustomerTalentRecord | null> {
    const talents = await prisma.$queryRawUnsafe<CompanyCustomerTalentRecord[]>(
      `SELECT
         id,
         profile_store_id as "profileStoreId"
       FROM "${tenantSchema}".talent
       WHERE id = $1::uuid`,
      talentId,
    );

    return talents[0] ?? null;
  }

  async findActiveStatusId(
    prisma: CompanyCustomerDatabaseClient,
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

  async findActiveBusinessSegmentId(
    prisma: CompanyCustomerDatabaseClient,
    tenantSchema: string,
    businessSegmentCode: string,
  ): Promise<string | null> {
    const segments = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id
       FROM "${tenantSchema}".business_segment
       WHERE code = $1
         AND is_active = true
       LIMIT 1`,
      businessSegmentCode,
    );

    return segments[0]?.id ?? null;
  }

  async findActiveConsumer(
    prisma: CompanyCustomerDatabaseClient,
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
    prisma: CompanyCustomerDatabaseClient,
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
  ): Promise<CompanyCustomerCreatedRecord> {
    const customers = await prisma.$queryRawUnsafe<CompanyCustomerCreatedRecord[]>(
      `INSERT INTO "${tenantSchema}".customer_profile (
         id, talent_id, profile_store_id, origin_talent_id,
         profile_type, nickname, primary_language, status_id, tags, source,
         notes, created_by, updated_by, created_at, updated_at
       )
       VALUES (
         gen_random_uuid(), $1::uuid, $2::uuid, $1::uuid,
         'company', $3, $4, $5::uuid, $6::text[], $7,
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

  insertCompanyInfo(
    prisma: CompanyCustomerDatabaseClient,
    tenantSchema: string,
    args: {
      customerId: string;
      companyLegalName: string;
      companyShortName?: string | null;
      registrationNumber?: string | null;
      vatId?: string | null;
      establishmentDate?: Date | null;
      businessSegmentId: string | null;
      website?: string | null;
    },
  ) {
    return prisma.$executeRawUnsafe(
      `INSERT INTO "${tenantSchema}".customer_company_info (
         id, customer_id, company_legal_name, company_short_name, registration_number,
         vat_id, establishment_date, business_segment_id, website,
         contact_name, contact_phone, contact_email, contact_department,
         created_at, updated_at
       )
       VALUES (
         gen_random_uuid(), $1::uuid, $2, $3, $4,
         $5, $6, $7::uuid, $8, $9, $10, $11, $12, NOW(), NOW()
       )`,
      args.customerId,
      args.companyLegalName,
      args.companyShortName ?? null,
      args.registrationNumber ?? null,
      args.vatId ?? null,
      args.establishmentDate ?? null,
      args.businessSegmentId,
      args.website ?? null,
      null,
      null,
      null,
      null,
    );
  }

  insertExternalId(
    prisma: CompanyCustomerDatabaseClient,
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

  async findAccessRecord(
    prisma: CompanyCustomerDatabaseClient,
    tenantSchema: string,
    customerId: string,
    talentId: string,
  ): Promise<CompanyCustomerAccessRecord | null> {
    const customers = await prisma.$queryRawUnsafe<CompanyCustomerAccessRecord[]>(
      `SELECT
         cp.id,
         cp.profile_type as "profileType",
         cp.profile_store_id as "profileStoreId",
         cp.nickname,
         cp.version,
         cp.primary_language as "primaryLanguage",
         cp.status_id as "statusId",
         cp.tags,
         cp.notes
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

  async updateCustomerProfile(
    prisma: CompanyCustomerDatabaseClient,
    tenantSchema: string,
    args: {
      customerId: string;
      talentId: string;
      userId: string;
      update: CompanyCustomerProfileUpdateInput;
    },
  ): Promise<CompanyCustomerUpdatedRecord | null> {
    const setParts = [
      'last_modified_talent_id = $1::uuid',
      'updated_by = $2::uuid',
      'updated_at = NOW()',
      'version = version + 1',
    ];
    const params: Array<string | string[] | null> = [args.talentId, args.userId];
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

    const updated = await prisma.$queryRawUnsafe<CompanyCustomerUpdatedRecord[]>(
      `UPDATE "${tenantSchema}".customer_profile
       SET ${setParts.join(', ')}
       WHERE id = $${paramIndex}::uuid
       RETURNING id, nickname, version, updated_at as "updatedAt"`,
      ...params,
      args.customerId,
    );

    return updated[0] ?? null;
  }

  updateCompanyInfo(
    prisma: CompanyCustomerDatabaseClient,
    tenantSchema: string,
    customerId: string,
    update: CompanyCustomerInfoUpdateInput,
  ) {
    const setParts: string[] = [];
    const params: Array<string | Date | null> = [];
    let paramIndex = 1;

    if (update.companyLegalName !== undefined) {
      setParts.push(`company_legal_name = $${paramIndex++}`);
      params.push(update.companyLegalName);
    }
    if (update.companyShortName !== undefined) {
      setParts.push(`company_short_name = $${paramIndex++}`);
      params.push(update.companyShortName);
    }
    if (update.registrationNumber !== undefined) {
      setParts.push(`registration_number = $${paramIndex++}`);
      params.push(update.registrationNumber);
    }
    if (update.vatId !== undefined) {
      setParts.push(`vat_id = $${paramIndex++}`);
      params.push(update.vatId);
    }
    if (update.establishmentDate !== undefined) {
      setParts.push(`establishment_date = $${paramIndex++}`);
      params.push(update.establishmentDate);
    }
    if (update.businessSegmentId !== undefined) {
      setParts.push(`business_segment_id = $${paramIndex++}::uuid`);
      params.push(update.businessSegmentId);
    }
    if (update.website !== undefined) {
      setParts.push(`website = $${paramIndex++}`);
      params.push(update.website);
    }
    return prisma.$executeRawUnsafe(
      `UPDATE "${tenantSchema}".customer_company_info
       SET ${setParts.join(', ')}
       WHERE customer_id = $${paramIndex}::uuid`,
      ...params,
      customerId,
    );
  }

  insertCompanyInfoForUpdate(
    prisma: CompanyCustomerDatabaseClient,
    tenantSchema: string,
    customerId: string,
    update: CompanyCustomerInfoUpdateInput,
  ) {
    const columns = ['id', 'customer_id', 'updated_at'];
    const values = ['gen_random_uuid()', '$1::uuid', 'NOW()'];
    const params: Array<string | Date | null> = [customerId];
    let paramIndex = 2;

    if (update.companyLegalName !== undefined) {
      columns.push('company_legal_name');
      values.push(`$${paramIndex++}`);
      params.push(update.companyLegalName);
    }
    if (update.companyShortName !== undefined) {
      columns.push('company_short_name');
      values.push(`$${paramIndex++}`);
      params.push(update.companyShortName);
    }
    if (update.registrationNumber !== undefined) {
      columns.push('registration_number');
      values.push(`$${paramIndex++}`);
      params.push(update.registrationNumber);
    }
    if (update.vatId !== undefined) {
      columns.push('vat_id');
      values.push(`$${paramIndex++}`);
      params.push(update.vatId);
    }
    if (update.establishmentDate !== undefined) {
      columns.push('establishment_date');
      values.push(`$${paramIndex++}`);
      params.push(update.establishmentDate);
    }
    if (update.businessSegmentId !== undefined) {
      columns.push('business_segment_id');
      values.push(`$${paramIndex++}::uuid`);
      params.push(update.businessSegmentId);
    }
    if (update.website !== undefined) {
      columns.push('website');
      values.push(`$${paramIndex++}`);
      params.push(update.website);
    }
    return prisma.$executeRawUnsafe(
      `INSERT INTO "${tenantSchema}".customer_company_info (${columns.join(', ')})
       VALUES (${values.join(', ')})`,
      ...params,
    );
  }

  insertAccessLog(
    prisma: CompanyCustomerDatabaseClient,
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
      requestId?: string;
      fieldChanges?: string;
    },
  ) {
    if (args.fieldChanges === undefined) {
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
        args.requestId ?? null,
      );
    }

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
      args.requestId ?? null,
    );
  }
}
