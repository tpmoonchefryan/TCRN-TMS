// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tcrn/database';
import { ErrorCodes } from '@tcrn/shared';

const MAX_DEPTH = 10;

export interface SubsidiaryData {
  id: string;
  parentId: string | null;
  code: string;
  path: string;
  depth: number;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  descriptionEn: string | null;
  descriptionZh: string | null;
  descriptionJa: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

/**
 * Subsidiary Service
 * Manages hierarchical organization units (分级目录)
 */
@Injectable()
export class SubsidiaryService {
  /**
   * Find subsidiary by ID
   */
  async findById(id: string, tenantSchema: string): Promise<SubsidiaryData | null> {
    const results = await prisma.$queryRawUnsafe<SubsidiaryData[]>(`
      SELECT 
        id, parent_id as "parentId", code, path, depth,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description_en as "descriptionEn", description_zh as "descriptionZh", 
        description_ja as "descriptionJa",
        sort_order as "sortOrder", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
      FROM "${tenantSchema}".subsidiary
      WHERE id = $1::uuid
    `, id);
    return results[0] || null;
  }

  /**
   * Find subsidiary by code
   */
  async findByCode(code: string, tenantSchema: string): Promise<SubsidiaryData | null> {
    const results = await prisma.$queryRawUnsafe<SubsidiaryData[]>(`
      SELECT 
        id, parent_id as "parentId", code, path, depth,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description_en as "descriptionEn", description_zh as "descriptionZh", 
        description_ja as "descriptionJa",
        sort_order as "sortOrder", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
      FROM "${tenantSchema}".subsidiary
      WHERE code = $1
    `, code);
    return results[0] || null;
  }

  /**
   * List subsidiaries with filtering
   */
  async list(
    tenantSchema: string,
    options: {
      page?: number;
      pageSize?: number;
      parentId?: string | null;
      search?: string;
      isActive?: boolean;
      sort?: string;
    } = {}
  ): Promise<{ data: SubsidiaryData[]; total: number }> {
    const { page = 1, pageSize = 20, parentId, search, isActive, sort } = options;
    const offset = (page - 1) * pageSize;

    let whereClause = '1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (parentId !== undefined) {
      if (parentId === null) {
        whereClause += ' AND parent_id IS NULL';
      } else {
        whereClause += ` AND parent_id = $${paramIndex++}`;
        params.push(parentId);
      }
    }

    if (search) {
      whereClause += ` AND (code ILIKE $${paramIndex} OR name_en ILIKE $${paramIndex} OR name_zh ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (isActive !== undefined) {
      whereClause += ` AND is_active = $${paramIndex++}`;
      params.push(isActive);
    }

    // Build order by
    let orderBy = 'sort_order ASC, created_at DESC';
    if (sort) {
      const isDesc = sort.startsWith('-');
      const field = isDesc ? sort.substring(1) : sort;
      const fieldMap: Record<string, string> = {
        code: 'code',
        name: 'name_en',
        sortOrder: 'sort_order',
        createdAt: 'created_at',
      };
      const dbField = fieldMap[field] || 'sort_order';
      orderBy = `${dbField} ${isDesc ? 'DESC' : 'ASC'}`;
    }

    // Get total count
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count FROM "${tenantSchema}".subsidiary WHERE ${whereClause}
    `, ...params);
    const total = Number(countResult[0]?.count || 0);

    // Get data
    const data = await prisma.$queryRawUnsafe<SubsidiaryData[]>(`
      SELECT 
        id, parent_id as "parentId", code, path, depth,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description_en as "descriptionEn", description_zh as "descriptionZh", 
        description_ja as "descriptionJa",
        sort_order as "sortOrder", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
      FROM "${tenantSchema}".subsidiary
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${pageSize} OFFSET ${offset}
    `, ...params);

    return { data, total };
  }

