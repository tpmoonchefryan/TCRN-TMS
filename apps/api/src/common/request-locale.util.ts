// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { resolveTrilingualLocaleFamily, type TrilingualLocaleFamily } from '@tcrn/shared';
import type { Request } from 'express';

export type TrilingualNameColumn = 'name_en' | 'name_zh' | 'name_ja';

export function getPrimaryAcceptLanguage(req: Request): string {
  const rawHeader = req.headers['accept-language'];
  const header = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

  return header?.split(',')[0]?.trim() || 'en';
}

export function getRequestTrilingualLocaleFamily(req: Request): TrilingualLocaleFamily {
  return resolveTrilingualLocaleFamily(getPrimaryAcceptLanguage(req));
}

export function getTrilingualNameColumn(locale?: string | null): TrilingualNameColumn {
  const localeFamily = resolveTrilingualLocaleFamily(locale);

  if (localeFamily === 'zh') {
    return 'name_zh';
  }

  if (localeFamily === 'ja') {
    return 'name_ja';
  }

  return 'name_en';
}
