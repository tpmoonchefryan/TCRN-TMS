// SPDX-License-Identifier: Apache-2.0
import {
  FIXED_CUSTOM_DOMAIN_HOMEPAGE_PATH,
  FIXED_CUSTOM_DOMAIN_MARSHMALLOW_PATH,
} from '@tcrn/shared';

import type {
  CustomDomainOwnerType,
  CustomDomainRouteMode,
} from '../../talent/domain/talent-custom-domain.policy';
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
  code: string;
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

export interface DomainLookupBindingRouteRecord {
  domainId: string;
  hostname: string;
  ownerType: CustomDomainOwnerType;
  ownerId: string | null;
  tenantSchema: string;
  talentId: string | null;
}

export interface DomainLookupResult {
  homepagePath: string;
  marshmallowPath: string;
  tenantSchema: string;
  talentId: string | null;
  domainId: string | null;
  hostname: string | null;
  ownerType: CustomDomainOwnerType | 'legacy_talent';
  ownerId: string | null;
  routeMode: CustomDomainRouteMode;
  routePrefix: string | null;
  requiresTalentPath: boolean;
}

export function normalizeLookupDomain(domain: string): string {
  return domain.toLowerCase().replace(/\.$/, '');
}

export function resolveLookupRoute(
  _route: DomainLookupRouteRecord,
  tenantSchema: string
): DomainLookupResult {
  return {
    homepagePath: FIXED_CUSTOM_DOMAIN_HOMEPAGE_PATH,
    marshmallowPath: FIXED_CUSTOM_DOMAIN_MARSHMALLOW_PATH,
    tenantSchema,
    talentId: _route.talentId,
    domainId: null,
    hostname: null,
    ownerType: 'legacy_talent',
    ownerId: _route.talentId,
    routeMode: 'dedicated_talent',
    routePrefix: null,
    requiresTalentPath: false,
  };
}

export function resolveLookupBindingRoute(
  route: DomainLookupBindingRouteRecord,
  talentCode: string | null = null
): DomainLookupResult {
  const requiresTalentPath = route.ownerType !== 'talent';

  return {
    homepagePath: FIXED_CUSTOM_DOMAIN_HOMEPAGE_PATH,
    marshmallowPath: FIXED_CUSTOM_DOMAIN_MARSHMALLOW_PATH,
    tenantSchema: route.tenantSchema,
    talentId: route.talentId,
    domainId: route.domainId,
    hostname: route.hostname,
    ownerType: route.ownerType,
    ownerId: route.ownerId,
    routeMode: requiresTalentPath ? 'scoped_talent_path' : 'dedicated_talent',
    routePrefix: requiresTalentPath ? (talentCode ?? ':talentCode') : null,
    requiresTalentPath,
  };
}

export function hasPublishedHomepage(
  homepage: PublishedHomepageRecord | null
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
