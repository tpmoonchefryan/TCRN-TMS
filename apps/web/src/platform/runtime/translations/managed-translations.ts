import {
  normalizeSupportedUiLocale,
  type SupportedUiLocale,
} from '@tcrn/shared';

import {
  listDictionaryItems,
  listDictionaryTypes,
  type RequestEnvelopeFn,
  type RequestFn,
} from '@/domains/config-dictionary-settings/api/system-dictionary.api';
import { ApiRequestError } from '@/platform/http/api';

export interface TranslationLanguageOption {
  code: string;
  label: string;
}

interface TranslationLanguageLoadResult {
  options: TranslationLanguageOption[];
  error: string | null;
  usedFallback: boolean;
}

type TranslationDrawerPayload =
  | Record<string, string>
  | Record<string, Record<string, string>>;

interface TranslationSectionLike {
  values: Record<string, string>;
}

const FALLBACK_LANGUAGE_LABELS: Record<SupportedUiLocale, string> = {
  en: 'English',
  zh_HANS: '简体中文',
  zh_HANT: '繁體中文',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
};

const PREFERRED_TRANSLATION_LOCALE_ORDER: SupportedUiLocale[] = [
  'zh_HANS',
  'zh_HANT',
  'ja',
  'ko',
  'fr',
];

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

export function resolveLocalizedLabel(
  translations: Record<string, string>,
  localeCode: string,
  fallback: string,
) {
  const normalizedLocale = normalizeSupportedUiLocale(localeCode);

  if (normalizedLocale && translations[normalizedLocale]) {
    return translations[normalizedLocale];
  }

  if (localeCode.startsWith('zh')) {
    return translations.zh_HANS || translations.zh_HANT || translations.en || fallback;
  }

  const baseLanguage = localeCode.split(/[-_]/)[0];
  if (baseLanguage && translations[baseLanguage]) {
    return translations[baseLanguage];
  }

  return translations.en || fallback;
}

export async function loadTranslationLanguageOptions(
  request: RequestFn,
  requestEnvelope: RequestEnvelopeFn,
  selectedLocale: SupportedUiLocale,
  fallbackError: string,
) : Promise<TranslationLanguageLoadResult> {
  const fallbackOptions = buildFallbackTranslationLanguageOptions();

  try {
    const types = await listDictionaryTypes(request, selectedLocale);
    const languageType = types.find((entry) => ['language', 'languages'].includes(entry.type.toLowerCase()));

    if (!languageType) {
      return {
        options: fallbackOptions,
        error: null,
        usedFallback: true,
      };
    }

    const items = await listAllTranslationLanguageItems(
      requestEnvelope,
      languageType.type,
      selectedLocale,
    );

    return {
      options: mergeTranslationLanguageOptions(items, selectedLocale),
      error: null,
      usedFallback: false,
    };
  } catch (reason) {
    return {
      options: fallbackOptions,
      error: getErrorMessage(reason, fallbackError),
      usedFallback: true,
    };
  }
}

export function buildManagedTranslations(
  baseEnglishValue: string | null | undefined,
  managedTranslations: Record<string, string> | null | undefined,
) {
  const nextTranslations: Record<string, string> = {};

  const normalizedEnglish = baseEnglishValue?.trim();
  if (normalizedEnglish) {
    nextTranslations.en = normalizedEnglish;
  }

  Object.entries(managedTranslations ?? {}).forEach(([localeCode, value]) => {
    const normalizedValue = value.trim();

    if (!normalizedValue || localeCode === 'en') {
      return;
    }

    nextTranslations[localeCode] = normalizedValue;
  });

  return nextTranslations;
}

export function extractManagedTranslations(
  baseEnglishValue: string | null | undefined,
  translations: Record<string, string> | null | undefined,
  legacyValues?: Record<string, string | null | undefined>,
) {
  const nextTranslations: Record<string, string> = {
    ...(translations ?? {}),
  };

  Object.entries(legacyValues ?? {}).forEach(([localeCode, value]) => {
    const normalizedValue = value?.trim();
    if (!normalizedValue) {
      return;
    }

    const normalizedLocale = normalizeLegacyLocaleCode(localeCode);
    if (!normalizedLocale || nextTranslations[normalizedLocale]) {
      return;
    }

    nextTranslations[normalizedLocale] = normalizedValue;
  });

  delete nextTranslations.en;

  Object.keys(nextTranslations).forEach((localeCode) => {
    if (!nextTranslations[localeCode]?.trim()) {
      delete nextTranslations[localeCode];
    }
  });

  if ((baseEnglishValue ?? '').trim().length === 0) {
    delete nextTranslations.en;
  }

  return nextTranslations;
}

