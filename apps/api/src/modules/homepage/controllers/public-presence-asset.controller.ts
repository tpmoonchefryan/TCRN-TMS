// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import {
  CreatePublicPresenceAssetSchema,
  type HomepageComponentType,
  type LocalizedText,
  type PublicPresenceAssetKind,
  DuplicatePublicPresenceAssetSchema,
  PublicPresenceAssetListQuerySchema,
  PublicPresenceAssetScopeQuerySchema,
  type PublicPresenceAssetScopeType,
  type PublicPresenceTemplateId,
  type PublicPresenceTemplateTypeCode,
  UpdatePublicPresenceAssetRevisionSchema,
} from '@tcrn/shared';
import type { RequestContext } from '@tcrn/shared';

import { AuthenticatedUser, CurrentUser, RequirePermissions } from '../../../common/decorators';
import { zodPipe } from '../../../common/pipes/zod-validation.pipe';
import { PublicPresenceAssetService } from '../application/public-presence-asset.service';

interface PublicPresenceAssetScopeQueryDto {
  assetKind?: PublicPresenceAssetKind;
  scopeId?: string;
  scopeType?: PublicPresenceAssetScopeType;
}

interface CreatePublicPresenceAssetDto {
  assetKind: PublicPresenceAssetKind;
  code?: string | null;
  componentType?: HomepageComponentType | null;
  description?: Partial<LocalizedText> | null;
  manifest?: unknown;
  name?: Partial<LocalizedText> | null;
  sourceBundle?: unknown;
  templateId?: PublicPresenceTemplateId | null;
  templateTypeCode?: PublicPresenceTemplateTypeCode | null;
}

interface UpdatePublicPresenceAssetRevisionDto {
  description?: Partial<LocalizedText> | null;
  manifest?: unknown;
  name?: Partial<LocalizedText> | null;
  sourceBundle: unknown;
}

interface DuplicatePublicPresenceAssetDto {
  code?: string | null;
  description?: Partial<LocalizedText> | null;
  name?: Partial<LocalizedText> | null;
}

@ApiTags('Ops - Public Presence Assets')
@ApiBearerAuth()
@Controller('public-presence/assets')
export class PublicPresenceAssetController {
  constructor(private readonly publicPresenceAssetService: PublicPresenceAssetService) {}

  @Get()
  @RequirePermissions({ resource: 'public_presence.document', action: 'read' })
  @ApiOperation({
    summary: 'List Public Presence template/component assets visible in the current scope',
  })
  @ApiQuery({ name: 'assetKind', required: false, enum: ['template', 'component'] })
  @ApiQuery({ name: 'scopeType', required: false, enum: ['tenant', 'subsidiary', 'talent'] })
  @ApiQuery({ name: 'scopeId', required: false, type: String })
  async listAssets(
    @Query(zodPipe(PublicPresenceAssetListQuerySchema))
    query: PublicPresenceAssetScopeQueryDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.publicPresenceAssetService.listAssets(user.tenantSchema, query, user.id);
  }

  @Get(':assetId')
  @RequirePermissions({ resource: 'public_presence.document', action: 'read' })
  @ApiOperation({ summary: 'Read one Public Presence asset with current revision and history' })
  async getAssetDetail(
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Query(zodPipe(PublicPresenceAssetScopeQuerySchema))
    query: PublicPresenceAssetScopeQueryDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.publicPresenceAssetService.getAssetDetail(
      user.tenantSchema,
      assetId,
      query,
      user.id
    );
  }

  @Get(':assetId/revisions')
  @RequirePermissions({ resource: 'public_presence.document', action: 'read' })
  @ApiOperation({ summary: 'List immutable revisions for one Public Presence asset' })
  async listAssetRevisions(
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Query(zodPipe(PublicPresenceAssetScopeQuerySchema))
    query: PublicPresenceAssetScopeQueryDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const detail = await this.publicPresenceAssetService.getAssetDetail(
      user.tenantSchema,
      assetId,
      query,
      user.id
    );

    return detail.revisions;
  }

  @Post()
  @RequirePermissions({ resource: 'public_presence.document', action: 'write' })
  @ApiOperation({
    summary: 'Create a scoped Public Presence asset with a non-empty starter source bundle',
  })
  async createAsset(
    @Body(zodPipe(CreatePublicPresenceAssetSchema))
    dto: CreatePublicPresenceAssetDto,
    @Query(zodPipe(PublicPresenceAssetScopeQuerySchema))
    query: PublicPresenceAssetScopeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request
  ) {
    return this.publicPresenceAssetService.createAsset(
      user.tenantSchema,
      this.buildContext(user, req),
      {
        ...dto,
        scopeId: query.scopeId,
        scopeType: query.scopeType,
      }
    );
  }

  @Put(':assetId/current')
  @RequirePermissions({ resource: 'public_presence.document', action: 'write' })
  @ApiOperation({
    summary: 'Persist a new current draft revision for one scoped Public Presence asset',
  })
  async saveAssetDraft(
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Body(zodPipe(UpdatePublicPresenceAssetRevisionSchema))
    dto: UpdatePublicPresenceAssetRevisionDto,
    @Query(zodPipe(PublicPresenceAssetScopeQuerySchema))
    query: PublicPresenceAssetScopeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request
  ) {
    return this.publicPresenceAssetService.saveAssetDraft(
      user.tenantSchema,
      assetId,
      this.buildContext(user, req),
      {
        ...dto,
        scopeId: query.scopeId,
        scopeType: query.scopeType,
      }
    );
  }

  @Post(':assetId/current/validate')
  @RequirePermissions({ resource: 'public_presence.validation', action: 'write' })
  @ApiOperation({
    summary: 'Persist a validated current revision for one scoped Public Presence asset',
  })
  async validateAsset(
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Body(zodPipe(UpdatePublicPresenceAssetRevisionSchema))
    dto: UpdatePublicPresenceAssetRevisionDto,
    @Query(zodPipe(PublicPresenceAssetScopeQuerySchema))
    query: PublicPresenceAssetScopeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request
  ) {
    return this.publicPresenceAssetService.validateAsset(
      user.tenantSchema,
      assetId,
      this.buildContext(user, req),
      {
        ...dto,
        scopeId: query.scopeId,
        scopeType: query.scopeType,
      }
    );
  }

  @Post(':assetId/duplicate')
  @RequirePermissions({ resource: 'public_presence.document', action: 'write' })
  @ApiOperation({
    summary: 'Duplicate the current asset revision into the current Entity Management scope',
  })
  async duplicateAsset(
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Body(zodPipe(DuplicatePublicPresenceAssetSchema))
    dto: DuplicatePublicPresenceAssetDto,
    @Query(zodPipe(PublicPresenceAssetScopeQuerySchema))
    query: PublicPresenceAssetScopeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request
  ) {
    return this.publicPresenceAssetService.duplicateAsset(
      user.tenantSchema,
      assetId,
      this.buildContext(user, req),
      {
        ...dto,
        scopeId: query.scopeId,
        scopeType: query.scopeType,
      }
    );
  }

  private buildContext(user: AuthenticatedUser, req: Request): RequestContext {
    return {
      ipAddress: (req.ip || req.socket?.remoteAddress) ?? undefined,
      requestId: req.headers['x-request-id'] as string,
      tenantId: user.tenantId,
      tenantSchema: user.tenantSchema,
      userAgent: req.headers['user-agent'],
      userId: user.id,
      userName: user.username,
    };
  }
}
