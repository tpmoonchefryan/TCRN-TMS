// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';

import {
  getTalentVisibilityClause,
  type RawSubsidiary,
  type RawTalent,
} from '../domain/organization-read.policy';
import type {
  RawOrganizationScopeAccess,
  RawTalentCount,
} from '../domain/organization-tree.policy';

@Injectable()
export class OrganizationTreeRepository {
  findTenant(tenantId: string) {
    return prisma.tenant.findUnique({ where: { id: tenantId } });
  }

  findAllSubsidiaries(
    tenantSchema: string,
    includeInactive: boolean,
  ): Promise<RawSubsidiary[]> {
    const whereClause = includeInactive ? '1=1' : 'is_active = true';

    return prisma.$queryRawUnsafe<RawSubsidiary[]>(
      `SELECT id, parent_id, code, path, depth, name_en, name_zh, name_ja, is_active
       FROM "${tenantSchema}".subsidiary
       WHERE ${whereClause}
       ORDER BY depth, sort_order, name_en`,
    );
  }

  findMatchedSubsidiaryPaths(
    tenantSchema: string,
    search: string,
    includeInactive: boolean,
  ): Promise<Array<{ path: string }>> {
    let whereClause = '1=1';

    if (!includeInactive) {
      whereClause += ' AND is_active = true';
    }

    whereClause +=
      ' AND (code ILIKE $1 OR name_en ILIKE $1 OR name_zh ILIKE $1 OR name_ja ILIKE $1)';

    return prisma.$queryRawUnsafe<Array<{ path: string }>>(
      `SELECT path
       FROM "${tenantSchema}".subsidiary
       WHERE ${whereClause}`,
      `%${search}%`,
    );
  }

  findMatchedTalentSubsidiaryIds(
    tenantSchema: string,
    search: string,
    includeInactive: boolean,
  ): Promise<Array<{ subsidiary_id: string }>> {
    let whereClause = 'subsidiary_id IS NOT NULL';

    if (!includeInactive) {
      whereClause += ` AND ${getTalentVisibilityClause(false)}`;
    }

    whereClause +=
      ' AND (code ILIKE $1 OR name_en ILIKE $1 OR display_name ILIKE $1)';

    return prisma.$queryRawUnsafe<Array<{ subsidiary_id: string }>>(
      `SELECT DISTINCT subsidiary_id
       FROM "${tenantSchema}".talent
       WHERE ${whereClause}`,
      `%${search}%`,
    );
  }

  findSubsidiaryPathsByIds(
    tenantSchema: string,
    subsidiaryIds: string[],
  ): Promise<Array<{ path: string }>> {
    if (subsidiaryIds.length === 0) {
      return Promise.resolve([]);
    }

    return prisma.$queryRawUnsafe<Array<{ path: string }>>(
      `SELECT path
       FROM "${tenantSchema}".subsidiary
       WHERE id = ANY($1::uuid[])`,
      subsidiaryIds,
    );
  }

  findSubsidiariesByPaths(
    tenantSchema: string,
    paths: string[],
  ): Promise<RawSubsidiary[]> {
    if (paths.length === 0) {
      return Promise.resolve([]);
    }

    return prisma.$queryRawUnsafe<RawSubsidiary[]>(
      `SELECT id, parent_id, code, path, depth, name_en, name_zh, name_ja, is_active
       FROM "${tenantSchema}".subsidiary
       WHERE path = ANY($1::text[])
       ORDER BY depth, sort_order, name_en`,
      paths,
    );
  }

  findTalentsForTree(
    tenantSchema: string,
    includeInactive: boolean,
    search?: string,
  ): Promise<RawTalent[]> {
    let whereClause = getTalentVisibilityClause(includeInactive);
    const params: string[] = [];

    if (search) {
      whereClause +=
        ' AND (code ILIKE $1 OR name_en ILIKE $1 OR display_name ILIKE $1)';
      params.push(`%${search}%`);
    }

    return prisma.$queryRawUnsafe<RawTalent[]>(
      `SELECT id, subsidiary_id, code, name_en, name_zh, name_ja, display_name, avatar_url, homepage_path,
              lifecycle_status, published_at
       FROM "${tenantSchema}".talent
       WHERE ${whereClause}
       ORDER BY display_name`,
      ...params,
    );
  }

