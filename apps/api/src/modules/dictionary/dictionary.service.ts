// SPDX-License-Identifier: Apache-2.0
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { Prisma, prisma } from '@tcrn/database';
import {
  ErrorCodes,
  mergeLocalizedText,
  normalizeLocalizedText,
  pickLocalizedText,
  type LocalizedText,
  type PartialLocalizedText,
} from '@tcrn/shared';

import {
  localizedTextSearchExpression,
  readLocalizedText,
  stringifyLocalizedText,
} from '../../platform/persistence/localized-text.persistence';

interface StoredSystemDictionaryItemRaw {
  code: string;
  createdAt: Date;
  description: Prisma.JsonValue;
  dictionaryCode: string;
  extraData: Record<string, unknown> | null;
  id: string;
  isActive: boolean;
  name: Prisma.JsonValue;
  sortOrder: number;
  updatedAt: Date;
  version: number;
}

export interface SystemDictionaryItem {
  code: string;
  createdAt: Date;
  description: LocalizedText;
  dictionaryCode: string;
  extraData: Record<string, unknown> | null;
  id: string;
  isActive: boolean;
  localizedDescription: string;
  localizedName: string;
  name: LocalizedText;
  sortOrder: number;
  updatedAt: Date;
  version: number;
}

interface StoredSystemDictionaryTypeRaw {
  code: string;
  createdAt: Date;
  description: Prisma.JsonValue;
  extraData: Record<string, unknown> | null;
  id: string;
  isActive: boolean;
  name: Prisma.JsonValue;
  sortOrder: number;
  updatedAt: Date;
  version: number;
}

export interface SystemDictionaryType {
  code: string;
  createdAt: Date;
  description: LocalizedText;
  extraData: Record<string, unknown> | null;
  id: string;
  isActive: boolean;
  localizedDescription: string;
  localizedName: string;
  name: LocalizedText;
  sortOrder: number;
  updatedAt: Date;
  version: number;
}

@Injectable()
export class DictionaryService {
  async getTypes(
    language = 'en'
  ): Promise<Array<{ type: string; name: string; description: string | null; count: number }>> {
    const types = await prisma.$queryRawUnsafe<
      Array<StoredSystemDictionaryTypeRaw & { itemCount: bigint }>
    >(
      `
        SELECT
          d.id,
          d.code,
          d.name,
          d.description,
          d.extra_data as "extraData",
          d.sort_order as "sortOrder",
          d.is_active as "isActive",
          d.created_at as "createdAt",
          d.updated_at as "updatedAt",
          d.version,
          COUNT(i.id) as "itemCount"
        FROM public.system_dictionary d
        LEFT JOIN public.system_dictionary_item i ON i.dictionary_code = d.code AND i.is_active = true
        WHERE d.is_active = true
        GROUP BY d.id
        ORDER BY d.sort_order ASC, d.code ASC
      `
    );

    return types.map((type) => {
      const decorated = this.decorateType(type, language);
      return {
        type: decorated.code,
        name: decorated.localizedName,
        description: decorated.localizedDescription,
        count: Number(type.itemCount),
      };
    });
  }

  async getType(typeCode: string, language = 'en'): Promise<SystemDictionaryType | null> {
    const results = await prisma.$queryRawUnsafe<StoredSystemDictionaryTypeRaw[]>(
      `
        SELECT
          id,
          code,
          name,
          description,
          extra_data as "extraData",
          sort_order as "sortOrder",
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version
        FROM public.system_dictionary
        WHERE code = $1
        LIMIT 1
      `,
      typeCode
    );

    return results[0] ? this.decorateType(results[0], language) : null;
  }

