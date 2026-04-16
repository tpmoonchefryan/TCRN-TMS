// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import { Request } from 'express';

import {
    AuthenticatedUser,
    CurrentUser,
    RequirePermissions,
    RequirePublishedTalentAccess,
} from '../../../common/decorators';
import {
    PublishDto,
    SaveDraftDto,
    UpdateSettingsDto,
    VersionListQueryDto,
} from '../dto/homepage.dto';
import { HomepageService } from '../services/homepage.service';
import { HomepageVersionService } from '../services/homepage-version.service';

const createSuccessEnvelopeSchema = (dataSchema: Record<string, unknown>, exampleData: unknown) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: dataSchema,
  },
  required: ['success', 'data'],
  example: {
    success: true,
    data: exampleData,
  },
});

const createPaginatedEnvelopeSchema = (itemSchema: Record<string, unknown>, exampleItem: unknown) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: { type: 'array', items: itemSchema },
    meta: {
      type: 'object',
      properties: {
        total: { type: 'integer', example: 1 },
      },
      required: ['total'],
    },
  },
  required: ['success', 'data', 'meta'],
  example: {
    success: true,
    data: [exampleItem],
    meta: { total: 1 },
  },
});

const createErrorEnvelopeSchema = (code: string, message: string) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: code },
        message: { type: 'string', example: message },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
  example: {
    success: false,
    error: {
      code,
      message,
    },
  },
});

const HOMEPAGE_VERSION_INFO_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440010' },
    versionNumber: { type: 'integer', example: 3 },
    content: { type: 'object', additionalProperties: true },
    theme: { type: 'object', additionalProperties: true },
    publishedAt: { type: 'string', nullable: true, format: 'date-time', example: '2026-04-13T09:00:00.000Z' },
    publishedBy: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440111' },
        username: { type: 'string', example: 'operator' },
      },
    },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T08:00:00.000Z' },
  },
  required: ['id', 'versionNumber', 'content', 'theme', 'createdAt'],
};

const HOMEPAGE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
    talentId: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440001' },
    isPublished: { type: 'boolean', example: true },
    publishedVersion: { ...HOMEPAGE_VERSION_INFO_SCHEMA, nullable: true },
    draftVersion: { ...HOMEPAGE_VERSION_INFO_SCHEMA, nullable: true },
    customDomain: { type: 'string', nullable: true, example: 'fanpage.example.com' },
    customDomainVerified: { type: 'boolean', example: true },
    seoTitle: { type: 'string', nullable: true, example: 'My Fan Page' },
    seoDescription: { type: 'string', nullable: true, example: 'Welcome to my fan page!' },
    ogImageUrl: { type: 'string', nullable: true, example: 'https://example.com/og.jpg' },
    analyticsId: { type: 'string', nullable: true, example: 'G-XXXXXXXXXX' },
    homepagePath: { type: 'string', nullable: true, example: 'my-page' },
    homepageUrl: { type: 'string', example: 'https://app.tcrn.dev/p/my-page' },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T08:00:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:30:00.000Z' },
    version: { type: 'integer', example: 4 },
  },
  required: ['id', 'talentId', 'isPublished', 'customDomainVerified', 'homepageUrl', 'createdAt', 'updatedAt', 'version'],
};

const HOMEPAGE_DRAFT_SAVE_SCHEMA = {
  type: 'object',
  properties: {
    draftVersion: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440010' },
        versionNumber: { type: 'integer', example: 4 },
        contentHash: { type: 'string', example: 'abc123hash' },
        updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:30:00.000Z' },
      },
      required: ['id', 'versionNumber', 'contentHash', 'updatedAt'],
    },
    isNewVersion: { type: 'boolean', example: true },
  },
  required: ['draftVersion', 'isNewVersion'],
};

const HOMEPAGE_PUBLISH_SCHEMA = {
  type: 'object',
  properties: {
    publishedVersion: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440010' },
        versionNumber: { type: 'integer', example: 4 },
        publishedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:35:00.000Z' },
      },
      required: ['id', 'versionNumber', 'publishedAt'],
    },
    homepageUrl: { type: 'string', example: 'https://app.tcrn.dev/p/my-page' },
    cdnPurgeStatus: { type: 'string', enum: ['success', 'pending', 'failed'], example: 'success' },
  },
  required: ['publishedVersion', 'homepageUrl', 'cdnPurgeStatus'],
};

const HOMEPAGE_UNPUBLISH_SCHEMA = {
  type: 'object',
  properties: {
    isPublished: { type: 'boolean', example: false },
    unpublishedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:40:00.000Z' },
  },
  required: ['isPublished', 'unpublishedAt'],
};

