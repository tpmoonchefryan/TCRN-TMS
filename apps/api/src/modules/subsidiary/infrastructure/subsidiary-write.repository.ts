// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';

import type { SubsidiaryData } from '../domain/subsidiary-read.policy';
import type {
  SubsidiaryCreateInput,
  SubsidiaryUpdateInput,
} from '../domain/subsidiary-write.policy';

const SUBSIDIARY_SELECT_FIELDS = `
  id, parent_id as "parentId", code, path, depth,
  name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
  extra_data as "extraData",
  description_en as "descriptionEn", description_zh as "descriptionZh",
  description_ja as "descriptionJa",
  sort_order as "sortOrder", is_active as "isActive",
  created_at as "createdAt", updated_at as "updatedAt", version
`;

@Injectable()
export class SubsidiaryWriteRepository {
  async create(
    tenantSchema: string,
    data: SubsidiaryCreateInput & {
      extraData?: Record<string, unknown> | null;
      path: string;
      depth: number;
    },
    userId: string,
  ): Promise<SubsidiaryData> {
    const results = await prisma.$queryRawUnsafe<SubsidiaryData[]>(`
      INSERT INTO "${tenantSchema}".subsidiary
        (id, parent_id, code, path, depth, name_en, name_zh, name_ja, extra_data,
         description_en, description_zh, description_ja,
         sort_order, is_active, created_at, updated_at, created_by, updated_by, version)
      VALUES
        (gen_random_uuid(), $1::uuid, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, true, now(), now(), $13::uuid, $13::uuid, 1)
      RETURNING
        ${SUBSIDIARY_SELECT_FIELDS}
    `,
    data.parentId || null,
    data.code,
    data.path,
    data.depth,
    data.nameEn,
    data.nameZh || null,
    data.nameJa || null,
    data.extraData ? JSON.stringify(data.extraData) : null,
    data.descriptionEn || null,
    data.descriptionZh || null,
    data.descriptionJa || null,
    data.sortOrder || 0,
    userId);

    return results[0];
  }

  async update(
    id: string,
    tenantSchema: string,
    data: SubsidiaryUpdateInput,
    userId: string,
  ): Promise<SubsidiaryData> {
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
    if (data.extraData !== undefined) {
      updates.push(`extra_data = $${paramIndex++}::jsonb`);
      params.push(data.extraData ? JSON.stringify(data.extraData) : null);
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
        ${SUBSIDIARY_SELECT_FIELDS}
    `, ...params);

    return results[0];
  }

  async deactivateCascade(
    tenantSchema: string,
    path: string,
    userId: string,
  ): Promise<{ subsidiaries: number; talents: number }> {
    const subsidiaries = await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".subsidiary
      SET is_active = false, updated_at = now(), updated_by = $2::uuid
      WHERE path LIKE $1
    `, `${path}%`, userId) as number;

    const talents = await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".talent
      SET is_active = false, updated_at = now(), updated_by = $2::uuid
      WHERE path LIKE $1
    `, `${path}%`, userId) as number;

    return {
      subsidiaries,
      talents,
    };
  }

  async deactivateSingle(
    id: string,
    tenantSchema: string,
    userId: string,
  ): Promise<void> {
    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".subsidiary
      SET is_active = false, updated_at = now(), updated_by = $2::uuid, version = version + 1
      WHERE id = $1::uuid
    `, id, userId);
  }

  async reactivate(
    id: string,
    tenantSchema: string,
    userId: string,
  ): Promise<void> {
    await prisma.$executeRawUnsafe(`
      UPDATE "${tenantSchema}".subsidiary
      SET is_active = true, updated_at = now(), updated_by = $2::uuid, version = version + 1
      WHERE id = $1::uuid
    `, id, userId);
  }
}
