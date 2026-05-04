import { describe, expect, it } from 'vitest';

import { getLocalizedDescription, getLocalizedName, getLocalizedValue } from './i18n-helper';

const localizedEntity = {
  name_en: 'English name',
  name_zh: '中文名',
  name_ja: '日本語名',
  description_en: 'English description',
  description_zh: '中文描述',
  description_ja: '日本語説明',
};

describe('i18n helper locale normalization', () => {
  it('normalizes full UI locale tags before selecting legacy trilingual fields', () => {
    expect(getLocalizedName(localizedEntity, 'zh_HANT')).toBe('中文名');
    expect(getLocalizedName(localizedEntity, 'zh-CN')).toBe('中文名');
    expect(getLocalizedDescription(localizedEntity, 'ja-JP')).toBe('日本語説明');
  });

  it('falls non-trilingual UI locale tags back to English legacy fields', () => {
    expect(getLocalizedValue(localizedEntity, 'name', 'fr')).toBe('English name');
    expect(getLocalizedValue(localizedEntity, 'description', 'ko')).toBe('English description');
    expect(getLocalizedName(localizedEntity, 'de')).toBe('English name');
  });
});
