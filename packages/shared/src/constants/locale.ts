export const SUPPORTED_UI_LOCALES = ['en', 'zh_HANS', 'zh_HANT', 'ja', 'ko', 'fr'] as const;

export type SupportedUiLocale = (typeof SUPPORTED_UI_LOCALES)[number];

export const TRILINGUAL_LOCALE_FAMILIES = ['en', 'zh', 'ja'] as const;

export type TrilingualLocaleFamily = (typeof TRILINGUAL_LOCALE_FAMILIES)[number];

export function normalizeSupportedUiLocale(input?: string | null): SupportedUiLocale | null {
  if (!input) {
    return null;
  }

  const normalized = input.trim().replace(/-/g, '_').toLowerCase();

  if (
    normalized.startsWith('zh_hant')
    || normalized.startsWith('zh_tw')
    || normalized.startsWith('zh_hk')
    || normalized.startsWith('zh_mo')
  ) {
    return 'zh_HANT';
  }

  if (normalized.startsWith('zh')) {
    return 'zh_HANS';
  }

  if (normalized.startsWith('ja')) {
    return 'ja';
  }

  if (normalized.startsWith('ko')) {
    return 'ko';
  }

  if (normalized.startsWith('fr')) {
    return 'fr';
  }

  if (normalized.startsWith('en')) {
    return 'en';
  }

  return null;
}

export function resolveTrilingualLocaleFamily(input?: string | null): TrilingualLocaleFamily {
  const locale = normalizeSupportedUiLocale(input);

  if (locale === 'ja') {
    return 'ja';
  }

  if (locale === 'zh_HANS' || locale === 'zh_HANT') {
    return 'zh';
  }

  return 'en';
}

export function toIntlLocale(input?: string | null): string {
  const locale = normalizeSupportedUiLocale(input);

  switch (locale) {
    case 'zh_HANS':
      return 'zh-Hans';
    case 'zh_HANT':
      return 'zh-Hant';
    case 'ja':
      return 'ja';
    case 'ko':
      return 'ko';
    case 'fr':
      return 'fr';
    case 'en':
    default:
      return 'en';
  }
}
