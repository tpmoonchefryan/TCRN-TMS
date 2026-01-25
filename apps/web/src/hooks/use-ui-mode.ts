// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { useAuthStore } from '@/stores/auth-store';
import { UIMode, useTalentStore } from '@/stores/talent-store';

/**
 * Hook for managing UI mode switching between business and management interfaces.
 */
export function useUIMode() {
  const router = useRouter();
  const pathname = usePathname();
  const { uiMode, setUIMode, currentTalent, currentTenantId, hasTalentAccess } = useTalentStore();
  const { tenantCode } = useAuthStore();

  // Check if current route is in management mode
  const isManagementRoute = useMemo(() => {
    return pathname?.startsWith('/tenant/') || pathname?.startsWith('/admin/');
  }, [pathname]);

  // Check if current route is in business mode
  const isBusinessRoute = useMemo(() => {
    return (
      pathname?.startsWith('/customers') ||
      pathname?.startsWith('/homepage') ||
      pathname?.startsWith('/marshmallow')
    );
  }, [pathname]);

  // Determine effective UI mode based on route
  const effectiveMode: UIMode = useMemo(() => {
    if (isManagementRoute) return 'management';
    if (isBusinessRoute) return 'business';
    return uiMode;
  }, [isManagementRoute, isBusinessRoute, uiMode]);

  // Switch to business UI
  const switchToBusinessUI = useCallback(() => {
    if (!hasTalentAccess()) {
      // No talents available - show message
      return false;
    }

    setUIMode('business');

    // Navigate to default business page (customers)
    if (currentTalent) {
      router.push('/customers');
      return true;
    }

    return false;
  }, [router, setUIMode, currentTalent, hasTalentAccess]);

  // Switch to management UI
  const switchToManagementUI = useCallback(() => {
    setUIMode('management');

    // Navigate to organization structure (default management page)
    if (currentTenantId) {
      router.push(`/tenant/${currentTenantId}/organization-structure`);
      return true;
    }

    return false;
  }, [router, setUIMode, currentTenantId]);

  // Navigate to specific scope settings
  const navigateToSettings = useCallback(
    (scopeType: 'tenant' | 'subsidiary' | 'talent', scopeId?: string, subsidiaryId?: string) => {
      if (!currentTenantId) return;

      switch (scopeType) {
        case 'tenant':
          router.push(`/tenant/${currentTenantId}/settings`);
          break;
        case 'subsidiary':
          if (scopeId) {
            router.push(`/tenant/${currentTenantId}/subsidiary/${scopeId}/settings`);
          }
          break;
        case 'talent':
          if (scopeId && subsidiaryId) {
            router.push(
              `/tenant/${currentTenantId}/subsidiary/${subsidiaryId}/talent/${scopeId}/settings`
            );
          } else if (scopeId) {
            router.push(`/tenant/${currentTenantId}/talent/${scopeId}/settings`);
          }
          break;
      }
    },
    [router, currentTenantId]
  );

  // Navigate to details page
  const navigateToDetails = useCallback(
    (scopeType: 'subsidiary' | 'talent', scopeId: string, subsidiaryId?: string) => {
      if (!currentTenantId) return;

      switch (scopeType) {
        case 'subsidiary':
          router.push(`/tenant/${currentTenantId}/subsidiary/${scopeId}/details`);
          break;
        case 'talent':
          if (subsidiaryId) {
            router.push(
              `/tenant/${currentTenantId}/subsidiary/${subsidiaryId}/talent/${scopeId}/details`
            );
          } else {
            router.push(`/tenant/${currentTenantId}/talent/${scopeId}/details`);
          }
          break;
      }
    },
    [router, currentTenantId]
  );

  // Get home URL based on mode and talent availability
  const getHomeUrl = useCallback(() => {
    if (!hasTalentAccess()) {
      // No talents - management mode is default
      return currentTenantId
        ? `/tenant/${currentTenantId}/organization-structure`
        : '/';
    }

    // Has talents - business mode is home
    return '/customers';
  }, [currentTenantId, hasTalentAccess]);

  // Check if user can access business UI
  const canAccessBusinessUI = useMemo(() => {
    return hasTalentAccess() && currentTalent !== null;
  }, [hasTalentAccess, currentTalent]);

  return {
    // Current state
    uiMode,
    effectiveMode,
    isManagementRoute,
    isBusinessRoute,

    // Computed
    canAccessBusinessUI,

    // Actions
    switchToBusinessUI,
    switchToManagementUI,
    navigateToSettings,
    navigateToDetails,
    getHomeUrl,

    // Context info
    currentTenantId,
    tenantCode,
  };
}

/**
 * Hook for determining which sidebar to show.
 */
export function useSidebarMode() {
  const { effectiveMode, canAccessBusinessUI, isManagementRoute, isBusinessRoute } = useUIMode();
  const { currentTalent, hasTalentAccess } = useTalentStore();

  // Determine sidebar type to render
  const sidebarType = useMemo(() => {
    // AC tenant users always see admin sidebar (PRD §7)
    // tenantCode and isAcTenant come from auth store
    const { tenantCode, isAcTenant } = useAuthStore.getState();
    if (isAcTenant || tenantCode === 'AC') {
      return 'admin';
    }

    // Business routes show business sidebar
    if (isBusinessRoute && currentTalent) {
      return 'business';
    }

    // Management routes show management sidebar
    if (isManagementRoute) {
      return 'management';
    }

    // Default based on talent availability
    if (hasTalentAccess() && currentTalent) {
      return 'business';
    }

    return 'management';
  }, [isBusinessRoute, isManagementRoute, currentTalent, hasTalentAccess]);

  return {
    sidebarType,
    effectiveMode,
    canAccessBusinessUI,
  };
}
