// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import {
  VersionListQueryDto,
  VersionListItem,
  HomepageContent,
  ThemeConfig,
} from '../dto/homepage.dto';

@Injectable()
export class HomepageVersionService {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * List versions for a homepage (multi-tenant aware)
   */
  async listVersions(
    talentId: string,
    query: VersionListQueryDto,
    context: RequestContext,
  ): Promise<{ items: VersionListItem[]; total: number }> {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;
    const { page = 1, pageSize = 20, status } = query;

    // Get homepage using raw SQL
    const homepages = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM "${schema}".talent_homepage WHERE talent_id = $1::uuid
    `, talentId);

    if (!homepages.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Homepage not found',
      });
    }
    const homepage = homepages[0];

    const pagination = this.databaseService.buildPagination(page, pageSize);

    // Build where conditions
    let whereClause = 'homepage_id = $1::uuid';
    const params: unknown[] = [homepage.id];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Query versions using raw SQL
    const items = await prisma.$queryRawUnsafe<Array<{
      id: string;
      version_number: number;
      status: string;
      content: unknown;
      published_at: Date | null;
      published_by: string | null;
      created_at: Date;
      created_by: string | null;
    }>>(`
      SELECT id, version_number, status, content, published_at, published_by, created_at, created_by
      FROM "${schema}".homepage_version
      WHERE ${whereClause}
      ORDER BY version_number DESC
      LIMIT ${pagination.take} OFFSET ${pagination.skip}
    `, ...params);

    // Count total
    const totalResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count FROM "${schema}".homepage_version WHERE ${whereClause}
    `, ...params);
    const total = Number(totalResult[0]?.count || 0);

    // Get user info for creators and publishers
    const userIds = new Set<string>();
    items.forEach((v) => {
      if (v.created_by) userIds.add(v.created_by);
      if (v.published_by) userIds.add(v.published_by);
    });

    let userMap = new Map<string, { id: string; username: string }>();
    if (userIds.size > 0) {
      const users = await prisma.$queryRawUnsafe<Array<{ id: string; username: string }>>(`
        SELECT id, username FROM "${schema}".system_user WHERE id = ANY($1::uuid[])
      `, Array.from(userIds));
      userMap = new Map(users.map((u) => [u.id, u]));
    }

