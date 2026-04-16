// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';

import type {
  MembershipRecordAccessRecord,
  MembershipRecordCreateResultRow,
  MembershipRecordListItem,
  MembershipRecordUpdatedRow,
  MembershipRecordUpdateLookupRow,
  MembershipSummaryHighestLevel,
} from '../domain/membership-record.policy';

@Injectable()
export class MembershipRecordRepository {
  async findAccessRecord(
    tenantSchema: string,
    customerId: string,
    talentId: string,
  ): Promise<MembershipRecordAccessRecord | null> {
    const customers = await prisma.$queryRawUnsafe<MembershipRecordAccessRecord[]>(
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
    args: {
      customerId: string;
      platformCode?: string;
      isActive?: boolean;
      includeExpired: boolean;
      sort?: string;
      take: number;
      skip: number;
    },
  ): Promise<MembershipRecordListItem[]> {
    const { whereClause, params } = this.buildListFilters(args);
    const sortColumnMap: Record<string, string> = {
      validFrom: 'mr.valid_from',
      validTo: 'mr.valid_to',
      createdAt: 'mr.created_at',
    };
    const orderByColumn = sortColumnMap[args.sort ?? 'validFrom'] ?? 'mr.valid_from';

    return prisma.$queryRawUnsafe<MembershipRecordListItem[]>(
      `SELECT
         mr.id,
         sp.code as "platformCode",
         sp.display_name as "platformName",
         mc.code as "classCode",
         mc.name_en as "className",
         mt.code as "typeCode",
         mt.name_en as "typeName",
         ml.code as "levelCode",
         ml.name_en as "levelName",
         ml.rank as "levelRank",
         ml.color as "levelColor",
         ml.badge_url as "levelBadgeUrl",
         mr.valid_from as "validFrom",
         mr.valid_to as "validTo",
         mr.auto_renew as "autoRenew",
         mr.is_expired as "isExpired",
         mr.note,
         mr.created_at as "createdAt"
       FROM "${tenantSchema}".membership_record mr
       JOIN "${tenantSchema}".social_platform sp ON sp.id = mr.platform_id
       JOIN "${tenantSchema}".membership_class mc ON mc.id = mr.membership_class_id
       JOIN "${tenantSchema}".membership_type mt ON mt.id = mr.membership_type_id
       JOIN "${tenantSchema}".membership_level ml ON ml.id = mr.membership_level_id
       WHERE ${whereClause}
       ORDER BY ${orderByColumn} DESC
       LIMIT ${args.take} OFFSET ${args.skip}`,
      ...params,
    );
  }

  async countByCustomer(
    tenantSchema: string,
    args: {
      customerId: string;
      platformCode?: string;
      isActive?: boolean;
      includeExpired: boolean;
    },
  ): Promise<number> {
    const { whereClause, params } = this.buildListFilters({
      ...args,
      take: 0,
      skip: 0,
    });
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count
       FROM "${tenantSchema}".membership_record mr
       JOIN "${tenantSchema}".social_platform sp ON sp.id = mr.platform_id
       WHERE ${whereClause}`,
      ...params,
    );

    return Number(countResult[0]?.count ?? 0);
  }

  async countActiveByCustomer(
    tenantSchema: string,
    customerId: string,
  ): Promise<number> {
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count
       FROM "${tenantSchema}".membership_record
       WHERE customer_id = $1::uuid
         AND is_expired = false
         AND (valid_to IS NULL OR valid_to > NOW())`,
      customerId,
    );

    return Number(result[0]?.count ?? 0);
  }

