// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ActionType } from '@tcrn/shared';
import React from 'react';

import { usePermission } from '@/hooks/use-permission';

interface PermissionGuardProps {
  resource: string;
  action: ActionType | ActionType[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  scopeId?: string;
}

/**
 * PermissionGuard Component
 * 
 * Conditionally renders children based on user permissions.
 * Uses the usePermission hook to check against role-based permissions.
 * 
 * Usage:
 * <PermissionGuard resource="customer.profile" action={ActionType.WRITE}>
 *   <Button>Edit Customer</Button>
 * </PermissionGuard>
 * 
 * With fallback:
 * <PermissionGuard resource="customer.pii" action={ActionType.READ} fallback={<p>Access denied</p>}>
 *   <PiiViewer />
 * </PermissionGuard>
 */
export function PermissionGuard({ 
  resource, 
  action, 
  children, 
  fallback = null,
  scopeId 
}: PermissionGuardProps) {
  const { hasPermission } = usePermission();
  
  const hasAccess = hasPermission(resource, action, scopeId);

  if (hasAccess) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

/**
 * Hook-like component that allows for more complex permission-based rendering
 */
interface PermissionRenderProps {
  resource: string;
  action: ActionType | ActionType[];
  scopeId?: string;
  children: (hasPermission: boolean) => React.ReactNode;
}

export function PermissionRender({
  resource,
  action,
  scopeId,
  children,
}: PermissionRenderProps) {
  const { hasPermission } = usePermission();
  const permitted = hasPermission(resource, action, scopeId);
  return <>{children(permitted)}</>;
}
