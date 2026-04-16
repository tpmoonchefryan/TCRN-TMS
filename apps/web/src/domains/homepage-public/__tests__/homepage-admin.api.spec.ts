// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockHomepageGet = vi.hoisted(() => vi.fn());
const mockDomainGetConfig = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/modules/content', () => ({
  homepageApi: {
    get: (...args: unknown[]) => mockHomepageGet(...args),
  },
}));

vi.mock('@/lib/api/modules/configuration', () => ({
  talentDomainApi: {
    getConfig: (...args: unknown[]) => mockDomainGetConfig(...args),
  },
}));

import {
  buildHomepagePreviewPath,
  createHomepageAdminStatusFallback,
  homepageAdminApi,
  mapHomepageAdminStatus,
} from '@/domains/homepage-public/api/homepage-admin.api';

describe('homepageAdminApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps homepage and domain responses into the admin status view model', async () => {
    mockHomepageGet.mockResolvedValue({
      success: true,
      data: {
        id: 'homepage-1',
        talentId: 'talent-1',
        isPublished: true,
        publishedVersion: {
          id: 'version-published',
          versionNumber: 2,
          content: {},
          theme: {},
          publishedAt: '2026-04-13T01:00:00.000Z',
          publishedBy: null,
          createdAt: '2026-04-12T01:00:00.000Z',
        },
        draftVersion: {
          id: 'version-draft',
          versionNumber: 3,
          content: {},
          theme: {},
          publishedAt: null,
          publishedBy: null,
          createdAt: '2026-04-13T02:00:00.000Z',
        },
        customDomain: null,
        customDomainVerified: false,
        seoTitle: null,
        seoDescription: null,
        ogImageUrl: null,
        analyticsId: null,
        homepagePath: 'p/demo-home',
        homepageUrl: 'https://example.com/p/demo-home',
        createdAt: '2026-04-12T00:00:00.000Z',
        updatedAt: '2026-04-13T02:00:00.000Z',
        version: 3,
      },
    });
    mockDomainGetConfig.mockResolvedValue({
      data: {
        customDomain: 'demo.example.com',
        customDomainVerified: true,
      },
    });

    const status = await homepageAdminApi.getStatus('talent-1');

    expect(status).toEqual({
      isPublished: true,
      lastPublishedAt: '2026-04-13T01:00:00.000Z',
      publishedAt: '2026-04-13T01:00:00.000Z',
      pageViews: 0,
      customDomain: 'demo.example.com',
      customDomainVerified: true,
      hasDraftChanges: true,
      draftUpdatedAt: '2026-04-13T02:00:00.000Z',
      homepagePath: 'p/demo-home',
    });
  });

  it('provides deterministic helpers for preview path and fallback state', () => {
    expect(buildHomepagePreviewPath('p/demo-home', 'DEMO')).toBe('demo-home');
    expect(buildHomepagePreviewPath(null, 'DEMO')).toBe('demo');

    expect(
      createHomepageAdminStatusFallback({
        path: 'demo-home',
      }),
    ).toEqual({
      isPublished: false,
      pageViews: 0,
      customDomain: null,
      customDomainVerified: false,
      hasDraftChanges: false,
      homepagePath: 'demo-home',
    });

    expect(
      mapHomepageAdminStatus(
        {
          id: 'homepage-2',
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
          homepagePath: null,
          homepageUrl: 'https://example.com/p/demo',
          createdAt: '2026-04-12T00:00:00.000Z',
          updatedAt: '2026-04-13T02:00:00.000Z',
          version: 1,
        },
        null,
      ),
    ).toEqual({
      isPublished: false,
      lastPublishedAt: undefined,
      publishedAt: undefined,
      pageViews: 0,
      customDomain: null,
      customDomainVerified: false,
      hasDraftChanges: false,
      draftUpdatedAt: undefined,
      homepagePath: null,
    });
  });
});
