// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorCodes } from '@tcrn/shared';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';
import { Request } from 'express';

import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { success } from '../../common/response.util';
import { RoleService } from './role.service';

// DTOs
export class ListRolesQueryDto {
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

export class CreateRoleDto {
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

export class UpdateRoleDto {
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

export class SetPermissionsDto {
  @ApiProperty({ description: 'Permission IDs to set (replaces all existing)', type: [String], example: ['perm-001', 'perm-002', 'perm-003'] })
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];

  @ApiProperty({ description: 'Optimistic lock version', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  version: number;
}

export class RoleActivationDto {
  @ApiProperty({ description: 'Optimistic lock version', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  version: number;
}

const createSuccessEnvelopeSchema = (dataSchema: Record<string, unknown>, exampleData: unknown) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: dataSchema,
  },
  required: ['success', 'data'],
  example: {
    success: true,
    data: exampleData,
  },
});

const createErrorEnvelopeSchema = (code: string, message: string) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: code },
        message: { type: 'string', example: message },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
  example: {
    success: false,
    error: {
      code,
      message,
    },
  },
});

const ROLE_PERMISSION_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440010' },
    resourceCode: { type: 'string', example: 'customer.export' },
    action: { type: 'string', example: 'read' },
    effect: { type: 'string', example: 'grant' },
    name: { type: 'string', example: 'Customer Export' },
  },
  required: ['id', 'resourceCode', 'action', 'effect', 'name'],
} as const;

const ROLE_LIST_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
    code: { type: 'string', example: 'SALES_MANAGER' },
    name: { type: 'string', example: 'Sales Manager' },
    description: { type: 'string', nullable: true, example: 'Manages sales operations' },
    isSystem: { type: 'boolean', example: false },
    isActive: { type: 'boolean', example: true },
    permissionCount: { type: 'integer', example: 12 },
    userCount: { type: 'integer', example: 3 },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:00:00.000Z' },
    version: { type: 'integer', example: 1 },
  },
  required: ['id', 'code', 'name', 'isSystem', 'isActive', 'permissionCount', 'userCount', 'createdAt', 'version'],
} as const;

const ROLE_DETAIL_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
    code: { type: 'string', example: 'SALES_MANAGER' },
    nameEn: { type: 'string', example: 'Sales Manager' },
    nameZh: { type: 'string', nullable: true, example: '销售经理' },
    nameJa: { type: 'string', nullable: true, example: '営業マネージャー' },
    name: { type: 'string', example: 'Sales Manager' },
    description: { type: 'string', nullable: true, example: 'Manages sales operations' },
    isSystem: { type: 'boolean', example: false },
    isActive: { type: 'boolean', example: true },
    permissions: { type: 'array', items: ROLE_PERMISSION_SCHEMA },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:00:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:30:00.000Z' },
    version: { type: 'integer', example: 2 },
  },
  required: ['id', 'code', 'nameEn', 'name', 'isSystem', 'isActive', 'permissions', 'createdAt', 'updatedAt', 'version'],
} as const;

const ROLE_LIST_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  { type: 'array', items: ROLE_LIST_ITEM_SCHEMA },
  [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      code: 'SALES_MANAGER',
      name: 'Sales Manager',
      description: 'Manages sales operations',
      isSystem: false,
      isActive: true,
      permissionCount: 12,
      userCount: 3,
      createdAt: '2026-04-13T09:00:00.000Z',
      version: 1,
    },
  ],
);

const ROLE_DETAIL_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(ROLE_DETAIL_SCHEMA, {
  id: '550e8400-e29b-41d4-a716-446655440000',
  code: 'SALES_MANAGER',
  nameEn: 'Sales Manager',
  nameZh: '销售经理',
  nameJa: '営業マネージャー',
  name: 'Sales Manager',
  description: 'Manages sales operations',
  isSystem: false,
  isActive: true,
  permissions: [
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      resourceCode: 'customer.export',
      action: 'read',
      effect: 'grant',
      name: 'Customer Export',
    },
  ],
  createdAt: '2026-04-13T09:00:00.000Z',
  updatedAt: '2026-04-13T09:30:00.000Z',
  version: 2,
});

const ROLE_MUTATION_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
      code: { type: 'string', example: 'SALES_MANAGER' },
      name: { type: 'string', example: 'Sales Manager' },
      updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:30:00.000Z' },
      version: { type: 'integer', example: 2 },
    },
    required: ['id', 'code', 'name', 'updatedAt', 'version'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    code: 'SALES_MANAGER',
    name: 'Sales Manager',
    updatedAt: '2026-04-13T09:30:00.000Z',
    version: 2,
  },
);

const ROLE_CREATE_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
      code: { type: 'string', example: 'SALES_MANAGER' },
      name: { type: 'string', example: 'Sales Manager' },
      isSystem: { type: 'boolean', example: false },
      isActive: { type: 'boolean', example: true },
      permissions: { type: 'array', items: ROLE_PERMISSION_SCHEMA },
      createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:00:00.000Z' },
      version: { type: 'integer', example: 1 },
    },
    required: ['id', 'code', 'name', 'isSystem', 'isActive', 'permissions', 'createdAt', 'version'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    code: 'SALES_MANAGER',
    name: 'Sales Manager',
    isSystem: false,
    isActive: true,
    permissions: [
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        resourceCode: 'customer.export',
        action: 'read',
        effect: 'grant',
        name: 'Customer Export',
      },
    ],
    createdAt: '2026-04-13T09:00:00.000Z',
    version: 1,
  },
);

