// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) - PolyForm Noncommercial License
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ErrorCodes,
  PublicPresenceDocumentSchema,
  type PublicPresencePhaseVisibility,
  type PublicPresenceProjection,
  type PublicPresencePublicProjection,
  type PublicPresenceValidationSnapshot,
  PublicPresenceValidationSnapshotSchema,
  resolvePublicPresenceTemplateTypeCode,
} from '@tcrn/shared';

import type { PublicHomepageTalentRecord } from '../domain/public-homepage-read.policy';
import {
  buildPublicHomepageProjection,
  type BuildPublicHomepageProjectionRouteInput,
  buildPublicPresenceProjectionFromDocument,
} from '../domain/public-presence-projection.policy';
import { HomepageAdminRepository } from '../infrastructure/homepage-admin.repository';
import { PublicHomepageReadRepository } from '../infrastructure/public-homepage-read.repository';
import { PublicPresenceFoundationRepository } from '../infrastructure/public-presence-foundation.repository';
import { PublicHomepageService } from './public-homepage.service';
import { PublicPresenceStudioService } from './public-presence-studio.service';

@Injectable()
export class PublicHomepageProjectionService {
  constructor(
    private readonly publicHomepageService: PublicHomepageService,
    private readonly publicHomepageReadRepository: PublicHomepageReadRepository,
    private readonly publicPresenceFoundationRepository: PublicPresenceFoundationRepository,
    private readonly homepageAdminRepository: HomepageAdminRepository,
    private readonly publicPresenceStudioService: PublicPresenceStudioService
  ) {}

  async getPublishedHomepageProjectionOrThrow(path: string): Promise<PublicPresenceProjection> {
    const resolved = await this.resolveTalentByLegacyPath(path);

    if (resolved) {
      const liveProjection = await this.buildLiveProjectionForTalent(
        resolved.schema,
        resolved.talent,
        {
          canonicalPath: `/p/${path}`,
          legacyPath: path,
        }
      );

      if (liveProjection) {
        return liveProjection;
      }
    }

    const data = await this.publicHomepageService.getPublishedHomepageOrThrow(path);

    return buildPublicHomepageProjection(data, {
      canonicalPath: `/p/${path}`,
      legacyPath: path,
    });
  }

  async getPublishedHomepageProjectionByCodesOrThrow(
    tenantCode: string,
    talentCode: string
  ): Promise<PublicPresenceProjection> {
    const tenantSchema =
      await this.publicHomepageReadRepository.findActiveTenantSchemaByCode(tenantCode);

    if (tenantSchema) {
      const talent = await this.publicHomepageReadRepository.findPublishedTalentByCode(
        tenantSchema,
        talentCode
      );

      if (talent) {
        const liveProjection = await this.buildLiveProjectionForTalent(tenantSchema, talent, {
          canonicalPath: `/${tenantCode}/${talentCode}/homepage`,
          tenantCode,
          talentCode,
        });

        if (liveProjection) {
          return liveProjection;
        }
      }
    }

    const data = await this.publicHomepageService.getPublishedHomepageByCodesOrThrow(
      tenantCode,
      talentCode
    );

    return buildPublicHomepageProjection(data, {
      canonicalPath: `/${tenantCode}/${talentCode}/homepage`,
      tenantCode,
      talentCode,
    });
  }

