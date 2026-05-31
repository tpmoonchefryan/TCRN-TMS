import {
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { ErrorCodes, isBuilderRegistryArtifactKind } from '@tcrn/shared';

import { RequirePermissions } from '../../common/decorators';
import { type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { getUiLocale } from '../../common/request-locale.util';
import { success } from '../../common/response.util';
import { TenantService } from '../tenant/tenant.service';
import { BuilderRegistryService } from './builder-registry.service';

type ApiOkResponseOptions = NonNullable<Parameters<typeof ApiOkResponse>[0]>;
type OpenApiResponseSchema = Extract<ApiOkResponseOptions, { schema: unknown }>['schema'];

const OBJECT_RESPONSE_SCHEMA: OpenApiResponseSchema = {
  type: 'object',
  additionalProperties: true,
};

@ApiTags('System - Builder Registry')
@ApiBearerAuth()
@Controller('builder-registry')
export class BuilderRegistryController {
  constructor(
    private readonly builderRegistryService: BuilderRegistryService,
    private readonly tenantService: TenantService
  ) {}

  @Get('summary')
  @RequirePermissions({ resource: 'platform.builder_registry', action: 'read' })
  @ApiOperation({ summary: 'Read AC Builder Registry summary' })
  @ApiOkResponse({ description: 'Read-only Builder Registry summary', schema: OBJECT_RESPONSE_SCHEMA })
  async getSummary(@Req() req: Request, @Query('fresh') fresh?: string) {
    await this.ensureAcTenant(req);
    return success(this.builderRegistryService.getSummary(fresh === 'true'));
  }

  @Get('modules')
  @RequirePermissions({ resource: 'platform.builder_registry', action: 'read' })
  @ApiOperation({ summary: 'List Builder Registry module and capability rows' })
  @ApiOkResponse({ description: 'Read-only Builder module rows', schema: OBJECT_RESPONSE_SCHEMA })
  async getModules(@Req() req: Request, @Query('locale') locale?: string) {
    await this.ensureAcTenant(req);
    return success(this.builderRegistryService.getModules(getUiLocale(locale)));
  }

  @Get('operations/:operationCode')
  @RequirePermissions({ resource: 'platform.builder_registry', action: 'read' })
  @ApiOperation({ summary: 'Inspect one Builder Registry operation' })
  @ApiOkResponse({ description: 'Read-only Builder operation metadata', schema: OBJECT_RESPONSE_SCHEMA })
  async getOperation(@Req() req: Request, @Param('operationCode') operationCode: string) {
    await this.ensureAcTenant(req);
    const operation = this.builderRegistryService.getOperation(operationCode);

    if (!operation) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Builder Registry operation is not in the generated read-only export',
      });
    }

    return success(operation);
  }

  @Get('artifacts/:artifactKind')
  @RequirePermissions({ resource: 'platform.builder_registry', action: 'read' })
  @ApiOperation({ summary: 'Download one generated Builder Registry artifact' })
  @ApiOkResponse({ description: 'Generated Builder artifact payload', schema: OBJECT_RESPONSE_SCHEMA })
  async getArtifact(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('artifactKind') artifactKind: string
  ) {
    await this.ensureAcTenant(req);
    if (!isBuilderRegistryArtifactKind(artifactKind)) {
      throw new ConflictException({
        code: ErrorCodes.RES_CONFLICT,
        message: 'Builder Registry artifact is unavailable for this phase',
      });
    }

    const status = this.builderRegistryService.getArtifactStatus(artifactKind);

    if (status.status !== 'ready' || status.redactionStatus !== 'passed') {
      throw new ConflictException({
        code: ErrorCodes.RES_CONFLICT,
        message: status.disabledReason ?? 'Artifact unavailable',
      });
    }

    const artifact = this.builderRegistryService.getArtifact(artifactKind);
    res.setHeader('Cache-Control', artifact.cacheControl);

    return success(artifact);
  }

  @Get('composed-dry-run/ac-capability-surface-overview')
  @RequirePermissions({ resource: 'platform.builder_registry', action: 'read' })
  @ApiOperation({ summary: 'Inspect the read-only Builder composed operation dry-run' })
  @ApiOkResponse({ description: 'Read-only composed operation dry-run', schema: OBJECT_RESPONSE_SCHEMA })
  async getComposedDryRun(@Req() req: Request) {
    await this.ensureAcTenant(req);
    const dryRun = this.builderRegistryService.getComposedDryRun();

    if (!dryRun.passed) {
      throw new ConflictException({
        code: ErrorCodes.RES_CONFLICT,
        message: 'Builder composed dry-run is unavailable',
        unsupportedReasons: dryRun.unsupportedReasons,
      });
    }

    return success(dryRun);
  }

  private async ensureAcTenant(req: Request): Promise<void> {
    const user = (req as unknown as { user?: AuthenticatedUser }).user;

    if (!user?.tenantId || !user.tenantSchema) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Access denied',
      });
    }

    if (
      req.tenantContext &&
      (req.tenantContext.tenantId !== user.tenantId || req.tenantContext.schemaName !== user.tenantSchema)
    ) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Access denied',
      });
    }

    const tenant = await this.tenantService.getTenantById(user.tenantId);

    if (!tenant || tenant.tier !== 'ac' || tenant.schemaName !== user.tenantSchema) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Access denied',
      });
    }
  }
}
