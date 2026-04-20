// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { normalizeSupportedUiLocale } from '@tcrn/shared';

import type {
  CreateProfileStoreDto,
  UpdateProfileStoreDto,
} from '../dto/pii-config.dto';

type TranslationMap = Record<string, string>;

interface ProfileStoreTranslationCarrier {
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  descriptionEn?: string | null;
  descriptionZh?: string | null;
  descriptionJa?: string | null;
  extraData?: Record<string, unknown> | null;
}

export interface ProfileStoreListRow {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  extraData: Record<string, unknown> | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  version: number;
}

export interface ProfileStoreDetailRow {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  descriptionEn: string | null;
  descriptionZh: string | null;
  descriptionJa: string | null;
  extraData: Record<string, unknown> | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface ProfileStoreCreatePayload {
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  descriptionEn: string | null;
  descriptionZh: string | null;
  descriptionJa: string | null;
  extraData: Record<string, unknown> | null;
  isDefault: boolean;
}

export interface ProfileStoreCreateRow {
  id: string;
  code: string;
  nameEn: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface ProfileStoreUpdateLookupRow {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  descriptionEn: string | null;
  descriptionZh: string | null;
  descriptionJa: string | null;
  extraData: Record<string, unknown> | null;
  isActive: boolean;
  isDefault: boolean;
  version: number;
}

export interface ProfileStoreUpdateRow {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  descriptionEn: string | null;
  descriptionZh: string | null;
  descriptionJa: string | null;
  extraData: Record<string, unknown> | null;
  isActive: boolean;
  isDefault: boolean;
  version: number;
  updatedAt: Date;
}

export interface ProfileStoreFieldChange {
  field:
    | 'nameEn'
    | 'nameZh'
    | 'nameJa'
    | 'descriptionEn'
    | 'descriptionZh'
    | 'descriptionJa'
    | 'extraData'
    | 'isActive'
    | 'isDefault';
  value: unknown;
}

interface ProfileStoreTranslationPayload {
  translations: TranslationMap;
  descriptionTranslations: TranslationMap;
  extraData: Record<string, unknown> | null;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  descriptionEn: string | null;
  descriptionZh: string | null;
  descriptionJa: string | null;
}

export const buildProfileStoreCreatePayload = (
  dto: CreateProfileStoreDto,
): ProfileStoreCreatePayload => {
  const translationPayload = buildProfileStoreTranslationPayload(dto);

  return {
    code: dto.code,
    nameEn: translationPayload.nameEn,
    nameZh: translationPayload.nameZh,
    nameJa: translationPayload.nameJa,
    descriptionEn: translationPayload.descriptionEn,
    descriptionZh: translationPayload.descriptionZh,
    descriptionJa: translationPayload.descriptionJa,
    extraData: translationPayload.extraData,
    isDefault: dto.isDefault ?? false,
  };
};

export const buildProfileStoreListItem = (
  row: ProfileStoreListRow,
  talentCount: number,
  customerCount: number,
) => {
  const { translations } = buildProfileStoreTranslationMaps(row);

  return {
    id: row.id,
    code: row.code,
    name: row.nameEn,
    nameZh: row.nameZh,
    nameJa: row.nameJa,
    translations,
    talentCount,
    customerCount,
    isDefault: row.isDefault,
    isActive: row.isActive,
    createdAt: row.createdAt,
    version: row.version,
  };
};

export const buildProfileStoreDetailResponse = (
  row: ProfileStoreDetailRow,
  talentCount: number,
  customerCount: number,
) => {
  const { translations, descriptionTranslations } = buildProfileStoreTranslationMaps(row);

  return {
    id: row.id,
    code: row.code,
    name: row.nameEn,
    nameZh: row.nameZh,
    nameJa: row.nameJa,
    translations,
    description: row.descriptionEn,
    descriptionZh: row.descriptionZh,
    descriptionJa: row.descriptionJa,
    descriptionTranslations,
    talentCount,
    customerCount,
    isDefault: row.isDefault,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version,
  };
};

export const buildProfileStoreCreateResponse = (row: ProfileStoreCreateRow) => ({
  id: row.id,
  code: row.code,
  name: row.nameEn,
  isDefault: row.isDefault,
  createdAt: row.createdAt,
});

export const buildProfileStoreUpdateChanges = (
  dto: UpdateProfileStoreDto,
  current: ProfileStoreUpdateLookupRow,
): ProfileStoreFieldChange[] => {
  const changes: ProfileStoreFieldChange[] = [];

  const shouldUpdateName =
    dto.nameEn !== undefined ||
    dto.nameZh !== undefined ||
    dto.nameJa !== undefined ||
    dto.translations !== undefined;
  const shouldUpdateDescription =
    dto.descriptionEn !== undefined ||
    dto.descriptionZh !== undefined ||
    dto.descriptionJa !== undefined ||
    dto.descriptionTranslations !== undefined;

  if (shouldUpdateName || shouldUpdateDescription) {
    const translationPayload = buildProfileStoreTranslationPayload(dto, current);

    if (shouldUpdateName) {
      changes.push(
        { field: 'nameEn', value: translationPayload.nameEn },
        { field: 'nameZh', value: translationPayload.nameZh },
        { field: 'nameJa', value: translationPayload.nameJa },
      );
    }

    if (shouldUpdateDescription) {
      changes.push(
        { field: 'descriptionEn', value: translationPayload.descriptionEn },
        { field: 'descriptionZh', value: translationPayload.descriptionZh },
        { field: 'descriptionJa', value: translationPayload.descriptionJa },
      );
    }

    changes.push({
      field: 'extraData',
      value: translationPayload.extraData,
    });
  }

  if (dto.isActive !== undefined) {
    changes.push({ field: 'isActive', value: dto.isActive });
  }

  if (dto.isDefault === true) {
    changes.push({
      field: 'isDefault',
      value: true,
    });
  }

  return changes;
};

export const buildProfileStoreUpdateAudit = (
  previous: ProfileStoreUpdateLookupRow,
  updated: ProfileStoreUpdateRow,
) => {
  const previousTranslations = buildProfileStoreTranslationMaps(previous);
  const updatedTranslations = buildProfileStoreTranslationMaps(updated);

  return {
    oldValue: {
      nameEn: previous.nameEn,
      translations: previousTranslations.translations,
      descriptionTranslations: previousTranslations.descriptionTranslations,
      isActive: previous.isActive,
      isDefault: previous.isDefault,
    },
    newValue: {
      nameEn: updated.nameEn,
      translations: updatedTranslations.translations,
      descriptionTranslations: updatedTranslations.descriptionTranslations,
      isActive: updated.isActive,
      isDefault: updated.isDefault,
    },
  };
};

export const buildProfileStoreUpdateResponse = (row: ProfileStoreUpdateRow) => ({
  id: row.id,
  code: row.code,
  version: row.version,
  updatedAt: row.updatedAt,
});

function buildProfileStoreTranslationMaps(
  current: ProfileStoreTranslationCarrier,
): {
  translations: TranslationMap;
  descriptionTranslations: TranslationMap;
} {
  return {
    translations: buildFieldTranslations(
      {
        en: current.nameEn,
        zh: current.nameZh,
        ja: current.nameJa,
      },
      current.extraData,
      'translations',
    ),
    descriptionTranslations: buildFieldTranslations(
      {
        en: current.descriptionEn,
        zh: current.descriptionZh,
        ja: current.descriptionJa,
      },
      current.extraData,
      'descriptionTranslations',
    ),
  };
}

function buildProfileStoreTranslationPayload(
  input: Pick<
    CreateProfileStoreDto | UpdateProfileStoreDto,
    | 'nameEn'
    | 'nameZh'
    | 'nameJa'
    | 'translations'
    | 'descriptionEn'
    | 'descriptionZh'
    | 'descriptionJa'
    | 'descriptionTranslations'
  >,
  current?: ProfileStoreTranslationCarrier,
): ProfileStoreTranslationPayload {
  const currentMaps = current ? buildProfileStoreTranslationMaps(current) : {
    translations: {},
    descriptionTranslations: {},
  };
  const translations = input.translations !== undefined
    ? normalizeTranslationInput(input.translations)
    : { ...currentMaps.translations };
  const descriptionTranslations = input.descriptionTranslations !== undefined
    ? normalizeTranslationInput(input.descriptionTranslations)
    : { ...currentMaps.descriptionTranslations };

  applyLegacyTranslation(translations, 'en', input.nameEn);
  applyLegacyTranslation(translations, 'zh_HANS', input.nameZh);
  applyLegacyTranslation(translations, 'ja', input.nameJa);

  applyLegacyTranslation(descriptionTranslations, 'en', input.descriptionEn);
  applyLegacyTranslation(descriptionTranslations, 'zh_HANS', input.descriptionZh);
  applyLegacyTranslation(descriptionTranslations, 'ja', input.descriptionJa);

  return {
    translations,
    descriptionTranslations,
    extraData: mergeExtraData(current?.extraData ?? null, translations, descriptionTranslations),
    nameEn: pickLegacyValue(input.nameEn, translations.en, current?.nameEn) ?? '',
    nameZh: pickLegacyValue(input.nameZh, translations.zh_HANS, current?.nameZh),
    nameJa: pickLegacyValue(input.nameJa, translations.ja, current?.nameJa),
    descriptionEn: pickLegacyValue(input.descriptionEn, descriptionTranslations.en, current?.descriptionEn),
    descriptionZh: pickLegacyValue(input.descriptionZh, descriptionTranslations.zh_HANS, current?.descriptionZh),
    descriptionJa: pickLegacyValue(input.descriptionJa, descriptionTranslations.ja, current?.descriptionJa),
  };
}

function buildFieldTranslations(
  legacyValues: {
    en: string | null | undefined;
    zh: string | null | undefined;
    ja: string | null | undefined;
  },
  extraData: Record<string, unknown> | null | undefined,
  key: 'translations' | 'descriptionTranslations',
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
  extraData: Record<string, unknown> | null | undefined,
  key: 'translations' | 'descriptionTranslations',
): TranslationMap {
  const candidate = extraData?.[key];
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

function mergeExtraData(
  current: Record<string, unknown> | null,
  translations: TranslationMap,
  descriptionTranslations: TranslationMap,
) {
  const nextExtraData = current ? { ...current } : {};
  const extraNameTranslations = Object.fromEntries(
    Object.entries(translations).filter(([localeCode]) => !['en', 'zh_HANS', 'ja'].includes(localeCode)),
  );
  const extraDescriptionTranslations = Object.fromEntries(
    Object.entries(descriptionTranslations).filter(([localeCode]) => !['en', 'zh_HANS', 'ja'].includes(localeCode)),
  );

  delete nextExtraData.translations;
  delete nextExtraData.descriptionTranslations;

  if (Object.keys(extraNameTranslations).length > 0) {
    nextExtraData.translations = extraNameTranslations;
  }

  if (Object.keys(extraDescriptionTranslations).length > 0) {
    nextExtraData.descriptionTranslations = extraDescriptionTranslations;
  }

  return Object.keys(nextExtraData).length > 0 ? nextExtraData : null;
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
