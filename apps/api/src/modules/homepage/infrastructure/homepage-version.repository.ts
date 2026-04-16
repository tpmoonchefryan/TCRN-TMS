// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import type {
  HomepageVersionActorRecord,
  HomepageVersionCreatedRecord,
  HomepageVersionDetailRecord,
  HomepageVersionListRecord,
  HomepageVersionRestoreSourceRecord,
} from '../domain/homepage-version.policy';
import type { VersionListQueryDto } from '../dto/homepage.dto';

@Injectable()
export class HomepageVersionRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findHomepageIdByTalentId(schema: string, talentId: string): Promise<string | null> {
    const prisma = this.databaseService.getPrisma();
    const homepages = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        SELECT id
        FROM "${schema}".talent_homepage
        WHERE talent_id = $1::uuid
      `,
      talentId,
    );

    return homepages[0]?.id ?? null;
  }

  async findHomepageVersions(
    schema: string,
    homepageId: string,
    query: VersionListQueryDto,
  ): Promise<HomepageVersionListRecord[]> {
    const prisma = this.databaseService.getPrisma();
    const pagination = this.databaseService.buildPagination(
      query.page ?? 1,
      query.pageSize ?? 20,
    );
    const { params, whereClause } = this.buildHomepageVersionFilter(homepageId, query.status);

    return prisma.$queryRawUnsafe<HomepageVersionListRecord[]>(
      `
        SELECT
          id,
          version_number as "versionNumber",
          status,
          content,
          published_at as "publishedAt",
          published_by as "publishedBy",
          created_at as "createdAt",
          created_by as "createdBy"
        FROM "${schema}".homepage_version
        WHERE ${whereClause}
        ORDER BY version_number DESC
        LIMIT ${pagination.take} OFFSET ${pagination.skip}
      `,
      ...params,
    );
  }

  async countHomepageVersions(
    schema: string,
    homepageId: string,
    status?: 'draft' | 'published' | 'archived',
  ): Promise<number> {
    const prisma = this.databaseService.getPrisma();
    const { params, whereClause } = this.buildHomepageVersionFilter(homepageId, status);
    const totals = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*) as count
        FROM "${schema}".homepage_version
        WHERE ${whereClause}
      `,
      ...params,
    );

    return Number(totals[0]?.count ?? 0);
  }

  async findSystemUsersByIds(
    schema: string,
    userIds: string[],
  ): Promise<HomepageVersionActorRecord[]> {
    if (userIds.length === 0) {
      return [];
    }

    const prisma = this.databaseService.getPrisma();
    return prisma.$queryRawUnsafe<HomepageVersionActorRecord[]>(
      `
        SELECT id, username
        FROM "${schema}".system_user
        WHERE id = ANY($1::uuid[])
      `,
      userIds,
    );
  }

  async findHomepageVersionDetail(
    schema: string,
    homepageId: string,
    versionId: string,
  ): Promise<HomepageVersionDetailRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const versions = await prisma.$queryRawUnsafe<HomepageVersionDetailRecord[]>(
      `
        SELECT
          id,
          version_number as "versionNumber",
          status,
          content,
          theme,
          published_at as "publishedAt",
          published_by as "publishedBy",
          created_at as "createdAt",
          created_by as "createdBy"
        FROM "${schema}".homepage_version
        WHERE id = $1::uuid
          AND homepage_id = $2::uuid
      `,
      versionId,
      homepageId,
    );

    return versions[0] ?? null;
  }

  async findHomepageVersionRestoreSource(
    schema: string,
    homepageId: string,
    versionId: string,
  ): Promise<HomepageVersionRestoreSourceRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const versions = await prisma.$queryRawUnsafe<HomepageVersionRestoreSourceRecord[]>(
      `
        SELECT
          id,
          version_number as "versionNumber",
          content,
          theme,
          content_hash as "contentHash"
        FROM "${schema}".homepage_version
        WHERE id = $1::uuid
          AND homepage_id = $2::uuid
      `,
      versionId,
      homepageId,
    );

    return versions[0] ?? null;
  }

  async findLatestHomepageVersionNumber(schema: string, homepageId: string): Promise<number> {
    const prisma = this.databaseService.getPrisma();
    const versions = await prisma.$queryRawUnsafe<Array<{ versionNumber: number }>>(
      `
        SELECT version_number as "versionNumber"
        FROM "${schema}".homepage_version
        WHERE homepage_id = $1::uuid
        ORDER BY version_number DESC
        LIMIT 1
      `,
      homepageId,
    );

    return versions[0]?.versionNumber ?? 0;
  }

  async createDraftVersionFromSource(params: {
    schema: string;
    homepageId: string;
    versionNumber: number;
    content: unknown;
    theme: unknown;
    contentHash: string | null;
    userId: string;
  }): Promise<HomepageVersionCreatedRecord> {
    const { content, contentHash, homepageId, schema, theme, userId, versionNumber } = params;
    const prisma = this.databaseService.getPrisma();
    const versions = await prisma.$queryRawUnsafe<HomepageVersionCreatedRecord[]>(
      `
        INSERT INTO "${schema}".homepage_version (
          id, homepage_id, version_number, content, theme, status, content_hash, created_by, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1::uuid, $2, $3::jsonb, $4::jsonb, 'draft', $5, $6::uuid, NOW(), NOW()
        )
        RETURNING id, version_number as "versionNumber"
      `,
      homepageId,
      versionNumber,
      JSON.stringify(content),
      JSON.stringify(theme),
      contentHash,
      userId,
    );

    return versions[0];
  }

  async assignDraftVersion(schema: string, homepageId: string, versionId: string): Promise<void> {
    const prisma = this.databaseService.getPrisma();
    await prisma.$executeRawUnsafe(
      `
        UPDATE "${schema}".talent_homepage
        SET draft_version_id = $1::uuid,
            updated_at = NOW()
        WHERE id = $2::uuid
      `,
      versionId,
      homepageId,
    );
  }

  async insertRestoreChangeLog(params: {
    schema: string;
    versionId: string;
    versionLabel: string;
    diffJson: string;
    userId: string;
    ipAddress: string;
  }): Promise<void> {
    const { diffJson, ipAddress, schema, userId, versionId, versionLabel } = params;
    const prisma = this.databaseService.getPrisma();
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${schema}".change_log (
          id, action, object_type, object_id, object_name, diff, operator_id, ip_address, occurred_at
        ) VALUES (
          gen_random_uuid(), 'restore', 'homepage_version', $1::uuid, $2, $3::jsonb, $4::uuid, $5::inet, NOW()
        )
      `,
      versionId,
      versionLabel,
      diffJson,
      userId,
      ipAddress,
    );
  }

  private buildHomepageVersionFilter(
    homepageId: string,
    status?: 'draft' | 'published' | 'archived',
  ): {
    whereClause: string;
    params: unknown[];
  } {
    let whereClause = 'homepage_id = $1::uuid';
    const params: unknown[] = [homepageId];

    if (status) {
      whereClause += ' AND status = $2';
      params.push(status);
    }

    return { whereClause, params };
  }
}
