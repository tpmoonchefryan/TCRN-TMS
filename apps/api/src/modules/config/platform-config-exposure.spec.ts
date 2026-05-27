import { describe, expect, it } from 'vitest';

import {
  getPlatformConfigExposurePolicy,
  isSecretOrSensitivePlatformConfig,
  PLATFORM_CONFIG_EXPOSURE_CATALOG,
} from './platform-config-exposure';

describe('platform config exposure catalog', () => {
  it('classifies seeded platform config keys and denies unknown keys by default', () => {
    expect(getPlatformConfigExposurePolicy('system.baseDomain')?.exposureClass).toBe(
      'public_runtime_config'
    );
    expect(getPlatformConfigExposurePolicy('security.session')?.exposureClass).toBe(
      'ac_operator_config'
    );
    expect(getPlatformConfigExposurePolicy('email.config')?.exposureClass).toBe(
      'secret_or_sensitive_config'
    );
    expect(getPlatformConfigExposurePolicy('security.unreviewed')).toBeNull();
  });

  it('keeps every current seed key in the catalog and treats sensitive unknown names as secret-like', () => {
    expect(Object.keys(PLATFORM_CONFIG_EXPOSURE_CATALOG)).toEqual(
      expect.arrayContaining([
        'system.version',
        'system.maintenance',
        'system.baseDomain',
        'security.password_policy',
        'security.session',
        'security.rate_limit',
        'feature_flags',
        'dictionaries.profile_types',
        'dictionaries.genders',
        'dictionaries.languages',
        'dictionaries.timezones',
        'dictionaries.countries',
      ])
    );
    expect(isSecretOrSensitivePlatformConfig('email.config')).toBe(true);
    expect(isSecretOrSensitivePlatformConfig('security.apiSecret')).toBe(true);
    expect(isSecretOrSensitivePlatformConfig('system.baseDomain')).toBe(false);
  });
});
