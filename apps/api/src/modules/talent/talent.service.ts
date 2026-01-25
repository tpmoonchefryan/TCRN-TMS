// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tcrn/database';
import { ErrorCodes } from '@tcrn/shared';

export interface TalentData {
  id: string;
  subsidiaryId: string | null;
  profileStoreId: string | null;
  code: string;
  path: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  displayName: string;
  descriptionEn: string | null;
  descriptionZh: string | null;
  descriptionJa: string | null;
  avatarUrl: string | null;
  homepagePath: string | null;
  timezone: string;
  isActive: boolean;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

/**
 * Talent Service
 * Manages artists/VTubers
 */
@Injectable()
export class TalentService {
  /**
   * Find talent by ID
   */
  async findById(id: string, tenantSchema: string): Promise<TalentData | null> {
    const results = await prisma.$queryRawUnsafe<TalentData[]>(`
      SELECT 
        id, subsidiary_id as "subsidiaryId", profile_store_id as "profileStoreId", code, path,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        display_name as "displayName",
        description_en as "descriptionEn", description_zh as "descriptionZh", 
        description_ja as "descriptionJa",
        avatar_url as "avatarUrl", homepage_path as "homepagePath", timezone,
        is_active as "isActive", settings,
        created_at as "createdAt", updated_at as "updatedAt", version
      FROM "${tenantSchema}".talent
      WHERE id = $1::uuid
    `, id);
    return results[0] || null;
  }

  /**
   * Find talent by code
   */
  async findByCode(code: string, tenantSchema: string): Promise<TalentData | null> {
    const results = await prisma.$queryRawUnsafe<TalentData[]>(`
      SELECT 
        id, subsidiary_id as "subsidiaryId", profile_store_id as "profileStoreId", code, path,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        display_name as "displayName",
        description_en as "descriptionEn", description_zh as "descriptionZh", 
        description_ja as "descriptionJa",
        avatar_url as "avatarUrl", homepage_path as "homepagePath", timezone,
        is_active as "isActive", settings,
        created_at as "createdAt", updated_at as "updatedAt", version
      FROM "${tenantSchema}".talent
      WHERE code = $1
    `, code);
    return results[0] || null;
  }

  /**
   * Find talent by homepage path
   */
  async findByHomepagePath(homepagePath: string, tenantSchema: string): Promise<TalentData | null> {
    const results = await prisma.$queryRawUnsafe<TalentData[]>(`
      SELECT 
        id, subsidiary_id as "subsidiaryId", profile_store_id as "profileStoreId", code, path,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        display_name as "displayName",
        description_en as "descriptionEn", description_zh as "descriptionZh", 
        description_ja as "descriptionJa",
        avatar_url as "avatarUrl", homepage_path as "homepagePath", timezone,
        is_active as "isActive", settings,
        created_at as "createdAt", updated_at as "updatedAt", version
      FROM "${tenantSchema}".talent
      WHERE homepage_path = $1
    `, homepagePath);
    return results[0] || null;
  }

  /**
   * Get profile store by ID
   */
  async getProfileStoreById(
    profileStoreId: string,
    tenantSchema: string
  ): Promise<{
    id: string;
    code: string;
    nameEn: string;
    nameZh: string | null;
    nameJa: string | null;
    isDefault: boolean;
    piiProxyUrl: string | null;
  } | null> {
    try {
      const results = await prisma.$queryRawUnsafe<Array<{
        id: string;
        code: string;
        nameEn: string;
        nameZh: string | null;
        nameJa: string | null;
        isDefault: boolean;
        piiProxyUrl: string | null;
      }>>(`
        SELECT 
          id, code, 
          name_en as "nameEn", 
          name_zh as "nameZh", 
          name_ja as "nameJa",
          is_default as "isDefault",
          pii_proxy_url as "piiProxyUrl"
        FROM "${tenantSchema}".profile_store
        WHERE id = $1::uuid
      `, profileStoreId);
      return results[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Get talent statistics (customer count, etc.)
   */
  async getTalentStats(
    talentId: string,
    tenantSchema: string
  ): Promise<{ customerCount: number; pendingMessagesCount: number }> {
    try {
      const [customerResult, messageResult] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint as count FROM "${tenantSchema}".customer_profile WHERE talent_id = $1::uuid`,
          talentId
        ).catch(() => [{ count: BigInt(0) }]),
        prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint as count FROM "${tenantSchema}".marshmallow_message WHERE talent_id = $1::uuid AND status = 'pending'`,
          talentId
        ).catch(() => [{ count: BigInt(0) }]),
      ]);

      return {
        customerCount: Number(customerResult[0]?.count ?? 0),
        pendingMessagesCount: Number(messageResult[0]?.count ?? 0),
      };
    } catch {
      return { customerCount: 0, pendingMessagesCount: 0 };
    }
  }

