// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { SetMetadata } from '@nestjs/common';

export interface RequiredPermission {
  resource: string;
  action: 'read' | 'write' | 'delete' | 'execute' | 'admin' | 'create' | 'update' | 'export';
}

export const PERMISSIONS_KEY = 'permissions';

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
export const RequirePermissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
