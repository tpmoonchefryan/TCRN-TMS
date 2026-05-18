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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  type PublicPresencePhaseVisibility,
  PublicPresencePhaseVisibilitySchema,
  type RequestContext,
} from '@tcrn/shared';
import { Request } from 'express';

import {
  AuthenticatedUser,
  CurrentUser,
  RequirePermissions,
  RequirePublishedTalentAccess,
} from '../../../common/decorators';
import { PublicHomepageProjectionService } from '../application/public-homepage-projection.service';
import { PublicPresenceStudioService } from '../application/public-presence-studio.service';
import { PublicPresenceWorkflowService } from '../application/public-presence-workflow.service';

interface BootstrapPublicPresenceDraftDto {
  templateId: string;
}

interface SavePublicPresenceDraftDto {
  document: unknown;
  expectedCurrentContentHash?: string | null;
}

interface PublicPresenceWorkflowHashDto {
  expectedCurrentContentHash?: string | null;
  templateId?: string | null;
}

interface PublicPresenceChangesRequestDto extends PublicPresenceWorkflowHashDto {
  comment?: string | null;
}

interface PublicPresenceSchedulePublishDto extends PublicPresenceWorkflowHashDto {
  scheduledFor: string;
}

interface PublicPresenceRollbackDraftDto {
  sourceVersionId?: string | null;
}

const PUBLIC_PRESENCE_WORKSPACE_SCHEMA = {
  type: 'object',
  additionalProperties: true,
};

const PUBLIC_PRESENCE_PROJECTION_SCHEMA = {
  type: 'object',
  additionalProperties: true,
};

@ApiTags('Ops - Public Presence')
@ApiBearerAuth()
@RequirePublishedTalentAccess()
@Controller('talents/:talentId/public-presence')
export class PublicPresenceController {
  constructor(
    private readonly publicPresenceStudioService: PublicPresenceStudioService,
    private readonly publicHomepageProjectionService: PublicHomepageProjectionService,
    private readonly publicPresenceWorkflowService: PublicPresenceWorkflowService,
  ) {}

