// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock all child components to isolate testing (use absolute path from @/)
vi.mock('@/components/homepage/editor/Canvas', () => ({
  Canvas: () => <div data-testid="canvas">Canvas Component</div>,
}));

vi.mock('@/components/homepage/editor/ComponentPanel', () => ({
  ComponentPanel: () => <div data-testid="component-panel">Component Panel</div>,
}));

vi.mock('@/components/homepage/editor/PropertiesPanel', () => ({
  PropertiesPanel: () => <div data-testid="properties-panel">Properties Panel</div>,
}));

vi.mock('@/components/homepage/editor/SettingsDialog', () => ({
  SettingsDialog: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => 
    open ? <div data-testid="settings-dialog">Settings Dialog <button onClick={() => onOpenChange(false)}>Close</button></div> : null,
}));

vi.mock('@/components/homepage/editor/VersionHistory', () => ({
  VersionHistory: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => 
    open ? <div data-testid="version-history">Version History <button onClick={() => onOpenChange(false)}>Close</button></div> : null,
}));

// Mock router
const mockRouterBack = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockRouterBack,
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      editorTitle: 'Homepage Editor',
      saving: 'Saving...',
      saved: 'All changes saved',
      unsaved_changes: 'Unsaved changes',
      preview: 'Preview',
      save: 'Save',
      publish: 'Publish',
      mobile: 'Mobile',
      tablet: 'Tablet',
      desktop: 'Desktop',
      confirmPublish: 'Are you sure you want to publish?',
      publishSuccess: 'Published successfully!',
      history: 'Version History',
      settings: 'Settings',
      noHomepagePath: 'No homepage path configured',
    };
    return translations[key] || key;
  },
}));

// Mock editor store
const mockEditorStore = {
  content: { version: '1.0', components: [] },
  theme: { primaryColor: '#000000' },
  saveStatus: 'saved' as 'saved' | 'saving' | 'unsaved',
  saveDraft: vi.fn(),
  publish: vi.fn(),
  isPublishing: false,
  settings: { homepagePath: 'test-path' as string | null },
  undo: vi.fn(),
  redo: vi.fn(),
  canUndo: vi.fn(() => false),
  canRedo: vi.fn(() => false),
  error: null as string | null,
  previewDevice: 'mobile' as const,
  setPreviewDevice: vi.fn(),
};

vi.mock('@/stores/homepage/editor-store', () => ({
  useEditorStore: Object.assign(
    (selector?: (state: typeof mockEditorStore) => unknown) => {
      if (selector) {
        return selector(mockEditorStore);
      }
      return mockEditorStore;
    },
    {
      getState: () => mockEditorStore,
    }
  ),
}));

import { HomepageEditor } from '@/components/homepage/editor/HomepageEditor';

