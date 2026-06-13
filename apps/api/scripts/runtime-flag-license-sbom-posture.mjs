// SPDX-License-Identifier: Apache-2.0
import { parseArgs, readJson, readProductText, runtimeFlagSource, writeJson } from './runtime-flag-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'runtime-flag-license-sbom-posture.json';
const packageJson = readJson('package.json');
const lockfileText = readProductText('pnpm-lock.yaml');
const source = runtimeFlagSource();
const deps = {
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.devDependencies ?? {}),
};
const providerDeps = Object.keys(deps).filter((name) =>
  /openfeature|flagsmith|launchdarkly|unleash|growthbook/i.test(name)
);
const providerLockfileHits = /openfeature|flagsmith|launchdarkly|unleash|growthbook/i.test(
  lockfileText
);

const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_scan',
  data_mode: 'source_scan',
  target_scope: 'provider_profile',
  providerDeps,
  providerLockfileHits,
  posture: {
    openFeature: source.includes('OpenFeature Apache-2.0 posture recorded before ready.'),
    flagsmith: source.includes('Flagsmith open-core edition/license/SBOM posture recorded before ready.'),
    noProviderReadyWithoutSbom: source.includes('license/SBOM posture recorded before ready'),
  },
};

payload.passed =
  providerDeps.length === 0 &&
  !providerLockfileHits &&
  payload.posture.openFeature &&
  payload.posture.flagsmith &&
  payload.posture.noProviderReadyWithoutSbom;

writeJson(out, payload);
