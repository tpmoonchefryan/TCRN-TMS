// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { EVENT_BACKBONE_ADAPTER_CATALOG, EVENT_BACKBONE_BRIDGE_MODES } from '@tcrn/shared';

import { parseArgs, readJson, runRg, sourceSignals, writeJson } from './event-backbone-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'event-backbone-nats-bridge-results.json';
const packageJson = readJson('apps/api/package.json');
const rootPackageJson = readJson('package.json');
const deps = {
  ...(rootPackageJson.dependencies ?? {}),
  ...(rootPackageJson.devDependencies ?? {}),
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.devDependencies ?? {}),
};
const signals = sourceSignals();
const appNatsClientHits = runRg([
  '-n',
  "from 'nats'|from \"nats\"|StringCodec|JetStreamManager|jetstream\\(",
  'apps',
  'packages',
  '-g',
  '!**/node_modules/**',
  '-g',
  '!**/dist/**',
  '-g',
  '!**/scripts/**',
]).filter((line) => !line.includes('packages/shared/src/platform-tools/index.ts'));
const nats = EVENT_BACKBONE_ADAPTER_CATALOG.find((entry) => entry.code === 'nats_jetstream_backbone');
const checks = [
  { id: 'all_bridge_modes_defined', passed: ['disabled', 'local_stub', 'mirror_only', 'selected_event_stream', 'external_provided'].every((mode) => EVENT_BACKBONE_BRIDGE_MODES.includes(mode)) },
  { id: 'default_disabled_config', passed: signals.configSchema.includes('EVENT_BACKBONE_MODE') && signals.configSchema.includes(".default('disabled')") },
  { id: 'nats_transport_only_catalog', passed: nats?.defaultState === 'disabled_readiness' && nats.sourceOfTruthBoundary.includes('never owns TCRN event meaning') },
  { id: 'no_app_nats_client_dependency', passed: !Object.keys(deps).some((name) => name === 'nats') },
  { id: 'no_app_nats_client_usage', passed: appNatsClientHits.length === 0 },
  { id: 'service_distinguishes_modes', passed: signals.service.includes('bridgeModes') && signals.service.includes('requiresExplicitEnable') },
];

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_scan',
  data_mode: 'read_only_uat',
  target_scope: 'nats_bridge',
  nats,
  appNatsClientHits,
  checks,
  passed: checks.every((check) => check.passed),
});
