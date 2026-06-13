// SPDX-License-Identifier: Apache-2.0
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { ErrorCodes } from '@tcrn/shared';

import { CurrentUser, RequirePermissions, type AuthenticatedUser } from '../../common/decorators';
import {
  RuntimeFlagEvaluationDto,
  RuntimeFlagKillSwitchDeactivateDto,
  RuntimeFlagKillSwitchMutationDto,
  RuntimeFlagQueryDto,
} from './dto/runtime-flags.dto';
import { RuntimeFlagsService, type RuntimeFlagRequestContext } from './runtime-flags.service';

@ApiTags('System - Runtime Flags')
@ApiBearerAuth()
@Controller('runtime-flags')
export class RuntimeFlagsController {
  constructor(private readonly runtimeFlagsService: RuntimeFlagsService) {}

  @Get('adapters')
  @RequirePermissions({ resource: 'platform.runtime_flag', action: 'read' })
  @ApiOperation({ summary: 'List AC runtime flag adapter definitions' })
  listAdapters(@Req() req: Request, @CurrentUser() user: AuthenticatedUser) {
    return this.runtimeFlagsService.listAdapters(this.buildContext(req, user));
  }

  @Get('definitions')
  @RequirePermissions({ resource: 'platform.runtime_flag', action: 'read' })
  @ApiOperation({ summary: 'List TCRN-owned runtime flag definitions' })
  listDefinitions(@Req() req: Request, @CurrentUser() user: AuthenticatedUser) {
    return this.runtimeFlagsService.listDefinitions(this.buildContext(req, user));
  }

  @Get('policy')
  @RequirePermissions({ resource: 'platform.runtime_flag', action: 'read' })
  @ApiOperation({ summary: 'Read runtime flag authority and context policy' })
  getPolicy(@Req() req: Request, @CurrentUser() user: AuthenticatedUser) {
    return this.runtimeFlagsService.getPolicy(this.buildContext(req, user));
  }

  @Get('summary')
  @RequirePermissions({ resource: 'platform.runtime_flag', action: 'read' })
  @ApiOperation({ summary: 'Read AC runtime flag readiness summary' })
  getSummary(
    @Query() query: RuntimeFlagQueryDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.runtimeFlagsService.getSummary(query, this.buildContext(req, user));
  }

  @Get('provider-readiness')
  @RequirePermissions({ resource: 'platform.runtime_flag', action: 'read' })
  @ApiOperation({ summary: 'Read Flagsmith provider readiness through Platform Tool Connections' })
  getProviderReadiness(
    @Query() query: RuntimeFlagQueryDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.runtimeFlagsService.getProviderReadiness(query, this.buildContext(req, user));
  }

  @Post('evaluate')
  @RequirePermissions({ resource: 'platform.runtime_flag', action: 'execute' })
  @ApiOperation({ summary: 'Preview a registered runtime flag with a safe context' })
  evaluate(
    @Body() dto: RuntimeFlagEvaluationDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.runtimeFlagsService.evaluate(dto, this.buildContext(req, user));
  }

  @Post('kill-switches')
  @RequirePermissions({ resource: 'platform.runtime_flag', action: 'admin' })
  @ApiOperation({ summary: 'Activate an AC-audited runtime kill switch' })
  activateKillSwitch(
    @Body() dto: RuntimeFlagKillSwitchMutationDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.runtimeFlagsService.activateKillSwitch(dto, this.buildContext(req, user));
  }

  @Patch('kill-switches/:switchId/deactivate')
  @RequirePermissions({ resource: 'platform.runtime_flag', action: 'admin' })
  @ApiOperation({ summary: 'Deactivate an active runtime kill switch with rollback evidence' })
  deactivateKillSwitch(
    @Param('switchId') switchId: string,
    @Body() dto: RuntimeFlagKillSwitchDeactivateDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.runtimeFlagsService.deactivateKillSwitch(
      switchId,
      dto,
      this.buildContext(req, user)
    );
  }

  private buildContext(req: Request, user: AuthenticatedUser | null): RuntimeFlagRequestContext {
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
        message: 'Runtime flag controls are available to AC operators only',
      });
    }
  }
}