  /**
   * Get external pages domain configuration (homepage and marshmallow)
   */
  async getExternalPagesDomainConfig(
    talentId: string,
    tenantSchema: string
  ): Promise<{
    homepage: {
      isPublished: boolean;
      customDomain: string | null;
      customDomainVerified: boolean;
      customDomainVerificationToken: string | null;
    } | null;
    marshmallow: {
      isEnabled: boolean;
      path: string | null;
      customDomain: string | null;
      customDomainVerified: boolean;
      customDomainVerificationToken: string | null;
    } | null;
  }> {
    try {
      const [homepageResult, marshmallowResult] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{
          isPublished: boolean;
          customDomain: string | null;
          customDomainVerified: boolean;
          customDomainVerificationToken: string | null;
        }>>(`
          SELECT 
            is_published as "isPublished",
            custom_domain as "customDomain",
            custom_domain_verified as "customDomainVerified",
            custom_domain_verification_token as "customDomainVerificationToken"
          FROM "${tenantSchema}".talent_homepage
          WHERE talent_id = $1::uuid
        `, talentId).catch(() => []),
        prisma.$queryRawUnsafe<Array<{
          isEnabled: boolean;
          path: string | null;
          customDomain: string | null;
          customDomainVerified: boolean;
          customDomainVerificationToken: string | null;
        }>>(`
          SELECT 
            is_enabled as "isEnabled",
            path,
            custom_domain as "customDomain",
            custom_domain_verified as "customDomainVerified",
            custom_domain_verification_token as "customDomainVerificationToken"
          FROM "${tenantSchema}".marshmallow_config
          WHERE talent_id = $1::uuid
        `, talentId).catch(() => []),
      ]);

