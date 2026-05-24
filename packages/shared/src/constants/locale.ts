export const SUPPORTED_UI_LOCALES = ['en', 'zh_HANS', 'zh_HANT', 'ja', 'ko', 'fr'] as const;

export type SupportedUiLocale = (typeof SUPPORTED_UI_LOCALES)[number];

export type LocalizedText = Record<SupportedUiLocale, string>;

export type LocalizedRecord<T> = Record<SupportedUiLocale, T>;

export type PartialLocalizedText = Partial<LocalizedText>;

export function defineLocalizedText(value: LocalizedText): LocalizedText {
  return value;
}

export function defineLocalizedRecord<T>(value: LocalizedRecord<T>): LocalizedRecord<T> {
  return value;
}

export function emptyLocalizedText(): LocalizedText {
  return {
    en: '',
    zh_HANS: '',
    zh_HANT: '',
    ja: '',
    ko: '',
    fr: '',
  };
}

export function createLocalizedText(value: PartialLocalizedText & { en: string }): LocalizedText {
  return mergeLocalizedText(emptyLocalizedText(), value);
}

export function mergeLocalizedText(
  base: LocalizedText,
  patch?: PartialLocalizedText | null
): LocalizedText {
  const next = { ...base };

  for (const locale of SUPPORTED_UI_LOCALES) {
    const value = patch?.[locale];

    if (value !== undefined) {
      next[locale] = value;
    }
  }

  return next;
}

export function normalizeLocalizedText(
  input?: PartialLocalizedText | null,
  fallback: string = ''
): LocalizedText {
  const normalizedFallback = fallback.trim();
  const source = input ?? {};
  const en = source.en?.trim() || normalizedFallback;

  return {
    en,
    zh_HANS: source.zh_HANS?.trim() || en,
    zh_HANT: source.zh_HANT?.trim() || source.zh_HANS?.trim() || en,
    ja: source.ja?.trim() || en,
    ko: source.ko?.trim() || en,
    fr: source.fr?.trim() || en,
  };
}

export function isLocalizedText(input: unknown): input is LocalizedText {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return false;
  }

  return SUPPORTED_UI_LOCALES.every(
    (locale) => typeof (input as Record<string, unknown>)[locale] === 'string'
  );
}

export function pickLocalizedText(value: LocalizedText, locale?: string | null): string {
  const supportedLocale = normalizeSupportedUiLocale(locale) ?? 'en';
  const localizedValue = value[supportedLocale];

  return localizedValue.trim() || value.en.trim();
}

export function isSupportedUiLocale(input: string): input is SupportedUiLocale {
  return SUPPORTED_UI_LOCALES.includes(input as SupportedUiLocale);
}

export function normalizeSupportedUiLocale(input?: string | null): SupportedUiLocale | null {
  if (!input) {
    return null;
  }

  const normalized = input.trim().replace(/-/g, '_').toLowerCase();

  if (
    normalized.startsWith('zh_hant') ||
    normalized.startsWith('zh_tw') ||
    normalized.startsWith('zh_hk') ||
    normalized.startsWith('zh_mo')
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
