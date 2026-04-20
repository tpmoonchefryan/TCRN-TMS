// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import type {
  ProfileStoreCreatePayload,
  ProfileStoreCreateRow,
  ProfileStoreDetailRow,
  ProfileStoreFieldChange,
  ProfileStoreListRow,
  ProfileStoreUpdateLookupRow,
  ProfileStoreUpdateRow,
} from '../domain/profile-store.policy';

@Injectable()
export class ProfileStoreRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findMany(
    schema: string,
    includeInactive: boolean,
    search: string | undefined,
    pageSize: number,
    offset: number,
  ): Promise<ProfileStoreListRow[]> {
    const prisma = this.databaseService.getPrisma();
    const whereClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (!includeInactive) {
      whereClauses.push('ps.is_active = true');
    }

    if (search) {
      whereClauses.push(
        `(
          ps.code ILIKE $${paramIndex}
          OR ps.name_en ILIKE $${paramIndex}
          OR COALESCE(ps.name_zh, '') ILIKE $${paramIndex}
          OR COALESCE(ps.name_ja, '') ILIKE $${paramIndex}
          OR COALESCE(ps.extra_data::text, '') ILIKE $${paramIndex}
        )`,
      );
      params.push(`%${search}%`);
      paramIndex += 1;
    }

    const whereClause = whereClauses.length > 0 ? whereClauses.join(' AND ') : '1=1';
    const limitParamIndex = paramIndex;
    const offsetParamIndex = paramIndex + 1;
    params.push(pageSize, offset);

    return prisma.$queryRawUnsafe<ProfileStoreListRow[]>(
      `
        SELECT
          ps.id,
          ps.code,
          ps.name_en as "nameEn",
          ps.name_zh as "nameZh",
          ps.name_ja as "nameJa",
          ps.extra_data as "extraData",
          ps.is_default as "isDefault",
          ps.is_active as "isActive",
          ps.created_at as "createdAt",
          ps.version
        FROM "${schema}".profile_store ps
        WHERE ${whereClause}
        ORDER BY ps.is_default DESC, ps.created_at DESC
        LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
      `,
      ...params,
    );
  }

  async countMany(
    schema: string,
    includeInactive: boolean,
    search?: string,
  ): Promise<number> {
    const prisma = this.databaseService.getPrisma();
    const whereClauses: string[] = [];
    const params: unknown[] = [];
    const paramIndex = 1;

    if (!includeInactive) {
      whereClauses.push('ps.is_active = true');
    }

    if (search) {
      whereClauses.push(
        `(
          ps.code ILIKE $${paramIndex}
          OR ps.name_en ILIKE $${paramIndex}
          OR COALESCE(ps.name_zh, '') ILIKE $${paramIndex}
          OR COALESCE(ps.name_ja, '') ILIKE $${paramIndex}
          OR COALESCE(ps.extra_data::text, '') ILIKE $${paramIndex}
        )`,
      );
      params.push(`%${search}%`);
    }

    const whereClause = whereClauses.length > 0 ? whereClauses.join(' AND ') : '1=1';
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*) as count
        FROM "${schema}".profile_store ps
        WHERE ${whereClause}
      `,
      ...params,
    );

    return Number(result[0]?.count ?? 0);
  }

  async countTalentByStoreId(schema: string, storeId: string): Promise<number> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*) as count
        FROM "${schema}".talent
        WHERE profile_store_id = $1::uuid
      `,
      storeId,
    );

    return Number(result[0]?.count ?? 0);
  }

  async countCustomerByStoreId(
    schema: string,
    storeId: string,
  ): Promise<number> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*) as count
        FROM "${schema}".customer_profile
        WHERE profile_store_id = $1::uuid
      `,
      storeId,
    );

    return Number(result[0]?.count ?? 0);
  }

  async findById(
    schema: string,
    id: string,
  ): Promise<ProfileStoreDetailRow | null> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<ProfileStoreDetailRow[]>(
      `
        SELECT
          ps.id,
          ps.code,
          ps.name_en as "nameEn",
          ps.name_zh as "nameZh",
          ps.name_ja as "nameJa",
          ps.description_en as "descriptionEn",
          ps.description_zh as "descriptionZh",
          ps.description_ja as "descriptionJa",
          ps.extra_data as "extraData",
          ps.is_default as "isDefault",
          ps.is_active as "isActive",
          ps.created_at as "createdAt",
          ps.updated_at as "updatedAt",
          ps.version
        FROM "${schema}".profile_store ps
        WHERE ps.id = $1::uuid
      `,
      id,
    );

    return result[0] ?? null;
  }

  async findByCode(
    schema: string,
    code: string,
  ): Promise<{ id: string } | null> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        SELECT id
        FROM "${schema}".profile_store
        WHERE code = $1
      `,
      code,
    );

    return result[0] ?? null;
  }

  async unsetDefaultStores(schema: string): Promise<void> {
    const prisma = this.databaseService.getPrisma();
    await prisma.$executeRawUnsafe(`
      UPDATE "${schema}".profile_store
      SET is_default = false
      WHERE is_default = true
    `);
  }

  async create(
    schema: string,
    payload: ProfileStoreCreatePayload,
    userId: string,
  ): Promise<ProfileStoreCreateRow> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<ProfileStoreCreateRow[]>(
      `
        INSERT INTO "${schema}".profile_store (
          id,
          code,
          name_en,
          name_zh,
          name_ja,
          description_en,
          description_zh,
          description_ja,
          extra_data,
          is_default,
          is_active,
          sort_order,
          created_at,
          updated_at,
          created_by,
          updated_by,
          version
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8::jsonb,
          $9,
          true,
          0,
          now(),
          now(),
          $10::uuid,
          $10::uuid,
          1
        )
        RETURNING
          id,
          code,
          name_en as "nameEn",
          is_default as "isDefault",
          created_at as "createdAt"
      `,
      payload.code,
      payload.nameEn,
      payload.nameZh,
      payload.nameJa,
      payload.descriptionEn,
      payload.descriptionZh,
      payload.descriptionJa,
      payload.extraData ? JSON.stringify(payload.extraData) : null,
      payload.isDefault,
      userId,
    );

    return result[0];
  }

  async findForUpdate(
    schema: string,
    id: string,
  ): Promise<ProfileStoreUpdateLookupRow | null> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<ProfileStoreUpdateLookupRow[]>(
      `
        SELECT
          id,
          code,
          name_en as "nameEn",
          name_zh as "nameZh",
          name_ja as "nameJa",
          description_en as "descriptionEn",
          description_zh as "descriptionZh",
          description_ja as "descriptionJa",
          extra_data as "extraData",
          is_active as "isActive",
          is_default as "isDefault",
          version
        FROM "${schema}".profile_store
        WHERE id = $1::uuid
      `,
      id,
    );

    return result[0] ?? null;
  }

  async update(
    schema: string,
    id: string,
    changes: ProfileStoreFieldChange[],
    userId: string,
  ): Promise<ProfileStoreUpdateRow> {
    const prisma = this.databaseService.getPrisma();
    const updates: string[] = [
      'updated_at = now()',
      'updated_by = $2::uuid',
      'version = version + 1',
    ];
    const params: unknown[] = [id, userId];
    let paramIndex = 3;

    for (const change of changes) {
      const cast = change.field === 'extraData' ? '::jsonb' : '';
      updates.push(`${this.toSnakeCase(change.field)} = $${paramIndex}${cast}`);
      params.push(change.field === 'extraData' && change.value && typeof change.value === 'object'
        ? JSON.stringify(change.value)
        : change.value);
      paramIndex++;
    }

    const result = await prisma.$queryRawUnsafe<ProfileStoreUpdateRow[]>(
      `
        UPDATE "${schema}".profile_store
        SET ${updates.join(', ')}
        WHERE id = $1::uuid
        RETURNING
          id,
          code,
          name_en as "nameEn",
          name_zh as "nameZh",
          name_ja as "nameJa",
          description_en as "descriptionEn",
          description_zh as "descriptionZh",
          description_ja as "descriptionJa",
          extra_data as "extraData",
          is_active as "isActive",
          is_default as "isDefault",
          version,
          updated_at as "updatedAt"
      `,
      ...params,
    );

    return result[0];
  }

  private toSnakeCase(value: string): string {
    return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
