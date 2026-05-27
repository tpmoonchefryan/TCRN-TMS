export type PlatformConfigExposureClass =
  | 'public_runtime_config'
  | 'ac_operator_config'
  | 'secret_or_sensitive_config';

export interface PlatformConfigExposurePolicy {
  exposureClass: PlatformConfigExposureClass;
  key: string;
  summary: string;
}

const policy = (
  key: string,
  exposureClass: PlatformConfigExposureClass,
  summary: string
): PlatformConfigExposurePolicy => ({
  exposureClass,
  key,
  summary,
});

export const PLATFORM_CONFIG_EXPOSURE_CATALOG = {
  'system.baseDomain': policy(
    'system.baseDomain',
    'public_runtime_config',
    'Public page base domain used to build customer-facing URLs.'
  ),
  'system.version': policy(
    'system.version',
    'public_runtime_config',
    'Runtime version metadata safe for authenticated runtime display.'
  ),
  'system.maintenance': policy(
    'system.maintenance',
    'ac_operator_config',
    'Platform maintenance state controlled by AC operators.'
  ),
  'security.password_policy': policy(
    'security.password_policy',
    'ac_operator_config',
    'Password policy posture without credential material.'
  ),
  'security.session': policy(
    'security.session',
    'ac_operator_config',
    'Session lifetime policy without token or signing material.'
  ),
  'security.rate_limit': policy(
    'security.rate_limit',
    'ac_operator_config',
    'Rate-limit policy controlled by AC operators.'
  ),
  feature_flags: policy(
    'feature_flags',
    'ac_operator_config',
    'Legacy platform feature flag posture; product capability authority is separate.'
  ),
  'dictionaries.profile_types': policy(
    'dictionaries.profile_types',
    'ac_operator_config',
    'Legacy dictionary seed mirrored by AC-governed dictionary authority.'
  ),
  'dictionaries.genders': policy(
    'dictionaries.genders',
    'ac_operator_config',
    'Legacy dictionary seed mirrored by AC-governed dictionary authority.'
  ),
  'dictionaries.languages': policy(
    'dictionaries.languages',
    'ac_operator_config',
    'Legacy dictionary seed mirrored by AC-governed dictionary authority.'
  ),
  'dictionaries.timezones': policy(
    'dictionaries.timezones',
    'ac_operator_config',
    'Legacy dictionary seed mirrored by AC-governed dictionary authority.'
  ),
  'dictionaries.countries': policy(
    'dictionaries.countries',
    'ac_operator_config',
    'Legacy dictionary seed mirrored by AC-governed dictionary authority.'
  ),
  'email.config': policy(
    'email.config',
    'secret_or_sensitive_config',
    'Email provider configuration; raw secret values must never leave the service.'
  ),
} as const satisfies Record<string, PlatformConfigExposurePolicy>;

export type PlatformConfigCatalogKey = keyof typeof PLATFORM_CONFIG_EXPOSURE_CATALOG;

export function getPlatformConfigExposurePolicy(
  key: string
): PlatformConfigExposurePolicy | null {
  return PLATFORM_CONFIG_EXPOSURE_CATALOG[key as PlatformConfigCatalogKey] ?? null;
}

export function isSecretOrSensitivePlatformConfig(key: string) {
  const policy = getPlatformConfigExposurePolicy(key);

  if (policy) {
    return policy.exposureClass === 'secret_or_sensitive_config';
  }

  return /secret|credential|password|private|token|api[_-]?key/i.test(key);
}

export function buildRedactedPlatformConfigValue(policy: PlatformConfigExposurePolicy) {
  return {
    exposureClass: policy.exposureClass,
    redacted: true,
    summary: policy.summary,
  };
}
