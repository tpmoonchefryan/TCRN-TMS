// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Body, Controller, ForbiddenException, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { ErrorCodes } from '@tcrn/shared';

import { CurrentUser, RequirePermissions, type AuthenticatedUser } from '../../common/decorators';
import { EventBackboneQueryDto, EventBackboneReplayPreviewDto } from './dto/event-backbone.dto';
import { EventBackboneService, type EventBackboneRequestContext } from './event-backbone.service';

@ApiTags('System - Event Backbone')
@ApiBearerAuth()
@Controller('event-backbone')
export class EventBackboneController {
  constructor(private readonly eventBackboneService: EventBackboneService) {}

  @Get('registry')
  @RequirePermissions({ resource: 'platform.event_backbone', action: 'read' })
  @ApiOperation({ summary: 'Read the TCRN-owned event registry baseline' })
  getRegistry(@Query() query: EventBackboneQueryDto, @Req() req: Request, @CurrentUser() user: AuthenticatedUser) {
    this.buildContext(req, user);
    return this.eventBackboneService.getRegistry(query);
  }

  @Get('subject-mapping')
  @RequirePermissions({ resource: 'platform.event_backbone', action: 'read' })
  @ApiOperation({ summary: 'Read generated event subject and durable-name mapping' })
  getSubjectMapping(
    @Query() query: EventBackboneQueryDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser
  ) {
    this.buildContext(req, user);
    return this.eventBackboneService.getSubjectMapping(query);
  }

  @Get('bullmq-classification')
  @RequirePermissions({ resource: 'platform.event_backbone', action: 'read' })
  @ApiOperation({ summary: 'Read BullMQ preservation and mirroring classification' })
  getBullMqClassification(@Req() req: Request, @CurrentUser() user: AuthenticatedUser) {
    this.buildContext(req, user);
    return this.eventBackboneService.getBullMqClassification();
  }

  @Get('policy')
  @RequirePermissions({ resource: 'platform.event_backbone', action: 'read' })
  @ApiOperation({ summary: 'Read event backbone authority, redaction, and replay policy' })
  getPolicy(@Req() req: Request, @CurrentUser() user: AuthenticatedUser) {
    this.buildContext(req, user);
    return this.eventBackboneService.getPolicy();
  }

  @Get('summary')
  @RequirePermissions({ resource: 'platform.event_backbone', action: 'read' })
  @ApiOperation({ summary: 'Read AC event backbone readiness summary' })
  getSummary(
    @Query() query: EventBackboneQueryDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.eventBackboneService.getSummary(query, this.buildContext(req, user));
  }

  @Post('replay-preview')
  @RequirePermissions({ resource: 'platform.event_backbone', action: 'execute' })
  @ApiOperation({ summary: 'Preview an authorized event replay without side effects' })
  @ApiBody({ type: EventBackboneReplayPreviewDto })
  previewReplay(
    @Body() dto: EventBackboneReplayPreviewDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.eventBackboneService.previewReplay(dto, this.buildContext(req, user));
  }

  private buildContext(req: Request, user: AuthenticatedUser | null): EventBackboneRequestContext {
    if (req.tenantContext?.tier !== 'ac' || !req.tenantContext?.tenantId) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Event backbone controls are available to AC operators only',
      });
    }

    return {
      tenantId: req.tenantContext.tenantId,
      tenantSchema: req.tenantContext.schemaName,
      actorId: user?.id,
      requestId: Array.isArray(req.headers['x-request-id'])
        ? req.headers['x-request-id'][0]
        : req.headers['x-request-id'],
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
  }
}
