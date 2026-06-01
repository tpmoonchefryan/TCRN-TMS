import { describe, expect, it } from 'vitest';

import { SUPPORTED_UI_LOCALES } from '@tcrn/shared';

import { getLocalizedConfigEntityCatalog } from '@/domains/config-dictionary-settings/screens/settings-family.copy';

describe('settings family copy', () => {
  it('covers Public Presence catalog and Artist Stage fields across every supported locale', () => {
    for (const locale of SUPPORTED_UI_LOCALES) {
      const catalog = getLocalizedConfigEntityCatalog(locale);
      const artistStage = catalog['artist-stage'];
      const templateAsset = catalog['homepage-template-asset'];
      const componentAsset = catalog['homepage-component-asset'];
      const artistStatusField = artistStage.fields.find((field) => field.key === 'artistStatusCode');
      const templateTypeField = artistStage.fields.find(
        (field) => field.key === 'homepageTemplateTypeCode'
      );

      expect(artistStage.label, `${locale} artist stage label`).toBeTruthy();
      expect(artistStage.description, `${locale} artist stage description`).toBeTruthy();
      expect(templateAsset.label, `${locale} template asset label`).toBeTruthy();
      expect(templateAsset.description, `${locale} template asset description`).toBeTruthy();
      expect(componentAsset.label, `${locale} component asset label`).toBeTruthy();
      expect(componentAsset.description, `${locale} component asset description`).toBeTruthy();
      expect(artistStatusField?.label, `${locale} artist status field label`).toBeTruthy();
      expect(templateTypeField?.label, `${locale} template type field label`).toBeTruthy();
      expect(artistStatusField?.options?.map((option) => option.label).filter(Boolean)).toHaveLength(
        3
      );
      expect(templateTypeField?.options?.map((option) => option.label).filter(Boolean)).toHaveLength(
        3
      );
    }
  });

  it('localizes fixed config entity catalog and field labels for Korean and French', () => {
    const koreanCatalog = getLocalizedConfigEntityCatalog('ko');
    const frenchCatalog = getLocalizedConfigEntityCatalog('fr');

    expect(koreanCatalog['profile-store'].label).toBe('프로필 저장소');
    expect(koreanCatalog['artist-stage'].label).toBe('아티스트 단계');
    expect(koreanCatalog['homepage-template-asset'].label).toBe('홈페이지 템플릿 자산');
    expect(koreanCatalog['homepage-component-asset'].label).toBe('홈페이지 컴포넌트 자산');
    expect(koreanCatalog['customer-status'].label).toBe('고객 상태');
    expect(
      koreanCatalog['customer-status'].fields.find((field) => field.key === 'color')?.label
    ).toBe('배지 색상');
    expect(
      koreanCatalog['artist-stage'].fields.find((field) => field.key === 'artistStatusCode')?.label
    ).toBe('아티스트 상태');
    expect(
      koreanCatalog['artist-stage'].fields.find((field) => field.key === 'homepageTemplateTypeCode')
        ?.label
    ).toBe('홈페이지 템플릿 유형');

    expect(frenchCatalog['profile-store'].label).toBe('Archive client');
    expect(frenchCatalog['artist-stage'].label).toBe('Etape artiste');
    expect(frenchCatalog['homepage-template-asset'].label).toBe('Asset modele de page d accueil');
    expect(frenchCatalog['membership-type'].label).toBe('Type d adhesion');
    expect(
      frenchCatalog['membership-type'].fields.find((field) => field.key === 'externalControl')
        ?.label
    ).toBe('Controle externe');
    expect(
      frenchCatalog['artist-stage'].fields.find((field) => field.key === 'artistStatusCode')?.label
    ).toBe('Statut artiste');
    expect(
      frenchCatalog['artist-stage'].fields.find((field) => field.key === 'homepageTemplateTypeCode')
        ?.label
    ).toBe('Type de modele de page d accueil');
  });
});