  /**
   * Create a new subsidiary
   */
  async create(
    tenantSchema: string,
    data: {
      parentId?: string | null;
      code: string;
      nameEn: string;
      nameZh?: string;
      nameJa?: string;
      descriptionEn?: string;
      descriptionZh?: string;
      descriptionJa?: string;
      sortOrder?: number;
    },
    userId: string
  ): Promise<SubsidiaryData> {
    // Check code uniqueness
    const existing = await this.findByCode(data.code, tenantSchema);
    if (existing) {
      throw new BadRequestException({
        code: ErrorCodes.CODE_ALREADY_EXISTS,
        message: 'Subsidiary code already exists',
      });
    }

    // Calculate path and depth
    let path: string;
    let depth: number;

    if (data.parentId) {
      const parent = await this.findById(data.parentId, tenantSchema);
      if (!parent) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'Parent subsidiary not found',
        });
      }
      path = `${parent.path}${data.code}/`;
      depth = parent.depth + 1;

      if (depth > MAX_DEPTH) {
        throw new BadRequestException({
          code: 'MAX_DEPTH_EXCEEDED',
          message: `Maximum nesting depth of ${MAX_DEPTH} exceeded`,
        });
      }
    } else {
      path = `/${data.code}/`;
      depth = 1;
    }

    // Insert
    const results = await prisma.$queryRawUnsafe<SubsidiaryData[]>(`
      INSERT INTO "${tenantSchema}".subsidiary 
        (id, parent_id, code, path, depth, name_en, name_zh, name_ja,
         description_en, description_zh, description_ja,
         sort_order, is_active, created_at, updated_at, created_by, updated_by, version)
      VALUES 
        (gen_random_uuid(), $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, now(), now(), $12::uuid, $12::uuid, 1)
      RETURNING 
        id, parent_id as "parentId", code, path, depth,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description_en as "descriptionEn", description_zh as "descriptionZh", 
        description_ja as "descriptionJa",
        sort_order as "sortOrder", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
    `, 
      data.parentId || null, data.code, path, depth,
      data.nameEn, data.nameZh || null, data.nameJa || null,
      data.descriptionEn || null, data.descriptionZh || null, data.descriptionJa || null,
      data.sortOrder || 0, userId
    );

    return results[0];
  }

  /**
   * Update a subsidiary
   */
  async update(
    id: string,
    tenantSchema: string,
    data: {
      nameEn?: string;
      nameZh?: string;
      nameJa?: string;
      descriptionEn?: string;
      descriptionZh?: string;
      descriptionJa?: string;
      sortOrder?: number;
      version: number;
    },
    userId: string
  ): Promise<SubsidiaryData> {
    const current = await this.findById(id, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Subsidiary not found',
      });
    }

    if (current.version !== data.version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
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
    if (data.sortOrder !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      params.push(data.sortOrder);
    }

    updates.push('updated_at = now()');
    updates.push('updated_by = $2::uuid');
    updates.push('version = version + 1');

    const results = await prisma.$queryRawUnsafe<SubsidiaryData[]>(`
      UPDATE "${tenantSchema}".subsidiary
      SET ${updates.join(', ')}
      WHERE id = $1::uuid
      RETURNING 
        id, parent_id as "parentId", code, path, depth,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description_en as "descriptionEn", description_zh as "descriptionZh", 
        description_ja as "descriptionJa",
        sort_order as "sortOrder", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
    `, ...params);

    return results[0];
  }

  /**
   * Move subsidiary to a new parent
   */
  async move(
    id: string,
    tenantSchema: string,
    newParentId: string | null,
    version: number,
    userId: string
  ): Promise<{ subsidiary: SubsidiaryData; affectedChildren: number }> {
    const current = await this.findById(id, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Subsidiary not found',
      });
    }

    if (current.version !== version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }

    // Calculate new path and depth
    let newPath: string;
    let newDepth: number;

    if (newParentId) {
      const newParent = await this.findById(newParentId, tenantSchema);
      if (!newParent) {
        throw new NotFoundException({
          code: ErrorCodes.RES_NOT_FOUND,
          message: 'New parent subsidiary not found',
        });
      }

      // Check for circular reference
      if (newParent.path.startsWith(current.path)) {
        throw new BadRequestException({
          code: 'CIRCULAR_REFERENCE',
          message: 'Cannot move a subsidiary to its own descendant',
        });
      }

      newPath = `${newParent.path}${current.code}/`;
      newDepth = newParent.depth + 1;
    } else {
      newPath = `/${current.code}/`;
      newDepth = 1;
    }

    const depthDiff = newDepth - current.depth;
    const oldPath = current.path;

    // Check max depth for all children
    const maxChildDepthResult = await prisma.$queryRawUnsafe<Array<{ max_depth: number }>>(`
      SELECT MAX(depth) as max_depth FROM "${tenantSchema}".subsidiary WHERE path LIKE $1
    `, `${oldPath}%`);
    const maxChildDepth = maxChildDepthResult[0]?.max_depth || current.depth;

    if (maxChildDepth + depthDiff > MAX_DEPTH) {
      throw new BadRequestException({
        code: 'MAX_DEPTH_EXCEEDED',
        message: `Moving would exceed maximum nesting depth of ${MAX_DEPTH}`,
      });
    }

    // Update paths for all descendants
    const affectedResult = await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".subsidiary
      SET 
        path = $1 || SUBSTRING(path FROM ${oldPath.length + 1}),
        depth = depth + $3,
        updated_at = now(),
        updated_by = $4
      WHERE path LIKE $2
    `, newPath, `${oldPath}%`, depthDiff, userId) as number;

    // Update current node's parent_id
    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".subsidiary
      SET parent_id = $2::uuid, version = version + 1
      WHERE id = $1::uuid
    `, id, newParentId);

    // Update talent paths
    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".talent
      SET 
        path = $1 || SUBSTRING(path FROM ${oldPath.length + 1}),
        updated_at = now(),
        updated_by = $3
      WHERE path LIKE $2
    `, newPath, `${oldPath}%`, userId);

    const updated = await this.findById(id, tenantSchema);
    if (!updated) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Subsidiary not found after move',
      });
    }
    return { subsidiary: updated, affectedChildren: affectedResult - 1 };
  }

  /**
   * Deactivate a subsidiary
   */
  async deactivate(
    id: string,
    tenantSchema: string,
    cascade: boolean,
    version: number,
    userId: string
  ): Promise<{ subsidiaries: number; talents: number }> {
    const current = await this.findById(id, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Subsidiary not found',
      });
    }

    if (current.version !== version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }

    let affectedSubsidiaries = 1;
    let affectedTalents = 0;

    if (cascade) {
      // Deactivate all descendants
      const subResult = await prisma.$executeRawUnsafe(`
        UPDATE "${tenantSchema}".subsidiary
        SET is_active = false, updated_at = now(), updated_by = $2::uuid
        WHERE path LIKE $1
      `, `${current.path}%`, userId) as number;
      affectedSubsidiaries = subResult;

      // Deactivate all talents
      const talentResult = await prisma.$executeRawUnsafe(`
        UPDATE "${tenantSchema}".talent
        SET is_active = false, updated_at = now(), updated_by = $2::uuid
        WHERE path LIKE $1
      `, `${current.path}%`, userId) as number;
      affectedTalents = talentResult;
    } else {
      // Only deactivate the current node
      await prisma.$executeRawUnsafe(`
        UPDATE "${tenantSchema}".subsidiary
        SET is_active = false, updated_at = now(), updated_by = $2::uuid, version = version + 1
        WHERE id = $1::uuid
      `, id, userId);
    }

    return { subsidiaries: affectedSubsidiaries, talents: affectedTalents };
  }

  /**
   * Reactivate a subsidiary
   */
  async reactivate(
    id: string,
    tenantSchema: string,
    version: number,
    userId: string
  ): Promise<SubsidiaryData> {
    const current = await this.findById(id, tenantSchema);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Subsidiary not found',
      });
    }

    if (current.version !== version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }

    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".subsidiary
      SET is_active = true, updated_at = now(), updated_by = $2::uuid, version = version + 1
      WHERE id = $1::uuid
    `, id, userId);

    const reactivated = await this.findById(id, tenantSchema);
    if (!reactivated) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Subsidiary not found after reactivation',
      });
    }
    return reactivated;
  }

  /**
   * Get children count
   */
  async getChildrenCount(id: string, tenantSchema: string): Promise<number> {
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count FROM "${tenantSchema}".subsidiary WHERE parent_id = $1::uuid
    `, id);
    return Number(result[0]?.count || 0);
  }

  /**
   * Get talent count for a subsidiary (direct children only)
   */
  async getTalentCount(id: string, tenantSchema: string): Promise<number> {
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count FROM "${tenantSchema}".talent WHERE subsidiary_id = $1::uuid
    `, id);
    return Number(result[0]?.count || 0);
  }
}
