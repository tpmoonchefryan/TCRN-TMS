import { type ThemeConfig, ThemePreset } from '@tcrn/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type HomepageDraftContent,
} from '@/domains/homepage-management/api/homepage.api';
import { HOMEPAGE_PUCK_SIDEBAR_STORAGE_KEY } from '@/domains/homepage-management/editor/puck/homepage-puck-ui';
import { HomepagePuckEditor } from '@/domains/homepage-management/editor/puck/HomepagePuckEditor';
import { useHomepageEditorCopy } from '@/domains/homepage-management/screens/homepage-editor.copy';
import { RuntimeLocaleProvider } from '@/platform/runtime/locale/locale-provider';

const mockDispatch = vi.fn();
let latestOnChange:
  | ((data: {
    content: Array<{ props?: Record<string, unknown>; type: string }>;
    root: { props: Record<string, unknown> };
  }) => void)
  | null = null;
const mockPuckState = {
  appState: {
    ui: {
      leftSideBarWidth: 224,
      rightSideBarWidth: 280,
    },
  },
  dispatch: mockDispatch,
  selectedItem: null,
};

vi.mock('@puckeditor/core', () => ({
  Puck: ({
    height,
    iframe,
    onChange,
    overrides,
    renderHeaderActions,
    ui,
  }: {
    height: string;
    iframe?: { enabled?: boolean };
    onChange?: (data: {
      content: Array<{ props?: Record<string, unknown>; type: string }>;
      root: { props: Record<string, unknown> };
    }) => void;
    overrides?: {
      drawerItem?: (props: { children: ReactNode; name: string }) => ReactNode;
    };
    renderHeaderActions?: () => ReactNode;
    ui: { leftSideBarWidth: number; rightSideBarWidth: number };
  }) => {
    latestOnChange = onChange ?? null;

    return (
      <div
        data-testid="mock-puck"
        data-height={height}
        data-iframe-enabled={String(iframe?.enabled ?? true)}
        data-left-sidebar-width={String(ui.leftSideBarWidth)}
        data-right-sidebar-width={String(ui.rightSideBarWidth)}
      >
        {renderHeaderActions?.()}
        {overrides?.drawerItem?.({
          children: (
            <div data-puck-drawer-item data-testid="mock-drawer-item">
              Profile card
            </div>
          ),
          name: 'ProfileCard',
        })}
        <div className="_Puck_fake">
          <div className="_PuckLayout_fake">
            <div className="_PuckLayout-inner_fake">
              <div className="_PuckCanvas-inner_fake">
                <div className="_PuckCanvas-root_fake">
                  <div data-homepage-puck-root />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
  usePuck: () => mockPuckState,
}));

vi.mock('@/domains/homepage-management/editor/puck/homepage-puck-config', () => ({
  createHomepagePuckConfig: vi.fn(() => ({})),
}));

vi.mock('@/domains/homepage-management/editor/puck/homepage-puck-mappers', () => ({
  mapHomepageContentToPuckData: vi.fn((content: HomepageDraftContent) => ({
    content: content.components.map((component) => ({
      props: {
        ...component.props,
        id: component.id,
        visible: component.visible,
      },
      type: component.type,
    })),
    root: { props: {} },
  })),
  mapPuckDataToHomepageContent: vi.fn((data, version: string) => ({
    components: Array.isArray(data.content)
      ? data.content.map((item: { props?: Record<string, unknown>; type: string }, index: number) => ({
        id: String(item.props?.id ?? `component-${index + 1}`),
        order: index + 1,
        props: item.props ?? {},
        type: String(item.type),
        visible: item.props?.visible !== false,
      }))
      : [],
    version,
  })),
  mapPuckDataToHomepageTheme: vi.fn((data, theme: ThemeConfig) => theme),
}));

vi.mock('@/domains/homepage-management/editor/source/homepage-advanced-eject', () => ({
  markAdvancedSourceContent: vi.fn((content: HomepageDraftContent) => content),
}));

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    session: {
      user: {
        preferredLanguage: 'en',
      },
    },
  }),
}));

const content: HomepageDraftContent = {
  version: '1.0',
  components: [],
};

const theme: ThemeConfig = {
  preset: ThemePreset.SOFT,
  visualStyle: 'flat',
  colors: {
    primary: '#7B9EE0',
    accent: '#E0A0C0',
    background: '#FAFBFC',
    text: '#333333',
    textSecondary: '#888888',
  },
  background: {
    type: 'solid',
    value: '#FAFBFC',
  },
  card: {
    background: '#FFFFFF',
    borderRadius: 'large',
    shadow: 'small',
  },
  typography: {
    fontFamily: 'noto-sans',
    headingWeight: 'medium',
  },
  animation: {
    enableEntrance: true,
    enableHover: true,
    intensity: 'low',
  },
  decorations: {
    type: 'none',
  },
};

