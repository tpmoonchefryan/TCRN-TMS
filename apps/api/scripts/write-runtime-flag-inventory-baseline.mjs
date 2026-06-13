// SPDX-License-Identifier: Apache-2.0
import {
  parseArgs,
  readJson,
  readProductText,
  runGit,
  runRg,
  runtimeFlagCodes,
  writeJson,
} from './runtime-flag-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'runtime-flag-inventory-baseline.json';
const packageJson = readJson('package.json');
const lockfileText = readProductText('pnpm-lock.yaml');
const platformToolSource = readProductText('packages/shared/src/platform-tools/index.ts');
const envText = [
  readProductText('.env.sample'),
  readProductText('.env.local.sample'),
  readProductText('infra/k8s/runtime.env.example'),
].join('\n');
const legacyHits = runRg([
  '-n',
  'settings\\.features|featuresText|splitFeatures|featuresPlaceholder|feature_flags|Flagsmith|OpenFeature',
  'apps',
  'packages',
  'infra',
  '-g',
  '!**/node_modules/**',
]);

const deps = {
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.devDependencies ?? {}),
};
const providerDeps = Object.keys(deps).filter((name) =>
  /openfeature|flagsmith|launchdarkly|unleash|growthbook/i.test(name)
);

const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_scan',
  data_mode: 'source_scan',
  target_scope: 'runtime_flag_definition',
  git: {
    branch: runGit(['status', '--short', '--branch']).split('\n')[0],
    head: runGit(['rev-parse', 'HEAD']),
    dirtyEntries: runGit(['status', '--short']).split('\n').filter(Boolean),
  },
  currentSignals: {
    adapterCodes: runtimeFlagCodes(),
    phase4FlagsmithCandidate:
      platformToolSource.includes("code: 'flagsmith'") &&
      platformToolSource.includes("family: 'runtime_flags'"),
    providerDeps,
    lockfileProviderHits: /openfeature|flagsmith|launchdarkly|unleash|growthbook/i.test(lockfileText),
    envRuntimeFlagKeys: envText
      .split('\n')
      .filter((line) => /RUNTIME_FLAG|OPENFEATURE|FLAGSMITH|FEATURE_FLAGS/.test(line)),
    legacyHits,
  },
  boundary:
    'Phase 6 starts from TCRN-owned registry definitions, a Phase 4 Flagsmith catalog candidate, and no enabled external flag provider dependency.',
};

payload.passed =
  payload.currentSignals.adapterCodes.length === 4 &&
  payload.currentSignals.phase4FlagsmithCandidate &&
  payload.currentSignals.providerDeps.length === 0 &&
  !payload.currentSignals.lockfileProviderHits;

writeJson(out, payload);
