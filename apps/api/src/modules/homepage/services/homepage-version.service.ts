// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { type RequestContext } from '@tcrn/shared';

import { HomepageVersionApplicationService } from '../application/homepage-version.service';
import type { HomepageVersionDetail } from '../domain/homepage-version.policy';
import type {
  VersionListItem,
  VersionListQueryDto,
} from '../dto/homepage.dto';

@Injectable()
export class HomepageVersionService {
  constructor(
    private readonly homepageVersionApplicationService: HomepageVersionApplicationService,
  ) {}

  /**
   * List versions for a homepage (multi-tenant aware)
   */
  async listVersions(
    talentId: string,
    query: VersionListQueryDto,
    context: RequestContext,
  ): Promise<{ items: VersionListItem[]; total: number }> {
    return this.homepageVersionApplicationService.listVersions(talentId, query, context);
  }

  /**
   * Get version detail (multi-tenant aware)
   */
  getVersion(
    talentId: string,
    versionId: string,
    context: RequestContext,
  ): Promise<HomepageVersionDetail> {
    return this.homepageVersionApplicationService.getVersion(talentId, versionId, context);
  }

  /**
   * Restore version to draft (multi-tenant aware)
   */
  async restoreVersion(
    talentId: string,
    versionId: string,
    context: RequestContext,
  ): Promise<{ newDraftVersion: { id: string; versionNumber: number }; restoredFrom: { id: string; versionNumber: number } }> {
    return this.homepageVersionApplicationService.restoreVersion(
      talentId,
      versionId,
      context,
    );
  }
}
