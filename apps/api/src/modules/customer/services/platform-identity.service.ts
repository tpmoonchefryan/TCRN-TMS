// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { ChangeLogService } from '../../log';
import {
  CreatePlatformIdentityDto,
  UpdatePlatformIdentityDto,
  PlatformIdentityHistoryQueryDto,
} from '../dto/customer.dto';

/**
 * Platform Identity Service
 * Manages customer platform identities with automatic history tracking
 */
@Injectable()
export class PlatformIdentityService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly changeLogService: ChangeLogService,
  ) {}

  /**
   * Get platform identities for a customer (multi-tenant aware)
   */
  async findByCustomer(customerId: string, talentId: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Verify access with tenant context
    await this.verifyCustomerAccess(customerId, talentId, context);

    // Query identities using raw SQL for multi-tenancy
    const identities = await prisma.$queryRawUnsafe<Array<{
      id: string;
      platform_id: string;
      platform_code: string;
      platform_display_name: string;
      platform_icon_url: string | null;
      platform_color: string | null;
      platform_uid: string;
      platform_nickname: string | null;
      platform_avatar_url: string | null;
      profile_url: string | null;
      is_verified: boolean;
      is_current: boolean;
      captured_at: Date;
      updated_at: Date;
    }>>(`
      SELECT 
        pi.id,
        pi.platform_id,
        sp.code as platform_code,
        sp.display_name as platform_display_name,
        sp.icon_url as platform_icon_url,
        sp.color as platform_color,
        pi.platform_uid,
        pi.platform_nickname,
        pi.platform_avatar_url,
        pi.profile_url,
        pi.is_verified,
        pi.is_current,
        pi.captured_at,
        pi.updated_at
      FROM "${schema}".platform_identity pi
      JOIN "${schema}".social_platform sp ON sp.id = pi.platform_id
      WHERE pi.customer_id = $1::uuid
      ORDER BY pi.is_current DESC, pi.captured_at DESC
    `, customerId);

    return identities.map((identity) => ({
      id: identity.id,
      platform: {
        id: identity.platform_id,
        code: identity.platform_code,
        name: identity.platform_display_name,
        iconUrl: identity.platform_icon_url,
        color: identity.platform_color,
      },
      platformUid: identity.platform_uid,
      platformNickname: identity.platform_nickname,
      platformAvatarUrl: identity.platform_avatar_url,
      profileUrl: identity.profile_url,
      isVerified: identity.is_verified,
      isCurrent: identity.is_current,
      capturedAt: identity.captured_at,
      updatedAt: identity.updated_at,
    }));
  }

  /**
   * Add platform identity
   */
  async create(
    customerId: string,
    talentId: string,
    dto: CreatePlatformIdentityDto,
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
      profile_url_template: string | null;
    }>>(`
      SELECT id, code, display_name, profile_url_template
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

    // Check for duplicate using raw SQL
    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM "${schema}".platform_identity
      WHERE customer_id = $1::uuid AND platform_id = $2::uuid AND platform_uid = $3
    `, customerId, platform.id, dto.platformUid);

    if (existing.length) {
      throw new ConflictException({
        code: ErrorCodes.RES_ALREADY_EXISTS,
        message: 'Platform identity already exists',
      });
    }

    // Generate profile URL
    const profileUrl = platform.profile_url_template
      ? platform.profile_url_template.replace('{uid}', dto.platformUid)
      : null;

    // Create identity using raw SQL
    const newIdentities = await prisma.$queryRawUnsafe<Array<{
      id: string;
      platform_uid: string;
      platform_nickname: string | null;
      profile_url: string | null;
      is_verified: boolean;
      is_current: boolean;
      captured_at: Date;
    }>>(`
      INSERT INTO "${schema}".platform_identity (
        id, customer_id, platform_id, platform_uid, platform_nickname, platform_avatar_url,
        profile_url, is_verified, is_current, captured_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5, $6, $7, true, NOW(), NOW()
      )
      RETURNING id, platform_uid, platform_nickname, profile_url, is_verified, is_current, captured_at
    `,
      customerId,
      platform.id,
      dto.platformUid,
      dto.platformNickname || null,
      dto.platformAvatarUrl || null,
      profileUrl,
      dto.isVerified ?? false,
    );

    const newIdentity = newIdentities[0];

    // Record history using raw SQL
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".platform_identity_history (
        id, identity_id, customer_id, change_type, new_value, captured_by, captured_at
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2::uuid, 'created', $3, $4::uuid, NOW()
      )
    `, newIdentity.id, customerId, dto.platformUid, context.userId);

    // Record change log using raw SQL
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".change_log (
        id, action, object_type, object_id, object_name, diff, operator_id, ip_address, occurred_at
      ) VALUES (
        gen_random_uuid(), 'create', 'platform_identity', $1::uuid, $2, $3::jsonb, $4::uuid, $5::inet, NOW()
      )
    `,
      newIdentity.id,
      `${platform.code}:${dto.platformUid}`,
      JSON.stringify({
        new: {
          platformCode: platform.code,
          platformUid: dto.platformUid,
          platformNickname: dto.platformNickname,
        },
      }),
      context.userId,
      context.ipAddress || '0.0.0.0',
    );

    return {
      id: newIdentity.id,
      platform: {
        id: platform.id,
        code: platform.code,
        name: platform.display_name,
      },
      platformUid: newIdentity.platform_uid,
      platformNickname: newIdentity.platform_nickname,
      profileUrl: newIdentity.profile_url,
      isVerified: newIdentity.is_verified,
      isCurrent: newIdentity.is_current,
      capturedAt: newIdentity.captured_at,
    };
  }

  /**
   * Update platform identity
   */
  async update(
    customerId: string,
    identityId: string,
    talentId: string,
    dto: UpdatePlatformIdentityDto,
    context: RequestContext,
  ) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Verify access with tenant context
    await this.verifyCustomerAccess(customerId, talentId, context);

    // Get identity using raw SQL
    const identities = await prisma.$queryRawUnsafe<Array<{
      id: string;
      platform_id: string;
      platform_code: string;
      profile_url_template: string | null;
      platform_uid: string;
      platform_nickname: string | null;
      platform_avatar_url: string | null;
      profile_url: string | null;
      is_verified: boolean;
      is_current: boolean;
    }>>(`
      SELECT 
        pi.id,
        pi.platform_id,
        sp.code as platform_code,
        sp.profile_url_template,
        pi.platform_uid,
        pi.platform_nickname,
        pi.platform_avatar_url,
        pi.profile_url,
        pi.is_verified,
        pi.is_current
      FROM "${schema}".platform_identity pi
      JOIN "${schema}".social_platform sp ON sp.id = pi.platform_id
      WHERE pi.id = $1::uuid AND pi.customer_id = $2::uuid
    `, identityId, customerId);

    if (!identities.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Platform identity not found',
      });
    }
    const identity = identities[0];

    // Track changes for history
    const changes: Array<{ type: string; oldValue: string | null; newValue: string | null }> = [];

    if (dto.platformUid && dto.platformUid !== identity.platform_uid) {
      changes.push({
        type: 'uid_changed',
        oldValue: identity.platform_uid,
        newValue: dto.platformUid,
      });
    }

    if (dto.platformNickname !== undefined && dto.platformNickname !== identity.platform_nickname) {
      changes.push({
        type: 'nickname_changed',
        oldValue: identity.platform_nickname,
        newValue: dto.platformNickname ?? null,
      });
    }

    if (dto.isCurrent === false && identity.is_current === true) {
      changes.push({
        type: 'deactivated',
        oldValue: 'current',
        newValue: 'not_current',
      });
    }

    // Generate new profile URL if UID changed
    let profileUrl = identity.profile_url;
    if (dto.platformUid && identity.profile_url_template) {
      profileUrl = identity.profile_url_template.replace('{uid}', dto.platformUid);
    }

    // Build update values
    const newPlatformUid = dto.platformUid ?? identity.platform_uid;
    const newPlatformNickname = dto.platformNickname ?? identity.platform_nickname;
    const newPlatformAvatarUrl = dto.platformAvatarUrl ?? identity.platform_avatar_url;
    const newIsVerified = dto.isVerified ?? identity.is_verified;
    const newIsCurrent = dto.isCurrent ?? identity.is_current;

    // Update identity using raw SQL
    const updatedIdentities = await prisma.$queryRawUnsafe<Array<{
      id: string;
      platform_uid: string;
      platform_nickname: string | null;
      profile_url: string | null;
      is_verified: boolean;
      is_current: boolean;
      updated_at: Date;
    }>>(`
      UPDATE "${schema}".platform_identity
      SET platform_uid = $1, platform_nickname = $2, platform_avatar_url = $3,
          profile_url = $4, is_verified = $5, is_current = $6, updated_at = NOW()
      WHERE id = $7::uuid
      RETURNING id, platform_uid, platform_nickname, profile_url, is_verified, is_current, updated_at
    `,
      newPlatformUid,
      newPlatformNickname,
      newPlatformAvatarUrl,
      profileUrl,
      newIsVerified,
      newIsCurrent,
      identityId,
    );

    const updated = updatedIdentities[0];

    // Record history for each change using raw SQL
    for (const change of changes) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${schema}".platform_identity_history (
          id, identity_id, customer_id, change_type, old_value, new_value, captured_by, captured_at
        ) VALUES (
          gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5, $6::uuid, NOW()
        )
      `, identityId, customerId, change.type, change.oldValue, change.newValue, context.userId);
    }

    // Record change log using raw SQL
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".change_log (
        id, action, object_type, object_id, object_name, diff, operator_id, ip_address, occurred_at
      ) VALUES (
        gen_random_uuid(), 'update', 'platform_identity', $1::uuid, $2, $3::jsonb, $4::uuid, $5::inet, NOW()
      )
    `,
      identityId,
      `${identity.platform_code}:${updated.platform_uid}`,
      JSON.stringify({
        old: {
          platformUid: identity.platform_uid,
          platformNickname: identity.platform_nickname,
          isCurrent: identity.is_current,
        },
        new: {
          platformUid: updated.platform_uid,
          platformNickname: updated.platform_nickname,
          isCurrent: updated.is_current,
        },
      }),
      context.userId,
      context.ipAddress || '0.0.0.0',
    );

    return {
      id: updated.id,
      platformUid: updated.platform_uid,
      platformNickname: updated.platform_nickname,
      profileUrl: updated.profile_url,
      isVerified: updated.is_verified,
      isCurrent: updated.is_current,
      updatedAt: updated.updated_at,
    };
  }

  /**
   * Get platform identity history (multi-tenant aware)
   */
  async getHistory(
    customerId: string,
    talentId: string,
    query: PlatformIdentityHistoryQueryDto,
    context: RequestContext,
  ) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Verify access with tenant context
    await this.verifyCustomerAccess(customerId, talentId, context);

    const { platformCode, changeType, page = 1, pageSize = 20 } = query;
    const pagination = this.databaseService.buildPagination(page, pageSize);

    // Build dynamic SQL query with filters
    let whereClause = 'pih.customer_id = $1::uuid';
    const params: any[] = [customerId];
    let paramIndex = 2;

    if (changeType) {
      whereClause += ` AND pih.change_type = $${paramIndex}`;
      params.push(changeType);
      paramIndex++;
    }

    if (platformCode) {
      whereClause += ` AND sp.code = $${paramIndex}`;
      params.push(platformCode);
      paramIndex++;
    }

    // Query history using raw SQL
    const [items, countResult] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{
        id: string;
        identity_id: string;
        platform_code: string;
        platform_display_name: string;
        change_type: string;
        old_value: string | null;
        new_value: string | null;
        captured_at: Date;
        captured_by: string | null;
      }>>(`
        SELECT 
          pih.id,
          pih.identity_id,
          sp.code as platform_code,
          sp.display_name as platform_display_name,
          pih.change_type,
          pih.old_value,
          pih.new_value,
          pih.captured_at,
          pih.captured_by
        FROM "${schema}".platform_identity_history pih
        JOIN "${schema}".platform_identity pi ON pi.id = pih.identity_id
        JOIN "${schema}".social_platform sp ON sp.id = pi.platform_id
        WHERE ${whereClause}
        ORDER BY pih.captured_at DESC
        LIMIT ${pagination.take} OFFSET ${pagination.skip}
      `, ...params),
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*) as count
        FROM "${schema}".platform_identity_history pih
        JOIN "${schema}".platform_identity pi ON pi.id = pih.identity_id
        JOIN "${schema}".social_platform sp ON sp.id = pi.platform_id
        WHERE ${whereClause}
      `, ...params),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return {
      items: items.map((item) => ({
        id: item.id,
        identityId: item.identity_id,
        platform: {
          code: item.platform_code,
          name: item.platform_display_name,
        },
        changeType: item.change_type,
        oldValue: item.old_value,
        newValue: item.new_value,
        capturedAt: item.captured_at,
        capturedBy: item.captured_by,
      })),
      meta: {
        pagination: this.databaseService.calculatePaginationMeta(total, page, pageSize),
      },
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
