import { describe, expect, it } from 'vitest';

import { getLocalizedDescription, getLocalizedName, getLocalizedValue } from './i18n-helper';

const localizedEntity = {
  name: {
    en: 'English name',
    zh_HANS: '简体中文名',
    zh_HANT: '繁體中文名',
    ja: '日本語名',
    ko: '한국어 이름',
    fr: 'Nom français',
  },
  description: {
    en: 'English description',
    zh_HANS: '简体中文描述',
    zh_HANT: '繁體中文描述',
    ja: '日本語説明',
    ko: '한국어 설명',
    fr: 'Description française',
  },
};

describe('i18n helper locale normalization', () => {
  it('normalizes full UI locale tags before selecting the canonical localized text field', () => {
    expect(getLocalizedName(localizedEntity, 'zh_HANT')).toBe('繁體中文名');
    expect(getLocalizedName(localizedEntity, 'zh-CN')).toBe('简体中文名');
    expect(getLocalizedDescription(localizedEntity, 'ja-JP')).toBe('日本語説明');
  });

  it('uses every supported UI locale and falls unknown locale tags back to English', () => {
    expect(getLocalizedValue(localizedEntity, 'name', 'fr')).toBe('Nom français');
    expect(getLocalizedValue(localizedEntity, 'description', 'ko')).toBe('한국어 설명');
    expect(getLocalizedName(localizedEntity, 'de')).toBe('English name');
  });
});
