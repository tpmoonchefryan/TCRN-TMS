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
    pageSize: number,
    offset: number,
  ): Promise<ProfileStoreListRow[]> {
    const prisma = this.databaseService.getPrisma();
    const whereClause = includeInactive ? '1=1' : 'ps.is_active = true';

    return prisma.$queryRawUnsafe<ProfileStoreListRow[]>(
      `
        SELECT
          ps.id,
          ps.code,
          ps.name_en as "nameEn",
          ps.name_zh as "nameZh",
          ps.name_ja as "nameJa",
          ps.is_default as "isDefault",
          ps.is_active as "isActive",
          ps.created_at as "createdAt",
          ps.version
        FROM "${schema}".profile_store ps
        WHERE ${whereClause}
        ORDER BY ps.is_default DESC, ps.created_at DESC
        LIMIT $1 OFFSET $2
      `,
      pageSize,
      offset,
    );
  }

  async countMany(schema: string, includeInactive: boolean): Promise<number> {
    const prisma = this.databaseService.getPrisma();
    const whereClause = includeInactive ? '1=1' : 'ps.is_active = true';
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*) as count
        FROM "${schema}".profile_store ps
        WHERE ${whereClause}
      `,
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
          $8,
          true,
          0,
          now(),
          now(),
          $9::uuid,
          $9::uuid,
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
      updates.push(`${this.toSnakeCase(change.field)} = $${paramIndex}`);
      params.push(change.value);
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
