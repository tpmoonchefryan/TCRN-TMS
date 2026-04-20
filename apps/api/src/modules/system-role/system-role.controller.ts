// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { Body, Controller, Delete, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorCodes } from '@tcrn/shared';

import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { success } from '../../common/response.util';
import { TenantService } from '../tenant/tenant.service';
import { CreateSystemRoleZodDto, UpdateSystemRoleZodDto } from './dto/system-role-zod.dto';
import { SystemRoleService } from './system-role.service';

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

const SYSTEM_ROLE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
    code: { type: 'string', example: 'EXPORT_DENY' },
    nameEn: { type: 'string', example: 'Export Deny' },
    nameZh: { type: 'string', nullable: true, example: '导出拒绝' },
    nameJa: { type: 'string', nullable: true, example: 'エクスポート拒否' },
    translations: {
      type: 'object',
      additionalProperties: { type: 'string' },
      example: {
        en: 'Export Deny',
        zh_HANS: '导出拒绝',
        ja: 'エクスポート拒否',
        fr: "Refus d'exportation",
      },
    },
    description: { type: 'string', nullable: true, example: 'Denies export operations' },
    isSystem: { type: 'boolean', example: true },
    isActive: { type: 'boolean', example: true },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:00:00.000Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:00:00.000Z' },
  },
  required: ['id', 'code', 'nameEn', 'translations', 'isSystem', 'isActive', 'createdAt', 'updatedAt'],
} as const;

const SYSTEM_ROLE_DETAIL_SCHEMA = {
  ...SYSTEM_ROLE_SCHEMA,
  properties: {
    ...SYSTEM_ROLE_SCHEMA.properties,
    permissions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          resource: { type: 'string', example: 'customer.export' },
          action: { type: 'string', example: 'read' },
          effect: { type: 'string', example: 'deny' },
        },
        required: ['resource', 'action', 'effect'],
      },
    },
    permissionCount: { type: 'integer', example: 1 },
    userCount: { type: 'integer', example: 2 },
    scopeBindings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          scopeType: { type: 'string', example: 'talent' },
          scopeId: { type: 'string', format: 'uuid', nullable: true, example: '550e8400-e29b-41d4-a716-446655440030' },
          scopeName: { type: 'string', nullable: true, example: 'Tokino Sora' },
          scopePath: { type: 'string', nullable: true, example: '/TOKYO/SORA' },
          assignmentCount: { type: 'integer', example: 2 },
          userCount: { type: 'integer', example: 2 },
          inheritedAssignmentCount: { type: 'integer', example: 1 },
        },
        required: ['scopeType', 'assignmentCount', 'userCount', 'inheritedAssignmentCount'],
      },
    },
    assignedUsers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          assignmentId: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440010' },
          userId: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
          username: { type: 'string', example: 'john.doe' },
          email: { type: 'string', example: 'john.doe@example.com' },
          displayName: { type: 'string', nullable: true, example: 'John Doe' },
          avatarUrl: { type: 'string', nullable: true, example: 'https://cdn.tcrn.app/avatar.jpg' },
          isActive: { type: 'boolean', example: true },
          scopeType: { type: 'string', example: 'subsidiary' },
          scopeId: { type: 'string', format: 'uuid', nullable: true, example: '550e8400-e29b-41d4-a716-446655440040' },
          scopeName: { type: 'string', nullable: true, example: 'Tokyo Branch' },
          scopePath: { type: 'string', nullable: true, example: '/TOKYO' },
          inherit: { type: 'boolean', example: false },
          grantedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:10:00.000Z' },
          expiresAt: { type: 'string', format: 'date-time', nullable: true, example: null },
        },
        required: ['assignmentId', 'userId', 'username', 'email', 'isActive', 'scopeType', 'inherit', 'grantedAt'],
      },
    },
  },
  required: [
    ...Array.from(SYSTEM_ROLE_SCHEMA.required),
    'permissions',
    'permissionCount',
    'userCount',
    'scopeBindings',
    'assignedUsers',
  ],
} as const;

