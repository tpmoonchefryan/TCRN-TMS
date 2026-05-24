import {
  SUPPORTED_UI_LOCALES,
  type PartialLocalizedText,
  type SupportedUiLocale,
} from '@tcrn/shared';

export interface TranslationField {
  id: string;
  label: string;
  type?: 'text' | 'textarea';
  baseValue: string;
  translations: PartialLocalizedText;
  placeholder?: string;
}

export interface TranslationLocaleOption {
  code: SupportedUiLocale;
  label: string;
}

export type TranslationLocalData = Partial<Record<SupportedUiLocale, Record<string, string>>>;
export type TranslationFieldPayload = Partial<Record<SupportedUiLocale, string>>;
export type TranslationSavePayload =
  | Record<string, TranslationFieldPayload>
  | TranslationFieldPayload;

const PRIORITY_LOCALES: ReadonlySet<SupportedUiLocale> = new Set(SUPPORTED_UI_LOCALES);

export function resolveTranslationFields({
  fields,
  baseValue,
  translations,
  fallbackLabel,
  legacyFieldLabel,
}: {
  fields?: TranslationField[];
  baseValue?: string;
  translations?: PartialLocalizedText;
  fallbackLabel: string;
  legacyFieldLabel?: string;
}): TranslationField[] {
  if (fields) {
    return fields;
  }

  if (baseValue !== undefined && translations !== undefined) {
    return [
      {
        id: 'default',
        label: legacyFieldLabel ?? fallbackLabel,
        baseValue,
        translations,
      },
    ];
  }

  return [];
}

export function createTranslationDraftState(fields: TranslationField[]) {
  const localData: TranslationLocalData = {};
  const activeLocales = new Set<SupportedUiLocale>();

  fields.forEach((field) => {
    Object.entries(field.translations ?? {}).forEach(([localeCode, value]) => {
      if (!SUPPORTED_UI_LOCALES.includes(localeCode as SupportedUiLocale)) {
        return;
      }
      const supportedLocale = localeCode as SupportedUiLocale;
      activeLocales.add(supportedLocale);
      localData[supportedLocale] = {
        ...(localData[supportedLocale] ?? {}),
        [field.id]: value,
      };
    });
  });

  return { activeLocales, localData };
}

export function sortActiveLocaleCodes(
  activeLocales: Set<SupportedUiLocale>,
  availableLocales: TranslationLocaleOption[]
) {
  const availableOrder = new Map(availableLocales.map((locale, index) => [locale.code, index]));

  return Array.from(activeLocales).sort((left, right) => {
    const leftOrder = availableOrder.get(left);
    const rightOrder = availableOrder.get(right);

    if (leftOrder !== undefined && rightOrder !== undefined && leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    if (leftOrder !== undefined) {
      return -1;
    }

    if (rightOrder !== undefined) {
      return 1;
    }

    return left.localeCompare(right);
  });
}

export function splitUnselectedLocaleOptions(
  availableLocales: TranslationLocaleOption[],
  activeLocales: Set<SupportedUiLocale>
) {
  const unselectedLocales = availableLocales.filter((locale) => !activeLocales.has(locale.code));

  return {
    longTailUnselectedLocales: unselectedLocales.filter(
      (locale) => !PRIORITY_LOCALES.has(locale.code)
    ),
    priorityUnselectedLocales: unselectedLocales.filter((locale) =>
      PRIORITY_LOCALES.has(locale.code)
    ),
    unselectedLocales,
  };
}

export function buildTranslationSavePayload({
  activeLocaleList,
  fields,
  isLegacyMode,
  localData,
}: {
  activeLocaleList: SupportedUiLocale[];
  fields: TranslationField[];
  isLegacyMode: boolean;
  localData: TranslationLocalData;
}): TranslationSavePayload {
  if (isLegacyMode) {
    const payload: TranslationFieldPayload = {};

    activeLocaleList.forEach((localeCode) => {
      const value = localData[localeCode]?.default;
      if (value?.trim()) {
        payload[localeCode] = value;
      }
    });

    return payload;
  }

  const payload: Record<string, TranslationFieldPayload> = {};
  fields.forEach((field) => {
    payload[field.id] = {};
  });

  activeLocaleList.forEach((localeCode) => {
    fields.forEach((field) => {
      const value = localData[localeCode]?.[field.id];
      if (value?.trim()) {
        payload[field.id][localeCode] = value;
      }
    });
  });

  return payload;
}
