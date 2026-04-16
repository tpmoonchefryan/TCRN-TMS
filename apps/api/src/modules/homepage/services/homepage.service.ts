// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Injectable,
} from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';

import { HomepageAdminService } from '../application/homepage-admin.service';
import {
    HomepageResponse,
    SaveDraftDto,
    UpdateSettingsDto
} from '../dto/homepage.dto';

@Injectable()
export class HomepageService {
  constructor(private readonly homepageAdminService: HomepageAdminService) {}

  /**
   * Get homepage for talent (creates if not exists)
   */
  async getOrCreate(talentId: string, tenantSchema: string): Promise<HomepageResponse> {
    return this.homepageAdminService.getOrCreate(talentId, tenantSchema);
  }

  /**
   * Save draft
   */
  async saveDraft(
    talentId: string,
    dto: SaveDraftDto,
    context: RequestContext,
  ): Promise<{ draftVersion: { id: string; versionNumber: number; contentHash: string; updatedAt: string }; isNewVersion: boolean }> {
    return this.homepageAdminService.saveDraft(talentId, dto, context);
  }

  /**
   * Publish homepage
   */
  async publish(
    talentId: string,
    context: RequestContext,
  ): Promise<{ publishedVersion: { id: string; versionNumber: number; publishedAt: string }; homepageUrl: string; cdnPurgeStatus: 'success' | 'pending' | 'failed' }> {
    return this.homepageAdminService.publish(talentId, context);
  }

  /**
   * Unpublish homepage
   */
  async unpublish(talentId: string, context: RequestContext): Promise<void> {
    return this.homepageAdminService.unpublish(talentId, context);
  }

  /**
   * Update settings
   */
  async updateSettings(
    talentId: string,
    dto: UpdateSettingsDto,
    context: RequestContext,
  ): Promise<HomepageResponse> {
    return this.homepageAdminService.updateSettings(talentId, dto, context);
  }
}
