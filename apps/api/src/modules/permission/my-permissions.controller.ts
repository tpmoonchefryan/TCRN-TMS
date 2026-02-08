// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { prisma } from '@tcrn/database';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Request } from 'express';

import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { success } from '../../common/response.util';
import { PermissionSnapshotService, ScopeType } from './permission-snapshot.service';

// DTO for query parameters
class GetMyPermissionsQueryDto {
  @IsOptional()
  @IsEnum(['tenant', 'subsidiary', 'talent'])
  scopeType?: ScopeType;

  @IsOptional()
  @IsString()
  scopeId?: string;
}

interface UserRoleInfo {
  code: string;
  name: string;
  source: 'direct' | 'inherited';
  scopeType: ScopeType;
  scopeId: string | null;
}

/**
 * My Permissions Controller
 * Handles GET /api/v1/users/me/permissions
 * PRD §12.6 - Get current user's effective permissions
 */
@ApiTags('System - Permissions')
@Controller('users/me/permissions')
@ApiBearerAuth()
export class MyPermissionsController {
  constructor(private readonly snapshotService: PermissionSnapshotService) {}

  /**
   * GET /api/v1/users/me/permissions
   * Get current user's effective permissions at a specific scope
   */
  @Get()
  @ApiOperation({ summary: 'Get current user permissions' })
  async getMyPermissions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetMyPermissionsQueryDto,
    @Req() req: Request,
  ) {
    const language = (req.headers['accept-language'] as string)?.split(',')[0]?.substring(0, 2) || 'en';
    const nameField = language === 'zh' ? 'name_zh' : language === 'ja' ? 'name_ja' : 'name_en';

    const scopeType = query.scopeType || 'tenant';
    const scopeId = query.scopeId || null;

    // Get effective permissions from snapshot
    const permissions = await this.snapshotService.getUserPermissions(
      user.tenantSchema,
      user.id,
      scopeType,
      scopeId,
    );

    // Get scope info if specific scope requested
    const scopeInfo: { type: ScopeType; id: string | null; name: string | null } = {
      type: scopeType,
      id: scopeId,
      name: null,
    };

    if (scopeType === 'subsidiary' && scopeId) {
      const subsidiaries = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`
        SELECT COALESCE(${nameField}, name_en) as name 
        FROM "${user.tenantSchema}".subsidiary 
        WHERE id = $1::uuid
      `, scopeId);
      if (subsidiaries.length > 0) {
        scopeInfo.name = subsidiaries[0].name;
      }
    } else if (scopeType === 'talent' && scopeId) {
      const talents = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`
        SELECT display_name as name 
        FROM "${user.tenantSchema}".talent 
        WHERE id = $1::uuid
      `, scopeId);
      if (talents.length > 0) {
        scopeInfo.name = talents[0].name;
      }
    }

    // Get user's role assignments that affect this scope
    const roles = await this.getUserRolesForScope(
      user.tenantSchema,
      user.id,
      scopeType,
      scopeId,
      nameField,
    );

    return success({
      userId: user.id,
      scope: scopeInfo,
      permissions,
      roles,
    });
  }

  /**
   * Get user roles that are effective for a given scope
   */
  private async getUserRolesForScope(
    tenantSchema: string,
    userId: string,
    targetScopeType: ScopeType,
    targetScopeId: string | null,
    nameField: string,
  ): Promise<UserRoleInfo[]> {
    // Get all user role assignments
    const assignments = await prisma.$queryRawUnsafe<Array<{
      roleCode: string;
      roleName: string;
      scopeType: ScopeType;
      scopeId: string | null;
      inherit: boolean;
      scopePath: string | null;
    }>>(`
      SELECT 
        r.code as "roleCode",
        COALESCE(r.${nameField}, r.name_en) as "roleName",
        ur.scope_type as "scopeType",
        ur.scope_id as "scopeId",
        ur.inherit,
        CASE 
          WHEN ur.scope_type = 'subsidiary' THEN (
            SELECT s.path FROM "${tenantSchema}".subsidiary s WHERE s.id = ur.scope_id
          )
          WHEN ur.scope_type = 'talent' THEN (
            SELECT t.path FROM "${tenantSchema}".talent t WHERE t.id = ur.scope_id
          )
          ELSE NULL
        END as "scopePath"
      FROM "${tenantSchema}".user_role ur
      JOIN "${tenantSchema}".role r ON ur.role_id = r.id
      WHERE ur.user_id = $1::uuid
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        AND r.is_active = true
    `, userId);

    // Get target scope path for inheritance check
    let targetPath: string | null = null;
    if (targetScopeType === 'subsidiary' && targetScopeId) {
      const subsidiaries = await prisma.$queryRawUnsafe<Array<{ path: string }>>(`
        SELECT path FROM "${tenantSchema}".subsidiary WHERE id = $1::uuid
      `, targetScopeId);
      if (subsidiaries.length > 0) {
        targetPath = subsidiaries[0].path;
      }
    } else if (targetScopeType === 'talent' && targetScopeId) {
      const talents = await prisma.$queryRawUnsafe<Array<{ path: string }>>(`
        SELECT path FROM "${tenantSchema}".talent WHERE id = $1::uuid
      `, targetScopeId);
      if (talents.length > 0) {
        targetPath = talents[0].path;
      }
    }

    // Filter roles that are effective for the target scope
    const effectiveRoles: UserRoleInfo[] = [];

    for (const assignment of assignments) {
      let isEffective = false;
      let source: 'direct' | 'inherited' = 'direct';

      // Direct match
      if (assignment.scopeType === targetScopeType && assignment.scopeId === targetScopeId) {
        isEffective = true;
        source = 'direct';
      }
      // Tenant level with inherit=true applies to all
      else if (assignment.scopeType === 'tenant' && assignment.inherit) {
        isEffective = true;
        source = 'inherited';
      }
      // Parent scope with inherit=true
      else if (assignment.inherit && targetPath && assignment.scopePath) {
        // Check if target path starts with assignment's scope path
        if (targetPath.startsWith(assignment.scopePath)) {
          isEffective = true;
          source = 'inherited';
        }
      }

      if (isEffective) {
        effectiveRoles.push({
          code: assignment.roleCode,
          name: assignment.roleName,
          source,
          scopeType: assignment.scopeType,
          scopeId: assignment.scopeId,
        });
      }
    }

    return effectiveRoles;
  }
}
