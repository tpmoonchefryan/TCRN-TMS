// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { normalizeSupportedUiLocale } from '@tcrn/shared';

type TranslationMap = Record<string, string>;

export interface LegacyNameCarrier {
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  extraData?: Record<string, unknown> | null;
}

export interface LegacyNameTranslationInput {
  nameEn?: string;
  nameZh?: string | null;
  nameJa?: string | null;
  translations?: Record<string, string>;
}

export interface LegacyNameTranslationPayload {
  translations: TranslationMap;
  extraData: Record<string, unknown> | null;
  nameEn: string | null;
  nameZh: string | null;
  nameJa: string | null;
}

export function buildNameTranslations(current?: LegacyNameCarrier | null): TranslationMap {
  if (!current) {
    return {};
  }

  const translations: TranslationMap = {};
  applyLegacyTranslation(translations, 'en', current.nameEn);
  applyLegacyTranslation(translations, 'zh_HANS', current.nameZh);
  applyLegacyTranslation(translations, 'ja', current.nameJa);

  const extraTranslations = readExtraTranslationMap(current.extraData);
  Object.entries(extraTranslations).forEach(([localeCode, value]) => {
    if (!translations[localeCode]) {
      translations[localeCode] = value;
    }
  });

  return translations;
}

export function buildNameTranslationPayload(
  input: LegacyNameTranslationInput,
  current?: LegacyNameCarrier | null,
): LegacyNameTranslationPayload {
  const translations = input.translations !== undefined
    ? normalizeTranslationInput(input.translations)
    : buildNameTranslations(current);

  applyLegacyTranslation(translations, 'en', input.nameEn);
  applyLegacyTranslation(translations, 'zh_HANS', input.nameZh);
  applyLegacyTranslation(translations, 'ja', input.nameJa);

  return {
    translations,
    extraData: mergeExtraData(current?.extraData ?? null, translations),
    nameEn: pickLegacyValue(input.nameEn, translations.en, current?.nameEn),
    nameZh: pickLegacyValue(input.nameZh, translations.zh_HANS, current?.nameZh),
    nameJa: pickLegacyValue(input.nameJa, translations.ja, current?.nameJa),
  };
}

function readExtraTranslationMap(extraData?: Record<string, unknown> | null): TranslationMap {
  const candidate = extraData?.translations;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return {};
  }

  const translations: TranslationMap = {};

  Object.entries(candidate as Record<string, unknown>).forEach(([localeCode, value]) => {
    if (typeof value !== 'string') {
      return;
    }

    const normalizedValue = value.trim();
    if (!normalizedValue) {
      return;
    }

    translations[localeCode] = normalizedValue;
  });

  return translations;
}

function normalizeTranslationInput(input: Record<string, string>): TranslationMap {
  const translations: TranslationMap = {};

  Object.entries(input).forEach(([localeCode, value]) => {
    if (typeof value !== 'string') {
      return;
    }

    const normalizedValue = value.trim();
    if (!normalizedValue) {
      return;
    }

    const supportedLocale = normalizeSupportedUiLocale(localeCode);
    const normalizedLocale = supportedLocale ?? localeCode.trim().replace(/-/g, '_');
    if (!normalizedLocale) {
      return;
    }

    translations[normalizedLocale] = normalizedValue;
  });

  return translations;
}

function mergeExtraData(
  current: Record<string, unknown> | null,
  translations: TranslationMap,
) {
  const nextExtraData = current ? { ...current } : {};
  const extraTranslations = Object.fromEntries(
    Object.entries(translations).filter(([localeCode]) => !['en', 'zh_HANS', 'ja'].includes(localeCode)),
  );

  delete nextExtraData.translations;

  if (Object.keys(extraTranslations).length > 0) {
    nextExtraData.translations = extraTranslations;
  }

  return Object.keys(nextExtraData).length > 0 ? nextExtraData : null;
}

function applyLegacyTranslation(
  translations: TranslationMap,
  localeCode: 'en' | 'zh_HANS' | 'ja',
  value: string | null | undefined,
) {
  if (value === undefined || value === null) {
    return;
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    delete translations[localeCode];
    return;
  }

  translations[localeCode] = normalizedValue;
}

function pickLegacyValue(
  explicitValue: string | null | undefined,
  translationValue: string | undefined,
  currentValue?: string | null,
) {
  if (explicitValue !== undefined && explicitValue !== null) {
    const trimmed = explicitValue.trim();
    return trimmed || null;
  }

  if (translationValue !== undefined) {
    return translationValue;
  }

  return currentValue ?? null;
}
