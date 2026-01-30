// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Body,
    Controller,
    Get,
    Post,
    Query,
    Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Request } from 'express';

import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { success } from '../../common/response.util';

import { PermissionSnapshotService, ScopeType } from './permission-snapshot.service';
import { PermissionAction, PermissionEffect, PermissionService } from './permission.service';

// DTOs
class ListPermissionsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by resource code', example: 'customer.profile' })
  @IsOptional()
  @IsString()
  resourceCode?: string;

  @ApiPropertyOptional({ description: 'Filter by action type', example: 'read', enum: ['create', 'read', 'update', 'delete', 'manage'] })
  @IsOptional()
  @IsString()
  action?: PermissionAction;

  @ApiPropertyOptional({ description: 'Filter by effect type', example: 'allow', enum: ['allow', 'deny'] })
  @IsOptional()
  @IsString()
  effect?: PermissionEffect;

  @ApiPropertyOptional({ description: 'Filter by active status', example: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

class PermissionCheckDto {
  @ApiProperty({ description: 'Resource code to check', example: 'customer.profile' })
  @IsString()
  resource: string;

  @ApiProperty({ description: 'Action to check', example: 'read' })
  @IsString()
  action: string;

  @ApiPropertyOptional({ description: 'Scope type for contextual check', example: 'subsidiary', enum: ['tenant', 'subsidiary', 'talent'] })
  @IsOptional()
  @IsString()
  scopeType?: ScopeType;

  @ApiPropertyOptional({ description: 'Scope ID for contextual check', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsString()
  scopeId?: string;
}

class CheckPermissionsDto {
  @ApiProperty({ description: 'List of permission checks to perform', type: [PermissionCheckDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionCheckDto)
  checks: PermissionCheckDto[];
}



// class GetMyPermissionsQueryDto {
//   @ApiPropertyOptional({ description: 'Scope type to filter permissions', example: 'talent', enum: ['tenant', 'subsidiary', 'talent'] })
//   @IsOptional()
//   @IsString()
//   scopeType?: ScopeType;
// 
//   @ApiPropertyOptional({ description: 'Scope ID to filter permissions', example: '550e8400-e29b-41d4-a716-446655440000' })
//   @IsOptional()
//   @IsString()
//   scopeId?: string;
// }

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
@ApiTags('System - Permissions')
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
