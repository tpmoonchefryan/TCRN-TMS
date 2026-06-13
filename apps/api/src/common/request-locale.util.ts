// SPDX-License-Identifier: Apache-2.0
import type { Request } from 'express';

import { normalizeSupportedUiLocale, type SupportedUiLocale } from '@tcrn/shared';

export function getPrimaryAcceptLanguage(req: Request): string {
  const rawHeader = req.headers['accept-language'];
  const header = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

  return header?.split(',')[0]?.trim() || 'en';
}

export function getRequestUiLocale(req: Request): SupportedUiLocale {
  return normalizeSupportedUiLocale(getPrimaryAcceptLanguage(req)) ?? 'en';
}

export function getUiLocale(locale?: string | null): SupportedUiLocale {
  return normalizeSupportedUiLocale(locale) ?? 'en';
}

export function buildLocalizedJsonTextSql(
  jsonColumnSql: string,
  locale?: string | null,
  fallbackSql: string = `${jsonColumnSql}->>'en'`
): string {
  const uiLocale = getUiLocale(locale);

  return `COALESCE(NULLIF(${jsonColumnSql}->>'${uiLocale}', ''), NULLIF(${jsonColumnSql}->>'en', ''), ${fallbackSql})`;
}