export function pickLegacyLocaleValue(
  translations: Record<string, string>,
  localeCode: string,
) {
  const value = translations[localeCode]?.trim();
  return value ? value : undefined;
}

export function extractSingleFieldTranslationPayload(
  payload: TranslationDrawerPayload,
) {
  const firstValue = Object.values(payload)[0];

  if (typeof firstValue === 'string' || firstValue === undefined) {
    return payload as Record<string, string>;
  }

  return (payload as Record<string, Record<string, string>>).default ?? {};
}

export function countManagedLocaleValues(sections: TranslationSectionLike[]) {
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

function normalizeLegacyLocaleCode(localeCode: string) {
  const supportedLocale = normalizeSupportedUiLocale(localeCode);
  if (supportedLocale) {
    return supportedLocale;
  }

  const normalizedKey = localeCode.trim().replace(/-/g, '_');
  const alias = LEGACY_LOCALE_ALIAS[normalizedKey] ?? LEGACY_LOCALE_ALIAS[normalizedKey.toLowerCase()];
  if (alias) {
    return alias;
  }

  const normalizedSupportedLocale = normalizeSupportedUiLocale(normalizedKey);
  return normalizedSupportedLocale ?? null;
}

const LEGACY_LOCALE_ALIAS: Record<string, SupportedUiLocale> = {
  zh: 'zh_HANS',
  zhhans: 'zh_HANS',
  zhHans: 'zh_HANS',
  zh_hans: 'zh_HANS',
  zhhant: 'zh_HANT',
  zhHant: 'zh_HANT',
  zh_hant: 'zh_HANT',
};

function buildFallbackTranslationLanguageOptions(): TranslationLanguageOption[] {
  return PREFERRED_TRANSLATION_LOCALE_ORDER.map((code) => ({
    code,
    label: FALLBACK_LANGUAGE_LABELS[code],
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
  selectedLocale: SupportedUiLocale,
): TranslationLanguageOption[] {
  const merged = new Map<string, { code: string; label: string; priority: number }>();

  buildFallbackTranslationLanguageOptions().forEach((option, index) => {
    merged.set(option.code, {
      ...option,
      priority: index,
    });
  });

  items.forEach((item) => {
    const normalizedCode = normalizeLegacyLocaleCode(item.code) ?? item.code.trim().replace(/-/g, '_');
    if (!normalizedCode || normalizedCode.toLowerCase() === 'en') {
      return;
    }

    const existing = merged.get(normalizedCode);
    const label = resolveLocalizedLabel(item.translations, selectedLocale, item.nameEn);
    const canReplaceExistingLabel = isCanonicalTranslationLocaleCode(item.code, normalizedCode);

    if (!existing) {
      merged.set(normalizedCode, {
        code: normalizedCode,
        label,
        priority: Number.MAX_SAFE_INTEGER,
      });
      return;
    }

    if (
      existing.priority === Number.MAX_SAFE_INTEGER
      || (
        canReplaceExistingLabel
        && existing.label === FALLBACK_LANGUAGE_LABELS[existing.code as SupportedUiLocale]
      )
    ) {
      merged.set(normalizedCode, {
        code: normalizedCode,
        label,
        priority: existing.priority,
      });
    }
  });

  return Array.from(merged.values())
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return left.label.localeCompare(right.label, selectedLocale.replace('_', '-'));
    })
    .map(({ code, label }) => ({
      code,
      label,
    }));
}

function isCanonicalTranslationLocaleCode(rawCode: string, normalizedCode: string) {
  return rawCode.trim().replace(/-/g, '_').toLowerCase() === normalizedCode.toLowerCase();
}
