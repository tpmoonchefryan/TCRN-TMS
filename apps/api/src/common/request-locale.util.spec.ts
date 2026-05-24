// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { Request } from 'express';
import { describe, expect, it } from 'vitest';

import {
  buildLocalizedJsonTextSql,
  getPrimaryAcceptLanguage,
  getRequestUiLocale,
  getUiLocale,
} from './request-locale.util';

function requestWithAcceptLanguage(value?: string | string[]): Request {
  return {
    headers: value === undefined ? {} : { 'accept-language': value },
  } as Request;
}

describe('request locale helpers', () => {
  it('preserves the full primary Accept-Language token for supported UI locale normalization', () => {
    const req = requestWithAcceptLanguage('zh-Hant-TW,zh;q=0.9,en;q=0.8');

    expect(getPrimaryAcceptLanguage(req)).toBe('zh-Hant-TW');
    expect(getRequestUiLocale(req)).toBe('zh_HANT');
    expect(getUiLocale(getPrimaryAcceptLanguage(req))).toBe('zh_HANT');
  });

  it('normalizes every supported UI locale through the same source list', () => {
    expect(getUiLocale('fr-FR')).toBe('fr');
    expect(getUiLocale('ko-KR')).toBe('ko');
  });

  it('uses English when Accept-Language is absent', () => {
    const req = requestWithAcceptLanguage();

    expect(getPrimaryAcceptLanguage(req)).toBe('en');
    expect(getRequestUiLocale(req)).toBe('en');
  });

  it('builds JSONB localized text SQL from the normalized UI locale', () => {
    expect(buildLocalizedJsonTextSql('name', 'fr-FR')).toBe(
      "COALESCE(NULLIF(name->>'fr', ''), NULLIF(name->>'en', ''), name->>'en')"
    );
  });
});
