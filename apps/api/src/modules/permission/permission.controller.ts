// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Request } from 'express';

import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { success } from '../../common/response.util';

import { PermissionSnapshotService, ScopeType } from './permission-snapshot.service';
import { PermissionService, PermissionAction, PermissionEffect } from './permission.service';

// DTOs
class ListPermissionsQueryDto {
  @IsOptional()
  @IsString()
  resourceCode?: string;

  @IsOptional()
  @IsString()
  action?: PermissionAction;

  @IsOptional()
  @IsString()
  effect?: PermissionEffect;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

class PermissionCheckDto {
  @IsString()
  resource: string;

  @IsString()
  action: string;

  @IsOptional()
  @IsString()
  scopeType?: ScopeType;

  @IsOptional()
  @IsString()
  scopeId?: string;
}

class CheckPermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionCheckDto)
  checks: PermissionCheckDto[];
}

class GetMyPermissionsQueryDto {
  @IsOptional()
  @IsString()
  scopeType?: ScopeType;

  @IsOptional()
  @IsString()
  scopeId?: string;
}

/**
 * Get localized name based on language
 */
function getLocalizedName(
  entity: { nameEn: string; nameZh: string | null; nameJa: string | null },
  language: string = 'en'
): string {
  switch (language) {
    case 'zh':
      return entity.nameZh || entity.nameEn;
    case 'ja':
      return entity.nameJa || entity.nameEn;
    default:
      return entity.nameEn;
  }
}

/**
 * Permission Controller
 * Manages permission entries and checks
 */
@ApiTags('Permissions')
@Controller('permissions')
@ApiBearerAuth()
export class PermissionController {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly snapshotService: PermissionSnapshotService,
  ) {}

  /**
   * GET /api/v1/permissions
   * List all permissions
   */
  @Get()
  @ApiOperation({ summary: 'List permissions' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPermissionsQueryDto,
    @Req() req: Request,
  ) {
    const language = (req.headers['accept-language'] as string)?.split(',')[0]?.substring(0, 2) || 'en';

    const permissions = await this.permissionService.list(user.tenantSchema, {
      resourceCode: query.resourceCode,
      action: query.action,
      effect: query.effect,
      isActive: query.isActive,
    });

    const data = permissions.map((perm) => ({
      id: perm.id,
      resourceCode: perm.resourceCode,
      action: perm.action,
      effect: perm.effect,
      name: getLocalizedName(perm, language),
      description: perm.description,
      isSystem: perm.isSystem,
      isActive: perm.isActive,
    }));

    return success(data);
  }

  /**
   * GET /api/v1/permissions/resources
   * Get resource definitions for UI
   */
  @Get('resources')
  @ApiOperation({ summary: 'Get resource definitions' })
  async getResources(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const language = (req.headers['accept-language'] as string)?.split(',')[0]?.substring(0, 2) || 'en';
    
    const resources = await this.permissionService.getResourceDefinitions(user.tenantSchema, language);
    
    return success(resources);
  }

  /**
   * POST /api/v1/permissions/check
   * Batch check permissions
   */
  @Post('check')
  @ApiOperation({ summary: 'Batch check permissions' })
  async checkPermissions(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckPermissionsDto,
  ) {
    const results = await Promise.all(
      dto.checks.map(async (check) => {
        const allowed = await this.snapshotService.checkPermission(
          user.tenantSchema,
          user.id,
          check.resource,
          check.action,
          check.scopeType,
          check.scopeId,
        );
        return {
          resource: check.resource,
          action: check.action,
          allowed,
        };
      })
    );

    return success({ results });
  }
}