  async getDraftPreviewProjectionOrThrow(
    talentId: string,
    tenantSchema: string,
    revealPhaseOverride?: PublicPresencePhaseVisibility | 'current' | null,
    templateIdInput?: string | null
  ): Promise<PublicPresenceProjection> {
    const talent = await this.homepageAdminRepository.findTalentById(tenantSchema, talentId);

    if (!talent) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    const portal = await this.publicPresenceFoundationRepository.findPortalByTalentId(
      tenantSchema,
      talentId
    );

    if (!portal) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Public Presence draft not found',
      });
    }

    const requestedTemplateId = templateIdInput?.trim();
    const version = requestedTemplateId
      ? await this.publicPresenceFoundationRepository.findLatestVersionByTemplate(
          tenantSchema,
          portal.id,
          requestedTemplateId
        )
      : portal.draftVersionId
        ? await this.publicPresenceFoundationRepository.findDocumentVersionById(
            tenantSchema,
            portal.draftVersionId
          )
        : portal.liveVersionId
          ? await this.publicPresenceFoundationRepository.findDocumentVersionById(
              tenantSchema,
              portal.liveVersionId
            )
          : null;

    if (!version) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Public Presence version not found',
      });
    }

    const workspace = await this.publicPresenceStudioService.getWorkspace(
      talentId,
      tenantSchema,
      version.templateId
    );

    if (workspace.homepagePolicy.status !== 'ready') {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        details: {
          homepagePolicy: workspace.homepagePolicy,
          templateId: version.templateId,
        },
        message:
          'Fan preview is blocked because the current Artist Stage policy does not allow this template.',
      });
    }

    const pinnedTemplateAssetId = version.templateAssetPin?.assetId ?? null;
    const pinnedTemplateManifest = version.templateAssetPin?.snapshot?.manifest;
    const pinnedTemplateTypeCode =
      pinnedTemplateManifest?.assetKind === 'template'
        ? (pinnedTemplateManifest.templateTypeCode ??
          resolvePublicPresenceTemplateTypeCode(pinnedTemplateManifest.templateId))
        : null;

    if (
      pinnedTemplateTypeCode &&
      !workspace.homepagePolicy.allowedTemplateTypeCodes.includes(pinnedTemplateTypeCode)
    ) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        details: {
          homepagePolicy: workspace.homepagePolicy,
          templateAssetId: pinnedTemplateAssetId,
          templateId: version.templateId,
        },
        message:
          'Fan preview is blocked because the selected template asset is outside the current Artist Stage policy.',
      });
    }

    if (!pinnedTemplateTypeCode) {
      const selectedTemplateAsset = workspace.templateAssets.find(
        (asset) => asset.templateId === version.templateId && asset.isSelectable
      );

      if (!selectedTemplateAsset) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          details: {
            homepagePolicy: workspace.homepagePolicy,
            templateAssetId: pinnedTemplateAssetId,
            templateId: version.templateId,
          },
          message:
            'Fan preview is blocked because the selected template asset is outside the current Artist Stage policy.',
        });
      }
    }

    const tenantCode =
      (await this.homepageAdminRepository.findTenantCodeBySchema(tenantSchema)) ?? tenantSchema;
    const validationSnapshot = await this.loadValidationSnapshot(
      tenantSchema,
      version.lastValidationSnapshotId
    );

    return buildPublicPresenceProjectionFromDocument({
      contentHash: version.contentHash,
      createdAt: version.createdAt.toISOString(),
      document: PublicPresenceDocumentSchema.parse(version.document),
      documentVersionId: version.id,
      mode: 'preview',
      portalId: portal.id,
      rebuiltAt: version.updatedAt.toISOString(),
      revealPhaseOverride: revealPhaseOverride ?? 'current',
      route: {
        canonicalPath: `/${tenantCode}/${talent.code}/homepage`,
        legacyPath: talent.homepagePath,
        talentCode: talent.code,
        tenantCode,
      },
      source: 'publicPresenceDocument',
      talentDisplayName: talent.displayName,
      templateAssetPin: version.templateAssetPin,
      validationSnapshot,
      validationSnapshotId: version.lastValidationSnapshotId,
    });
  }

  async getPublishedPublicHomepageOrThrow(path: string): Promise<PublicPresencePublicProjection> {
    return this.toPublicProjection(await this.getPublishedHomepageProjectionOrThrow(path));
  }

  async getPublishedPublicHomepageByCodesOrThrow(
    tenantCode: string,
    talentCode: string
  ): Promise<PublicPresencePublicProjection> {
    return this.toPublicProjection(
      await this.getPublishedHomepageProjectionByCodesOrThrow(tenantCode, talentCode)
    );
  }

  private async resolveTalentByLegacyPath(path: string): Promise<{
    schema: string;
    talent: PublicHomepageTalentRecord;
  } | null> {
    const tenantSchemas = await this.publicHomepageReadRepository.listActiveTenantSchemas();

    for (const schema of tenantSchemas) {
      const talent = await this.publicHomepageReadRepository.findPublishedTalentByPath(
        schema,
        path
      );

      if (talent) {
        return { schema, talent };
      }
    }

    return null;
  }

  private async buildLiveProjectionForTalent(
    schema: string,
    talent: PublicHomepageTalentRecord,
    route: BuildPublicHomepageProjectionRouteInput
  ): Promise<PublicPresenceProjection | null> {
    const portal = await this.publicPresenceFoundationRepository.findPortalByTalentId(
      schema,
      talent.id
    );

    if (!portal?.liveVersionId) {
      return null;
    }

    const liveVersion = await this.publicPresenceFoundationRepository.findDocumentVersionById(
      schema,
      portal.liveVersionId
    );

    if (!liveVersion) {
      return null;
    }
    const validationSnapshot = await this.loadValidationSnapshot(
      schema,
      liveVersion.lastValidationSnapshotId
    );

    return buildPublicPresenceProjectionFromDocument({
      contentHash: liveVersion.contentHash,
      createdAt: liveVersion.createdAt.toISOString(),
      document: PublicPresenceDocumentSchema.parse(liveVersion.document),
      documentVersionId: liveVersion.id,
      mode: 'projection',
      portalId: portal.id,
      rebuiltAt: liveVersion.updatedAt.toISOString(),
      route: {
        ...route,
        legacyPath: route.legacyPath ?? talent.homepagePath,
        talentCode: route.talentCode ?? talent.code,
      },
      source: 'publicPresenceDocument',
      talentDisplayName: talent.displayName,
      templateAssetPin: liveVersion.templateAssetPin,
      validationSnapshot,
      validationSnapshotId: liveVersion.lastValidationSnapshotId,
    });
  }

  private async loadValidationSnapshot(
    tenantSchema: string,
    validationSnapshotId: string | null
  ): Promise<PublicPresenceValidationSnapshot | null> {
    if (!validationSnapshotId) {
      return null;
    }

    const record = await this.publicPresenceFoundationRepository.findValidationSnapshotById(
      tenantSchema,
      validationSnapshotId
    );

    if (!record) {
      return null;
    }

    return PublicPresenceValidationSnapshotSchema.parse({
      ...record.snapshot,
      projectionHash:
        (record.snapshot as { projectionHash?: string | null }).projectionHash ?? null,
    }) as PublicPresenceValidationSnapshot;
  }

  toPublicProjection(projection: PublicPresenceProjection): PublicPresencePublicProjection {
    return {
      projectionSchemaVersion: projection.projectionSchemaVersion,
      resolvedRevealPhase: projection.resolvedRevealPhase,
      route: {
        canonicalPath: projection.route.canonicalPath,
        legacyPath: projection.route.legacyPath,
        tenantCode: projection.route.tenantCode,
        talentCode: projection.route.talentCode,
        domainHostname: projection.route.domainHostname,
      },
      metadata: projection.metadata,
      appearance: projection.appearance,
      sections: projection.sections,
      actions: projection.actions,
      media: projection.media,
    };
  }
}
