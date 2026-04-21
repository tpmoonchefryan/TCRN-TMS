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

  it('normalizes dictionary locales from all pages without inventing fallback entries', async () => {
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
    expect(result.options).toContainEqual({ code: 'zh_HANS', label: '中文' });
    expect(result.options).toContainEqual({ code: 'de', label: '德语' });
    expect(result.options).toContainEqual({ code: 'es', label: '西班牙语' });
    expect(result.options).toHaveLength(3);
  });

  it('surfaces the load error instead of inventing fallback language options', async () => {
    mocks.listDictionaryTypes.mockRejectedValue(new Error('network failed'));

    const result = await loadTranslationLanguageOptions(
      vi.fn(),
      vi.fn(),
      'en',
      'fallback error',
    );

    expect(result.error).toBe('fallback error');
    expect(result.options).toEqual([]);
  });

  it('keeps the drawer empty when the language dictionary type is missing', async () => {
    mocks.listDictionaryTypes.mockResolvedValue([
      {
        type: 'countries',
        name: 'Countries',
        description: null,
        count: 12,
      },
    ]);

    const result = await loadTranslationLanguageOptions(
      vi.fn(),
      vi.fn(),
      'en',
      'fallback error',
    );

    expect(result.error).toBeNull();
    expect(result.options).toEqual([]);
  });
});
