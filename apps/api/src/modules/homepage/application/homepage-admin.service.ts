// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_THEME, ErrorCodes, type RequestContext } from '@tcrn/shared';

import {
  buildHomepagePublishResult,
  buildHomepageResponse,
  buildHomepageVersionInfo,
  calculateHomepageDraftHash,
  type HomepageAdminVersionRecord,
  type HomepageCdnPurgeStatus,
  normalizeHomepagePathInput,
} from '../domain/homepage-admin.policy';
import type {
  HomepageResponse,
  SaveDraftDto,
  UpdateSettingsDto,
  VersionInfo,
} from '../dto/homepage.dto';
import { HomepageAdminRepository } from '../infrastructure/homepage-admin.repository';
import { CdnPurgeService } from '../services/cdn-purge.service';

@Injectable()
export class HomepageAdminService {
  constructor(
    private readonly homepageAdminRepository: HomepageAdminRepository,
    private readonly configService: ConfigService,
    private readonly cdnPurgeService: CdnPurgeService,
  ) {}

  async getOrCreate(talentId: string, tenantSchema: string): Promise<HomepageResponse> {
    const talent = await this.homepageAdminRepository.findTalentById(tenantSchema, talentId);

    if (!talent) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    let homepage = await this.homepageAdminRepository.findHomepageByTalentId(tenantSchema, talentId);

    if (!homepage) {
      homepage = await this.homepageAdminRepository.createHomepage(
        tenantSchema,
        talentId,
        DEFAULT_THEME as unknown as Record<string, unknown>,
      );
    }

    const [publishedVersion, draftVersion] = await Promise.all([
      this.resolveVersionInfo(tenantSchema, homepage.publishedVersionId),
      this.resolveVersionInfo(tenantSchema, homepage.draftVersionId),
    ]);

    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');

    return buildHomepageResponse({
      homepage,
      talent,
      publishedVersion,
      draftVersion,
      appUrl,
    });
  }