      return {
        homepage: homepageResult[0] || null,
        marshmallow: marshmallowResult[0] || null,
      };
    } catch {
      return { homepage: null, marshmallow: null };
    }
  }

  /**
   * List talents with filtering
   */
  async list(
    tenantSchema: string,
    options: {
      page?: number;
      pageSize?: number;
      subsidiaryId?: string | null;
      search?: string;
      isActive?: boolean;
      sort?: string;
    } = {}
  ): Promise<{ data: TalentData[]; total: number }> {
    const { page = 1, pageSize = 20, subsidiaryId, search, isActive, sort } = options;
    const offset = (page - 1) * pageSize;

    let whereClause = '1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (subsidiaryId !== undefined) {
      if (subsidiaryId === null) {
        whereClause += ' AND subsidiary_id IS NULL';
      } else {
        whereClause += ` AND subsidiary_id = $${paramIndex++}`;
        params.push(subsidiaryId);
      }
    }

    if (search) {
      whereClause += ` AND (code ILIKE $${paramIndex} OR name_en ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (isActive !== undefined) {
      whereClause += ` AND is_active = $${paramIndex++}`;
      params.push(isActive);
    }

    // Build order by
    let orderBy = 'created_at DESC';
    if (sort) {
      const isDesc = sort.startsWith('-');
      const field = isDesc ? sort.substring(1) : sort;
      const fieldMap: Record<string, string> = {
        code: 'code',
        name: 'name_en',
        displayName: 'display_name',
        createdAt: 'created_at',
      };
      const dbField = fieldMap[field] || 'created_at';
      orderBy = `${dbField} ${isDesc ? 'DESC' : 'ASC'}`;
    }

    // Get total count
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count FROM "${tenantSchema}".talent WHERE ${whereClause}
    `, ...params);
    const total = Number(countResult[0]?.count || 0);

    // Get data
    const data = await prisma.$queryRawUnsafe<TalentData[]>(`
      SELECT 
        id, subsidiary_id as "subsidiaryId", profile_store_id as "profileStoreId", code, path,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        display_name as "displayName",
        description_en as "descriptionEn", description_zh as "descriptionZh", 
        description_ja as "descriptionJa",
        avatar_url as "avatarUrl", homepage_path as "homepagePath", timezone,
        is_active as "isActive", settings,
        created_at as "createdAt", updated_at as "updatedAt", version
      FROM "${tenantSchema}".talent
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${pageSize} OFFSET ${offset}
    `, ...params);

    return { data, total };
  }

  /**
   * Create a new talent
   */
  async create(
    tenantSchema: string,
    data: {
      subsidiaryId?: string | null;
      profileStoreId: string;
      code: string;
      nameEn: string;
      nameZh?: string;
      nameJa?: string;
      displayName: string;
      descriptionEn?: string;
      descriptionZh?: string;
      descriptionJa?: string;
      avatarUrl?: string;
      homepagePath?: string;
      timezone?: string;
      settings?: Record<string, unknown>;
    },
    userId: string
  ): Promise<TalentData> {
    // Validate Profile Store exists in tenant schema
    const profileStore = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM "${tenantSchema}".profile_store WHERE id = $1::uuid AND is_active = true
    `, data.profileStoreId);
    
    if (profileStore.length === 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Profile Store not found or inactive',
      });
    }

    // Check code uniqueness
    const existingByCode = await this.findByCode(data.code, tenantSchema);
    if (existingByCode) {
      throw new BadRequestException({
        code: ErrorCodes.CODE_ALREADY_EXISTS,
        message: 'Talent code already exists',
      });
    }

    // Check homepage path uniqueness
    if (data.homepagePath) {
      const existingByPath = await this.findByHomepagePath(data.homepagePath, tenantSchema);
      if (existingByPath) {
        throw new BadRequestException({
          code: 'HOMEPAGE_PATH_TAKEN',
          message: 'Homepage path is already in use',
        });
      }
    }

    // Calculate path
    let path: string;
    if (data.subsidiaryId) {
      // Get subsidiary path
      const subsidiary = await prisma.$queryRawUnsafe<Array<{ path: string }>>(`
        SELECT path FROM "${tenantSchema}".subsidiary WHERE id = $1::uuid
      `, data.subsidiaryId);
      
      if (subsidiary.length === 0) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Subsidiary not found',
        });
      }
      path = `${subsidiary[0].path}${data.code}/`;
    } else {
      path = `/${data.code}/`;
    }

    // Insert
    const results = await prisma.$queryRawUnsafe<TalentData[]>(`
      INSERT INTO "${tenantSchema}".talent 
        (id, subsidiary_id, profile_store_id, code, path, name_en, name_zh, name_ja, display_name,
         description_en, description_zh, description_ja,
         avatar_url, homepage_path, timezone, is_active, settings,
         created_at, updated_at, created_by, updated_by, version)
      VALUES 
        (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
         true, $15::jsonb, now(), now(), $16::uuid, $16::uuid, 1)
      RETURNING 
        id, subsidiary_id as "subsidiaryId", profile_store_id as "profileStoreId", code, path,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        display_name as "displayName",
        description_en as "descriptionEn", description_zh as "descriptionZh", 
        description_ja as "descriptionJa",
        avatar_url as "avatarUrl", homepage_path as "homepagePath", timezone,
        is_active as "isActive", settings,
        created_at as "createdAt", updated_at as "updatedAt", version
    `, 
      data.subsidiaryId || null, data.profileStoreId, data.code, path,
      data.nameEn, data.nameZh || null, data.nameJa || null, data.displayName,
      data.descriptionEn || null, data.descriptionZh || null, data.descriptionJa || null,
      data.avatarUrl || null, data.homepagePath || null, data.timezone || 'UTC',
      JSON.stringify(data.settings || {}), userId
    );

    return results[0];
  }

  /**
   * Update a talent
   */
  async update(
    id: string,
    tenantSchema: string,
    data: {
      nameEn?: string;
      nameZh?: string;
      nameJa?: string;
      displayName?: string;
      descriptionEn?: string;
      descriptionZh?: string;
      descriptionJa?: string;
      avatarUrl?: string;
      homepagePath?: string;
      timezone?: string;
      settings?: Record<string, unknown>;
      version: number;
    },
    userId: string
  ): Promise<TalentData> {
    const current = await this.findById(id, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    if (current.version !== data.version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }

    // Check homepage path uniqueness if changing
    if (data.homepagePath && data.homepagePath !== current.homepagePath) {
      const existingByPath = await this.findByHomepagePath(data.homepagePath, tenantSchema);
      if (existingByPath && existingByPath.id !== id) {
        throw new BadRequestException({
          code: 'HOMEPAGE_PATH_TAKEN',
          message: 'Homepage path is already in use',
        });
      }
    }

    const updates: string[] = [];
    const params: unknown[] = [id, userId];
    let paramIndex = 3;

    if (data.nameEn !== undefined) {
      updates.push(`name_en = $${paramIndex++}`);
      params.push(data.nameEn);
    }
    if (data.nameZh !== undefined) {
      updates.push(`name_zh = $${paramIndex++}`);
      params.push(data.nameZh);
    }
    if (data.nameJa !== undefined) {
      updates.push(`name_ja = $${paramIndex++}`);
      params.push(data.nameJa);
    }
    if (data.displayName !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      params.push(data.displayName);
    }
    if (data.descriptionEn !== undefined) {
      updates.push(`description_en = $${paramIndex++}`);
      params.push(data.descriptionEn);
    }
    if (data.descriptionZh !== undefined) {
      updates.push(`description_zh = $${paramIndex++}`);
      params.push(data.descriptionZh);
    }
    if (data.descriptionJa !== undefined) {
      updates.push(`description_ja = $${paramIndex++}`);
      params.push(data.descriptionJa);
    }
    if (data.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      params.push(data.avatarUrl);
    }
    if (data.homepagePath !== undefined) {
      updates.push(`homepage_path = $${paramIndex++}`);
      params.push(data.homepagePath);
    }
    if (data.timezone !== undefined) {
      updates.push(`timezone = $${paramIndex++}`);
      params.push(data.timezone);
    }
    if (data.settings !== undefined) {
      updates.push(`settings = $${paramIndex++}::jsonb`);
      params.push(JSON.stringify(data.settings));
    }

    updates.push('updated_at = now()');
    updates.push('updated_by = $2::uuid');
    updates.push('version = version + 1');

    const results = await prisma.$queryRawUnsafe<TalentData[]>(`
      UPDATE "${tenantSchema}".talent
      SET ${updates.join(', ')}
      WHERE id = $1::uuid
      RETURNING 
        id, subsidiary_id as "subsidiaryId", profile_store_id as "profileStoreId", code, path,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        display_name as "displayName",
        description_en as "descriptionEn", description_zh as "descriptionZh", 
        description_ja as "descriptionJa",
        avatar_url as "avatarUrl", homepage_path as "homepagePath", timezone,
        is_active as "isActive", settings,
        created_at as "createdAt", updated_at as "updatedAt", version
    `, ...params);

    return results[0];
  }

  /**
   * Move talent to a new subsidiary
   */
  async move(
    id: string,
    tenantSchema: string,
    newSubsidiaryId: string | null,
    version: number,
    userId: string
  ): Promise<TalentData> {
    const current = await this.findById(id, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    if (current.version !== version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }

    // Calculate new path
    let newPath: string;
    if (newSubsidiaryId) {
      const subsidiary = await prisma.$queryRawUnsafe<Array<{ path: string }>>(`
        SELECT path FROM "${tenantSchema}".subsidiary WHERE id = $1::uuid
      `, newSubsidiaryId);
      
      if (subsidiary.length === 0) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Subsidiary not found',
        });
      }
      newPath = `${subsidiary[0].path}${current.code}/`;
    } else {
      newPath = `/${current.code}/`;
    }

    const results = await prisma.$queryRawUnsafe<TalentData[]>(`
      UPDATE "${tenantSchema}".talent
      SET 
        subsidiary_id = $2::uuid,
        path = $3,
        updated_at = now(),
        updated_by = $4::uuid,
        version = version + 1
      WHERE id = $1::uuid
      RETURNING 
        id, subsidiary_id as "subsidiaryId", profile_store_id as "profileStoreId", code, path,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        display_name as "displayName",
        description_en as "descriptionEn", description_zh as "descriptionZh", 
        description_ja as "descriptionJa",
        avatar_url as "avatarUrl", homepage_path as "homepagePath", timezone,
        is_active as "isActive", settings,
        created_at as "createdAt", updated_at as "updatedAt", version
    `, id, newSubsidiaryId, newPath, userId);

    return results[0];
  }

  /**
   * Deactivate a talent
   */
  async deactivate(
    id: string,
    tenantSchema: string,
    version: number,
    userId: string
  ): Promise<TalentData> {
    const current = await this.findById(id, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    if (current.version !== version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }

    const results = await prisma.$queryRawUnsafe<TalentData[]>(`
      UPDATE "${tenantSchema}".talent
      SET is_active = false, updated_at = now(), updated_by = $2::uuid, version = version + 1
      WHERE id = $1::uuid
      RETURNING 
        id, subsidiary_id as "subsidiaryId", profile_store_id as "profileStoreId", code, path,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        display_name as "displayName",
        description_en as "descriptionEn", description_zh as "descriptionZh", 
        description_ja as "descriptionJa",
        avatar_url as "avatarUrl", homepage_path as "homepagePath", timezone,
        is_active as "isActive", settings,
        created_at as "createdAt", updated_at as "updatedAt", version
    `, id, userId);

    return results[0];
  }

  /**
   * Reactivate a talent
   */
  async reactivate(
    id: string,
    tenantSchema: string,
    version: number,
    userId: string
  ): Promise<TalentData> {
    const current = await this.findById(id, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    if (current.version !== version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }

    const results = await prisma.$queryRawUnsafe<TalentData[]>(`
      UPDATE "${tenantSchema}".talent
      SET is_active = true, updated_at = now(), updated_by = $2::uuid, version = version + 1
      WHERE id = $1::uuid
      RETURNING 
        id, subsidiary_id as "subsidiaryId", profile_store_id as "profileStoreId", code, path,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        display_name as "displayName",
        description_en as "descriptionEn", description_zh as "descriptionZh", 
        description_ja as "descriptionJa",
        avatar_url as "avatarUrl", homepage_path as "homepagePath", timezone,
        is_active as "isActive", settings,
        created_at as "createdAt", updated_at as "updatedAt", version
    `, id, userId);

    return results[0];
  }
}
