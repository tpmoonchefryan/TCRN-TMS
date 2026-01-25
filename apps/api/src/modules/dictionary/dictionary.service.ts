// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tcrn/database';
import { ErrorCodes } from '@tcrn/shared';

/**
 * System Dictionary Item (from database)
 */
export interface SystemDictionaryItem {
  id: string;
  dictionaryCode: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  descriptionEn: string | null;
  descriptionZh: string | null;
  descriptionJa: string | null;
  sortOrder: number;
  isActive: boolean;
  extraData: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

/**
 * System Dictionary Type (from database)
 */
export interface SystemDictionaryType {
  id: string;
  code: string;
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
 * Dictionary Service
 * Provides access to system dictionaries stored in public schema
 * - Read-only for general tenants
 * - Full CRUD for AC tenant
 */
@Injectable()
export class DictionaryService {
  /**
   * Get all dictionary types
   */
  async getTypes(language: string = 'en'): Promise<Array<{ type: string; name: string; description: string | null; count: number }>> {
    const types = await prisma.$queryRawUnsafe<Array<SystemDictionaryType & { itemCount: bigint }>>(`
      SELECT 
        d.id, d.code, d.name_en as "nameEn", d.name_zh as "nameZh", d.name_ja as "nameJa",
        d.description_en as "descriptionEn", d.description_zh as "descriptionZh", d.description_ja as "descriptionJa",
        d.sort_order as "sortOrder", d.is_active as "isActive",
        d.created_at as "createdAt", d.updated_at as "updatedAt", d.version,
        COUNT(i.id) as "itemCount"
      FROM public.system_dictionary d
      LEFT JOIN public.system_dictionary_item i ON i.dictionary_code = d.code AND i.is_active = true
      WHERE d.is_active = true
      GROUP BY d.id
      ORDER BY d.sort_order ASC, d.code ASC
    `);

    return types.map(t => ({
      type: t.code,
      name: this.getLocalizedName(t, language),
      description: this.getLocalizedDescription(t, language),
      count: Number(t.itemCount),
    }));
  }

  /**
   * Get dictionary type details
   */
  async getType(typeCode: string, language: string = 'en'): Promise<SystemDictionaryType | null> {
    const results = await prisma.$queryRawUnsafe<SystemDictionaryType[]>(`
      SELECT 
        id, code, name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description_en as "descriptionEn", description_zh as "descriptionZh", description_ja as "descriptionJa",
        sort_order as "sortOrder", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
      FROM public.system_dictionary
      WHERE code = $1
    `, typeCode);

    return results[0] || null;
  }

  /**
   * Get dictionary items by type
   */
  async getByType(
    typeCode: string,
    options: { search?: string; language?: string; includeInactive?: boolean; page?: number; pageSize?: number } = {}
  ): Promise<{ data: Array<SystemDictionaryItem & { name: string }>; total: number } | null> {
    // Check if type exists
    const typeExists = await this.hasType(typeCode);
    if (!typeExists) {
      return null;
    }

    const { search, language = 'en', includeInactive = false, page = 1, pageSize = 500 } = options;
    
    let whereClause = 'dictionary_code = $1';
    const params: unknown[] = [typeCode];
    let paramIndex = 2;

    if (!includeInactive) {
      whereClause += ' AND is_active = true';
    }

    if (search) {
      whereClause += ` AND (code ILIKE $${paramIndex} OR name_en ILIKE $${paramIndex} OR name_zh ILIKE $${paramIndex} OR name_ja ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count FROM public.system_dictionary_item WHERE ${whereClause}
    `, ...params);
    const total = Number(countResult[0]?.count || 0);

    // Get data
    const offset = (page - 1) * pageSize;
    const items = await prisma.$queryRawUnsafe<SystemDictionaryItem[]>(`
      SELECT 
        id, dictionary_code as "dictionaryCode", code,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description_en as "descriptionEn", description_zh as "descriptionZh", description_ja as "descriptionJa",
        sort_order as "sortOrder", is_active as "isActive", extra_data as "extraData",
        created_at as "createdAt", updated_at as "updatedAt", version
      FROM public.system_dictionary_item
      WHERE ${whereClause}
      ORDER BY sort_order ASC, code ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `, ...params);

    // Add localized name
    return {
      data: items.map(item => ({
        ...item,
        name: this.getLocalizedItemName(item, language),
      })),
      total,
    };
  }

