// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import {
  buildOrganizationStructureUrl,
  resolveTalentHomeRedirect,
} from '@/lib/talent-lifecycle-routing';
import { useAuthStore } from '@/platform/state/auth-store';
import { useTalentStore } from '@/platform/state/talent-store';

export function HomeRedirectScreen() {
  const router = useRouter();
  const tCommon = useTranslations('common');
  const { isAuthenticated, isAcTenant, tenantId, _hasHydrated } = useAuthStore();
  const {
    accessibleTalents,
    isLoading: talentLoading,
    _hasHydrated: talentHydrated,
    hasFetched,
    currentTenantId,
    fetchError,
  } = useTalentStore();
  const [redirected, setRedirected] = useState(false);

  // Use tenantId from auth store or talent store
  const effectiveTenantId = tenantId || currentTenantId;

  const resolveRedirectHref = useCallback(() => {
    if (isAcTenant) {
      return '/admin';
    }

    if (fetchError) {
      return effectiveTenantId ? buildOrganizationStructureUrl(effectiveTenantId) : '/profile';
    }

    return resolveTalentHomeRedirect({
      tenantId: effectiveTenantId,
      accessibleTalents,
    });
  }, [accessibleTalents, effectiveTenantId, fetchError, isAcTenant]);

  useEffect(() => {
    // Wait for auth hydration
    if (!_hasHydrated) return;

    // Not authenticated - go to login
    if (!isAuthenticated) {
      router.replace('/login');
      setRedirected(true);
      return;
    }

    // Wait for talent store hydration
    if (!talentHydrated) return;

    // Wait for the organization tree fetch before making the normal routing decision
    if (talentLoading || !hasFetched) return;

    // Prevent double redirect
    if (redirected) return;

    const href = resolveRedirectHref();
    if (href) {
      router.replace(href);
      setRedirected(true);
    }
  }, [
    _hasHydrated,
    talentHydrated,
    talentLoading,
    hasFetched,
    isAuthenticated,
    router,
    redirected,
    resolveRedirectHref,
  ]);

  // Add timeout to prevent infinite loading. The fallback must use the same lifecycle-aware
  // routing matrix instead of blindly forcing the business workspace.
  useEffect(() => {
    if (!_hasHydrated || !talentHydrated || !isAuthenticated || redirected) {
      return;
    }

    const timeout = setTimeout(() => {
      if (!redirected) {
        const href = resolveRedirectHref();
        console.warn(`Home page redirect timeout - forcing redirect to ${href}`);
        router.replace(href);
        setRedirected(true);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, [_hasHydrated, isAuthenticated, redirected, resolveRedirectHref, router, talentHydrated]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      <p className="text-muted-foreground mt-4 text-sm">{tCommon('loading')}</p>
    </div>
  );
}