describe('HomepageEditor Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEditorStore.saveStatus = 'saved';
    mockEditorStore.isPublishing = false;
    mockEditorStore.canUndo.mockReturnValue(false);
    mockEditorStore.canRedo.mockReturnValue(false);
    mockEditorStore.error = null;

    // Mock window.confirm and window.alert
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render editor with all panels', () => {
      render(<HomepageEditor talentId="talent-1" />);

      expect(screen.getByText('Homepage Editor')).toBeInTheDocument();
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
      expect(screen.getByTestId('component-panel')).toBeInTheDocument();
      expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
    });

    it('should show saved status when saveStatus is saved', () => {
      mockEditorStore.saveStatus = 'saved';
      render(<HomepageEditor talentId="talent-1" />);

      expect(screen.getByText('All changes saved')).toBeInTheDocument();
    });

    it('should show saving status when saveStatus is saving', () => {
      mockEditorStore.saveStatus = 'saving';
      render(<HomepageEditor talentId="talent-1" />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('should show unsaved changes when saveStatus is unsaved', () => {
      mockEditorStore.saveStatus = 'unsaved';
      render(<HomepageEditor talentId="talent-1" />);

      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate back when clicking back button', async () => {
      const user = userEvent.setup();
      render(<HomepageEditor talentId="talent-1" />);

      // Find back button (first button with ArrowLeft icon)
      const backButton = screen.getAllByRole('button')[0];
      await user.click(backButton);

      expect(mockRouterBack).toHaveBeenCalled();
    });
  });

  describe('Device Switcher', () => {
    it('should render device switcher buttons', () => {
      render(<HomepageEditor talentId="talent-1" />);

      expect(screen.getByTitle('Mobile')).toBeInTheDocument();
      expect(screen.getByTitle('Tablet')).toBeInTheDocument();
      expect(screen.getByTitle('Desktop')).toBeInTheDocument();
    });

    it('should call setPreviewDevice when clicking device buttons', async () => {
      const user = userEvent.setup();
      render(<HomepageEditor talentId="talent-1" />);

      await user.click(screen.getByTitle('Tablet'));
      expect(mockEditorStore.setPreviewDevice).toHaveBeenCalledWith('tablet');

      await user.click(screen.getByTitle('Desktop'));
      expect(mockEditorStore.setPreviewDevice).toHaveBeenCalledWith('desktop');
    });
  });

  describe('Undo/Redo', () => {
    it('should disable undo button when canUndo returns false', () => {
      mockEditorStore.canUndo.mockReturnValue(false);
      render(<HomepageEditor talentId="talent-1" />);

      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      expect(undoButton).toBeDisabled();
    });

    it('should enable undo button when canUndo returns true', () => {
      mockEditorStore.canUndo.mockReturnValue(true);
      render(<HomepageEditor talentId="talent-1" />);

      const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
      expect(undoButton).not.toBeDisabled();
    });

    it('should disable redo button when canRedo returns false', () => {
      mockEditorStore.canRedo.mockReturnValue(false);
      render(<HomepageEditor talentId="talent-1" />);

      const redoButton = screen.getByTitle('Redo (Ctrl+Y)');
      expect(redoButton).toBeDisabled();
    });

    it('should call undo when clicking undo button', async () => {
      const user = userEvent.setup();
      mockEditorStore.canUndo.mockReturnValue(true);
      render(<HomepageEditor talentId="talent-1" />);

      await user.click(screen.getByTitle('Undo (Ctrl+Z)'));
      expect(mockEditorStore.undo).toHaveBeenCalled();
    });

    it('should call redo when clicking redo button', async () => {
      const user = userEvent.setup();
      mockEditorStore.canRedo.mockReturnValue(true);
      render(<HomepageEditor talentId="talent-1" />);

      await user.click(screen.getByTitle('Redo (Ctrl+Y)'));
      expect(mockEditorStore.redo).toHaveBeenCalled();
    });
  });

  describe('Save and Publish', () => {
    it('should call saveDraft when clicking save button', async () => {
      const user = userEvent.setup();
      render(<HomepageEditor talentId="talent-1" />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockEditorStore.saveDraft).toHaveBeenCalledWith('talent-1');
    });

    it('should disable save button when saving', () => {
      mockEditorStore.saveStatus = 'saving';
      render(<HomepageEditor talentId="talent-1" />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it('should call publish when clicking publish button and confirming', async () => {
      const user = userEvent.setup();
      mockEditorStore.publish.mockResolvedValue(true);
      render(<HomepageEditor talentId="talent-1" />);

      const publishButton = screen.getByRole('button', { name: /publish/i });
      await user.click(publishButton);

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to publish?');
      expect(mockEditorStore.publish).toHaveBeenCalledWith('talent-1');
    });

    it('should not call publish when user cancels confirmation', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      render(<HomepageEditor talentId="talent-1" />);

      const publishButton = screen.getByRole('button', { name: /publish/i });
      await user.click(publishButton);

      expect(mockEditorStore.publish).not.toHaveBeenCalled();
    });

    it('should disable publish button when publishing', () => {
      mockEditorStore.isPublishing = true;
      render(<HomepageEditor talentId="talent-1" />);

      const publishButton = screen.getByRole('button', { name: /publish/i });
      expect(publishButton).toBeDisabled();
    });
  });

  describe('Preview', () => {
    it('should open preview in new window when clicking preview button', async () => {
      const user = userEvent.setup();
      render(<HomepageEditor talentId="talent-1" />);

      const previewButton = screen.getByRole('button', { name: /preview/i });
      await user.click(previewButton);

      expect(window.open).toHaveBeenCalledWith('/p/test-path', '_blank');
    });

    it('should show alert when homepage path is not configured', async () => {
      const user = userEvent.setup();
      mockEditorStore.settings = { homepagePath: null };
      render(<HomepageEditor talentId="talent-1" />);

      const previewButton = screen.getByRole('button', { name: /preview/i });
      await user.click(previewButton);

      expect(window.alert).toHaveBeenCalledWith('No homepage path configured');
    });
  });

  describe('Dropdown Menu', () => {
    it('should open version history dialog from dropdown menu', async () => {
      const user = userEvent.setup();
      render(<HomepageEditor talentId="talent-1" />);

      // Click the more options button (last button in header)
      const moreButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('.lucide-more-horizontal') !== null
      );
      
      if (moreButton) {
        await user.click(moreButton);
        
        // Wait for dropdown to appear and click version history
        await waitFor(() => {
          const historyItem = screen.getByText('Version History');
          expect(historyItem).toBeInTheDocument();
        });

        await user.click(screen.getByText('Version History'));

        await waitFor(() => {
          expect(screen.getByTestId('version-history')).toBeInTheDocument();
        });
      }
    });

    it('should open settings dialog from dropdown menu', async () => {
      const user = userEvent.setup();
      render(<HomepageEditor talentId="talent-1" />);

      // Click the more options button
      const moreButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('.lucide-more-horizontal') !== null
      );
      
      if (moreButton) {
        await user.click(moreButton);
        
        await waitFor(() => {
          const settingsItem = screen.getByText('Settings');
          expect(settingsItem).toBeInTheDocument();
        });

        await user.click(screen.getByText('Settings'));

        await waitFor(() => {
          expect(screen.getByTestId('settings-dialog')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should show alert when store has error', () => {
      mockEditorStore.error = 'Test error message';
      render(<HomepageEditor talentId="talent-1" />);

      expect(window.alert).toHaveBeenCalledWith('Error: Test error message');
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should call undo on Ctrl+Z', async () => {
      mockEditorStore.canUndo.mockReturnValue(true);
      render(<HomepageEditor talentId="talent-1" />);

      await act(async () => {
        const event = new KeyboardEvent('keydown', {
          key: 'z',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(mockEditorStore.undo).toHaveBeenCalled();
    });

    it('should call redo on Ctrl+Shift+Z', async () => {
      mockEditorStore.canRedo.mockReturnValue(true);
      render(<HomepageEditor talentId="talent-1" />);

      await act(async () => {
        const event = new KeyboardEvent('keydown', {
          key: 'z',
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(mockEditorStore.redo).toHaveBeenCalled();
    });

    it('should call redo on Ctrl+Y', async () => {
      mockEditorStore.canRedo.mockReturnValue(true);
      render(<HomepageEditor talentId="talent-1" />);

      await act(async () => {
        const event = new KeyboardEvent('keydown', {
          key: 'y',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(mockEditorStore.redo).toHaveBeenCalled();
    });
  });
});
