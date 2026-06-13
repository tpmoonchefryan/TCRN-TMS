// SPDX-License-Identifier: Apache-2.0
import {
  parseArgs,
  runRg,
  runtimeFlagServiceSource,
  runtimeFlagSource,
  writeJson,
} from './runtime-flag-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'runtime-flag-legacy-quarantine.json';
const runtimeSource = runtimeFlagSource();
const service = runtimeFlagServiceSource();
const legacyHits = runRg([
  '-n',
  'settings\\.features|featuresText|splitFeatures|featuresPlaceholder|feature_flags',
  'apps',
  'packages',
  '-g',
  '!**/node_modules/**',
]);
const runtimeLegacyHits = legacyHits.filter((line) =>
  /runtime-flags|runtime_flags|RuntimeFlags/.test(line)
);
const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_scan',
  data_mode: 'read_only_uat',
  target_scope: 'legacy_feature_quarantine',
  legacyHits,
  runtimeLegacyHits,
  tenantSettingsFeaturesExplicitlyDisallowed: runtimeSource.includes(
    'tenantSettingsFeaturesAllowed: false'
  ),
  globalConfigFeatureFlagsExplicitlyDisallowed: runtimeSource.includes(
    'globalConfigFeatureFlagsAllowed: false'
  ),
  serviceDoesNotReadLegacyAuthority:
    !service.includes('settings.features') && !service.includes('global_config.feature_flags'),
  boundary:
    'Legacy feature surfaces are inventoried but not consumed by the runtime flag evaluator or provider bootstrap.',
};

payload.passed =
  payload.runtimeLegacyHits.length === 0 &&
  payload.tenantSettingsFeaturesExplicitlyDisallowed &&
  payload.globalConfigFeatureFlagsExplicitlyDisallowed &&
  payload.serviceDoesNotReadLegacyAuthority;

writeJson(out, payload);
