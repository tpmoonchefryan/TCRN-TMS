// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Put,
    Query,
    Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';
import { Request } from 'express';

import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { success } from '../../common/response.util';
import { RoleService } from './role.service';

// DTOs
class ListRolesQueryDto {
  @ApiPropertyOptional({ description: 'Search by role code or name', example: 'admin' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by system roles only', example: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isSystem?: boolean;

  @ApiPropertyOptional({ description: 'Filter by active status', example: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Sort field', example: 'code' })
  @IsOptional()
  @IsString()
  sort?: string;
}

class CreateRoleDto {
  @ApiProperty({ description: 'Role code (uppercase letters, numbers, underscores)', example: 'SALES_MANAGER', pattern: '^[A-Z0-9_]{3,32}$' })
  @IsString()
  @Matches(/^[A-Z0-9_]{3,32}$/)
  code: string;

  @ApiProperty({ description: 'Role name in English', example: 'Sales Manager', minLength: 1 })
  @IsString()
  @MinLength(1)
  nameEn: string;

  @ApiPropertyOptional({ description: 'Role name in Chinese', example: '销售经理' })
  @IsOptional()
  @IsString()
  nameZh?: string;

  @ApiPropertyOptional({ description: 'Role name in Japanese', example: '営業マネージャー' })
  @IsOptional()
  @IsString()
  nameJa?: string;

  @ApiPropertyOptional({ description: 'Role description', example: 'Manages sales team and customer relationships' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Permission IDs to assign', type: [String], example: ['perm-001', 'perm-002'] })
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];
}

class UpdateRoleDto {
  @ApiPropertyOptional({ description: 'Role name in English', example: 'Senior Sales Manager' })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Role name in Chinese', example: '高级销售经理' })
  @IsOptional()
  @IsString()
  nameZh?: string;

  @ApiPropertyOptional({ description: 'Role name in Japanese', example: 'シニア営業マネージャー' })
  @IsOptional()
  @IsString()
  nameJa?: string;

  @ApiPropertyOptional({ description: 'Role description', example: 'Senior manager for sales operations' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Optimistic lock version', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  version: number;
}

class SetPermissionsDto {
  @ApiProperty({ description: 'Permission IDs to set (replaces all existing)', type: [String], example: ['perm-001', 'perm-002', 'perm-003'] })
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];

  @ApiProperty({ description: 'Optimistic lock version', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  version: number;
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
 * Role Controller
 * Manages roles and their permissions
 */
@ApiTags('System - Roles')
@Controller('roles')
@ApiBearerAuth()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  /**
   * GET /api/v1/roles
   * List roles
   */
  @Get()
  @ApiOperation({ summary: 'List roles' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListRolesQueryDto,
    @Req() req: Request,
  ) {
    const language = (req.headers['accept-language'] as string)?.split(',')[0]?.substring(0, 2) || 'en';

    const roles = await this.roleService.list(user.tenantSchema, {
      search: query.search,
      isSystem: query.isSystem,
      isActive: query.isActive,
      sort: query.sort,
    });

    const data = roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: getLocalizedName(role, language),
      description: role.description,
      isSystem: role.isSystem,
      isActive: role.isActive,
      permissionCount: role.permissionCount,
      userCount: role.userCount,
      createdAt: role.createdAt.toISOString(),
      version: role.version,
    }));

    return success(data);
  }

  /**
   * POST /api/v1/roles
   * Create role
   */
  @Post()
  @ApiOperation({ summary: 'Create role' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoleDto,
    @Req() req: Request,
  ) {
    const language = (req.headers['accept-language'] as string)?.split(',')[0]?.substring(0, 2) || 'en';

    const role = await this.roleService.create(
      user.tenantSchema,
      {
        code: dto.code,
        nameEn: dto.nameEn,
        nameZh: dto.nameZh,
        nameJa: dto.nameJa,
        description: dto.description,
        permissionIds: dto.permissionIds,
      },
      user.id
    );

    const permissions = await this.roleService.getRolePermissions(role.id, user.tenantSchema, language);

    return success({
      id: role.id,
      code: role.code,
      name: getLocalizedName(role, language),
      isSystem: role.isSystem,
      isActive: role.isActive,
      permissions,
      createdAt: role.createdAt.toISOString(),
      version: role.version,
    });
  }

  /**
   * GET /api/v1/roles/:id
   * Get role details
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get role details' })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const language = (req.headers['accept-language'] as string)?.split(',')[0]?.substring(0, 2) || 'en';

    const role = await this.roleService.findById(id, user.tenantSchema);
    if (!role) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Role not found' } };
    }

    const permissions = await this.roleService.getRolePermissions(id, user.tenantSchema, language);

    return success({
      id: role.id,
      code: role.code,
      nameEn: role.nameEn,
      nameZh: role.nameZh,
      nameJa: role.nameJa,
      name: getLocalizedName(role, language),
      description: role.description,
      isSystem: role.isSystem,
      isActive: role.isActive,
      permissions,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
      version: role.version,
    });
  }

  /**
   * PATCH /api/v1/roles/:id
   * Update role
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update role' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: Request,
  ) {
    const language = (req.headers['accept-language'] as string)?.split(',')[0]?.substring(0, 2) || 'en';

    const role = await this.roleService.update(id, user.tenantSchema, dto, user.id);

    return success({
      id: role.id,
      code: role.code,
      name: getLocalizedName(role, language),
      updatedAt: role.updatedAt.toISOString(),
      version: role.version,
    });
  }

  /**
   * PUT /api/v1/roles/:id/permissions
   * Set role permissions
   */
  @Put(':id/permissions')
  @ApiOperation({ summary: 'Set role permissions' })
  async setPermissions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetPermissionsDto,
    @Req() req: Request,
  ) {
    const language = (req.headers['accept-language'] as string)?.split(',')[0]?.substring(0, 2) || 'en';

    const { role, affectedUsers } = await this.roleService.setPermissions(
      id,
      user.tenantSchema,
      dto.permissionIds,
      dto.version,
      user.id
    );

    const permissions = await this.roleService.getRolePermissions(role.id, user.tenantSchema, language);

    return success({
      id: role.id,
      permissions,
      version: role.version,
      affectedUsers,
      snapshotUpdateQueued: true,
    });
  }

  /**
   * POST /api/v1/roles/:id/deactivate
   * Deactivate role
   */
  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate role' })
  async deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { version: number },
  ) {
    const role = await this.roleService.deactivate(id, user.tenantSchema, body.version, user.id);

    return success({
      id: role.id,
      isActive: false,
      version: role.version,
    });
  }

  /**
   * POST /api/v1/roles/:id/reactivate
   * Reactivate role
   */
  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate role' })
  async reactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { version: number },
  ) {
    const role = await this.roleService.reactivate(id, user.tenantSchema, body.version, user.id);

    return success({
      id: role.id,
      isActive: true,
      version: role.version,
    });
  }
}
