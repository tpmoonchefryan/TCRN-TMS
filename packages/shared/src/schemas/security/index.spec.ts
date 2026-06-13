// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';

import { createLocalizedText } from '../../constants/locale';
import {
  CreateBlocklistSchema,
  normalizeBlocklistScopeInput,
  summarizeBlocklistScopes,
  UpdateBlocklistSchema,
} from './index';

describe('security blocklist structured scope schema', () => {
  const localized = (en: string) => createLocalizedText({ en });

  it('keeps the legacy default marshmallow runtime scope', () => {
    expect(
      CreateBlocklistSchema.parse({
        ownerType: 'tenant',
        pattern: 'badword',
        patternType: 'keyword',
        name: localized('Profanity filter'),
      }).scope
    ).toBeUndefined();
    expect(
      normalizeBlocklistScopeInput({
        scope: undefined,
        structuredScope: undefined,
      })
    ).toEqual(['marshmallow']);
  });

  it('does not inject a surface into explicit structured owner-only payloads', () => {
    expect(
      CreateBlocklistSchema.parse({
        ownerType: 'tenant',
        pattern: 'badword',
        patternType: 'keyword',
        name: localized('Profanity filter'),
        structuredScope: {
          entries: [{ category: 'tenant' }],
        },
      }).structuredScope
    ).toEqual({
      entries: [{ category: 'tenant' }],
    });
  });

  it('normalizes structured surface scope to the existing runtime scope tokens', () => {
    expect(
      normalizeBlocklistScopeInput({
        structuredScope: {
          entries: [
            { category: 'tenant' },
            { category: 'subsidiary' },
            { category: 'talent' },
            { category: 'profile-store' },
            { category: 'surface', value: 'marshmallow' },
          ],
        },
      })
    ).toEqual(['tenant', 'subsidiary', 'talent', 'profile-store', 'marshmallow']);
  });

  it('preserves explicit legacy raw scope tokens for advanced compatibility', () => {
    expect(
      normalizeBlocklistScopeInput({
        scope: ['message', 'marshmallow', 'message'],
        structuredScope: {
          entries: [{ category: 'surface', value: 'marshmallow' }],
        },
      })
    ).toEqual(['marshmallow', 'message']);
    expect(summarizeBlocklistScopes(['tenant', 'message', 'marshmallow'])).toEqual({
      tokens: ['tenant', 'message', 'marshmallow'],
      structuredScope: {
        entries: [{ category: 'tenant' }, { category: 'surface', value: 'marshmallow' }],
      },
      unsupported: ['message'],
    });
  });

  it('rejects unsupported first-version surface values', () => {
    expect(() =>
      UpdateBlocklistSchema.parse({
        version: 1,
        structuredScope: {
          entries: [{ category: 'surface', value: 'customer' }],
        },
      })
    ).toThrow();
  });

  it('fails closed when only non-runtime structured owner scopes are submitted', () => {
    expect(() =>
      normalizeBlocklistScopeInput({
        structuredScope: {
          entries: [{ category: 'tenant' }, { category: 'profile-store' }],
        },
      })
    ).toThrow('At least one runtime surface scope is required');
  });
});
