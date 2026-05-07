// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { isMissingDatabaseRelationError } from '../../../platform/persistence/database-error.util';
import { DatabaseService } from '../../database';
import type {
  DomainLookupBindingRouteRecord,
  DomainLookupRouteRecord,
  HomepageVersionRecord,
  PublicHomepageTalentRecord,
  PublishedHomepageRecord,
} from '../domain/public-homepage-read.policy';

@Injectable()
export class PublicHomepageReadRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  private isMissingCustomDomainRegistryRelation(error: unknown): boolean {
    return isMissingDatabaseRelationError(error, [
      'public.custom_domain_binding',
      'custom_domain_binding',
      'public.custom_domain_talent_selection',
      'custom_domain_talent_selection',
    ]);
  }

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


  async findVerifiedDomainBindingRoute(
    schema: string,
    normalizedDomain: string,
    talentCode: string | null = null,
  ): Promise<DomainLookupBindingRouteRecord | null> {
    const prisma = this.databaseService.getPrisma();
    let results: DomainLookupBindingRouteRecord[];
    try {
      results = await prisma.$queryRawUnsafe<DomainLookupBindingRouteRecord[]>(`
        SELECT
          binding.id as "domainId",
          binding.hostname,
          binding.owner_type as "ownerType",
          binding.owner_id as "ownerId",
          tenant.schema_name as "tenantSchema",
          talent.id as "talentId"
        FROM public.tenant tenant
        JOIN public.custom_domain_binding binding ON binding.tenant_id = tenant.id
        LEFT JOIN "${schema}".talent talent ON (
          (
            binding.owner_type = 'talent'
            AND binding.owner_id = talent.id
            AND $3::text IS NULL
          )
          OR (
            binding.owner_type != 'talent'
            AND LOWER(talent.code) = LOWER($3)
            AND EXISTS (
              SELECT 1
              FROM public.custom_domain_talent_selection selection
              WHERE selection.tenant_id = tenant.id
                AND selection.custom_domain_binding_id = binding.id
                AND selection.talent_id = talent.id
                AND selection.is_enabled = true
            )
          )
        )
        WHERE tenant.schema_name = $1
          AND binding.hostname = $2
          AND binding.custom_domain_verified = true
          AND binding.is_active = true
          AND (
            (
              binding.owner_type = 'talent'
              AND $3::text IS NULL
              AND talent.lifecycle_status = 'published'
            )
            OR (
              binding.owner_type != 'talent'
              AND $3::text IS NULL
            )
            OR (
              binding.owner_type != 'talent'
              AND $3::text IS NOT NULL
              AND talent.lifecycle_status = 'published'
              AND (
                binding.owner_type = 'tenant'
                OR (
                  binding.owner_type = 'subsidiary'
                  AND talent.subsidiary_id IS NOT NULL
                  AND EXISTS (
                    SELECT 1
                    FROM "${schema}".subsidiary leaf
                    JOIN "${schema}".subsidiary owner ON leaf.path LIKE owner.path || '%'
                    WHERE leaf.id = talent.subsidiary_id
                      AND owner.id = binding.owner_id
                  )
                )
              )
            )
          )
        LIMIT 1
      `, schema, normalizedDomain, talentCode);
    } catch (error) {
      if (this.isMissingCustomDomainRegistryRelation(error)) {
        return null;
      }

      throw error;
    }

    return results[0] ?? null;
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
