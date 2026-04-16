// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import {
  buildOrganizationStructureUrl,
  buildTalentDetailsUrl,
  buildTalentSettingsUrl,
  classifyTalentWorkspaceRoute,
} from '@/lib/talent-lifecycle-routing';
import { useAuthStore } from '@/stores/auth-store';
import { UIMode, useTalentStore } from '@/stores/talent-store';

/**
 * Hook for managing UI mode switching between business and management interfaces.
 */
export function useUIMode() {
  const router = useRouter();
  const pathname = usePathname();
  const { uiMode, setUIMode, currentTenantId, hasTalentAccess } = useTalentStore();
  const { tenantCode } = useAuthStore();
  const routeType = useMemo(() => classifyTalentWorkspaceRoute(pathname), [pathname]);

  // Check if current route is in management mode
  const isManagementRoute = useMemo(() => {
    return pathname?.startsWith('/tenant/') || pathname?.startsWith('/admin/');
  }, [pathname]);

  // Check if current route is in business mode
  const isBusinessRoute = useMemo(() => {
    return routeType !== 'other';
  }, [routeType]);

  // Determine effective UI mode based on route
  const effectiveMode: UIMode = useMemo(() => {
    if (isManagementRoute) return 'management';
    if (isBusinessRoute) return 'business';
    return uiMode;
  }, [isManagementRoute, isBusinessRoute, uiMode]);

  // Switch to business UI
  const switchToBusinessUI = useCallback(() => {
    if (!hasTalentAccess()) {
      return false;
    }

    setUIMode('business');
    router.push('/customers');
    return true;
  }, [router, setUIMode, hasTalentAccess]);

  // Switch to management UI
  const switchToManagementUI = useCallback(() => {
    setUIMode('management');

    if (currentTenantId) {
      router.push(buildOrganizationStructureUrl(currentTenantId));
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
          if (scopeId) {
            router.push(
              buildTalentSettingsUrl({
                tenantId: currentTenantId,
                talentId: scopeId,
                subsidiaryId,
              })
            );
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
          router.push(
            buildTalentDetailsUrl({
              tenantId: currentTenantId,
              talentId: scopeId,
              subsidiaryId,
            })
          );
          break;
      }
    },
    [router, currentTenantId]
  );

  // Get home URL based on mode and talent availability
  const getHomeUrl = useCallback(() => {
    if (!hasTalentAccess()) {
      return currentTenantId ? buildOrganizationStructureUrl(currentTenantId) : '/profile';
    }

    return '/customers';
  }, [currentTenantId, hasTalentAccess]);

  // Check if user can access business UI
  const canAccessBusinessUI = useMemo(() => {
    return hasTalentAccess();
  }, [hasTalentAccess]);

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
  const { hasTalentAccess } = useTalentStore();

  // Determine sidebar type to render
  const sidebarType = useMemo(() => {
    // AC tenant users always see admin sidebar (PRD §7)
    // tenantCode and isAcTenant come from auth store
    const { tenantCode, isAcTenant } = useAuthStore.getState();
    if (isAcTenant || tenantCode === 'AC') {
      return 'admin';
    }

    // Business and utility routes under the workspace layout keep the business sidebar even if
    // there is no current published talent selected yet.
    if (isBusinessRoute) {
      return 'business';
    }

    // Management routes show management sidebar
    if (isManagementRoute) {
      return 'management';
    }

    // Default based on talent availability
    if (hasTalentAccess()) {
      return 'business';
    }

    return 'management';
  }, [isBusinessRoute, isManagementRoute, hasTalentAccess]);

  return {
    sidebarType,
    effectiveMode,
    canAccessBusinessUI,
  };
}
