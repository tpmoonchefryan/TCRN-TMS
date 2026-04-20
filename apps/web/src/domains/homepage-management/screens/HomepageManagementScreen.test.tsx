import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomepageManagementScreen } from '@/domains/homepage-management/screens/HomepageManagementScreen';

const mockRequest = vi.fn();
const localeState = {
  currentLocale: 'en' as 'en' | 'zh' | 'ja',
};

HTMLDialogElement.prototype.showModal = vi.fn(function mockShowModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
});
HTMLDialogElement.prototype.close = vi.fn(function mockClose(this: HTMLDialogElement) {
  this.removeAttribute('open');
});

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    request: mockRequest,
    session: {
      tenantName: 'Test Tenant',
    },
  }),
}));

vi.mock('@/platform/runtime/locale/locale-provider', () => ({
  useRuntimeLocale: () => localeState,
}));

describe('HomepageManagementScreen', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    localeState.currentLocale = 'en';
  });

  it('loads the homepage workspace and filters version history', async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/talents/talent-1/homepage') {
        return {
          id: 'homepage-1',
          talentId: 'talent-1',
          isPublished: true,
          publishedVersion: {
            id: 'version-2',
            versionNumber: 2,
            createdAt: '2026-04-17T10:00:00.000Z',
            publishedAt: '2026-04-17T11:00:00.000Z',
            publishedBy: {
              id: 'user-1',
              username: 'publisher',
            },
          },
          draftVersion: {
            id: 'version-3',
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

      if (path === '/api/v1/talents/talent-1/homepage/versions?page=1&pageSize=20') {
        return {
          items: [
            {
              id: 'version-3',
              versionNumber: 3,
              status: 'draft',
              contentPreview: 'HeroBanner, ProfileCard',
              componentCount: 2,
              publishedAt: null,
              publishedBy: null,
              createdAt: '2026-04-17T12:00:00.000Z',
              createdBy: {
                id: 'user-2',
                username: 'editor',
              },
            },
            {
              id: 'version-2',
              versionNumber: 2,
              status: 'published',
              contentPreview: 'ProfileCard, Schedule',
              componentCount: 2,
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
            },
          ],
          meta: {
            total: 2,
          },
        };
      }

      if (path === '/api/v1/talents/talent-1/homepage/versions?page=1&pageSize=20&status=published') {
        return {
          items: [
            {
              id: 'version-2',
              versionNumber: 2,
              status: 'published',
              contentPreview: 'ProfileCard, Schedule',
              componentCount: 2,
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
            },
          ],
          meta: {
            total: 1,
          },
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<HomepageManagementScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: 'Homepage management' })).toBeInTheDocument();
    expect(await screen.findByText('HeroBanner, ProfileCard')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open editor/i })).toHaveAttribute(
      'href',
      '/tenant/tenant-1/talent/talent-1/homepage/editor',
    );
    expect(screen.queryByRole('link', { name: 'Manage public address' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Published' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/homepage/versions?page=1&pageSize=20&status=published',
      );
    });

    expect(await screen.findByText('ProfileCard, Schedule')).toBeInTheDocument();
    expect(screen.queryByText('HeroBanner, ProfileCard')).not.toBeInTheDocument();
  });

  it('renders localized homepage management copy for zh locale', async () => {
    localeState.currentLocale = 'zh';

    mockRequest.mockImplementation(async (path: string) => {
      if (path === '/api/v1/talents/talent-1/homepage') {
        return {
          id: 'homepage-1',
          talentId: 'talent-1',
          isPublished: false,
          publishedVersion: null,
          draftVersion: null,
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

      if (path === '/api/v1/talents/talent-1/homepage/versions?page=1&pageSize=20') {
        return {
          items: [],
          meta: {
            total: 0,
          },
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<HomepageManagementScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('heading', { name: '主页管理' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '打开编辑器' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '管理公开地址' })).not.toBeInTheDocument();
    expect(screen.getByText('公开状态')).toBeInTheDocument();
    expect(screen.getByText('当前筛选下没有主页版本')).toBeInTheDocument();
  });

  it('publishes the draft through the shared confirm dialog and refreshes the workspace', async () => {
    let isPublished = false;
    let publishedVersionNumber: number | null = null;

    mockRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/v1/talents/talent-1/homepage') {
        return {
          id: 'homepage-1',
          talentId: 'talent-1',
          isPublished,
          publishedVersion:
            publishedVersionNumber === null
              ? null
              : {
                  id: 'version-3',
                  versionNumber: publishedVersionNumber,
                  createdAt: '2026-04-17T12:00:00.000Z',
                  publishedAt: '2026-04-17T12:10:00.000Z',
                  publishedBy: {
                    id: 'user-1',
                    username: 'publisher',
                  },
                },
          draftVersion: {
            id: 'version-3',
            versionNumber: 3,
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
          version: 3,
        };
      }

      if (path === '/api/v1/talents/talent-1/homepage/versions?page=1&pageSize=20') {
        return {
          items: [
            {
              id: 'version-3',
              versionNumber: 3,
              status: isPublished ? 'published' : 'draft',
              contentPreview: 'HeroBanner, ProfileCard',
              componentCount: 2,
              publishedAt: isPublished ? '2026-04-17T12:10:00.000Z' : null,
              publishedBy: isPublished
                ? {
                    id: 'user-1',
                    username: 'publisher',
                  }
                : null,
              createdAt: '2026-04-17T12:00:00.000Z',
              createdBy: {
                id: 'user-2',
                username: 'editor',
              },
            },
          ],
          meta: {
            total: 1,
          },
        };
      }

      if (path === '/api/v1/talents/talent-1/homepage/publish' && init?.method === 'POST') {
        isPublished = true;
        publishedVersionNumber = 3;
        return {
          publishedVersion: {
            id: 'version-3',
            versionNumber: 3,
            publishedAt: '2026-04-17T12:10:00.000Z',
          },
          homepageUrl: 'https://app.example.com/p/sora',
          cdnPurgeStatus: 'success',
        };
      }

      throw new Error(`Unhandled request: ${path}`);
    });

    render(<HomepageManagementScreen tenantId="tenant-1" talentId="talent-1" />);

    expect(await screen.findByRole('button', { name: /Publish draft/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Publish draft/i }));

    expect(await screen.findByText('Publish current draft?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Publish homepage' }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/v1/talents/talent-1/homepage/publish',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({}),
        }),
      );
    });

    expect(await screen.findByText('Homepage draft published.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Unpublish/i })).toBeInTheDocument();
    expect(screen.getAllByText('Published').length).toBeGreaterThan(0);
  });
});