const HOMEPAGE_VERSION_LIST_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440010' },
    versionNumber: { type: 'integer', example: 4 },
    status: { type: 'string', enum: ['draft', 'published', 'archived'], example: 'published' },
    contentPreview: { type: 'string', example: 'ProfileCard, SocialLinks, ImageGallery' },
    componentCount: { type: 'integer', example: 3 },
    publishedAt: { type: 'string', nullable: true, format: 'date-time', example: '2026-04-13T09:35:00.000Z' },
    publishedBy: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440111' },
        username: { type: 'string', example: 'operator' },
      },
    },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:30:00.000Z' },
    createdBy: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440111' },
        username: { type: 'string', example: 'operator' },
      },
    },
  },
  required: ['id', 'versionNumber', 'status', 'contentPreview', 'componentCount', 'createdAt'],
};

const HOMEPAGE_RESTORE_SCHEMA = {
  type: 'object',
  properties: {
    newDraftVersion: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440012' },
        versionNumber: { type: 'integer', example: 5 },
      },
      required: ['id', 'versionNumber'],
    },
    restoredFrom: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440010' },
        versionNumber: { type: 'integer', example: 4 },
      },
      required: ['id', 'versionNumber'],
    },
  },
  required: ['newDraftVersion', 'restoredFrom'],
};

const HOMEPAGE_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(HOMEPAGE_RESPONSE_SCHEMA, {
  id: '550e8400-e29b-41d4-a716-446655440000',
  talentId: '550e8400-e29b-41d4-a716-446655440001',
  isPublished: true,
  publishedVersion: {
    id: '550e8400-e29b-41d4-a716-446655440010',
    versionNumber: 4,
    content: { version: '1.0', components: [] },
    theme: { preset: 'default' },
    publishedAt: '2026-04-13T09:35:00.000Z',
    publishedBy: { id: '550e8400-e29b-41d4-a716-446655440111', username: 'operator' },
    createdAt: '2026-04-13T09:30:00.000Z',
  },
  draftVersion: null,
  customDomain: 'fanpage.example.com',
  customDomainVerified: true,
  seoTitle: 'My Fan Page',
  seoDescription: 'Welcome to my fan page!',
  ogImageUrl: 'https://example.com/og.jpg',
  analyticsId: 'G-XXXXXXXXXX',
  homepagePath: 'my-page',
  homepageUrl: 'https://app.tcrn.dev/p/my-page',
  createdAt: '2026-04-13T08:00:00.000Z',
  updatedAt: '2026-04-13T09:35:00.000Z',
  version: 4,
});

const HOMEPAGE_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema('RES_NOT_FOUND', 'Homepage not found');
const HOMEPAGE_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema('AUTH_UNAUTHORIZED', 'Authentication required');
const HOMEPAGE_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema('VALIDATION_FAILED', 'No draft to publish');
const HOMEPAGE_CONFLICT_SCHEMA = createErrorEnvelopeSchema('RES_CONFLICT', 'Homepage path already taken');

