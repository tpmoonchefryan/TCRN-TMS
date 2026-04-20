// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database';
import type {
  DomainLookupRouteRecord,
  HomepageVersionRecord,
  PublicHomepageTalentRecord,
  PublishedHomepageRecord,
} from '../domain/public-homepage-read.policy';

@Injectable()
export class PublicHomepageReadRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async listActiveTenantSchemas(): Promise<string[]> {
    const prisma = this.databaseService.getPrisma();
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { schemaName: true },
    });

    return tenants.map((tenant) => tenant.schemaName);
  }

  async findActiveTenantSchemaByCode(tenantCode: string): Promise<string | null> {
    const prisma = this.databaseService.getPrisma();
    const tenants = await prisma.tenant.findMany({
      where: {
        code: {
          equals: tenantCode,
          mode: 'insensitive',
        },
        isActive: true,
      },
      select: {
        schemaName: true,
      },
      take: 1,
    });

    return tenants[0]?.schemaName ?? null;
  }

  async findPublishedTalentByPath(
    schema: string,
    path: string,
  ): Promise<PublicHomepageTalentRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const talents = await prisma.$queryRawUnsafe<PublicHomepageTalentRecord[]>(`
      SELECT
        id,
        code,
        display_name as "displayName",
        avatar_url as "avatarUrl",
        homepage_path as "homepagePath",
        timezone
      FROM "${schema}".talent
      WHERE (LOWER(homepage_path) = LOWER($1) OR LOWER(code) = LOWER($1))
        AND lifecycle_status = 'published'
      LIMIT 1
    `, path);

    return talents[0] ?? null;
  }

  async findPublishedTalentByCode(
    schema: string,
    talentCode: string,
  ): Promise<PublicHomepageTalentRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const talents = await prisma.$queryRawUnsafe<PublicHomepageTalentRecord[]>(`
      SELECT
        id,
        code,
        display_name as "displayName",
        avatar_url as "avatarUrl",
        homepage_path as "homepagePath",
        timezone
      FROM "${schema}".talent
      WHERE LOWER(code) = LOWER($1)
        AND lifecycle_status = 'published'
      LIMIT 1
    `, talentCode);

    return talents[0] ?? null;
  }

  async findPublishedTalentById(
    schema: string,
    talentId: string,
  ): Promise<PublicHomepageTalentRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const talents = await prisma.$queryRawUnsafe<PublicHomepageTalentRecord[]>(`
      SELECT
        id,
        code,
        display_name as "displayName",
        avatar_url as "avatarUrl",
        homepage_path as "homepagePath",
        timezone
      FROM "${schema}".talent
      WHERE id = $1::uuid
        AND lifecycle_status = 'published'
      LIMIT 1
    `, talentId);

    return talents[0] ?? null;
  }

  async findVerifiedDomainRoute(
    schema: string,
    normalizedDomain: string,
  ): Promise<DomainLookupRouteRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const results = await prisma.$queryRawUnsafe<DomainLookupRouteRecord[]>(`
      SELECT
        id as "talentId",
        homepage_path as "homepagePath",
        marshmallow_path as "marshmallowPath",
        LOWER(code) as "code"
      FROM "${schema}".talent
      WHERE LOWER(custom_domain) = $1
        AND custom_domain_verified = true
        AND lifecycle_status = 'published'
      LIMIT 1
    `, normalizedDomain);

    return results[0] ?? null;
  }

  async findPublishedHomepageRecord(
    schema: string,
    talentId: string,
  ): Promise<PublishedHomepageRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const homepages = await prisma.$queryRawUnsafe<PublishedHomepageRecord[]>(`
      SELECT id, is_published as "isPublished", published_version_id as "publishedVersionId",
             seo_title as "seoTitle", seo_description as "seoDescription", og_image_url as "ogImageUrl"
      FROM "${schema}".talent_homepage
      WHERE talent_id = $1::uuid
    `, talentId);

    return homepages[0] ?? null;
  }

  async findHomepageVersion(
    schema: string,
    versionId: string,
  ): Promise<HomepageVersionRecord | null> {
    const prisma = this.databaseService.getPrisma();
    const versions = await prisma.$queryRawUnsafe<HomepageVersionRecord[]>(`
      SELECT content, theme, published_at as "publishedAt", created_at as "createdAt"
      FROM "${schema}".homepage_version
      WHERE id = $1::uuid
    `, versionId);

    return versions[0] ?? null;
  }
}