function TestHarness() {
  const { copy } = useHomepageEditorCopy();

  return (
    <HomepagePuckEditor
      content={content}
      copy={copy}
      fitToParent
      isAdvancedEjected={false}
      onContentChange={() => {}}
      onSaveDraft={() => {}}
      onThemeChange={() => {}}
      theme={theme}
    />
  );
}

describe('HomepagePuckEditor', () => {
  beforeEach(() => {
    mockDispatch.mockReset();
    mockDispatch.mockImplementation((action: { componentType?: string; type: string }) => {
      if (action.type === 'insert' && latestOnChange) {
        latestOnChange({
          content: [
            {
              props: {
                id: 'inserted-profile-card',
                visible: true,
              },
              type: action.componentType || 'ProfileCard',
            },
          ],
          root: {
            props: {},
          },
        });
      }
    });
    latestOnChange = null;
    mockPuckState.appState.ui.leftSideBarWidth = 224;
    mockPuckState.appState.ui.rightSideBarWidth = 280;
    window.localStorage.clear();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1440,
      writable: true,
    });
  });

  it('renders a full-height standalone shell with the scoped Puck layout overrides', () => {
    render(
      <RuntimeLocaleProvider>
        <TestHarness />
      </RuntimeLocaleProvider>,
    );

    const shell = document.querySelector('[data-homepage-puck-editor]');
    const styleText = Array.from(document.querySelectorAll('style'))
      .map((node) => node.textContent || '')
      .join('\n');

    expect(shell).not.toBeNull();
    expect(shell?.className).toContain('flex');
    expect(shell?.className).toContain('flex-1');
    expect(shell?.className).toContain('flex-col');
    expect(shell?.className).toContain('min-h-0');
    expect(shell?.className).toContain('overflow-auto');
    expect(screen.getByTestId('mock-puck')).toHaveAttribute('data-height', '100%');
    expect(screen.getByTestId('mock-puck')).toHaveAttribute('data-iframe-enabled', 'false');
    expect(styleText).toContain('[data-homepage-puck-editor] > [class*="_Puck_"]');
    expect(styleText).toContain('[data-homepage-puck-editor] [class*="_PuckLayout-inner_"]');
    expect(styleText).toContain('--puck-frame-width: minmax(0, 1fr);');
    expect(styleText).toContain('[data-homepage-puck-editor] [class*="_PuckCanvas-root_"]');
  });

  it('dispatches sanitized sidebar widths from persisted storage before the canvas reflows', async () => {
    window.localStorage.setItem(
      HOMEPAGE_PUCK_SIDEBAR_STORAGE_KEY,
      JSON.stringify({
        left: 1200,
        right: 900,
      }),
    );

    render(
      <RuntimeLocaleProvider>
        <TestHarness />
      </RuntimeLocaleProvider>,
    );

    expect(screen.getByTestId('mock-puck')).toHaveAttribute('data-left-sidebar-width', '360');
    expect(screen.getByTestId('mock-puck')).toHaveAttribute('data-right-sidebar-width', '360');

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'setUi',
        ui: {
          leftSideBarWidth: 360,
          rightSideBarWidth: 360,
        },
        recordHistory: false,
      });
    });
  });

  it('inserts the first block from the catalog when the draft is empty', async () => {
    const onContentChange = vi.fn();

    function EmptyHarness() {
      const { copy } = useHomepageEditorCopy();

      return (
        <HomepagePuckEditor
          content={content}
          copy={copy}
          fitToParent
          isAdvancedEjected={false}
          onContentChange={onContentChange}
          onSaveDraft={() => {}}
          onThemeChange={() => {}}
          theme={theme}
        />
      );
    }

    render(
      <RuntimeLocaleProvider>
        <EmptyHarness />
      </RuntimeLocaleProvider>,
    );

    expect(screen.getByText('No homepage blocks yet')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('mock-drawer-item'));

    await waitFor(() => {
      expect(onContentChange).toHaveBeenCalledWith({
        components: [
          {
            id: 'inserted-profile-card',
            order: 1,
            props: {
              id: 'inserted-profile-card',
              visible: true,
            },
            type: 'ProfileCard',
            visible: true,
          },
        ],
        version: '1.0',
      });
    });
  });
});
