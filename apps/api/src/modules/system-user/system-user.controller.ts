// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsBoolean, IsEmail, IsInt, Min, MinLength, IsEnum } from 'class-validator';

import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { success, paginated } from '../../common/response.util';

import { SystemUserService } from './system-user.service';

// DTOs
class ListUsersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isTotpEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsString()
  sort?: string;
}

class CreateUserDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(12)
  password: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(['en', 'zh', 'ja'])
  preferredLanguage?: 'en' | 'zh' | 'ja';

  @IsOptional()
  @IsBoolean()
  forceReset?: boolean;
}

class UpdateUserDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(['en', 'zh', 'ja'])
  preferredLanguage?: 'en' | 'zh' | 'ja';

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

class ResetPasswordDto {
  @IsOptional()
  @IsString()
  newPassword?: string;

  @IsOptional()
  @IsBoolean()
  forceReset?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyUser?: boolean;
}

/**
 * System User Controller
 * Manages system users within a tenant
 */
@ApiTags('System Users')
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
