// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Header } from '@/components/layout/header';
import { ManagementSidebar } from '@/components/layout/management-sidebar';
import { STAGING_BANNER_HEIGHT } from '@/components/staging-banner';
import { organizationApi } from '@/lib/api/client';
import { isStaging } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { SubsidiaryInfo, TalentInfo, useTalentStore } from '@/stores/talent-store';

// Helper to convert API response to store format
function convertApiTreeToStoreFormat(apiTree: any): SubsidiaryInfo[] {
  if (!apiTree || !apiTree.subsidiaries) return [];
  
  return apiTree.subsidiaries.map((sub: any) => ({
    id: sub.id,
    code: sub.code,
    displayName: sub.displayName,
    path: sub.path,
    children: sub.children ? convertApiTreeToStoreFormat({ subsidiaries: sub.children }) : [],
    talents: (sub.talents || []).map((tal: any) => ({
      id: tal.id,
      code: tal.code,
      displayName: tal.displayName,
      path: tal.path,
      avatarUrl: tal.avatarUrl,
      subsidiaryId: sub.id,
      subsidiaryName: sub.displayName,
    })),
  }));
}

// Helper to extract direct talents (not in subsidiaries)
function convertDirectTalents(apiTree: any): TalentInfo[] {
  if (!apiTree || !apiTree.directTalents) return [];
  
  return apiTree.directTalents.map((tal: any) => ({
    id: tal.id,
    code: tal.code,
    displayName: tal.displayName,
    path: tal.path,
    avatarUrl: tal.avatarUrl,
    subsidiaryId: null,
    subsidiaryName: undefined,
  }));
}

// Helper to extract all talents from subsidiaries
function extractTalentsFromTree(subs: SubsidiaryInfo[]): TalentInfo[] {
  const talents: TalentInfo[] = [];
  for (const sub of subs) {
    talents.push(...sub.talents);
    if (sub.children.length > 0) {
      talents.push(...extractTalentsFromTree(sub.children));
    }
  }
  return talents;
}

export default function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated: authHydrated, isAcTenant, checkAuth } = useAuthStore();
  const { 
    _hasHydrated: talentHydrated, 
    setUIMode, 
    setOrganizationTree,
    setAccessibleTalents,
    setCurrentTalent,
    organizationTree,
  } = useTalentStore();
  
  const [isLoadingTree, setIsLoadingTree] = useState(false);
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
    if (hasFetchedRef.current) return;
    if (organizationTree.length > 0) return;
    
    hasFetchedRef.current = true;
    
    const fetchOrganizationTree = async () => {
      setIsLoadingTree(true);
      setTreeError(null);
      
      try {
        const response = await organizationApi.getTree();
        if (response.success && response.data) {
          const subs = convertApiTreeToStoreFormat(response.data);
          const directTalents = convertDirectTalents(response.data);
          
          setOrganizationTree(subs);
          
          // Combine all talents
          const allTalents = [...extractTalentsFromTree(subs), ...directTalents];
          setAccessibleTalents(allTalents);
          
          // Set first talent as current if not set
          if (allTalents.length > 0) {
            setCurrentTalent(allTalents[0]);
          }
        } else {
          setTreeError(response.error?.message || 'Failed to load organization');
        }
      } catch (err: any) {
        setTreeError(err.message || 'Failed to load organization');
      } finally {
        setIsLoadingTree(false);
      }
    };
    
    fetchOrganizationTree();
  }, [authHydrated, isAuthenticated, isAcTenant, isVerified, organizationTree.length, setOrganizationTree, setAccessibleTalents, setCurrentTalent]);

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
  if (isLoadingTree) {
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
          {children}
        </main>
      </div>
    </>
  );
}
