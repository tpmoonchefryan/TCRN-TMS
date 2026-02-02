// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import * as crypto from 'crypto';

import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_THEME, ErrorCodes, type RequestContext } from '@tcrn/shared';

import { DatabaseService } from '../../database';
import { ChangeLogService } from '../../log';
import {
    HomepageContent,
    HomepageResponse,
    SaveDraftDto,
    ThemeConfig,
    UpdateSettingsDto
} from '../dto/homepage.dto';

import { CdnPurgeService } from './cdn-purge.service';



const _DEFAULT_CONTENT: HomepageContent = {
  version: '1.0',
  components: [],
};

@Injectable()
export class HomepageService {
  private readonly logger = new Logger(HomepageService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly changeLogService: ChangeLogService,
    private readonly cdnPurgeService: CdnPurgeService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get homepage for talent (creates if not exists)
   */
  async getOrCreate(talentId: string, tenantSchema: string): Promise<HomepageResponse> {
    const prisma = this.databaseService.getPrisma();

    // First check if talent exists in the tenant schema
    const talent = await prisma.$queryRawUnsafe<Array<{ id: string; homepagePath: string | null }>>(`
      SELECT id, homepage_path as "homepagePath"
      FROM "${tenantSchema}".talent
      WHERE id = $1::uuid
    `, talentId);

    if (talent.length === 0) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    const talentRecord = talent[0];

    // Query homepage using raw SQL with tenant schema
    const homepages = await prisma.$queryRawUnsafe<Array<{
      id: string;
      talentId: string;
      isPublished: boolean;
      publishedVersionId: string | null;
      draftVersionId: string | null;
      customDomain: string | null;
      customDomainVerified: boolean;
      seoTitle: string | null;
      seoDescription: string | null;
      ogImageUrl: string | null;
      analyticsId: string | null;
      theme: Record<string, unknown>;
      createdAt: Date;
      updatedAt: Date;
      version: number;
    }>>(`
      SELECT 
        id, talent_id as "talentId", is_published as "isPublished",
        published_version_id as "publishedVersionId", draft_version_id as "draftVersionId",
        custom_domain as "customDomain", custom_domain_verified as "customDomainVerified",
        seo_title as "seoTitle", seo_description as "seoDescription",
        og_image_url as "ogImageUrl", analytics_id as "analyticsId",
        theme, created_at as "createdAt", updated_at as "updatedAt", version
      FROM "${tenantSchema}".talent_homepage
      WHERE talent_id = $1::uuid
    `, talentId);

    let homepage = homepages[0];

    // Create homepage if not exists
    if (!homepage) {
      const created = await prisma.$queryRawUnsafe<Array<typeof homepage>>(`
        INSERT INTO "${tenantSchema}".talent_homepage
          (id, talent_id, is_published, theme, created_at, updated_at, version)
        VALUES
          (gen_random_uuid(), $1::uuid, false, $2::jsonb, now(), now(), 1)
        RETURNING 
          id, talent_id as "talentId", is_published as "isPublished",
          published_version_id as "publishedVersionId", draft_version_id as "draftVersionId",
          custom_domain as "customDomain", custom_domain_verified as "customDomainVerified",
          seo_title as "seoTitle", seo_description as "seoDescription",
          og_image_url as "ogImageUrl", analytics_id as "analyticsId",
          theme, created_at as "createdAt", updated_at as "updatedAt", version
      `, talentId, JSON.stringify(DEFAULT_THEME));
      homepage = created[0];
    }

    // Get versions
    const [publishedVersion, draftVersion] = await Promise.all([
      homepage.publishedVersionId
        ? this.getVersionById(homepage.publishedVersionId, tenantSchema)
        : null,
      homepage.draftVersionId
        ? this.getVersionById(homepage.draftVersionId, tenantSchema)
        : null,
    ]);

    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');

    return {
      id: homepage.id,
      talentId: homepage.talentId,
      isPublished: homepage.isPublished,
      publishedVersion,
      draftVersion,
      customDomain: homepage.customDomain,
      customDomainVerified: homepage.customDomainVerified,
      seoTitle: homepage.seoTitle,
      seoDescription: homepage.seoDescription,
      ogImageUrl: homepage.ogImageUrl,
      analyticsId: homepage.analyticsId,
      homepagePath: talentRecord.homepagePath,
      homepageUrl: talentRecord.homepagePath ? `${appUrl}/p/${talentRecord.homepagePath}` : '',
      createdAt: homepage.createdAt.toISOString(),
      updatedAt: homepage.updatedAt.toISOString(),
      version: homepage.version,
    };
  }

  /**
   * Save draft
   */
  async saveDraft(
    talentId: string,
    dto: SaveDraftDto,
    context: RequestContext,
  ): Promise<{ draftVersion: { id: string; versionNumber: number; contentHash: string; updatedAt: string }; isNewVersion: boolean }> {
    const prisma = this.databaseService.getPrisma();
    const tenantSchema = context.tenantSchema ?? '';

    // Get homepage
    const homepages = await prisma.$queryRawUnsafe<Array<{
      id: string;
      draftVersionId: string | null;
    }>>(`
      SELECT id, draft_version_id as "draftVersionId"
      FROM "${tenantSchema}".talent_homepage
      WHERE talent_id = $1::uuid
    `, talentId);

    const homepage = homepages[0];
    if (!homepage) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Homepage not found',
      });
    }

    // Calculate content+theme hash (both must match to skip save)
    const contentHash = this.calculateHash(dto.content, dto.theme);

    // Check if content+theme changed
    let isNewVersion = true;
    if (homepage.draftVersionId) {
      const currentDrafts = await prisma.$queryRawUnsafe<Array<{
        id: string;
        versionNumber: number;
        contentHash: string | null;
      }>>(`
        SELECT id, version_number as "versionNumber", content_hash as "contentHash"
        FROM "${tenantSchema}".homepage_version
        WHERE id = $1::uuid
      `, homepage.draftVersionId);

      const currentDraft = currentDrafts[0];
      if (currentDraft?.contentHash === contentHash) {
        // Content AND theme unchanged, skip save
        isNewVersion = false;
        return {
          draftVersion: {
            id: currentDraft.id,
            versionNumber: currentDraft.versionNumber,
            contentHash,
            updatedAt: new Date().toISOString(),
          },
          isNewVersion,
        };
      }
    }

    // Get next version number
    const lastVersions = await prisma.$queryRawUnsafe<Array<{ versionNumber: number }>>(`
      SELECT version_number as "versionNumber"
      FROM "${tenantSchema}".homepage_version
      WHERE homepage_id = $1::uuid
      ORDER BY version_number DESC
      LIMIT 1
    `, homepage.id);

    const versionNumber = (lastVersions[0]?.versionNumber ?? 0) + 1;

    // Create new version and update homepage pointer
    const _newVersions = await prisma.$queryRawUnsafe<Array<{
      id: string;
      versionNumber: number;
      contentHash: string | null;
      createdAt: Date;
    }>>(`
      WITH new_version AS (
        INSERT INTO "${tenantSchema}".homepage_version
          (id, homepage_id, version_number, content, theme, status, content_hash, created_by, created_at, updated_at)
        VALUES
          (gen_random_uuid(), $1::uuid, $2, $3::jsonb, $4::jsonb, 'draft', $5, $6::uuid, now(), now())
        RETURNING id, version_number as "versionNumber", content_hash as "contentHash", created_at as "createdAt"
      )
      UPDATE "${tenantSchema}".talent_homepage
      SET draft_version_id = (SELECT id FROM new_version), updated_at = now()
      WHERE id = $1::uuid
      RETURNING (SELECT id FROM new_version), (SELECT "versionNumber" FROM new_version), (SELECT "contentHash" FROM new_version), (SELECT "createdAt" FROM new_version)
    `, homepage.id, versionNumber, JSON.stringify(dto.content), JSON.stringify(dto.theme ?? DEFAULT_THEME), contentHash, context.userId);

    // Due to CTE limitation, query the version separately
    const createdVersions = await prisma.$queryRawUnsafe<Array<{
      id: string;
      versionNumber: number;
      contentHash: string | null;
      createdAt: Date;
    }>>(`
      SELECT id, version_number as "versionNumber", content_hash as "contentHash", created_at as "createdAt"
      FROM "${tenantSchema}".homepage_version
      WHERE homepage_id = $1::uuid AND version_number = $2
    `, homepage.id, versionNumber);

    const newVersion = createdVersions[0];

    return {
      draftVersion: {
        id: newVersion.id,
        versionNumber: newVersion.versionNumber,
        contentHash: newVersion.contentHash ?? '',
        updatedAt: newVersion.createdAt.toISOString(),
      },
      isNewVersion,
    };
  }

  /**
   * Publish homepage
   */
  async publish(
    talentId: string,
    context: RequestContext,
  ): Promise<{ publishedVersion: { id: string; versionNumber: number; publishedAt: string }; homepageUrl: string; cdnPurgeStatus: 'success' | 'pending' | 'failed' }> {
    const prisma = this.databaseService.getPrisma();
    const tenantSchema = context.tenantSchema ?? '';

    // Get homepage and talent info
    const homepages = await prisma.$queryRawUnsafe<Array<{
      id: string;
      draftVersionId: string | null;
      customDomain: string | null;
      homepagePath: string | null;
    }>>(`
      SELECT h.id, h.draft_version_id as "draftVersionId", h.custom_domain as "customDomain", t.homepage_path as "homepagePath"
      FROM "${tenantSchema}".talent_homepage h
      JOIN "${tenantSchema}".talent t ON t.id = h.talent_id
      WHERE h.talent_id = $1::uuid
    `, talentId);

    const homepage = homepages[0];
    if (!homepage) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Homepage not found',
      });
    }

    if (!homepage.draftVersionId) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'No draft to publish',
      });
    }

    const publishedAt = new Date();

    // Update draft version to published
    const updatedVersions = await prisma.$queryRawUnsafe<Array<{
      id: string;
      versionNumber: number;
    }>>(`
      UPDATE "${tenantSchema}".homepage_version
      SET status = 'published', published_at = $2, published_by = $3::uuid, updated_at = now()
      WHERE id = $1::uuid
      RETURNING id, version_number as "versionNumber"
    `, homepage.draftVersionId, publishedAt, context.userId);

    const publishedVersion = updatedVersions[0];

    // Update homepage
    await prisma.$queryRawUnsafe(`
      UPDATE "${tenantSchema}".talent_homepage
      SET is_published = true, published_version_id = $2::uuid, updated_at = now()
      WHERE id = $1::uuid
    `, homepage.id, publishedVersion.id);

    // Record change log (use raw SQL for tenant schema)
    await prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}".change_log
        (id, action, object_type, object_id, object_name, diff, occurred_at, operator_id, ip_address, user_agent)
      VALUES
        (gen_random_uuid(), 'publish', 'talent_homepage', $1::uuid, $2, $3::jsonb, now(), $4::uuid, $5::inet, $6)
    `, homepage.id, `Homepage v${publishedVersion.versionNumber}`, 
       JSON.stringify({ versionNumber: publishedVersion.versionNumber }),
       context.userId, context.ipAddress ?? null, context.userAgent ?? null);

    // Purge CDN cache
    let cdnPurgeStatus: 'success' | 'pending' | 'failed' = 'pending';
    try {
      await this.cdnPurgeService.purgeHomepage(
        homepage.homepagePath ?? '',
        homepage.customDomain ?? undefined,
      );
      cdnPurgeStatus = 'success';
    } catch {
      cdnPurgeStatus = 'failed';
    }

    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');

    return {
      publishedVersion: {
        id: publishedVersion.id,
        versionNumber: publishedVersion.versionNumber,
        publishedAt: publishedAt.toISOString(),
      },
      homepageUrl: `${appUrl}/p/${homepage.homepagePath}`,
      cdnPurgeStatus,
    };
  }

  /**
   * Unpublish homepage
   */
  async unpublish(talentId: string, context: RequestContext): Promise<void> {
    const prisma = this.databaseService.getPrisma();
    const tenantSchema = context.tenantSchema ?? '';

    // Get homepage and talent info
    const homepages = await prisma.$queryRawUnsafe<Array<{
      id: string;
      customDomain: string | null;
      homepagePath: string | null;
    }>>(`
      SELECT h.id, h.custom_domain as "customDomain", t.homepage_path as "homepagePath"
      FROM "${tenantSchema}".talent_homepage h
      JOIN "${tenantSchema}".talent t ON t.id = h.talent_id
      WHERE h.talent_id = $1::uuid
    `, talentId);

    const homepage = homepages[0];
    if (!homepage) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Homepage not found',
      });
    }

    // Update homepage
    await prisma.$queryRawUnsafe(`
      UPDATE "${tenantSchema}".talent_homepage
      SET is_published = false, updated_at = now()
      WHERE id = $1::uuid
    `, homepage.id);

    // Record change log
    await prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}".change_log
        (id, action, object_type, object_id, object_name, occurred_at, operator_id, ip_address, user_agent)
      VALUES
        (gen_random_uuid(), 'unpublish', 'talent_homepage', $1::uuid, 'Homepage', now(), $2::uuid, $3::inet, $4)
    `, homepage.id, context.userId, context.ipAddress ?? null, context.userAgent ?? null);

    // Purge CDN cache
    try {
      await this.cdnPurgeService.purgeHomepage(
        homepage.homepagePath ?? '',
        homepage.customDomain ?? undefined,
      );
    } catch {
      // Ignore CDN purge errors
    }
  }

  /**
   * Update settings
   */
  async updateSettings(
    talentId: string,
    dto: UpdateSettingsDto,
    context: RequestContext,
  ): Promise<HomepageResponse> {
    const prisma = this.databaseService.getPrisma();
    const tenantSchema = context.tenantSchema ?? '';

    // Get homepage
    const homepages = await prisma.$queryRawUnsafe<Array<{
      id: string;
      seoTitle: string | null;
      seoDescription: string | null;
      ogImageUrl: string | null;
      analyticsId: string | null;
      customDomain: string | null;
      customDomainVerified: boolean;
      version: number;
    }>>(`
      SELECT id, seo_title as "seoTitle", seo_description as "seoDescription",
             og_image_url as "ogImageUrl", analytics_id as "analyticsId",
             custom_domain as "customDomain", custom_domain_verified as "customDomainVerified", version
      FROM "${tenantSchema}".talent_homepage
      WHERE talent_id = $1::uuid
    `, talentId);
    
    // Check if homepagePath is being updated
    if (dto.homepagePath !== undefined) {
      // Normalize the path:
      // 1. Trim whitespace
      // 2. Convert to lowercase
      // 3. Remove path separators and only keep the last segment (e.g., "virtuareal/shiori" -> "shiori")
      // 4. Remove any special characters except alphanumeric and hyphen
      let normalizedPath: string | null = null;
      if (dto.homepagePath) {
        const trimmed = dto.homepagePath.trim().toLowerCase();
        // Extract last segment if path contains separators
        const segments = trimmed.split('/').filter(s => s.length > 0);
        const lastSegment = segments.length > 0 ? segments[segments.length - 1] : trimmed;
        // Only allow alphanumeric characters, hyphens, and underscores
        normalizedPath = lastSegment.replace(/[^a-z0-9\-_]/g, '') || null;
      }
      this.logger.debug(`[updateSettings] Updating homepagePath to "${normalizedPath}" (original: "${dto.homepagePath}") for talent ${talentId}`);
      
      // Check for uniqueness if not null
      if (normalizedPath) {
        const existingPath = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
           SELECT id FROM "${tenantSchema}".talent WHERE LOWER(homepage_path) = $1 AND id != $2::uuid
        `, normalizedPath, talentId);
        
        if (existingPath.length > 0) {
           throw new ConflictException({
             code: ErrorCodes.RES_ALREADY_EXISTS,
             message: 'Homepage path already taken',
           });
        }
      }

      // Update Talent - homepage_path is stored on talent table
      const updateResult = await prisma.$executeRawUnsafe(`
        UPDATE "${tenantSchema}".talent
        SET homepage_path = $1, updated_at = now()
        WHERE id = $2::uuid
      `, normalizedPath, talentId);
      
      this.logger.debug(`[updateSettings] Talent homepage_path update result: ${updateResult} rows affected`);
      
      // Verify the update
      const verifyTalent = await prisma.$queryRawUnsafe<Array<{ homepagePath: string | null }>>(`
        SELECT homepage_path as "homepagePath" FROM "${tenantSchema}".talent WHERE id = $1::uuid
      `, talentId);
      this.logger.debug(`[updateSettings] Verified talent homepage_path: "${verifyTalent[0]?.homepagePath}"`);
    }

    const homepage = homepages[0];
    if (!homepage) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Homepage not found',
      });
    }

    // Check optimistic lock
    if (homepage.version !== dto.version) {
      throw new ConflictException({
        code: ErrorCodes.VERSION_CONFLICT,
        message: `Homepage was modified by another user (DB: ${homepage.version}, Sent: ${dto.version})`,
      });
    }

    // Verify custom domain uniqueness
    if (dto.customDomain) {
      const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT id FROM "${tenantSchema}".talent_homepage
        WHERE custom_domain = $1 AND id != $2::uuid
      `, dto.customDomain, homepage.id);

      if (existing.length > 0) {
        throw new ConflictException({
          code: ErrorCodes.RES_ALREADY_EXISTS,
          message: 'Domain already in use',
        });
      }
    }

    // Track old/new values for change log
    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};

    if (dto.seoTitle !== undefined) {
      oldValue.seoTitle = homepage.seoTitle;
      newValue.seoTitle = dto.seoTitle;
    }
    if (dto.seoDescription !== undefined) {
      oldValue.seoDescription = homepage.seoDescription;
      newValue.seoDescription = dto.seoDescription;
    }
    if (dto.ogImageUrl !== undefined) {
      oldValue.ogImageUrl = homepage.ogImageUrl;
      newValue.ogImageUrl = dto.ogImageUrl;
    }
    if (dto.analyticsId !== undefined) {
      oldValue.analyticsId = homepage.analyticsId;
      newValue.analyticsId = dto.analyticsId;
    }
    if (dto.customDomain !== undefined) {
      oldValue.customDomain = homepage.customDomain;
      // Normalization: Treat empty string as null
      newValue.customDomain = dto.customDomain || null;
    }
    if (dto.homepagePath !== undefined) {
       // Note: homepagePath is on Talent, but we log it here for completeness
       newValue.homepagePath = dto.homepagePath;
    }

    // Update homepage
    const newCustomDomain = dto.customDomain !== undefined 
      ? (dto.customDomain || null) 
      : homepage.customDomain;
      
    // If custom domain changed, reset verification
    const customDomainVerified = newCustomDomain !== homepage.customDomain ? false : homepage.customDomainVerified;

    // Note: setCustomDomain logic clears token and verification. We should probably mirror that here or rely on setCustomDomain.
    // However, updateSettings is often used for SEO, so we should be careful about side-effects on domain.
    // Since we are creating a sql string, if we want to clear token we need to add it to SET list.
    // For now, let's just match the previous behavior but fix the empty string issue.
    
    await prisma.$queryRawUnsafe(`
      UPDATE "${tenantSchema}".talent_homepage
      SET seo_title = $2, seo_description = $3, og_image_url = $4, analytics_id = $5,
          custom_domain = $6, custom_domain_verified = $7, version = version + 1, updated_at = now()
      WHERE id = $1::uuid
    `, homepage.id, dto.seoTitle ?? homepage.seoTitle, dto.seoDescription ?? homepage.seoDescription,
       dto.ogImageUrl ?? homepage.ogImageUrl, dto.analyticsId ?? homepage.analyticsId,
       newCustomDomain, customDomainVerified);

    // Record change log
    await prisma.$queryRawUnsafe(`
      INSERT INTO "${tenantSchema}".change_log
        (id, action, object_type, object_id, object_name, diff, occurred_at, operator_id, ip_address, user_agent)
      VALUES
        (gen_random_uuid(), 'update', 'talent_homepage', $1::uuid, 'Homepage settings', jsonb_build_object('old', $2::jsonb, 'new', $3::jsonb), now(), $4::uuid, $5::inet, $6)
    `, homepage.id, JSON.stringify(oldValue), JSON.stringify(newValue),
       context.userId, context.ipAddress ?? null, context.userAgent ?? null);

    return this.getOrCreate(talentId, tenantSchema);
  }

  /**
   * Get version by ID
   */
  private async getVersionById(versionId: string, tenantSchema: string) {
    const prisma = this.databaseService.getPrisma();

    const versions = await prisma.$queryRawUnsafe<Array<{
      id: string;
      versionNumber: number;
      content: Record<string, unknown>;
      theme: Record<string, unknown>;
      publishedAt: Date | null;
      publishedBy: string | null;
      createdAt: Date;
    }>>(`
      SELECT 
        id, version_number as "versionNumber", content, theme,
        published_at as "publishedAt", published_by as "publishedBy",
        created_at as "createdAt"
      FROM "${tenantSchema}".homepage_version
      WHERE id = $1::uuid
    `, versionId);

    const version = versions[0];
    if (!version) return null;

    // Get publisher info from public schema (system_user)
    let publishedBy = null;
    if (version.publishedBy) {
      const users = await prisma.$queryRawUnsafe<Array<{ id: string; username: string }>>(`
        SELECT id, username FROM "${tenantSchema}".system_user WHERE id = $1::uuid
      `, version.publishedBy);
      publishedBy = users[0] || null;
    }

    return {
      id: version.id,
      versionNumber: version.versionNumber,
      content: version.content as unknown as HomepageContent,
      theme: version.theme as unknown as ThemeConfig,
      publishedAt: version.publishedAt?.toISOString() ?? null,
      publishedBy,
      createdAt: version.createdAt.toISOString(),
    };
  }

  /**
 * Calculate content hash (includes theme for change detection)
 */
