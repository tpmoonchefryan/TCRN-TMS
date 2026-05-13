import { type ThemeConfig,ThemePreset } from '@tcrn/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type HomepageDraftContent,
  type HomepageResponse,
  type HomepageVersionDetailResponse,
} from '@/domains/homepage-management/api/homepage.api';
import { HomepageEditorScreen } from '@/domains/homepage-management/screens/HomepageEditorScreen';
import { RuntimeLocaleProvider } from '@/platform/runtime/locale/locale-provider';

const mockRequest = vi.fn();
const mockPush = vi.fn();
const mockSession = {
  tenantId: 'tenant-1',
  tenantName: 'Test Tenant',
  user: {
    id: 'user-1',
    preferredLanguage: 'en',
  },
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
    session: mockSession,
  }),
}));

vi.mock('@/domains/homepage-management/editor/puck/HomepagePuckEditor', () => ({
  HomepagePuckEditor: ({
    content,
    fitToParent,
    onContentChange,
    onSaveDraft,
    onThemeChange,
    onUploadImage,
  }: {
    content: HomepageDraftContent;
    fitToParent?: boolean;
    onContentChange: (content: HomepageDraftContent) => void;
    onSaveDraft: () => void;
    onThemeChange: (theme: ThemeConfig) => void;
    onUploadImage?: (file: File) => Promise<string>;
  }) => (
    <div data-fit-to-parent={String(Boolean(fitToParent))} data-testid="homepage-puck-editor">
      <p>Puck visual editor</p>
      <button
        type="button"
        onClick={() => {
          onContentChange({
            ...content,
            components: [
              ...content.components,
              {
                id: 'puck-link-1',
                type: 'LinkButton',
                visible: true,
                order: content.components.length + 1,
                props: {
                  fullWidth: false,
                  label: 'Visit store',
                  style: 'primary',
                  url: 'https://example.com/store',
                },
              },
            ],
          });
        }}
      >
        Mock Puck add link
      </button>
      <button
        type="button"
        onClick={() => {
          onThemeChange({
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
              value: '#112233',
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
          });
        }}
      >
        Mock Puck change background
      </button>
      <button
        type="button"
        onClick={() => {
          onContentChange({
            ...content,
            components: content.components.map((component) => (
              component.type === 'ProfileCard'
                ? {
                  ...component,
                  props: {
                    ...component.props,
                    displayName: 'Live Preview Sora',
                  },
                }
                : component
            )),
          });
        }}
      >
        Mock Puck rename profile
      </button>
      <button
        type="button"
        onClick={async () => {
          const imageUrl = await onUploadImage?.(new File(['avatar'], 'avatar.png', { type: 'image/png' }));

          onContentChange({
            ...content,
            components: content.components.map((component) => (
              component.type === 'ProfileCard'
                ? {
                  ...component,
                  props: {
                    ...component.props,
                    avatarUrl: imageUrl,
                  },
                }
                : component
            )),
          });
        }}
      >
        Mock Puck upload image
      </button>
      <button type="button" onClick={onSaveDraft}>
        Mock Puck save
      </button>
    </div>
  ),
}));

function renderWithLocale(ui: ReactElement) {
  return render(<RuntimeLocaleProvider>{ui}</RuntimeLocaleProvider>);
}

function setRuntimeLanguage(language: string) {
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    value: language,
  });
}

const baseTheme: ThemeConfig = {
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
    type: 'gradient',
    value: 'linear-gradient(135deg, #F5F7FA 0%, #E8ECF1 100%)',
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
} as const;

const defaultContent: HomepageDraftContent = {
  version: '1.0',
  components: [
    {
      id: 'profile-1',
      type: 'ProfileCard',
      visible: true,
      order: 1,
      props: {
        avatarShape: 'circle',
        avatarUrl: '',
        bio: 'Official homepage',
        displayName: 'Tokino Sora',
      },
    },
  ],
};