  findDirectTalents(
    tenantSchema: string,
    includeInactive: boolean,
    search?: string,
  ): Promise<RawTalent[]> {
    let whereClause = 'subsidiary_id IS NULL';
    const params: string[] = [];

    if (!includeInactive) {
      whereClause += ` AND ${getTalentVisibilityClause(false)}`;
    }

    if (search) {
      whereClause +=
        ' AND (code ILIKE $1 OR name_en ILIKE $1 OR display_name ILIKE $1)';
      params.push(`%${search}%`);
    }

    return prisma.$queryRawUnsafe<RawTalent[]>(
      `SELECT id, subsidiary_id, code, name_en, name_zh, name_ja, display_name, avatar_url, homepage_path,
              lifecycle_status, published_at
       FROM "${tenantSchema}".talent
       WHERE ${whereClause}
       ORDER BY display_name`,
      ...params,
    );
  }

  countTalentsBySubsidiary(
    tenantSchema: string,
    includeInactive: boolean,
  ): Promise<RawTalentCount[]> {
    return prisma.$queryRawUnsafe<RawTalentCount[]>(
      `SELECT subsidiary_id, COUNT(*) as count
       FROM "${tenantSchema}".talent
       WHERE subsidiary_id IS NOT NULL ${includeInactive ? '' : `AND ${getTalentVisibilityClause(false)}`}
       GROUP BY subsidiary_id`,
    );
  }

  findUserScopeAccesses(
    tenantSchema: string,
    userId: string,
  ): Promise<RawOrganizationScopeAccess[]> {
    return prisma.$queryRawUnsafe<RawOrganizationScopeAccess[]>(
      `SELECT scope_type, scope_id, include_subunits
       FROM "${tenantSchema}".user_scope_access
       WHERE user_id = $1::uuid`,
      userId,
    );
  }

  async findDescendantSubsidiaryIds(
    tenantSchema: string,
    subsidiaryId: string,
  ): Promise<Set<string>> {
    const subsidiaries = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT s2.id
       FROM "${tenantSchema}".subsidiary s1
       JOIN "${tenantSchema}".subsidiary s2 ON s2.path LIKE s1.path || '%'
       WHERE s1.id = $1::uuid`,
      subsidiaryId,
    );

    return new Set(subsidiaries.map((subsidiary) => subsidiary.id));
  }

  async findTalentIdsInSubsidiarySubtree(
    tenantSchema: string,
    subsidiaryId: string,
  ): Promise<Set<string>> {
    const talents = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT t.id
       FROM "${tenantSchema}".talent t
       JOIN "${tenantSchema}".subsidiary s ON t.subsidiary_id = s.id
       WHERE s.path LIKE (SELECT path FROM "${tenantSchema}".subsidiary WHERE id = $1::uuid) || '%'`,
      subsidiaryId,
    );

    return new Set(talents.map((talent) => talent.id));
  }

  findTalentSubsidiaryIds(
    tenantSchema: string,
    talentIds: string[],
  ): Promise<Array<{ id: string; subsidiary_id: string | null }>> {
    if (talentIds.length === 0) {
      return Promise.resolve([]);
    }

    return prisma.$queryRawUnsafe<Array<{ id: string; subsidiary_id: string | null }>>(
      `SELECT id, subsidiary_id
       FROM "${tenantSchema}".talent
       WHERE id = ANY($1::uuid[])`,
      talentIds,
    );
  }

  async findAncestorSubsidiaryIds(
    tenantSchema: string,
    subsidiaryId: string,
  ): Promise<Set<string>> {
    const ancestors = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT s2.id
       FROM "${tenantSchema}".subsidiary s1
       JOIN "${tenantSchema}".subsidiary s2 ON s1.path LIKE s2.path || '%'
       WHERE s1.id = $1::uuid AND s2.id != $1::uuid`,
      subsidiaryId,
    );

    return new Set(ancestors.map((ancestor) => ancestor.id));
  }
}
