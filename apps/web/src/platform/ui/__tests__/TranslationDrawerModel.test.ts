import type { PartialLocalizedText, SupportedUiLocale } from '@tcrn/shared';
import { describe, expect, it } from 'vitest';

import {
  buildTranslationSavePayload,
  createTranslationDraftState,
  resolveTranslationFields,
  sortActiveLocaleCodes,
  splitUnselectedLocaleOptions,
} from '../patterns/translation-drawer-model';

describe('translation drawer model', () => {
  const availableLocales: Array<{ code: SupportedUiLocale; label: string }> = [
    { code: 'en', label: 'English' },
    { code: 'zh_HANS', label: '简体中文' },
    { code: 'zh_HANT', label: '繁體中文' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' },
    { code: 'fr', label: 'Français' },
  ];

  it('normalizes legacy single-field input into the common field shape', () => {
    expect(
      resolveTranslationFields({
        baseValue: 'Base',
        fallbackLabel: 'Fallback label',
        legacyFieldLabel: 'Legacy label',
        translations: { fr: 'Base FR' },
      }),
    ).toEqual([
      {
        id: 'default',
        label: 'Legacy label',
        baseValue: 'Base',
        translations: { fr: 'Base FR' },
      },
    ]);
  });

  it('creates local draft state and sorts active locales by dictionary order first', () => {
    const unsupportedLocale = 'unsupported_locale';
    const { activeLocales, localData } = createTranslationDraftState([
      {
        id: 'name',
        label: 'Name',
        baseValue: 'Base',
        translations: {
          fr: 'Name FR',
          zh_HANS: 'Name ZH',
          [unsupportedLocale]: 'Name unsupported',
        } as PartialLocalizedText,
      },
    ]);

    expect(localData).toEqual({
      fr: { name: 'Name FR' },
      zh_HANS: { name: 'Name ZH' },
    });
    expect(sortActiveLocaleCodes(activeLocales, availableLocales)).toEqual(['zh_HANS', 'fr']);
  });

  it('keeps every canonical locale in the priority add options', () => {
    expect(splitUnselectedLocaleOptions(availableLocales, new Set(['en']))).toEqual({
      unselectedLocales: [
        { code: 'zh_HANS', label: '简体中文' },
        { code: 'zh_HANT', label: '繁體中文' },
        { code: 'ja', label: '日本語' },
        { code: 'ko', label: '한국어' },
        { code: 'fr', label: 'Français' },
      ],
      priorityUnselectedLocales: [
        { code: 'zh_HANS', label: '简体中文' },
        { code: 'zh_HANT', label: '繁體中文' },
        { code: 'ja', label: '日本語' },
        { code: 'ko', label: '한국어' },
        { code: 'fr', label: 'Français' },
      ],
      longTailUnselectedLocales: [],
    });
  });

  it('builds legacy and multi-field payloads without blank values', () => {
    expect(
      buildTranslationSavePayload({
        activeLocaleList: ['fr', 'ko'],
        fields: [{ id: 'default', label: 'Name', baseValue: 'Base', translations: {} }],
        isLegacyMode: true,
        localData: { fr: { default: ' Nom ' }, ko: { default: '   ' } },
      }),
    ).toEqual({ fr: ' Nom ' });

    expect(
      buildTranslationSavePayload({
        activeLocaleList: ['fr', 'ko'],
        fields: [
          { id: 'name', label: 'Name', baseValue: 'Base', translations: {} },
          { id: 'description', label: 'Description', baseValue: 'Base description', translations: {} },
        ],
        isLegacyMode: false,
        localData: {
          fr: { name: 'Nom', description: '' },
          ko: { name: 'Name KO', description: 'Description KO' },
        },
      }),
    ).toEqual({
      name: { fr: 'Nom', ko: 'Name KO' },
      description: { ko: 'Description KO' },
    });
  });
});
