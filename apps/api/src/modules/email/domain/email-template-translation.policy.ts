// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Prisma } from '@tcrn/database';
import { normalizeSupportedUiLocale } from '@tcrn/shared';

type TranslationMap = Record<string, string>;
type TranslationFieldKey =
  | 'translations'
  | 'subjectTranslations'
  | 'bodyHtmlTranslations'
  | 'bodyTextTranslations';

interface LegacyFieldCarrier {
  en: string | null;
  zh: string | null;
  ja: string | null;
}

export interface EmailTemplateTranslationCarrier {
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  subjectEn: string;
  subjectZh: string | null;
  subjectJa: string | null;
  bodyHtmlEn: string;
  bodyHtmlZh: string | null;
  bodyHtmlJa: string | null;
  bodyTextEn: string | null;
  bodyTextZh: string | null;
  bodyTextJa: string | null;
  extraData?: Prisma.JsonValue | Record<string, unknown> | null;
}

export interface EmailTemplateTranslationInput {
  nameEn?: string;
  nameZh?: string | null;
  nameJa?: string | null;
  translations?: Record<string, string>;
  subjectEn?: string;
  subjectZh?: string | null;
  subjectJa?: string | null;
  subjectTranslations?: Record<string, string>;
  bodyHtmlEn?: string;
  bodyHtmlZh?: string | null;
  bodyHtmlJa?: string | null;
  bodyHtmlTranslations?: Record<string, string>;
  bodyTextEn?: string;
  bodyTextZh?: string | null;
  bodyTextJa?: string | null;
  bodyTextTranslations?: Record<string, string>;
}

export interface EmailTemplateTranslationPayload {
  translations: TranslationMap;
  subjectTranslations: TranslationMap;
  bodyHtmlTranslations: TranslationMap;
  bodyTextTranslations: TranslationMap;
  extraData: Record<string, unknown> | null;
  nameEn: string | null;
  nameZh: string | null;
  nameJa: string | null;
  subjectEn: string | null;
  subjectZh: string | null;
  subjectJa: string | null;
  bodyHtmlEn: string | null;
  bodyHtmlZh: string | null;
  bodyHtmlJa: string | null;
  bodyTextEn: string | null;
  bodyTextZh: string | null;
  bodyTextJa: string | null;
}

export interface EmailTemplateTranslationMaps {
  translations: TranslationMap;
  subjectTranslations: TranslationMap;
  bodyHtmlTranslations: TranslationMap;
  bodyTextTranslations: TranslationMap;
}

export function buildEmailTemplateTranslationMaps(
  current?: EmailTemplateTranslationCarrier | null,
): EmailTemplateTranslationMaps {
  return {
    translations: buildFieldTranslations(
      {
        en: current?.nameEn ?? null,
        zh: current?.nameZh ?? null,
        ja: current?.nameJa ?? null,
      },
      current?.extraData ?? null,
      'translations',
    ),
    subjectTranslations: buildFieldTranslations(
      {
        en: current?.subjectEn ?? null,
        zh: current?.subjectZh ?? null,
        ja: current?.subjectJa ?? null,
      },
      current?.extraData ?? null,
      'subjectTranslations',
    ),
    bodyHtmlTranslations: buildFieldTranslations(
      {
        en: current?.bodyHtmlEn ?? null,
        zh: current?.bodyHtmlZh ?? null,
        ja: current?.bodyHtmlJa ?? null,
      },
      current?.extraData ?? null,
      'bodyHtmlTranslations',
    ),
    bodyTextTranslations: buildFieldTranslations(
      {
        en: current?.bodyTextEn ?? null,
        zh: current?.bodyTextZh ?? null,
        ja: current?.bodyTextJa ?? null,
      },
      current?.extraData ?? null,
      'bodyTextTranslations',
    ),
  };
}

