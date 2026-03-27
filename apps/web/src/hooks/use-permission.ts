// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ActionType, type RbacResourceCode } from '@tcrn/shared';
import { useCallback, useMemo } from 'react';

import { useAuthStore } from '@/stores/auth-store';

/**
 * Hook to check user permissions
 * 
 * Usage:
 * const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();
 * if (hasPermission('customer.profile', ActionType.READ)) { ... }
 * if (hasAnyPermission(['customer.profile', 'report.mfr'], ActionType.READ)) { ... }
 */
export function usePermission() {
  const { user, isAuthenticated, effectivePermissions } = useAuthStore();

  // Get user's role codes
  const userRoles = useMemo(() => {
    if (!user?.roles) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return user.roles.map((r: any) => r.code || r);
  }, [user]);

  // Check if user has wildcard permissions
  const hasWildcardPermission = useMemo(() => {
    if (!user?.permissions) return false;
    return user.permissions.includes('*');
  }, [user]);

  /**
   * Check if user has permission for a resource and action
   */
  const hasPermission = useCallback((
    resource: RbacResourceCode,
    action: ActionType | ActionType[],
    _scopeId?: string
  ): boolean => {
    if (!isAuthenticated || !user) return false;

    // Wildcard permission (admin)
    if (hasWildcardPermission) return true;

    // 1. Check effectivePermissions from backend API (highest priority)
    if (effectivePermissions) {
      const actions = Array.isArray(action) ? action : [action];
      for (const a of actions) {
        const permKey = `${resource}:${a}`;
        
        // Check explicit deny first
        if (effectivePermissions[permKey] === 'deny') {
          return false;
        }
        
        // Check explicit grant
        if (effectivePermissions[permKey] === 'grant') {
          return true;
        }

        // Align with backend PermissionSnapshotService semantics
        if (effectivePermissions[`${resource}:admin`] === 'deny') {
          return false;
        }
        if (effectivePermissions[`${resource}:admin`] === 'grant') {
          return true;
        }

        if (effectivePermissions['*:admin'] === 'deny') {
          return false;
        }
        if (effectivePermissions['*:admin'] === 'grant') {
          return true;
        }

        if (effectivePermissions['*:*'] === 'deny') {
          return false;
        }
        if (effectivePermissions['*:*'] === 'grant') {
          return true;
        }
        
        // Check wildcard grant (e.g., "customer:*" or "*:read")
        if (effectivePermissions[`${resource}:*`] === 'grant') {
          return true;
        }
        if (effectivePermissions[`*:${a}`] === 'grant') {
          return true;
        }
      }
    }

    // 2. Check direct permissions from user object (legacy format)
    if (user.permissions && Array.isArray(user.permissions)) {
      const actions = Array.isArray(action) ? action : [action];
      for (const a of actions) {
        const permKey = `${resource}:${a}`;
        if (user.permissions.includes(permKey) || user.permissions.includes(`${resource}:*`)) {
          return true;
        }
      }
    }

    return false;
  }, [user, isAuthenticated, hasWildcardPermission, effectivePermissions]);

  /**
   * Check if user has permission for any of the given resources
   */
  const hasAnyPermission = useCallback((
    resources: RbacResourceCode[],
    action: ActionType | ActionType[]
  ): boolean => {
    return resources.some(resource => hasPermission(resource, action));
  }, [hasPermission]);

  /**
   * Check if user has permission for all of the given resources
   */
  const hasAllPermissions = useCallback((
    resources: RbacResourceCode[],
    action: ActionType | ActionType[]
  ): boolean => {
    return resources.every(resource => hasPermission(resource, action));
  }, [hasPermission]);

  /**
   * Get list of all permitted actions for a resource
   */
  const getPermittedActions = useCallback((resource: RbacResourceCode): ActionType[] => {
    return Object.values(ActionType).filter((action) => hasPermission(resource, action));
  }, [hasPermission]);

  return { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions,
    getPermittedActions,
    userRoles,
  };
}
