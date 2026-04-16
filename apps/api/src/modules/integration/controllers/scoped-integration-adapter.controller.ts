// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RequestContext } from '@tcrn/shared';
import { Request } from 'express';

import { CurrentUser, RequirePermissions } from '../../../common/decorators';
import {
  AdapterListQueryDto,
  CreateAdapterDto,
  OwnerType,
} from '../dto/integration.dto';
import { AdapterService } from '../services/adapter.service';
import { AdapterResolutionService } from '../services/adapter-resolution.service';

function parseBooleanQueryValue(
  value: string | string[] | undefined,
  fallback: boolean,
): boolean {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (rawValue === undefined) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();

  if (normalized === 'true' || normalized === '1') {
    return true;
  }

  if (normalized === 'false' || normalized === '0') {
    return false;
  }

  return fallback;
}

@ApiTags('Ops - Integration')
@ApiBearerAuth()
@Controller('subsidiaries/:subsidiaryId/integration/adapters')
export class SubsidiaryIntegrationAdapterController {
  constructor(
    private readonly adapterService: AdapterService,
    private readonly adapterResolutionService: AdapterResolutionService,
  ) {}

  @Get('/')
  @RequirePermissions({ resource: 'integration.adapter', action: 'read' })
  @ApiOperation({ summary: 'List subsidiary adapters with optional inherited tenant adapters' })
  async listSubsidiaryAdapters(
    @Param('subsidiaryId', ParseUUIDPipe) subsidiaryId: string,
    @Query() query: AdapterListQueryDto,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    return this.adapterService.findMany(
      { ownerType: OwnerType.SUBSIDIARY, ownerId: subsidiaryId },
      {
        ...query,
        includeInherited: parseBooleanQueryValue(
          req.query.includeInherited as string | string[] | undefined,
          query.includeInherited ?? true,
        ),
        includeDisabled: parseBooleanQueryValue(
          req.query.includeDisabled as string | string[] | undefined,
          query.includeDisabled ?? false,
        ),
      },
      this.buildContext(user, req),
    );
  }

  @Post('/')
  @RequirePermissions({ resource: 'integration.adapter', action: 'write' })
  @ApiOperation({ summary: 'Create a subsidiary-owned adapter' })
  async createSubsidiaryAdapter(
    @Param('subsidiaryId', ParseUUIDPipe) subsidiaryId: string,
    @Body() dto: CreateAdapterDto,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    return this.adapterService.create(
      dto,
      this.buildContext(user, req),
      { ownerType: OwnerType.SUBSIDIARY, ownerId: subsidiaryId },
    );
  }

  @Get('effective/:platformCode')
  @RequirePermissions({ resource: 'integration.adapter', action: 'read' })
  @ApiOperation({ summary: 'Resolve the effective subsidiary adapter for a platform code' })
  async resolveSubsidiaryEffectiveAdapter(
    @Param('subsidiaryId', ParseUUIDPipe) subsidiaryId: string,
    @Param('platformCode') platformCode: string,
    @Query('adapterType') adapterType: string | undefined,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    return this.adapterResolutionService.resolveEffectiveAdapter(
      {
        ownerType: OwnerType.SUBSIDIARY,
        ownerId: subsidiaryId,
        platformCode,
        adapterType,
      },
      this.buildContext(user, req),
    );
  }

  @Post(':adapterId/disable')
  @RequirePermissions({ resource: 'integration.adapter', action: 'write' })
  @ApiOperation({ summary: 'Disable an inherited adapter for a subsidiary owner' })
  async disableSubsidiaryInheritedAdapter(
    @Param('subsidiaryId', ParseUUIDPipe) subsidiaryId: string,
    @Param('adapterId', ParseUUIDPipe) adapterId: string,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    return this.adapterService.disableInherited(
      adapterId,
      { ownerType: OwnerType.SUBSIDIARY, ownerId: subsidiaryId },
      this.buildContext(user, req),
    );
  }

  @Post(':adapterId/enable')
  @RequirePermissions({ resource: 'integration.adapter', action: 'write' })
  @ApiOperation({ summary: 'Enable an inherited adapter for a subsidiary owner' })
  async enableSubsidiaryInheritedAdapter(
    @Param('subsidiaryId', ParseUUIDPipe) subsidiaryId: string,
    @Param('adapterId', ParseUUIDPipe) adapterId: string,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    return this.adapterService.enableInherited(
      adapterId,
      { ownerType: OwnerType.SUBSIDIARY, ownerId: subsidiaryId },
      this.buildContext(user, req),
    );
  }

