/* eslint-disable @typescript-eslint/no-unused-vars */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AuthGuard } from '@/components/auth/auth-guard';
import { BusinessSidebar } from '@/components/layout/business-sidebar';
import { Header } from '@/components/layout/header';
import { Watermark } from '@/components/security/Watermark';
import { STAGING_BANNER_HEIGHT } from '@/components/staging-banner';
import { TalentSelectModal } from '@/components/talent/talent-select-modal';
import { isStaging } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useTalentStore } from '@/stores/talent-store';

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated: authHydrated, tenantId } = useAuthStore();
  const {
    currentTalent,
    accessibleTalents,
    _hasHydrated: talentHydrated,
    setCurrentTalent,
    hasTalentAccess,
    isLoading: talentLoading,
    hasFetched,
  } = useTalentStore();

  const [showTalentModal, setShowTalentModal] = useState(false);
  const [hasCheckedAccess, setHasCheckedAccess] = useState(false);

  // Calculate top offset for staging banner
  const topOffset = isStaging() ? STAGING_BANNER_HEIGHT : 0;
  const headerHeight = 64; // 16 * 4 = 64px (h-16)

  // Auth check handled by AuthGuard

  // Check if we need to show talent selection modal
  useEffect(() => {
    // Wait for:
    // 1. Both stores hydrated
    // 2. User authenticated
    // 3. Talent data actually fetched (not just "not loading")
    if (!talentHydrated || !authHydrated || !isAuthenticated || !hasFetched) {
      return;
    }
    
    // Only check access once to prevent loops
    if (hasCheckedAccess) {
      return;
    }
    setHasCheckedAccess(true);

    // No talents - redirect to management
    if (!hasTalentAccess()) {
      if (tenantId) {
        router.push(`/tenant/${tenantId}/organization-structure`);
      }
      return;
    }

    // Multiple talents, none selected - show modal
    if (accessibleTalents.length > 1 && !currentTalent) {
      setShowTalentModal(true);
    }

    // Single talent - auto-select
    if (accessibleTalents.length === 1 && !currentTalent) {
      setCurrentTalent(accessibleTalents[0]);
    }
  }, [
    talentHydrated,
    authHydrated,
    isAuthenticated,
    hasFetched,
    hasCheckedAccess,
    accessibleTalents,
    currentTalent,
    hasTalentAccess,
    setCurrentTalent,
    tenantId,
    router,
  ]);

  // No redundant manual checks needed, AuthGuard handles it
  
  // Wait for auth hydration only - talent loading is handled inside the layout
  if (!authHydrated) {
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
            {children}
          </main>
        </div>

        {/* Talent Selection Modal */}
        <TalentSelectModal
          open={showTalentModal}
          talents={accessibleTalents}
          onSelect={(talent) => {
            setCurrentTalent(talent);
            setShowTalentModal(false);
          }}
        />
      </Watermark>
    </AuthGuard>
  );
}
