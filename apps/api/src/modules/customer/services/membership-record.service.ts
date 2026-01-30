// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { ChangeLogService } from '../../log';
import {
    CreateMembershipDto,
    MembershipListQueryDto,
    UpdateMembershipDto,
} from '../dto/customer.dto';

/**
 * Membership Record Service
 * Manages customer membership records
 */
@Injectable()
export class MembershipRecordService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly changeLogService: ChangeLogService,
  ) {}

  /**
   * Get membership records for a customer (multi-tenant aware)
   */
  async findByCustomer(
    customerId: string,
    talentId: string,
    query: MembershipListQueryDto,
    context: RequestContext,
  ) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Verify access with tenant context
    await this.verifyCustomerAccess(customerId, talentId, context);

    const {
      platformCode,
      isActive,
      includeExpired = false,
      sort = 'validFrom',
      page = 1,
      pageSize = 20,
    } = query;
    const pagination = this.databaseService.buildPagination(page, pageSize);

    // Build where conditions
    const conditions: string[] = ['mr.customer_id = $1::uuid'];
    const params: unknown[] = [customerId];
    let paramIndex = 2;

    if (platformCode) {
      conditions.push(`sp.code = $${paramIndex}`);
      params.push(platformCode);
      paramIndex++;
    }

    if (isActive !== undefined) {
      if (isActive) {
        conditions.push('mr.is_expired = false');
        conditions.push('(mr.valid_to IS NULL OR mr.valid_to > NOW())');
      } else {
        conditions.push('(mr.is_expired = true OR mr.valid_to <= NOW())');
      }
    } else if (!includeExpired) {
      conditions.push('mr.is_expired = false');
    }

    // Build order by
    const sortColumnMap: Record<string, string> = {
      validFrom: 'mr.valid_from',
      validTo: 'mr.valid_to',
      createdAt: 'mr.created_at',
    };
    const orderByColumn = sortColumnMap[sort] || 'mr.valid_from';

    const whereClause = conditions.join(' AND ');

    // Query items with joins
    const items = await prisma.$queryRawUnsafe<Array<{
      id: string;
      platform_code: string;
      platform_name: string;
      class_code: string;
      class_name: string;
      type_code: string;
      type_name: string;
      level_code: string;
      level_name: string;
      level_rank: number;
      level_color: string | null;
      level_badge_url: string | null;
      valid_from: Date;
      valid_to: Date | null;
      auto_renew: boolean;
      is_expired: boolean;
      note: string | null;
      created_at: Date;
    }>>(`
      SELECT 
        mr.id,
        sp.code as platform_code,
        sp.display_name as platform_name,
        mc.code as class_code,
        mc.name_en as class_name,
        mt.code as type_code,
        mt.name_en as type_name,
        ml.code as level_code,
        ml.name_en as level_name,
        ml.rank as level_rank,
        ml.color as level_color,
        ml.badge_url as level_badge_url,
        mr.valid_from,
        mr.valid_to,
        mr.auto_renew,
        mr.is_expired,
        mr.note,
        mr.created_at
      FROM "${schema}".membership_record mr
      JOIN "${schema}".social_platform sp ON sp.id = mr.platform_id
      JOIN "${schema}".membership_class mc ON mc.id = mr.membership_class_id
      JOIN "${schema}".membership_type mt ON mt.id = mr.membership_type_id
      JOIN "${schema}".membership_level ml ON ml.id = mr.membership_level_id
      WHERE ${whereClause}
      ORDER BY ${orderByColumn} DESC
      LIMIT ${pagination.take} OFFSET ${pagination.skip}
    `, ...params);

    // Count total
    const totalResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count
      FROM "${schema}".membership_record mr
      JOIN "${schema}".social_platform sp ON sp.id = mr.platform_id
      WHERE ${whereClause}
    `, ...params);
    const total = Number(totalResult[0]?.count || 0);

    // Calculate summary
    const [activeResult, expiredResult] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*) as count
        FROM "${schema}".membership_record
        WHERE customer_id = $1::uuid
          AND is_expired = false
          AND (valid_to IS NULL OR valid_to > NOW())
      `, customerId),
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*) as count
        FROM "${schema}".membership_record
        WHERE customer_id = $1::uuid
          AND (is_expired = true OR valid_to <= NOW())
      `, customerId),
    ]);

    const allActive = Number(activeResult[0]?.count || 0);
    const allExpired = Number(expiredResult[0]?.count || 0);

    return {
      items: items.map((item) => ({
        id: item.id,
        platform: {
          code: item.platform_code,
          name: item.platform_name,
        },
        membershipClass: {
          code: item.class_code,
          name: item.class_name,
        },
        membershipType: {
          code: item.type_code,
          name: item.type_name,
        },
        membershipLevel: {
          code: item.level_code,
          name: item.level_name,
          rank: item.level_rank,
          color: item.level_color,
          badgeUrl: item.level_badge_url,
        },
        validFrom: item.valid_from,
        validTo: item.valid_to,
        autoRenew: item.auto_renew,
        isExpired: item.is_expired || (item.valid_to && item.valid_to <= new Date()),
        note: item.note,
        createdAt: item.created_at,
      })),
      meta: {
        pagination: this.databaseService.calculatePaginationMeta(total, page, pageSize),
        summary: {
          activeCount: allActive,
          expiredCount: allExpired,
          totalCount: allActive + allExpired,
        },
      },
    };
  }

  /**
   * Add membership record
   */
  async create(
    customerId: string,
    talentId: string,
    dto: CreateMembershipDto,
    context: RequestContext,
  ) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Verify access with tenant context
    await this.verifyCustomerAccess(customerId, talentId, context);

    // Get platform using raw SQL
    const platforms = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      display_name: string;
    }>>(`
      SELECT id, code, display_name
      FROM "${schema}".social_platform
      WHERE code = $1 AND is_active = true
    `, dto.platformCode);

    if (!platforms.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Platform not found',
      });
    }
    const platform = platforms[0];

    // Get membership level with class and type using raw SQL
    const membershipLevels = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      name_en: string;
      membership_type_id: string;
      membership_class_id: string;
    }>>(`
      SELECT 
        ml.id,
        ml.code,
        ml.name_en,
        ml.membership_type_id,
        mt.membership_class_id
      FROM "${schema}".membership_level ml
      JOIN "${schema}".membership_type mt ON mt.id = ml.membership_type_id
      WHERE ml.code = $1 AND ml.is_active = true
    `, dto.membershipLevelCode);

    if (!membershipLevels.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Membership level not found',
      });
    }
    const membershipLevel = membershipLevels[0];

    // Create record using raw SQL
    const validFrom = new Date(dto.validFrom);
    const validTo = dto.validTo ? new Date(dto.validTo) : null;
    const autoRenew = dto.autoRenew ?? false;

    const newRecords = await prisma.$queryRawUnsafe<Array<{
      id: string;
      valid_from: Date;
      valid_to: Date | null;
      auto_renew: boolean;
      created_at: Date;
    }>>(`
      INSERT INTO "${schema}".membership_record (
        id, customer_id, platform_id, membership_class_id, membership_type_id, membership_level_id,
        valid_from, valid_to, auto_renew, note, created_by, updated_by, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid,
        $6::timestamptz, $7::timestamptz, $8, $9, $10::uuid, $10::uuid, NOW(), NOW()
      )
      RETURNING id, valid_from, valid_to, auto_renew, created_at
    `,
      customerId,
      platform.id,
      membershipLevel.membership_class_id,
      membershipLevel.membership_type_id,
      membershipLevel.id,
      validFrom,
      validTo,
      autoRenew,
      dto.note || null,
      context.userId,
    );

    const newRecord = newRecords[0];

    // Record change log using raw SQL
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".change_log (
        id, action, object_type, object_id, object_name, diff, operator_id, ip_address, occurred_at
      ) VALUES (
        gen_random_uuid(), 'create', 'membership_record', $1::uuid, $2, $3::jsonb, $4::uuid, $5::inet, NOW()
      )
    `,
      newRecord.id,
      `${platform.code}:${membershipLevel.code}`,
      JSON.stringify({
        new: {
          platformCode: platform.code,
          membershipLevelCode: membershipLevel.code,
          validFrom: dto.validFrom,
          validTo: dto.validTo,
        },
      }),
      context.userId,
      context.ipAddress || '0.0.0.0',
    );

    return {
      id: newRecord.id,
      platform: {
        code: platform.code,
        name: platform.display_name,
      },
      membershipLevel: {
        code: membershipLevel.code,
        name: membershipLevel.name_en,
      },
      validFrom: newRecord.valid_from,
      validTo: newRecord.valid_to,
      autoRenew: newRecord.auto_renew,
      createdAt: newRecord.created_at,
    };
  }

  /**
   * Update membership record
   */
  async update(
    customerId: string,
    recordId: string,
    talentId: string,
    dto: UpdateMembershipDto,
    context: RequestContext,
  ) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Verify access with tenant context
    await this.verifyCustomerAccess(customerId, talentId, context);

    // Get record using raw SQL
    const records = await prisma.$queryRawUnsafe<Array<{
      id: string;
      valid_to: Date | null;
      auto_renew: boolean;
      note: string | null;
      platform_code: string;
      level_code: string;
    }>>(`
      SELECT 
        mr.id,
        mr.valid_to,
        mr.auto_renew,
        mr.note,
        sp.code as platform_code,
        ml.code as level_code
      FROM "${schema}".membership_record mr
      JOIN "${schema}".social_platform sp ON sp.id = mr.platform_id
      JOIN "${schema}".membership_level ml ON ml.id = mr.membership_level_id
      WHERE mr.id = $1::uuid AND mr.customer_id = $2::uuid
    `, recordId, customerId);

    if (!records.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Membership record not found',
      });
    }
    const record = records[0];

    // Build update fields
    const newValidTo = dto.validTo !== undefined
      ? (dto.validTo ? new Date(dto.validTo) : null)
      : record.valid_to;
    const newAutoRenew = dto.autoRenew ?? record.auto_renew;
    const newNote = dto.note ?? record.note;

    // Update using raw SQL
    const updatedRecords = await prisma.$queryRawUnsafe<Array<{
      id: string;
      valid_to: Date | null;
      auto_renew: boolean;
      note: string | null;
      updated_at: Date;
    }>>(`
      UPDATE "${schema}".membership_record
      SET valid_to = $1::timestamptz, auto_renew = $2, note = $3, updated_by = $4::uuid, updated_at = NOW()
      WHERE id = $5::uuid
      RETURNING id, valid_to, auto_renew, note, updated_at
    `, newValidTo, newAutoRenew, newNote, context.userId, recordId);

    const updated = updatedRecords[0];

    // Record change log using raw SQL
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".change_log (
        id, action, object_type, object_id, object_name, diff, operator_id, ip_address, occurred_at
      ) VALUES (
        gen_random_uuid(), 'update', 'membership_record', $1::uuid, $2, $3::jsonb, $4::uuid, $5::inet, NOW()
      )
    `,
      recordId,
      `${record.platform_code}:${record.level_code}`,
      JSON.stringify({
        old: {
          validTo: record.valid_to,
          autoRenew: record.auto_renew,
          note: record.note,
        },
        new: {
          validTo: updated.valid_to,
          autoRenew: updated.auto_renew,
          note: updated.note,
        },
      }),
      context.userId,
      context.ipAddress || '0.0.0.0',
    );

    return {
      id: updated.id,
      validTo: updated.valid_to,
      autoRenew: updated.auto_renew,
      note: updated.note,
      updatedAt: updated.updated_at,
    };
  }

  /**
   * Get membership summary for a customer (multi-tenant aware)
   */
  async getSummary(customerId: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Get highest level active membership using raw SQL
    const highestActiveResults = await prisma.$queryRawUnsafe<Array<{
      platform_code: string;
      platform_display_name: string;
      level_code: string;
      level_name_en: string;
      level_color: string | null;
    }>>(`
      SELECT 
        sp.code as platform_code,
        sp.display_name as platform_display_name,
        ml.code as level_code,
        ml.name_en as level_name_en,
        ml.color as level_color
      FROM "${schema}".membership_record mr
      JOIN "${schema}".social_platform sp ON sp.id = mr.platform_id
      JOIN "${schema}".membership_level ml ON ml.id = mr.membership_level_id
      WHERE mr.customer_id = $1::uuid
        AND mr.is_expired = false
        AND (mr.valid_to IS NULL OR mr.valid_to > NOW())
      ORDER BY ml.rank DESC
      LIMIT 1
    `, customerId);

    // Count active and total using raw SQL
    const [activeCountResult, totalCountResult] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*) as count
        FROM "${schema}".membership_record
        WHERE customer_id = $1::uuid
          AND is_expired = false
          AND (valid_to IS NULL OR valid_to > NOW())
      `, customerId),
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*) as count
        FROM "${schema}".membership_record
        WHERE customer_id = $1::uuid
      `, customerId),
    ]);

    const activeCount = Number(activeCountResult[0]?.count || 0);
    const totalCount = Number(totalCountResult[0]?.count || 0);

    if (!highestActiveResults.length) {
      return null;
    }

    const highestActive = highestActiveResults[0];
    return {
      highestLevel: {
        platformCode: highestActive.platform_code,
        platformName: highestActive.platform_display_name,
        levelCode: highestActive.level_code,
        levelName: highestActive.level_name_en,
        color: highestActive.level_color,
      },
      activeCount,
      totalCount,
    };
  }

  /**
   * Verify talent has access to customer (multi-tenant aware)
   */
  private async verifyCustomerAccess(customerId: string, talentId: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Find talent and get profile store ID
    const talents = await prisma.$queryRawUnsafe<Array<{
      id: string;
      profile_store_id: string | null;
    }>>(`
      SELECT id, profile_store_id FROM "${schema}".talent WHERE id = $1::uuid
    `, talentId);

    const talent = talents[0];
    if (!talent || !talent.profile_store_id) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Customer not found',
      });
    }

    // Find customer in the tenant schema
    const customers = await prisma.$queryRawUnsafe<Array<{
      id: string;
      profile_store_id: string;
      nickname: string;
    }>>(`
      SELECT id, profile_store_id, nickname
      FROM "${schema}".customer_profile
      WHERE id = $1::uuid AND profile_store_id = $2::uuid
    `, customerId, talent.profile_store_id);

    if (!customers.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Customer not found',
      });
    }

    return {
      id: customers[0].id,
      profileStoreId: customers[0].profile_store_id,
      nickname: customers[0].nickname,
    };
  }
}
