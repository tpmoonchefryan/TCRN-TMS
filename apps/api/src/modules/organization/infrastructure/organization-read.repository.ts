// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';

import {
  getTalentVisibilityClause,
  type RawSubsidiary,
  type RawTalent,
} from '../domain/organization-read.policy';

@Injectable()
export class OrganizationReadRepository {
  findTenant(tenantId: string) {
    return prisma.tenant.findUnique({ where: { id: tenantId } });
  }

  findSubsidiaryByPath(tenantSchema: string, path: string) {
    return prisma.$queryRawUnsafe<
      Array<{
        id: string;
        code: string;
        name_en: string;
        name_zh: string | null;
        name_ja: string | null;
      }>
    >(
      `SELECT id, code, name_en, name_zh, name_ja
       FROM "${tenantSchema}".subsidiary
       WHERE path = $1`,
      path,
    );
  }

  findTalentByPath(tenantSchema: string, path: string) {
    return prisma.$queryRawUnsafe<
      Array<{
        id: string;
        code: string;
        display_name: string;
      }>
    >(
      `SELECT id, code, display_name
       FROM "${tenantSchema}".talent
       WHERE path = $1`,
      path,
    );
  }

  findChildSubsidiaries(
    tenantSchema: string,
    parentId: string | null,
    includeInactive: boolean,
  ): Promise<RawSubsidiary[]> {
    let whereClause = parentId ? `parent_id = $1::uuid` : `parent_id IS NULL`;

    if (!includeInactive) {
      whereClause += ' AND is_active = true';
    }

    const params = parentId ? [parentId] : [];

    return prisma.$queryRawUnsafe<RawSubsidiary[]>(
      `SELECT id, parent_id, code, path, depth, name_en, name_zh, name_ja, is_active
       FROM "${tenantSchema}".subsidiary
       WHERE ${whereClause}
       ORDER BY sort_order, name_en`,
      ...params,
    );
  }

  async countChildSubsidiaries(
    tenantSchema: string,
    subsidiaryIds: string[],
    includeInactive: boolean,
  ): Promise<Map<string, number>> {
    if (subsidiaryIds.length === 0) {
      return new Map();
    }

    const childCounts = await prisma.$queryRawUnsafe<Array<{ parent_id: string; count: bigint }>>(
      `SELECT parent_id, COUNT(*) as count
       FROM "${tenantSchema}".subsidiary
       WHERE parent_id = ANY($1::uuid[]) ${includeInactive ? '' : 'AND is_active = true'}
       GROUP BY parent_id`,
      subsidiaryIds,
    );

    return new Map(childCounts.map((countRow) => [countRow.parent_id, Number(countRow.count)]));
  }

  async countTalentsBySubsidiary(
    tenantSchema: string,
    subsidiaryIds: string[],
    includeInactive: boolean,
  ): Promise<Map<string, number>> {
    if (subsidiaryIds.length === 0) {
      return new Map();
    }

    const talentCounts = await prisma.$queryRawUnsafe<Array<{ subsidiary_id: string; count: bigint }>>(
      `SELECT subsidiary_id, COUNT(*) as count
       FROM "${tenantSchema}".talent
       WHERE subsidiary_id = ANY($1::uuid[]) ${includeInactive ? '' : `AND ${getTalentVisibilityClause(false)}`}
       GROUP BY subsidiary_id`,
      subsidiaryIds,
    );

    return new Map(talentCounts.map((countRow) => [countRow.subsidiary_id, Number(countRow.count)]));
  }

  findTalentsByParent(
    tenantSchema: string,
    parentId: string | null,
    includeInactive: boolean,
  ): Promise<RawTalent[]> {
    let whereClause = parentId ? `subsidiary_id = $1::uuid` : `subsidiary_id IS NULL`;

    if (!includeInactive) {
      whereClause += ` AND ${getTalentVisibilityClause(false)}`;
    }

    const params = parentId ? [parentId] : [];

    return prisma.$queryRawUnsafe<RawTalent[]>(
      `SELECT id, subsidiary_id, code, name_en, name_zh, name_ja, display_name, avatar_url, homepage_path,
              lifecycle_status, published_at
       FROM "${tenantSchema}".talent
       WHERE ${whereClause}
       ORDER BY display_name`,
      ...params,
    );
  }
}