@ApiTags('Ops - Homepage')
@ApiBearerAuth()
@RequirePublishedTalentAccess()
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
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Returns homepage with draft and published versions', schema: HOMEPAGE_SUCCESS_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to access homepage admin', schema: HOMEPAGE_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 404, description: 'Homepage or talent was not found', schema: HOMEPAGE_NOT_FOUND_SCHEMA })
  async getHomepage(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.homepageService.getOrCreate(talentId, user.tenantSchema);
  }

  /**
   * Save draft
   */
  @Patch('draft')
  @RequirePermissions({ resource: 'talent.homepage', action: 'update' })
  @ApiOperation({ summary: 'Save homepage draft' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Draft saved', schema: createSuccessEnvelopeSchema(HOMEPAGE_DRAFT_SAVE_SCHEMA, {
    draftVersion: {
      id: '550e8400-e29b-41d4-a716-446655440010',
      versionNumber: 4,
      contentHash: 'abc123hash',
      updatedAt: '2026-04-13T09:30:00.000Z',
    },
    isNewVersion: true,
  }) })
  @ApiResponse({ status: 401, description: 'Authentication is required to save homepage drafts', schema: HOMEPAGE_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 404, description: 'Homepage was not found', schema: HOMEPAGE_NOT_FOUND_SCHEMA })
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
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Homepage published', schema: createSuccessEnvelopeSchema(HOMEPAGE_PUBLISH_SCHEMA, {
    publishedVersion: {
      id: '550e8400-e29b-41d4-a716-446655440010',
      versionNumber: 4,
      publishedAt: '2026-04-13T09:35:00.000Z',
    },
    homepageUrl: 'https://app.tcrn.dev/p/my-page',
    cdnPurgeStatus: 'success',
  }) })
  @ApiResponse({ status: 400, description: 'Publish request is invalid because no draft exists', schema: HOMEPAGE_BAD_REQUEST_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to publish homepage content', schema: HOMEPAGE_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 404, description: 'Homepage was not found', schema: HOMEPAGE_NOT_FOUND_SCHEMA })
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
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Homepage unpublished', schema: createSuccessEnvelopeSchema(HOMEPAGE_UNPUBLISH_SCHEMA, {
    isPublished: false,
    unpublishedAt: '2026-04-13T09:40:00.000Z',
  }) })
  @ApiResponse({ status: 401, description: 'Authentication is required to unpublish homepage content', schema: HOMEPAGE_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 404, description: 'Homepage was not found', schema: HOMEPAGE_NOT_FOUND_SCHEMA })
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
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Settings updated', schema: HOMEPAGE_SUCCESS_SCHEMA })
  @ApiResponse({ status: 401, description: 'Authentication is required to update homepage settings', schema: HOMEPAGE_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 404, description: 'Homepage was not found', schema: HOMEPAGE_NOT_FOUND_SCHEMA })
  @ApiResponse({ status: 409, description: 'Homepage settings conflict with current stored state', schema: HOMEPAGE_CONFLICT_SCHEMA })
  async updateSettings(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: UpdateSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const context = this.buildContext(user, req);
    return this.homepageService.updateSettings(talentId, dto, context);
  }


  // Domain management routes removed - now handled by TalentDomainService
  // See: /talents/:talentId/custom-domain endpoints


  // =========================================================================
  // Version Management
  // =========================================================================

  /**
   * List versions
   */
  @Get('versions')
  @RequirePermissions({ resource: 'talent.homepage', action: 'read' })
  @ApiOperation({ summary: 'List homepage versions' })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Returns version list', schema: createPaginatedEnvelopeSchema(HOMEPAGE_VERSION_LIST_ITEM_SCHEMA, {
    id: '550e8400-e29b-41d4-a716-446655440010',
    versionNumber: 4,
    status: 'published',
    contentPreview: 'ProfileCard, SocialLinks, ImageGallery',
    componentCount: 3,
    publishedAt: '2026-04-13T09:35:00.000Z',
    publishedBy: { id: '550e8400-e29b-41d4-a716-446655440111', username: 'operator' },
    createdAt: '2026-04-13T09:30:00.000Z',
    createdBy: { id: '550e8400-e29b-41d4-a716-446655440111', username: 'operator' },
  }) })
  @ApiResponse({ status: 401, description: 'Authentication is required to list homepage versions', schema: HOMEPAGE_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 404, description: 'Homepage was not found', schema: HOMEPAGE_NOT_FOUND_SCHEMA })
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
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiParam({
    name: 'versionId',
    description: 'Homepage version identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Returns version detail', schema: createSuccessEnvelopeSchema({
    type: 'object',
    properties: {
      ...HOMEPAGE_VERSION_LIST_ITEM_SCHEMA.properties,
      content: { type: 'object', additionalProperties: true },
      theme: { type: 'object', additionalProperties: true },
    },
    required: ['id', 'versionNumber', 'status', 'content', 'theme', 'createdAt'],
  }, {
    id: '550e8400-e29b-41d4-a716-446655440010',
    versionNumber: 4,
    status: 'published',
    content: { version: '1.0', components: [] },
    theme: { preset: 'default' },
    publishedAt: '2026-04-13T09:35:00.000Z',
    publishedBy: { id: '550e8400-e29b-41d4-a716-446655440111', username: 'operator' },
    createdAt: '2026-04-13T09:30:00.000Z',
    createdBy: { id: '550e8400-e29b-41d4-a716-446655440111', username: 'operator' },
  }) })
  @ApiResponse({ status: 401, description: 'Authentication is required to read homepage versions', schema: HOMEPAGE_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 404, description: 'Homepage version was not found', schema: HOMEPAGE_NOT_FOUND_SCHEMA })
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
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiParam({
    name: 'versionId',
    description: 'Homepage version identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Version restored', schema: createSuccessEnvelopeSchema(HOMEPAGE_RESTORE_SCHEMA, {
    newDraftVersion: {
      id: '550e8400-e29b-41d4-a716-446655440012',
      versionNumber: 5,
    },
    restoredFrom: {
      id: '550e8400-e29b-41d4-a716-446655440010',
      versionNumber: 4,
    },
  }) })
  @ApiResponse({ status: 401, description: 'Authentication is required to restore homepage versions', schema: HOMEPAGE_UNAUTHORIZED_SCHEMA })
  @ApiResponse({ status: 404, description: 'Homepage version was not found', schema: HOMEPAGE_NOT_FOUND_SCHEMA })
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