private calculateHash(content: HomepageContent, theme?: ThemeConfig | null): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ content, theme: theme ?? null }))
    .digest('hex');
}
  /**
   * Generate domain verification token
   */
  async generateVerificationToken(
    talentId: string,
    context: RequestContext,
  ): Promise<{ token: string; txtRecord: string }> {
    const prisma = this.databaseService.getPrisma();
    const tenantSchema = context.tenantSchema ?? '';

    // Generate random token
    const token = crypto.randomBytes(32).toString('hex');
    const txtRecord = `tcrn-verify=${token}`;

    // Store token in database
    await prisma.$queryRawUnsafe(`
      UPDATE "${tenantSchema}".talent_homepage
      SET custom_domain_verification_token = $2, updated_at = now()
      WHERE talent_id = $1::uuid
    `, talentId, token);

    return { token, txtRecord };
  }

  /**
   * Verify custom domain by checking DNS TXT record
   */
  async verifyCustomDomain(
    talentId: string,
    context: RequestContext,
  ): Promise<{ verified: boolean; message: string }> {
    const { promises: dns } = await import('dns');
    const prisma = this.databaseService.getPrisma();
    const tenantSchema = context.tenantSchema ?? '';

    // Get homepage with domain info
    const homepages = await prisma.$queryRawUnsafe<Array<{
      id: string;
      customDomain: string | null;
      customDomainVerificationToken: string | null;
    }>>(`
      SELECT id, custom_domain as "customDomain", 
             custom_domain_verification_token as "customDomainVerificationToken"
      FROM "${tenantSchema}".talent_homepage
      WHERE talent_id = $1::uuid
    `, talentId);

    const homepage = homepages[0];
    if (!homepage) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Homepage not found',
      });
    }

    if (!homepage.customDomain) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'No custom domain set',
      });
    }

    if (!homepage.customDomainVerificationToken) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'No verification token generated. Please generate a token first.',
      });
    }

    try {
      // Query TXT records for the domain
      const records = await dns.resolveTxt(homepage.customDomain);
      const flatRecords = records.flat();
      
      const expectedRecord = `tcrn-verify=${homepage.customDomainVerificationToken}`;
      const found = flatRecords.some(record => record === expectedRecord);

      if (found) {
        // Update verification status
        await prisma.$queryRawUnsafe(`
          UPDATE "${tenantSchema}".talent_homepage
          SET custom_domain_verified = true, updated_at = now()
          WHERE id = $1::uuid
        `, homepage.id);

        return { verified: true, message: 'Domain verified successfully' };
      } else {
        return { 
          verified: false, 
          message: `TXT record not found. Expected: ${expectedRecord}` 
        };
      }
    } catch (error) {
      this.logger.warn(`DNS verification failed for ${homepage.customDomain}: ${error}`);
      return { 
        verified: false, 
        message: 'DNS lookup failed. Please ensure the TXT record is properly configured.' 
      };
    }
  }

  /**
   * Set custom domain for homepage
   */
  async setCustomDomain(
    talentId: string,
    customDomain: string | null,
    context: RequestContext,
  ): Promise<{ customDomain: string | null; token: string | null; txtRecord: string | null }> {
    const prisma = this.databaseService.getPrisma();
    const tenantSchema = context.tenantSchema ?? '';

    // Ensure homepage exists
    const homepage = await this.getOrCreate(talentId, tenantSchema);
    if (!homepage) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Homepage not found',
      });
    }

    if (!customDomain) {
      // Remove custom domain
      await prisma.$queryRawUnsafe(`
        UPDATE "${tenantSchema}".talent_homepage
        SET custom_domain = NULL, 
            custom_domain_verified = false, 
            custom_domain_verification_token = NULL,
            updated_at = now()
        WHERE talent_id = $1::uuid
      `, talentId);
      return { customDomain: null, token: null, txtRecord: null };
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const txtRecord = `tcrn-verify=${token}`;

    // Update homepage with new domain and token
    await prisma.$queryRawUnsafe(`
      UPDATE "${tenantSchema}".talent_homepage
      SET custom_domain = $2, 
          custom_domain_verified = false, 
          custom_domain_verification_token = $3,
          updated_at = now()
      WHERE talent_id = $1::uuid
    `, talentId, customDomain.toLowerCase(), token);

    return { customDomain: customDomain.toLowerCase(), token, txtRecord };
  }
}