function buildHomepage(overrides: Partial<HomepageResponse> = {}): HomepageResponse {
  return {
    id: 'homepage-1',
    talentId: 'talent-1',
    isPublished: false,
    publishedVersion: null,
    draftVersion: {
      id: 'draft-1',
      versionNumber: 1,
      createdAt: '2026-04-17T12:00:00.000Z',
      publishedAt: null,
      publishedBy: null,
    },
    customDomain: null,
    customDomainVerified: false,
    seoTitle: 'Tokino Sora',
    seoDescription: 'Official homepage',
    ogImageUrl: null,
    analyticsId: null,
    homepagePath: 'sora',
    homepageUrl: 'https://app.example.com/p/sora',
    createdAt: '2026-04-17T09:00:00.000Z',
    updatedAt: '2026-04-17T12:00:00.000Z',
    version: 1,
    ...overrides,
  };
}

function buildVersion(content: HomepageDraftContent = defaultContent): HomepageVersionDetailResponse {
  return {
    id: 'draft-1',
    versionNumber: 1,
    status: 'draft',
    contentPreview: content.components.map((component) => component.type).join(', '),
    componentCount: content.components.length,
    content,
    theme: baseTheme,
    publishedAt: null,
    publishedBy: null,
    createdAt: '2026-04-17T12:00:00.000Z',
    createdBy: {
      id: 'user-2',
      username: 'editor',
    },
  };
}

function mockHomepageRequests({
  content = defaultContent,
  homepage = buildHomepage(),
  onSave,
}: {
  content?: HomepageDraftContent;
  homepage?: HomepageResponse;
  onSave?: (payload: unknown) => void;
} = {}) {
  mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path === '/api/v1/talents/talent-1/homepage') {
      return homepage;
    }

    if (path === '/api/v1/talents/talent-1/homepage/versions/draft-1') {
      return buildVersion(content);
    }

    if (path === '/api/v1/talents/talent-1/homepage/draft' && init?.method === 'PATCH') {
      onSave?.(JSON.parse((init.body as string) || '{}'));

      return {
        draftVersion: {
          id: 'draft-2',
          versionNumber: 2,
          contentHash: 'hash-123',
          updatedAt: '2026-04-17T12:30:00.000Z',
        },
        isNewVersion: true,
      };
    }

    if (path === '/api/v1/talents/talent-1/homepage/assets' && init?.method === 'POST') {
      return {
        url: '/api/v1/public/assets/homepage-assets/tenant_default/talent-1/avatar.png',
      };
    }

    throw new Error(`Unhandled request: ${path}`);
  });
}

