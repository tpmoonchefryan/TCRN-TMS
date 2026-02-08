// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { create } from 'zustand';

import { settingsApi } from '@/lib/api/client';

/**
 * Feature toggle settings that control UI feature visibility
 */
export interface FeatureToggles {
  allowCustomHomepage: boolean;
  allowMarshmallow: boolean;
}

/**
 * Settings store state interface
 */
interface SettingsState {
  // Feature toggles for current talent context
  featureToggles: FeatureToggles;
  
  // Current scope being tracked
  currentScopeType: 'tenant' | 'subsidiary' | 'talent' | null;
  currentScopeId: string | null;
  
  // Loading state
  isLoading: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  fetchForTalent: (talentId: string) => Promise<void>;
  fetchForSubsidiary: (subsidiaryId: string) => Promise<void>;
  fetchForTenant: () => Promise<void>;
  setFeatureToggles: (toggles: Partial<FeatureToggles>) => void;
  reset: () => void;
}

/**
 * Default feature toggle values (all enabled by default)
 */
const DEFAULT_TOGGLES: FeatureToggles = {
  allowCustomHomepage: true,
  allowMarshmallow: true,
};

/**
 * Settings store for managing feature toggles
 * Uses zustand for global state management
 */
export const useSettingsStore = create<SettingsState>()((set, get) => ({
  featureToggles: DEFAULT_TOGGLES,
  currentScopeType: null,
  currentScopeId: null,
  isLoading: false,
  error: null,

  /**
   * Fetch feature toggles for a specific talent
   */
  fetchForTalent: async (talentId: string) => {
    // Skip if already loaded for this talent
    if (get().currentScopeType === 'talent' && get().currentScopeId === talentId) {
      return;
    }

    set({ isLoading: true, error: null });
    
    try {
      const response = await settingsApi.getTalentSettings(talentId);
      
      if (response.success && response.data) {
        const settings = response.data.settings as Record<string, unknown>;
        set({
          featureToggles: {
            allowCustomHomepage: (settings.allowCustomHomepage as boolean) ?? true,
            allowMarshmallow: (settings.allowMarshmallow as boolean) ?? true,
          },
          currentScopeType: 'talent',
          currentScopeId: talentId,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch talent settings:', error);
      set({ 
        error: 'Failed to fetch settings',
        isLoading: false,
        // Keep default toggles on error
        featureToggles: DEFAULT_TOGGLES,
      });
    }
  },

  /**
   * Fetch feature toggles for a specific subsidiary
   */
  fetchForSubsidiary: async (subsidiaryId: string) => {
    if (get().currentScopeType === 'subsidiary' && get().currentScopeId === subsidiaryId) {
      return;
    }

    set({ isLoading: true, error: null });
    
    try {
      const response = await settingsApi.getSubsidiarySettings(subsidiaryId);
      
      if (response.success && response.data) {
        const settings = response.data.settings as Record<string, unknown>;
        set({
          featureToggles: {
            allowCustomHomepage: (settings.allowCustomHomepage as boolean) ?? true,
            allowMarshmallow: (settings.allowMarshmallow as boolean) ?? true,
          },
          currentScopeType: 'subsidiary',
          currentScopeId: subsidiaryId,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch subsidiary settings:', error);
      set({ 
        error: 'Failed to fetch settings',
        isLoading: false,
        featureToggles: DEFAULT_TOGGLES,
      });
    }
  },

  /**
   * Fetch feature toggles for tenant level
   */
  fetchForTenant: async () => {
    if (get().currentScopeType === 'tenant') {
      return;
    }

    set({ isLoading: true, error: null });
    
    try {
      const response = await settingsApi.getTenantSettings();
      
      if (response.success && response.data) {
        const settings = response.data.settings as Record<string, unknown>;
        set({
          featureToggles: {
            allowCustomHomepage: (settings.allowCustomHomepage as boolean) ?? true,
            allowMarshmallow: (settings.allowMarshmallow as boolean) ?? true,
          },
          currentScopeType: 'tenant',
          currentScopeId: null,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch tenant settings:', error);
      set({ 
        error: 'Failed to fetch settings',
        isLoading: false,
        featureToggles: DEFAULT_TOGGLES,
      });
    }
  },

  /**
   * Manually set feature toggles
   */
  setFeatureToggles: (toggles: Partial<FeatureToggles>) => {
    set((state) => ({
      featureToggles: { ...state.featureToggles, ...toggles },
    }));
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    set({
      featureToggles: DEFAULT_TOGGLES,
      currentScopeType: null,
      currentScopeId: null,
      isLoading: false,
      error: null,
    });
  },
}));
