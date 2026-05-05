export interface TranslationField {
  id: string;
  label: string;
  type?: 'text' | 'textarea';
  baseValue: string;
  translations: Record<string, string>;
  placeholder?: string;
}

export interface TranslationLocaleOption {
  code: string;
  label: string;
}

export type TranslationLocalData = Record<string, Record<string, string>>;
export type TranslationSavePayload = Record<string, Record<string, string>> | Record<string, string>;

const PRIORITY_LOCALES = ['en', 'zh_HANS', 'zh_HANT', 'ja', 'ko', 'fr'];

export function resolveTranslationFields({
  fields,
  baseValue,
  translations,
  fallbackLabel,
  legacyFieldLabel,
}: {
  fields?: TranslationField[];
  baseValue?: string;
  translations?: Record<string, string>;
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
  const activeLocales = new Set<string>();

  fields.forEach((field) => {
    Object.entries(field.translations ?? {}).forEach(([localeCode, value]) => {
      activeLocales.add(localeCode);
      localData[localeCode] = {
        ...(localData[localeCode] ?? {}),
        [field.id]: value,
      };
    });
  });

  return { activeLocales, localData };
}

export function sortActiveLocaleCodes(
  activeLocales: Set<string>,
  availableLocales: TranslationLocaleOption[],
) {
  const availableOrder = new Map(
    availableLocales.map((locale, index) => [locale.code, index]),
  );

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
  activeLocales: Set<string>,
) {
  const unselectedLocales = availableLocales.filter((locale) => !activeLocales.has(locale.code));

  return {
    longTailUnselectedLocales: unselectedLocales.filter((locale) => !PRIORITY_LOCALES.includes(locale.code)),
    priorityUnselectedLocales: unselectedLocales.filter((locale) => PRIORITY_LOCALES.includes(locale.code)),
    unselectedLocales,
  };
}

export function buildTranslationSavePayload({
  activeLocaleList,
  fields,
  isLegacyMode,
  localData,
}: {
  activeLocaleList: string[];
  fields: TranslationField[];
  isLegacyMode: boolean;
  localData: TranslationLocalData;
}): TranslationSavePayload {
  if (isLegacyMode) {
    const payload: Record<string, string> = {};

    activeLocaleList.forEach((localeCode) => {
      const value = localData[localeCode]?.default;
      if (value?.trim()) {
        payload[localeCode] = value;
      }
    });

    return payload;
  }

  const payload: Record<string, Record<string, string>> = {};
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
