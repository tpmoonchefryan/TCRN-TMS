// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tcrn/database';
import { ErrorCodes, normalizeSupportedUiLocale, resolveTrilingualLocaleFamily } from '@tcrn/shared';

type TranslationMap = Record<string, string>;

/**
 * System Dictionary Item (from database)
 */
interface StoredSystemDictionaryItem {
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

export interface SystemDictionaryItem extends StoredSystemDictionaryItem {
  translations: TranslationMap;
  descriptionTranslations: TranslationMap;
}

/**
 * System Dictionary Type (from database)
 */
interface StoredSystemDictionaryType {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  descriptionEn: string | null;
  descriptionZh: string | null;
  descriptionJa: string | null;
  extraData: Record<string, unknown> | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface SystemDictionaryType extends StoredSystemDictionaryType {
  translations: TranslationMap;
  descriptionTranslations: TranslationMap;
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
    const types = await prisma.$queryRawUnsafe<Array<StoredSystemDictionaryType & { itemCount: bigint }>>(`
      SELECT 
        d.id, d.code, d.name_en as "nameEn", d.name_zh as "nameZh", d.name_ja as "nameJa",
        d.description_en as "descriptionEn", d.description_zh as "descriptionZh", d.description_ja as "descriptionJa",
        d.extra_data as "extraData",
        d.sort_order as "sortOrder", d.is_active as "isActive",
        d.created_at as "createdAt", d.updated_at as "updatedAt", d.version,
        COUNT(i.id) as "itemCount"
      FROM public.system_dictionary d
      LEFT JOIN public.system_dictionary_item i ON i.dictionary_code = d.code AND i.is_active = true
      WHERE d.is_active = true
      GROUP BY d.id
      ORDER BY d.sort_order ASC, d.code ASC
    `);

    return types.map((type) => {
      const decorated = this.decorateType(type);

      return {
        type: decorated.code,
        name: this.getLocalizedValue(decorated.translations, language, decorated.nameEn),
        description: this.getLocalizedValue(
          decorated.descriptionTranslations,
          language,
          decorated.descriptionEn,
        ),
        count: Number(type.itemCount),
      };
    });
  }

