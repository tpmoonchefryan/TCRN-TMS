// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes, type RequestContext } from '@tcrn/shared';

import {
  buildHomepageVersionActorMap,
  buildHomepageVersionDetail,
  buildHomepageVersionListItem,
  buildHomepageVersionRestoreDiff,
  buildHomepageVersionRestoreResult,
  collectHomepageVersionActorIds,
  type HomepageVersionDetail,
} from '../domain/homepage-version.policy';
import type {
  VersionListItem,
  VersionListQueryDto,
} from '../dto/homepage.dto';
import { HomepageVersionRepository } from '../infrastructure/homepage-version.repository';

@Injectable()
export class HomepageVersionApplicationService {
  constructor(private readonly homepageVersionRepository: HomepageVersionRepository) {}

  async listVersions(
    talentId: string,
    query: VersionListQueryDto,
    context: RequestContext,
  ): Promise<{ items: VersionListItem[]; total: number }> {
    const tenantSchema = context.tenantSchema ?? '';
    const homepageId = await this.getHomepageIdOrThrow(tenantSchema, talentId);
    const [versions, total] = await Promise.all([
      this.homepageVersionRepository.findHomepageVersions(tenantSchema, homepageId, query),
      this.homepageVersionRepository.countHomepageVersions(
        tenantSchema,
        homepageId,
        query.status,
      ),
    ]);

    const actors = await this.homepageVersionRepository.findSystemUsersByIds(
      tenantSchema,
      collectHomepageVersionActorIds(
        ...versions.flatMap((version) => [version.createdBy, version.publishedBy]),
      ),
    );
    const actorMap = buildHomepageVersionActorMap(actors);

    return {
      items: versions.map((version) =>
        buildHomepageVersionListItem({ version, actorMap }),
      ),
      total,
    };
  }

  async getVersion(
    talentId: string,
    versionId: string,
    context: RequestContext,
  ): Promise<HomepageVersionDetail> {
    const tenantSchema = context.tenantSchema ?? '';
    const homepageId = await this.getHomepageIdOrThrow(tenantSchema, talentId);
    const version = await this.homepageVersionRepository.findHomepageVersionDetail(
      tenantSchema,
      homepageId,
      versionId,
    );

    if (!version) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Version not found',
      });
    }

    const actors = await this.homepageVersionRepository.findSystemUsersByIds(
      tenantSchema,
      collectHomepageVersionActorIds(version.createdBy, version.publishedBy),
    );

    return buildHomepageVersionDetail({
      version,
      actorMap: buildHomepageVersionActorMap(actors),
    });
  }

  async restoreVersion(
    talentId: string,
    versionId: string,
    context: RequestContext,
  ): Promise<{
    newDraftVersion: { id: string; versionNumber: number };
    restoredFrom: { id: string; versionNumber: number };
  }> {
    const tenantSchema = context.tenantSchema ?? '';
    const homepageId = await this.getHomepageIdOrThrow(tenantSchema, talentId);
    const sourceVersion = await this.homepageVersionRepository.findHomepageVersionRestoreSource(
      tenantSchema,
      homepageId,
      versionId,
    );

    if (!sourceVersion) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Version not found',
      });
    }

    const versionNumber =
      (await this.homepageVersionRepository.findLatestHomepageVersionNumber(
        tenantSchema,
        homepageId,
      )) + 1;

    const newDraftVersion = await this.homepageVersionRepository.createDraftVersionFromSource({
      schema: tenantSchema,
      homepageId,
      versionNumber,
      content: sourceVersion.content,
      theme: sourceVersion.theme,
      contentHash: sourceVersion.contentHash,
      userId: context.userId,
    });

    await this.homepageVersionRepository.assignDraftVersion(
      tenantSchema,
      homepageId,
      newDraftVersion.id,
    );
    await this.homepageVersionRepository.insertRestoreChangeLog({
      schema: tenantSchema,
      versionId: newDraftVersion.id,
      versionLabel: `Version ${versionNumber}`,
      diffJson: buildHomepageVersionRestoreDiff(sourceVersion.versionNumber),
      userId: context.userId,
      ipAddress: context.ipAddress || '0.0.0.0',
    });

    return buildHomepageVersionRestoreResult({
      newDraftVersion,
      restoredFrom: sourceVersion,
    });
  }

  private async getHomepageIdOrThrow(
    tenantSchema: string,
    talentId: string,
  ): Promise<string> {
    const homepageId = await this.homepageVersionRepository.findHomepageIdByTalentId(
      tenantSchema,
      talentId,
    );

    if (!homepageId) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Homepage not found',
      });
    }

    return homepageId;
  }
}
