// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { useCallback, useMemo } from 'react';

import { TalentInfo,useTalentStore } from '@/stores/talent-store';

/**
 * Hook for managing the current talent context in business UI.
 * Provides access to current talent, accessible talents list, and switching functionality.
 */
export function useCurrentTalent() {
  const {
    currentTalent,
    accessibleTalents,
    isLoading,
    setCurrentTalent,
    switchToTalent,
    hasTalentAccess,
    hasMultipleTalents,
  } = useTalentStore();

  // Switch to a specific talent by ID
  const selectTalent = useCallback(
    (talentId: string) => {
      return switchToTalent(talentId);
    },
    [switchToTalent]
  );

  // Clear current talent selection
  const clearTalent = useCallback(() => {
    setCurrentTalent(null);
  }, [setCurrentTalent]);

  // Check if a specific talent is currently selected
  const isSelected = useCallback(
    (talentId: string) => {
      return currentTalent?.id === talentId;
    },
    [currentTalent]
  );

  // Get talent by ID from accessible list
  const getTalentById = useCallback(
    (talentId: string): TalentInfo | undefined => {
      return accessibleTalents.find((t) => t.id === talentId);
    },
    [accessibleTalents]
  );

  // Computed values
  const canSwitch = useMemo(() => hasMultipleTalents(), [hasMultipleTalents]);
  const hasTalents = useMemo(() => hasTalentAccess(), [hasTalentAccess]);
  const talentCount = useMemo(() => accessibleTalents.length, [accessibleTalents]);

  return {
    // Current state
    currentTalent,
    accessibleTalents,
    isLoading,

    // Computed
    canSwitch,
    hasTalents,
    talentCount,

    // Actions
    selectTalent,
    clearTalent,
    isSelected,
    getTalentById,
  };
}

/**
 * Hook specifically for talent selection in login flow.
 * Returns info about whether user needs to select a talent after login.
 */
export function useTalentSelection() {
  const { accessibleTalents, currentTalent, setCurrentTalent } = useTalentStore();

  // User needs to select a talent if they have multiple and none is selected
  const needsSelection = useMemo(() => {
    return accessibleTalents.length > 1 && !currentTalent;
  }, [accessibleTalents, currentTalent]);

  // Auto-select if user has only one talent
  const autoSelectIfSingle = useCallback(() => {
    if (accessibleTalents.length === 1 && !currentTalent) {
      setCurrentTalent(accessibleTalents[0]);
      return true;
    }
    return false;
  }, [accessibleTalents, currentTalent, setCurrentTalent]);

  // Select a talent from the list
  const selectTalent = useCallback(
    (talent: TalentInfo) => {
      setCurrentTalent(talent);
    },
    [setCurrentTalent]
  );

  return {
    needsSelection,
    autoSelectIfSingle,
    selectTalent,
    accessibleTalents,
    currentTalent,
  };
}
