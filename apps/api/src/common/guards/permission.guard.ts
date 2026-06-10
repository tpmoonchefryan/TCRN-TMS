// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { ErrorCodes, resolveRbacPermission } from '@tcrn/shared';

import {
  PermissionSnapshotService,
  ScopeType,
} from '../../modules/permission/permission-snapshot.service';
import {
  type PermissionResolver,
  PERMISSIONS_KEY,
  type RequiredPermission,
  RESOLVED_PERMISSIONS_KEY,
} from '../decorators/require-permissions.decorator';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Permission Guard
 * Checks if user has required permissions for the endpoint
 * PRD §12.6
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionSnapshotService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get statically declared permissions from decorator
    const declaredPermissions = this.reflector.getAllAndOverride<RequiredPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    const request = context.switchToHttp().getRequest<Request>();
    const permissionResolver = this.reflector.getAllAndOverride<PermissionResolver>(
      RESOLVED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );
    const resolvedPermissions = permissionResolver ? permissionResolver(request) : [];
    const requiredPermissions = [...(declaredPermissions ?? []), ...resolvedPermissions];

    // If no permissions required, allow access
    if (requiredPermissions.length === 0) {
      return true;
    }

    const user = (request as unknown as { user?: { id?: string; tenantSchema?: string } }).user;

    // If no user, deny access
    if (!user?.id || !user?.tenantSchema) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'Authentication required',
      });
    }

    const { scopeType, scopeId } = this.resolveRequestScope(request);

    // Check each required permission
    for (const perm of requiredPermissions) {
      const { checkedAction } = resolveRbacPermission(perm.resource, perm.action);
      const allowed = await this.permissionService.refreshAndCheckPermission(
        user.tenantSchema,
        user.id,
        perm.resource,
        checkedAction,
        scopeType,
        scopeId
      );

      if (!allowed) {
        const permissionLabel =
          perm.action === checkedAction
            ? `${perm.resource}:${perm.action}`
            : `${perm.resource}:${perm.action} (checked as ${perm.resource}:${checkedAction})`;
        const denyMessage = this.shouldHidePermissionLabel(request)
          ? 'Permission denied'
          : `Permission denied: ${permissionLabel}`;

        throw new ForbiddenException({
          code: ErrorCodes.PERM_ACCESS_DENIED,
          message: denyMessage,
        });
      }
    }

    return true;
  }

  private resolveRequestScope(request: Request): {
    scopeType?: ScopeType;
    scopeId?: string | null;
  } {
    const params = request.params as Record<string, string | undefined>;
    const query = request.query as Record<string, unknown>;

    // Canonical private owner-path params must win over legacy query carriers.
    if (params.talentId) {
      return {
        scopeType: 'talent',
        scopeId: params.talentId,
      };
    }

    const exportTalentHeader = this.resolveExportTalentHeaderScope(request);
    if (exportTalentHeader) {
      return exportTalentHeader;
    }

    if (params.subsidiaryId) {
      return {
        scopeType: 'subsidiary',
        scopeId: params.subsidiaryId,
      };
    }

    const explicitScopeType =
      this.getSingleValue(params.scopeType) ?? this.getSingleValue(query.scopeType);
    const explicitScopeId =
      this.getSingleValue(params.scopeId) ?? this.getSingleValue(query.scopeId);

    if (explicitScopeType === 'tenant') {
      return {
        scopeType: 'tenant',
        scopeId: null,
      };
    }

    if ((explicitScopeType === 'subsidiary' || explicitScopeType === 'talent') && explicitScopeId) {
      return {
        scopeType: explicitScopeType,
        scopeId: explicitScopeId,
      };
    }

    return {};
  }

  private shouldHidePermissionLabel(request: Request): boolean {
    const path = request.path ?? '';
    const originalUrl = request.originalUrl ?? '';

    return path.includes('/builder-registry') || originalUrl.includes('/builder-registry');
  }

  private resolveExportTalentHeaderScope(request: Request): {
    scopeType: ScopeType;
    scopeId: string;
  } | null {
    const path = request.path ?? request.originalUrl ?? '';
    if (!/(^|\/)exports(?:$|\?)/.test(path) && !/\/exports(?:$|\?)/.test(path)) {
      return null;
    }

    const headerTalentId = this.getSingleValue(request.headers['x-talent-id']);
    if (!headerTalentId || !UUID_PATTERN.test(headerTalentId)) {
      return null;
    }

    return {
      scopeType: 'talent',
      scopeId: headerTalentId.toLowerCase(),
    };
  }

  private getSingleValue(value: unknown): string | undefined {
    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      const firstValue = value[0];
      return typeof firstValue === 'string' ? firstValue : undefined;
    }

    return undefined;
  }
}
