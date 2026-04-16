// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';

import type {
  CustomerProfileActiveMembershipRecord,
  CustomerProfileListRecord,
} from '../domain/customer-profile-read.policy';

interface CustomerProfileListFilters {
  profileStoreId: string;
  profileType?: string;
  statusId?: string;
  isActive?: boolean;
  search?: string;
  tags?: string[];
  createdFrom?: string;
  createdTo?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

@Injectable()
export class CustomerProfileReadRepository {
  async findTalentProfileStore(
    tenantSchema: string,
    talentId: string,
  ): Promise<{ id: string; profileStoreId: string | null } | null> {
    const talents = await prisma.$queryRawUnsafe<Array<{
      id: string;
      profileStoreId: string | null;
    }>>(
      `SELECT id, profile_store_id as "profileStoreId"
       FROM "${tenantSchema}".talent
       WHERE id = $1::uuid`,
      talentId,
    );

    return talents[0] ?? null;
  }

  async findMany(
    tenantSchema: string,
    filters: CustomerProfileListFilters,
    pagination: { page: number; pageSize: number },
  ): Promise<CustomerProfileListRecord[]> {
    const { whereClause, params, orderByField, orderDirection } =
      this.buildListQueryParts(filters);
    const take = pagination.pageSize;
    const skip = (pagination.page - 1) * pagination.pageSize;

    return prisma.$queryRawUnsafe<CustomerProfileListRecord[]>(
      `SELECT
         cp.id,
         cp.profile_type as "profileType",
         cp.nickname,
         cp.primary_language as "primaryLanguage",
         cp.tags,
         cp.is_active as "isActive",
         cp.created_at as "createdAt",
         cp.updated_at as "updatedAt",
         cs.id as "statusId",
         cs.code as "statusCode",
         cs.name_en as "statusName",
         cs.color as "statusColor",
         cci.company_short_name as "companyShortName",
         ot.id as "originTalentId",
         ot.display_name as "originTalentDisplayName",
         (
           SELECT COUNT(*)
           FROM "${tenantSchema}".membership_record mr
           WHERE mr.customer_id = cp.id
         ) as "membershipCount"
       FROM "${tenantSchema}".customer_profile cp
       LEFT JOIN "${tenantSchema}".customer_status cs ON cs.id = cp.status_id
       LEFT JOIN "${tenantSchema}".customer_company_info cci ON cci.customer_id = cp.id
       LEFT JOIN "${tenantSchema}".talent ot ON ot.id = cp.origin_talent_id
       WHERE ${whereClause}
       ORDER BY ${orderByField} ${orderDirection}
       LIMIT ${take} OFFSET ${skip}`,
      ...params,
    );
  }

