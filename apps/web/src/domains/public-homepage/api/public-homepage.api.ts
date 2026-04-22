import { type ThemeConfig } from '@tcrn/shared';

import { readApiData, withBrowserPublicConsumerHeaders } from '@/platform/http/api';

export interface PublicHomepageComponentRecord {
  id: string;
  type: string;
  props: Record<string, unknown>;
  order: number;
  visible: boolean;
}

export interface PublicHomepageContent {
  version: string;
  components: PublicHomepageComponentRecord[];
}

export interface PublicHomepageResponse {
  talent: {
    displayName: string;
    avatarUrl: string | null;
    timezone?: string | null;
  };
  content: PublicHomepageContent;
  theme: ThemeConfig;
  seo: {
    title: string | null;
    description: string | null;
    ogImageUrl: string | null;
  };
  updatedAt: string;
}

function encodePublicPath(path: string) {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function splitSharedDomainPath(path: string) {
  const segments = path
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length !== 2) {
    return null;
  }

  return {
    tenantCode: encodeURIComponent(segments[0]),
    talentCode: encodeURIComponent(segments[1]),
  };
}

export function buildPublicHomepageEndpoint(path: string) {
  const sharedDomainPath = splitSharedDomainPath(path);
  return sharedDomainPath
    ? `/api/v1/public/homepage/${sharedDomainPath.tenantCode}/${sharedDomainPath.talentCode}`
    : `/api/v1/public/homepage/${encodePublicPath(path)}`;
}

export async function readPublicHomepage(path: string) {
  const endpoint = buildPublicHomepageEndpoint(path);

  const response = await fetch(endpoint, {
    credentials: 'include',
    headers: withBrowserPublicConsumerHeaders(),
  });

  return readApiData<PublicHomepageResponse>(response);
}