  /**
   * Get single dictionary item
   */
  async getItem(typeCode: string, itemCode: string, language: string = 'en'): Promise<(SystemDictionaryItem & { name: string }) | null> {
    const results = await prisma.$queryRawUnsafe<SystemDictionaryItem[]>(`
      SELECT 
        id, dictionary_code as "dictionaryCode", code,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description_en as "descriptionEn", description_zh as "descriptionZh", description_ja as "descriptionJa",
        sort_order as "sortOrder", is_active as "isActive", extra_data as "extraData",
        created_at as "createdAt", updated_at as "updatedAt", version
      FROM public.system_dictionary_item
      WHERE dictionary_code = $1 AND code = $2
    `, typeCode, itemCode);

    if (results.length === 0) {
      return null;
    }

    const item = results[0];
    return {
      ...item,
      name: this.getLocalizedItemName(item, language),
    };
  }

  /**
   * Get item by ID
   */
  async getItemById(id: string, language: string = 'en'): Promise<(SystemDictionaryItem & { name: string }) | null> {
    const results = await prisma.$queryRawUnsafe<SystemDictionaryItem[]>(`
      SELECT 
        id, dictionary_code as "dictionaryCode", code,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description_en as "descriptionEn", description_zh as "descriptionZh", description_ja as "descriptionJa",
        sort_order as "sortOrder", is_active as "isActive", extra_data as "extraData",
        created_at as "createdAt", updated_at as "updatedAt", version
      FROM public.system_dictionary_item
      WHERE id = $1::uuid
    `, id);

    if (results.length === 0) {
      return null;
    }

    const item = results[0];
    return {
      ...item,
      name: this.getLocalizedItemName(item, language),
    };
  }

  /**
   * Check if a dictionary type exists
   */
  async hasType(typeCode: string): Promise<boolean> {
    const results = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT 1 FROM public.system_dictionary WHERE code = $1 AND is_active = true
      ) as exists
    `, typeCode);
    return results[0]?.exists || false;
  }

  // =====================================================
  // AC Tenant CRUD Operations (for platform administration)
  // =====================================================

  /**
   * Create a new dictionary type (AC only)
   */
  async createType(data: {
    code: string;
    nameEn: string;
    nameZh?: string;
    nameJa?: string;
    descriptionEn?: string;
    descriptionZh?: string;
    descriptionJa?: string;
    sortOrder?: number;
  }): Promise<SystemDictionaryType> {
    // Check if code already exists
    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM public.system_dictionary WHERE code = $1
    `, data.code);

    if (existing.length > 0) {
      throw new BadRequestException({
        code: ErrorCodes.CODE_ALREADY_EXISTS,
        message: 'Dictionary type code already exists',
      });
    }

    const results = await prisma.$queryRawUnsafe<SystemDictionaryType[]>(`
      INSERT INTO public.system_dictionary (
        id, code, name_en, name_zh, name_ja, 
        description_en, description_zh, description_ja,
        sort_order, is_active, created_at, updated_at, version
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, true, now(), now(), 1
      )
      RETURNING 
        id, code, name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description_en as "descriptionEn", description_zh as "descriptionZh", description_ja as "descriptionJa",
        sort_order as "sortOrder", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
    `,
      data.code,
      data.nameEn,
      data.nameZh || null,
      data.nameJa || null,
      data.descriptionEn || null,
      data.descriptionZh || null,
      data.descriptionJa || null,
      data.sortOrder || 0
    );

    return results[0];
  }

