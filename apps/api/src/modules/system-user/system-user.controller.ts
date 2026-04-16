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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorCodes } from '@tcrn/shared';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginated, success } from '../../common/response.util';
import { SystemUserService } from './system-user.service';

// DTOs
export class ListUsersQueryDto {
  @ApiPropertyOptional({ description: 'Search by username, email, or display name', example: 'john' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by role ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiPropertyOptional({ description: 'Filter by active status', example: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by TOTP enabled status', example: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isTotpEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Page number', example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', example: 20, minimum: 1, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Sort field (prefix with - for desc)', example: '-createdAt' })
  @IsOptional()
  @IsString()
  sort?: string;
}

export class CreateUserDto {
  @ApiProperty({ description: 'Username (unique within tenant)', example: 'john.doe', minLength: 3 })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ description: 'Email address (unique within tenant)', example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Initial password (min 12 chars)', example: 'SecureP@ssw0rd123', minLength: 12 })
  @IsString()
  @MinLength(12)
  password: string;

  @ApiPropertyOptional({ description: 'Display name', example: 'John Doe' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+81-90-1234-5678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Preferred language', example: 'ja', enum: ['en', 'zh', 'ja'] })
  @IsOptional()
  @IsEnum(['en', 'zh', 'ja'])
  preferredLanguage?: 'en' | 'zh' | 'ja';

  @ApiPropertyOptional({ description: 'Force password reset on first login', example: true, default: false })
  @IsOptional()
  @IsBoolean()
  forceReset?: boolean;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Display name', example: 'John Doe' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+81-90-1234-5678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Preferred language', example: 'ja', enum: ['en', 'zh', 'ja'] })
  @IsOptional()
  @IsEnum(['en', 'zh', 'ja'])
  preferredLanguage?: 'en' | 'zh' | 'ja';

  @ApiPropertyOptional({ description: 'Avatar URL', example: 'https://example.com/avatars/user.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class ResetPasswordDto {
  @ApiPropertyOptional({ description: 'New password (if empty, generates random)', example: 'NewSecureP@ss123' })
  @IsOptional()
  @IsString()
  newPassword?: string;

  @ApiPropertyOptional({ description: 'Force password reset on next login', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  forceReset?: boolean;

  @ApiPropertyOptional({ description: 'Send notification email to user', example: true, default: false })
  @IsOptional()
  @IsBoolean()
  notifyUser?: boolean;
}

export class SetScopeAccessDto {
  @ApiProperty({
    description: 'Scope access entries to apply',
    type: 'array',
    example: [{ scopeType: 'talent', scopeId: '550e8400-e29b-41d4-a716-446655440000', includeSubunits: false }],
  })
  accesses: Array<{ scopeType: string; scopeId?: string; includeSubunits?: boolean }>;
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

const SYSTEM_USER_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
    username: { type: 'string', example: 'john.doe' },
    email: { type: 'string', example: 'john.doe@example.com' },
    displayName: { type: 'string', nullable: true, example: 'John Doe' },
    avatarUrl: { type: 'string', nullable: true, example: 'https://cdn.tcrn.app/avatar.jpg' },
    isActive: { type: 'boolean', example: true },
    isTotpEnabled: { type: 'boolean', example: false },
    forceReset: { type: 'boolean', example: true },
    lastLoginAt: { type: 'string', nullable: true, format: 'date-time', example: '2026-04-13T09:00:00.000Z' },
    createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T08:00:00.000Z' },
  },
  required: ['id', 'username', 'email', 'isActive', 'isTotpEnabled', 'forceReset', 'createdAt'],
};

const SYSTEM_USER_DETAIL_SCHEMA = {
  type: 'object',
  properties: {
    ...SYSTEM_USER_ITEM_SCHEMA.properties,
    phone: { type: 'string', nullable: true, example: '+81-90-1234-5678' },
    preferredLanguage: { type: 'string', example: 'ja' },
    updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:30:00.000Z' },
  },
  required: [...(SYSTEM_USER_ITEM_SCHEMA.required as string[]), 'preferredLanguage', 'updatedAt'],
};

const SYSTEM_USER_SCOPE_ACCESS_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440111' },
    scopeType: { type: 'string', example: 'talent' },
    scopeId: { type: 'string', format: 'uuid', nullable: true, example: '550e8400-e29b-41d4-a716-446655440000' },
    includeSubunits: { type: 'boolean', example: false },
  },
  required: ['id', 'scopeType', 'includeSubunits'],
};

const SYSTEM_USER_PAGINATED_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: { type: 'array', items: SYSTEM_USER_ITEM_SCHEMA },
    meta: {
      type: 'object',
      properties: {
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            pageSize: { type: 'integer', example: 20 },
            totalCount: { type: 'integer', example: 1 },
            totalPages: { type: 'integer', example: 1 },
            hasNext: { type: 'boolean', example: false },
            hasPrev: { type: 'boolean', example: false },
          },
          required: ['page', 'pageSize', 'totalCount', 'totalPages', 'hasNext', 'hasPrev'],
        },
      },
      required: ['pagination'],
    },
  },
  required: ['success', 'data', 'meta'],
  example: {
    success: true,
    data: [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        username: 'john.doe',
        email: 'john.doe@example.com',
        displayName: 'John Doe',
        avatarUrl: null,
        isActive: true,
        isTotpEnabled: false,
        forceReset: true,
        lastLoginAt: '2026-04-13T09:00:00.000Z',
        createdAt: '2026-04-13T08:00:00.000Z',
      },
    ],
    meta: {
      pagination: {
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    },
  },
};