  async saveDraft(
    talentId: string,
    dto: SaveDraftDto,
    context: RequestContext,
  ): Promise<{
    draftVersion: { id: string; versionNumber: number; contentHash: string; updatedAt: string };
    isNewVersion: boolean;
  }> {
    const tenantSchema = context.tenantSchema ?? '';
    const homepage = await this.homepageAdminRepository.findHomepageDraftPointer(
      tenantSchema,
      talentId,
    );

    if (!homepage) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Homepage not found',
      });
    }

    const contentHash = calculateHomepageDraftHash(dto.content, dto.theme);

    if (homepage.draftVersionId) {
      const currentDraft = await this.homepageAdminRepository.findHomepageVersionSummary(
        tenantSchema,
        homepage.draftVersionId,
      );

      if (currentDraft?.contentHash === contentHash) {
        return {
          draftVersion: {
            id: currentDraft.id,
            versionNumber: currentDraft.versionNumber,
            contentHash,
            updatedAt: new Date().toISOString(),
          },
          isNewVersion: false,
        };
      }
    }

    const versionNumber =
      (await this.homepageAdminRepository.findLatestHomepageVersionNumber(
        tenantSchema,
        homepage.id,
      )) + 1;

    await this.homepageAdminRepository.createDraftVersionAndAssign({
      schema: tenantSchema,
      homepageId: homepage.id,
      versionNumber,
      content: dto.content as unknown as Record<string, unknown>,
      theme: (dto.theme ?? DEFAULT_THEME) as unknown as Record<string, unknown>,
      contentHash,
      userId: context.userId,
    });

    const createdVersion = await this.homepageAdminRepository.findHomepageVersionByNumber(
      tenantSchema,
      homepage.id,
      versionNumber,
    );

    if (!createdVersion) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Draft version not found after save',
      });
    }

    return {
      draftVersion: {
        id: createdVersion.id,
        versionNumber: createdVersion.versionNumber,
        contentHash: createdVersion.contentHash ?? '',
        updatedAt: createdVersion.createdAt.toISOString(),
      },
      isNewVersion: true,
    };
  }

  async publish(
    talentId: string,
    context: RequestContext,
  ): Promise<{
    publishedVersion: { id: string; versionNumber: number; publishedAt: string };
    homepageUrl: string;
    cdnPurgeStatus: HomepageCdnPurgeStatus;
  }> {
    const tenantSchema = context.tenantSchema ?? '';
    const homepage = await this.homepageAdminRepository.findHomepagePublishTarget(
      tenantSchema,
      talentId,
    );

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
    const publishedVersion = await this.homepageAdminRepository.publishHomepageVersion({
      schema: tenantSchema,
      versionId: homepage.draftVersionId,
      publishedAt,
      userId: context.userId,
    });

    await this.homepageAdminRepository.markHomepagePublished(
      tenantSchema,
      homepage.id,
      publishedVersion.id,
    );

    await this.homepageAdminRepository.appendHomepagePublishChangeLog({
      schema: tenantSchema,
      homepageId: homepage.id,
      versionNumber: publishedVersion.versionNumber,
      userId: context.userId,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    });

    let cdnPurgeStatus: HomepageCdnPurgeStatus = 'pending';
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

    return buildHomepagePublishResult({
      publishedVersion,
      publishedAt,
      homepagePath: homepage.homepagePath,
      appUrl,
      cdnPurgeStatus,
    });
  }

  async unpublish(talentId: string, context: RequestContext): Promise<void> {
    const tenantSchema = context.tenantSchema ?? '';
    const homepage = await this.homepageAdminRepository.findHomepagePublishTarget(
      tenantSchema,
      talentId,
    );

    if (!homepage) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Homepage not found',
      });
    }

    await this.homepageAdminRepository.markHomepageUnpublished(tenantSchema, homepage.id);
    await this.homepageAdminRepository.appendHomepageUnpublishChangeLog({
      schema: tenantSchema,
      homepageId: homepage.id,
      userId: context.userId,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    });

    try {
      await this.cdnPurgeService.purgeHomepage(
        homepage.homepagePath ?? '',
        homepage.customDomain ?? undefined,
      );
    } catch {
      // Ignore CDN purge errors on unpublish to preserve current runtime behavior.
    }
  }

  async updateSettings(
    talentId: string,
    dto: UpdateSettingsDto,
    context: RequestContext,
  ): Promise<HomepageResponse> {
    const tenantSchema = context.tenantSchema ?? '';
    const homepage = await this.homepageAdminRepository.findHomepageSettings(tenantSchema, talentId);

    if (dto.homepagePath !== undefined) {
      const normalizedPath = normalizeHomepagePathInput(dto.homepagePath);

      if (normalizedPath) {
        const existingTalentId = await this.homepageAdminRepository.findTalentIdByHomepagePath(
          tenantSchema,
          normalizedPath,
          talentId,
        );

        if (existingTalentId) {
          throw new ConflictException({
            code: ErrorCodes.RES_ALREADY_EXISTS,
            message: 'Homepage path already taken',
          });
        }
      }

      await this.homepageAdminRepository.updateTalentHomepagePath(
        tenantSchema,
        talentId,
        normalizedPath ?? null,
      );
    }

    if (!homepage) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Homepage not found',
      });
    }

    if (homepage.version !== dto.version) {
      throw new ConflictException({
        code: ErrorCodes.VERSION_CONFLICT,
        message: `Homepage was modified by another user (DB: ${homepage.version}, Sent: ${dto.version})`,
      });
    }

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
    if (dto.homepagePath !== undefined) {
      newValue.homepagePath = dto.homepagePath;
    }

    await this.homepageAdminRepository.updateHomepageSettings({
      schema: tenantSchema,
      homepageId: homepage.id,
      seoTitle: dto.seoTitle ?? homepage.seoTitle,
      seoDescription: dto.seoDescription ?? homepage.seoDescription,
      ogImageUrl: dto.ogImageUrl ?? homepage.ogImageUrl,
      analyticsId: dto.analyticsId ?? homepage.analyticsId,
    });

    await this.homepageAdminRepository.appendHomepageSettingsChangeLog({
      schema: tenantSchema,
      homepageId: homepage.id,
      oldValue,
      newValue,
      userId: context.userId,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    });

    return this.getOrCreate(talentId, tenantSchema);
  }

  private async resolveVersionInfo(
    tenantSchema: string,
    versionId: string | null,
  ): Promise<VersionInfo | null> {
    if (!versionId) {
      return null;
    }

    const version = await this.homepageAdminRepository.findHomepageVersion(tenantSchema, versionId);

    if (!version) {
      return null;
    }

    const publishedBy = await this.resolvePublishedBy(tenantSchema, version);

    return buildHomepageVersionInfo({
      version,
      publishedBy,
    });
  }

  private async resolvePublishedBy(
    tenantSchema: string,
    version: HomepageAdminVersionRecord,
  ) {
    if (!version.publishedBy) {
      return null;
    }

    return this.homepageAdminRepository.findSystemUserById(tenantSchema, version.publishedBy);
  }
}
