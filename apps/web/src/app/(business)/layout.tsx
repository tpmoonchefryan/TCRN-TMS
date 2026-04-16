// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { AuthGuard } from '@/components/auth/auth-guard';
import { SessionBootstrapAlert } from '@/components/auth/session-bootstrap-alert';
import { BusinessSidebar } from '@/components/layout/business-sidebar';
import { Header } from '@/components/layout/header';
import { Watermark } from '@/components/security/Watermark';
import { STAGING_BANNER_HEIGHT } from '@/components/staging-banner';
import { TalentSelectModal } from '@/components/talent/talent-select-modal';
import {
  buildOrganizationStructureUrl,
  getBusinessSelectableTalents,
  resolveBusinessWorkspaceEntry,
} from '@/lib/talent-lifecycle-routing';
import { isStaging } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useTalentStore } from '@/stores/talent-store';

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, _hasHydrated: authHydrated, tenantId } = useAuthStore();
  const {
    currentTalent,
    accessibleTalents,
    _hasHydrated: talentHydrated,
    setCurrentTalent,
    hasFetched,
    fetchError,
  } = useTalentStore();

  const [showTalentModal, setShowTalentModal] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const businessSelectableTalents = useMemo(
    () => getBusinessSelectableTalents(accessibleTalents),
    [accessibleTalents]
  );
  const search = searchParams?.toString() ?? '';

  // Ensure consistent SSR/CSR - both render loading initially
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Calculate top offset for staging banner
  const topOffset = isStaging() ? STAGING_BANNER_HEIGHT : 0;
  const headerHeight = 64; // 16 * 4 = 64px (h-16)

  // Auth check handled by AuthGuard

  // Enforce the lifecycle-aware business entry rules. Utility routes such as /profile and /logs
  // are allowed to render without a published talent, while publish-gated routes are not.
  useEffect(() => {
    if (!talentHydrated || !authHydrated || !isAuthenticated || !hasFetched) {
      return;
    }

    if (fetchError) {
      setShowTalentModal(false);
      router.replace(tenantId ? buildOrganizationStructureUrl(tenantId) : '/profile');
      return;
    }

    const decision = resolveBusinessWorkspaceEntry({
      tenantId,
      pathname,
      search,
      accessibleTalents,
      currentTalent,
    });

    if (decision.type === 'allow') {
      setShowTalentModal(false);
      return;
    }

    if (decision.type === 'auto-select') {
      setShowTalentModal(false);
      if (currentTalent?.id !== decision.talent.id) {
        setCurrentTalent(decision.talent);
      }
      return;
    }

    if (decision.type === 'show-modal') {
      setShowTalentModal(true);
      return;
    }

    setShowTalentModal(false);
    router.replace(decision.href);
  }, [
    talentHydrated,
    authHydrated,
    isAuthenticated,
    hasFetched,
    fetchError,
    accessibleTalents,
    currentTalent,
    pathname,
    search,
    setCurrentTalent,
    tenantId,
    router,
  ]);

  // Show loading state during SSR and initial client render for hydration match
  // Also show loading if auth store hasn't hydrated yet
  if (!isClient || !authHydrated || !talentHydrated || (isAuthenticated && !hasFetched)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <Watermark>
        <BusinessSidebar />
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

        {/* Talent Selection Modal */}
        <TalentSelectModal
          open={showTalentModal}
          talents={businessSelectableTalents}
          onSelect={(talent) => {
            setCurrentTalent(talent);
            setShowTalentModal(false);
          }}
        />
      </Watermark>
    </AuthGuard>
  );
}
