// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { ChangeLogService, TechEventLogService } from '../../log';
import {
    CustomerAction,
    CustomerListQueryDto,
    ProfileType,
} from '../dto/customer.dto';

/**
 * Customer Profile Service
 * Base service for customer profile operations
 */
@Injectable()
export class CustomerProfileService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly changeLogService: ChangeLogService,
    private readonly techEventLogService: TechEventLogService,
  ) {}

  /**
   * Get customer profiles list with filters
   * v0.18: Filtered by Profile Store (not just Talent)
   * v0.19: Fixed multi-tenant query to use tenant schema
   */
  async findMany(query: CustomerListQueryDto, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;
    const {
      talentId,
      profileType,
      statusId,
      isActive,
      search,
      tags,
      hasMembership,
      createdFrom,
      createdTo,
      sort = 'createdAt',
      order = 'desc',
      page = 1,
      pageSize = 20,
    } = query;

    // Get the talent's profile store to determine visibility scope
    const talents = await prisma.$queryRawUnsafe<Array<{
      id: string;
      profileStoreId: string | null;
    }>>(`
      SELECT id, profile_store_id as "profileStoreId"
      FROM "${schema}".talent
      WHERE id = $1::uuid
    `, talentId);

    const talent = talents[0];

    if (!talent) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    if (!talent.profileStoreId) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Talent has no profile store configured',
      });
    }

    // Build WHERE conditions for multi-tenant raw SQL query
    const conditions: string[] = ['cp.profile_store_id = $1::uuid'];
    const params: unknown[] = [talent.profileStoreId];
    let paramIndex = 2;

    if (profileType) {
      conditions.push(`cp.profile_type = $${paramIndex}`);
      params.push(profileType);
      paramIndex++;
    }

    if (statusId) {
      conditions.push(`cp.status_id = $${paramIndex}::uuid`);
      params.push(statusId);
      paramIndex++;
    }

    if (isActive !== undefined) {
      conditions.push(`cp.is_active = $${paramIndex}`);
      params.push(isActive);
      paramIndex++;
    }

    if (tags && tags.length > 0) {
      conditions.push(`cp.tags @> $${paramIndex}::text[]`);
      params.push(tags);
      paramIndex++;
    }

    if (createdFrom) {
      conditions.push(`cp.created_at >= $${paramIndex}::timestamptz`);
      params.push(createdFrom);
      paramIndex++;
    }

    if (createdTo) {
      conditions.push(`cp.created_at <= $${paramIndex}::timestamptz`);
      params.push(createdTo);
      paramIndex++;
    }

    // Search across multiple fields
    if (search) {
      conditions.push(`(
        cp.nickname ILIKE $${paramIndex} OR
        $${paramIndex + 1} = ANY(cp.tags) OR
        cci.company_legal_name ILIKE $${paramIndex} OR
        cci.company_short_name ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      params.push(search);
      paramIndex += 2;
    }

    const whereClause = conditions.join(' AND ');

    // Build ORDER BY
    let orderByField = 'cp.created_at';
    if (sort === 'updatedAt') orderByField = 'cp.updated_at';
    else if (sort === 'nickname') orderByField = 'cp.nickname';
    const orderDirection = order === 'asc' ? 'ASC' : 'DESC';

    // Calculate pagination
    const pagination = this.databaseService.buildPagination(page, pageSize);

    // Execute multi-tenant query with proper schema
    const items = await prisma.$queryRawUnsafe<Array<{
      id: string;
      profile_type: string;
      nickname: string;
      primary_language: string | null;
      tags: string[];
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
      status_id: string | null;
      status_code: string | null;
      status_name: string | null;
      status_color: string | null;
      company_short_name: string | null;
      origin_talent_id: string | null;
      origin_talent_display_name: string | null;
      membership_count: bigint;
    }>>(`
      SELECT 
        cp.id,
        cp.profile_type,
        cp.nickname,
        cp.primary_language,
        cp.tags,
        cp.is_active,
        cp.created_at,
        cp.updated_at,
        cs.id as status_id,
        cs.code as status_code,
        cs.name_en as status_name,
        cs.color as status_color,
        cci.company_short_name,
        ot.id as origin_talent_id,
        ot.display_name as origin_talent_display_name,
        (SELECT COUNT(*) FROM "${schema}".membership_record mr WHERE mr.customer_id = cp.id) as membership_count
      FROM "${schema}".customer_profile cp
      LEFT JOIN "${schema}".customer_status cs ON cs.id = cp.status_id
      LEFT JOIN "${schema}".customer_company_info cci ON cci.customer_id = cp.id
      LEFT JOIN "${schema}".talent ot ON ot.id = cp.origin_talent_id
      WHERE ${whereClause}
      ORDER BY ${orderByField} ${orderDirection}
      LIMIT ${pagination.take} OFFSET ${pagination.skip}
    `, ...params);

    // Get total count
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count
      FROM "${schema}".customer_profile cp
      LEFT JOIN "${schema}".customer_company_info cci ON cci.customer_id = cp.id
      WHERE ${whereClause}
    `, ...params);
    const total = Number(countResult[0]?.count ?? 0);

    // Get active membership info for each customer if needed
    const customerIds = items.map(item => item.id);
    let membershipMap = new Map<string, {
      platformCode: string;
      platformName: string;
      levelCode: string;
      levelName: string;
      color: string | null;
    }>();

    if (customerIds.length > 0) {
      const memberships = await prisma.$queryRawUnsafe<Array<{
        customer_id: string;
        platform_code: string;
        platform_name: string;
        level_code: string;
        level_name: string;
        level_color: string | null;
        rank: number;
      }>>(`
        SELECT DISTINCT ON (mr.customer_id)
          mr.customer_id,
          p.code as platform_code,
          p.display_name as platform_name,
          ml.code as level_code,
          ml.name_en as level_name,
          ml.color as level_color,
          ml.rank
        FROM "${schema}".membership_record mr
        JOIN "${schema}".social_platform p ON p.id = mr.platform_id
        JOIN "${schema}".membership_level ml ON ml.id = mr.membership_level_id
        WHERE mr.customer_id = ANY($1::uuid[])
          AND mr.is_expired = false
          AND (mr.valid_to IS NULL OR mr.valid_to > NOW())
        ORDER BY mr.customer_id, ml.rank DESC
      `, customerIds);

      membershipMap = new Map(memberships.map(m => [m.customer_id, {
        platformCode: m.platform_code,
        platformName: m.platform_name,
        levelCode: m.level_code,
        levelName: m.level_name,
        color: m.level_color,
      }]));
    }

    // Filter by membership if needed
    let filteredItems = items;
    if (hasMembership !== undefined) {
      filteredItems = items.filter((item) => {
        const hasActive = membershipMap.has(item.id);
        return hasMembership ? hasActive : !hasActive;
      });
    }

    // Format response
    const formattedItems = filteredItems.map((item) => {
      const highestMembership = membershipMap.get(item.id);
      return {
        id: item.id,
        profileType: item.profile_type,
        nickname: item.nickname,
        primaryLanguage: item.primary_language,
        status: item.status_id ? {
          id: item.status_id,
          code: item.status_code,
          name: item.status_name,
          color: item.status_color,
        } : null,
        tags: item.tags || [],
        isActive: item.is_active,
        companyShortName: item.company_short_name ?? null,
        originTalent: item.origin_talent_id ? {
          id: item.origin_talent_id,
          displayName: item.origin_talent_display_name,
        } : null,
        membershipSummary: highestMembership ? {
          highestLevel: {
            platformCode: highestMembership.platformCode,
            platformName: highestMembership.platformName,
            levelCode: highestMembership.levelCode,
            levelName: highestMembership.levelName,
            color: highestMembership.color,
          },
          activeCount: 1,
          totalCount: Number(item.membership_count),
        } : null,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    });

    return {
      items: formattedItems,
      meta: {
        pagination: {
          page,
          pageSize,
          totalCount: total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    };
  }

  /**
   * Get customer profile by ID
   * v0.19: Fixed multi-tenant query to use tenant schema
   */
  async findById(id: string, talentId: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // First verify talent exists and get its profile store
    const talents = await prisma.$queryRawUnsafe<Array<{
      id: string;
      profileStoreId: string | null;
    }>>(`
      SELECT id, profile_store_id as "profileStoreId"
      FROM "${schema}".talent
      WHERE id = $1::uuid
    `, talentId);

    const talent = talents[0];
    if (!talent || !talent.profileStoreId) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Customer not found',
      });
    }

    // Fetch customer with all related data using raw SQL for multi-tenancy
    const customers = await prisma.$queryRawUnsafe<Array<{
      id: string;
      talent_id: string;
      profile_store_id: string;
      origin_talent_id: string;
      last_modified_talent_id: string | null;
      rm_profile_id: string;
      profile_type: string;
      nickname: string;
      primary_language: string | null;
      notes: string | null;
      tags: string[];
      source: string | null;
      is_active: boolean;
      inactivated_at: Date | null;
      created_at: Date;
      updated_at: Date;
      created_by: string | null;
      updated_by: string | null;
      version: number;
      status_id: string | null;
      inactivation_reason_id: string | null;
    }>>(`
      SELECT 
        cp.id,
        cp.talent_id,
        cp.profile_store_id,
        cp.origin_talent_id,
        cp.last_modified_talent_id,
        cp.rm_profile_id,
        cp.profile_type,
        cp.nickname,
        cp.primary_language,
        cp.notes,
        cp.tags,
        cp.source,
        cp.is_active,
        cp.inactivated_at,
        cp.created_at,
        cp.updated_at,
        cp.created_by,
        cp.updated_by,
        cp.version,
        cp.status_id,
        cp.inactivation_reason_id
      FROM "${schema}".customer_profile cp
      WHERE cp.id = $1::uuid AND cp.profile_store_id = $2::uuid
    `, id, talent.profileStoreId);

    if (!customers.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Customer not found',
      });
    }

    const customer = customers[0];

    // Fetch related data in parallel
    const [
      talentData,
      profileStoreData,
      originTalentData,
      lastModifiedTalentData,
      statusData,
      inactivationReasonData,
      companyInfoData,
      membershipData,
      identityCount,
      membershipCount,
      accessLogs,
    ] = await Promise.all([
      // Talent
      prisma.$queryRawUnsafe<Array<{ id: string; code: string; display_name: string }>>(`
        SELECT id, code, display_name FROM "${schema}".talent WHERE id = $1::uuid
      `, customer.talent_id),
      // Profile store
      prisma.$queryRawUnsafe<Array<{ id: string; code: string; name_en: string }>>(`
        SELECT id, code, name_en FROM "${schema}".profile_store WHERE id = $1::uuid
      `, customer.profile_store_id),
      // Origin talent
      prisma.$queryRawUnsafe<Array<{ id: string; code: string; display_name: string }>>(`
        SELECT id, code, display_name FROM "${schema}".talent WHERE id = $1::uuid
      `, customer.origin_talent_id),
      // Last modified talent
      customer.last_modified_talent_id
        ? prisma.$queryRawUnsafe<Array<{ id: string; code: string; display_name: string }>>(`
            SELECT id, code, display_name FROM "${schema}".talent WHERE id = $1::uuid
          `, customer.last_modified_talent_id)
        : Promise.resolve([]),
      // Status
      customer.status_id
        ? prisma.$queryRawUnsafe<Array<{ id: string; code: string; name_en: string; color: string | null }>>(`
            SELECT id, code, name_en, color FROM "${schema}".customer_status WHERE id = $1::uuid
          `, customer.status_id)
        : Promise.resolve([]),
      // Inactivation reason
      customer.inactivation_reason_id
        ? prisma.$queryRawUnsafe<Array<{ id: string; code: string; name_en: string }>>(`
            SELECT id, code, name_en FROM "${schema}".inactivation_reason WHERE id = $1::uuid
          `, customer.inactivation_reason_id)
        : Promise.resolve([]),
      // Company info (if company profile)
      customer.profile_type === 'company'
        ? prisma.$queryRawUnsafe<Array<{
            company_legal_name: string;
            company_short_name: string | null;
            registration_number: string | null;
            vat_id: string | null;
            establishment_date: Date | null;
            website: string | null;
            business_segment_id: string | null;
            bs_id: string | null;
            bs_code: string | null;
            bs_name_en: string | null;
          }>>(`
            SELECT 
              cci.company_legal_name,
              cci.company_short_name,
              cci.registration_number,
              cci.vat_id,
              cci.establishment_date,
              cci.website,
              cci.business_segment_id,
              bs.id as bs_id,
              bs.code as bs_code,
              bs.name_en as bs_name_en
            FROM "${schema}".customer_company_info cci
            LEFT JOIN "${schema}".business_segment bs ON bs.id = cci.business_segment_id
            WHERE cci.customer_id = $1::uuid
          `, customer.id)
        : Promise.resolve([]),
      // Highest membership
      prisma.$queryRawUnsafe<Array<{
        platform_code: string;
        platform_name_en: string;
        level_code: string;
        level_name_en: string;
        level_color: string | null;
      }>>(`
        SELECT 
          sp.code as platform_code,
          sp.name_en as platform_name_en,
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
      `, customer.id),
      // Identity count
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*) as count FROM "${schema}".platform_identity WHERE customer_id = $1::uuid
      `, customer.id),
      // Membership count
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*) as count FROM "${schema}".membership_record WHERE customer_id = $1::uuid
      `, customer.id),
      // Access logs (last 5)
      prisma.$queryRawUnsafe<Array<{
        action: string;
        occurred_at: Date;
        talent_id: string;
        talent_display_name: string;
        operator_id: string | null;
        operator_username: string | null;
      }>>(`
        SELECT 
          cal.action,
          cal.occurred_at,
          cal.talent_id,
          t.display_name as talent_display_name,
          cal.operator_id,
          su.username as operator_username
        FROM "${schema}".customer_access_log cal
        JOIN "${schema}".talent t ON t.id = cal.talent_id
        LEFT JOIN "${schema}".system_user su ON su.id = cal.operator_id
        WHERE cal.customer_id = $1::uuid
        ORDER BY cal.occurred_at DESC
        LIMIT 5
      `, customer.id),
    ]);

    // Build formatted result
    const formatted = {
      id: customer.id,
      talentId: customer.talent_id,
      profileStoreId: customer.profile_store_id,
      originTalentId: customer.origin_talent_id,
      lastModifiedTalentId: customer.last_modified_talent_id,
      rmProfileId: customer.rm_profile_id,
      profileType: customer.profile_type,
      nickname: customer.nickname,
      primaryLanguage: customer.primary_language,
      notes: customer.notes,
      tags: customer.tags,
      source: customer.source,
      isActive: customer.is_active,
      inactivatedAt: customer.inactivated_at,
      createdAt: customer.created_at,
      updatedAt: customer.updated_at,
      createdBy: customer.created_by,
      updatedBy: customer.updated_by,
      version: customer.version,
      talent: talentData[0] ? {
        id: talentData[0].id,
        code: talentData[0].code,
        displayName: talentData[0].display_name,
      } : { id: customer.talent_id, code: '', displayName: '' },
      profileStore: profileStoreData[0] ? {
        id: profileStoreData[0].id,
        code: profileStoreData[0].code,
        nameEn: profileStoreData[0].name_en,
      } : { id: customer.profile_store_id, code: '', nameEn: '' },
      originTalent: originTalentData[0] ? {
        id: originTalentData[0].id,
        code: originTalentData[0].code,
        displayName: originTalentData[0].display_name,
      } : { id: customer.origin_talent_id, code: '', displayName: '' },
      lastModifiedTalent: lastModifiedTalentData[0] ? {
        id: lastModifiedTalentData[0].id,
        code: lastModifiedTalentData[0].code,
        displayName: lastModifiedTalentData[0].display_name,
      } : null,
      status: statusData[0] ? {
        id: statusData[0].id,
        code: statusData[0].code,
        nameEn: statusData[0].name_en,
        color: statusData[0].color,
      } : null,
      inactivationReason: inactivationReasonData[0] ? {
        id: inactivationReasonData[0].id,
        code: inactivationReasonData[0].code,
        nameEn: inactivationReasonData[0].name_en,
      } : null,
      companyInfo: companyInfoData[0] ? {
        companyLegalName: companyInfoData[0].company_legal_name,
        companyShortName: companyInfoData[0].company_short_name,
        registrationNumber: companyInfoData[0].registration_number,
        vatId: companyInfoData[0].vat_id,
        establishmentDate: companyInfoData[0].establishment_date,
        website: companyInfoData[0].website,
        businessSegment: companyInfoData[0].bs_id ? {
          id: companyInfoData[0].bs_id,
          code: companyInfoData[0].bs_code || '',
          nameEn: companyInfoData[0].bs_name_en || '',
        } : null,
      } : null,
      membershipRecords: membershipData.map(m => ({
        platform: {
          code: m.platform_code,
          displayName: m.platform_name_en,
        },
        membershipLevel: {
          code: m.level_code,
          nameEn: m.level_name_en,
          color: m.level_color,
        },
      })),
      _count: {
        platformIdentities: Number(identityCount[0]?.count || 0),
        membershipRecords: Number(membershipCount[0]?.count || 0),
      },
      accessLogs: accessLogs.map(log => ({
        action: log.action,
        occurredAt: log.occurred_at,
        talent: {
          id: log.talent_id,
          displayName: log.talent_display_name,
        },
        operator: log.operator_id ? {
          id: log.operator_id,
          username: log.operator_username || '',
        } : null,
      })),
    };

    return this.formatDetailItem(formatted);
  }

  /**
   * Deactivate customer (multi-tenant aware)
   */
  async deactivate(
    id: string,
    talentId: string,
    reasonCode: string | undefined,
    version: number,
    context: RequestContext,
  ) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Get current data with tenant context
    const customer = await this.verifyAccess(id, talentId, context);

    // Check version
    if (customer.version !== version) {
      throw new ConflictException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified by another user',
      });
    }

    // Get inactivation reason if provided
    let inactivationReasonId: string | null = null;
    if (reasonCode) {
      const reasons = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM "${schema}".inactivation_reason
        WHERE code = $1 AND is_active = true
        LIMIT 1
      `, reasonCode);
      if (reasons.length > 0) {
        inactivationReasonId = reasons[0].id;
      }
    }

    // Update using raw SQL for multi-tenancy
    const now = new Date();
    await prisma.$executeRawUnsafe(`
      UPDATE "${schema}".customer_profile
      SET is_active = false,
          inactivation_reason_id = $2::uuid,
          inactivated_at = $3,
          last_modified_talent_id = $4::uuid,
          updated_by = $5::uuid,
          version = version + 1,
          updated_at = $3
      WHERE id = $1::uuid
    `, id, inactivationReasonId, now, talentId, context.userId);

    // Record change log
    await this.changeLogService.create(prisma, {
      action: 'deactivate',
      objectType: 'customer_profile',
      objectId: id,
      objectName: customer.nickname,
      oldValue: { isActive: true },
      newValue: { isActive: false, inactivationReasonId },
    }, context);

    // Record access log using raw SQL
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".customer_access_log (
        id, customer_id, profile_store_id, talent_id, action,
        operator_id, operator_name, ip_address, user_agent, request_id, occurred_at
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4,
        $5::uuid, $6, $7::inet, $8, $9, NOW()
      )
    `, id, customer.profileStoreId, talentId, CustomerAction.DEACTIVATE,
       context.userId, context.userName, context.ipAddress || '0.0.0.0', context.userAgent, context.requestId);

    return { id, isActive: false };
  }

  /**
   * Reactivate customer (multi-tenant aware)
   */
  async reactivate(id: string, talentId: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Get current data with tenant context
    const customer = await this.verifyAccess(id, talentId, context);

    // Update using raw SQL for multi-tenancy
    const now = new Date();
    await prisma.$executeRawUnsafe(`
      UPDATE "${schema}".customer_profile
      SET is_active = true,
          inactivation_reason_id = NULL,
          inactivated_at = NULL,
          last_modified_talent_id = $2::uuid,
          updated_by = $3::uuid,
          version = version + 1,
          updated_at = $4
      WHERE id = $1::uuid
    `, id, talentId, context.userId, now);

    // Record change log
    await this.changeLogService.create(prisma, {
      action: 'reactivate',
      objectType: 'customer_profile',
      objectId: id,
      objectName: customer.nickname,
      oldValue: { isActive: false },
      newValue: { isActive: true },
    }, context);

    // Record access log using raw SQL
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".customer_access_log (
        id, customer_id, profile_store_id, talent_id, action,
        operator_id, operator_name, ip_address, user_agent, request_id, occurred_at
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4,
        $5::uuid, $6, $7::inet, $8, $9, NOW()
      )
    `, id, customer.profileStoreId, talentId, CustomerAction.REACTIVATE,
       context.userId, context.userName, context.ipAddress || '0.0.0.0', context.userAgent, context.requestId);

    return { id, isActive: true };
  }

  /**
   * Verify talent has access to customer (multi-tenant aware)
   */
  protected async verifyAccess(customerId: string, talentId: string, context: RequestContext) {
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
      profile_type: string;
      is_active: boolean;
      version: number;
    }>>(`
      SELECT id, profile_store_id, nickname, profile_type, is_active, version
      FROM "${schema}".customer_profile
      WHERE id = $1::uuid AND profile_store_id = $2::uuid
    `, customerId, talent.profile_store_id);

    if (!customers.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Customer not found',
      });
    }

    const customer = customers[0];
    return {
      id: customer.id,
      profileStoreId: customer.profile_store_id,
      nickname: customer.nickname,
      profileType: customer.profile_type,
      isActive: customer.is_active,
      version: customer.version,
    };
  }

  /**
   * Format list item
   */
  private formatListItem(item: {
    id: string;
    profileType: string;
    nickname: string;
    primaryLanguage: string | null;
    tags: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    status: { id: string; code: string; nameEn: string; color: string | null } | null;
    // Note: Individual PII is stored in remote encrypted vault via rmProfileId
    companyInfo: { companyShortName: string | null } | null;
    membershipRecords: Array<{
      platform: { code: string; displayName: string };
      membershipLevel: { code: string; nameEn: string; color: string | null };
    }>;
    _count: { membershipRecords: number };
  }) {
    const highestMembership = item.membershipRecords[0];

    return {
      id: item.id,
      profileType: item.profileType,
      nickname: item.nickname,
      primaryLanguage: item.primaryLanguage,
      status: item.status
        ? {
            id: item.status.id,
            code: item.status.code,
            name: item.status.nameEn,
            color: item.status.color,
          }
        : null,
      tags: item.tags,
      isActive: item.isActive,
      // Note: Individual PII search hints would be fetched from remote PII vault
      // searchHintName and searchHintPhoneLast4 require PII service integration
      companyShortName: item.companyInfo?.companyShortName ?? null,
      membershipSummary: highestMembership
        ? {
            highestLevel: {
              platformCode: highestMembership.platform.code,
              platformName: highestMembership.platform.displayName,
              levelCode: highestMembership.membershipLevel.code,
              levelName: highestMembership.membershipLevel.nameEn,
              color: highestMembership.membershipLevel.color,
            },
            activeCount: item.membershipRecords.length,
            totalCount: item._count.membershipRecords,
          }
        : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Format detail item
   */
  private formatDetailItem(item: {
    id: string;
    talentId: string;
    profileStoreId: string;
    originTalentId: string;
    lastModifiedTalentId: string | null;
    rmProfileId: string;
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
    talent: { id: string; code: string; displayName: string };
    profileStore: { id: string; code: string; nameEn: string };
    originTalent: { id: string; code: string; displayName: string };
    lastModifiedTalent: { id: string; code: string; displayName: string } | null;
    status: { id: string; code: string; nameEn: string; color: string | null } | null;
    inactivationReason: { id: string; code: string; nameEn: string } | null;
    // Note: Individual PII is stored in remote encrypted vault via rmProfileId
    companyInfo: {
      companyLegalName: string;
      companyShortName: string | null;
      registrationNumber: string | null;
      vatId: string | null;
      establishmentDate: Date | null;
      website: string | null;
      businessSegment: { id: string; code: string; nameEn: string } | null;
    } | null;
    membershipRecords: Array<{
      platform: { code: string; displayName: string };
      membershipLevel: { code: string; nameEn: string; color: string | null };
    }>;
    _count: { platformIdentities: number; membershipRecords: number };
    accessLogs: Array<{
      action: string;
      occurredAt: Date;
      talent: { id: string; displayName: string };
      operator: { id: string; username: string } | null;
    }>;
  }) {
    const highestMembership = item.membershipRecords[0];

    const base = {
      id: item.id,
      profileType: item.profileType,
      talentId: item.talentId,
      nickname: item.nickname,
      primaryLanguage: item.primaryLanguage,
      status: item.status
        ? {
            id: item.status.id,
            code: item.status.code,
            name: item.status.nameEn,
            color: item.status.color,
          }
        : null,
      inactivationReason: item.inactivationReason
        ? {
            id: item.inactivationReason.id,
            code: item.inactivationReason.code,
            name: item.inactivationReason.nameEn,
          }
        : null,
      tags: item.tags,
      source: item.source,
      notes: item.notes,
      isActive: item.isActive,
      inactivatedAt: item.inactivatedAt,
      profileStore: {
        id: item.profileStore.id,
        code: item.profileStore.code,
        name: item.profileStore.nameEn,
      },
      originTalent: {
        id: item.originTalent.id,
        code: item.originTalent.code,
        displayName: item.originTalent.displayName,
      },
      lastModifiedTalent: item.lastModifiedTalent
        ? {
            id: item.lastModifiedTalent.id,
            code: item.lastModifiedTalent.code,
            displayName: item.lastModifiedTalent.displayName,
          }
        : null,
      membershipSummary: highestMembership
        ? {
            highestLevel: {
              platformCode: highestMembership.platform.code,
              platformName: highestMembership.platform.displayName,
              levelCode: highestMembership.membershipLevel.code,
              levelName: highestMembership.membershipLevel.nameEn,
              color: highestMembership.membershipLevel.color,
            },
            activeCount: item.membershipRecords.length,
            totalCount: item._count.membershipRecords,
          }
        : null,
      platformIdentityCount: item._count.platformIdentities,
      recentAccessHistory: item.accessLogs.map((log) => ({
        talent: { id: log.talent.id, displayName: log.talent.displayName },
        action: log.action,
        operator: log.operator
          ? { id: log.operator.id, username: log.operator.username }
          : null,
        occurredAt: log.occurredAt,
      })),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      version: item.version,
    };

    // Add profile-type-specific data
    if (item.profileType === ProfileType.INDIVIDUAL) {
      return {
        ...base,
        individual: {
          rmProfileId: item.rmProfileId,
          // Note: PII search hints stored in remote encrypted vault
          // Require separate PII service call to load actual name/phone
          piiLoaded: false, // PII is not loaded by default
        },
      };
    } else if (item.profileType === ProfileType.COMPANY && item.companyInfo) {
      return {
        ...base,
        company: {
          companyLegalName: item.companyInfo.companyLegalName,
          companyShortName: item.companyInfo.companyShortName,
          registrationNumber: item.companyInfo.registrationNumber,
          vatId: item.companyInfo.vatId,
          establishmentDate: item.companyInfo.establishmentDate,
          website: item.companyInfo.website,
          businessSegment: item.companyInfo.businessSegment
            ? {
                id: item.companyInfo.businessSegment.id,
                code: item.companyInfo.businessSegment.code,
                name: item.companyInfo.businessSegment.nameEn,
              }
            : null,
        },
      };
    }

    return base;
  }
}
