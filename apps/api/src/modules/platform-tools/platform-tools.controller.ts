// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { ErrorCodes } from '@tcrn/shared';

import { CurrentUser, RequirePermissions, type AuthenticatedUser } from '../../common/decorators';
import {
  PlatformToolConnectionQueryDto,
  UpsertPlatformToolConnectionDto,
} from './dto/platform-tools.dto';
import { PlatformToolsService, type PlatformToolRequestContext } from './platform-tools.service';

@ApiTags('System - Platform Tools')
@ApiBearerAuth()
@Controller('platform-tools')
export class PlatformToolsController {
  constructor(private readonly platformToolsService: PlatformToolsService) {}

  @Get('definitions')
  @RequirePermissions({ resource: 'platform.tool_connection', action: 'read' })
  @ApiOperation({ summary: 'List AC platform tool definitions' })
  listDefinitions(@Req() req: Request, @CurrentUser() user: AuthenticatedUser) {
    return this.platformToolsService.listDefinitions(this.buildContext(req, user));
  }

  @Get('connections')
  @RequirePermissions({ resource: 'platform.tool_connection', action: 'read' })
  @ApiOperation({ summary: 'List AC platform tool connections' })
  listConnections(
    @Query() query: PlatformToolConnectionQueryDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.platformToolsService.listConnections(query, this.buildContext(req, user));
  }

  @Get('connections/:toolCode')
  @RequirePermissions({ resource: 'platform.tool_connection', action: 'read' })
  @ApiOperation({ summary: 'Get AC platform tool connection detail' })
  getConnection(
    @Param('toolCode') toolCode: string,
    @Query() query: PlatformToolConnectionQueryDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.platformToolsService.getConnection(toolCode, query, this.buildContext(req, user));
  }

  @Patch('connections/:toolCode')
  @RequirePermissions({ resource: 'platform.tool_connection', action: 'write' })
  @ApiOperation({ summary: 'Create or update an AC platform tool connection' })
  upsertConnection(
    @Param('toolCode') toolCode: string,
    @Body() dto: UpsertPlatformToolConnectionDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.platformToolsService.upsertConnection(toolCode, dto, this.buildContext(req, user));
  }

  @Post('connections/:toolCode/health-check')
  @RequirePermissions({ resource: 'platform.tool_connection', action: 'execute' })
  @ApiOperation({ summary: 'Run a safe AC platform tool health check' })
  runHealthCheck(
    @Param('toolCode') toolCode: string,
    @Query() query: PlatformToolConnectionQueryDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.platformToolsService.runHealthCheck(toolCode, query, this.buildContext(req, user));
  }

  @Get('connections/:toolCode/deep-link')
  @RequirePermissions({ resource: 'platform.tool_connection', action: 'execute' })
  @ApiOperation({ summary: 'Read AC platform tool deep-link readiness' })
  getDeepLink(
    @Param('toolCode') toolCode: string,
    @Query() query: PlatformToolConnectionQueryDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.platformToolsService.getDeepLink(toolCode, query, this.buildContext(req, user));
  }

  @Get('deployment-boundary')
  @RequirePermissions({ resource: 'platform.tool_connection', action: 'read' })
  @ApiOperation({ summary: 'Read non-cutover deployment boundary metadata for platform tools' })
  getDeploymentBoundary(@Req() req: Request, @CurrentUser() user: AuthenticatedUser) {
    return this.platformToolsService.getDeploymentBoundary(this.buildContext(req, user));
  }

  private buildContext(req: Request, user: AuthenticatedUser | null): PlatformToolRequestContext {
    this.ensureAcTenant(req);

    return {
      tenantId: req.tenantContext?.tenantId as string,
      tenantSchema: req.tenantContext?.schemaName,
      actorId: user?.id,
      requestId: req.headers['x-request-id'] as string | undefined,
      ipAddress: (req.ip || req.socket?.remoteAddress) ?? undefined,
      userAgent: req.headers['user-agent'],
    };
  }

  private ensureAcTenant(req: Request): void {
    if (req.tenantContext?.tier !== 'ac' || !req.tenantContext?.tenantId) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Platform Tool Connections are available to AC operators only',
      });
    }
  }
}