const SYSTEM_USER_DETAIL_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(SYSTEM_USER_DETAIL_SCHEMA, {
  id: '550e8400-e29b-41d4-a716-446655440000',
  username: 'john.doe',
  email: 'john.doe@example.com',
  displayName: 'John Doe',
  phone: '+81-90-1234-5678',
  avatarUrl: null,
  preferredLanguage: 'ja',
  isActive: true,
  isTotpEnabled: false,
  forceReset: true,
  lastLoginAt: '2026-04-13T09:00:00.000Z',
  createdAt: '2026-04-13T08:00:00.000Z',
  updatedAt: '2026-04-13T09:30:00.000Z',
});

const SYSTEM_USER_CREATE_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
      username: { type: 'string', example: 'john.doe' },
      email: { type: 'string', example: 'john.doe@example.com' },
      displayName: { type: 'string', nullable: true, example: 'John Doe' },
      isActive: { type: 'boolean', example: true },
      forceReset: { type: 'boolean', example: true },
      createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T08:00:00.000Z' },
    },
    required: ['id', 'username', 'email', 'isActive', 'forceReset', 'createdAt'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'john.doe',
    email: 'john.doe@example.com',
    displayName: 'John Doe',
    isActive: true,
    forceReset: true,
    createdAt: '2026-04-13T08:00:00.000Z',
  },
);

const SYSTEM_USER_UPDATE_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
      displayName: { type: 'string', nullable: true, example: 'John Doe' },
      phone: { type: 'string', nullable: true, example: '+81-90-1234-5678' },
      preferredLanguage: { type: 'string', example: 'ja' },
      avatarUrl: { type: 'string', nullable: true, example: 'https://cdn.tcrn.app/avatar.jpg' },
      updatedAt: { type: 'string', format: 'date-time', example: '2026-04-13T09:30:00.000Z' },
    },
    required: ['id', 'preferredLanguage', 'updatedAt'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    displayName: 'John Doe',
    phone: '+81-90-1234-5678',
    preferredLanguage: 'ja',
    avatarUrl: null,
    updatedAt: '2026-04-13T09:30:00.000Z',
  },
);

const SYSTEM_USER_MESSAGE_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'Password reset successfully' },
      tempPassword: { type: 'string', nullable: true, example: 'TempP@ss123456789' },
      forceReset: { type: 'boolean', example: true },
    },
    required: ['message'],
  },
  {
    message: 'Password reset successfully',
    tempPassword: 'TempP@ss123456789',
    forceReset: true,
  },
);

const SYSTEM_USER_ACTIVATION_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
      isActive: { type: 'boolean', example: false },
    },
    required: ['id', 'isActive'],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    isActive: false,
  },
);

const SYSTEM_USER_SCOPE_ACCESS_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  { type: 'array', items: SYSTEM_USER_SCOPE_ACCESS_SCHEMA },
  [
    {
      id: '550e8400-e29b-41d4-a716-446655440111',
      scopeType: 'talent',
      scopeId: '550e8400-e29b-41d4-a716-446655440000',
      includeSubunits: false,
    },
  ],
);

const SYSTEM_USER_SCOPE_ACCESS_UPDATE_SUCCESS_SCHEMA = createSuccessEnvelopeSchema(
  {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'Scope access updated' },
    },
    required: ['message'],
  },
  { message: 'Scope access updated' },
);

const SYSTEM_USER_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.USER_USERNAME_TAKEN,
  'System user request is invalid',
);

const SYSTEM_USER_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required',
);

const SYSTEM_USER_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.USER_NOT_FOUND,
  'User not found',
);


/**
 * System User Controller
 * Manages system users within a tenant
 */
