// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCodes } from '@tcrn/shared';
import { Request } from 'express';


import { PermissionSnapshotService, ScopeType } from '../../modules/permission/permission-snapshot.service';
import { RequiredPermission, PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

/**
 * Permission Guard
 * Checks if user has required permissions for the endpoint
 * PRD §12.6
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionSnapshotService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<RequiredPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as unknown as { user?: { id?: string; tenantSchema?: string } }).user;

    // If no user, deny access
    if (!user?.id || !user?.tenantSchema) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Authentication required',
      });
    }

    // Extract scope from request (params or query)
    const scopeType = (request.params.scopeType || request.query.scopeType) as ScopeType | undefined;
    const scopeId = (request.params.scopeId || request.query.scopeId) as string | undefined;

    // Check each required permission
    for (const perm of requiredPermissions) {
      const hasPermission = await this.permissionService.checkPermission(
        user.tenantSchema,
        user.id,
        perm.resource,
        perm.action,
        scopeType,
        scopeId,
      );

      if (!hasPermission) {
        throw new ForbiddenException({
          code: ErrorCodes.PERM_ACCESS_DENIED,
          message: `Permission denied: ${perm.resource}:${perm.action}`,
        });
      }
    }

    return true;
  }
}
