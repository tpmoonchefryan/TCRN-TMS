// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Controller, ForbiddenException, Get, Param, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { ErrorCodes } from '@tcrn/shared';

import { CurrentUser, RequirePermissions, type AuthenticatedUser } from '../../common/decorators';
import { ObservabilityAdapterQueryDto } from './dto/observability-adapters.dto';
import {
  ObservabilityAdaptersService,
  type ObservabilityAdapterRequestContext,
} from './observability-adapters.service';

@ApiTags('System - Observability Adapters')
@ApiBearerAuth()
@Controller('observability/adapters')
export class ObservabilityAdaptersController {
  constructor(private readonly observabilityAdaptersService: ObservabilityAdaptersService) {}

  @Get('definitions')
  @RequirePermissions({ resource: 'platform.tool_connection', action: 'read' })
  @ApiOperation({ summary: 'List AC observability adapter definitions' })
  listDefinitions(@Req() req: Request, @CurrentUser() user: AuthenticatedUser) {
    return this.observabilityAdaptersService.listDefinitions(this.buildContext(req, user));
  }

  @Get('policy')
  @RequirePermissions({ resource: 'platform.tool_connection', action: 'read' })
  @ApiOperation({ summary: 'Read AC observability signal policy' })
  getSignalPolicy(@Req() req: Request, @CurrentUser() user: AuthenticatedUser) {
    return this.observabilityAdaptersService.getSignalPolicy(this.buildContext(req, user));
  }

  @Get('summary')
  @RequirePermissions({ resource: 'platform.tool_connection', action: 'read' })
  @ApiOperation({ summary: 'Read AC observability adapter readiness summary' })
  getSummary(
    @Query() query: ObservabilityAdapterQueryDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.observabilityAdaptersService.getSummary(query, this.buildContext(req, user));
  }

  @Get(':adapterCode/deep-link')
  @RequirePermissions({ resource: 'platform.tool_connection', action: 'execute' })
  @ApiOperation({ summary: 'Read AC observability adapter deep-link readiness' })
  getDeepLink(
    @Param('adapterCode') adapterCode: string,
    @Query() query: ObservabilityAdapterQueryDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.observabilityAdaptersService.getDeepLink(
      adapterCode,
      query,
      this.buildContext(req, user)
    );
  }

  private buildContext(req: Request, user: AuthenticatedUser | null): ObservabilityAdapterRequestContext {
    this.ensureAcTenant(req);

    return {
      tenantId: req.tenantContext?.tenantId as string,
      tenantSchema: req.tenantContext?.schemaName,
      actorId: user?.id,
      requestId: Array.isArray(req.headers['x-request-id'])
        ? req.headers['x-request-id'][0]
        : req.headers['x-request-id'],
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
  }

  private ensureAcTenant(req: Request): void {
    if (req.tenantContext?.tier !== 'ac' || !req.tenantContext?.tenantId) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Observability adapter readiness is available to AC operators only',
      });
    }
  }
}
