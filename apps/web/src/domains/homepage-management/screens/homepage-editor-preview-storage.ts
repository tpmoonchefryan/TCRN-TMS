import { normalizeTheme, type ThemeConfig } from '@tcrn/shared';

import {
  type HomepageDraftContent,
} from '@/domains/homepage-management/api/homepage.api';

export interface HomepageEditorPreviewHero {
  avatarUrl: string | null;
  description: string | null;
  displayName: string;
  timezone: string | null;
}

export interface HomepageEditorPreviewSnapshot {
  schemaVersion: 1;
  tenantId: string;
  talentId: string;
  homepageUrl: string | null;
  updatedAt: string;
  content: HomepageDraftContent;
  theme: ThemeConfig;
  hero: HomepageEditorPreviewHero;
}

const HOMEPAGE_EDITOR_PREVIEW_STORAGE_PREFIX = 'tcrn.homepage.editor.preview.';

function getPreviewStorageKey(previewId: string) {
  return `${HOMEPAGE_EDITOR_PREVIEW_STORAGE_PREFIX}${previewId}`;
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function createHomepageEditorPreviewId(tenantId: string, talentId: string) {
  return `${tenantId}.${talentId}.${Date.now().toString(36)}`;
}

export function buildHomepageEditorPreviewPath(
  tenantId: string,
  talentId: string,
  previewId: string,
) {
  const query = new URLSearchParams({ previewId });
  return `/tenant/${tenantId}/talent/${talentId}/homepage/editor/preview?${query.toString()}`;
}

export function getHomepageEditorPreviewStorageKey(previewId: string) {
  return getPreviewStorageKey(previewId);
}

export function writeHomepageEditorPreviewSnapshot(
  previewId: string,
  snapshot: HomepageEditorPreviewSnapshot,
) {
  if (!canUseLocalStorage()) {
    return;
  }

  const currentPrefix = `${HOMEPAGE_EDITOR_PREVIEW_STORAGE_PREFIX}${snapshot.tenantId}.${snapshot.talentId}.`;

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);

    if (key && key.startsWith(currentPrefix) && key !== getPreviewStorageKey(previewId)) {
      window.localStorage.removeItem(key);
    }
  }

  window.localStorage.setItem(getPreviewStorageKey(previewId), JSON.stringify(snapshot));
}

export function readHomepageEditorPreviewSnapshot(previewId: string) {
  if (!canUseLocalStorage()) {
    return null;
  }

  const rawSnapshot = window.localStorage.getItem(getPreviewStorageKey(previewId));

  if (!rawSnapshot) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawSnapshot) as unknown;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const candidate = parsed as Partial<HomepageEditorPreviewSnapshot>;

    if (
      candidate.schemaVersion !== 1 ||
      typeof candidate.tenantId !== 'string' ||
      typeof candidate.talentId !== 'string' ||
      !candidate.content ||
      !Array.isArray(candidate.content.components) ||
      !candidate.theme ||
      typeof candidate.theme !== 'object' ||
      !candidate.hero ||
      typeof candidate.hero !== 'object'
    ) {
      return null;
    }

    return {
      schemaVersion: 1,
      tenantId: candidate.tenantId,
      talentId: candidate.talentId,
      homepageUrl: typeof candidate.homepageUrl === 'string' ? candidate.homepageUrl : null,
      updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
      content: candidate.content,
      theme: normalizeTheme(candidate.theme),
      hero: {
        avatarUrl: typeof candidate.hero.avatarUrl === 'string' ? candidate.hero.avatarUrl : null,
        description: typeof candidate.hero.description === 'string' ? candidate.hero.description : null,
        displayName: typeof candidate.hero.displayName === 'string' ? candidate.hero.displayName : '',
        timezone: typeof candidate.hero.timezone === 'string' ? candidate.hero.timezone : null,
      },
    } satisfies HomepageEditorPreviewSnapshot;
  } catch {
    return null;
  }
}
