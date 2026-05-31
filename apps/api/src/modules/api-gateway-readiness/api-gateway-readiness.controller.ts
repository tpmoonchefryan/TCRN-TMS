import { Controller, ForbiddenException, Get, Param, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { ErrorCodes, type ApiGatewayProvider } from '@tcrn/shared';

import { RequirePermissions } from '../../common/decorators';
import { ApiGatewayReadinessService } from './api-gateway-readiness.service';

type ApiOkResponseOptions = NonNullable<Parameters<typeof ApiOkResponse>[0]>;
type OpenApiResponseSchema = Extract<ApiOkResponseOptions, { schema: unknown }>['schema'];

const OBJECT_RESPONSE_SCHEMA: OpenApiResponseSchema = {
  type: 'object',
  additionalProperties: true,
};

@ApiTags('System - API Gateway')
@ApiBearerAuth()
@Controller('api-gateway-readiness')
export class ApiGatewayReadinessController {
  constructor(private readonly readinessService: ApiGatewayReadinessService) {}

  @Get('summary')
  @RequirePermissions({ resource: 'platform.api_gateway', action: 'read' })
  @ApiOperation({ summary: 'Read AC API gateway readiness summary' })
  @ApiOkResponse({ description: 'Read-only gateway readiness summary', schema: OBJECT_RESPONSE_SCHEMA })
  getSummary(@Req() req: Request) {
    this.ensureAcTenant(req);
    return this.readinessService.getSummary();
  }

  @Get('route-policy')
  @RequirePermissions({ resource: 'platform.api_gateway', action: 'read' })
  @ApiOperation({ summary: 'Read generated gateway route policy' })
  @ApiOkResponse({ description: 'Readiness-only gateway route policy', schema: OBJECT_RESPONSE_SCHEMA })
  getRoutePolicy(@Req() req: Request) {
    this.ensureAcTenant(req);
    return this.readinessService.getRoutePolicy();
  }

  @Get('rendered/:provider')
  @RequirePermissions({ resource: 'platform.api_gateway', action: 'read' })
  @ApiOperation({ summary: 'Read rendered APISIX or Kong gateway readiness artifact' })
  @ApiOkResponse({ description: 'Rendered readiness artifact', schema: OBJECT_RESPONSE_SCHEMA })
  getRenderedArtifact(@Param('provider') provider: ApiGatewayProvider, @Req() req: Request) {
    this.ensureAcTenant(req);
    if (provider !== 'apisix' && provider !== 'kong') {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Unsupported gateway readiness provider',
      });
    }
    return this.readinessService.getRenderedArtifact(provider);
  }

  @Get('cutover-runbook')
  @RequirePermissions({ resource: 'platform.api_gateway', action: 'read' })
  @ApiOperation({ summary: 'Read future gateway cutover/canary/rollback runbook' })
  @ApiOkResponse({ description: 'Readiness-only cutover runbook', schema: OBJECT_RESPONSE_SCHEMA })
  getCutoverRunbook(@Req() req: Request) {
    this.ensureAcTenant(req);
    return this.readinessService.getCutoverRunbook();
  }

  private ensureAcTenant(req: Request): void {
    if (req.tenantContext?.tier !== 'ac' || !req.tenantContext?.tenantId) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'API Gateway Readiness is available to AC operators only',
      });
    }
  }
}
