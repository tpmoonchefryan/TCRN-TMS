// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { talentDomainApi } from '@/lib/api/modules/configuration';
import {
  homepageApi,
  type HomepagePublishResponse,
  type HomepageResponse,
} from '@/lib/api/modules/content';
import type { TalentInfo } from '@/platform/state/talent-store';

interface TalentDomainConfig {
  customDomain: string | null;
  customDomainVerified: boolean;
}

export interface HomepageAdminStatus {
  isPublished: boolean;
  lastPublishedAt?: string;
  publishedAt?: string;
  pageViews?: number;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  hasDraftChanges?: boolean;
  draftUpdatedAt?: string;
  homepagePath?: string | null;
}

export function mapHomepageAdminStatus(
  homepage: HomepageResponse,
  domainConfig: TalentDomainConfig | null | undefined,
): HomepageAdminStatus {
  const publishedAt = homepage.publishedVersion?.publishedAt ?? null;

  return {
    isPublished: homepage.isPublished,
    lastPublishedAt: publishedAt ?? undefined,
    publishedAt: publishedAt ?? undefined,
    pageViews: 0,
    customDomain: domainConfig?.customDomain || homepage.customDomain || null,
    customDomainVerified: domainConfig?.customDomainVerified ?? homepage.customDomainVerified ?? false,
    hasDraftChanges:
      homepage.draftVersion !== null &&
      (homepage.publishedVersion === null || homepage.draftVersion.id !== homepage.publishedVersion.id),
    draftUpdatedAt: homepage.draftVersion?.createdAt,
    homepagePath: homepage.homepagePath,
  };
}

export function createHomepageAdminStatusFallback(
  talent: Pick<TalentInfo, 'path'>,
): HomepageAdminStatus {
  return {
    isPublished: false,
    pageViews: 0,
    customDomain: null,
    customDomainVerified: false,
    hasDraftChanges: false,
    homepagePath: talent.path,
  };
}

export function buildHomepagePreviewPath(
  homepagePath: string | null | undefined,
  fallbackCode: string,
): string {
  const rawPath = homepagePath || fallbackCode.toLowerCase();
  return rawPath.replace(/^p\//i, '');
}

export const homepageAdminApi = {
  getStatus: async (talentId: string) => {
    const [homepageResponse, domainResponse] = await Promise.all([
      homepageApi.get(talentId),
      talentDomainApi.getConfig(talentId).catch(() => ({ data: null })),
    ]);

    if (!homepageResponse.success || !homepageResponse.data) {
      const error = new Error(homepageResponse.error?.message || '');
      (error as Error & { code: string }).code = 'HOMEPAGE_STATUS_LOAD_FAILED';
      throw error;
    }

    return mapHomepageAdminStatus(homepageResponse.data, domainResponse.data);
  },

  publish: async (talentId: string) => {
    return homepageApi.publish(talentId);
  },

  unpublish: async (talentId: string) => {
    return homepageApi.unpublish(talentId);
  },

  applyPublishedState: (
    previousStatus: HomepageAdminStatus | null,
    fallbackHomepagePath: string | null | undefined,
    publishResponse: HomepagePublishResponse,
  ): HomepageAdminStatus => {
    return {
      ...previousStatus,
      isPublished: true,
      lastPublishedAt: publishResponse.publishedVersion.publishedAt,
      publishedAt: publishResponse.publishedVersion.publishedAt,
      hasDraftChanges: false,
      homepagePath: previousStatus?.homepagePath || fallbackHomepagePath || null,
    };
  },

  applyUnpublishedState: (
    previousStatus: HomepageAdminStatus | null,
  ): HomepageAdminStatus => {
    return {
      ...previousStatus,
      isPublished: false,
      lastPublishedAt: previousStatus?.lastPublishedAt,
      hasDraftChanges: true,
    };
  },

  revalidateHomepage: async (path: string) => {
    try {
      await fetch('/api-proxy/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
    } catch (error) {
      console.warn('Failed to revalidate cache:', error);
    }
  },
};
