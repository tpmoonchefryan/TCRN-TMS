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
    Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginated, success } from '../../common/response.util';

import { SystemUserService } from './system-user.service';

// DTOs
class ListUsersQueryDto {
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

class CreateUserDto {
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

class UpdateUserDto {
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

class ResetPasswordDto {
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
   * GET /api/v1/system-users/:id
   * Get system user details
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get system user details' })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const systemUser = await this.systemUserService.findById(id, user.tenantSchema);
    if (!systemUser) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } };
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
   * PATCH /api/v1/system-users/:id
   * Update system user
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update system user' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const updated = await this.systemUserService.update(id, user.tenantSchema, dto);

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
   * POST /api/v1/system-users/:id/reset-password
   * Reset user password
   */
  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset user password' })
  async resetPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    const result = await this.systemUserService.resetPassword(id, user.tenantSchema, {
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
   * POST /api/v1/system-users/:id/deactivate
   * Deactivate user
   */
  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate user' })
  async deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const updated = await this.systemUserService.deactivate(id, user.tenantSchema);

    return success({
      id: updated.id,
      isActive: false,
    });
  }

  /**
   * POST /api/v1/system-users/:id/reactivate
   * Reactivate user
   */
  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate user' })
  async reactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const updated = await this.systemUserService.reactivate(id, user.tenantSchema);

    return success({
      id: updated.id,
      isActive: true,
    });
  }

  /**
   * POST /api/v1/system-users/:id/force-totp
   * Force user to enable TOTP
   */
  @Post(':id/force-totp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force user to enable TOTP' })
  async forceTotp(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.systemUserService.forceTotp(id, user.tenantSchema);

    return success({
      message: 'User will be required to enable TOTP on next login',
    });
  }

  /**
   * GET /api/v1/system-users/:id/scope-access
   * Get user's scope access settings
   */
  @Get(':id/scope-access')
  @ApiOperation({ summary: 'Get user scope access settings' })
  async getScopeAccess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const accesses = await this.systemUserService.getScopeAccess(id, user.tenantSchema);
    return success(accesses);
  }

  /**
   * POST /api/v1/system-users/:id/scope-access
   * Set user's scope access settings (replaces all existing)
   */
  @Post(':id/scope-access')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set user scope access settings' })
  async setScopeAccess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { accesses: Array<{ scopeType: string; scopeId?: string; includeSubunits?: boolean }> },
  ) {
    await this.systemUserService.setScopeAccess(id, user.tenantSchema, body.accesses, user.id);
    return success({ message: 'Scope access updated' });
  }
}
