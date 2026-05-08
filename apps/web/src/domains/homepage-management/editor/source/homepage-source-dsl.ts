import {
  DEFAULT_THEME,
  normalizeTheme,
  type ThemeConfig,
} from '@tcrn/shared';

import {
  type HomepageDraftComponentRecord,
  type HomepageDraftContent,
} from '@/domains/homepage-management/api/homepage.api';

export interface HomepageSourceDocument {
  content: HomepageDraftContent;
  theme: ThemeConfig;
}

export type HomepageSourceParseFailure =
  | 'invalidJson'
  | 'sourceDocumentRequired'
  | 'unsafeSource';

export type HomepageSourceParseResult =
  | { ok: true; value: HomepageSourceDocument }
  | { ok: false; reason: HomepageSourceParseFailure };

const UNSAFE_HTML_OR_URL_PATTERNS = [
  /<\s*script\b/i,
  /<\s*iframe\b/i,
  /<\s*object\b/i,
  /<\s*embed\b/i,
  /<\s*style\b/i,
  /\son[a-z]+\s*=/i,
  /\sstyle\s*=/i,
  /javascript\s*:/i,
  /data\s*:\s*text\/html/i,
] as const;

export const EMPTY_HOMEPAGE_CONTENT: HomepageDraftContent = {
  version: '1.0',
  components: [],
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function cloneObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function normalizeHomepageComponents(components: HomepageDraftComponentRecord[]) {
  return [...components]
    .sort((left, right) => left.order - right.order)
    .map((component, index) => ({
      ...component,
      order: index + 1,
      visible: component.visible !== false,
    }));
}

export function normalizeHomepageDraftContent(
  content: HomepageDraftContent | null | undefined,
): HomepageDraftContent {
  return {
    version: content?.version || '1.0',
    components: normalizeHomepageComponents(content?.components || []),
  };
}

export function buildHomepageSourceDocument(
  content: HomepageDraftContent,
  theme: ThemeConfig,
): HomepageSourceDocument {
  return {
    content,
    theme,
  };
}

export function hasUnsafeHomepageSourceValue(value: unknown): boolean {
  if (typeof value === 'string') {
    return UNSAFE_HTML_OR_URL_PATTERNS.some((pattern) => pattern.test(value));
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasUnsafeHomepageSourceValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).some(([key, entryValue]) => {
      if (/^on[a-z]/i.test(key)) {
        return true;
      }

      if (key.toLowerCase() === 'style') {
        return typeof entryValue !== 'string' || /[;:{}]/.test(entryValue);
      }

      return hasUnsafeHomepageSourceValue(entryValue);
    });
  }

  return false;
}

export function parseHomepageSourceDocument(input: string): HomepageSourceParseResult {
  try {
    const value = JSON.parse(input) as unknown;

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { ok: false, reason: 'sourceDocumentRequired' };
    }

    if (hasUnsafeHomepageSourceValue(value)) {
      return { ok: false, reason: 'unsafeSource' };
    }

    const record = value as Record<string, unknown>;
    const contentRecord = asRecord(record.content);
    const themeRecord = asRecord(record.theme);
    const sourceComponents = contentRecord.components;

    if (!Array.isArray(sourceComponents) || Object.keys(themeRecord).length === 0) {
      return { ok: false, reason: 'sourceDocumentRequired' };
    }

    const components = sourceComponents.map((component, index) => {
      const componentRecord = asRecord(component);
      const type = asString(componentRecord.type).trim();

      if (!type) {
        throw new Error('component type required');
      }

      return {
        id: asString(componentRecord.id, `source-component-${index + 1}`),
        type,
        props: cloneObject(asRecord(componentRecord.props)),
        order: asNumber(componentRecord.order, index + 1),
        visible: asBoolean(componentRecord.visible, true),
      } satisfies HomepageDraftComponentRecord;
    });

    return {
      ok: true,
      value: {
        content: normalizeHomepageDraftContent({
          version: asString(contentRecord.version, '1.0'),
          components,
        }),
        theme: normalizeTheme(themeRecord as unknown as ThemeConfig),
      },
    };
  } catch {
    return { ok: false, reason: 'invalidJson' };
  }
}

export function buildDefaultHomepageSourceDocument() {
  return buildHomepageSourceDocument(EMPTY_HOMEPAGE_CONTENT, normalizeTheme(DEFAULT_THEME));
}
