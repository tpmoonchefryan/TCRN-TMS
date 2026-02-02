// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { HomepageContent, ThemeConfig } from '../dto/homepage.dto';

export interface PublicHomepageData {
  talent: {
    displayName: string;
    avatarUrl: string | null;
    timezone?: string | null;
  };
  content: HomepageContent;
  theme: ThemeConfig;
  seo: {
    title: string | null;
    description: string | null;
    ogImageUrl: string | null;
  };
  updatedAt: string;
}

@Injectable()
export class PublicHomepageService {
  private readonly logger = new Logger(PublicHomepageService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get published homepage by path
   */
  async getPublishedHomepage(path: string): Promise<PublicHomepageData | null> {
    this.logger.debug(`[getPublishedHomepage] Looking up path: "${path}"`);
    const prisma = this.databaseService.getPrisma();

    // 1. Get all active active tenants to iterate schemas
    // In a production environment with many tenants, this should be replaced by a Global Route Table (public.route_map)
    const tenants = await prisma.$queryRawUnsafe<Array<{ schemaName: string }>>(`
      SELECT schema_name as "schemaName" FROM public.tenant WHERE is_active = true
    `);

    this.logger.debug(`[getPublishedHomepage] Found ${tenants.length} active tenants: ${tenants.map(t => t.schemaName).join(', ')}`);

    for (const tenant of tenants) {
      const schema = tenant.schemaName;

      // 2. Query each tenant for the path (Case Insensitive)
      const talents = await prisma.$queryRawUnsafe<Array<{
        id: string;
        displayName: string;
        avatarUrl: string | null;
        homepagePath: string | null;
        timezone: string | null;
      }>>(`
        SELECT id, display_name as "displayName", avatar_url as "avatarUrl", homepage_path as "homepagePath", timezone
        FROM "${schema}".talent
        WHERE (LOWER(homepage_path) = LOWER($1) OR LOWER(code) = LOWER($1)) AND is_active = true
      `, path);

      this.logger.debug(`[getPublishedHomepage] Schema "${schema}": found ${talents.length} matching talents`);

      if (talents.length > 0) {
        const talent = talents[0];
        this.logger.debug(`[getPublishedHomepage] Found talent: id=${talent.id}, displayName="${talent.displayName}", homepagePath="${talent.homepagePath}"`);

        // 3. Found talent, get homepage
        const homepages = await prisma.$queryRawUnsafe<Array<{
           id: string;
           isPublished: boolean;
           publishedVersionId: string | null;
           seoTitle: string | null;
           seoDescription: string | null;
           ogImageUrl: string | null;
        }>>(`
          SELECT id, is_published as "isPublished", published_version_id as "publishedVersionId",
                 seo_title as "seoTitle", seo_description as "seoDescription", og_image_url as "ogImageUrl"
          FROM "${schema}".talent_homepage
          WHERE talent_id = $1::uuid
        `, talent.id);

        this.logger.debug(`[getPublishedHomepage] Homepage records found: ${homepages.length}`);

        const homepage = homepages[0];
        if (!homepage) {
          this.logger.debug(`[getPublishedHomepage] No homepage record for talent ${talent.id}`);
          return null;
        }

        this.logger.debug(`[getPublishedHomepage] Homepage: id=${homepage.id}, isPublished=${homepage.isPublished}, publishedVersionId=${homepage.publishedVersionId}`);

        if (!homepage.isPublished || !homepage.publishedVersionId) {
          this.logger.debug(`[getPublishedHomepage] Homepage not published or no published version`);
          return null; 
        }

        // 4. Get version
        const versions = await prisma.$queryRawUnsafe<Array<{
          content: Record<string, unknown>;
          theme: Record<string, unknown>;
          publishedAt: Date | null;
          createdAt: Date;
        }>>(`
          SELECT content, theme, published_at as "publishedAt", created_at as "createdAt"
          FROM "${schema}".homepage_version
          WHERE id = $1::uuid
        `, homepage.publishedVersionId);

        this.logger.debug(`[getPublishedHomepage] Version records found: ${versions.length}`);

        const version = versions[0];
        if (!version) {
          this.logger.debug(`[getPublishedHomepage] No version found for id=${homepage.publishedVersionId}`);
          return null;
        }

        this.logger.debug(`[getPublishedHomepage] Version content keys: ${Object.keys(version.content || {}).join(', ')}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.logger.debug(`[getPublishedHomepage] Version content.components length: ${(version.content as any)?.components?.length ?? 'N/A'}`);
        this.logger.debug(`[getPublishedHomepage] Version theme keys: ${Object.keys(version.theme || {}).join(', ')}`);

        const result = {
          talent: {
            displayName: talent.displayName,
            avatarUrl: talent.avatarUrl,
            timezone: talent.timezone,
          },
          content: version.content as unknown as HomepageContent,
          theme: version.theme as unknown as ThemeConfig,
          seo: {
            title: homepage.seoTitle,
            description: homepage.seoDescription,
            ogImageUrl: homepage.ogImageUrl,
          },
          updatedAt: version.publishedAt?.toISOString() ?? version.createdAt.toISOString(),
        };

        this.logger.debug(`[getPublishedHomepage] Returning data for "${talent.displayName}"`);
        return result;
      }
    }

    this.logger.debug(`[getPublishedHomepage] No matching talent found for path "${path}"`);
    return null;
  }

  /**
   * Get published homepage by path (throws if not found)
   */
  async getPublishedHomepageOrThrow(path: string): Promise<PublicHomepageData> {
    const data = await this.getPublishedHomepage(path);

    if (!data) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Homepage not found or not published',
      });
    }

    return data;
  }

  /**
   * Get published homepage by custom domain
   */
  async getPublishedHomepageByDomain(domain: string): Promise<PublicHomepageData | null> {
    const prisma = this.databaseService.getPrisma();

    const homepage = await prisma.talentHomepage.findFirst({
      where: {
        customDomain: domain,
        customDomainVerified: true,
        isPublished: true,
      },
      include: {
        talent: { select: { displayName: true, avatarUrl: true, timezone: true } },
      },
    });

    if (!homepage || !homepage.publishedVersionId) {
      return null;
    }

    const version = await prisma.homepageVersion.findUnique({
      where: { id: homepage.publishedVersionId },
    });

    if (!version) {
      return null;
    }

    return {
      talent: {
        displayName: homepage.talent.displayName,
        avatarUrl: homepage.talent.avatarUrl,
        timezone: homepage.talent.timezone,
      },
      content: version.content as unknown as HomepageContent,
      theme: version.theme as unknown as ThemeConfig,
      seo: {
        title: homepage.seoTitle,
        description: homepage.seoDescription,
        ogImageUrl: homepage.ogImageUrl,
      },
      updatedAt: version.publishedAt?.toISOString() ?? version.createdAt.toISOString(),
    };
  }
}