describe('HomepageEditorScreen', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockPush.mockReset();
    window.localStorage.clear();
    mockSession.user.preferredLanguage = 'en';
    setRuntimeLanguage('en-US');
  });

  it('uses the Puck visual editor by default and saves Puck changes', async () => {
    let savedPayload: unknown = null;
    mockHomepageRequests({
      onSave: (payload) => {
        savedPayload = payload;
      },
    });

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Homepage editor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Visual' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('homepage-puck-editor')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add block' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mock Puck add link' }));
    fireEvent.click(screen.getByRole('button', { name: /Save draft/i }));

    await waitFor(() => {
      expect(savedPayload).toMatchObject({
        content: {
          components: [
            expect.objectContaining({ type: 'ProfileCard' }),
            expect.objectContaining({
              id: 'puck-link-1',
              type: 'LinkButton',
              props: expect.objectContaining({
                label: 'Visit store',
                url: 'https://example.com/store',
              }),
            }),
          ],
        },
      });
    });

    expect(await screen.findByText('Homepage draft saved as v2.')).toBeInTheDocument();
  });

  it('uploads Puck images as homepage assets before saving the draft JSON', async () => {
    let savedPayload: { content?: HomepageDraftContent } | null = null;
    mockHomepageRequests({
      onSave: (payload) => {
        savedPayload = payload as { content?: HomepageDraftContent };
      },
    });

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Homepage editor' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mock Puck upload image' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/homepage/assets',
        expect.objectContaining({
          body: expect.any(FormData),
          method: 'POST',
        }),
      );
    });
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Save draft/i }));

    await waitFor(() => {
      expect(savedPayload?.content?.components[0]?.props.avatarUrl).toBe(
        '/api/v1/public/assets/homepage-assets/tenant_default/talent-1/avatar.png',
      );
      expect(JSON.stringify(savedPayload)).not.toContain('data:image/');
    });
  });

  it('opens Dev Mode without ejecting the draft and shows inspector metadata', async () => {
    mockHomepageRequests();

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Homepage editor' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dev Mode' }));

    expect(screen.getByRole('button', { name: 'Dev Mode' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Visual' })).not.toBeDisabled();
    expect(screen.getByTestId('homepage-puck-editor')).toBeInTheDocument();
    expect(screen.getByText('Selected block')).toBeInTheDocument();
    expect(screen.getByText('ProfileCard')).toBeInTheDocument();
    expect(screen.getByText('Layout tokens')).toBeInTheDocument();
    expect(screen.getByText('Schema JSON')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/"displayName": "Tokino Sora"/)).toBeInTheDocument();
  });

  it('marks advanced source saves as one-way advanced content', async () => {
    let savedPayload: { content?: HomepageDraftContent } | null = null;
    mockHomepageRequests({
      onSave: (payload) => {
        savedPayload = payload as { content?: HomepageDraftContent };
      },
    });

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Homepage editor' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Advanced source' }));
    fireEvent.change(screen.getByLabelText('Homepage source'), {
      target: {
        value: JSON.stringify({
          content: {
            version: '1.0',
            components: [
              {
                id: 'source-rich-text',
                type: 'RichText',
                visible: true,
                order: 1,
                props: {
                  contentHtml: '<p>Edited in source mode</p>',
                  textAlign: 'center',
                },
              },
            ],
          },
          theme: baseTheme,
        }),
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save draft/i }));

    await waitFor(() => {
      expect(savedPayload?.content?.version).toBe('1.0+advanced-source');
      expect(savedPayload?.content?.components).toEqual([
        expect.objectContaining({
          id: 'source-rich-text',
          type: 'RichText',
        }),
      ]);
    });
  });

  it('blocks unsafe advanced source before save', async () => {
    const onSave = vi.fn();
    mockHomepageRequests({ onSave });

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Homepage editor' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Advanced source' }));
    fireEvent.change(screen.getByLabelText('Homepage source'), {
      target: {
        value: JSON.stringify({
          content: {
            version: '1.0',
            components: [
              {
                id: 'unsafe-1',
                type: 'RichText',
                visible: true,
                order: 1,
                props: {
                  contentHtml: '<script>alert(1)</script>',
                },
              },
            ],
          },
          theme: baseTheme,
        }),
      },
    });

    expect(screen.getByText('Source cannot include scripts, event handlers, inline style attributes, unsafe URLs, or unrestricted HTML/CSS.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save draft/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Save draft/i }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('locks direct visual switching after advanced eject and restores the low-code snapshot explicitly', async () => {
    mockHomepageRequests();

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Homepage editor' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Advanced source' }));

    expect(screen.getByRole('button', { name: 'Advanced source' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Visual' })).toBeDisabled();
    expect(screen.getByText('This draft has entered Advanced source mode. Restore the low-code snapshot to return to Visual editing.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restore low-code snapshot' }));

    expect(screen.getByRole('button', { name: 'Visual' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('homepage-puck-editor')).toBeInTheDocument();
    expect(screen.getByText('Low-code snapshot restored. Review the visual editor before saving.')).toBeInTheDocument();
  });

  it('keeps modal preview and live preview snapshot behavior', async () => {
    mockHomepageRequests();

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Homepage editor' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByRole('heading', { name: 'Homepage preview' })).toBeInTheDocument();
    expect(document.querySelector('[data-homepage-preview-canvas]')?.getAttribute('style')).toContain('linear-gradient');
    fireEvent.click(screen.getByRole('button', { name: 'Mock Puck change background' }));
    expect(document.querySelector('[data-homepage-preview-canvas]')?.getAttribute('style')).toContain('rgb(17, 34, 51)');
    fireEvent.click(screen.getByRole('button', { name: 'Mobile' }));
    expect(screen.getByRole('button', { name: 'Mobile' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Homepage preview' })).not.toBeInTheDocument();
    });

    const livePreviewLink = screen.getByRole('link', { name: 'Open live preview' });
    expect(livePreviewLink).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/homepage-editor\/tenant-1\/talent-1\/preview\?previewId=tenant-1\.talent-1\./),
    );
    expect(livePreviewLink).toHaveAttribute('target', '_blank');

    fireEvent.click(livePreviewLink);

    await waitFor(() => {
      expect(window.localStorage.length).toBeGreaterThan(0);
    });

    const previewKey = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
      .find((key) => key?.startsWith('tcrn.homepage.editor.preview.tenant-1.talent-1.'));

    expect(previewKey).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Mock Puck rename profile' }));

    await waitFor(() => {
      const snapshot = JSON.parse(window.localStorage.getItem(previewKey || '') || '{}') as {
        hero?: { displayName?: string };
        theme?: { background?: { value?: string } };
      };

      expect(snapshot.hero?.displayName).toBe('Live Preview Sora');
      expect(snapshot.theme?.background?.value).toBe('#112233');
    });
  });

  it('renders standalone editor chrome without summary cards and uses the shell-free preview path', async () => {
    mockHomepageRequests();

    const { container } = renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" standalone />);

    expect(await screen.findByRole('button', { name: 'Exit editor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dev Mode' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page info' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Homepage editor' })).not.toBeInTheDocument();
    expect(screen.queryByText('Tenant')).not.toBeInTheDocument();
    expect(screen.queryByText('Source')).not.toBeInTheDocument();
    expect(screen.queryByText('Blocks')).not.toBeInTheDocument();
    expect(screen.queryByText('Homepage URL')).not.toBeInTheDocument();
    expect(screen.getByTestId('homepage-puck-editor')).toBeInTheDocument();
    expect(screen.getByTestId('homepage-puck-editor')).toHaveAttribute('data-fit-to-parent', 'true');
    expect(container.firstElementChild?.className).toContain('overflow-hidden');
    expect(container.firstElementChild?.className).toContain('max-h-[100dvh]');
    expect(container.querySelector('.overscroll-contain')?.className).toContain('overflow-y-auto');

    fireEvent.click(screen.getByRole('button', { name: 'Page info' }));

    expect(screen.getByRole('heading', { name: 'Page info' })).toBeInTheDocument();
    expect(screen.getByText('Tenant')).toBeInTheDocument();
    expect(screen.getByText('Homepage URL')).toBeInTheDocument();
    expect(screen.getByTestId('homepage-editor-page-info-summary').className).toContain('auto-fit');

    const livePreviewLink = screen.getByRole('link', { name: 'Open live preview' });
    expect(livePreviewLink).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/homepage-editor\/tenant-1\/talent-1\/preview\?previewId=tenant-1\.talent-1\./),
    );
    expect(livePreviewLink).toHaveAttribute('target', '_blank');

    fireEvent.click(livePreviewLink);

    await waitFor(() => {
      expect(window.localStorage.length).toBeGreaterThan(0);
    });
  });

  it('guards explicit leave actions when the draft has unsaved changes', async () => {
    mockHomepageRequests();

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Homepage editor' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mock Puck add link' }));
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to homepage management' }));

    expect(screen.getByRole('heading', { name: 'Leave homepage editor?' })).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Leave editor' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/tenant/tenant-1/talent/talent-1/homepage');
    });
  });

  it('registers beforeunload protection while unsaved changes exist', async () => {
    mockHomepageRequests();

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Homepage editor' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mock Puck add link' }));

    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    Object.defineProperty(event, 'returnValue', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(event.returnValue).toBe('');
  });

  it('renders localized homepage editor copy for zh locale', async () => {
    mockSession.user.preferredLanguage = 'zh';
    setRuntimeLanguage('zh-CN');
    mockHomepageRequests({
      content: {
        version: '1.0',
        components: [],
      },
    });

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: '主页编辑器' })).toBeInTheDocument();
    expect(screen.getByText('编辑模式')).toBeInTheDocument();
    expect(screen.getByText('Puck visual editor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '预览' })).toBeInTheDocument();
    expect(screen.getByText('已全部保存')).toBeInTheDocument();
  });
});
