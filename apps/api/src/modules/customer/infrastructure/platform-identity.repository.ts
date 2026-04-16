// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';

import type {
  PlatformIdentityAccessRecord,
  PlatformIdentityHistoryRecord,
  PlatformIdentityListRecord,
  PlatformIdentityOwnedRecord,
  PlatformIdentityUpdatedRecord,
} from '../domain/platform-identity.policy';

@Injectable()
export class PlatformIdentityRepository {
  async findAccessRecord(
    tenantSchema: string,
    customerId: string,
    talentId: string,
  ): Promise<PlatformIdentityAccessRecord | null> {
    const customers = await prisma.$queryRawUnsafe<PlatformIdentityAccessRecord[]>(
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
  ): Promise<PlatformIdentityListRecord[]> {
    return prisma.$queryRawUnsafe<PlatformIdentityListRecord[]>(
      `SELECT
         pi.id,
         pi.platform_id as "platformId",
         sp.code as "platformCode",
         sp.display_name as "platformName",
         sp.icon_url as "platformIconUrl",
         sp.color as "platformColor",
         pi.platform_uid as "platformUid",
         pi.platform_nickname as "platformNickname",
         pi.platform_avatar_url as "platformAvatarUrl",
         pi.profile_url as "profileUrl",
         pi.is_verified as "isVerified",
         pi.is_current as "isCurrent",
         pi.captured_at as "capturedAt",
         pi.updated_at as "updatedAt"
       FROM "${tenantSchema}".platform_identity pi
       JOIN "${tenantSchema}".social_platform sp ON sp.id = pi.platform_id
       WHERE pi.customer_id = $1::uuid
       ORDER BY pi.is_current DESC, pi.captured_at DESC`,
      customerId,
    );
  }

  async findActivePlatformByCode(
    tenantSchema: string,
    platformCode: string,
  ): Promise<{
    id: string;
    code: string;
    displayName: string;
    profileUrlTemplate: string | null;
  } | null> {
    const platforms = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      displayName: string;
      profileUrlTemplate: string | null;
    }>>(
      `SELECT
         id,
         code,
         display_name as "displayName",
         profile_url_template as "profileUrlTemplate"
       FROM "${tenantSchema}".social_platform
       WHERE code = $1
         AND is_active = true`,
      platformCode,
    );

    return platforms[0] ?? null;
  }

