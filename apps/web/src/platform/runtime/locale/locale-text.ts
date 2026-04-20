import {
  normalizeSupportedUiLocale,
  resolveTrilingualLocaleFamily,
  type SupportedUiLocale,
  toIntlLocale,
} from '@tcrn/shared';

import type { RuntimeLocale } from './locale-provider';

type LocaleRecordKey = SupportedUiLocale | RuntimeLocale;

type LocaleRecord<T> = Partial<Record<LocaleRecordKey, T>> & {
  en: T;
};

interface LocaleTextValue {
  en: string;
  zh_HANS?: string;
  zh_HANT?: string;
  ja?: string;
  ko?: string;
  fr?: string;
  zh?: string;
}

export function resolveLocaleRecord<T>(
  locale: SupportedUiLocale | RuntimeLocale | string,
  record: LocaleRecord<T>,
  familyFallback?: RuntimeLocale,
) {
  const normalizedLocale = normalizeSupportedUiLocale(locale);

  if (normalizedLocale && record[normalizedLocale]) {
    return record[normalizedLocale];
  }

  if (locale === 'zh' && record.zh) {
    return record.zh;
  }

  if (normalizedLocale === 'zh_HANS' && record.zh) {
    return record.zh;
  }

  if (normalizedLocale === 'zh_HANT') {
    if (record.zh_HANT) {
      return record.zh_HANT;
    }

    if (record.zh) {
      return record.zh;
    }

    if (record.zh_HANS) {
      return record.zh_HANS;
    }
  }

  if (locale === 'ja' && record.ja) {
    return record.ja;
  }

  if (locale === 'en' && record.en) {
    return record.en;
  }

  const localeFamily = familyFallback ?? resolveTrilingualLocaleFamily(locale);

  if (localeFamily === 'zh' && record.zh) {
    return record.zh;
  }

  if (record[localeFamily]) {
    return record[localeFamily];
  }

  return record.en;
}

export function pickLocaleText(
  locale: SupportedUiLocale | RuntimeLocale | string,
  value: LocaleTextValue,
) {
  return resolveLocaleRecord(locale, value);
}

export function formatLocaleDateTime(
  locale: SupportedUiLocale | RuntimeLocale | string,
  value: string | null,
  fallback: string,
) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatLocaleNumber(
  locale: SupportedUiLocale | RuntimeLocale | string,
  value: number,
) {
  return new Intl.NumberFormat(toIntlLocale(locale)).format(value);
}
