import { describe, expect, it } from 'vitest';

import {
  buildTranslationSavePayload,
  createTranslationDraftState,
  resolveTranslationFields,
  sortActiveLocaleCodes,
  splitUnselectedLocaleOptions,
} from '../patterns/translation-drawer-model';

describe('translation drawer model', () => {
  const availableLocales = [
    { code: 'en', label: 'English' },
    { code: 'zh_HANS', label: '简体中文' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
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
    const { activeLocales, localData } = createTranslationDraftState([
      {
        id: 'name',
        label: 'Name',
        baseValue: 'Base',
        translations: { de: 'Name DE', zh_HANS: 'Name ZH', zz: 'Name ZZ' },
      },
    ]);

    expect(localData).toEqual({
      de: { name: 'Name DE' },
      zh_HANS: { name: 'Name ZH' },
      zz: { name: 'Name ZZ' },
    });
    expect(sortActiveLocaleCodes(activeLocales, availableLocales)).toEqual(['zh_HANS', 'de', 'zz']);
  });

  it('splits priority and long-tail locale add options', () => {
    expect(splitUnselectedLocaleOptions(availableLocales, new Set(['en']))).toEqual({
      unselectedLocales: [
        { code: 'zh_HANS', label: '简体中文' },
        { code: 'fr', label: 'Français' },
        { code: 'de', label: 'Deutsch' },
      ],
      priorityUnselectedLocales: [
        { code: 'zh_HANS', label: '简体中文' },
        { code: 'fr', label: 'Français' },
      ],
      longTailUnselectedLocales: [{ code: 'de', label: 'Deutsch' }],
    });
  });

  it('builds legacy and multi-field payloads without blank values', () => {
    expect(
      buildTranslationSavePayload({
        activeLocaleList: ['fr', 'de'],
        fields: [{ id: 'default', label: 'Name', baseValue: 'Base', translations: {} }],
        isLegacyMode: true,
        localData: { fr: { default: ' Nom ' }, de: { default: '   ' } },
      }),
    ).toEqual({ fr: ' Nom ' });

    expect(
      buildTranslationSavePayload({
        activeLocaleList: ['fr', 'de'],
        fields: [
          { id: 'name', label: 'Name', baseValue: 'Base', translations: {} },
          { id: 'description', label: 'Description', baseValue: 'Base description', translations: {} },
        ],
        isLegacyMode: false,
        localData: {
          fr: { name: 'Nom', description: '' },
          de: { name: 'Name DE', description: 'Beschreibung' },
        },
      }),
    ).toEqual({
      name: { fr: 'Nom', de: 'Name DE' },
      description: { de: 'Beschreibung' },
    });
  });
});
