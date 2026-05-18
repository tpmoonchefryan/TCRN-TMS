import { describe, expect, it } from 'vitest';

import {
  getProfanityByLanguage,
  PROFANITY_EN,
  PROFANITY_JA,
  PROFANITY_ZH,
} from './profanity-wordlist';

describe('getProfanityByLanguage', () => {
  it('normalizes full UI locale tags to moderation wordlist families', () => {
    expect(getProfanityByLanguage('zh_HANT')).toBe(PROFANITY_ZH);
    expect(getProfanityByLanguage('zh-CN')).toBe(PROFANITY_ZH);
    expect(getProfanityByLanguage('ja-JP')).toBe(PROFANITY_JA);
  });

  it('falls untranslated supported UI locale tags back to the English wordlist', () => {
    expect(getProfanityByLanguage('fr')).toBe(PROFANITY_EN);
    expect(getProfanityByLanguage('ko')).toBe(PROFANITY_EN);
    expect(getProfanityByLanguage('de')).toBe(PROFANITY_EN);
  });
});
