// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { Request } from 'express';
import { describe, expect, it } from 'vitest';

import {
  getPrimaryAcceptLanguage,
  getRequestTrilingualLocaleFamily,
  getTrilingualNameColumn,
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
    expect(getRequestTrilingualLocaleFamily(req)).toBe('zh');
    expect(getTrilingualNameColumn(getPrimaryAcceptLanguage(req))).toBe('name_zh');
  });

  it('falls back non-trilingual UI locales to the English legacy name column', () => {
    expect(getTrilingualNameColumn('fr-FR')).toBe('name_en');
    expect(getTrilingualNameColumn('ko-KR')).toBe('name_en');
  });

  it('uses English when Accept-Language is absent', () => {
    const req = requestWithAcceptLanguage();

    expect(getPrimaryAcceptLanguage(req)).toBe('en');
    expect(getRequestTrilingualLocaleFamily(req)).toBe('en');
  });
});