const ROLE_PERMISSION_SET_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
      permissions: { type: 'array', items: ROLE_PERMISSION_SCHEMA },
      version: { type: 'integer', example: 3 },
      affectedUsers: { type: 'integer', example: 5 },
      snapshotUpdateQueued: { type: 'boolean', example: true },
    },
    required: ['id', 'permissions', 'version', 'affectedUsers', 'snapshotUpdateQueued'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    permissions: [
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        resourceCode: 'customer.export',
        action: 'read',
        effect: 'grant',
        name: 'Customer Export',
      },
    ],
    version: 3,
    affectedUsers: 5,
    snapshotUpdateQueued: true,
  },
);

const ROLE_ACTIVATION_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
      isActive: { type: 'boolean', example: false },
      version: { type: 'integer', example: 3 },
    },
    required: ['id', 'isActive', 'version'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    isActive: false,
    version: 3,
  },
);

const ROLE_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema(
  'RES_VERSION_MISMATCH',
  'Data has been modified. Please refresh and try again.',
);

const ROLE_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required',
);

const ROLE_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_NOT_FOUND,
  'Role not found',
);

const ROLE_FORBIDDEN_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.PERM_ACCESS_DENIED,
  'Cannot modify system role permissions',
);

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
  @ApiResponse({
    status: 200,
    description: 'Returns roles',
    schema: ROLE_LIST_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to list roles',
    schema: ROLE_UNAUTHORIZED_SCHEMA,
  })
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
  @ApiResponse({
    status: 201,
    description: 'Creates a role',
    schema: ROLE_CREATE_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Role payload is invalid or the code already exists',
    schema: ROLE_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to create roles',
    schema: ROLE_UNAUTHORIZED_SCHEMA,
  })
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
   * GET /api/v1/roles/:roleId
   * Get role details
   */
  @Get(':roleId')
  @ApiOperation({ summary: 'Get role details' })
  @ApiParam({
    name: 'roleId',
    description: 'Role identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns role detail',
    schema: ROLE_DETAIL_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to read role detail',
    schema: ROLE_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Role was not found',
    schema: ROLE_NOT_FOUND_SCHEMA,
  })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Req() req: Request,
  ) {
    const language = (req.headers['accept-language'] as string)?.split(',')[0]?.substring(0, 2) || 'en';

    const role = await this.roleService.findById(roleId, user.tenantSchema);
    if (!role) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Role not found',
      });
    }

    const permissions = await this.roleService.getRolePermissions(roleId, user.tenantSchema, language);

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
   * PATCH /api/v1/roles/:roleId
   * Update role
   */
  @Patch(':roleId')
  @ApiOperation({ summary: 'Update role' })
  @ApiParam({
    name: 'roleId',
    description: 'Role identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated role',
    schema: ROLE_MUTATION_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Role update is invalid or the version mismatched',
    schema: ROLE_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to update roles',
    schema: ROLE_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Role was not found',
    schema: ROLE_NOT_FOUND_SCHEMA,
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: Request,
  ) {
    const language = (req.headers['accept-language'] as string)?.split(',')[0]?.substring(0, 2) || 'en';

    const role = await this.roleService.update(roleId, user.tenantSchema, dto, user.id);

    return success({
      id: role.id,
      code: role.code,
      name: getLocalizedName(role, language),
      updatedAt: role.updatedAt.toISOString(),
      version: role.version,
    });
  }

  /**
   * PATCH /api/v1/roles/:roleId/permissions
   * Set role permissions
   */
  @Patch(':roleId/permissions')
  @ApiOperation({ summary: 'Set role permissions' })
  @ApiParam({
    name: 'roleId',
    description: 'Role identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Replaces role permissions and queues snapshot refresh',
    schema: ROLE_PERMISSION_SET_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Role permission update is invalid or the version mismatched',
    schema: ROLE_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to set role permissions',
    schema: ROLE_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'System role permissions cannot be modified',
    schema: ROLE_FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Role was not found',
    schema: ROLE_NOT_FOUND_SCHEMA,
  })
  async setPermissions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: SetPermissionsDto,
    @Req() req: Request,
  ) {
    const language = (req.headers['accept-language'] as string)?.split(',')[0]?.substring(0, 2) || 'en';

    const { role, affectedUsers } = await this.roleService.setPermissions(
      roleId,
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
   * POST /api/v1/roles/:roleId/deactivate
   * Deactivate role
   */
  @Post(':roleId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate role' })
  @ApiParam({
    name: 'roleId',
    description: 'Role identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Deactivates the role',
    schema: ROLE_ACTIVATION_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Role deactivation is invalid or the version mismatched',
    schema: ROLE_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to deactivate roles',
    schema: ROLE_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'System roles cannot be deactivated',
    schema: ROLE_FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Role was not found',
    schema: ROLE_NOT_FOUND_SCHEMA,
  })
  async deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() body: RoleActivationDto,
  ) {
    const role = await this.roleService.deactivate(roleId, user.tenantSchema, body.version, user.id);

    return success({
      id: role.id,
      isActive: false,
      version: role.version,
    });
  }

  /**
   * POST /api/v1/roles/:roleId/reactivate
   * Reactivate role
   */
  @Post(':roleId/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate role' })
  @ApiParam({
    name: 'roleId',
    description: 'Role identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Reactivates the role',
    schema: {
      ...ROLE_ACTIVATION_SUCCESS_SCHEMA,
      example: {
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          isActive: true,
          version: 4,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Role reactivation is invalid or the version mismatched',
    schema: ROLE_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to reactivate roles',
    schema: ROLE_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Role was not found',
    schema: ROLE_NOT_FOUND_SCHEMA,
  })
  async reactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() body: RoleActivationDto,
  ) {
    const role = await this.roleService.reactivate(roleId, user.tenantSchema, body.version, user.id);

    return success({
      id: role.id,
      isActive: true,
      version: role.version,
    });
  }
}
