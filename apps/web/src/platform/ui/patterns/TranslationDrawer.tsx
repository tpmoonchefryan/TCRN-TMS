import React, { useEffect, useMemo, useRef, useState } from 'react';

import { tokens } from '../foundations/tokens';
import { ActionDrawer } from './ActionDrawer';

export interface TranslationField {
  id: string;
  label: string;
  type?: 'text' | 'textarea';
  baseValue: string;
  translations: Record<string, string>;
  placeholder?: string;
}

export interface TranslationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  baseValue?: string;
  translations?: Record<string, string>;
  fields?: TranslationField[];
  availableLocales: Array<{ code: string; label: string }>;
  onSave: (payload: Record<string, Record<string, string>> | Record<string, string>) => Promise<void>;
  saveButtonLabel: string;
  cancelButtonLabel: string;
  closeButtonAriaLabel?: string;
  addLanguageLabel: string;
  addOtherLanguageLabel: string;
  removeLanguageVisibleLabel: string;
  removeLanguageAriaLabel: (language: string) => string;
  emptyTranslationsText: string;
  baseValueSuffix: string;
  legacyFieldLabel?: string;
}

const PRIORITY_LOCALES = ['en', 'zh_HANS', 'zh_HANT', 'ja', 'ko', 'fr'];

export const TranslationDrawer: React.FC<TranslationDrawerProps> = ({
  open,
  onOpenChange,
  title,
  baseValue,
  translations,
  fields,
  availableLocales,
  onSave,
  saveButtonLabel,
  cancelButtonLabel,
  closeButtonAriaLabel,
  addLanguageLabel,
  addOtherLanguageLabel,
  removeLanguageVisibleLabel,
  removeLanguageAriaLabel,
  emptyTranslationsText,
  baseValueSuffix,
  legacyFieldLabel,
}) => {
  const normalizedFields: TranslationField[] = useMemo(() => {
    if (fields) {
      return fields;
    }

    if (baseValue !== undefined && translations !== undefined) {
      return [
        {
          id: 'default',
          label: legacyFieldLabel ?? title,
          baseValue,
          translations,
        },
      ];
    }

    return [];
  }, [baseValue, fields, legacyFieldLabel, title, translations]);

  const isLegacyMode = !fields && baseValue !== undefined && translations !== undefined;
  const [localData, setLocalData] = useState<Record<string, Record<string, string>>>({});
  const [activeLocales, setActiveLocales] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  
  const [lastAddedLocale, setLastAddedLocale] = useState<string | null>(null);
  const newlyAddedFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const initialData: Record<string, Record<string, string>> = {};
    const initialActiveLocales = new Set<string>();

    normalizedFields.forEach((field) => {
      Object.entries(field.translations ?? {}).forEach(([localeCode, value]) => {
        initialActiveLocales.add(localeCode);
        if (!initialData[localeCode]) {
          initialData[localeCode] = {};
        }
        initialData[localeCode][field.id] = value;
      });
    });

    setLocalData(initialData);
    setActiveLocales(initialActiveLocales);
    setLastAddedLocale(null);
  }, [normalizedFields, open]);

  useEffect(() => {
    if (lastAddedLocale && newlyAddedFieldRef.current) {
      newlyAddedFieldRef.current.focus();
      setLastAddedLocale(null);
    }
  }, [lastAddedLocale]);

  const localeLookup = useMemo(
    () => new Map(availableLocales.map((locale) => [locale.code, locale])),
    [availableLocales],
  );

  const activeLocaleList = useMemo(() => {
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
  }, [activeLocales, availableLocales]);

  const unselectedLocales = useMemo(
    () => availableLocales.filter((locale) => !activeLocales.has(locale.code)),
    [activeLocales, availableLocales],
  );

  const priorityUnselectedLocales = useMemo(() => {
    return unselectedLocales.filter((locale) => PRIORITY_LOCALES.includes(locale.code));
  }, [unselectedLocales]);

  const longTailUnselectedLocales = useMemo(() => {
    return unselectedLocales.filter((locale) => !PRIORITY_LOCALES.includes(locale.code));
  }, [unselectedLocales]);

  const handleChange = (localeCode: string, fieldId: string, value: string) => {
    setLocalData((current) => ({
      ...current,
      [localeCode]: {
        ...(current[localeCode] ?? {}),
        [fieldId]: value,
      },
    }));
  };

  const handleAddLanguage = (localeCode: string) => {
    if (!localeCode) return;
    setActiveLocales((current) => {
      const next = new Set(current);
      next.add(localeCode);
      return next;
    });
    setLastAddedLocale(localeCode);
  };

  const handleRemoveLanguage = (localeCode: string) => {
    setActiveLocales((current) => {
      const next = new Set(current);
      next.delete(localeCode);
      return next;
    });
    setLocalData((current) => {
      const next = { ...current };
      delete next[localeCode];
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      if (isLegacyMode) {
        const payload: Record<string, string> = {};

        activeLocaleList.forEach((localeCode) => {
          const value = localData[localeCode]?.default;
          if (value?.trim()) {
            payload[localeCode] = value;
          }
        });

        await onSave(payload);
      } else {
        const payload: Record<string, Record<string, string>> = {};
        normalizedFields.forEach((field) => {
          payload[field.id] = {};
        });

        activeLocaleList.forEach((localeCode) => {
          normalizedFields.forEach((field) => {
            const value = localData[localeCode]?.[field.id];
            if (value?.trim()) {
              payload[field.id][localeCode] = value;
            }
          });
        });

        await onSave(payload);
      }

      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const footer = (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        disabled={isSaving}
      >
        {cancelButtonLabel}
      </button>
      <button
        type="button"
        onClick={handleSave}
        className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        disabled={isSaving}
      >
        {isSaving ? (
          <svg className="-ml-1 mr-2 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : null}
        {saveButtonLabel}
      </button>
    </div>
  );

  return (
    <ActionDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={footer}
      size="lg"
      closeButtonAriaLabel={closeButtonAriaLabel}
    >
      <div className="flex h-full flex-col gap-8">
        <div className="flex flex-col gap-4">
          {normalizedFields.map((field) => (
            <div key={`base-${field.id}`} className="flex flex-col gap-1.5">
              <label className={`text-sm font-medium ${tokens.colors.textMuted}`}>
                {field.label} <span className="font-normal text-slate-400">{baseValueSuffix}</span>
              </label>
              <div className={`whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 text-sm ${tokens.colors.text}`}>
                {field.baseValue.trim().length > 0 ? (
                  field.baseValue
                ) : (
                  <span aria-hidden="true" className="block min-h-[1.25rem]" />
                )}
              </div>
            </div>
          ))}
        </div>

        <hr className="border-slate-200" />

        <div className="flex flex-1 flex-col gap-8">
          {activeLocaleList.map((localeCode) => {
            const localeDef = localeLookup.get(localeCode);
            const localeLabel = localeDef?.label ?? localeCode;
            const isJustAdded = lastAddedLocale === localeCode;

            return (
              <div key={localeCode} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="min-w-0">
                    <h3 className={`text-base font-bold ${tokens.colors.text}`}>
                      {localeLabel}
                    </h3>
                    {localeDef ? null : (
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                        {localeCode}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveLanguage(localeCode)}
                    className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label={removeLanguageAriaLabel(localeLabel)}
                  >
                    {removeLanguageVisibleLabel}
                  </button>
                </div>

                {normalizedFields.map((field, idx) => (
                  <div key={`${localeCode}-${field.id}`} className="flex flex-col gap-1.5">
                    <label htmlFor={`trans-${localeCode}-${field.id}`} className={`text-sm font-medium ${tokens.colors.text}`}>
                      {field.label}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        id={`trans-${localeCode}-${field.id}`}
                        ref={isJustAdded && idx === 0 ? newlyAddedFieldRef as React.RefObject<HTMLTextAreaElement> : undefined}
                        value={localData[localeCode]?.[field.id] || ''}
                        onChange={(event) => handleChange(localeCode, field.id, event.target.value)}
                        placeholder={field.placeholder}
                        disabled={isSaving}
                        dir="auto"
                        rows={4}
                        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-slate-50 disabled:opacity-50 sm:text-sm"
                      />
                    ) : (
                      <input
                        id={`trans-${localeCode}-${field.id}`}
                        ref={isJustAdded && idx === 0 ? newlyAddedFieldRef as React.RefObject<HTMLInputElement> : undefined}
                        type="text"
                        value={localData[localeCode]?.[field.id] || ''}
                        onChange={(event) => handleChange(localeCode, field.id, event.target.value)}
                        placeholder={field.placeholder}
                        disabled={isSaving}
                        dir="auto"
                        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-slate-50 disabled:opacity-50 sm:text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            );
          })}

          {activeLocaleList.length === 0 ? (
            <p className={`py-4 text-center text-sm italic ${tokens.colors.textMuted}`}>
              {emptyTranslationsText}
            </p>
          ) : null}

          {unselectedLocales.length > 0 ? (
            <div className="mt-2 border-t border-dashed border-slate-200 pt-4 flex flex-col gap-4">
              {priorityUnselectedLocales.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className={`text-sm font-medium ${tokens.colors.text}`}>{addLanguageLabel}</span>
                  <div className="flex flex-wrap gap-2">
                    {priorityUnselectedLocales.map(locale => (
                      <button
                        key={locale.code}
                        type="button"
                        onClick={() => handleAddLanguage(locale.code)}
                        className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      >
                        {locale.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {longTailUnselectedLocales.length > 0 && (
                <div className="flex flex-col gap-2">
                  <label htmlFor="long-tail-locale-select" className="sr-only">
                    {addOtherLanguageLabel}
                  </label>
                  <select
                    id="long-tail-locale-select"
                    className="block w-full rounded-md border-slate-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    value=""
                    onChange={(e) => handleAddLanguage(e.target.value)}
                    aria-label={addOtherLanguageLabel}
                  >
                    <option value="" disabled>{addOtherLanguageLabel}</option>
                    {longTailUnselectedLocales.map((locale) => (
                      <option key={locale.code} value={locale.code}>
                        {locale.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </ActionDrawer>
  );
};
