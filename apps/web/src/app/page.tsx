// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuthStore } from '@/stores/auth-store';
import { useTalentStore } from '@/stores/talent-store';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isAcTenant, tenantId, _hasHydrated } = useAuthStore();
  const { accessibleTalents, isLoading: talentLoading, _hasHydrated: talentHydrated, currentTenantId } = useTalentStore();
  const [redirected, setRedirected] = useState(false);

  // Use tenantId from auth store or talent store
  const effectiveTenantId = tenantId || currentTenantId;

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
    
    // Still loading talents - wait (with timeout protection)
    if (talentLoading) return;
    
    // Prevent double redirect
    if (redirected) return;
    
    // AC tenant users go to admin console
    if (isAcTenant) {
      router.replace('/admin');
      setRedirected(true);
      return;
    }
    
    // Non-AC tenant users
    if (accessibleTalents.length > 0) {
      // Has talents - go to business interface (customers page)
      router.replace('/customers');
      setRedirected(true);
    } else if (effectiveTenantId) {
      // No talents - redirect to organization structure
      router.replace(`/tenant/${effectiveTenantId}/organization-structure`);
      setRedirected(true);
    } else {
      // Fallback: go to customers if nothing else works
      router.replace('/customers');
      setRedirected(true);
    }
  }, [_hasHydrated, talentHydrated, talentLoading, isAuthenticated, isAcTenant, effectiveTenantId, accessibleTalents, router, redirected]);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!redirected && isAuthenticated) {
        console.warn('Home page redirect timeout - forcing redirect to /customers');
        router.replace('/customers');
        setRedirected(true);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, [redirected, isAuthenticated, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}
