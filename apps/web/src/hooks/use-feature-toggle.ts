// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { useEffect } from 'react';

import { useCurrentTalent } from '@/hooks/use-current-talent';
import { useSettingsStore } from '@/stores/settings-store';

/**
 * Hook to access feature toggles for the current talent context.
 * Automatically fetches settings when the current talent changes.
 * 
 * Usage:
 * ```tsx
 * const { marshmallowEnabled, homepageEnabled } = useFeatureToggle();
 * 
 * return (
 *   <>
 *     {marshmallowEnabled && <MarshmallowNavItem />}
 *     {homepageEnabled && <HomepageNavItem />}
 *   </>
 * );
 * ```
 */
export function useFeatureToggle() {
  const { currentTalent } = useCurrentTalent();
  const { 
    featureToggles, 
    fetchForTalent, 
    isLoading,
    currentScopeId,
  } = useSettingsStore();

  // Fetch settings when talent changes
  useEffect(() => {
    if (currentTalent?.id && currentScopeId !== currentTalent.id) {
      fetchForTalent(currentTalent.id);
    }
  }, [currentTalent?.id, currentScopeId, fetchForTalent]);

  return {
    // Feature flags
    marshmallowEnabled: featureToggles.allowMarshmallow,
    homepageEnabled: featureToggles.allowCustomHomepage,
    
    // Loading state
    isLoading,
    
    // Raw access to all toggles
    featureToggles,
  };
}

/**
 * Hook to check if a specific feature is enabled.
 * 
 * Usage:
 * ```tsx
 * const isEnabled = useIsFeatureEnabled('allowMarshmallow');
 * ```
 */
export function useIsFeatureEnabled(feature: 'allowMarshmallow' | 'allowCustomHomepage'): boolean {
  const { featureToggles } = useSettingsStore();
  return featureToggles[feature];
}
