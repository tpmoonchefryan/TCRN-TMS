import { DEFAULT_THEME, HomepageContent, THEME_PRESETS, ThemeConfig } from '@tcrn/shared';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { COMPONENT_REGISTRY } from '@/components/homepage/lib/component-registry';
import { ComponentInstance, ComponentType, migrateComponentTypes } from '@/components/homepage/lib/types';
import { homepageApi } from '@/lib/api/client';

interface EditorState {
  content: HomepageContent;
  theme: ThemeConfig;
  selectedComponentId: string | null;
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'offline';
  previewDevice: 'desktop' | 'tablet' | 'mobile';
  isLoading: boolean;
  isPublishing: boolean;
  error: string | null;
  lastSavedHash: string;
  isSaving: boolean;
  
  // History for undo/redo
  history: Array<{ content: HomepageContent; theme: ThemeConfig }>;
  historyIndex: number;
  maxHistorySize: number;
  
  // Settings
  settings: {
    homepagePath: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    customDomain: string | null;
    ogImageUrl: string | null;
    analyticsId: string | null;
  } | null;
  dbVersion: number;
  
  // i18n
  editingLocale: string; // 'default' or locale code (e.g. 'zh', 'ja')

  // Actions
  init: (content?: HomepageContent, theme?: ThemeConfig) => void;
  load: (talentId: string) => Promise<void>;
  saveDraft: (talentId: string) => Promise<void>;
  publish: (talentId: string) => Promise<boolean>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateSettings: (talentId: string, settings: Partial<any>) => Promise<void>;
  addComponent: (type: ComponentType, index?: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateComponent: (id: string, props: Partial<any>) => void;
  removeComponent: (id: string) => void;
  moveComponent: (dragIndex: number, hoverIndex: number) => void;
  selectComponent: (id: string | null) => void;
  setTheme: (theme: Partial<ThemeConfig>) => void;
  setThemePreset: (presetName: string) => void;
  setPreviewDevice: (device: 'desktop' | 'tablet' | 'mobile') => void;
  setEditingLocale: (locale: string) => void;
  setSaveStatus: (status: 'saved' | 'saving' | 'unsaved' | 'offline') => void;
  
  // Undo/Redo
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

// Simplifying store creator to avoid complex middleware type signature mismatches
// Simplifying store creator to avoid complex middleware type signature mismatches
export const useEditorStore = create<EditorState>()(
  immer<EditorState>((set, get) => ({
    content: { version: '1.0', components: [] },
    theme: DEFAULT_THEME,
    selectedComponentId: null,
    saveStatus: 'saved',
    previewDevice: 'mobile',
    isLoading: false,
    isPublishing: false,
    error: null,
    lastSavedHash: '',
    isSaving: false,
    settings: null,
    dbVersion: 0,
    editingLocale: 'default',
    
    // History for undo/redo
    history: [],
    historyIndex: -1,
    maxHistorySize: 50,

    init: (content, theme) => set((state) => {
      if (content) state.content = content;
      if (theme) state.theme = theme;
      state.saveStatus = 'saved';
      state.editingLocale = 'default';
      state.lastSavedHash = JSON.stringify({ content, theme });
    }),

    load: async (talentId) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });
      try {
        const response = await homepageApi.get(talentId);
        const { draftVersion, publishedVersion, theme, customDomain, homepagePath, seoTitle, seoDescription, ogImageUrl, analyticsId, version } = response.data;

        // Prioritize draft, fallback to published, then default
        // Also migrate legacy component types to current types
        const rawContent = draftVersion?.content || publishedVersion?.content || { version: '1.0', components: [] };
        const contentToLoad = migrateComponentTypes(rawContent);
        
        // Deep merge with DEFAULT_THEME to ensure all required properties exist
        const rawTheme = draftVersion?.theme || theme || {};
        const themeToLoad: ThemeConfig = {
          preset: rawTheme.preset ?? DEFAULT_THEME.preset,
          visual_style: rawTheme.visual_style ?? 'simple',
          colors: {
            ...DEFAULT_THEME.colors,
            ...(rawTheme.colors || {}),
          },
          background: {
            ...DEFAULT_THEME.background,
            ...(rawTheme.background || {}),
          },
          card: {
            ...DEFAULT_THEME.card,
            ...(rawTheme.card || {}),
          },
          typography: {
            ...DEFAULT_THEME.typography,
            ...(rawTheme.typography || {}),
          },
          decorations: {
            ...DEFAULT_THEME.decorations,
            ...(rawTheme.decorations || {}),
          },
          animation: {
            ...DEFAULT_THEME.animation,
            ...(rawTheme.animation || {}),
          },
        };

        set((state) => {
          state.content = contentToLoad;
          state.theme = themeToLoad;
          state.settings = {
             homepagePath,
             seoTitle,
             seoDescription,
             customDomain,
             ogImageUrl,
             analyticsId
          };

          // Ensure version is a number (handle potential string from raw query)
          state.dbVersion = Number(version) || 0; 
          state.saveStatus = 'saved';
          state.editingLocale = 'default';
          state.lastSavedHash = JSON.stringify({ content: contentToLoad, theme: themeToLoad });
          state.isLoading = false;
        });
      } catch {
        set((state) => {
          state.error = 'Failed to load homepage data';
          state.isLoading = false;
        });
      }
    },

    saveDraft: async (talentId) => {
      const { content, theme, saveStatus, lastSavedHash } = get();
      const currentHash = JSON.stringify({ content, theme });

      // Skip if already saved or no changes
      if (saveStatus === 'saved' || saveStatus === 'saving' || currentHash === lastSavedHash) {
        return;
      }

      set((state) => {
        state.saveStatus = 'saving';
      });

      try {
        await homepageApi.saveDraft(talentId, {
          content: content,
          theme: theme,
        }); // Corrected payload to match SaveDraftDto

        set((state) => {
          state.saveStatus = 'saved';
          state.lastSavedHash = currentHash;
        });
      } catch {
        set((state) => {
          state.saveStatus = 'unsaved'; // Revert to unsaved on error
          state.error = 'Failed to save draft';
        });
      }
    },

    publish: async (talentId) => {
      set((state) => {
        state.isPublishing = true;
        state.error = null;
      });

      try {
        // Ensure draft is saved first
        await get().saveDraft(talentId);

        await homepageApi.publish(talentId);

        set((state) => {
          state.isPublishing = false;
          state.saveStatus = 'saved';
        });
        return true;
      } catch {
        set((state) => {
          state.isPublishing = false;
          state.error = 'Failed to publish homepage';
        });
        return false;
      }
    },

    updateSettings: async (talentId, settings) => {
       set((state) => { state.isSaving = true; });
       try {
         // Use stored dbVersion (ensure number)
         const currentVersion = Number(get().dbVersion) || 0;
         const payload = { ...settings, version: currentVersion };
         
         const response = await homepageApi.updateSettings(talentId, payload);
         
         // Update state with response data to ensure consistency
         set((state) => {
            state.settings = {
              homepagePath: response.data.homepagePath,
              seoTitle: response.data.seoTitle,
              seoDescription: response.data.seoDescription,
              customDomain: response.data.customDomain,
              ogImageUrl: response.data.ogImageUrl,
              analyticsId: response.data.analyticsId,
            };
            state.dbVersion = response.data.version; // Update version from response
            state.isSaving = false;
         });
       } catch {
           set((state) => { state.isSaving = false; state.error = 'Failed to update settings'; });
       }
    },

    addComponent: (type, index) => set((state) => {
      const definition = COMPONENT_REGISTRY[type];
      const newComponent: ComponentInstance = {
        id: uuidv4(),
        type,
        props: definition ? { ...definition.defaultProps } : {},
        order: index ?? state.content.components.length,
        visible: true
      };
      
      if (typeof index === 'number') {
        state.content.components.splice(index, 0, newComponent);
      } else {
        state.content.components.push(newComponent);
      }
      
      state.selectedComponentId = newComponent.id;
      state.saveStatus = 'unsaved';
    }),

    updateComponent: (id, props) => set((state) => {
      const component = state.content.components.find((c) => c.id === id);
      if (component) {
        if (state.editingLocale === 'default') {
          // Normal update
          component.props = { ...component.props, ...props };
        } else {
          // Localized update
          if (!component.i18n) component.i18n = {};
          if (!component.i18n[state.editingLocale]) component.i18n[state.editingLocale] = {};
          
          // Merge localized props
          Object.assign(component.i18n[state.editingLocale], props);
        }
        state.saveStatus = 'unsaved';
      }
    }),

    removeComponent: (id) => set((state) => {
      state.content.components = state.content.components.filter((c) => c.id !== id);
      if (state.selectedComponentId === id) {
        state.selectedComponentId = null;
      }
      state.saveStatus = 'unsaved';
    }),

    moveComponent: (dragIndex, hoverIndex) => set((state) => {
      const [removed] = state.content.components.splice(dragIndex, 1);
      state.content.components.splice(hoverIndex, 0, removed);
      state.saveStatus = 'unsaved';
    }),

    selectComponent: (id) => set((state) => {
      state.selectedComponentId = id;
    }),

    setTheme: (updates) => set((state) => {
      Object.assign(state.theme, updates);
      state.saveStatus = 'unsaved';
    }),

    setThemePreset: (presetName) => set((state) => {
      const preset = THEME_PRESETS[presetName];
      if (preset) {
        state.theme = { ...state.theme, ...preset } as ThemeConfig;
        state.saveStatus = 'unsaved';
      }
    }),

    setPreviewDevice: (device) => set((state) => {
      state.previewDevice = device;
    }),
    
    setEditingLocale: (locale) => set((state) => {
      state.editingLocale = locale;
    }),

    setSaveStatus: (status) => set((state) => {
      state.saveStatus = status;
    }),

    // Push current state to history (call before making changes)
    pushHistory: () => set((state) => {
      const snapshot = {
        content: JSON.parse(JSON.stringify(state.content)),
        theme: JSON.parse(JSON.stringify(state.theme)),
      };
      
      // If we're not at the end of history, truncate future states
      if (state.historyIndex < state.history.length - 1) {
        state.history = state.history.slice(0, state.historyIndex + 1);
      }
      
      state.history.push(snapshot);
      state.historyIndex = state.history.length - 1;
      
      // Limit history size
      if (state.history.length > state.maxHistorySize) {
        state.history = state.history.slice(state.history.length - state.maxHistorySize);
        state.historyIndex = state.history.length - 1;
      }
    }),

    // Undo to previous state
    undo: () => set((state) => {
      if (state.historyIndex > 0) {
        state.historyIndex -= 1;
        const snapshot = state.history[state.historyIndex];
        state.content = JSON.parse(JSON.stringify(snapshot.content));
        state.theme = JSON.parse(JSON.stringify(snapshot.theme));
        state.saveStatus = 'unsaved';
        state.selectedComponentId = null;
      }
    }),

    // Redo to next state
    redo: () => set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex += 1;
        const snapshot = state.history[state.historyIndex];
        state.content = JSON.parse(JSON.stringify(snapshot.content));
        state.theme = JSON.parse(JSON.stringify(snapshot.theme));
        state.saveStatus = 'unsaved';
        state.selectedComponentId = null;
      }
    }),

    // Check if undo is available
    canUndo: () => {
      const state = get();
      return state.historyIndex > 0;
    },

    // Check if redo is available
    canRedo: () => {
      const state = get();
      return state.historyIndex < state.history.length - 1;
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any
);
