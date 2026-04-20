import React, { useEffect, useMemo, useState } from 'react';

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
  saveButtonLabel?: string;
  cancelButtonLabel?: string;
  closeButtonAriaLabel?: string;
  addLanguageLabel?: string;
  removeLanguageVisibleLabel?: string;
  removeLanguageAriaLabel?: (language: string) => string;
  searchPlaceholder?: string;
  noSearchResultsText?: string;
  emptyTranslationsText?: string;
  baseValueSuffix?: string;
}

export const TranslationDrawer: React.FC<TranslationDrawerProps> = ({
  open,
  onOpenChange,
  title,
  baseValue,
  translations,
  fields,
  availableLocales,
  onSave,
  saveButtonLabel = 'Save',
  cancelButtonLabel = 'Cancel',
  closeButtonAriaLabel = 'Close translation drawer',
  addLanguageLabel = 'Add Language',
  removeLanguageVisibleLabel = 'Remove',
  removeLanguageAriaLabel = (language) => `Remove ${language} translation`,
  searchPlaceholder = 'Search languages...',
  noSearchResultsText = 'No languages found.',
  emptyTranslationsText = 'No translations added yet.',
  baseValueSuffix = '(Base/English)',
}) => {
  const normalizedFields: TranslationField[] = useMemo(() => {
    if (fields) {
      return fields;
    }

    if (baseValue !== undefined && translations !== undefined) {
      return [
        {
          id: 'default',
          label: 'Translation',
          baseValue,
          translations,
        },
      ];
    }

    return [];
  }, [baseValue, fields, translations]);

  const isLegacyMode = !fields && baseValue !== undefined && translations !== undefined;
  const [localData, setLocalData] = useState<Record<string, Record<string, string>>>({});
  const [activeLocales, setActiveLocales] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

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
    setSearchQuery('');
    setIsSearching(false);
  }, [normalizedFields, open]);

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

  const filteredLocales = useMemo(() => {
    if (!searchQuery.trim()) {
      return unselectedLocales;
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    return unselectedLocales.filter((locale) => {
      const normalizedLabel = locale.label.toLowerCase();
      const normalizedCode = locale.code.toLowerCase();
      return normalizedLabel.includes(normalizedQuery) || normalizedCode.includes(normalizedQuery);
    });
  }, [searchQuery, unselectedLocales]);

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
    setActiveLocales((current) => {
      const next = new Set(current);
      next.add(localeCode);
      return next;
    });
    setSearchQuery('');
    setIsSearching(false);
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
                {field.baseValue || <span className="italic text-slate-400">Empty</span>}
              </div>
            </div>
          ))}
        </div>

        <hr className="border-slate-200" />

        <div className="flex flex-1 flex-col gap-8">
          {activeLocaleList.map((localeCode) => {
            const localeDef = localeLookup.get(localeCode);
            const localeLabel = localeDef?.label ?? localeCode;

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

                {normalizedFields.map((field) => (
                  <div key={`${localeCode}-${field.id}`} className="flex flex-col gap-1.5">
                    <label htmlFor={`trans-${localeCode}-${field.id}`} className={`text-sm font-medium ${tokens.colors.text}`}>
                      {field.label}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        id={`trans-${localeCode}-${field.id}`}
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
            <div className="mt-2 border-t border-dashed border-slate-200 pt-4">
              {!isSearching ? (
                <button
                  type="button"
                  onClick={() => setIsSearching(true)}
                  disabled={isSaving}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-indigo-200 py-3 text-sm font-medium text-indigo-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {addLanguageLabel}
                </button>
              ) : (
                <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className={`text-sm font-medium ${tokens.colors.text}`}>{addLanguageLabel}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSearching(false);
                        setSearchQuery('');
                      }}
                      className="text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    autoFocus
                  />
                  <div className="mt-2 flex max-h-48 flex-col gap-1 overflow-y-auto">
                    {filteredLocales.map((locale) => (
                      <button
                        key={locale.code}
                        type="button"
                        onClick={() => handleAddLanguage(locale.code)}
                        className="w-full rounded px-3 py-2 text-left text-sm hover:bg-indigo-50 hover:text-indigo-700 focus:bg-indigo-50 focus:outline-none"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>{locale.label}</span>
                          <span className="text-xs uppercase tracking-[0.16em] text-slate-400">{locale.code}</span>
                        </div>
                      </button>
                    ))}
                    {filteredLocales.length === 0 ? (
                      <p className="py-2 text-center text-sm italic text-slate-500">
                        {noSearchResultsText}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </ActionDrawer>
  );
};
