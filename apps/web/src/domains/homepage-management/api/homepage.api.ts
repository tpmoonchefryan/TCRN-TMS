import { type ThemeConfig } from '@tcrn/shared';

export type HomepageVersionStatus = 'draft' | 'published' | 'archived';

export interface HomepageDraftComponentRecord {
  id: string;
  type: string;
  props: Record<string, unknown>;
  order: number;
  visible: boolean;
}

export interface HomepageDraftContent {
  version: string;
  components: HomepageDraftComponentRecord[];
}

export interface HomepageVersionActor {
  id: string;
  username: string;
}

export interface HomepageVersionInfo {
  id: string;
  versionNumber: number;
  content?: HomepageDraftContent;
  theme?: ThemeConfig;
  createdAt: string;
  publishedAt: string | null;
  publishedBy: HomepageVersionActor | null;
}

export interface HomepageResponse {
  id: string;
  talentId: string;
  isPublished: boolean;
  publishedVersion: HomepageVersionInfo | null;
  draftVersion: HomepageVersionInfo | null;
  customDomain: string | null;
  customDomainVerified: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
  analyticsId: string | null;
  homepagePath: string | null;
  homepageUrl: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface HomepageVersionListItem {
  id: string;
  versionNumber: number;
  status: HomepageVersionStatus;
  contentPreview: string;
  componentCount: number;
  publishedAt: string | null;
  publishedBy: HomepageVersionActor | null;
  createdAt: string;
  createdBy: HomepageVersionActor | null;
}

export interface HomepageVersionListResponse {
  items: HomepageVersionListItem[];
  meta: {
    total: number;
  };
}

export interface HomepagePublishResponse {
  publishedVersion: {
    id: string;
    versionNumber: number;
    publishedAt: string;
  };
  homepageUrl: string;
  cdnPurgeStatus: 'success' | 'pending' | 'failed';
}

export interface HomepageUnpublishResponse {
  isPublished: boolean;
  unpublishedAt: string;
}

export interface HomepageRestoreResponse {
  newDraftVersion: {
    id: string;
    versionNumber: number;
  };
  restoredFrom: {
    id: string;
    versionNumber: number;
  };
}

export interface UpdateHomepageSettingsInput {
  homepagePath?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageUrl?: string | null;
  analyticsId?: string | null;
  version: number;
}

export interface HomepageVersionDetailResponse {
  id: string;
  versionNumber: number;
  status: HomepageVersionStatus;
  contentPreview: string;
  componentCount: number;
  content: HomepageDraftContent;
  theme: ThemeConfig;
  publishedAt: string | null;
  publishedBy: HomepageVersionActor | null;
  createdAt: string;
  createdBy: HomepageVersionActor | null;
}

export interface SaveHomepageDraftInput {
  content: HomepageDraftContent;
  theme?: ThemeConfig;
}

export interface SaveHomepageDraftResponse {
  draftVersion: {
    id: string;
    versionNumber: number;
    contentHash: string;
    updatedAt: string;
  };
  isNewVersion: boolean;
}

interface ListHomepageVersionsOptions {
  page?: number;
  pageSize?: number;
  status?: HomepageVersionStatus;
}

type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

function buildQueryString(input: Record<string, string | number | boolean | null | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function readHomepage(request: RequestFn, talentId: string) {
  return request<HomepageResponse>(`/api/v1/talents/${talentId}/homepage`);
}

export function listHomepageVersions(
  request: RequestFn,
  talentId: string,
  options: ListHomepageVersionsOptions = {},
) {
  const query = buildQueryString({
    page: options.page ?? 1,
    pageSize: options.pageSize ?? 20,
    status: options.status,
  });

  return request<HomepageVersionListResponse>(`/api/v1/talents/${talentId}/homepage/versions${query}`);
}

export function publishHomepage(request: RequestFn, talentId: string) {
  return request<HomepagePublishResponse>(`/api/v1/talents/${talentId}/homepage/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
}

export function unpublishHomepage(request: RequestFn, talentId: string) {
  return request<HomepageUnpublishResponse>(`/api/v1/talents/${talentId}/homepage/unpublish`, {
    method: 'POST',
  });
}

export function restoreHomepageVersion(request: RequestFn, talentId: string, versionId: string) {
  return request<HomepageRestoreResponse>(`/api/v1/talents/${talentId}/homepage/versions/${versionId}/restore`, {
    method: 'POST',
  });
}

export function readHomepageVersion(request: RequestFn, talentId: string, versionId: string) {
  return request<HomepageVersionDetailResponse>(`/api/v1/talents/${talentId}/homepage/versions/${versionId}`);
}

export function saveHomepageDraft(
  request: RequestFn,
  talentId: string,
  input: SaveHomepageDraftInput,
) {
  return request<SaveHomepageDraftResponse>(`/api/v1/talents/${talentId}/homepage/draft`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export function updateHomepageSettings(
  request: RequestFn,
  talentId: string,
  input: UpdateHomepageSettingsInput,
) {
  return request<HomepageResponse>(`/api/v1/talents/${talentId}/homepage/settings`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}
