import {
  SUPPORTED_UI_LOCALES,
  normalizeLocalizedText,
  normalizeSupportedUiLocale,
  pickLocalizedText,
  type LocalizedRecord,
  type LocalizedText,
  type PartialLocalizedText,
  type SupportedUiLocale,
  toIntlLocale,
} from '@tcrn/shared';

import {
  listDictionaryItems,
  listDictionaryTypes,
  type RequestEnvelopeFn,
  type RequestFn,
} from '@/domains/config-dictionary-settings/api/system-dictionary.api';
import { ApiRequestError } from '@/platform/http/api';

export interface TranslationLanguageOption {
  code: SupportedUiLocale;
  label: string;
}

interface TranslationLanguageLoadResult {
  options: TranslationLanguageOption[];
  error: string | null;
}

type TranslationDrawerPayload =
  | Record<string, string>
  | Record<string, Record<string, string>>;

interface TranslationSectionLike {
  values: Record<string, string>;
}

const LOCALE_LABELS: LocalizedRecord<string> = {
  en: 'English',
  zh_HANS: '简体中文',
  zh_HANT: '繁體中文',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
};

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

export function resolveLocaleRecord<T>(
  locale: string,
  record: LocalizedRecord<T>,
) {
  const normalizedLocale = normalizeSupportedUiLocale(locale);

  if (normalizedLocale) {
    return record[normalizedLocale];
  }

  return record.en;
}

export function pickLocaleText(
  locale: string,
  value: LocalizedText,
) {
  return resolveLocaleRecord(locale, value);
}

export function resolveLocalizedLabel(
  translations: PartialLocalizedText | null | undefined,
  localeCode: string,
  fallback: string,
) {
  const normalized = normalizeSupportedUiLocale(localeCode) ?? 'en';
  const localizedValue = translations?.[normalized]?.trim();

  if (localizedValue) {
    return localizedValue;
  }

  if (translations && typeof translations.en === 'string' && translations.en.trim()) {
    return translations.en;
  }

  return fallback;
}

export function getTranslationLanguageOptions(locale: SupportedUiLocale): TranslationLanguageOption[] {
  return SUPPORTED_UI_LOCALES
    .filter((code) => code !== 'en')
    .map((code) => ({
      code,
      label: pickLocalizedText(
        {
          en: LOCALE_LABELS[code],
          zh_HANS: LOCALE_LABELS[code],
          zh_HANT: LOCALE_LABELS[code],
          ja: LOCALE_LABELS[code],
          ko: LOCALE_LABELS[code],
          fr: LOCALE_LABELS[code],
        },
        locale,
      ),
    }));
}

async function listAllTranslationLanguageItems(
  requestEnvelope: RequestEnvelopeFn,
  dictionaryType: string,
  locale: SupportedUiLocale,
) {
  const items = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const response = await listDictionaryItems(
      requestEnvelope,
      dictionaryType,
      {
        includeInactive: false,
        page,
        pageSize: 250,
      },
      locale,
    );

    items.push(...response.items);
    hasNext = response.pagination.hasNext;
    page += 1;
  }

  return items;
}

function mergeTranslationLanguageOptions(
  items: Awaited<ReturnType<typeof listAllTranslationLanguageItems>>,
  locale: SupportedUiLocale,
): TranslationLanguageOption[] {
  const merged = new Map<SupportedUiLocale, TranslationLanguageOption>();

  items.forEach((item) => {
    const normalizedCode = normalizeSupportedUiLocale(item.code);
    if (!normalizedCode || normalizedCode === 'en') {
      return;
    }

    merged.set(normalizedCode, {
      code: normalizedCode,
      label: resolveLocalizedLabel(item.name, locale, item.code),
    });
  });

  const fallbackOptions = getTranslationLanguageOptions(locale);
  fallbackOptions.forEach((option) => {
    if (!merged.has(option.code)) {
      merged.set(option.code, option);
    }
  });

  return SUPPORTED_UI_LOCALES
    .filter((code) => code !== 'en')
    .flatMap((code) => {
      const option = merged.get(code);
      return option ? [option] : [];
    });
}

export async function loadTranslationLanguageOptions(
  request: RequestFn,
  requestEnvelope: RequestEnvelopeFn,
  locale: SupportedUiLocale,
  fallbackError: string,
): Promise<TranslationLanguageLoadResult> {
  try {
    const types = await listDictionaryTypes(request, locale);
    const languageType = types.find((entry) => ['language', 'languages'].includes(entry.type.toLowerCase()));

    if (!languageType) {
      return {
        options: getTranslationLanguageOptions(locale),
        error: null,
      };
    }

    const items = await listAllTranslationLanguageItems(
      requestEnvelope,
      languageType.type,
      locale,
    );

    return {
      options: mergeTranslationLanguageOptions(items, locale),
      error: null,
    };
  } catch (reason) {
    return {
      options: getTranslationLanguageOptions(locale),
      error: getErrorMessage(reason, fallbackError),
    };
  }
}

export function buildLocalizedTextPayload(
  baseValue: string | null | undefined,
  localeValues: PartialLocalizedText | null | undefined,
): LocalizedText {
  const next: PartialLocalizedText = {};
  const english = baseValue?.trim();

  if (english) {
    next.en = english;
  }

  for (const locale of SUPPORTED_UI_LOCALES) {
    if (locale === 'en') {
      continue;
    }

    const value = localeValues?.[locale]?.trim();
    if (value) {
      next[locale] = value;
    }
  }

  return normalizeLocalizedText(next, english ?? '');
}

export function extractLocalizedTextPayload(
  value: PartialLocalizedText | null | undefined,
) {
  const next: PartialLocalizedText = {};

  for (const locale of SUPPORTED_UI_LOCALES) {
    if (locale === 'en') {
      continue;
    }

    const localizedValue = value?.[locale]?.trim();
    if (localizedValue) {
      next[locale] = localizedValue;
    }
  }

  return next;
}

export function pickLocaleValue(
  value: PartialLocalizedText,
  localeCode: SupportedUiLocale,
) {
  const localizedValue = value[localeCode]?.trim();
  return localizedValue || undefined;
}

export function extractSingleFieldTranslationPayload(
  payload: TranslationDrawerPayload,
) {
  const firstValue = Object.values(payload)[0];

  if (typeof firstValue === 'string' || firstValue === undefined) {
    return payload as PartialLocalizedText;
  }

  return ((payload as Record<string, PartialLocalizedText>).default ?? {}) as PartialLocalizedText;
}

export function countLocaleValues(sections: TranslationSectionLike[]) {
  const filledLocales = new Set<string>();

  sections.forEach((section) => {
    Object.entries(section.values).forEach(([localeCode, value]) => {
      if (value.trim()) {
        filledLocales.add(localeCode);
      }
    });
  });

  return filledLocales.size;
}

export function formatLocaleDateTime(
  locale: string,
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
  locale: string,
  value: number,
) {
  return new Intl.NumberFormat(toIntlLocale(locale)).format(value);
}