  @Get()
  @RequirePermissions({ resource: 'public_presence.document', action: 'read' })
  @ApiOperation({
    summary: 'Get the Public Presence Studio workspace state for a talent',
  })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns the Public Presence portal, draft/live versions, and registry-backed Studio metadata.',
    schema: PUBLIC_PRESENCE_WORKSPACE_SCHEMA,
  })
  async getWorkspace(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('templateId') templateId?: string,
  ) {
    return this.publicPresenceStudioService.getWorkspace(
      talentId,
      user.tenantSchema,
      templateId,
    );
  }

  @Get('preview')
  @RequirePermissions({ resource: 'public_presence.document', action: 'read' })
  @ApiOperation({
    summary: 'Build a draft Public Presence projection preview for a talent',
  })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns the current draft/live Public Presence projection preview using the same runtime builder as public reads.',
    schema: PUBLIC_PRESENCE_PROJECTION_SCHEMA,
  })
  async getDraftPreview(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('phase') phase?: string,
    @Query('templateId') templateId?: string,
  ) {
    return this.publicHomepageProjectionService.getDraftPreviewProjectionOrThrow(
      talentId,
      user.tenantSchema,
      this.parseRevealPhase(phase),
      templateId,
    );
  }

  @Post('bootstrap')
  @RequirePermissions({ resource: 'public_presence.document', action: 'write' })
  @ApiOperation({
    summary: 'Bootstrap a starter Public Presence draft for a talent',
  })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 201,
    description:
      'Creates a starter draft when the workspace has not been initialized and returns the updated workspace state.',
    schema: PUBLIC_PRESENCE_WORKSPACE_SCHEMA,
  })
  async bootstrapDraft(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: BootstrapPublicPresenceDraftDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.publicPresenceStudioService.bootstrapDraft(
      talentId,
      dto.templateId,
      this.buildContext(user, req),
    );
  }

  @Patch('draft')
  @RequirePermissions({ resource: 'public_presence.document', action: 'write' })
  @ApiOperation({
    summary: 'Save the canonical Public Presence source document draft',
  })
  @ApiParam({
    name: 'talentId',
    description: 'Talent identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description:
      'Persists the draft source document and returns the updated workspace state.',
    schema: PUBLIC_PRESENCE_WORKSPACE_SCHEMA,
  })
  async saveDraft(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: SavePublicPresenceDraftDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.publicPresenceStudioService.saveDraft(
      talentId,
      dto.document,
      this.buildContext(user, req),
      dto.expectedCurrentContentHash,
    );
  }

  @Post('review/submit')
  @RequirePermissions({ resource: 'public_presence.review', action: 'write' })
  async submitForReview(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: PublicPresenceWorkflowHashDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.publicPresenceWorkflowService.submitForReview(
      talentId,
      this.buildContext(user, req),
      dto.expectedCurrentContentHash,
      dto.templateId,
    );

    return this.publicPresenceStudioService.getWorkspace(
      talentId,
      user.tenantSchema,
    );
  }

  @Post('review/request-changes')
  @RequirePermissions({ resource: 'public_presence.review', action: 'write' })
  async requestChanges(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: PublicPresenceChangesRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.publicPresenceWorkflowService.requestChanges(
      talentId,
      this.buildContext(user, req),
      dto,
    );

    return this.publicPresenceStudioService.getWorkspace(
      talentId,
      user.tenantSchema,
    );
  }

  @Post('review/approve')
  @RequirePermissions({ resource: 'public_presence.review', action: 'execute' })
  async approve(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: PublicPresenceWorkflowHashDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.publicPresenceWorkflowService.approve(
      talentId,
      this.buildContext(user, req),
      dto.expectedCurrentContentHash,
      dto.templateId,
    );

    return this.publicPresenceStudioService.getWorkspace(
      talentId,
      user.tenantSchema,
    );
  }

  @Post('publish')
  @RequirePermissions({ resource: 'public_presence.publish', action: 'execute' })
  async publishNow(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: PublicPresenceWorkflowHashDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.publicPresenceWorkflowService.publishNow(
      talentId,
      this.buildContext(user, req),
      dto.expectedCurrentContentHash,
      dto.templateId,
    );

    return this.publicPresenceStudioService.getWorkspace(
      talentId,
      user.tenantSchema,
    );
  }

  @Post('publish/schedule')
  @RequirePermissions({ resource: 'public_presence.publish', action: 'write' })
  async schedulePublish(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: PublicPresenceSchedulePublishDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.publicPresenceWorkflowService.schedulePublish(
      talentId,
      this.buildContext(user, req),
      dto,
    );

    return this.publicPresenceStudioService.getWorkspace(
      talentId,
      user.tenantSchema,
    );
  }

  @Post('publish/cancel')
  @RequirePermissions({ resource: 'public_presence.publish', action: 'write' })
  async cancelScheduledPublish(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: PublicPresenceWorkflowHashDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.publicPresenceWorkflowService.cancelScheduledPublish(
      talentId,
      this.buildContext(user, req),
      dto.expectedCurrentContentHash,
      dto.templateId,
    );

    return this.publicPresenceStudioService.getWorkspace(
      talentId,
      user.tenantSchema,
    );
  }

  @Post('rollback-draft')
  @RequirePermissions({ resource: 'public_presence.rollback', action: 'write' })
  async createRollbackDraft(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: PublicPresenceRollbackDraftDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.publicPresenceWorkflowService.createRollbackDraft(
      talentId,
      this.buildContext(user, req),
      dto.sourceVersionId,
    );

    return this.publicPresenceStudioService.getWorkspace(
      talentId,
      user.tenantSchema,
    );
  }

  private buildContext(
    user: AuthenticatedUser,
    req: Request,
  ): RequestContext {
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

  private parseRevealPhase(
    value: string | undefined,
  ): PublicPresencePhaseVisibility | 'current' | null {
    if (!value || value === 'current') {
      return 'current';
    }

    const parsed = PublicPresencePhaseVisibilitySchema.safeParse(value);
    return parsed.success ? parsed.data : 'current';
  }
}
