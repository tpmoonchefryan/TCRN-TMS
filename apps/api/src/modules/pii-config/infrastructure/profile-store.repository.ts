// SPDX-License-Identifier: Apache-2.0
import { Injectable } from '@nestjs/common';

import { Prisma } from '@tcrn/database';

import {
  localizedTextSearchExpression,
  readLocalizedText,
  stringifyLocalizedText,
} from '../../../platform/persistence/localized-text.persistence';
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

type ProfileStoreListRawRow = Omit<ProfileStoreListRow, 'name'> & {
  name: Prisma.JsonValue;
};

type ProfileStoreDetailRawRow = Omit<ProfileStoreDetailRow, 'name' | 'description'> & {
  name: Prisma.JsonValue;
  description: Prisma.JsonValue;
};

type ProfileStoreCreateRawRow = Omit<ProfileStoreCreateRow, 'name'> & {
  name: Prisma.JsonValue;
};

type ProfileStoreUpdateLookupRawRow = Omit<ProfileStoreUpdateLookupRow, 'name' | 'description'> & {
  name: Prisma.JsonValue;
  description: Prisma.JsonValue;
};

type ProfileStoreUpdateRawRow = Omit<ProfileStoreUpdateRow, 'name' | 'description'> & {
  name: Prisma.JsonValue;
  description: Prisma.JsonValue;
};

const mapProfileStoreListRow = (row: ProfileStoreListRawRow): ProfileStoreListRow => ({
  ...row,
  name: readLocalizedText(row.name, 'profile_store.name'),
});

const mapProfileStoreDetailRow = (row: ProfileStoreDetailRawRow): ProfileStoreDetailRow => ({
  ...row,
  name: readLocalizedText(row.name, 'profile_store.name'),
  description: readLocalizedText(row.description, 'profile_store.description'),
});

const mapProfileStoreCreateRow = (row: ProfileStoreCreateRawRow): ProfileStoreCreateRow => ({
  ...row,
  name: readLocalizedText(row.name, 'profile_store.name'),
});

const mapProfileStoreUpdateLookupRow = (
  row: ProfileStoreUpdateLookupRawRow
): ProfileStoreUpdateLookupRow => ({
  ...row,
  name: readLocalizedText(row.name, 'profile_store.name'),
  description: readLocalizedText(row.description, 'profile_store.description'),
});

const mapProfileStoreUpdateRow = (row: ProfileStoreUpdateRawRow): ProfileStoreUpdateRow => ({
  ...row,
  name: readLocalizedText(row.name, 'profile_store.name'),
  description: readLocalizedText(row.description, 'profile_store.description'),
});

@Injectable()
export class ProfileStoreRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findMany(
    schema: string,
    includeInactive: boolean,
    search: string | undefined,
    pageSize: number,
    offset: number
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
          OR ${localizedTextSearchExpression('ps.name', `$${paramIndex}`)}
          OR COALESCE(ps.extra_data::text, '') ILIKE $${paramIndex}
        )`
      );
      params.push(`%${search}%`);
      paramIndex += 1;
    }

    const whereClause = whereClauses.length > 0 ? whereClauses.join(' AND ') : '1=1';
    const limitParamIndex = paramIndex;
    const offsetParamIndex = paramIndex + 1;
    params.push(pageSize, offset);

    const rows = await prisma.$queryRawUnsafe<ProfileStoreListRawRow[]>(
      `
        SELECT
          ps.id,
          ps.code,
          ps.name,
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
      ...params
    );

    return rows.map(mapProfileStoreListRow);
  }

  async countMany(schema: string, includeInactive: boolean, search?: string): Promise<number> {
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
          OR ${localizedTextSearchExpression('ps.name', `$${paramIndex}`)}
          OR COALESCE(ps.extra_data::text, '') ILIKE $${paramIndex}
        )`
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
      ...params
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
      storeId
    );

    return Number(result[0]?.count ?? 0);
  }

  async countCustomerByStoreId(schema: string, storeId: string): Promise<number> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*) as count
        FROM "${schema}".customer_profile
        WHERE profile_store_id = $1::uuid
      `,
      storeId
    );

    return Number(result[0]?.count ?? 0);
  }

  async findById(schema: string, id: string): Promise<ProfileStoreDetailRow | null> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<ProfileStoreDetailRawRow[]>(
      `
        SELECT
          ps.id,
          ps.code,
          ps.name,
          ps.description,
          ps.extra_data as "extraData",
          ps.is_default as "isDefault",
          ps.is_active as "isActive",
          ps.created_at as "createdAt",
          ps.updated_at as "updatedAt",
          ps.version
        FROM "${schema}".profile_store ps
        WHERE ps.id = $1::uuid
      `,
      id
    );

    return result[0] ? mapProfileStoreDetailRow(result[0]) : null;
  }

  async findByCode(schema: string, code: string): Promise<{ id: string } | null> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        SELECT id
        FROM "${schema}".profile_store
        WHERE code = $1
      `,
      code
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
    userId: string
  ): Promise<ProfileStoreCreateRow> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<ProfileStoreCreateRawRow[]>(
      `
        INSERT INTO "${schema}".profile_store (
          id,
          code,
          name,
          description,
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
          $2::jsonb,
          $3::jsonb,
          $4,
          true,
          0,
          now(),
          now(),
          $5::uuid,
          $5::uuid,
          1
        )
        RETURNING
          id,
          code,
          name,
          is_default as "isDefault",
          created_at as "createdAt"
      `,
      payload.code,
      stringifyLocalizedText(payload.name),
      stringifyLocalizedText(payload.description),
      payload.isDefault,
      userId
    );

    return mapProfileStoreCreateRow(result[0]);
  }

  async findForUpdate(schema: string, id: string): Promise<ProfileStoreUpdateLookupRow | null> {
    const prisma = this.databaseService.getPrisma();
    const result = await prisma.$queryRawUnsafe<ProfileStoreUpdateLookupRawRow[]>(
      `
        SELECT
          id,
          code,
          name,
          description,
          extra_data as "extraData",
          is_active as "isActive",
          is_default as "isDefault",
          version
        FROM "${schema}".profile_store
        WHERE id = $1::uuid
      `,
      id
    );

    return result[0] ? mapProfileStoreUpdateLookupRow(result[0]) : null;
  }

  async update(
    schema: string,
    id: string,
    changes: ProfileStoreFieldChange[],
    userId: string
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
      const cast = change.field === 'name' || change.field === 'description' ? '::jsonb' : '';
      updates.push(`${this.toSnakeCase(change.field)} = $${paramIndex}${cast}`);
      params.push(
        cast ? stringifyLocalizedText(change.value as ProfileStoreUpdateRow['name']) : change.value
      );
      paramIndex++;
    }

    const result = await prisma.$queryRawUnsafe<ProfileStoreUpdateRawRow[]>(
      `
        UPDATE "${schema}".profile_store
        SET ${updates.join(', ')}
        WHERE id = $1::uuid
        RETURNING
          id,
          code,
          name,
          description,
          extra_data as "extraData",
          is_active as "isActive",
          is_default as "isDefault",
          version,
          updated_at as "updatedAt"
      `,
      ...params
    );

    return mapProfileStoreUpdateRow(result[0]);
  }

  private toSnakeCase(value: string): string {
    return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