  async countMany(tenantSchema: string, filters: CustomerProfileListFilters): Promise<number> {
    const { whereClause, params } = this.buildListQueryParts(filters);
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count
       FROM "${tenantSchema}".customer_profile cp
       LEFT JOIN "${tenantSchema}".customer_company_info cci ON cci.customer_id = cp.id
       WHERE ${whereClause}`,
      ...params,
    );

    return Number(result[0]?.count ?? 0);
  }

  async findActiveMembershipSummaries(
    tenantSchema: string,
    customerIds: string[],
  ): Promise<Map<string, CustomerProfileActiveMembershipRecord>> {
    if (customerIds.length === 0) {
      return new Map();
    }

    const memberships = await prisma.$queryRawUnsafe<Array<{
      customerId: string;
      platformCode: string;
      platformName: string;
      levelCode: string;
      levelName: string;
      color: string | null;
    }>>(
      `SELECT DISTINCT ON (mr.customer_id)
         mr.customer_id as "customerId",
         p.code as "platformCode",
         p.display_name as "platformName",
         ml.code as "levelCode",
         ml.name_en as "levelName",
         ml.color as color
       FROM "${tenantSchema}".membership_record mr
       JOIN "${tenantSchema}".social_platform p ON p.id = mr.platform_id
       JOIN "${tenantSchema}".membership_level ml ON ml.id = mr.membership_level_id
       WHERE mr.customer_id = ANY($1::uuid[])
         AND mr.is_expired = false
         AND (mr.valid_to IS NULL OR mr.valid_to > NOW())
       ORDER BY mr.customer_id, ml.rank DESC`,
      customerIds,
    );

    return new Map(
      memberships.map((membership) => [membership.customerId, membership]),
    );
  }

  async findById(
    tenantSchema: string,
    customerId: string,
    profileStoreId: string,
  ): Promise<{
    id: string;
    talentId: string;
    profileStoreId: string;
    originTalentId: string;
    lastModifiedTalentId: string | null;
    profileType: string;
    nickname: string;
    primaryLanguage: string | null;
    notes: string | null;
    tags: string[];
    source: string | null;
    isActive: boolean;
    inactivatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
    version: number;
    statusId: string | null;
    inactivationReasonId: string | null;
  } | null> {
    const customers = await prisma.$queryRawUnsafe<Array<{
      id: string;
      talentId: string;
      profileStoreId: string;
      originTalentId: string;
      lastModifiedTalentId: string | null;
      profileType: string;
      nickname: string;
      primaryLanguage: string | null;
      notes: string | null;
      tags: string[];
      source: string | null;
      isActive: boolean;
      inactivatedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      createdBy: string | null;
      updatedBy: string | null;
      version: number;
      statusId: string | null;
      inactivationReasonId: string | null;
    }>>(
      `SELECT
         cp.id,
         cp.talent_id as "talentId",
         cp.profile_store_id as "profileStoreId",
         cp.origin_talent_id as "originTalentId",
         cp.last_modified_talent_id as "lastModifiedTalentId",
         cp.profile_type as "profileType",
         cp.nickname,
         cp.primary_language as "primaryLanguage",
         cp.notes,
         cp.tags,
         cp.source,
         cp.is_active as "isActive",
         cp.inactivated_at as "inactivatedAt",
         cp.created_at as "createdAt",
         cp.updated_at as "updatedAt",
         cp.created_by as "createdBy",
         cp.updated_by as "updatedBy",
         cp.version,
         cp.status_id as "statusId",
         cp.inactivation_reason_id as "inactivationReasonId"
       FROM "${tenantSchema}".customer_profile cp
       WHERE cp.id = $1::uuid
         AND cp.profile_store_id = $2::uuid`,
      customerId,
      profileStoreId,
    );

    return customers[0] ?? null;
  }

  async findTalentSummary(
    tenantSchema: string,
    talentId: string,
  ): Promise<{ id: string; code: string; displayName: string } | null> {
    const talents = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      displayName: string;
    }>>(
      `SELECT id, code, display_name as "displayName"
       FROM "${tenantSchema}".talent
       WHERE id = $1::uuid`,
      talentId,
    );

    return talents[0] ?? null;
  }

  async findProfileStoreSummary(
    tenantSchema: string,
    profileStoreId: string,
  ): Promise<{ id: string; code: string; nameEn: string } | null> {
    const stores = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      nameEn: string;
    }>>(
      `SELECT id, code, name_en as "nameEn"
       FROM "${tenantSchema}".profile_store
       WHERE id = $1::uuid`,
      profileStoreId,
    );

    return stores[0] ?? null;
  }

  async findStatusSummary(
    tenantSchema: string,
    statusId: string,
  ): Promise<{ id: string; code: string; nameEn: string; color: string | null } | null> {
    const statuses = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      nameEn: string;
      color: string | null;
    }>>(
      `SELECT id, code, name_en as "nameEn", color
       FROM "${tenantSchema}".customer_status
       WHERE id = $1::uuid`,
      statusId,
    );

    return statuses[0] ?? null;
  }

  async findInactivationReasonSummary(
    tenantSchema: string,
    reasonId: string,
  ): Promise<{ id: string; code: string; nameEn: string } | null> {
    const reasons = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      nameEn: string;
    }>>(
      `SELECT id, code, name_en as "nameEn"
       FROM "${tenantSchema}".inactivation_reason
       WHERE id = $1::uuid`,
      reasonId,
    );

    return reasons[0] ?? null;
  }

  async findCompanyInfo(
    tenantSchema: string,
    customerId: string,
  ): Promise<{
    companyLegalName: string;
    companyShortName: string | null;
    registrationNumber: string | null;
    vatId: string | null;
    establishmentDate: Date | null;
    website: string | null;
    businessSegmentId: string | null;
    businessSegment: { id: string; code: string; nameEn: string } | null;
  } | null> {
    const rows = await prisma.$queryRawUnsafe<Array<{
      companyLegalName: string;
      companyShortName: string | null;
      registrationNumber: string | null;
      vatId: string | null;
      establishmentDate: Date | null;
      website: string | null;
      businessSegmentId: string | null;
      businessSegmentRecordId: string | null;
      businessSegmentCode: string | null;
      businessSegmentNameEn: string | null;
    }>>(
      `SELECT
         cci.company_legal_name as "companyLegalName",
         cci.company_short_name as "companyShortName",
         cci.registration_number as "registrationNumber",
         cci.vat_id as "vatId",
         cci.establishment_date as "establishmentDate",
         cci.website,
         cci.business_segment_id as "businessSegmentId",
         bs.id as "businessSegmentRecordId",
         bs.code as "businessSegmentCode",
         bs.name_en as "businessSegmentNameEn"
       FROM "${tenantSchema}".customer_company_info cci
       LEFT JOIN "${tenantSchema}".business_segment bs ON bs.id = cci.business_segment_id
       WHERE cci.customer_id = $1::uuid`,
      customerId,
    );

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      companyLegalName: row.companyLegalName,
      companyShortName: row.companyShortName,
      registrationNumber: row.registrationNumber,
      vatId: row.vatId,
      establishmentDate: row.establishmentDate,
      website: row.website,
      businessSegmentId: row.businessSegmentId,
      businessSegment: row.businessSegmentRecordId
        ? {
            id: row.businessSegmentRecordId,
            code: row.businessSegmentCode ?? '',
            nameEn: row.businessSegmentNameEn ?? '',
          }
        : null,
    };
  }

  async findHighestActiveMembership(
    tenantSchema: string,
    customerId: string,
  ): Promise<CustomerProfileActiveMembershipRecord | null> {
    const memberships = await prisma.$queryRawUnsafe<Array<{
      platformCode: string;
      platformName: string;
      levelCode: string;
      levelName: string;
      color: string | null;
    }>>(
      `SELECT
         sp.code as "platformCode",
         sp.name_en as "platformName",
         ml.code as "levelCode",
         ml.name_en as "levelName",
         ml.color as color
       FROM "${tenantSchema}".membership_record mr
       JOIN "${tenantSchema}".social_platform sp ON sp.id = mr.platform_id
       JOIN "${tenantSchema}".membership_level ml ON ml.id = mr.membership_level_id
       WHERE mr.customer_id = $1::uuid
         AND mr.is_expired = false
         AND (mr.valid_to IS NULL OR mr.valid_to > NOW())
       ORDER BY ml.rank DESC
       LIMIT 1`,
      customerId,
    );

    return memberships[0] ?? null;
  }

  async countPlatformIdentities(tenantSchema: string, customerId: string): Promise<number> {
    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count
       FROM "${tenantSchema}".platform_identity
       WHERE customer_id = $1::uuid`,
      customerId,
    );