  async findDuplicateIdentity(
    tenantSchema: string,
    customerId: string,
    platformId: string,
    platformUid: string,
  ): Promise<{ id: string } | null> {
    const identities = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id
       FROM "${tenantSchema}".platform_identity
       WHERE customer_id = $1::uuid
         AND platform_id = $2::uuid
         AND platform_uid = $3`,
      customerId,
      platformId,
      platformUid,
    );

    return identities[0] ?? null;
  }

  async create(
    tenantSchema: string,
    args: {
      customerId: string;
      platformId: string;
      platformUid: string;
      platformNickname?: string | null;
      platformAvatarUrl?: string | null;
      profileUrl: string | null;
      isVerified: boolean;
    },
  ): Promise<{
    id: string;
    platformUid: string;
    platformNickname: string | null;
    profileUrl: string | null;
    isVerified: boolean;
    isCurrent: boolean;
    capturedAt: Date;
  }> {
    const identities = await prisma.$queryRawUnsafe<Array<{
      id: string;
      platformUid: string;
      platformNickname: string | null;
      profileUrl: string | null;
      isVerified: boolean;
      isCurrent: boolean;
      capturedAt: Date;
    }>>(
      `INSERT INTO "${tenantSchema}".platform_identity (
         id, customer_id, platform_id, platform_uid, platform_nickname, platform_avatar_url,
         profile_url, is_verified, is_current, captured_at, updated_at
       ) VALUES (
         gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5, $6, $7, true, NOW(), NOW()
       )
       RETURNING
         id,
         platform_uid as "platformUid",
         platform_nickname as "platformNickname",
         profile_url as "profileUrl",
         is_verified as "isVerified",
         is_current as "isCurrent",
         captured_at as "capturedAt"`,
      args.customerId,
      args.platformId,
      args.platformUid,
      args.platformNickname ?? null,
      args.platformAvatarUrl ?? null,
      args.profileUrl,
      args.isVerified,
    );

    return identities[0];
  }

  insertHistory(
    tenantSchema: string,
    args: {
      identityId: string;
      customerId: string;
      changeType: string;
      oldValue?: string | null;
      newValue?: string | null;
      capturedBy?: string;
    },
  ) {
    return prisma.$executeRawUnsafe(
      `INSERT INTO "${tenantSchema}".platform_identity_history (
         id, identity_id, customer_id, change_type, old_value, new_value, captured_by, captured_at
       ) VALUES (
         gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5, $6::uuid, NOW()
       )`,
      args.identityId,
      args.customerId,
      args.changeType,
      args.oldValue ?? null,
      args.newValue ?? null,
      args.capturedBy ?? null,
    );
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
         gen_random_uuid(), $1, 'platform_identity', $2::uuid, $3, $4::jsonb, $5::uuid, $6::inet, NOW()
       )`,
      args.action,
      args.objectId,
      args.objectName,
      args.diff,
      args.userId,
      args.ipAddress ?? '0.0.0.0',
    );
  }

  async findOwnedIdentity(
    tenantSchema: string,
    customerId: string,
    identityId: string,
  ): Promise<PlatformIdentityOwnedRecord | null> {
    const identities = await prisma.$queryRawUnsafe<PlatformIdentityOwnedRecord[]>(
      `SELECT
         pi.id,
         pi.platform_id as "platformId",
         sp.code as "platformCode",
         sp.profile_url_template as "profileUrlTemplate",
         pi.platform_uid as "platformUid",
         pi.platform_nickname as "platformNickname",
         pi.platform_avatar_url as "platformAvatarUrl",
         pi.profile_url as "profileUrl",
         pi.is_verified as "isVerified",
         pi.is_current as "isCurrent"
       FROM "${tenantSchema}".platform_identity pi
       JOIN "${tenantSchema}".social_platform sp ON sp.id = pi.platform_id
       WHERE pi.id = $1::uuid
         AND pi.customer_id = $2::uuid`,
      identityId,
      customerId,
    );

    return identities[0] ?? null;
  }

  async update(
    tenantSchema: string,
    identityId: string,
    args: {
      platformUid: string;
      platformNickname: string | null;
      platformAvatarUrl: string | null;
      profileUrl: string | null;
      isVerified: boolean;
      isCurrent: boolean;
    },
  ): Promise<PlatformIdentityUpdatedRecord> {
    const identities = await prisma.$queryRawUnsafe<PlatformIdentityUpdatedRecord[]>(
      `UPDATE "${tenantSchema}".platform_identity
       SET platform_uid = $1,
           platform_nickname = $2,
           platform_avatar_url = $3,
           profile_url = $4,
           is_verified = $5,
           is_current = $6,
           updated_at = NOW()
       WHERE id = $7::uuid
       RETURNING
         id,
         platform_uid as "platformUid",
         platform_nickname as "platformNickname",
         profile_url as "profileUrl",
         is_verified as "isVerified",
         is_current as "isCurrent",
         updated_at as "updatedAt"`,
      args.platformUid,
      args.platformNickname,
      args.platformAvatarUrl,
      args.profileUrl,
      args.isVerified,
      args.isCurrent,
      identityId,
    );

    return identities[0];
  }

  findHistory(
    tenantSchema: string,
    args: {
      customerId: string;
      platformCode?: string;
      changeType?: string;
      take: number;
      skip: number;
    },
  ): Promise<PlatformIdentityHistoryRecord[]> {
    const { whereClause, params } = this.buildHistoryFilters(args.customerId, {
      platformCode: args.platformCode,
      changeType: args.changeType,
    });

    return prisma.$queryRawUnsafe<PlatformIdentityHistoryRecord[]>(
      `SELECT
         pih.id,
         pih.identity_id as "identityId",
         sp.code as "platformCode",
         sp.display_name as "platformName",
         pih.change_type as "changeType",
         pih.old_value as "oldValue",
         pih.new_value as "newValue",
         pih.captured_at as "capturedAt",
         pih.captured_by as "capturedBy"
       FROM "${tenantSchema}".platform_identity_history pih
       JOIN "${tenantSchema}".platform_identity pi ON pi.id = pih.identity_id
       JOIN "${tenantSchema}".social_platform sp ON sp.id = pi.platform_id
       WHERE ${whereClause}
       ORDER BY pih.captured_at DESC
       LIMIT ${args.take} OFFSET ${args.skip}`,
      ...params,
    );
  }

  async countHistory(
    tenantSchema: string,
    args: {
      customerId: string;
      platformCode?: string;
      changeType?: string;
    },
  ): Promise<number> {
    const { whereClause, params } = this.buildHistoryFilters(args.customerId, args);
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count
       FROM "${tenantSchema}".platform_identity_history pih
       JOIN "${tenantSchema}".platform_identity pi ON pi.id = pih.identity_id
       JOIN "${tenantSchema}".social_platform sp ON sp.id = pi.platform_id
       WHERE ${whereClause}`,
      ...params,
    );

    return Number(countResult[0]?.count ?? 0);
  }

  private buildHistoryFilters(
    customerId: string,
    args: {
      platformCode?: string;
      changeType?: string;
    },
  ) {
    let whereClause = 'pih.customer_id = $1::uuid';
    const params: string[] = [customerId];
    let paramIndex = 2;

    if (args.changeType) {
      whereClause += ` AND pih.change_type = $${paramIndex}`;
      params.push(args.changeType);
      paramIndex += 1;
    }

    if (args.platformCode) {
      whereClause += ` AND sp.code = $${paramIndex}`;
      params.push(args.platformCode);
      paramIndex += 1;
    }

    return { whereClause, params };
  }
}
