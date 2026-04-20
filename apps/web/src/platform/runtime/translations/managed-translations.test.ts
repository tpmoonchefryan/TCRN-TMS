import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadTranslationLanguageOptions } from '@/platform/runtime/translations/managed-translations';

const mocks = vi.hoisted(() => ({
  listDictionaryItems: vi.fn(),
  listDictionaryTypes: vi.fn(),
}));

vi.mock('@/domains/config-dictionary-settings/api/system-dictionary.api', () => ({
  listDictionaryItems: mocks.listDictionaryItems,
  listDictionaryTypes: mocks.listDictionaryTypes,
}));

describe('loadTranslationLanguageOptions', () => {
  beforeEach(() => {
    mocks.listDictionaryItems.mockReset();
    mocks.listDictionaryTypes.mockReset();
  });

  it('keeps supported UI locales visible and fetches all dictionary pages', async () => {
    mocks.listDictionaryTypes.mockResolvedValue([
      {
        type: 'languages',
        name: 'Languages',
        description: null,
        count: 260,
      },
    ]);

    mocks.listDictionaryItems
      .mockResolvedValueOnce({
        items: [
          {
            code: 'de',
            nameEn: 'German',
            translations: { en: 'German', zh_HANS: '德语' },
          },
          {
            code: 'zh',
            nameEn: 'Chinese',
            translations: { en: 'Chinese', zh_HANS: '中文' },
          },
        ],
        pagination: {
          page: 1,
          pageSize: 250,
          totalCount: 260,
          totalPages: 2,
          hasPrev: false,
          hasNext: true,
        },
      })
      .mockResolvedValueOnce({
        items: [
          {
            code: 'es',
            nameEn: 'Spanish',
            translations: { en: 'Spanish', zh_HANS: '西班牙语' },
          },
        ],
        pagination: {
          page: 2,
          pageSize: 250,
          totalCount: 260,
          totalPages: 2,
          hasPrev: true,
          hasNext: false,
        },
      });

    const result = await loadTranslationLanguageOptions(
      vi.fn(),
      vi.fn(),
      'zh_HANS',
      'fallback error',
    );

    expect(mocks.listDictionaryItems).toHaveBeenCalledTimes(2);
    expect(result.error).toBeNull();
    expect(result.usedFallback).toBe(false);
    expect(result.options.slice(0, 5)).toEqual([
      { code: 'zh_HANS', label: '简体中文' },
      { code: 'zh_HANT', label: '繁體中文' },
      { code: 'ja', label: '日本語' },
      { code: 'ko', label: '한국어' },
      { code: 'fr', label: 'Français' },
    ]);
    expect(result.options).toContainEqual({ code: 'de', label: '德语' });
    expect(result.options).toContainEqual({ code: 'es', label: '西班牙语' });
  });

  it('falls back to supported UI locales when the language dictionary is unavailable', async () => {
    mocks.listDictionaryTypes.mockRejectedValue(new Error('network failed'));

    const result = await loadTranslationLanguageOptions(
      vi.fn(),
      vi.fn(),
      'en',
      'fallback error',
    );

    expect(result.usedFallback).toBe(true);
    expect(result.error).toBe('fallback error');
    expect(result.options).toEqual([
      { code: 'zh_HANS', label: '简体中文' },
      { code: 'zh_HANT', label: '繁體中文' },
      { code: 'ja', label: '日本語' },
      { code: 'ko', label: '한국어' },
      { code: 'fr', label: 'Français' },
    ]);
  });
});
