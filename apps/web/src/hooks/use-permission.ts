// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ActionType } from '@tcrn/shared';
import { useCallback, useMemo } from 'react';

import { useAuthStore } from '@/stores/auth-store';

// Permission matrix defining what each role can do
const ROLE_PERMISSIONS: Record<string, Record<string, ActionType[]>> = {
  PLATFORM_ADMIN: {
    '*': [ActionType.READ, ActionType.WRITE, ActionType.DELETE, ActionType.ADMIN],
  },
  TENANT_ADMIN: {
    'tenant.*': [ActionType.READ, ActionType.WRITE, ActionType.ADMIN],
    'subsidiary': [ActionType.READ, ActionType.WRITE, ActionType.DELETE, ActionType.ADMIN],
    'talent': [ActionType.READ, ActionType.WRITE, ActionType.DELETE, ActionType.ADMIN],
    'system_user': [ActionType.READ, ActionType.WRITE, ActionType.DELETE, ActionType.ADMIN],
    'role': [ActionType.READ, ActionType.WRITE, ActionType.DELETE, ActionType.ADMIN],
    'integration.adapter': [ActionType.READ, ActionType.WRITE, ActionType.DELETE, ActionType.ADMIN],
    'integration.webhook': [ActionType.READ, ActionType.WRITE, ActionType.DELETE, ActionType.ADMIN],
    'config_entity': [ActionType.READ, ActionType.WRITE, ActionType.DELETE, ActionType.ADMIN],
    'dictionary': [ActionType.READ, ActionType.WRITE, ActionType.ADMIN],
    'customer.*': [ActionType.READ, ActionType.WRITE, ActionType.DELETE],
    'report.*': [ActionType.READ, ActionType.WRITE],
    'security.*': [ActionType.READ, ActionType.WRITE],
    'marshmallow.*': [ActionType.READ, ActionType.WRITE, ActionType.DELETE],
    'homepage.*': [ActionType.READ, ActionType.WRITE],
  },
  SUBSIDIARY_ADMIN: {
    'subsidiary': [ActionType.READ, ActionType.WRITE],
    'talent': [ActionType.READ, ActionType.WRITE, ActionType.DELETE],
    'system_user': [ActionType.READ, ActionType.WRITE],
    'role': [ActionType.READ],
    'config_entity': [ActionType.READ, ActionType.WRITE],
    'customer.*': [ActionType.READ, ActionType.WRITE, ActionType.DELETE],
    'report.*': [ActionType.READ, ActionType.WRITE],
    'marshmallow.*': [ActionType.READ, ActionType.WRITE, ActionType.DELETE],
    'homepage.*': [ActionType.READ, ActionType.WRITE],
  },
  TALENT_MANAGER: {
    'talent': [ActionType.READ],
    'customer.profile': [ActionType.READ, ActionType.WRITE],
    'customer.pii': [ActionType.READ],
    'report.mfr': [ActionType.READ, ActionType.WRITE],
    'marshmallow.*': [ActionType.READ, ActionType.WRITE, ActionType.DELETE],
    'homepage.*': [ActionType.READ, ActionType.WRITE],
  },
  TALENT_STAFF: {
    'customer.profile': [ActionType.READ],
    'marshmallow.message': [ActionType.READ, ActionType.WRITE],
  },
  VIEWER: {
    'customer.profile': [ActionType.READ],
    'report.*': [ActionType.READ],
  },
};

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
    resource: string, 
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

    // 3. Fallback: Check role-based permissions (hardcoded matrix)
    for (const roleCode of userRoles) {
      const rolePerms = ROLE_PERMISSIONS[roleCode];
      if (!rolePerms) continue;

      // Check for wildcard role permission
      if (rolePerms['*']) {
        const actions = Array.isArray(action) ? action : [action];
        if (actions.some(a => rolePerms['*'].includes(a))) {
          return true;
        }
      }

      // Check exact resource match
      if (rolePerms[resource]) {
        const actions = Array.isArray(action) ? action : [action];
        if (actions.some(a => rolePerms[resource].includes(a))) {
          return true;
        }
      }

      // Check wildcard resource match (e.g., customer.* matches customer.profile)
      const resourceParts = resource.split('.');
      for (let i = resourceParts.length - 1; i >= 0; i--) {
        const wildcardResource = [...resourceParts.slice(0, i), '*'].join('.');
        if (rolePerms[wildcardResource]) {
          const actions = Array.isArray(action) ? action : [action];
          if (actions.some(a => rolePerms[wildcardResource].includes(a))) {
            return true;
          }
        }
      }
    }

    return false;
  }, [user, isAuthenticated, userRoles, hasWildcardPermission, effectivePermissions]);

  /**
   * Check if user has permission for any of the given resources
   */
  const hasAnyPermission = useCallback((
    resources: string[],
    action: ActionType | ActionType[]
  ): boolean => {
    return resources.some(resource => hasPermission(resource, action));
  }, [hasPermission]);

  /**
   * Check if user has permission for all of the given resources
   */
  const hasAllPermissions = useCallback((
    resources: string[],
    action: ActionType | ActionType[]
  ): boolean => {
    return resources.every(resource => hasPermission(resource, action));
  }, [hasPermission]);

  /**
   * Get list of all permitted actions for a resource
   */
  const getPermittedActions = useCallback((resource: string): ActionType[] => {
    if (!isAuthenticated || !user) return [];
    if (hasWildcardPermission) return Object.values(ActionType);

    const permitted = new Set<ActionType>();

    for (const roleCode of userRoles) {
      const rolePerms = ROLE_PERMISSIONS[roleCode];
      if (!rolePerms) continue;

      // Wildcard
      if (rolePerms['*']) {
        rolePerms['*'].forEach(a => permitted.add(a));
      }

      // Exact match
      if (rolePerms[resource]) {
        rolePerms[resource].forEach(a => permitted.add(a));
      }

      // Wildcard match
      const resourceParts = resource.split('.');
      for (let i = resourceParts.length - 1; i >= 0; i--) {
        const wildcardResource = [...resourceParts.slice(0, i), '*'].join('.');
        if (rolePerms[wildcardResource]) {
          rolePerms[wildcardResource].forEach(a => permitted.add(a));
        }
      }
    }

    return Array.from(permitted);
  }, [user, isAuthenticated, userRoles, hasWildcardPermission]);

  return { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions,
    getPermittedActions,
    userRoles,
  };
}