  /**
   * Update a dictionary type (AC only)
   */
  async updateType(
    code: string,
    data: {
      nameEn?: string;
      nameZh?: string;
      nameJa?: string;
      descriptionEn?: string;
      descriptionZh?: string;
      descriptionJa?: string;
      sortOrder?: number;
      version: number;
    }
  ): Promise<SystemDictionaryType> {
    const current = await this.getType(code);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Dictionary type not found',
      });
    }

    if (current.version !== data.version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }

    const updates: string[] = [];
    const params: unknown[] = [code];
    let paramIndex = 2;

    const fieldMappings: Record<string, string> = {
      nameEn: 'name_en',
      nameZh: 'name_zh',
      nameJa: 'name_ja',
      descriptionEn: 'description_en',
      descriptionZh: 'description_zh',
      descriptionJa: 'description_ja',
      sortOrder: 'sort_order',
    };

    for (const [key, dbField] of Object.entries(fieldMappings)) {
      if (data[key as keyof typeof data] !== undefined) {
        updates.push(`${dbField} = $${paramIndex++}`);
        params.push(data[key as keyof typeof data]);
      }
    }

    updates.push('updated_at = now()');
    updates.push('version = version + 1');

    const results = await prisma.$queryRawUnsafe<SystemDictionaryType[]>(`
      UPDATE public.system_dictionary
      SET ${updates.join(', ')}
      WHERE code = $1
      RETURNING 
        id, code, name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description_en as "descriptionEn", description_zh as "descriptionZh", description_ja as "descriptionJa",
        sort_order as "sortOrder", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
    `, ...params);

    return results[0];
  }

  /**
   * Create a new dictionary item (AC only)
   */
  async createItem(
    typeCode: string,
    data: {
      code: string;
      nameEn: string;
      nameZh?: string;
      nameJa?: string;
      descriptionEn?: string;
      descriptionZh?: string;
      descriptionJa?: string;
      sortOrder?: number;
      extraData?: Record<string, unknown>;
    }
  ): Promise<SystemDictionaryItem> {
    // Check if type exists
    const typeExists = await this.hasType(typeCode);
    if (!typeExists) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Dictionary type not found',
      });
    }

    // Check if code already exists in this type
    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM public.system_dictionary_item WHERE dictionary_code = $1 AND code = $2
    `, typeCode, data.code);

    if (existing.length > 0) {
      throw new BadRequestException({
        code: ErrorCodes.CODE_ALREADY_EXISTS,
        message: 'Dictionary item code already exists in this type',
      });
    }

    const extraDataJson = data.extraData ? JSON.stringify(data.extraData) : null;

    const results = await prisma.$queryRawUnsafe<SystemDictionaryItem[]>(`
      INSERT INTO public.system_dictionary_item (
        id, dictionary_code, code, name_en, name_zh, name_ja, 
        description_en, description_zh, description_ja,
        sort_order, is_active, extra_data, created_at, updated_at, version
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10::jsonb, now(), now(), 1
      )
      RETURNING 
        id, dictionary_code as "dictionaryCode", code,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description_en as "descriptionEn", description_zh as "descriptionZh", description_ja as "descriptionJa",
        sort_order as "sortOrder", is_active as "isActive", extra_data as "extraData",
        created_at as "createdAt", updated_at as "updatedAt", version
    `,
      typeCode,
      data.code,
      data.nameEn,
      data.nameZh || null,
      data.nameJa || null,
      data.descriptionEn || null,
      data.descriptionZh || null,
      data.descriptionJa || null,
      data.sortOrder || 0,
      extraDataJson
    );

    return results[0];
  }

  /**
   * Update a dictionary item (AC only)
   */
  async updateItem(
    id: string,
    data: {
      nameEn?: string;
      nameZh?: string;
      nameJa?: string;
      descriptionEn?: string;
      descriptionZh?: string;
      descriptionJa?: string;
      sortOrder?: number;
      extraData?: Record<string, unknown>;
      version: number;
    }
  ): Promise<SystemDictionaryItem> {
    const current = await this.getItemById(id);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Dictionary item not found',
      });
    }

    if (current.version !== data.version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }

    const updates: string[] = [];
    const params: unknown[] = [id];
    let paramIndex = 2;

    const fieldMappings: Record<string, string> = {
      nameEn: 'name_en',
      nameZh: 'name_zh',
      nameJa: 'name_ja',
      descriptionEn: 'description_en',
      descriptionZh: 'description_zh',
      descriptionJa: 'description_ja',
      sortOrder: 'sort_order',
    };

    for (const [key, dbField] of Object.entries(fieldMappings)) {
      if (data[key as keyof typeof data] !== undefined) {
        updates.push(`${dbField} = $${paramIndex++}`);
        params.push(data[key as keyof typeof data]);
      }
    }

    // Handle extraData separately (JSONB)
    if (data.extraData !== undefined) {
      updates.push(`extra_data = $${paramIndex++}::jsonb`);
      params.push(JSON.stringify(data.extraData));
    }

    updates.push('updated_at = now()');
    updates.push('version = version + 1');

    const results = await prisma.$queryRawUnsafe<SystemDictionaryItem[]>(`
      UPDATE public.system_dictionary_item
      SET ${updates.join(', ')}
      WHERE id = $1::uuid
      RETURNING 
        id, dictionary_code as "dictionaryCode", code,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description_en as "descriptionEn", description_zh as "descriptionZh", description_ja as "descriptionJa",
        sort_order as "sortOrder", is_active as "isActive", extra_data as "extraData",
        created_at as "createdAt", updated_at as "updatedAt", version
    `, ...params);

    return results[0];
  }

  /**
   * Deactivate a dictionary item (AC only)
   */
  async deactivateItem(id: string, version: number): Promise<SystemDictionaryItem> {
    const current = await this.getItemById(id);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Dictionary item not found',
      });
    }

    if (current.version !== version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }

    const results = await prisma.$queryRawUnsafe<SystemDictionaryItem[]>(`
      UPDATE public.system_dictionary_item
      SET is_active = false, updated_at = now(), version = version + 1
      WHERE id = $1::uuid
      RETURNING 
        id, dictionary_code as "dictionaryCode", code,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description_en as "descriptionEn", description_zh as "descriptionZh", description_ja as "descriptionJa",
        sort_order as "sortOrder", is_active as "isActive", extra_data as "extraData",
        created_at as "createdAt", updated_at as "updatedAt", version
    `, id);

    return results[0];
  }

  /**
   * Reactivate a dictionary item (AC only)
   */
  async reactivateItem(id: string, version: number): Promise<SystemDictionaryItem> {
    const current = await this.getItemById(id);
    if (!current) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Dictionary item not found',
      });
    }

    if (current.version !== version) {
      throw new BadRequestException({
        code: ErrorCodes.RES_VERSION_MISMATCH,
        message: 'Data has been modified. Please refresh and try again.',
      });
    }

    const results = await prisma.$queryRawUnsafe<SystemDictionaryItem[]>(`
      UPDATE public.system_dictionary_item
      SET is_active = true, updated_at = now(), version = version + 1
      WHERE id = $1::uuid
      RETURNING 
        id, dictionary_code as "dictionaryCode", code,
        name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description_en as "descriptionEn", description_zh as "descriptionZh", description_ja as "descriptionJa",
        sort_order as "sortOrder", is_active as "isActive", extra_data as "extraData",
        created_at as "createdAt", updated_at as "updatedAt", version
    `, id);

    return results[0];
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  private getLocalizedName(entity: { nameEn: string; nameZh?: string | null; nameJa?: string | null }, language: string): string {
    switch (language) {
      case 'zh':
        return entity.nameZh || entity.nameEn;
      case 'ja':
        return entity.nameJa || entity.nameEn;
      default:
        return entity.nameEn;
    }
  }

  private getLocalizedDescription(entity: { descriptionEn?: string | null; descriptionZh?: string | null; descriptionJa?: string | null }, language: string): string | null {
    switch (language) {
      case 'zh':
        return entity.descriptionZh || entity.descriptionEn || null;
      case 'ja':
        return entity.descriptionJa || entity.descriptionEn || null;
      default:
        return entity.descriptionEn || null;
    }
  }

  private getLocalizedItemName(item: { nameEn: string; nameZh?: string | null; nameJa?: string | null }, language: string): string {
    switch (language) {
      case 'zh':
        return item.nameZh || item.nameEn;
      case 'ja':
        return item.nameJa || item.nameEn;
      default:
        return item.nameEn;
    }
  }
}
