import { Prisma } from '@tcrn/database';
import { BadRequestException } from '@nestjs/common';
import { normalizeSupportedUiLocale, resolveTrilingualLocaleFamily } from '@tcrn/shared';

export type ManagedTranslationMap = Record<string, string>;

export interface ManagedNameTranslationCarrier {
  extraData?: Prisma.JsonValue | Record<string, unknown> | null;
  nameEn?: string | null;
  nameJa?: string | null;
  nameZh?: string | null;
}

export interface ManagedNameTranslationPayload {
  extraData: Record<string, unknown> | null;
  nameEn: string;
  nameJa: string | null;
  nameZh: string | null;
  translations: ManagedTranslationMap;
}

function asRecord(input?: Prisma.JsonValue | Record<string, unknown> | null) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  return input as Record<string, unknown>;
}

function readExtraTranslationMap(
  input?: Prisma.JsonValue | Record<string, unknown> | null,
): ManagedTranslationMap {
  const extraData = asRecord(input);
  const candidate = extraData?.translations;

  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return {};
  }

  const result: ManagedTranslationMap = {};

  Object.entries(candidate as Record<string, unknown>).forEach(([localeCode, value]) => {
    if (typeof value !== 'string') {
      return;
    }

    const normalizedValue = value.trim();
    if (!normalizedValue) {
      return;
    }

    result[localeCode] = normalizedValue;
  });

  return result;
}

function applyLegacyTranslation(
  translations: ManagedTranslationMap,
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

function mergeExtraData(
  current: Record<string, unknown> | null,
  translations: ManagedTranslationMap,
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

export function toNullableJsonInput(
  input: Record<string, unknown> | null,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (!input) {
    return Prisma.DbNull;
  }

  return input as Prisma.InputJsonValue;
}

export function normalizeManagedTranslationInput(
  input: Record<string, string>,
): ManagedTranslationMap {
  const result: ManagedTranslationMap = {};

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

    result[normalizedLocale] = normalizedValue;
  });

  return result;
}

export function buildManagedNameTranslations(
  current?: ManagedNameTranslationCarrier | null,
): ManagedTranslationMap {
  if (!current) {
    return {};
  }

  const translations: ManagedTranslationMap = {};
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

export function resolveManagedNameTranslation(
  translations: ManagedTranslationMap,
  localeCode: string | null | undefined,
  fallback: string | null | undefined,
) {
  const normalizedLocale = normalizeSupportedUiLocale(localeCode);

  if (normalizedLocale && translations[normalizedLocale]) {
    return translations[normalizedLocale];
  }

  if (normalizedLocale) {
    const [baseLanguage] = normalizedLocale.split('_');

    if (baseLanguage && translations[baseLanguage]) {
      return translations[baseLanguage];
    }
  }

  const localeFamily = resolveTrilingualLocaleFamily(localeCode);

  if (localeFamily === 'zh') {
    return translations.zh_HANT || translations.zh_HANS || translations.en || fallback || null;
  }

  if (localeFamily === 'ja') {
    return translations.ja || translations.en || fallback || null;
  }

  return translations.en || fallback || null;
}

export function buildManagedNameTranslationPayload(
  input: {
    nameEn?: string;
    nameZh?: string | null;
    nameJa?: string | null;
    translations?: Record<string, string>;
  },
  current?: ManagedNameTranslationCarrier | null,
): ManagedNameTranslationPayload {
  const translations = input.translations !== undefined
    ? normalizeManagedTranslationInput(input.translations)
    : buildManagedNameTranslations(current);

  applyLegacyTranslation(translations, 'en', input.nameEn);
  applyLegacyTranslation(translations, 'zh_HANS', input.nameZh);
  applyLegacyTranslation(translations, 'ja', input.nameJa);

  const nextNameEn = pickLegacyValue(input.nameEn, translations.en, current?.nameEn);
  if (!nextNameEn) {
    throw new BadRequestException('English name is required');
  }

  return {
    translations,
    extraData: mergeExtraData(asRecord(current?.extraData), translations),
    nameEn: nextNameEn,
    nameZh: pickLegacyValue(input.nameZh, translations.zh_HANS, current?.nameZh),
    nameJa: pickLegacyValue(input.nameJa, translations.ja, current?.nameJa),
  };
}

export function decorateManagedNameTranslations<T extends ManagedNameTranslationCarrier>(
  entity: T,
) {
  return {
    ...entity,
    translations: buildManagedNameTranslations(entity),
  };
}