  /**
   * Get dictionary type details
   */
  async getType(typeCode: string, _language: string = 'en'): Promise<SystemDictionaryType | null> {
    const results = await prisma.$queryRawUnsafe<StoredSystemDictionaryType[]>(`
      SELECT 
        id, code, name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description_en as "descriptionEn", description_zh as "descriptionZh", description_ja as "descriptionJa",
        extra_data as "extraData",
        sort_order as "sortOrder", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
      FROM public.system_dictionary
      WHERE code = $1
    `, typeCode);

    return results[0] ? this.decorateType(results[0]) : null;
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
    const items = await prisma.$queryRawUnsafe<StoredSystemDictionaryItem[]>(`
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
      data: items.map((item) => {
        const decorated = this.decorateItem(item);

        return {
          ...decorated,
          name: this.getLocalizedValue(decorated.translations, language, decorated.nameEn),
        };
      }),
      total,
    };
  }

  /**
   * Get single dictionary item
   */
  async getItem(typeCode: string, itemCode: string, language: string = 'en'): Promise<(SystemDictionaryItem & { name: string }) | null> {
    const results = await prisma.$queryRawUnsafe<StoredSystemDictionaryItem[]>(`
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

    const item = this.decorateItem(results[0]);
    return {
      ...item,
      name: this.getLocalizedValue(item.translations, language, item.nameEn),
    };
  }

  /**
   * Get item by ID
   */
  async getItemById(id: string, language: string = 'en'): Promise<(SystemDictionaryItem & { name: string }) | null> {
    const results = await prisma.$queryRawUnsafe<StoredSystemDictionaryItem[]>(`
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

    const item = this.decorateItem(results[0]);
    return {
      ...item,
      name: this.getLocalizedValue(item.translations, language, item.nameEn),
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
    translations?: Record<string, string>;
    descriptionTranslations?: Record<string, string>;
    extraData?: Record<string, unknown>;
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

    const nextTranslations = data.translations !== undefined
      ? this.normalizeTranslationInput(data.translations)
      : {};
    const nextDescriptionTranslations = data.descriptionTranslations !== undefined
      ? this.normalizeTranslationInput(data.descriptionTranslations)
      : {};
    const extraData = this.mergeExtraData(
      data.extraData ?? null,
      nextTranslations,
      nextDescriptionTranslations,
    );

    const results = await prisma.$queryRawUnsafe<StoredSystemDictionaryType[]>(`
      INSERT INTO public.system_dictionary (
        id, code, name_en, name_zh, name_ja, 
        description_en, description_zh, description_ja,
        extra_data, sort_order, is_active, created_at, updated_at, version
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, true, now(), now(), 1
      )
      RETURNING 
        id, code, name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description_en as "descriptionEn", description_zh as "descriptionZh", description_ja as "descriptionJa",
        extra_data as "extraData",
        sort_order as "sortOrder", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
    `,
      data.code,
      data.nameEn || nextTranslations.en,
      data.nameZh ?? nextTranslations.zh_HANS ?? null,
      data.nameJa ?? nextTranslations.ja ?? null,
      data.descriptionEn ?? nextDescriptionTranslations.en ?? null,
      data.descriptionZh ?? nextDescriptionTranslations.zh_HANS ?? null,
      data.descriptionJa ?? nextDescriptionTranslations.ja ?? null,
      extraData ? JSON.stringify(extraData) : null,
      data.sortOrder || 0,
    );

    return this.decorateType(results[0]);
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
      translations?: Record<string, string>;
      descriptionTranslations?: Record<string, string>;
      extraData?: Record<string, unknown>;
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

    const nextTranslations = data.translations !== undefined
      ? this.normalizeTranslationInput(data.translations)
      : current.translations;
    const nextDescriptionTranslations = data.descriptionTranslations !== undefined
      ? this.normalizeTranslationInput(data.descriptionTranslations)
      : current.descriptionTranslations;
    const extraData = this.mergeExtraData(
      data.extraData ?? current.extraData,
      nextTranslations,
      nextDescriptionTranslations,
    );

    const normalizedData = {
      ...data,
      nameEn: data.nameEn ?? nextTranslations.en,
      nameZh: data.nameZh ?? nextTranslations.zh_HANS,
      nameJa: data.nameJa ?? nextTranslations.ja,
      descriptionEn: data.descriptionEn ?? nextDescriptionTranslations.en,
      descriptionZh: data.descriptionZh ?? nextDescriptionTranslations.zh_HANS,
      descriptionJa: data.descriptionJa ?? nextDescriptionTranslations.ja,
      extraData,
    };

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
      extraData: 'extra_data',
      sortOrder: 'sort_order',
    };

    for (const [key, dbField] of Object.entries(fieldMappings)) {
      if (normalizedData[key as keyof typeof normalizedData] !== undefined) {
        if (key === 'extraData') {
          updates.push(`${dbField} = $${paramIndex++}::jsonb`);
          params.push(normalizedData.extraData ? JSON.stringify(normalizedData.extraData) : null);
          continue;
        }

        updates.push(`${dbField} = $${paramIndex++}`);
        params.push(normalizedData[key as keyof typeof normalizedData]);
      }
    }

    updates.push('updated_at = now()');
    updates.push('version = version + 1');

    const results = await prisma.$queryRawUnsafe<StoredSystemDictionaryType[]>(`
      UPDATE public.system_dictionary
      SET ${updates.join(', ')}
      WHERE code = $1
      RETURNING 
        id, code, name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
        description_en as "descriptionEn", description_zh as "descriptionZh", description_ja as "descriptionJa",
        extra_data as "extraData",
        sort_order as "sortOrder", is_active as "isActive",
        created_at as "createdAt", updated_at as "updatedAt", version
    `, ...params);

    return this.decorateType(results[0]);
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
      translations?: Record<string, string>;
      descriptionTranslations?: Record<string, string>;
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

    const nextTranslations = data.translations !== undefined
      ? this.normalizeTranslationInput(data.translations)
      : {};
    const nextDescriptionTranslations = data.descriptionTranslations !== undefined
      ? this.normalizeTranslationInput(data.descriptionTranslations)
      : {};
    const mergedExtraData = this.mergeExtraData(
      data.extraData ?? null,
      nextTranslations,
      nextDescriptionTranslations,
    );
    const extraDataJson = mergedExtraData ? JSON.stringify(mergedExtraData) : null;

    const results = await prisma.$queryRawUnsafe<StoredSystemDictionaryItem[]>(`
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
      data.nameEn || nextTranslations.en,
      data.nameZh ?? nextTranslations.zh_HANS ?? null,
      data.nameJa ?? nextTranslations.ja ?? null,
      data.descriptionEn ?? nextDescriptionTranslations.en ?? null,
      data.descriptionZh ?? nextDescriptionTranslations.zh_HANS ?? null,
      data.descriptionJa ?? nextDescriptionTranslations.ja ?? null,
      data.sortOrder || 0,
      extraDataJson
    );

    return this.decorateItem(results[0]);
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
      translations?: Record<string, string>;
      descriptionTranslations?: Record<string, string>;
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

    const nextTranslations = data.translations !== undefined
      ? this.normalizeTranslationInput(data.translations)
      : current.translations;
    const nextDescriptionTranslations = data.descriptionTranslations !== undefined
      ? this.normalizeTranslationInput(data.descriptionTranslations)
      : current.descriptionTranslations;
    const mergedExtraData = this.mergeExtraData(
      data.extraData ?? current.extraData,
      nextTranslations,
      nextDescriptionTranslations,
    );
    const normalizedData = {
      ...data,
      nameEn: data.nameEn ?? nextTranslations.en,
      nameZh: data.nameZh ?? nextTranslations.zh_HANS,
      nameJa: data.nameJa ?? nextTranslations.ja,
      descriptionEn: data.descriptionEn ?? nextDescriptionTranslations.en,
      descriptionZh: data.descriptionZh ?? nextDescriptionTranslations.zh_HANS,
      descriptionJa: data.descriptionJa ?? nextDescriptionTranslations.ja,
      extraData: mergedExtraData,
    };

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
      if (normalizedData[key as keyof typeof normalizedData] !== undefined) {
        updates.push(`${dbField} = $${paramIndex++}`);
        params.push(normalizedData[key as keyof typeof normalizedData]);
      }
    }

    // Handle extraData separately (JSONB)
    if (normalizedData.extraData !== undefined) {
      updates.push(`extra_data = $${paramIndex++}::jsonb`);
      params.push(normalizedData.extraData ? JSON.stringify(normalizedData.extraData) : null);
    }

    updates.push('updated_at = now()');
    updates.push('version = version + 1');

    const results = await prisma.$queryRawUnsafe<StoredSystemDictionaryItem[]>(`
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

    return this.decorateItem(results[0]);
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

    const results = await prisma.$queryRawUnsafe<StoredSystemDictionaryItem[]>(`
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

    return this.decorateItem(results[0]);
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

    const results = await prisma.$queryRawUnsafe<StoredSystemDictionaryItem[]>(`
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

    return this.decorateItem(results[0]);
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  private decorateType(entity: StoredSystemDictionaryType): SystemDictionaryType {
    return {
      ...entity,
      translations: this.buildTranslations(entity, entity.extraData),
      descriptionTranslations: this.buildDescriptionTranslations(entity, entity.extraData),
    };
  }

  private decorateItem(entity: StoredSystemDictionaryItem): SystemDictionaryItem {
    return {
      ...entity,
      translations: this.buildTranslations(entity, entity.extraData),
      descriptionTranslations: this.buildDescriptionTranslations(entity, entity.extraData),
    };
  }

  private buildTranslations(
    entity: { nameEn: string; nameZh?: string | null; nameJa?: string | null },
    extraData: Record<string, unknown> | null,
  ): TranslationMap {
    const extraTranslations = this.readExtraTranslationMap(extraData, 'translations');

    return this.withLegacyTranslations(extraTranslations, {
      en: entity.nameEn,
      zh_HANS: entity.nameZh,
      ja: entity.nameJa,
    });
  }

  private buildDescriptionTranslations(
    entity: { descriptionEn?: string | null; descriptionZh?: string | null; descriptionJa?: string | null },
    extraData: Record<string, unknown> | null,
  ): TranslationMap {
    const extraTranslations = this.readExtraTranslationMap(extraData, 'descriptionTranslations');

    return this.withLegacyTranslations(extraTranslations, {
      en: entity.descriptionEn,
      zh_HANS: entity.descriptionZh,
      ja: entity.descriptionJa,
    });
  }

  private withLegacyTranslations(
    translations: TranslationMap,
    legacy: Record<string, string | null | undefined>,
  ): TranslationMap {
    const result: TranslationMap = { ...translations };

    Object.entries(legacy).forEach(([locale, value]) => {
      if (typeof value === 'string' && value.trim().length > 0) {
        result[locale] = value.trim();
      }
    });

    return result;
  }

  private readExtraTranslationMap(
    extraData: Record<string, unknown> | null,
    key: 'translations' | 'descriptionTranslations',
  ): TranslationMap {
    const candidate = extraData?.[key];

    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      return {};
    }

    const result: TranslationMap = {};

    Object.entries(candidate).forEach(([locale, value]) => {
      if (typeof value !== 'string') {
        return;
      }

      const normalizedLocale = this.normalizeTranslationKey(locale);
      const trimmedValue = value.trim();

      if (!normalizedLocale || trimmedValue.length === 0) {
        return;
      }

      result[normalizedLocale] = trimmedValue;
    });

    return result;
  }

  private normalizeTranslationInput(input: Record<string, string>): TranslationMap {
    const result: TranslationMap = {};

    Object.entries(input).forEach(([locale, value]) => {
      const normalizedLocale = this.normalizeTranslationKey(locale);

      if (!normalizedLocale || typeof value !== 'string') {
        return;
      }

      const trimmedValue = value.trim();

      if (trimmedValue.length === 0) {
        return;
      }

      result[normalizedLocale] = trimmedValue;
    });

    return result;
  }

  private mergeExtraData(
    baseExtraData: Record<string, unknown> | null,
    translations: TranslationMap,
    descriptionTranslations: TranslationMap,
  ): Record<string, unknown> | null {
    const nextExtraData: Record<string, unknown> = {
      ...(baseExtraData ?? {}),
    };

    delete nextExtraData.translations;
    delete nextExtraData.descriptionTranslations;

    const extraTranslations = Object.fromEntries(
      Object.entries(translations).filter(([locale]) => !['en', 'zh_HANS', 'ja'].includes(locale)),
    );
    const extraDescriptionTranslations = Object.fromEntries(
      Object.entries(descriptionTranslations).filter(([locale]) => !['en', 'zh_HANS', 'ja'].includes(locale)),
    );

    if (Object.keys(extraTranslations).length > 0) {
      nextExtraData.translations = extraTranslations;
    }

    if (Object.keys(extraDescriptionTranslations).length > 0) {
      nextExtraData.descriptionTranslations = extraDescriptionTranslations;
    }

    return Object.keys(nextExtraData).length > 0 ? nextExtraData : null;
  }

  private normalizeTranslationKey(input?: string | null): string | null {
    if (!input) {
      return null;
    }

    const normalizedSupportedLocale = normalizeSupportedUiLocale(input);
    if (normalizedSupportedLocale) {
      return normalizedSupportedLocale;
    }

    const normalized = input.trim().replace(/-/g, '_');
    if (!normalized) {
      return null;
    }

    const [language, ...rest] = normalized.split('_').filter(Boolean);
    if (!language) {
      return null;
    }

    if (rest.length === 0) {
      return language.toLowerCase();
    }

    return `${language.toLowerCase()}_${rest.join('_').toUpperCase()}`;
  }

  private getLocalizedValue(
    translations: TranslationMap,
    language: string,
    fallback: string | null | undefined,
  ): string | null {
    const normalizedLocale = this.normalizeTranslationKey(language);

    if (normalizedLocale && translations[normalizedLocale]) {
      return translations[normalizedLocale];
    }

    if (normalizedLocale) {
      const [baseLanguage] = normalizedLocale.split('_');
      if (baseLanguage && translations[baseLanguage]) {
        return translations[baseLanguage];
      }
    }

    const localeFamily = resolveTrilingualLocaleFamily(language);
    if (localeFamily === 'zh') {
      return translations.zh_HANS || translations.zh_HANT || fallback || null;
    }

    if (localeFamily === 'ja') {
      return translations.ja || fallback || null;
    }

    return translations.en || fallback || null;
  }
}