@ApiTags('System - Users')
@Controller('system-users')
@ApiBearerAuth()
export class SystemUserController {
  constructor(private readonly systemUserService: SystemUserService) {}

  /**
   * GET /api/v1/system-users
   * List system users
   */
  @Get()
  @ApiOperation({ summary: 'List system users' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated system users',
    schema: SYSTEM_USER_PAGINATED_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to list system users',
    schema: SYSTEM_USER_UNAUTHORIZED_SCHEMA,
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListUsersQueryDto,
  ) {
    const { data, total } = await this.systemUserService.list(user.tenantSchema, {
      search: query.search,
      roleId: query.roleId,
      isActive: query.isActive,
      isTotpEnabled: query.isTotpEnabled,
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
    });

    const result = data.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      isActive: u.isActive,
      isTotpEnabled: u.isTotpEnabled,
      forceReset: u.forceReset,
      lastLoginAt: u.lastLoginAt?.toISOString() || null,
      createdAt: u.createdAt.toISOString(),
    }));

    return paginated(result, {
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      totalCount: total,
    });
  }

  /**
   * POST /api/v1/system-users
   * Create system user
   */
  @Post()
  @ApiOperation({ summary: 'Create system user' })
  @ApiResponse({
    status: 201,
    description: 'Creates a system user',
    schema: SYSTEM_USER_CREATE_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'System user payload is invalid or conflicts with an existing username/email',
    schema: SYSTEM_USER_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to create system users',
    schema: SYSTEM_USER_UNAUTHORIZED_SCHEMA,
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUserDto,
  ) {
    const newUser = await this.systemUserService.create(user.tenantSchema, {
      username: dto.username,
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
      phone: dto.phone,
      preferredLanguage: dto.preferredLanguage,
      forceReset: dto.forceReset,
    });

    return success({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      displayName: newUser.displayName,
      isActive: newUser.isActive,
      forceReset: newUser.forceReset,
      createdAt: newUser.createdAt.toISOString(),
    });
  }

  /**
   * GET /api/v1/system-users/:systemUserId
   * Get system user details
   */
  @Get(':systemUserId')
  @ApiOperation({ summary: 'Get system user details' })
  @ApiParam({
    name: 'systemUserId',
    description: 'System user identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns system user detail',
    schema: SYSTEM_USER_DETAIL_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to read system user detail',
    schema: SYSTEM_USER_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'System user was not found',
    schema: SYSTEM_USER_NOT_FOUND_SCHEMA,
  })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('systemUserId', ParseUUIDPipe) systemUserId: string,
  ) {
    const systemUser = await this.systemUserService.findById(systemUserId, user.tenantSchema);
    if (!systemUser) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    return success({
      id: systemUser.id,
      username: systemUser.username,
      email: systemUser.email,
      displayName: systemUser.displayName,
      phone: systemUser.phone,
      avatarUrl: systemUser.avatarUrl,
      preferredLanguage: systemUser.preferredLanguage,
      isActive: systemUser.isActive,
      isTotpEnabled: systemUser.isTotpEnabled,
      forceReset: systemUser.forceReset,
      lastLoginAt: systemUser.lastLoginAt?.toISOString() || null,
      createdAt: systemUser.createdAt.toISOString(),
      updatedAt: systemUser.updatedAt.toISOString(),
    });
  }

  /**
   * PATCH /api/v1/system-users/:systemUserId
   * Update system user
   */
  @Patch(':systemUserId')
  @ApiOperation({ summary: 'Update system user' })
  @ApiParam({
    name: 'systemUserId',
    description: 'System user identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated system user',
    schema: SYSTEM_USER_UPDATE_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to update system users',
    schema: SYSTEM_USER_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'System user was not found',
    schema: SYSTEM_USER_NOT_FOUND_SCHEMA,
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('systemUserId', ParseUUIDPipe) systemUserId: string,
    @Body() dto: UpdateUserDto,
  ) {
    const updated = await this.systemUserService.update(systemUserId, user.tenantSchema, dto);

    return success({
      id: updated.id,
      displayName: updated.displayName,
      phone: updated.phone,
      preferredLanguage: updated.preferredLanguage,
      avatarUrl: updated.avatarUrl,
      updatedAt: updated.updatedAt.toISOString(),
    });
  }

  /**
   * POST /api/v1/system-users/:systemUserId/reset-password
   * Reset user password
   */
  @Post(':systemUserId/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset user password' })
  @ApiParam({
    name: 'systemUserId',
    description: 'System user identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Resets the system user password',
    schema: SYSTEM_USER_MESSAGE_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to reset system user passwords',
    schema: SYSTEM_USER_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'System user was not found',
    schema: SYSTEM_USER_NOT_FOUND_SCHEMA,
  })
  async resetPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Param('systemUserId', ParseUUIDPipe) systemUserId: string,
    @Body() dto: ResetPasswordDto,
  ) {
    const result = await this.systemUserService.resetPassword(systemUserId, user.tenantSchema, {
      newPassword: dto.newPassword,
      forceReset: dto.forceReset,
    });

    return success({
      message: 'Password reset successfully',
      tempPassword: result.tempPassword,
      forceReset: dto.forceReset ?? true,
    });
  }

  /**
   * POST /api/v1/system-users/:systemUserId/deactivate
   * Deactivate user
   */
  @Post(':systemUserId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate user' })
  @ApiParam({
    name: 'systemUserId',
    description: 'System user identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Deactivates the system user',
    schema: SYSTEM_USER_ACTIVATION_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to deactivate system users',
    schema: SYSTEM_USER_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'System user was not found',
    schema: SYSTEM_USER_NOT_FOUND_SCHEMA,
  })
  async deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('systemUserId', ParseUUIDPipe) systemUserId: string,
  ) {
    const updated = await this.systemUserService.deactivate(systemUserId, user.tenantSchema);

    return success({
      id: updated.id,
      isActive: false,
    });
  }

  /**
   * POST /api/v1/system-users/:systemUserId/reactivate
   * Reactivate user
   */
  @Post(':systemUserId/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate user' })
  @ApiParam({
    name: 'systemUserId',
    description: 'System user identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Reactivates the system user',
    schema: {
      ...SYSTEM_USER_ACTIVATION_SUCCESS_SCHEMA,
      example: {
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to reactivate system users',
    schema: SYSTEM_USER_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'System user was not found',
    schema: SYSTEM_USER_NOT_FOUND_SCHEMA,
  })
  async reactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('systemUserId', ParseUUIDPipe) systemUserId: string,
  ) {
    const updated = await this.systemUserService.reactivate(systemUserId, user.tenantSchema);

    return success({
      id: updated.id,
      isActive: true,
    });
  }

  /**
   * POST /api/v1/system-users/:systemUserId/force-totp
   * Force user to enable TOTP
   */
  @Post(':systemUserId/force-totp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force user to enable TOTP' })
  @ApiParam({
    name: 'systemUserId',
    description: 'System user identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Marks the system user as requiring TOTP enrollment',
    schema: createSuccessEnvelopeSchema(
      {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'User will be required to enable TOTP on next login' },
        },
        required: ['message'],
      },
      { message: 'User will be required to enable TOTP on next login' },
    ),
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to force TOTP for system users',
    schema: SYSTEM_USER_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'System user was not found',
    schema: SYSTEM_USER_NOT_FOUND_SCHEMA,
  })
  async forceTotp(
    @CurrentUser() user: AuthenticatedUser,
    @Param('systemUserId', ParseUUIDPipe) systemUserId: string,
  ) {
    await this.systemUserService.forceTotp(systemUserId, user.tenantSchema);

    return success({
      message: 'User will be required to enable TOTP on next login',
    });
  }

  /**
   * GET /api/v1/system-users/:systemUserId/scope-access
   * Get user's scope access settings
   */
  @Get(':systemUserId/scope-access')
  @ApiOperation({ summary: 'Get user scope access settings' })
  @ApiParam({
    name: 'systemUserId',
    description: 'System user identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns user scope access entries',
    schema: SYSTEM_USER_SCOPE_ACCESS_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to read user scope access',
    schema: SYSTEM_USER_UNAUTHORIZED_SCHEMA,
  })
  async getScopeAccess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('systemUserId', ParseUUIDPipe) systemUserId: string,
  ) {
    const accesses = await this.systemUserService.getScopeAccess(systemUserId, user.tenantSchema);
    return success(accesses);
  }

  /**
   * POST /api/v1/system-users/:systemUserId/scope-access
   * Set user's scope access settings (replaces all existing)
   */
  @Post(':systemUserId/scope-access')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set user scope access settings' })
  @ApiParam({
    name: 'systemUserId',
    description: 'System user identifier',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 200,
    description: 'Replaces user scope access entries',
    schema: SYSTEM_USER_SCOPE_ACCESS_UPDATE_SUCCESS_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to update user scope access',
    schema: SYSTEM_USER_UNAUTHORIZED_SCHEMA,
  })
  async setScopeAccess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('systemUserId', ParseUUIDPipe) systemUserId: string,
    @Body() body: SetScopeAccessDto,
  ) {
    await this.systemUserService.setScopeAccess(systemUserId, user.tenantSchema, body.accesses, user.id);
    return success({ message: 'Scope access updated' });
  }
}