const SYSTEM_ROLE_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(SYSTEM_ROLE_SCHEMA, {
  id: '550e8400-e29b-41d4-a716-446655440000',
  code: 'EXPORT_DENY',
  nameEn: 'Export Deny',
  nameZh: '导出拒绝',
  nameJa: 'エクスポート拒否',
  translations: {
    en: 'Export Deny',
    zh_HANS: '导出拒绝',
    ja: 'エクスポート拒否',
    fr: "Refus d'exportation",
  },
  description: 'Denies export operations',
  isSystem: true,
  isActive: true,
  createdAt: '2026-04-13T09:00:00.000Z',
  updatedAt: '2026-04-13T09:00:00.000Z',
});

const SYSTEM_ROLE_LIST_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        ...SYSTEM_ROLE_SCHEMA.properties,
        permissionCount: { type: 'integer', example: 1 },
        userCount: { type: 'integer', example: 0 },
      },
    },
  },
  [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      code: 'EXPORT_DENY',
      nameEn: 'Export Deny',
      nameZh: '导出拒绝',
      nameJa: 'エクスポート拒否',
      translations: {
        en: 'Export Deny',
        zh_HANS: '导出拒绝',
        ja: 'エクスポート拒否',
      },
      description: 'Denies export operations',
      isSystem: true,
      isActive: true,
      createdAt: '2026-04-13T09:00:00.000Z',
      updatedAt: '2026-04-13T09:00:00.000Z',
      permissionCount: 1,
      userCount: 0,
    },
  ],
);

const SYSTEM_ROLE_DETAIL_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(SYSTEM_ROLE_DETAIL_SCHEMA, {
  id: '550e8400-e29b-41d4-a716-446655440000',
  code: 'EXPORT_DENY',
  nameEn: 'Export Deny',
  nameZh: '导出拒绝',
  nameJa: 'エクスポート拒否',
  translations: {
    en: 'Export Deny',
    zh_HANS: '导出拒绝',
    ja: 'エクスポート拒否',
  },
  description: 'Denies export operations',
  isSystem: true,
  isActive: true,
  createdAt: '2026-04-13T09:00:00.000Z',
  updatedAt: '2026-04-13T09:00:00.000Z',
  permissions: [{ resource: 'customer.export', action: 'read', effect: 'deny' }],
  permissionCount: 1,
  userCount: 2,
  scopeBindings: [
    {
      scopeType: 'talent',
      scopeId: '550e8400-e29b-41d4-a716-446655440030',
      scopeName: 'Tokino Sora',
      scopePath: '/TOKYO/SORA',
      assignmentCount: 2,
      userCount: 2,
      inheritedAssignmentCount: 1,
    },
  ],
  assignedUsers: [
    {
      assignmentId: '550e8400-e29b-41d4-a716-446655440010',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      username: 'john.doe',
      email: 'john.doe@example.com',
      displayName: 'John Doe',
      avatarUrl: null,
      isActive: true,
      scopeType: 'talent',
      scopeId: '550e8400-e29b-41d4-a716-446655440030',
      scopeName: 'Tokino Sora',
      scopePath: '/TOKYO/SORA',
      inherit: false,
      grantedAt: '2026-04-13T09:10:00.000Z',
      expiresAt: null,
    },
  ],
});

const SYSTEM_ROLE_DELETE_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      deleted: { type: 'boolean', example: true },
    },
    required: ['deleted'],
  },
  { deleted: true },
);

const SYSTEM_ROLE_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema(
  'RES_CONFLICT',
  'System role change is invalid for the current state',
);

const SYSTEM_ROLE_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required',
);

const SYSTEM_ROLE_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(
  'RES_NOT_FOUND',
  'System role not found',
);

