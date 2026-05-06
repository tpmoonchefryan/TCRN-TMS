import { describe, expect, it } from 'vitest';

import { getLocalizedConfigEntityCatalog } from '@/domains/config-dictionary-settings/screens/settings-family.copy';

describe('settings family copy', () => {
  it('localizes fixed config entity catalog and field labels for Korean and French', () => {
    const koreanCatalog = getLocalizedConfigEntityCatalog('ko');
    const frenchCatalog = getLocalizedConfigEntityCatalog('fr');

    expect(koreanCatalog['profile-store'].label).toBe('프로필 저장소');
    expect(koreanCatalog['customer-status'].label).toBe('고객 상태');
    expect(koreanCatalog['customer-status'].fields.find((field) => field.key === 'color')?.label).toBe('배지 색상');

    expect(frenchCatalog['profile-store'].label).toBe('Archive client');
    expect(frenchCatalog['membership-type'].label).toBe('Type d adhesion');
    expect(frenchCatalog['membership-type'].fields.find((field) => field.key === 'externalControl')?.label).toBe(
      'Controle externe',
    );
  });
});
