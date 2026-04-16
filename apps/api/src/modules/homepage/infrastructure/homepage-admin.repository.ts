// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import type {
  HomepageAdminRecord,
  HomepageAdminTalentRecord,
  HomepageAdminVersionRecord,
  HomepageDraftPointerRecord,
  HomepagePublishedVersionRecord,
  HomepagePublishTargetRecord,
  HomepageSettingsRecord,
  HomepageVersionActorRecord,
  HomepageVersionSummaryRecord,
} from '../domain/homepage-admin.policy';

@Injectable()
export class HomepageAdminRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findTalentById(
    schema: string,
    talentId: string,
  ): Promise<HomepageAdminTalentRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const talents = await prisma.$queryRawUnsafe<HomepageAdminTalentRecord[]>(
      `
        SELECT id, homepage_path as "homepagePath",
               custom_domain as "customDomain", custom_domain_verified as "customDomainVerified"
        FROM "${schema}".talent
        WHERE id = $1::uuid
      `,
      talentId,
    );

    return talents[0] ?? null;
  }

  async findHomepageByTalentId(
    schema: string,
    talentId: string,
  ): Promise<HomepageAdminRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const homepages = await prisma.$queryRawUnsafe<HomepageAdminRecord[]>(
      `
        SELECT
          id, talent_id as "talentId", is_published as "isPublished",
          published_version_id as "publishedVersionId", draft_version_id as "draftVersionId",
          seo_title as "seoTitle", seo_description as "seoDescription",
          og_image_url as "ogImageUrl", analytics_id as "analyticsId",
          theme, created_at as "createdAt", updated_at as "updatedAt", version
        FROM "${schema}".talent_homepage
        WHERE talent_id = $1::uuid
      `,
      talentId,
    );

    return homepages[0] ?? null;
  }

  async createHomepage(
    schema: string,
    talentId: string,
    defaultTheme: Record<string, unknown>,
  ): Promise<HomepageAdminRecord> {
    const prisma = this.databaseService.getPrisma();
    const created = await prisma.$queryRawUnsafe<HomepageAdminRecord[]>(
      `
        INSERT INTO "${schema}".talent_homepage
          (id, talent_id, is_published, theme, created_at, updated_at, version)
        VALUES
          (gen_random_uuid(), $1::uuid, false, $2::jsonb, now(), now(), 1)
        RETURNING
          id, talent_id as "talentId", is_published as "isPublished",
          published_version_id as "publishedVersionId", draft_version_id as "draftVersionId",
          seo_title as "seoTitle", seo_description as "seoDescription",
          og_image_url as "ogImageUrl", analytics_id as "analyticsId",
          theme, created_at as "createdAt", updated_at as "updatedAt", version
      `,
      talentId,
      JSON.stringify(defaultTheme),
    );

    return created[0];
  }

  async findHomepageVersion(
    schema: string,
    versionId: string,
  ): Promise<HomepageAdminVersionRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const versions = await prisma.$queryRawUnsafe<HomepageAdminVersionRecord[]>(
      `
        SELECT
          id, version_number as "versionNumber", content, theme,
          published_at as "publishedAt", published_by as "publishedBy",
          created_at as "createdAt"
        FROM "${schema}".homepage_version
        WHERE id = $1::uuid
      `,
      versionId,
    );

    return versions[0] ?? null;
  }

  async findSystemUserById(
    schema: string,
    userId: string,
  ): Promise<HomepageVersionActorRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const users = await prisma.$queryRawUnsafe<HomepageVersionActorRecord[]>(
      `
        SELECT id, username
        FROM "${schema}".system_user
        WHERE id = $1::uuid
      `,
      userId,
    );

    return users[0] ?? null;
  }

  async findHomepageDraftPointer(
    schema: string,
    talentId: string,
  ): Promise<HomepageDraftPointerRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const homepages = await prisma.$queryRawUnsafe<HomepageDraftPointerRecord[]>(
      `
        SELECT id, draft_version_id as "draftVersionId"
        FROM "${schema}".talent_homepage
        WHERE talent_id = $1::uuid
      `,
      talentId,
    );

    return homepages[0] ?? null;
  }

  async findHomepageVersionSummary(
    schema: string,
    versionId: string,
  ): Promise<HomepageVersionSummaryRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const versions = await prisma.$queryRawUnsafe<HomepageVersionSummaryRecord[]>(
      `
        SELECT id, version_number as "versionNumber", content_hash as "contentHash", created_at as "createdAt"
        FROM "${schema}".homepage_version
        WHERE id = $1::uuid
      `,
      versionId,
    );

    return versions[0] ?? null;
  }

  async findLatestHomepageVersionNumber(
    schema: string,
    homepageId: string,
  ): Promise<number> {
    const prisma = this.databaseService.getPrisma();
    const lastVersions = await prisma.$queryRawUnsafe<Array<{ versionNumber: number }>>(
      `
        SELECT version_number as "versionNumber"
        FROM "${schema}".homepage_version
        WHERE homepage_id = $1::uuid
        ORDER BY version_number DESC
        LIMIT 1
      `,
      homepageId,
    );

    return lastVersions[0]?.versionNumber ?? 0;
  }

  async createDraftVersionAndAssign(params: {
    schema: string;
    homepageId: string;
    versionNumber: number;
    content: Record<string, unknown>;
    theme: Record<string, unknown>;
    contentHash: string;
    userId: string;
  }): Promise<void> {
    const { content, contentHash, homepageId, schema, theme, userId, versionNumber } = params;
    const prisma = this.databaseService.getPrisma();

    await prisma.$queryRawUnsafe(
      `
        WITH new_version AS (
          INSERT INTO "${schema}".homepage_version
            (id, homepage_id, version_number, content, theme, status, content_hash, created_by, created_at, updated_at)
          VALUES
            (gen_random_uuid(), $1::uuid, $2, $3::jsonb, $4::jsonb, 'draft', $5, $6::uuid, now(), now())
          RETURNING id
        )
        UPDATE "${schema}".talent_homepage
        SET draft_version_id = (SELECT id FROM new_version), updated_at = now()
        WHERE id = $1::uuid
      `,
      homepageId,
      versionNumber,
      JSON.stringify(content),
      JSON.stringify(theme),
      contentHash,
      userId,
    );
  }

  async findHomepageVersionByNumber(
    schema: string,
    homepageId: string,
    versionNumber: number,
  ): Promise<HomepageVersionSummaryRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const versions = await prisma.$queryRawUnsafe<HomepageVersionSummaryRecord[]>(
      `
        SELECT id, version_number as "versionNumber", content_hash as "contentHash", created_at as "createdAt"
        FROM "${schema}".homepage_version
        WHERE homepage_id = $1::uuid AND version_number = $2
      `,
      homepageId,
      versionNumber,
    );

    return versions[0] ?? null;
  }

  async findHomepagePublishTarget(
    schema: string,
    talentId: string,
  ): Promise<HomepagePublishTargetRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const homepages = await prisma.$queryRawUnsafe<HomepagePublishTargetRecord[]>(
      `
        SELECT
          h.id,
          h.draft_version_id as "draftVersionId",
          t.custom_domain as "customDomain",
          t.homepage_path as "homepagePath"
        FROM "${schema}".talent_homepage h
        JOIN "${schema}".talent t ON t.id = h.talent_id
        WHERE h.talent_id = $1::uuid
      `,
      talentId,
    );

    return homepages[0] ?? null;
  }

  async publishHomepageVersion(params: {
    schema: string;
    versionId: string;
    publishedAt: Date;
    userId: string;
  }): Promise<HomepagePublishedVersionRecord> {
    const { publishedAt, schema, userId, versionId } = params;
    const prisma = this.databaseService.getPrisma();
    const updatedVersions = await prisma.$queryRawUnsafe<HomepagePublishedVersionRecord[]>(
      `
        UPDATE "${schema}".homepage_version
        SET status = 'published', published_at = $2, published_by = $3::uuid, updated_at = now()
        WHERE id = $1::uuid
        RETURNING id, version_number as "versionNumber"
      `,
      versionId,
      publishedAt,
      userId,
    );

    return updatedVersions[0];
  }

  async markHomepagePublished(
    schema: string,
    homepageId: string,
    publishedVersionId: string,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();

    await prisma.$queryRawUnsafe(
      `
        UPDATE "${schema}".talent_homepage
        SET is_published = true, published_version_id = $2::uuid, updated_at = now()
        WHERE id = $1::uuid
      `,
      homepageId,
      publishedVersionId,
    );
  }

  async appendHomepagePublishChangeLog(params: {
    schema: string;
    homepageId: string;
    versionNumber: number;
    userId: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<void> {
    const { homepageId, ipAddress, schema, userAgent, userId, versionNumber } = params;
    const prisma = this.databaseService.getPrisma();

    await prisma.$queryRawUnsafe(
      `
        INSERT INTO "${schema}".change_log
          (id, action, object_type, object_id, object_name, diff, occurred_at, operator_id, ip_address, user_agent)
        VALUES
          (gen_random_uuid(), 'publish', 'talent_homepage', $1::uuid, $2, $3::jsonb, now(), $4::uuid, $5::inet, $6)
      `,
      homepageId,
      `Homepage v${versionNumber}`,
      JSON.stringify({ versionNumber }),
      userId,
      ipAddress,
      userAgent,
    );
  }

  async markHomepageUnpublished(schema: string, homepageId: string): Promise<void> {
    const prisma = this.databaseService.getPrisma();

    await prisma.$queryRawUnsafe(
      `
        UPDATE "${schema}".talent_homepage
        SET is_published = false, updated_at = now()
        WHERE id = $1::uuid
      `,
      homepageId,
    );
  }

  async appendHomepageUnpublishChangeLog(params: {
    schema: string;
    homepageId: string;
    userId: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<void> {
    const { homepageId, ipAddress, schema, userAgent, userId } = params;
    const prisma = this.databaseService.getPrisma();

    await prisma.$queryRawUnsafe(
      `
        INSERT INTO "${schema}".change_log
          (id, action, object_type, object_id, object_name, occurred_at, operator_id, ip_address, user_agent)
        VALUES
          (gen_random_uuid(), 'unpublish', 'talent_homepage', $1::uuid, 'Homepage', now(), $2::uuid, $3::inet, $4)
      `,
      homepageId,
      userId,
      ipAddress,
      userAgent,
    );
  }

  async findHomepageSettings(
    schema: string,
    talentId: string,
  ): Promise<HomepageSettingsRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const homepages = await prisma.$queryRawUnsafe<HomepageSettingsRecord[]>(
      `
        SELECT
          id,
          seo_title as "seoTitle",
          seo_description as "seoDescription",
          og_image_url as "ogImageUrl",
          analytics_id as "analyticsId",
          version
        FROM "${schema}".talent_homepage
        WHERE talent_id = $1::uuid
      `,
      talentId,
    );

    return homepages[0] ?? null;
  }

  async findTalentIdByHomepagePath(
    schema: string,
    homepagePath: string,
    excludedTalentId: string,
  ): Promise<string | null> {
    const prisma = this.databaseService.getPrisma();
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        SELECT id
        FROM "${schema}".talent
        WHERE LOWER(homepage_path) = $1
          AND id != $2::uuid
      `,
      homepagePath,
      excludedTalentId,
    );

    return rows[0]?.id ?? null;
  }

  async updateTalentHomepagePath(
    schema: string,
    talentId: string,
    homepagePath: string | null,
  ): Promise<void> {
    const prisma = this.databaseService.getPrisma();

    await prisma.$executeRawUnsafe(
      `
        UPDATE "${schema}".talent
        SET homepage_path = $1, updated_at = now()
        WHERE id = $2::uuid
      `,
      homepagePath,
      talentId,
    );
  }

  async updateHomepageSettings(params: {
    schema: string;
    homepageId: string;
    seoTitle: string | null;
    seoDescription: string | null;
    ogImageUrl: string | null;
    analyticsId: string | null;
  }): Promise<void> {
    const { analyticsId, homepageId, ogImageUrl, schema, seoDescription, seoTitle } = params;
    const prisma = this.databaseService.getPrisma();

    await prisma.$queryRawUnsafe(
      `
        UPDATE "${schema}".talent_homepage
        SET seo_title = $2, seo_description = $3, og_image_url = $4, analytics_id = $5,
            version = version + 1, updated_at = now()
        WHERE id = $1::uuid
      `,
      homepageId,
      seoTitle,
      seoDescription,
      ogImageUrl,
      analyticsId,
    );
  }

  async appendHomepageSettingsChangeLog(params: {
    schema: string;
    homepageId: string;
    oldValue: Record<string, unknown>;
    newValue: Record<string, unknown>;
    userId: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<void> {
    const { homepageId, ipAddress, newValue, oldValue, schema, userAgent, userId } = params;
    const prisma = this.databaseService.getPrisma();

    await prisma.$queryRawUnsafe(
      `
        INSERT INTO "${schema}".change_log
          (id, action, object_type, object_id, object_name, diff, occurred_at, operator_id, ip_address, user_agent)
        VALUES
          (gen_random_uuid(), 'update', 'talent_homepage', $1::uuid, 'Homepage settings', jsonb_build_object('old', $2::jsonb, 'new', $3::jsonb), now(), $4::uuid, $5::inet, $6)
      `,
      homepageId,
      JSON.stringify(oldValue),
      JSON.stringify(newValue),
      userId,
      ipAddress,
      userAgent,
    );
  }
}
