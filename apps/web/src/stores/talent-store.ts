// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { TalentLifecycleStatus } from '@/lib/api/modules/talent';
import { getBusinessSelectableTalents as filterBusinessSelectableTalents } from '@/lib/talent-lifecycle-routing';

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
  lifecycleStatus: TalentLifecycleStatus;
  publishedAt?: string | null;
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
  fetchError: string | null;
  
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
  setFetchError: (error: string | null) => void;
  
  // Computed helpers
  getBusinessSelectableTalents: () => TalentInfo[];
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
  fetchError: null,
};

export const useTalentStore = create<TalentState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },

      setCurrentTalent: (talent: TalentInfo | null) => {
        if (!talent) {
          set({ currentTalent: null });
          return;
        }

        const businessSelectableTalent = filterBusinessSelectableTalents(
          get().accessibleTalents
        ).find((candidate) => candidate.id === talent.id);

        if (businessSelectableTalent) {
          set({ currentTalent: businessSelectableTalent });
        }
      },

      setAccessibleTalents: (talents: TalentInfo[]) => {
        const currentTalent = get().currentTalent;
        const businessSelectableTalents = filterBusinessSelectableTalents(talents);
        const nextCurrentTalent = currentTalent
          ? businessSelectableTalents.find((talent) => talent.id === currentTalent.id) ?? null
          : null;

        set({
          accessibleTalents: talents,
          currentTalent: nextCurrentTalent,
        });
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

      setFetchError: (error: string | null) => {
        set({ fetchError: error });
      },

      getBusinessSelectableTalents: () => {
        return filterBusinessSelectableTalents(get().accessibleTalents);
      },

      hasTalentAccess: () => {
        return get().getBusinessSelectableTalents().length > 0;
      },

      hasMultipleTalents: () => {
        return get().getBusinessSelectableTalents().length > 1;
      },

      switchToTalent: (talentId: string) => {
        const talent = get()
          .getBusinessSelectableTalents()
          .find((candidate) => candidate.id === talentId);
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
