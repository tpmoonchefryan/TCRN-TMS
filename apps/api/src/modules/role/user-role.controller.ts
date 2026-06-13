// SPDX-License-Identifier: Apache-2.0
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { Request } from 'express';

import { AuthenticatedUser, CurrentUser, RequirePermissions } from '../../common/decorators';
import { getPrimaryAcceptLanguage } from '../../common/request-locale.util';
import { success } from '../../common/response.util';
import { ScopeType } from '../permission/permission-snapshot.service';
import { UserRoleService } from './user-role.service';

// DTOs
class AssignRoleDto {
  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  roleCode?: string;

  @IsEnum(['tenant', 'subsidiary', 'talent'])
  scopeType: ScopeType;

  @IsOptional()
  @IsString()
  scopeId?: string;

  @IsBoolean()
  inherit: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

class UpdateAssignmentDto {
  @IsOptional()
  @IsBoolean()
  inherit?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}

/**
 * User Role Controller
 * Manages user-role assignments
 */
@ApiTags('System - Roles')
@Controller('users/:userId/roles')
@ApiBearerAuth()
export class UserRoleController {
  constructor(private readonly userRoleService: UserRoleService) {}

  /**
   * GET /api/v1/users/:userId/roles
   * Get user's role assignments
   */
  @Get()
  @RequirePermissions({ resource: 'system_user', action: 'read' })
  @ApiOperation({ summary: 'Get user roles' })
  async getUserRoles(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Req() req: Request
  ) {
    const language = getPrimaryAcceptLanguage(req);

    const assignments = await this.userRoleService.getUserRoles(
      userId,
      user.tenantSchema,
      language
    );

    const data = assignments.map((a) => ({
      id: a.id,
      role: {
        id: a.roleId,
        code: a.roleCode,
        name: a.roleName,
      },
      scopeType: a.scopeType,
      scopeId: a.scopeId,
      scopeName: a.scopeName,
      scopePath: a.scopePath,
      inherit: a.inherit,
      grantedAt: a.grantedAt.toISOString(),
      grantedBy: a.grantedById
        ? {
            id: a.grantedById,
            username: a.grantedByUsername,
          }
        : null,
      expiresAt: a.expiresAt?.toISOString() || null,
    }));

    return success(data);
  }

  /**
   * POST /api/v1/users/:userId/roles
   * Assign role to user
   */
  @Post()
  @RequirePermissions({ resource: 'system_user', action: 'create' })
  @ApiOperation({ summary: 'Assign role to user' })
  async assignRole(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: AssignRoleDto
  ) {
    const assignment = await this.userRoleService.assignRole(
      userId,
      currentUser.tenantSchema,
      {
        roleId: dto.roleId,
        roleCode: dto.roleCode,
        scopeType: dto.scopeType,
        scopeId: dto.scopeId,
        inherit: dto.inherit,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      currentUser.id
    );

    return success({
      id: assignment.id,
      userId: assignment.userId,
      roleId: assignment.roleId,
      scopeType: assignment.scopeType,
      scopeId: assignment.scopeId,
      inherit: assignment.inherit,
      grantedAt: assignment.grantedAt.toISOString(),
      snapshotUpdateQueued: true,
    });
  }

  /**
   * PATCH /api/v1/users/:userId/roles/:assignmentId
   * Update role assignment
   */
  @Patch(':assignmentId')
  @RequirePermissions({ resource: 'system_user', action: 'update' })
  @ApiOperation({ summary: 'Update role assignment' })
  async updateAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssignmentDto
  ) {
    const assignment = await this.userRoleService.updateAssignment(
      assignmentId,
      user.tenantSchema,
      {
        inherit: dto.inherit,
        expiresAt:
          dto.expiresAt === null ? null : dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      user.id
    );

    return success({
      id: assignment.id,
      inherit: assignment.inherit,
      expiresAt: assignment.expiresAt?.toISOString() || null,
      snapshotUpdateQueued: true,
    });
  }

  /**
   * DELETE /api/v1/users/:userId/roles/:assignmentId
   * Remove role assignment
   */
  @Delete(':assignmentId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ resource: 'system_user', action: 'delete' })
  @ApiOperation({ summary: 'Remove role assignment' })
  async removeAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string
  ) {
    await this.userRoleService.removeAssignment(assignmentId, user.tenantSchema, user.id);

    return success({
      message: 'Role assignment removed',
      snapshotUpdateQueued: true,
    });
  }
}
