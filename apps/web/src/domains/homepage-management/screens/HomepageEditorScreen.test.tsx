import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomepageEditorScreen } from '@/domains/homepage-management/screens/HomepageEditorScreen';
import { RuntimeLocaleProvider } from '@/platform/runtime/locale/locale-provider';

const mockRequest = vi.fn();
const mockPush = vi.fn();
const mockWindowOpen = vi.fn();
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

function renderWithLocale(ui: ReactElement) {
  return render(<RuntimeLocaleProvider>{ui}</RuntimeLocaleProvider>);
}

function setRuntimeLanguage(language: string) {
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    value: language,
  });
}

const baseTheme = {
  preset: 'soft',
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

describe('HomepageEditorScreen', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockPush.mockReset();
    mockWindowOpen.mockReset();
    window.localStorage.clear();
    Object.defineProperty(window, 'open', {
      configurable: true,
      value: mockWindowOpen,
    });
    mockSession.user.preferredLanguage = 'en';
    setRuntimeLanguage('en-US');
  });

  it('hydrates an existing draft, lets operators add a component, and saves the draft payload', async () => {
    let savedPayload: unknown = null;

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/talents/talent-1/homepage') {
        return {
          id: 'homepage-1',
          talentId: 'talent-1',
          isPublished: true,
          publishedVersion: {
            id: 'published-2',
            versionNumber: 2,
            createdAt: '2026-04-17T10:00:00.000Z',
            publishedAt: '2026-04-17T11:00:00.000Z',
            publishedBy: {
              id: 'user-1',
              username: 'publisher',
            },
          },
          draftVersion: {
            id: 'draft-3',
            versionNumber: 3,
            createdAt: '2026-04-17T12:00:00.000Z',
            publishedAt: null,
            publishedBy: null,
          },
          customDomain: 'fans.example.com',
          customDomainVerified: true,
          seoTitle: 'Tokino Sora',
          seoDescription: 'Official homepage',
          ogImageUrl: null,
          analyticsId: null,
          homepagePath: 'sora',
          homepageUrl: 'https://app.example.com/p/sora',
          createdAt: '2026-04-17T09:00:00.000Z',
          updatedAt: '2026-04-17T12:00:00.000Z',
          version: 3,
        };
      }

      if (path === '/api/v1/talents/talent-1/homepage/versions/draft-3') {
        return {
          id: 'draft-3',
          versionNumber: 3,
          status: 'draft',
          contentPreview: 'ProfileCard',
          componentCount: 1,
          content: {
            version: '1.0',
            components: [
              {
                id: 'profile-1',
                type: 'ProfileCard',
                visible: true,
                order: 1,
                props: {
                  displayName: 'Tokino Sora',
                  bio: 'Official homepage',
                  avatarUrl: '',
                  avatarShape: 'circle',
                },
              },
            ],
          },
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

      if (path === '/api/v1/talents/talent-1/homepage/draft' && init?.method === 'PATCH') {
        savedPayload = JSON.parse((init.body as string) || '{}');

        return {
          draftVersion: {
            id: 'draft-4',
            versionNumber: 4,
            contentHash: 'hash-123',
            updatedAt: '2026-04-17T12:30:00.000Z',
          },
          isNewVersion: true,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Homepage editor' })).toBeInTheDocument();
    expect(await screen.findByText('Draft v3')).toBeInTheDocument();
    expect(screen.queryByLabelText('Profile card JSON')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add block' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /Link button/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Visual' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Preview viewport')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByText('Preview viewport')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mobile' }));
    expect(screen.getByRole('button', { name: 'Mobile' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile card block' }));

    expect(screen.getByLabelText('Display name')).toHaveValue('Tokino Sora');
    expect(screen.queryByLabelText('Profile card JSON')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Advanced JSON' }));
    expect(screen.getByLabelText('Profile card JSON')).toBeInTheDocument();
    expect(screen.getByLabelText('Profile card JSON')).toHaveAttribute('name', 'component-json-profile-1');
    expect(screen.getByLabelText('Profile card JSON')).toHaveAttribute('spellcheck', 'false');
    expect(screen.queryByLabelText('Theme JSON')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit theme JSON' }));

    expect(screen.getByLabelText('Theme JSON')).toHaveAttribute('name', 'theme-json');
    expect(screen.getByLabelText('Theme JSON')).toHaveAttribute('spellcheck', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
    expect(screen.getByRole('button', { name: 'Hide catalog' })).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByRole('button', { name: /Link button/i }));

    expect(screen.getByRole('button', { name: 'Add block' })).toHaveAttribute('aria-expanded', 'false');

    expect(await screen.findByLabelText('Label')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Label'), {
      target: { value: 'Visit store' },
    });
    fireEvent.change(screen.getByLabelText('URL'), {
      target: { value: 'https://example.com/store' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save draft/i }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/homepage/draft',
        expect.objectContaining({
          method: 'PATCH',
        }),
      );
    });

    expect(savedPayload).toMatchObject({
      content: {
        components: [
          expect.objectContaining({
            type: 'ProfileCard',
          }),
          expect.objectContaining({
            type: 'LinkButton',
            props: expect.objectContaining({
              label: 'Visit store',
              url: 'https://example.com/store',
            }),
          }),
        ],
      },
    });

    expect(await screen.findByText('Homepage draft saved as v4.')).toBeInTheDocument();
  });

  it('removes an added component from the draft workspace before save', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/talents/talent-1/homepage') {
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
          seoTitle: null,
          seoDescription: null,
          ogImageUrl: null,
          analyticsId: null,
          homepagePath: 'sora',
          homepageUrl: 'https://app.example.com/p/sora',
          createdAt: '2026-04-17T09:00:00.000Z',
          updatedAt: '2026-04-17T12:00:00.000Z',
          version: 1,
        };
      }

      if (path === '/api/v1/talents/talent-1/homepage/versions/draft-1') {
        return {
          id: 'draft-1',
          versionNumber: 1,
          status: 'draft',
          contentPreview: '',
          componentCount: 0,
          content: {
            version: '1.0',
            components: [],
          },
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

      throw new Error(`Unhandled request: ${path}`);
    });

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Homepage editor' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
    fireEvent.click(screen.getByRole('button', { name: /Link button/i }));

    expect(await screen.findByLabelText('Label')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(screen.queryByLabelText('Label')).not.toBeInTheDocument();
    });
  });

  it('creates new homepage blocks with neutral default props instead of seeded sample copy', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/talents/talent-1/homepage') {
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
          seoTitle: null,
          seoDescription: null,
          ogImageUrl: null,
          analyticsId: null,
          homepagePath: 'sora',
          homepageUrl: 'https://app.example.com/p/sora',
          createdAt: '2026-04-17T09:00:00.000Z',
          updatedAt: '2026-04-17T12:00:00.000Z',
          version: 1,
        };
      }

      if (path === '/api/v1/talents/talent-1/homepage/versions/draft-1') {
        return {
          id: 'draft-1',
          versionNumber: 1,
          status: 'draft',
          contentPreview: '',
          componentCount: 0,
          content: {
            version: '1.0',
            components: [],
          },
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

      throw new Error(`Unhandled request: ${path}`);
    });

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Homepage editor' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
    fireEvent.click(screen.getByRole('button', { name: /Link button/i }));

    expect(await screen.findByLabelText('Label')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Advanced JSON' }));
    expect(await screen.findByLabelText('Link button JSON')).toHaveValue(
      JSON.stringify(
        {
          label: '',
          url: '',
          style: 'primary',
          fullWidth: false,
        },
        null,
        2,
      ),
    );
  });

  it('keeps Advanced JSON synchronized after structured block edits', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/talents/talent-1/homepage') {
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
          seoTitle: null,
          seoDescription: null,
          ogImageUrl: null,
          analyticsId: null,
          homepagePath: 'sora',
          homepageUrl: 'https://app.example.com/p/sora',
          createdAt: '2026-04-17T09:00:00.000Z',
          updatedAt: '2026-04-17T12:00:00.000Z',
          version: 1,
        };
      }

      if (path === '/api/v1/talents/talent-1/homepage/versions/draft-1') {
        return {
          id: 'draft-1',
          versionNumber: 1,
          status: 'draft',
          contentPreview: '',
          componentCount: 1,
          content: {
            version: '1.0',
            components: [
              {
                id: 'profile-1',
                type: 'ProfileCard',
                visible: true,
                order: 1,
                props: {
                  displayName: '',
                  bio: '',
                  avatarUrl: '',
                  avatarShape: 'circle',
                  nameFontSize: 'large',
                  bioMaxLines: 3,
                },
              },
            ],
          },
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

      throw new Error(`Unhandled request: ${path}`);
    });

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Homepage editor' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile card block' }));
    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: 'Updated Sora' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Advanced JSON' }));

    expect(screen.getByLabelText('Profile card JSON')).toHaveValue(
      JSON.stringify(
        {
          displayName: 'Updated Sora',
          bio: '',
          avatarUrl: '',
          avatarShape: 'circle',
          nameFontSize: 'large',
          bioMaxLines: 3,
        },
        null,
        2,
      ),
    );
  });

  it('lets advanced source edits update the draft save payload', async () => {
    let savedPayload: unknown = null;

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/talents/talent-1/homepage') {
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
          seoTitle: null,
          seoDescription: null,
          ogImageUrl: null,
          analyticsId: null,
          homepagePath: 'sora',
          homepageUrl: 'https://app.example.com/p/sora',
          createdAt: '2026-04-17T09:00:00.000Z',
          updatedAt: '2026-04-17T12:00:00.000Z',
          version: 1,
        };
      }

      if (path === '/api/v1/talents/talent-1/homepage/versions/draft-1') {
        return {
          id: 'draft-1',
          versionNumber: 1,
          status: 'draft',
          contentPreview: '',
          componentCount: 0,
          content: {
            version: '1.0',
            components: [],
          },
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

      if (path === '/api/v1/talents/talent-1/homepage/draft' && init?.method === 'PATCH') {
        savedPayload = JSON.parse((init.body as string) || '{}');

        return {
          draftVersion: {
            id: 'draft-2',
            versionNumber: 2,
            contentHash: 'hash-source',
            updatedAt: '2026-04-17T12:30:00.000Z',
          },
          isNewVersion: true,
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Homepage editor' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Advanced source' }));
    expect(screen.getByRole('button', { name: 'Advanced source' })).toHaveAttribute('aria-pressed', 'true');

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
      expect(savedPayload).toMatchObject({
        content: {
          components: [
            expect.objectContaining({
              id: 'source-rich-text',
              type: 'RichText',
              props: expect.objectContaining({
                contentHtml: '<p>Edited in source mode</p>',
                textAlign: 'center',
              }),
            }),
          ],
        },
      });
    });
  });

  it('blocks saving invalid advanced source and opens modal preview from source mode', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/talents/talent-1/homepage') {
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
          seoTitle: null,
          seoDescription: null,
          ogImageUrl: null,
          analyticsId: null,
          homepagePath: 'sora',
          homepageUrl: 'https://app.example.com/p/sora',
          createdAt: '2026-04-17T09:00:00.000Z',
          updatedAt: '2026-04-17T12:00:00.000Z',
          version: 1,
        };
      }

      if (path === '/api/v1/talents/talent-1/homepage/versions/draft-1') {
        return {
          id: 'draft-1',
          versionNumber: 1,
          status: 'draft',
          contentPreview: '',
          componentCount: 0,
          content: {
            version: '1.0',
            components: [],
          },
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

      throw new Error(`Unhandled request: ${path}`);
    });

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Homepage editor' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Advanced source' }));
    fireEvent.change(screen.getByLabelText('Homepage source'), {
      target: { value: '{}' },
    });

    expect(screen.getByText('Source must contain a content object with a components array and a theme object.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save draft/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(screen.getByRole('heading', { name: 'Homepage preview' })).toBeInTheDocument();
    expect(screen.getByText('Preview viewport')).toBeInTheDocument();
  });

  it('writes live preview snapshots and opens the two-page preview route', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/talents/talent-1/homepage') {
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
          seoTitle: null,
          seoDescription: null,
          ogImageUrl: null,
          analyticsId: null,
          homepagePath: 'sora',
          homepageUrl: 'https://app.example.com/p/sora',
          createdAt: '2026-04-17T09:00:00.000Z',
          updatedAt: '2026-04-17T12:00:00.000Z',
          version: 1,
        };
      }

      if (path === '/api/v1/talents/talent-1/homepage/versions/draft-1') {
        return {
          id: 'draft-1',
          versionNumber: 1,
          status: 'draft',
          contentPreview: 'ProfileCard',
          componentCount: 1,
          content: {
            version: '1.0',
            components: [
              {
                id: 'profile-1',
                type: 'ProfileCard',
                visible: true,
                order: 1,
                props: {
                  displayName: 'Tokino Sora',
                  bio: '',
                  avatarUrl: '',
                  avatarShape: 'circle',
                },
              },
            ],
          },
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

      throw new Error(`Unhandled request: ${path}`);
    });

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Homepage editor' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open live preview' }));

    await waitFor(() => {
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringMatching(/^\/tenant\/tenant-1\/talent\/talent-1\/homepage\/editor\/preview\?previewId=tenant-1\.talent-1\./),
        '_blank',
      );
    });

    const previewKey = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
      .find((key) => key?.startsWith('tcrn.homepage.editor.preview.tenant-1.talent-1.'));

    expect(previewKey).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile card block' }));
    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: 'Live Preview Sora' },
    });

    await waitFor(() => {
      const snapshot = JSON.parse(window.localStorage.getItem(previewKey || '') || '{}') as {
        hero?: { displayName?: string };
      };

      expect(snapshot.hero?.displayName).toBe('Live Preview Sora');
    });
  });

  it('hydrates from the published version when no draft exists yet', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/talents/talent-1/homepage') {
        return {
          id: 'homepage-1',
          talentId: 'talent-1',
          isPublished: true,
          publishedVersion: {
            id: 'published-2',
            versionNumber: 2,
            createdAt: '2026-04-17T10:00:00.000Z',
            publishedAt: '2026-04-17T11:00:00.000Z',
            publishedBy: {
              id: 'user-1',
              username: 'publisher',
            },
          },
          draftVersion: null,
          customDomain: null,
          customDomainVerified: false,
          seoTitle: 'Sora Homepage',
          seoDescription: 'Published homepage source',
          ogImageUrl: null,
          analyticsId: null,
          homepagePath: 'sora',
          homepageUrl: 'https://app.example.com/p/sora',
          createdAt: '2026-04-17T09:00:00.000Z',
          updatedAt: '2026-04-17T12:00:00.000Z',
          version: 2,
        };
      }

      if (path === '/api/v1/talents/talent-1/homepage/versions/published-2') {
        return {
          id: 'published-2',
          versionNumber: 2,
          status: 'published',
          contentPreview: 'RichText',
          componentCount: 1,
          content: {
            version: '1.0',
            components: [
              {
                id: 'richtext-1',
                type: 'RichText',
                visible: true,
                order: 1,
                props: {
                  contentHtml: '<p>Hello world</p>',
                  textAlign: 'left',
                },
              },
            ],
          },
          theme: baseTheme,
          publishedAt: '2026-04-17T11:00:00.000Z',
          publishedBy: {
            id: 'user-1',
            username: 'publisher',
          },
          createdAt: '2026-04-17T10:00:00.000Z',
          createdBy: {
            id: 'user-1',
            username: 'publisher',
          },
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByText('Published v2')).toBeInTheDocument();
    expect(
      screen.getByText(
        'No draft exists yet, so the editor starts from the published version.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Rich text JSON')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Rich text block' }));

    expect(screen.getByRole('textbox', { name: 'Content' })).toHaveValue('<p>Hello world</p>');
    fireEvent.click(screen.getByRole('button', { name: 'Advanced JSON' }));
    expect(screen.getByLabelText('Rich text JSON')).toBeInTheDocument();
  });

  it('guards explicit leave actions when the draft has unsaved changes', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/talents/talent-1/homepage') {
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
          seoTitle: null,
          seoDescription: null,
          ogImageUrl: null,
          analyticsId: null,
          homepagePath: 'sora',
          homepageUrl: 'https://app.example.com/p/sora',
          createdAt: '2026-04-17T09:00:00.000Z',
          updatedAt: '2026-04-17T12:00:00.000Z',
          version: 1,
        };
      }

      if (path === '/api/v1/talents/talent-1/homepage/versions/draft-1') {
        return {
          id: 'draft-1',
          versionNumber: 1,
          status: 'draft',
          contentPreview: '',
          componentCount: 0,
          content: {
            version: '1.0',
            components: [],
          },
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

      throw new Error(`Unhandled request: ${path}`);
    });

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Homepage editor' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
    fireEvent.click(screen.getByRole('button', { name: /Link button/i }));
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to homepage management' }));

    expect(screen.getByRole('heading', { name: 'Leave homepage editor?' })).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Leave editor' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/tenant/tenant-1/talent/talent-1/homepage');
    });
  });

  it('allows explicit leave actions immediately when the editor is clean', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/talents/talent-1/homepage') {
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
          seoTitle: null,
          seoDescription: null,
          ogImageUrl: null,
          analyticsId: null,
          homepagePath: 'sora',
          homepageUrl: 'https://app.example.com/p/sora',
          createdAt: '2026-04-17T09:00:00.000Z',
          updatedAt: '2026-04-17T12:00:00.000Z',
          version: 1,
        };
      }

      if (path === '/api/v1/talents/talent-1/homepage/versions/draft-1') {
        return {
          id: 'draft-1',
          versionNumber: 1,
          status: 'draft',
          contentPreview: '',
          componentCount: 0,
          content: {
            version: '1.0',
            components: [],
          },
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

      throw new Error(`Unhandled request: ${path}`);
    });

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByText('All changes saved')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to homepage management' }));

    expect(mockPush).toHaveBeenCalledWith('/tenant/tenant-1/talent/talent-1/homepage');
    expect(screen.queryByRole('heading', { name: 'Leave homepage editor?' })).not.toBeInTheDocument();
  });

  it('registers beforeunload protection while unsaved changes exist', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/talents/talent-1/homepage') {
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
          seoTitle: null,
          seoDescription: null,
          ogImageUrl: null,
          analyticsId: null,
          homepagePath: 'sora',
          homepageUrl: 'https://app.example.com/p/sora',
          createdAt: '2026-04-17T09:00:00.000Z',
          updatedAt: '2026-04-17T12:00:00.000Z',
          version: 1,
        };
      }

      if (path === '/api/v1/talents/talent-1/homepage/versions/draft-1') {
        return {
          id: 'draft-1',
          versionNumber: 1,
          status: 'draft',
          contentPreview: '',
          componentCount: 0,
          content: {
            version: '1.0',
            components: [],
          },
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

      throw new Error(`Unhandled request: ${path}`);
    });

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Homepage editor' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
    fireEvent.click(screen.getByRole('button', { name: /Link button/i }));

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

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/talents/talent-1/homepage') {
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
          seoTitle: null,
          seoDescription: null,
          ogImageUrl: null,
          analyticsId: null,
          homepagePath: 'sora',
          homepageUrl: 'https://app.example.com/p/sora',
          createdAt: '2026-04-17T09:00:00.000Z',
          updatedAt: '2026-04-17T12:00:00.000Z',
          version: 1,
        };
      }

      if (path === '/api/v1/talents/talent-1/homepage/versions/draft-1') {
        return {
          id: 'draft-1',
          versionNumber: 1,
          status: 'draft',
          contentPreview: '',
          componentCount: 0,
          content: {
            version: '1.0',
            components: [],
          },
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

      throw new Error(`Unhandled request: ${path}`);
    });

    renderWithLocale(<HomepageEditorScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: '主页编辑器' })).toBeInTheDocument();
    expect(screen.getByText('组件目录')).toBeInTheDocument();
    expect(screen.getByText('草稿区块')).toBeInTheDocument();
    expect(screen.getByText('编辑模式')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '预览' })).toBeInTheDocument();
    expect(screen.getByText('已全部保存')).toBeInTheDocument();
  });
});