@ApiTags('System - System Roles')
@ApiBearerAuth()
@Controller('system-roles')
export class SystemRoleController {
  constructor(
    private readonly systemRoleService: SystemRoleService,
    private readonly tenantService: TenantService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create system role' })
  @ApiResponse({
    status: 201,
    description: 'Creates a system role',
    schema: SYSTEM_ROLE_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'System role payload is invalid or conflicts with existing data',
    schema: SYSTEM_ROLE_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to create system roles',
    schema: SYSTEM_ROLE_UNAUTHORIZED_SCHEMA,
  })
  async create(@Body() createSystemRoleDto: CreateSystemRoleZodDto) {
    const role = await this.systemRoleService.create(createSystemRoleDto);
    return success(role);
  }

  @Get()
  @ApiOperation({ summary: 'List system roles' })
  @ApiResponse({
    status: 200,
    description: 'Returns system roles',
    schema: SYSTEM_ROLE_LIST_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to list system roles',
    schema: SYSTEM_ROLE_UNAUTHORIZED_SCHEMA,
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('isActive') isActive?: string,
    @Query('isSystem') isSystem?: string,
    @Query('search') search?: string,
  ) {
    const tenant = await this.tenantService.getTenantById(user.tenantId);
    const filters = {
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      isSystem: isSystem === 'true' ? true : isSystem === 'false' ? false : undefined,
      search,
    };
    const roles = await this.systemRoleService.findAll(
      filters,
      user.tenantSchema,
      tenant?.tier === 'ac' ? 'ac' : 'standard',
    );
    return success(roles);
  }

  @Get(':systemRoleId')
  @ApiOperation({ summary: 'Get system role detail' })
  @ApiParam({
    name: 'systemRoleId',
    description: 'System role identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns system role detail',
    schema: SYSTEM_ROLE_DETAIL_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to read system role detail',
    schema: SYSTEM_ROLE_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'System role was not found',
    schema: SYSTEM_ROLE_NOT_FOUND_SCHEMA,
  })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('systemRoleId', ParseUUIDPipe) systemRoleId: string,
  ) {
    const tenant = await this.tenantService.getTenantById(user.tenantId);
    const role = await this.systemRoleService.findOne(
      systemRoleId,
      user.tenantSchema,
      tenant?.tier === 'ac' ? 'ac' : 'standard',
    );
    if (!role) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'System role not found',
      });
    }
    return success(role);
  }

  @Patch(':systemRoleId')
  @ApiOperation({ summary: 'Update system role' })
  @ApiParam({
    name: 'systemRoleId',
    description: 'System role identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated system role',
    schema: SYSTEM_ROLE_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'System role update is invalid',
    schema: SYSTEM_ROLE_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to update system roles',
    schema: SYSTEM_ROLE_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'System role was not found',
    schema: SYSTEM_ROLE_NOT_FOUND_SCHEMA,
  })
  async update(
    @Param('systemRoleId', ParseUUIDPipe) systemRoleId: string,
    @Body() updateSystemRoleDto: UpdateSystemRoleZodDto,
  ) {
    const role = await this.systemRoleService.update(systemRoleId, updateSystemRoleDto);
    return success(role);
  }

  @Delete(':systemRoleId')
  @ApiOperation({ summary: 'Delete system role' })
  @ApiParam({
    name: 'systemRoleId',
    description: 'System role identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Deletes the system role',
    schema: SYSTEM_ROLE_DELETE_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'System role cannot be deleted in its current state',
    schema: SYSTEM_ROLE_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to delete system roles',
    schema: SYSTEM_ROLE_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'System role was not found',
    schema: SYSTEM_ROLE_NOT_FOUND_SCHEMA,
  })
  async remove(@Param('systemRoleId', ParseUUIDPipe) systemRoleId: string) {
    await this.systemRoleService.remove(systemRoleId);
    return success({ deleted: true });
  }
}
