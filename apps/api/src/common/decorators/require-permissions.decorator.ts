// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { SetMetadata } from '@nestjs/common';
import {
  type PermissionActionInput,
  type RbacResourceCode,
  resolveRbacPermission,
} from '@tcrn/shared';
import type { Request } from 'express';

export interface RequiredPermission {
  resource: RbacResourceCode;
  action: PermissionActionInput;
}

export const PERMISSIONS_KEY = 'permissions';
export const RESOLVED_PERMISSIONS_KEY = 'resolved_permissions';

export type PermissionResolver = (request: Request) => RequiredPermission[];

/**
 * Decorator to require specific permissions for an endpoint
 * PRD §12.6
 * 
 * @example
 * @RequirePermissions({ resource: 'customer.profile', action: 'read' })
 * async listCustomers() { ... }
 * 
 * @example
 * @RequirePermissions(
 *   { resource: 'customer.profile', action: 'read' },
 *   { resource: 'customer.profile', action: 'write' }
 * )
 * async updateCustomer() { ... }
 */
export const RequirePermissions = (...permissions: RequiredPermission[]) => {
  for (const permission of permissions) {
    resolveRbacPermission(permission.resource, permission.action);
  }

  return SetMetadata(PERMISSIONS_KEY, permissions);
};

export const RequireResolvedPermissions = (resolver: PermissionResolver) =>
  SetMetadata(RESOLVED_PERMISSIONS_KEY, resolver);
