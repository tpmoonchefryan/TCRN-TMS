// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import { Request } from 'express';

import { RequirePermissions, CurrentUser, AuthenticatedUser } from '../../../common/decorators';
import {
  SaveDraftDto,
  PublishDto,
  UpdateSettingsDto,
  VersionListQueryDto,
} from '../dto/homepage.dto';
import { HomepageVersionService } from '../services/homepage-version.service';
import { HomepageService } from '../services/homepage.service';

@ApiTags('Homepage Management')
@Controller('talents/:talentId/homepage')
export class HomepageController {
  constructor(
    private readonly homepageService: HomepageService,
    private readonly versionService: HomepageVersionService,
  ) {}

  // =========================================================================
  // Homepage CRUD
  // =========================================================================

  /**
   * Get homepage (creates if not exists)
   */
  @Get()
  @RequirePermissions({ resource: 'talent.homepage', action: 'read' })
  @ApiOperation({ summary: 'Get homepage configuration' })
  @ApiResponse({ status: 200, description: 'Returns homepage with draft and published versions' })
  async getHomepage(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.homepageService.getOrCreate(talentId, user.tenantSchema);
  }

  /**
   * Save draft
   */
  @Put('draft')
  @RequirePermissions({ resource: 'talent.homepage', action: 'update' })
  @ApiOperation({ summary: 'Save homepage draft' })
  @ApiResponse({ status: 200, description: 'Draft saved' })
  async saveDraft(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: SaveDraftDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.homepageService.saveDraft(talentId, dto, context);
  }

  /**
   * Publish homepage
   */
  @Post('publish')
  @RequirePermissions({ resource: 'talent.homepage', action: 'update' })
  @ApiOperation({ summary: 'Publish homepage' })
  @ApiResponse({ status: 200, description: 'Homepage published' })
  async publish(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: PublishDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.homepageService.publish(talentId, context);
  }

  /**
   * Unpublish homepage
   */
  @Post('unpublish')
  @RequirePermissions({ resource: 'talent.homepage', action: 'update' })
  @ApiOperation({ summary: 'Unpublish homepage' })
  @ApiResponse({ status: 200, description: 'Homepage unpublished' })
  async unpublish(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    await this.homepageService.unpublish(talentId, context);
    return { isPublished: false, unpublishedAt: new Date().toISOString() };
  }

  /**
   * Update settings
   */
  @Patch('settings')
  @RequirePermissions({ resource: 'talent.homepage', action: 'update' })
  @ApiOperation({ summary: 'Update homepage settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updateSettings(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: UpdateSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.homepageService.updateSettings(talentId, dto, context);
  }

  // =========================================================================
  // Domain Verification
  // =========================================================================

  /**
   * Set custom domain
   */
  @Post('domain')
  @RequirePermissions({ resource: 'talent.homepage', action: 'update' })
  @ApiOperation({ summary: 'Set custom domain for homepage' })
  @ApiResponse({ status: 200, description: 'Custom domain set with verification token' })
  async setCustomDomain(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: { customDomain: string | null },
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.homepageService.setCustomDomain(talentId, dto.customDomain, context);
  }

  /**
   * Verify custom domain
   */
  @Post('verify-domain')
  @RequirePermissions({ resource: 'talent.homepage', action: 'update' })
  @ApiOperation({ summary: 'Verify custom domain DNS configuration' })
  @ApiResponse({ status: 200, description: 'Domain verification result' })
  async verifyCustomDomain(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.homepageService.verifyCustomDomain(talentId, context);
  }

  // =========================================================================
  // Version Management
  // =========================================================================

  /**
   * List versions
   */
  @Get('versions')
  @RequirePermissions({ resource: 'talent.homepage', action: 'read' })
  @ApiOperation({ summary: 'List homepage versions' })
  @ApiResponse({ status: 200, description: 'Returns version list' })
  async listVersions(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Query() query: VersionListQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    const result = await this.versionService.listVersions(talentId, query, context);
    return {
      items: result.items,
      meta: { total: result.total },
    };
  }

  /**
   * Get version detail
   */
  @Get('versions/:versionId')
  @RequirePermissions({ resource: 'talent.homepage', action: 'read' })
  @ApiOperation({ summary: 'Get version detail' })
  @ApiResponse({ status: 200, description: 'Returns version detail' })
  async getVersion(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.versionService.getVersion(talentId, versionId, context);
  }

  /**
   * Restore version
   */
  @Post('versions/:versionId/restore')
  @RequirePermissions({ resource: 'talent.homepage', action: 'update' })
  @ApiOperation({ summary: 'Restore version to draft' })
  @ApiResponse({ status: 200, description: 'Version restored' })
  async restoreVersion(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.versionService.restoreVersion(talentId, versionId, context);
  }

  /**
   * Build request context
   */
  private buildContext(
    user: AuthenticatedUser,
    req: Request,
  ): RequestContext {
    return {
      userId: user.id,
      userName: user.username,
      ipAddress: (req.ip || req.socket?.remoteAddress) ?? undefined,
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id'] as string,
      tenantId: user.tenantId,
      tenantSchema: user.tenantSchema,
    };
  }
}
