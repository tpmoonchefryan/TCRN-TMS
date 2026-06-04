// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  Body,
  Controller,
  Delete,
  Get,
  GoneException,
  HttpCode,
  HttpStatus,
  MethodNotAllowedException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ErrorCodes,
  type LocalizedText,
  type PartialLocalizedText,
  pickLocalizedText,
  type RoleMutationPermissionsInput,
  SUPPORTED_UI_LOCALES,
} from '@tcrn/shared';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { Request } from 'express';

import { AuthenticatedUser, CurrentUser, RequirePermissions } from '../../common/decorators';
import { getPrimaryAcceptLanguage } from '../../common/request-locale.util';
import { success } from '../../common/response.util';
import { RoleService } from './role.service';

function toBooleanQueryValue(value: unknown): unknown {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return value;
}

function parseBooleanQueryValue(value: unknown, fallback?: boolean): boolean | undefined {
  const selectedValue = Array.isArray(value) ? value[0] : value;

  if (typeof selectedValue === 'boolean') {
    return selectedValue;
  }

  if (typeof selectedValue === 'string') {
    const normalized = selectedValue.trim().toLowerCase();

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return fallback;
}

// DTOs
export class ListRolesQueryDto {
  @ApiPropertyOptional({ description: 'Search by role code or name', example: 'admin' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by system roles only', example: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBooleanQueryValue(value))
  isSystem?: boolean;

  @ApiPropertyOptional({
    description: 'Include legacy admin compatibility rows for audit/debug readback only',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBooleanQueryValue(value))
  includeCompatibility?: boolean;

  @ApiPropertyOptional({ description: 'Sort field', example: 'code' })
  @IsOptional()
  @IsString()
  sort?: string;
}

export class CreateRoleDto {
  @ApiProperty({
    description: 'Role code (uppercase letters, numbers, underscores)',
    example: 'SALES_MANAGER',
    pattern: '^[A-Z0-9_]{3,32}$',
  })
  @IsString()
  @Matches(/^[A-Z0-9_]{3,32}$/)
  code: string;

  @ApiProperty({
    description: 'Role name by supported UI locale',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      en: 'Sales Manager',
      zh_HANS: '销售经理',
      zh_HANT: '銷售經理',
      ja: '営業マネージャー',
      ko: 'Sales Manager',
      fr: 'Sales Manager',
    },
  })
  @IsObject()
  name: LocalizedText;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Manages sales team and customer relationships',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Permission IDs to assign',
    type: [String],
    example: ['perm-001', 'perm-002'],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  permissionIds?: string[];

  @ApiPropertyOptional({
    description: 'Raw permission states to set. Unset removes an explicit role decision.',
    type: 'array',
  })
  @IsOptional()
  @IsArray()
  permissions?: Array<{ resource: string; action: string; effect?: 'grant' | 'deny' }>;

  @ApiPropertyOptional({
    description: 'Capability-pack and raw permission state payload.',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  permissionStates?: RoleMutationPermissionsInput;
}

export class UpdateRoleDto {
  @ApiPropertyOptional({
    description: 'Role name updates by supported UI locale',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  name?: PartialLocalizedText;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Senior manager for sales operations',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Optimistic lock version', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  version: number;

  @ApiPropertyOptional({
    description: 'Raw permission states to set. Unset removes an explicit role decision.',
    type: 'array',
  })
  @IsOptional()
  @IsArray()
  permissions?: Array<{ resource: string; action: string; effect?: 'grant' | 'deny' }>;

  @ApiPropertyOptional({
    description: 'Capability-pack and raw permission state payload.',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  permissionStates?: RoleMutationPermissionsInput;
}

export class SetPermissionsDto {
  @ApiProperty({
    description: 'Permission IDs to set (replaces all existing)',
    type: [String],
    example: ['perm-001', 'perm-002', 'perm-003'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];

  @ApiPropertyOptional({
    description: 'Capability-pack and raw permission state payload.',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  permissionStates?: RoleMutationPermissionsInput;

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

const createSuccessEnvelopeSchema = (
  dataSchema: Record<string, unknown>,
  exampleData: unknown
) => ({
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
    localizedName: { type: 'string', example: 'Sales Manager' },
    description: { type: 'string', nullable: true, example: 'Manages sales operations' },
    isSystem: { type: 'boolean', example: false },
    permissionCount: { type: 'integer', example: 12 },
    userCount: { type: 'integer', example: 3 },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:00:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:30:00.000Z' },
    version: { type: 'integer', example: 1 },
  },
  required: [
    'id',
    'code',
    'name',
    'localizedName',
    'isSystem',
    'permissionCount',
    'userCount',
    'createdAt',
    'updatedAt',
    'version',
  ],
} as const;

const ROLE_DETAIL_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
    code: { type: 'string', example: 'SALES_MANAGER' },
    nameTranslations: {
      type: 'object',
      properties: Object.fromEntries(
        SUPPORTED_UI_LOCALES.map((locale) => [locale, { type: 'string' }])
      ),
      required: SUPPORTED_UI_LOCALES,
      example: {
        en: 'Sales Manager',
        zh_HANS: '销售经理',
        zh_HANT: '銷售經理',
        ja: '営業マネージャー',
        ko: 'Sales Manager',
        fr: 'Sales Manager',
      },
    },
    name: { type: 'string', example: 'Sales Manager' },
    description: { type: 'string', nullable: true, example: 'Manages sales operations' },
    isSystem: { type: 'boolean', example: false },
    permissions: { type: 'array', items: ROLE_PERMISSION_SCHEMA },
    permissionCount: { type: 'integer', example: 12 },
    userCount: { type: 'integer', example: 3 },
    scopeBindings: { type: 'array', items: { type: 'object' } },
    assignedUsers: { type: 'array', items: { type: 'object' } },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:00:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:30:00.000Z' },
    version: { type: 'integer', example: 2 },
  },
  required: [
    'id',
    'code',
    'nameTranslations',
    'name',
    'isSystem',
    'permissions',
    'permissionCount',
    'userCount',
    'scopeBindings',
    'assignedUsers',
    'createdAt',
    'updatedAt',
    'version',
  ],
} as const;

const ROLE_LIST_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  { type: 'array', items: ROLE_LIST_ITEM_SCHEMA },
  [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      code: 'SALES_MANAGER',
      name: 'Sales Manager',
      localizedName: 'Sales Manager',
      description: 'Manages sales operations',
      isSystem: false,
      permissionCount: 12,
      userCount: 3,
      createdAt: '2026-04-13T09:00:00.000Z',
      updatedAt: '2026-04-13T09:30:00.000Z',
      version: 1,
    },
  ]
);

const ROLE_DETAIL_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(ROLE_DETAIL_SCHEMA, {
  id: '550e8400-e29b-41d4-a716-446655440000',
  code: 'SALES_MANAGER',
  nameTranslations: {
    en: 'Sales Manager',
    zh_HANS: '销售经理',
    zh_HANT: '銷售經理',
    ja: '営業マネージャー',
    ko: 'Sales Manager',
    fr: 'Sales Manager',
  },
  name: 'Sales Manager',
  description: 'Manages sales operations',
  isSystem: false,
  permissions: [
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      resourceCode: 'customer.export',
      action: 'read',
      effect: 'grant',
      name: 'Customer Export',
    },
  ],
  permissionCount: 1,
  userCount: 3,
  scopeBindings: [],
  assignedUsers: [],
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
  }
);

const ROLE_CREATE_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
      code: { type: 'string', example: 'SALES_MANAGER' },
      name: { type: 'string', example: 'Sales Manager' },
      isSystem: { type: 'boolean', example: false },
      permissions: { type: 'array', items: ROLE_PERMISSION_SCHEMA },
      createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:00:00.000Z' },
      version: { type: 'integer', example: 1 },
    },
    required: ['id', 'code', 'name', 'isSystem', 'permissions', 'createdAt', 'version'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    code: 'SALES_MANAGER',
    name: 'Sales Manager',
    isSystem: false,
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
  }
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
  }
);

const ROLE_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema(
  'RES_VERSION_MISMATCH',
  'Data has been modified. Please refresh and try again.'
);

const ROLE_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required'
);

const ROLE_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(ErrorCodes.RES_NOT_FOUND, 'Role not found');

const ROLE_FORBIDDEN_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.PERM_ACCESS_DENIED,
  'Cannot modify system role permissions'
);
const ROLE_STATUS_MACHINE_REMOVED_SCHEMA = createErrorEnvelopeSchema(
  'ROLE_STATUS_MACHINE_REMOVED',
  'Roles do not have an active/inactive lifecycle'
);
const ROLE_METHOD_NOT_ALLOWED_SCHEMA = createErrorEnvelopeSchema(
  'ROLE_DELETE_NOT_ALLOWED',
  'Roles are kept for audit history'
);

/**
 * Get localized name based on language
 */
function getLocalizedName(entity: { name: LocalizedText }, language: string = 'en'): string {
  return pickLocalizedText(entity.name, language);
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
  @RequirePermissions({ resource: 'role', action: 'read' })
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
    @Req() req: Request
  ) {
    const language = getPrimaryAcceptLanguage(req);
    const rawQuery = req.query as Record<string, unknown>;

    const roles = await this.roleService.list(user.tenantSchema, {
      search: query.search,
      isSystem: parseBooleanQueryValue(rawQuery.isSystem, query.isSystem),
      includeCompatibility: parseBooleanQueryValue(
        rawQuery.includeCompatibility,
        query.includeCompatibility
      ),
      sort: query.sort,
    });

    const data = roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: getLocalizedName(role, language),
      localizedName: getLocalizedName(role, language),
      description: role.description,
      isSystem: role.isSystem,
      permissionCount: role.permissionCount,
      userCount: role.userCount,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
      version: role.version,
    }));

    return success(data);
  }

  /**
   * POST /api/v1/roles
   * Create role
   */
  @Post()
  @RequirePermissions({ resource: 'role', action: 'create' })
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
    @Req() req: Request
  ) {
    const language = getPrimaryAcceptLanguage(req);

    const role = await this.roleService.create(
      user.tenantSchema,
      {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        permissionIds: dto.permissionIds,
        permissionStates: dto.permissionStates,
        permissions: dto.permissions,
      },
      user.id
    );

    const permissions = await this.roleService.getRolePermissions(
      role.id,
      user.tenantSchema,
      language
    );

    return success({
      id: role.id,
      code: role.code,
      name: getLocalizedName(role, language),
      isSystem: role.isSystem,
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
  @RequirePermissions({ resource: 'role', action: 'read' })
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
    @Req() req: Request
  ) {
    const language = getPrimaryAcceptLanguage(req);

    const role = await this.roleService.findDetailById(roleId, user.tenantSchema, language);
    if (!role) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Role not found',
      });
    }

    return success({
      id: role.id,
      code: role.code,
      nameTranslations: role.name,
      name: getLocalizedName(role, language),
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map((permission) => ({
        ...permission,
        resource: permission.resourceCode,
      })),
      permissionCount: role.permissionCount,
      userCount: role.userCount,
      scopeBindings: role.scopeBindings,
      assignedUsers: role.assignedUsers.map((assignment) => ({
        ...assignment,
        grantedAt: assignment.grantedAt.toISOString(),
        expiresAt: assignment.expiresAt?.toISOString() ?? null,
      })),
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
  @RequirePermissions({ resource: 'role', action: 'update' })
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
    @Req() req: Request
  ) {
    const language = getPrimaryAcceptLanguage(req);

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
  @RequirePermissions({ resource: 'role', action: 'update' })
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
    @Req() req: Request
  ) {
    const language = getPrimaryAcceptLanguage(req);

    const { role, affectedUsers } = dto.permissionStates
      ? await this.roleService.setPermissionStates(
          roleId,
          user.tenantSchema,
          dto.permissionStates,
          dto.version,
          user.id
        )
      : await this.roleService.setPermissions(
          roleId,
          user.tenantSchema,
          dto.permissionIds ?? [],
          dto.version,
          user.id
        );

    const permissions = await this.roleService.getRolePermissions(
      role.id,
      user.tenantSchema,
      language
    );

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
   * Legacy status route retained only to report removal.
   */
  @Post(':roleId/deactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ resource: 'role', action: 'update' })
  @ApiOperation({ summary: 'Role status lifecycle is removed', deprecated: true })
  @ApiParam({
    name: 'roleId',
    description: 'Role identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 410,
    description: 'Role active/inactive lifecycle has been removed',
    schema: ROLE_STATUS_MACHINE_REMOVED_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to use legacy role status routes',
    schema: ROLE_UNAUTHORIZED_SCHEMA,
  })
  async deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() body: RoleActivationDto
  ) {
    void user;
    void roleId;
    void body;
    throw new GoneException({
      code: 'ROLE_STATUS_MACHINE_REMOVED',
      message:
        'Roles do not have an active/inactive lifecycle. Remove assignments or change grant/deny/unset permission states.',
    });
  }

  /**
   * POST /api/v1/roles/:roleId/reactivate
   * Legacy status route retained only to report removal.
   */
  @Post(':roleId/reactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ resource: 'role', action: 'update' })
  @ApiOperation({ summary: 'Role status lifecycle is removed', deprecated: true })
  @ApiParam({
    name: 'roleId',
    description: 'Role identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 410,
    description: 'Role active/inactive lifecycle has been removed',
    schema: ROLE_STATUS_MACHINE_REMOVED_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to use legacy role status routes',
    schema: ROLE_UNAUTHORIZED_SCHEMA,
  })
  async reactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() body: RoleActivationDto
  ) {
    void user;
    void roleId;
    void body;
    throw new GoneException({
      code: 'ROLE_STATUS_MACHINE_REMOVED',
      message:
        'Roles do not have an active/inactive lifecycle. Remove assignments or change grant/deny/unset permission states.',
    });
  }

  /**
   * DELETE /api/v1/roles/:roleId
   * Role rows are retained for audit history.
   */
  @Delete(':roleId')
  @RequirePermissions({ resource: 'role', action: 'delete' })
  @ApiOperation({ summary: 'Role deletion is not allowed' })
  @ApiParam({
    name: 'roleId',
    description: 'Role identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 405,
    description: 'Role deletion is not allowed',
    schema: ROLE_METHOD_NOT_ALLOWED_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to delete roles',
    schema: ROLE_UNAUTHORIZED_SCHEMA,
  })
  async remove(@Param('roleId', ParseUUIDPipe) roleId: string) {
    void roleId;
    throw new MethodNotAllowedException({
      code: 'ROLE_DELETE_NOT_ALLOWED',
      message:
        'Roles are kept for audit history. Remove assignments or change grant/deny/unset states instead.',
    });
  }
}
