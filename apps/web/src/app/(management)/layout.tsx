// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { SessionBootstrapAlert } from '@/components/auth/session-bootstrap-alert';
import { Header } from '@/components/layout/header';
import { ManagementSidebar } from '@/components/layout/management-sidebar';
import { STAGING_BANNER_HEIGHT } from '@/components/staging-banner';
import { isStaging } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useTalentStore } from '@/stores/talent-store';

export default function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated: authHydrated, isAcTenant, checkAuth, fetchAccessibleTalents } = useAuthStore();
  const { 
    _hasHydrated: talentHydrated, 
    setUIMode, 
    organizationTree,
    hasFetched,
    isLoading: isLoadingTree,
    fetchError,
  } = useTalentStore();
  
  const [treeError, setTreeError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  
  // Use ref to track if we've already fetched to prevent infinite loops
  const hasFetchedRef = useRef(false);
  const hasVerifiedRef = useRef(false);

  // Calculate top offset for staging banner
  const topOffset = isStaging() ? STAGING_BANNER_HEIGHT : 0;
  const headerHeight = 64; // 16 * 4 = 64px (h-16)

  // Set UI mode to management
  useEffect(() => {
    setUIMode('management');
  }, [setUIMode]);

  // Verify session and restore access token
  useEffect(() => {
    if (!authHydrated) return;
    if (hasVerifiedRef.current) return;
    if (!isAuthenticated) return;

    hasVerifiedRef.current = true;

    const verifySession = async () => {
      const valid = await checkAuth();
      if (valid) {
        setIsVerified(true);
      } else {
        hasVerifiedRef.current = false;
        router.push('/login');
      }
    };

    verifySession();
  }, [authHydrated, isAuthenticated, checkAuth, router]);

  // Redirect AC tenant to admin
  useEffect(() => {
    if (authHydrated && isAuthenticated && isAcTenant) {
      router.replace('/admin');
    }
  }, [authHydrated, isAuthenticated, isAcTenant, router]);

  // Fetch organization tree from API (only once, after verification)
  useEffect(() => {
    if (!authHydrated || !isAuthenticated || isAcTenant || !isVerified) return;
    if (isLoadingTree || hasFetched) return;
    if (hasFetchedRef.current) return;
    
    hasFetchedRef.current = true;
    
    const fetchOrganizationTree = async () => {
      setTreeError(null);

      const result = await fetchAccessibleTalents();

      if (!result.success) {
        setTreeError(result.error || 'Failed to load organization');
        hasFetchedRef.current = false;
      }
    };
    
    void fetchOrganizationTree();
  }, [authHydrated, isAuthenticated, isAcTenant, isVerified, isLoadingTree, hasFetched, fetchAccessibleTalents]);

  useEffect(() => {
    setTreeError(fetchError);
  }, [fetchError]);

  // Auth check
  useEffect(() => {
    if (authHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [authHydrated, isAuthenticated, router]);

  // Wait for hydration and verification
  if (!authHydrated || !talentHydrated || (isAuthenticated && !isVerified)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // AC tenant should be redirected
  if (isAcTenant) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Redirecting to Admin Console...</p>
        </div>
      </div>
    );
  }

  // Show loading state for organization tree
  if (isLoadingTree && !hasFetched && organizationTree.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading organization...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (treeError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center text-red-500">
          <p className="mb-2">Failed to load organization</p>
          <p className="text-sm">{treeError}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ManagementSidebar />
      <div className="md:pl-64">
        <Header />
        <main 
          className="p-6"
          style={{ marginTop: topOffset + headerHeight }}
        >
          <SessionBootstrapAlert />
          {children}
        </main>
      </div>
    </>
  );
}
