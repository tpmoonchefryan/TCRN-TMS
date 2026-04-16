// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';

import type {
  SubsidiaryData,
  SubsidiaryListQuery,
} from '../domain/subsidiary-read.policy';

const SUBSIDIARY_SELECT_FIELDS = `
  id, parent_id as "parentId", code, path, depth,
  name_en as "nameEn", name_zh as "nameZh", name_ja as "nameJa",
  description_en as "descriptionEn", description_zh as "descriptionZh",
  description_ja as "descriptionJa",
  sort_order as "sortOrder", is_active as "isActive",
  created_at as "createdAt", updated_at as "updatedAt", version
`;

@Injectable()
export class SubsidiaryReadRepository {
  async findById(id: string, tenantSchema: string): Promise<SubsidiaryData | null> {
    const results = await prisma.$queryRawUnsafe<SubsidiaryData[]>(`
      SELECT
        ${SUBSIDIARY_SELECT_FIELDS}
      FROM "${tenantSchema}".subsidiary
      WHERE id = $1::uuid
    `, id);

    return results[0] ?? null;
  }

  async findByCode(code: string, tenantSchema: string): Promise<SubsidiaryData | null> {
    const results = await prisma.$queryRawUnsafe<SubsidiaryData[]>(`
      SELECT
        ${SUBSIDIARY_SELECT_FIELDS}
      FROM "${tenantSchema}".subsidiary
      WHERE code = $1
    `, code);

    return results[0] ?? null;
  }

  list(tenantSchema: string, query: SubsidiaryListQuery): Promise<SubsidiaryData[]> {
    return prisma.$queryRawUnsafe<SubsidiaryData[]>(`
      SELECT
        ${SUBSIDIARY_SELECT_FIELDS}
      FROM "${tenantSchema}".subsidiary
      WHERE ${query.whereClause}
      ORDER BY ${query.orderBy}
      LIMIT ${query.pageSize} OFFSET ${query.offset}
    `, ...query.params);
  }

  async count(tenantSchema: string, query: SubsidiaryListQuery): Promise<number> {
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count
      FROM "${tenantSchema}".subsidiary
      WHERE ${query.whereClause}
    `, ...query.params);

    return Number(countResult[0]?.count || 0);
  }

  async getChildrenCount(id: string, tenantSchema: string): Promise<number> {
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count
      FROM "${tenantSchema}".subsidiary
      WHERE parent_id = $1::uuid
    `, id);

    return Number(result[0]?.count || 0);
  }

  async getTalentCount(id: string, tenantSchema: string): Promise<number> {
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count
      FROM "${tenantSchema}".talent
      WHERE subsidiary_id = $1::uuid
    `, id);

    return Number(result[0]?.count || 0);
  }
}