    return {
      items: items.map((v) => {
        const content = v.content as unknown as HomepageContent;
        return {
          id: v.id,
          versionNumber: v.version_number,
          status: v.status as 'draft' | 'published' | 'archived',
          contentPreview: this.generateContentPreview(content),
          componentCount: content?.components?.length ?? 0,
          publishedAt: v.published_at?.toISOString() ?? null,
          publishedBy: v.published_by ? userMap.get(v.published_by) ?? null : null,
          createdAt: v.created_at.toISOString(),
          createdBy: v.created_by ? userMap.get(v.created_by) ?? null : null,
        };
      }),
      total,
    };
  }

  /**
   * Get version detail (multi-tenant aware)
   */
  async getVersion(talentId: string, versionId: string, context: RequestContext) {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Get homepage using raw SQL
    const homepages = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM "${schema}".talent_homepage WHERE talent_id = $1::uuid
    `, talentId);

    if (!homepages.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Homepage not found',
      });
    }
    const homepage = homepages[0];

    // Get version using raw SQL
    const versions = await prisma.$queryRawUnsafe<Array<{
      id: string;
      version_number: number;
      status: string;
      content: unknown;
      theme: unknown;
      published_at: Date | null;
      published_by: string | null;
      created_at: Date;
      created_by: string | null;
    }>>(`
      SELECT id, version_number, status, content, theme, published_at, published_by, created_at, created_by
      FROM "${schema}".homepage_version
      WHERE id = $1::uuid AND homepage_id = $2::uuid
    `, versionId, homepage.id);

    if (!versions.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Version not found',
      });
    }
    const version = versions[0];

    // Get user info using raw SQL
    let publishedBy = null;
    if (version.published_by) {
      const users = await prisma.$queryRawUnsafe<Array<{ id: string; username: string }>>(`
        SELECT id, username FROM "${schema}".system_user WHERE id = $1::uuid
      `, version.published_by);
      publishedBy = users[0] ?? null;
    }

    let createdBy = null;
    if (version.created_by) {
      const users = await prisma.$queryRawUnsafe<Array<{ id: string; username: string }>>(`
        SELECT id, username FROM "${schema}".system_user WHERE id = $1::uuid
      `, version.created_by);
      createdBy = users[0] ?? null;
    }

    return {
      id: version.id,
      versionNumber: version.version_number,
      status: version.status,
      content: version.content as unknown as HomepageContent,
      theme: version.theme as unknown as ThemeConfig,
      publishedAt: version.published_at?.toISOString() ?? null,
      publishedBy,
      createdAt: version.created_at.toISOString(),
      createdBy,
    };
  }

  /**
   * Restore version to draft (multi-tenant aware)
   */
  async restoreVersion(
    talentId: string,
    versionId: string,
    context: RequestContext,
  ): Promise<{ newDraftVersion: { id: string; versionNumber: number }; restoredFrom: { id: string; versionNumber: number } }> {
    const prisma = this.databaseService.getPrisma();
    const schema = context.tenantSchema;

    // Get homepage using raw SQL
    const homepages = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM "${schema}".talent_homepage WHERE talent_id = $1::uuid
    `, talentId);

    if (!homepages.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Homepage not found',
      });
    }
    const homepage = homepages[0];

    // Get source version using raw SQL
    const sourceVersions = await prisma.$queryRawUnsafe<Array<{
      id: string;
      version_number: number;
      content: unknown;
      theme: unknown;
      content_hash: string | null;
    }>>(`
      SELECT id, version_number, content, theme, content_hash
      FROM "${schema}".homepage_version
      WHERE id = $1::uuid AND homepage_id = $2::uuid
    `, versionId, homepage.id);

    if (!sourceVersions.length) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Version not found',
      });
    }
    const sourceVersion = sourceVersions[0];

    // Get next version number using raw SQL
    const lastVersionResult = await prisma.$queryRawUnsafe<Array<{ version_number: number }>>(`
      SELECT version_number FROM "${schema}".homepage_version
      WHERE homepage_id = $1::uuid
      ORDER BY version_number DESC LIMIT 1
    `, homepage.id);

    const versionNumber = (lastVersionResult[0]?.version_number ?? 0) + 1;

    // Create new draft from source using raw SQL
    const newVersions = await prisma.$queryRawUnsafe<Array<{
      id: string;
      version_number: number;
    }>>(`
      INSERT INTO "${schema}".homepage_version (
        id, homepage_id, version_number, content, theme, status, content_hash, created_by, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2, $3::jsonb, $4::jsonb, 'draft', $5, $6::uuid, NOW(), NOW()
      )
      RETURNING id, version_number
    `,
      homepage.id,
      versionNumber,
      JSON.stringify(sourceVersion.content),
      JSON.stringify(sourceVersion.theme),
      sourceVersion.content_hash,
      context.userId,
    );

    const newVersion = newVersions[0];

    // Update homepage draft version using raw SQL
    await prisma.$executeRawUnsafe(`
      UPDATE "${schema}".talent_homepage
      SET draft_version_id = $1::uuid, updated_at = NOW()
      WHERE id = $2::uuid
    `, newVersion.id, homepage.id);

    // Record change log using raw SQL
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schema}".change_log (
        id, action, object_type, object_id, object_name, diff, operator_id, ip_address, occurred_at
      ) VALUES (
        gen_random_uuid(), 'restore', 'homepage_version', $1::uuid, $2, $3::jsonb, $4::uuid, $5::inet, NOW()
      )
    `,
      newVersion.id,
      `Version ${versionNumber}`,
      JSON.stringify({
        new: { restoredFromVersion: sourceVersion.version_number },
      }),
      context.userId,
      context.ipAddress || '0.0.0.0',
    );

    return {
      newDraftVersion: {
        id: newVersion.id,
        versionNumber: newVersion.version_number,
      },
      restoredFrom: {
        id: sourceVersion.id,
        versionNumber: sourceVersion.version_number,
      },
    };
  }

  /**
   * Generate content preview string
   */
  private generateContentPreview(content: HomepageContent): string {
    if (!content?.components || content.components.length === 0) {
      return 'Empty page';
    }

    const componentTypes = content.components.map((c) => c.type);
    const uniqueTypes = [...new Set(componentTypes)];

    if (uniqueTypes.length <= 3) {
      return uniqueTypes.join(', ');
    }

    return `${uniqueTypes.slice(0, 3).join(', ')}... (+${uniqueTypes.length - 3})`;
  }
}