  async getByType(
    typeCode: string,
    options: {
      includeInactive?: boolean;
      language?: string;
      page?: number;
      pageSize?: number;
      search?: string;
    } = {}
  ): Promise<{ data: SystemDictionaryItem[]; total: number } | null> {
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
      whereClause += ` AND (code ILIKE $${paramIndex} OR ${localizedTextSearchExpression('name', `$${paramIndex}`)})`;
      params.push(`%${search}%`);
      paramIndex += 1;
    }

    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*) as count
        FROM public.system_dictionary_item
        WHERE ${whereClause}
      `,
      ...params
    );
    const total = Number(countResult[0]?.count ?? 0);

    const offset = (page - 1) * pageSize;
    const items = await prisma.$queryRawUnsafe<StoredSystemDictionaryItemRaw[]>(
      `
        SELECT
          id,
          dictionary_code as "dictionaryCode",
          code,
          name,
          description,
          sort_order as "sortOrder",
          is_active as "isActive",
          extra_data as "extraData",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version
        FROM public.system_dictionary_item
        WHERE ${whereClause}
        ORDER BY sort_order ASC, code ASC
        LIMIT ${pageSize} OFFSET ${offset}
      `,
      ...params
    );

    return {
      data: items.map((item) => this.decorateItem(item, language)),
      total,
    };
  }

  async getItem(
    typeCode: string,
    itemCode: string,
    language = 'en'
  ): Promise<SystemDictionaryItem | null> {
    const results = await prisma.$queryRawUnsafe<StoredSystemDictionaryItemRaw[]>(
      `
        SELECT
          id,
          dictionary_code as "dictionaryCode",
          code,
          name,
          description,
          sort_order as "sortOrder",
          is_active as "isActive",
          extra_data as "extraData",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version
        FROM public.system_dictionary_item
        WHERE dictionary_code = $1 AND code = $2
        LIMIT 1
      `,
      typeCode,
      itemCode
    );

    return results[0] ? this.decorateItem(results[0], language) : null;
  }

  async getItemById(id: string, language = 'en'): Promise<SystemDictionaryItem | null> {
    const results = await prisma.$queryRawUnsafe<StoredSystemDictionaryItemRaw[]>(
      `
        SELECT
          id,
          dictionary_code as "dictionaryCode",
          code,
          name,
          description,
          sort_order as "sortOrder",
          is_active as "isActive",
          extra_data as "extraData",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version
        FROM public.system_dictionary_item
        WHERE id = $1::uuid
        LIMIT 1
      `,
      id
    );

    return results[0] ? this.decorateItem(results[0], language) : null;
  }

  async hasType(typeCode: string): Promise<boolean> {
    const results = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `
        SELECT EXISTS (
          SELECT 1 FROM public.system_dictionary WHERE code = $1 AND is_active = true
        ) as exists
      `,
      typeCode
    );
    return results[0]?.exists ?? false;
  }

  async createType(data: {
    code: string;
    description?: PartialLocalizedText;
    extraData?: Record<string, unknown>;
    name: LocalizedText;
    sortOrder?: number;
  }): Promise<SystemDictionaryType> {
    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        SELECT id
        FROM public.system_dictionary
        WHERE code = $1
        LIMIT 1
      `,
      data.code
    );

    if (existing.length > 0) {
      throw new BadRequestException({
        code: ErrorCodes.CODE_ALREADY_EXISTS,
        message: 'Dictionary type code already exists',
      });
    }

    const name = normalizeLocalizedText(data.name, data.name.en);
    if (!name.en.trim()) {
      throw new BadRequestException('name.en is required');
    }

    const results = await prisma.$queryRawUnsafe<StoredSystemDictionaryTypeRaw[]>(
      `
        INSERT INTO public.system_dictionary (
          id,
          code,
          name,
          description,
          extra_data,
          sort_order,
          is_active,
          created_at,
          updated_at,
          version
        )
        VALUES (
          gen_random_uuid(),
          $1,
          $2::jsonb,
          $3::jsonb,
          $4::jsonb,
          $5,
          true,
          now(),
          now(),
          1
        )
        RETURNING
          id,
          code,
          name,
          description,
          extra_data as "extraData",
          sort_order as "sortOrder",
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version
      `,
      data.code,
      stringifyLocalizedText(name),
      stringifyLocalizedText(normalizeLocalizedText(data.description, name.en)),
      data.extraData ? JSON.stringify(data.extraData) : null,
      data.sortOrder ?? 0
    );

    return this.decorateType(results[0], 'en');
  }

  async updateType(
    code: string,
    data: {
      description?: PartialLocalizedText;
      extraData?: Record<string, unknown>;
      name?: PartialLocalizedText;
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
    let nextName = current.name;

    if (data.name !== undefined) {
      nextName = mergeLocalizedText(current.name, data.name);
      updates.push(`name = $${paramIndex++}::jsonb`);
      params.push(stringifyLocalizedText(nextName));
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}::jsonb`);
      params.push(
        stringifyLocalizedText(
          normalizeLocalizedText({ ...current.description, ...data.description }, nextName.en)
        )
      );
    }

    if (data.extraData !== undefined) {
      updates.push(`extra_data = $${paramIndex++}::jsonb`);
      params.push(data.extraData ? JSON.stringify(data.extraData) : null);
    }

    if (data.sortOrder !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      params.push(data.sortOrder);
    }

    if (updates.length === 0) {
      return current;
    }

    updates.push('updated_at = now()');
    updates.push('version = version + 1');

    const results = await prisma.$queryRawUnsafe<StoredSystemDictionaryTypeRaw[]>(
      `
        UPDATE public.system_dictionary
        SET ${updates.join(', ')}
        WHERE code = $1
        RETURNING
          id,
          code,
          name,
          description,
          extra_data as "extraData",
          sort_order as "sortOrder",
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version
      `,
      ...params
    );

    return this.decorateType(results[0], 'en');
  }

  async createItem(
    typeCode: string,
    data: {
      code: string;
      description?: PartialLocalizedText;
      extraData?: Record<string, unknown>;
      name: LocalizedText;
      sortOrder?: number;
    }
  ): Promise<SystemDictionaryItem> {
    const typeExists = await this.hasType(typeCode);
    if (!typeExists) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Dictionary type not found',
      });
    }

    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        SELECT id
        FROM public.system_dictionary_item
        WHERE dictionary_code = $1 AND code = $2
        LIMIT 1
      `,
      typeCode,
      data.code
    );

    if (existing.length > 0) {
      throw new BadRequestException({
        code: ErrorCodes.CODE_ALREADY_EXISTS,
        message: 'Dictionary item code already exists in this type',
      });
    }

    const name = normalizeLocalizedText(data.name, data.name.en);
    if (!name.en.trim()) {
      throw new BadRequestException('name.en is required');
    }

    const results = await prisma.$queryRawUnsafe<StoredSystemDictionaryItemRaw[]>(
      `
        INSERT INTO public.system_dictionary_item (
          id,
          dictionary_code,
          code,
          name,
          description,
          sort_order,
          is_active,
          extra_data,
          created_at,
          updated_at,
          version
        )
        VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3::jsonb,
          $4::jsonb,
          $5,
          true,
          $6::jsonb,
          now(),
          now(),
          1
        )
        RETURNING
          id,
          dictionary_code as "dictionaryCode",
          code,
          name,
          description,
          sort_order as "sortOrder",
          is_active as "isActive",
          extra_data as "extraData",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version
      `,
      typeCode,
      data.code,
      stringifyLocalizedText(name),
      stringifyLocalizedText(normalizeLocalizedText(data.description, name.en)),
      data.sortOrder ?? 0,
      data.extraData ? JSON.stringify(data.extraData) : null
    );

    return this.decorateItem(results[0], 'en');
  }

  async updateItem(
    id: string,
    data: {
      description?: PartialLocalizedText;
      extraData?: Record<string, unknown>;
      name?: PartialLocalizedText;
      sortOrder?: number;
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
    let nextName = current.name;

    if (data.name !== undefined) {
      nextName = mergeLocalizedText(current.name, data.name);
      updates.push(`name = $${paramIndex++}::jsonb`);
      params.push(stringifyLocalizedText(nextName));
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}::jsonb`);
      params.push(
        stringifyLocalizedText(
          normalizeLocalizedText({ ...current.description, ...data.description }, nextName.en)
        )
      );
    }

    if (data.sortOrder !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      params.push(data.sortOrder);
    }

    if (data.extraData !== undefined) {
      updates.push(`extra_data = $${paramIndex++}::jsonb`);
      params.push(data.extraData ? JSON.stringify(data.extraData) : null);
    }

    if (updates.length === 0) {
      return current;
    }

    updates.push('updated_at = now()');
    updates.push('version = version + 1');

    const results = await prisma.$queryRawUnsafe<StoredSystemDictionaryItemRaw[]>(
      `
        UPDATE public.system_dictionary_item
        SET ${updates.join(', ')}
        WHERE id = $1::uuid
        RETURNING
          id,
          dictionary_code as "dictionaryCode",
          code,
          name,
          description,
          sort_order as "sortOrder",
          is_active as "isActive",
          extra_data as "extraData",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version
      `,
      ...params
    );

    return this.decorateItem(results[0], 'en');
  }

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

    const results = await prisma.$queryRawUnsafe<StoredSystemDictionaryItemRaw[]>(
      `
        UPDATE public.system_dictionary_item
        SET is_active = false, updated_at = now(), version = version + 1
        WHERE id = $1::uuid
        RETURNING
          id,
          dictionary_code as "dictionaryCode",
          code,
          name,
          description,
          sort_order as "sortOrder",
          is_active as "isActive",
          extra_data as "extraData",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version
      `,
      id
    );

    return this.decorateItem(results[0], 'en');
  }

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

    const results = await prisma.$queryRawUnsafe<StoredSystemDictionaryItemRaw[]>(
      `
        UPDATE public.system_dictionary_item
        SET is_active = true, updated_at = now(), version = version + 1
        WHERE id = $1::uuid
        RETURNING
          id,
          dictionary_code as "dictionaryCode",
          code,
          name,
          description,
          sort_order as "sortOrder",
          is_active as "isActive",
          extra_data as "extraData",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version
      `,
      id
    );

    return this.decorateItem(results[0], 'en');
  }

  private decorateType(
    entity: StoredSystemDictionaryTypeRaw,
    language: string
  ): SystemDictionaryType {
    const name = readLocalizedText(entity.name, 'system_dictionary.name');
    const description = readLocalizedText(entity.description, 'system_dictionary.description');

    return {
      ...entity,
      name,
      description,
      localizedName: pickLocalizedText(name, language),
      localizedDescription: pickLocalizedText(description, language),
    };
  }

  private decorateItem(
    entity: StoredSystemDictionaryItemRaw,
    language: string
  ): SystemDictionaryItem {
    const name = readLocalizedText(entity.name, 'system_dictionary_item.name');
    const description = readLocalizedText(entity.description, 'system_dictionary_item.description');

    return {
      ...entity,
      name,
      description,
      localizedName: pickLocalizedText(name, language),
      localizedDescription: pickLocalizedText(description, language),
    };
  }
}