  private buildContext(
    user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    req: Request,
  ): RequestContext {
    const requestUser = req as Request & {
      user?: { tenantId?: string; tenantSchema?: string };
    };

    return {
      userId: user.id,
      userName: user.username,
      ipAddress: (req.ip || req.socket?.remoteAddress) ?? undefined,
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id'] as string,
      tenantId: user.tenantId ?? requestUser.user?.tenantId,
      tenantSchema: user.tenantSchema ?? requestUser.user?.tenantSchema,
    };
  }
}

@ApiTags('Ops - Integration')
@ApiBearerAuth()
@Controller('talents/:talentId/integration/adapters')
export class TalentIntegrationAdapterController {
  constructor(
    private readonly adapterService: AdapterService,
    private readonly adapterResolutionService: AdapterResolutionService,
  ) {}

  @Get('/')
  @RequirePermissions({ resource: 'integration.adapter', action: 'read' })
  @ApiOperation({ summary: 'List talent adapters with optional inherited tenant adapters' })
  async listTalentAdapters(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Query() query: AdapterListQueryDto,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    return this.adapterService.findMany(
      { ownerType: OwnerType.TALENT, ownerId: talentId },
      {
        ...query,
        includeInherited: parseBooleanQueryValue(
          req.query.includeInherited as string | string[] | undefined,
          query.includeInherited ?? true,
        ),
        includeDisabled: parseBooleanQueryValue(
          req.query.includeDisabled as string | string[] | undefined,
          query.includeDisabled ?? false,
        ),
      },
      this.buildContext(user, req),
    );
  }

  @Post('/')
  @RequirePermissions({ resource: 'integration.adapter', action: 'write' })
  @ApiOperation({ summary: 'Create a talent-owned adapter' })
  async createTalentAdapter(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Body() dto: CreateAdapterDto,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    return this.adapterService.create(
      dto,
      this.buildContext(user, req),
      { ownerType: OwnerType.TALENT, ownerId: talentId },
    );
  }

  @Get('effective/:platformCode')
  @RequirePermissions({ resource: 'integration.adapter', action: 'read' })
  @ApiOperation({ summary: 'Resolve the effective talent adapter for a platform code' })
  async resolveTalentEffectiveAdapter(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('platformCode') platformCode: string,
    @Query('adapterType') adapterType: string | undefined,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    return this.adapterResolutionService.resolveEffectiveAdapter(
      {
        ownerType: OwnerType.TALENT,
        ownerId: talentId,
        platformCode,
        adapterType,
      },
      this.buildContext(user, req),
    );
  }

  @Post(':adapterId/disable')
  @RequirePermissions({ resource: 'integration.adapter', action: 'write' })
  @ApiOperation({ summary: 'Disable an inherited adapter for a talent owner' })
  async disableTalentInheritedAdapter(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('adapterId', ParseUUIDPipe) adapterId: string,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    return this.adapterService.disableInherited(
      adapterId,
      { ownerType: OwnerType.TALENT, ownerId: talentId },
      this.buildContext(user, req),
    );
  }

  @Post(':adapterId/enable')
  @RequirePermissions({ resource: 'integration.adapter', action: 'write' })
  @ApiOperation({ summary: 'Enable an inherited adapter for a talent owner' })
  async enableTalentInheritedAdapter(
    @Param('talentId', ParseUUIDPipe) talentId: string,
    @Param('adapterId', ParseUUIDPipe) adapterId: string,
    @CurrentUser() user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    @Req() req: Request,
  ) {
    return this.adapterService.enableInherited(
      adapterId,
      { ownerType: OwnerType.TALENT, ownerId: talentId },
      this.buildContext(user, req),
    );
  }

  private buildContext(
    user: { id: string; username: string; tenantId?: string; tenantSchema?: string },
    req: Request,
  ): RequestContext {
    const requestUser = req as Request & {
      user?: { tenantId?: string; tenantSchema?: string };
    };

    return {
      userId: user.id,
      userName: user.username,
      ipAddress: (req.ip || req.socket?.remoteAddress) ?? undefined,
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id'] as string,
      tenantId: user.tenantId ?? requestUser.user?.tenantId,
      tenantSchema: user.tenantSchema ?? requestUser.user?.tenantSchema,
    };
  }
}
