// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { buildSharedHomepageUrl } from '@tcrn/shared';
import * as crypto from 'crypto';

import type {
  HomepageContent,
  HomepageResponse,
  ThemeConfig,
  VersionInfo,
} from '../dto/homepage.dto';

export interface HomepageAdminTalentRecord {
  id: string;
  code: string;
  homepagePath: string | null;
  customDomain: string | null;
  customDomainVerified: boolean;
}

export interface HomepageAdminRecord {
  id: string;
  talentId: string;
  isPublished: boolean;
  publishedVersionId: string | null;
  draftVersionId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
  analyticsId: string | null;
  theme: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface HomepageAdminVersionRecord {
  id: string;
  versionNumber: number;
  content: Record<string, unknown>;
  theme: Record<string, unknown>;
  publishedAt: Date | null;
  publishedBy: string | null;
  createdAt: Date;
}

export interface HomepageVersionActorRecord {
  id: string;
  username: string;
}

export interface HomepageDraftPointerRecord {
  id: string;
  draftVersionId: string | null;
}

export interface HomepageVersionSummaryRecord {
  id: string;
  versionNumber: number;
  contentHash: string | null;
  createdAt: Date;
}

export interface HomepagePublishTargetRecord {
  id: string;
  talentCode: string;
  draftVersionId: string | null;
  customDomain: string | null;
  homepagePath: string | null;
}

export interface HomepagePublishedVersionRecord {
  id: string;
  versionNumber: number;
}

export type HomepageCdnPurgeStatus = 'success' | 'pending' | 'failed';

export interface HomepageSettingsRecord {
  id: string;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
  analyticsId: string | null;
  version: number;
}

export function calculateHomepageDraftHash(
  content: HomepageContent,
  theme?: ThemeConfig | null,
): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ content, theme: theme ?? null }))
    .digest('hex');
}

export function buildHomepageVersionInfo(params: {
  version: HomepageAdminVersionRecord;
  publishedBy: HomepageVersionActorRecord | null;
}): VersionInfo {
  const { publishedBy, version } = params;

  return {
    id: version.id,
    versionNumber: version.versionNumber,
    content: version.content as unknown as HomepageContent,
    theme: version.theme as unknown as ThemeConfig,
    publishedAt: version.publishedAt?.toISOString() ?? null,
    publishedBy,
    createdAt: version.createdAt.toISOString(),
  };
}

export function buildHomepageResponse(params: {
  homepage: HomepageAdminRecord;
  talent: HomepageAdminTalentRecord;
  tenantCode: string;
  publishedVersion: VersionInfo | null;
  draftVersion: VersionInfo | null;
  appUrl: string;
}): HomepageResponse {
  const { appUrl, draftVersion, homepage, publishedVersion, talent, tenantCode } = params;

  return {
    id: homepage.id,
    talentId: homepage.talentId,
    isPublished: homepage.isPublished,
    publishedVersion,
    draftVersion,
    customDomain: talent.customDomain,
    customDomainVerified: talent.customDomainVerified,
    seoTitle: homepage.seoTitle,
    seoDescription: homepage.seoDescription,
    ogImageUrl: homepage.ogImageUrl,
    analyticsId: homepage.analyticsId,
    homepagePath: talent.homepagePath,
    homepageUrl: buildSharedHomepageUrl(appUrl, tenantCode, talent.code),
    createdAt: homepage.createdAt.toISOString(),
    updatedAt: homepage.updatedAt.toISOString(),
    version: homepage.version,
  };
}

export function buildHomepagePublishResult(params: {
  publishedVersion: HomepagePublishedVersionRecord;
  publishedAt: Date;
  tenantCode: string;
  talentCode: string;
  appUrl: string;
  cdnPurgeStatus: HomepageCdnPurgeStatus;
}) {
  const { appUrl, cdnPurgeStatus, publishedAt, publishedVersion, talentCode, tenantCode } = params;

  return {
    publishedVersion: {
      id: publishedVersion.id,
      versionNumber: publishedVersion.versionNumber,
      publishedAt: publishedAt.toISOString(),
    },
    homepageUrl: buildSharedHomepageUrl(appUrl, tenantCode, talentCode),
    cdnPurgeStatus,
  };
}

export function normalizeHomepagePathInput(
  homepagePath: string | null | undefined,
): string | null | undefined {
  if (homepagePath === undefined) {
    return undefined;
  }

  if (!homepagePath) {
    return null;
  }

  const trimmed = homepagePath.trim().toLowerCase();
  const segments = trimmed.split('/').filter((segment) => segment.length > 0);
  const lastSegment = segments.length > 0 ? segments[segments.length - 1] : trimmed;

  return lastSegment.replace(/[^a-z0-9\-_]/g, '') || null;
}
