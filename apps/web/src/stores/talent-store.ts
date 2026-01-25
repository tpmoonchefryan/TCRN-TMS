// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Simplified Talent info for UI purposes
export interface TalentInfo {
  id: string;
  code: string;
  displayName: string;
  avatarUrl?: string;
  subsidiaryId?: string | null;
  subsidiaryName?: string;
  path: string;
  homepagePath?: string | null;
}

// Subsidiary info for organization tree
export interface SubsidiaryInfo {
  id: string;
  code: string;
  displayName: string;
  parentId?: string | null;
  path: string;
  talents: TalentInfo[];
  children: SubsidiaryInfo[];
}

export type UIMode = 'business' | 'management';

export interface TalentState {
  // Current selected talent (for business UI)
  currentTalent: TalentInfo | null;
  
  // All talents the user has access to
  accessibleTalents: TalentInfo[];
  
  // Organization structure (for management UI)
  organizationTree: SubsidiaryInfo[];
  
  // Direct talents (not under any subsidiary)
  directTalents: TalentInfo[];
  
  // Current UI mode
  uiMode: UIMode;
  
  // Current tenant info
  currentTenantId: string | null;
  currentTenantCode: string | null;
  
  // Loading state
  isLoading: boolean;
  
  // Hydration state
  _hasHydrated: boolean;
  
  // Data fetch state - distinguishes "not yet fetched" from "fetched but empty"
  hasFetched: boolean;
  
  // Actions
  setCurrentTalent: (talent: TalentInfo | null) => void;
  setAccessibleTalents: (talents: TalentInfo[]) => void;
  setOrganizationTree: (tree: SubsidiaryInfo[]) => void;
  setDirectTalents: (talents: TalentInfo[]) => void;
  setUIMode: (mode: UIMode) => void;
  setCurrentTenant: (tenantId: string, tenantCode: string) => void;
  setIsLoading: (loading: boolean) => void;
  setHasHydrated: (state: boolean) => void;
  setHasFetched: (state: boolean) => void;
  
  // Computed helpers
  hasTalentAccess: () => boolean;
  hasMultipleTalents: () => boolean;
  switchToTalent: (talentId: string) => boolean;
  
  // Reset
  reset: () => void;
}

const initialState = {
  currentTalent: null,
  accessibleTalents: [],
  organizationTree: [],
  directTalents: [],
  uiMode: 'business' as UIMode,
  currentTenantId: null,
  currentTenantCode: null,
  isLoading: false,
  _hasHydrated: false,
  hasFetched: false,
};

export const useTalentStore = create<TalentState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },

      setCurrentTalent: (talent: TalentInfo | null) => {
        set({ currentTalent: talent });
      },

      setAccessibleTalents: (talents: TalentInfo[]) => {
        set({ accessibleTalents: talents });
      },

      setOrganizationTree: (tree: SubsidiaryInfo[]) => {
        set({ organizationTree: tree });
      },

      setDirectTalents: (talents: TalentInfo[]) => {
        set({ directTalents: talents });
      },

      setUIMode: (mode: UIMode) => {
        set({ uiMode: mode });
      },

      setCurrentTenant: (tenantId: string, tenantCode: string) => {
        set({ currentTenantId: tenantId, currentTenantCode: tenantCode });
      },

      setIsLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setHasFetched: (state: boolean) => {
        set({ hasFetched: state });
      },

      hasTalentAccess: () => {
        const { accessibleTalents } = get();
        return accessibleTalents.length > 0;
      },

      hasMultipleTalents: () => {
        const { accessibleTalents } = get();
        return accessibleTalents.length > 1;
      },

      switchToTalent: (talentId: string) => {
        const { accessibleTalents } = get();
        const talent = accessibleTalents.find(t => t.id === talentId);
        if (talent) {
          set({ currentTalent: talent, uiMode: 'business' });
          return true;
        }
        return false;
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'tcrn-talent',
      partialize: (state) => ({
        currentTalent: state.currentTalent,
        uiMode: state.uiMode,
        currentTenantId: state.currentTenantId,
        currentTenantCode: state.currentTenantCode,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);
