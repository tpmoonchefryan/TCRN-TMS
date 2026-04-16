// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { HomepageContent, ThemeConfig } from '../dto/homepage.dto';

export interface PublicHomepageData {
  talent: {
    displayName: string;
    avatarUrl: string | null;
    timezone?: string | null;
  };
  content: HomepageContent;
  theme: ThemeConfig;
  seo: {
    title: string | null;
    description: string | null;
    ogImageUrl: string | null;
  };
  updatedAt: string;
}

export interface PublicHomepageTalentRecord {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  homepagePath: string | null;
  timezone: string | null;
}

export interface PublishedHomepageRecord {
  id: string;
  isPublished: boolean;
  publishedVersionId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
}

export interface HomepageVersionRecord {
  content: Record<string, unknown>;
  theme: Record<string, unknown>;
  publishedAt: Date | null;
  createdAt: Date;
}

export interface DomainLookupRouteRecord {
  talentId: string;
  homepagePath: string | null;
  marshmallowPath: string | null;
  code: string;
}

export interface DomainLookupResult {
  homepagePath: string;
  marshmallowPath: string;
  tenantSchema: string;
  talentId: string;
}

export function normalizeLookupDomain(domain: string): string {
  return domain.toLowerCase().replace(/\.$/, '');
}

export function resolveLookupRoute(
  route: DomainLookupRouteRecord,
  tenantSchema: string,
): DomainLookupResult {
  const homepagePath = route.homepagePath || route.code;
  const marshmallowPath = route.marshmallowPath || route.code;

  return {
    homepagePath,
    marshmallowPath,
    tenantSchema,
    talentId: route.talentId,
  };
}

export function hasPublishedHomepage(
  homepage: PublishedHomepageRecord | null,
): homepage is PublishedHomepageRecord & { publishedVersionId: string } {
  return !!homepage && homepage.isPublished && typeof homepage.publishedVersionId === 'string';
}

export function buildPublicHomepageData(params: {
  talent: PublicHomepageTalentRecord;
  homepage: PublishedHomepageRecord;
  version: HomepageVersionRecord;
}): PublicHomepageData {
  const { homepage, talent, version } = params;

  return {
    talent: {
      displayName: talent.displayName,
      avatarUrl: talent.avatarUrl,
      timezone: talent.timezone,
    },
    content: version.content as unknown as HomepageContent,
    theme: version.theme as unknown as ThemeConfig,
    seo: {
      title: homepage.seoTitle,
      description: homepage.seoDescription,
      ogImageUrl: homepage.ogImageUrl,
    },
    updatedAt: version.publishedAt?.toISOString() ?? version.createdAt.toISOString(),
  };
}
