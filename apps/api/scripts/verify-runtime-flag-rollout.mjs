// SPDX-License-Identifier: Apache-2.0
import {
  LOCKED_RUNTIME_FLAG_ADAPTER_CODES,
  exactLockedCatalog,
  parseArgs,
  runtimeFlagCodes,
  runtimeFlagSource,
  writeJson,
} from './runtime-flag-script-utils.mjs';

const options = parseArgs();
const mode = options.mode ?? 'catalog-readback';
const out = options.out ?? 'runtime-flag-rollout-readback.json';
const source = runtimeFlagSource();
const codes = runtimeFlagCodes();
function adapterBlock(code) {
  const marker = `code: '${code}'`;
  const start = source.indexOf(marker);

  if (start < 0) {
    return '';
  }

  const nextStart = LOCKED_RUNTIME_FLAG_ADAPTER_CODES.map((entry) => `code: '${entry}'`)
    .map((entry) => source.indexOf(entry, start + marker.length))
    .filter((index) => index > start)
    .sort((a, b) => a - b)[0];

  return source.slice(start, nextStart ?? source.indexOf('];', start));
}

const flagsmithBlock = adapterBlock('flagsmith_provider');
const openFeatureBlock = adapterBlock('openfeature_bridge');
const defaultEnabledTrueForExternal = flagsmithBlock.includes('defaultEnabled: true');
const defaultEnabledTrueForOpenFeature = openFeatureBlock.includes('defaultEnabled: true');
const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: mode === 'seed-idempotence' ? 'source_scan' : 'manual_readback',
  data_mode: 'source_scan',
  target_scope: 'provider_profile',
  mode,
  expectedCodes: LOCKED_RUNTIME_FLAG_ADAPTER_CODES,
  actualCodes: codes,
  missingCodes: LOCKED_RUNTIME_FLAG_ADAPTER_CODES.filter((code) => !codes.includes(code)),
  extraCodes: codes.filter((code) => !LOCKED_RUNTIME_FLAG_ADAPTER_CODES.includes(code)),
  exactOrder: exactLockedCatalog(codes),
  flagsmithMappedToPhase4Tool: flagsmithBlock.includes("platformToolCode: 'flagsmith'"),
  externalProvidersDisabledByDefault: !defaultEnabledTrueForExternal && !defaultEnabledTrueForOpenFeature,
  providerUnknownFlagsForbidden: source.includes('providerMayCreateUnknownFlags: false'),
  rawProviderRuleEditingForbidden: source.includes('rawProviderRuleEditingAllowed: false'),
  seedIdempotence:
    mode !== 'seed-idempotence' ||
    (source.match(/code: 'flagsmith_provider'/g) ?? []).length === 1,
};

payload.passed =
  payload.exactOrder &&
  payload.missingCodes.length === 0 &&
  payload.extraCodes.length === 0 &&
  payload.flagsmithMappedToPhase4Tool &&
  payload.externalProvidersDisabledByDefault &&
  payload.providerUnknownFlagsForbidden &&
  payload.rawProviderRuleEditingForbidden &&
  payload.seedIdempotence;

writeJson(out, payload);
