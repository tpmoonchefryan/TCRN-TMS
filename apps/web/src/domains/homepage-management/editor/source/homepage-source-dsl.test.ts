import { DEFAULT_THEME, normalizeTheme } from '@tcrn/shared';
import { describe, expect, it } from 'vitest';

import {
  buildDefaultHomepageSourceDocument,
  parseHomepageSourceDocument,
} from '@/domains/homepage-management/editor/source/homepage-source-dsl';

describe('homepage source DSL', () => {
  it('parses a safe structured source document and normalizes component order', () => {
    const result = parseHomepageSourceDocument(JSON.stringify({
      content: {
        version: '1.0',
        components: [
          {
            id: 'link-1',
            type: 'LinkButton',
            visible: true,
            order: 2,
            props: {
              label: 'Visit store',
              style: 'primary',
              url: 'https://example.com/store',
            },
          },
          {
            id: 'profile-1',
            type: 'ProfileCard',
            visible: true,
            order: 1,
            props: {
              displayName: 'Tokino Sora',
            },
          },
        ],
      },
      theme: DEFAULT_THEME,
    }));

    expect(result).toMatchObject({
      ok: true,
      value: {
        content: {
          version: '1.0',
          components: [
            expect.objectContaining({ id: 'profile-1', order: 1 }),
            expect.objectContaining({ id: 'link-1', order: 2 }),
          ],
        },
      },
    });
  });

  it('rejects invalid JSON and invalid document shape', () => {
    expect(parseHomepageSourceDocument('{')).toEqual({
      ok: false,
      reason: 'invalidJson',
    });

    expect(parseHomepageSourceDocument(JSON.stringify({ content: {}, theme: DEFAULT_THEME }))).toEqual({
      ok: false,
      reason: 'sourceDocumentRequired',
    });
  });

  it('rejects executable scripts, event handlers, CSS text, and unsafe URLs', () => {
    const baseDocument = {
      content: {
        version: '1.0',
        components: [
          {
            id: 'rich-1',
            type: 'RichText',
            visible: true,
            order: 1,
            props: {},
          },
        ],
      },
      theme: DEFAULT_THEME,
    };

    for (const unsafeProps of [
      { contentHtml: '<script>alert(1)</script>' },
      { onClick: 'alert(1)' },
      { onclick: 'alert(1)' },
      { style: { color: 'red' } },
      { style: 'color:red;' },
      { url: 'javascript:alert(1)' },
      { contentHtml: '<a style="color:red">Unsafe</a>' },
    ]) {
      const result = parseHomepageSourceDocument(JSON.stringify({
        ...baseDocument,
        content: {
          ...baseDocument.content,
          components: [
            {
              ...baseDocument.content.components[0],
              props: unsafeProps,
            },
          ],
        },
      }));

      expect(result).toEqual({
        ok: false,
        reason: 'unsafeSource',
      });
    }
  });

  it('builds an empty default source document with the normalized default theme', () => {
    expect(buildDefaultHomepageSourceDocument()).toEqual({
      content: {
        version: '1.0',
        components: [],
      },
      theme: normalizeTheme(DEFAULT_THEME),
    });
  });
});