  async countExpiredByCustomer(
    tenantSchema: string,
    customerId: string,
  ): Promise<number> {
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count
       FROM "${tenantSchema}".membership_record
       WHERE customer_id = $1::uuid
         AND (is_expired = true OR valid_to <= NOW())`,
      customerId,
    );

    return Number(result[0]?.count ?? 0);
  }

  async findActivePlatformByCode(
    tenantSchema: string,
    platformCode: string,
  ): Promise<{ id: string; code: string; displayName: string } | null> {
    const platforms = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      displayName: string;
    }>>(
      `SELECT
         id,
         code,
         display_name as "displayName"
       FROM "${tenantSchema}".social_platform
       WHERE code = $1
         AND is_active = true`,
      platformCode,
    );

    return platforms[0] ?? null;
  }

  async findActiveMembershipLevelByCode(
    tenantSchema: string,
    membershipLevelCode: string,
  ): Promise<{
    id: string;
    code: string;
    nameEn: string;
    membershipTypeId: string;
    membershipClassId: string;
  } | null> {
    const levels = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      nameEn: string;
      membershipTypeId: string;
      membershipClassId: string;
    }>>(
      `SELECT
         ml.id,
         ml.code,
         ml.name_en as "nameEn",
         ml.membership_type_id as "membershipTypeId",
         mt.membership_class_id as "membershipClassId"
       FROM "${tenantSchema}".membership_level ml
       JOIN "${tenantSchema}".membership_type mt ON mt.id = ml.membership_type_id
       WHERE ml.code = $1
         AND ml.is_active = true`,
      membershipLevelCode,
    );

    return levels[0] ?? null;
  }

  async create(
    tenantSchema: string,
    args: {
      customerId: string;
      platformId: string;
      membershipClassId: string;
      membershipTypeId: string;
      membershipLevelId: string;
      validFrom: Date;
      validTo: Date | null;
      autoRenew: boolean;
      note?: string | null;
      userId: string;
    },
  ): Promise<MembershipRecordCreateResultRow> {
    const records = await prisma.$queryRawUnsafe<MembershipRecordCreateResultRow[]>(
      `INSERT INTO "${tenantSchema}".membership_record (
         id, customer_id, platform_id, membership_class_id, membership_type_id, membership_level_id,
         valid_from, valid_to, auto_renew, note, created_by, updated_by, created_at, updated_at
       ) VALUES (
         gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid,
         $6::timestamptz, $7::timestamptz, $8, $9, $10::uuid, $10::uuid, NOW(), NOW()
       )
       RETURNING
         id,
         valid_from as "validFrom",
         valid_to as "validTo",
         auto_renew as "autoRenew",
         created_at as "createdAt"`,
      args.customerId,
      args.platformId,
      args.membershipClassId,
      args.membershipTypeId,
      args.membershipLevelId,
      args.validFrom,
      args.validTo,
      args.autoRenew,
      args.note ?? null,
      args.userId,
    );

    return records[0];
  }

  insertChangeLog(
    tenantSchema: string,
    args: {
      action: 'create' | 'update';
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
         gen_random_uuid(), $1, 'membership_record', $2::uuid, $3, $4::jsonb, $5::uuid, $6::inet, NOW()
       )`,
      args.action,
      args.objectId,
      args.objectName,
      args.diff,
      args.userId,
      args.ipAddress ?? '0.0.0.0',
    );
  }

  async findOwnedRecord(
    tenantSchema: string,
    customerId: string,
    recordId: string,
  ): Promise<MembershipRecordUpdateLookupRow | null> {
    const records = await prisma.$queryRawUnsafe<MembershipRecordUpdateLookupRow[]>(
      `SELECT
         mr.id,
         mr.valid_to as "validTo",
         mr.auto_renew as "autoRenew",
         mr.note,
         sp.code as "platformCode",
         ml.code as "levelCode"
       FROM "${tenantSchema}".membership_record mr
       JOIN "${tenantSchema}".social_platform sp ON sp.id = mr.platform_id
       JOIN "${tenantSchema}".membership_level ml ON ml.id = mr.membership_level_id
       WHERE mr.id = $1::uuid
         AND mr.customer_id = $2::uuid`,
      recordId,
      customerId,
    );

    return records[0] ?? null;
  }

  async update(
    tenantSchema: string,
    recordId: string,
    args: {
      validTo: Date | null;
      autoRenew: boolean;
      note: string | null;
      userId: string;
    },
  ): Promise<MembershipRecordUpdatedRow> {
    const records = await prisma.$queryRawUnsafe<MembershipRecordUpdatedRow[]>(
      `UPDATE "${tenantSchema}".membership_record
       SET valid_to = $1::timestamptz,
           auto_renew = $2,
           note = $3,
           updated_by = $4::uuid,
           updated_at = NOW()
       WHERE id = $5::uuid
       RETURNING
         id,
         valid_to as "validTo",
         auto_renew as "autoRenew",
         note,
         updated_at as "updatedAt"`,
      args.validTo,
      args.autoRenew,
      args.note,
      args.userId,
      recordId,
    );

    return records[0];
  }

  async findHighestActiveSummary(
    tenantSchema: string,
    customerId: string,
  ): Promise<MembershipSummaryHighestLevel | null> {
    const levels = await prisma.$queryRawUnsafe<MembershipSummaryHighestLevel[]>(
      `SELECT
         sp.code as "platformCode",
         sp.display_name as "platformName",
         ml.code as "levelCode",
         ml.name_en as "levelName",
         ml.color
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

    return levels[0] ?? null;
  }

  async countTotalByCustomer(
    tenantSchema: string,
    customerId: string,
  ): Promise<number> {
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count
       FROM "${tenantSchema}".membership_record
       WHERE customer_id = $1::uuid`,
      customerId,
    );

    return Number(result[0]?.count ?? 0);
  }

  private buildListFilters(args: {
    customerId: string;
    platformCode?: string;
    isActive?: boolean;
    includeExpired: boolean;
    take: number;
    skip: number;
  }) {
    const conditions = ['mr.customer_id = $1::uuid'];
    const params: unknown[] = [args.customerId];
    let paramIndex = 2;

    if (args.platformCode) {
      conditions.push(`sp.code = $${paramIndex}`);
      params.push(args.platformCode);
      paramIndex += 1;
    }

    if (args.isActive !== undefined) {
      if (args.isActive) {
        conditions.push('mr.is_expired = false');
        conditions.push('(mr.valid_to IS NULL OR mr.valid_to > NOW())');
      } else {
        conditions.push('(mr.is_expired = true OR mr.valid_to <= NOW())');
      }
    } else if (!args.includeExpired) {
      conditions.push('mr.is_expired = false');
    }

    return {
      whereClause: conditions.join(' AND '),
      params,
    };
  }
}
