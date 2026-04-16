import { describe, expect, it } from 'vitest';

import { ENTITY_TYPE_CONFIGS } from '@/components/admin/config-entity-manager/types';
import { CONFIG_ENTITY_TYPES } from '@/components/shared/constants';

describe('blocklist ownership', () => {
  it('keeps blocklist out of generic config entity surfaces', () => {
    const configEntityCodes = CONFIG_ENTITY_TYPES.map<string>((type) => type.code);

    expect(configEntityCodes.includes('blocklist-entry')).toBe(false);
    expect(Object.hasOwn(ENTITY_TYPE_CONFIGS, 'blocklist-entry')).toBe(false);
  });

  it('preserves non-security config entities in the generic list', () => {
    const configEntityCodes = CONFIG_ENTITY_TYPES.map<string>((type) => type.code);

    expect(configEntityCodes.includes('profile-store')).toBe(true);
    expect(Object.hasOwn(ENTITY_TYPE_CONFIGS, 'profile-store')).toBe(true);
  });
});
