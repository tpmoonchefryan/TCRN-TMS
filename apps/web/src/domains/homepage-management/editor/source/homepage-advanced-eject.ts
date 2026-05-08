import { type ThemeConfig } from '@tcrn/shared';

import { type HomepageDraftContent } from '@/domains/homepage-management/api/homepage.api';
import {
  type HomepageSourceDocument,
  normalizeHomepageDraftContent,
} from '@/domains/homepage-management/editor/source/homepage-source-dsl';

const ADVANCED_SOURCE_VERSION_SUFFIX = '+advanced-source';
const LOW_CODE_VERSION = '1.0';

export interface HomepageLowCodeSnapshot extends HomepageSourceDocument {
  createdAt: string;
}

export function isAdvancedSourceContent(content: HomepageDraftContent) {
  return content.version.endsWith(ADVANCED_SOURCE_VERSION_SUFFIX);
}

export function markAdvancedSourceContent(content: HomepageDraftContent): HomepageDraftContent {
  const normalized = normalizeHomepageDraftContent(content);

  if (isAdvancedSourceContent(normalized)) {
    return normalized;
  }

  return {
    ...normalized,
    version: `${normalized.version || LOW_CODE_VERSION}${ADVANCED_SOURCE_VERSION_SUFFIX}`,
  };
}

export function markLowCodeContent(content: HomepageDraftContent): HomepageDraftContent {
  return {
    ...normalizeHomepageDraftContent(content),
    version: LOW_CODE_VERSION,
  };
}

export function createLowCodeSnapshot(
  content: HomepageDraftContent,
  theme: ThemeConfig,
  createdAt = new Date().toISOString(),
): HomepageLowCodeSnapshot {
  return {
    createdAt,
    content: markLowCodeContent(content),
    theme,
  };
}

export function restoreLowCodeSnapshot(snapshot: HomepageLowCodeSnapshot): HomepageSourceDocument {
  return {
    content: markLowCodeContent(snapshot.content),
    theme: snapshot.theme,
  };
}

export function canSwitchFromAdvancedSourceToVisual(hasAdvancedEject: boolean) {
  return !hasAdvancedEject;
}