    return Number(rows[0]?.count ?? 0);
  }

  async countMembershipRecords(tenantSchema: string, customerId: string): Promise<number> {
    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count
       FROM "${tenantSchema}".membership_record
       WHERE customer_id = $1::uuid`,
      customerId,
    );

    return Number(rows[0]?.count ?? 0);
  }

  findRecentAccessLogs(
    tenantSchema: string,
    customerId: string,
  ): Promise<Array<{
    action: string;
    occurredAt: Date;
    talentId: string;
    talentDisplayName: string;
    operatorId: string | null;
    operatorUsername: string | null;
  }>> {
    return prisma.$queryRawUnsafe<Array<{
      action: string;
      occurredAt: Date;
      talentId: string;
      talentDisplayName: string;
      operatorId: string | null;
      operatorUsername: string | null;
    }>>(
      `SELECT
         cal.action,
         cal.occurred_at as "occurredAt",
         cal.talent_id as "talentId",
         t.display_name as "talentDisplayName",
         cal.operator_id as "operatorId",
         su.username as "operatorUsername"
       FROM "${tenantSchema}".customer_access_log cal
       JOIN "${tenantSchema}".talent t ON t.id = cal.talent_id
       LEFT JOIN "${tenantSchema}".system_user su ON su.id = cal.operator_id
       WHERE cal.customer_id = $1::uuid
       ORDER BY cal.occurred_at DESC
       LIMIT 5`,
      customerId,
    );
  }

  private buildListQueryParts(filters: CustomerProfileListFilters): {
    whereClause: string;
    params: unknown[];
    orderByField: string;
    orderDirection: 'ASC' | 'DESC';
  } {
    const conditions: string[] = ['cp.profile_store_id = $1::uuid'];
    const params: unknown[] = [filters.profileStoreId];
    let paramIndex = 2;

    if (filters.profileType) {
      conditions.push(`cp.profile_type = $${paramIndex}`);
      params.push(filters.profileType);
      paramIndex += 1;
    }

    if (filters.statusId) {
      conditions.push(`cp.status_id = $${paramIndex}::uuid`);
      params.push(filters.statusId);
      paramIndex += 1;
    }

    if (typeof filters.isActive !== 'undefined') {
      conditions.push(`cp.is_active = $${paramIndex}`);
      params.push(filters.isActive);
      paramIndex += 1;
    }

    if (filters.tags && filters.tags.length > 0) {
      conditions.push(`cp.tags @> $${paramIndex}::varchar[]`);
      params.push(filters.tags);
      paramIndex += 1;
    }

    if (filters.createdFrom) {
      conditions.push(`cp.created_at >= $${paramIndex}::timestamptz`);
      params.push(filters.createdFrom);
      paramIndex += 1;
    }

    if (filters.createdTo) {
      conditions.push(`cp.created_at <= $${paramIndex}::timestamptz`);
      params.push(filters.createdTo);
      paramIndex += 1;
    }

    if (filters.search) {
      conditions.push(`(
        cp.nickname ILIKE $${paramIndex}
        OR $${paramIndex + 1} = ANY(cp.tags)
        OR cci.company_legal_name ILIKE $${paramIndex}
        OR cci.company_short_name ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.search}%`);
      params.push(filters.search);
      paramIndex += 2;
    }

    let orderByField = 'cp.created_at';
    if (filters.sort === 'updatedAt') {
      orderByField = 'cp.updated_at';
    } else if (filters.sort === 'nickname') {
      orderByField = 'cp.nickname';
    }

    return {
      whereClause: conditions.join(' AND '),
      params,
      orderByField,
      orderDirection: filters.order === 'asc' ? 'ASC' : 'DESC',
    };
  }
}