export function buildEmailTemplateTranslationPayload(
  input: EmailTemplateTranslationInput,
  current?: EmailTemplateTranslationCarrier | null,
): EmailTemplateTranslationPayload {
  const currentMaps = buildEmailTemplateTranslationMaps(current);
  const translations = input.translations !== undefined
    ? normalizeTranslationInput(input.translations)
    : currentMaps.translations;
  const subjectTranslations = input.subjectTranslations !== undefined
    ? normalizeTranslationInput(input.subjectTranslations)
    : currentMaps.subjectTranslations;
  const bodyHtmlTranslations = input.bodyHtmlTranslations !== undefined
    ? normalizeTranslationInput(input.bodyHtmlTranslations)
    : currentMaps.bodyHtmlTranslations;
  const bodyTextTranslations = input.bodyTextTranslations !== undefined
    ? normalizeTranslationInput(input.bodyTextTranslations)
    : currentMaps.bodyTextTranslations;

  applyLegacyTranslation(translations, 'en', input.nameEn);
  applyLegacyTranslation(translations, 'zh_HANS', input.nameZh);
  applyLegacyTranslation(translations, 'ja', input.nameJa);

  applyLegacyTranslation(subjectTranslations, 'en', input.subjectEn);
  applyLegacyTranslation(subjectTranslations, 'zh_HANS', input.subjectZh);
  applyLegacyTranslation(subjectTranslations, 'ja', input.subjectJa);

  applyLegacyTranslation(bodyHtmlTranslations, 'en', input.bodyHtmlEn);
  applyLegacyTranslation(bodyHtmlTranslations, 'zh_HANS', input.bodyHtmlZh);
  applyLegacyTranslation(bodyHtmlTranslations, 'ja', input.bodyHtmlJa);

  applyLegacyTranslation(bodyTextTranslations, 'en', input.bodyTextEn);
  applyLegacyTranslation(bodyTextTranslations, 'zh_HANS', input.bodyTextZh);
  applyLegacyTranslation(bodyTextTranslations, 'ja', input.bodyTextJa);

  return {
    translations,
    subjectTranslations,
    bodyHtmlTranslations,
    bodyTextTranslations,
    extraData: mergeExtraData(asRecord(current?.extraData), {
      translations,
      subjectTranslations,
      bodyHtmlTranslations,
      bodyTextTranslations,
    }),
    nameEn: pickLegacyValue(input.nameEn, translations.en, current?.nameEn),
    nameZh: pickLegacyValue(input.nameZh, translations.zh_HANS, current?.nameZh),
    nameJa: pickLegacyValue(input.nameJa, translations.ja, current?.nameJa),
    subjectEn: pickLegacyValue(input.subjectEn, subjectTranslations.en, current?.subjectEn),
    subjectZh: pickLegacyValue(input.subjectZh, subjectTranslations.zh_HANS, current?.subjectZh),
    subjectJa: pickLegacyValue(input.subjectJa, subjectTranslations.ja, current?.subjectJa),
    bodyHtmlEn: pickLegacyValue(input.bodyHtmlEn, bodyHtmlTranslations.en, current?.bodyHtmlEn),
    bodyHtmlZh: pickLegacyValue(input.bodyHtmlZh, bodyHtmlTranslations.zh_HANS, current?.bodyHtmlZh),
    bodyHtmlJa: pickLegacyValue(input.bodyHtmlJa, bodyHtmlTranslations.ja, current?.bodyHtmlJa),
    bodyTextEn: pickLegacyValue(input.bodyTextEn, bodyTextTranslations.en, current?.bodyTextEn),
    bodyTextZh: pickLegacyValue(input.bodyTextZh, bodyTextTranslations.zh_HANS, current?.bodyTextZh),
    bodyTextJa: pickLegacyValue(input.bodyTextJa, bodyTextTranslations.ja, current?.bodyTextJa),
  };
}

export function buildFieldTranslations(
  legacyValues: LegacyFieldCarrier,
  extraData: Prisma.JsonValue | Record<string, unknown> | null | undefined,
  key: TranslationFieldKey,
): TranslationMap {
  const translations: TranslationMap = {};
  applyLegacyTranslation(translations, 'en', legacyValues.en);
  applyLegacyTranslation(translations, 'zh_HANS', legacyValues.zh);
  applyLegacyTranslation(translations, 'ja', legacyValues.ja);

  const extraTranslations = readExtraTranslationMap(extraData, key);
  Object.entries(extraTranslations).forEach(([localeCode, value]) => {
    if (!translations[localeCode]) {
      translations[localeCode] = value;
    }
  });

  return translations;
}

function readExtraTranslationMap(
  extraData: Prisma.JsonValue | Record<string, unknown> | null | undefined,
  key: TranslationFieldKey,
): TranslationMap {
  const candidate = asRecord(extraData)?.[key];
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
  maps: Record<TranslationFieldKey, TranslationMap>,
) {
  const nextExtraData = current ? { ...current } : {};

  (Object.keys(maps) as TranslationFieldKey[]).forEach((key) => {
    const extraTranslations = Object.fromEntries(
      Object.entries(maps[key]).filter(([localeCode]) => !['en', 'zh_HANS', 'ja'].includes(localeCode)),
    );

    delete nextExtraData[key];

    if (Object.keys(extraTranslations).length > 0) {
      nextExtraData[key] = extraTranslations;
    }
  });

  return Object.keys(nextExtraData).length > 0 ? nextExtraData : null;
}

function asRecord(
  input?: Prisma.JsonValue | Record<string, unknown> | null,
) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  return input as Record<string, unknown>;
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
