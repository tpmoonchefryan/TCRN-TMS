// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { WEBHOOK_DELIVERY_ADAPTER_CATALOG } from '@tcrn/shared';

import {
  parseArgs,
  readJson,
  readProductText,
  runRg,
  sourceSignals,
  writeJson,
} from './webhook-delivery-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'webhook-delivery-nats-readiness.json';
const packageJson = readJson('apps/api/package.json');
const rootPackageJson = readJson('package.json');
const deps = {
  ...(rootPackageJson.dependencies ?? {}),
  ...(rootPackageJson.devDependencies ?? {}),
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.devDependencies ?? {}),
};
const signals = sourceSignals();
const nats = WEBHOOK_DELIVERY_ADAPTER_CATALOG.find((entry) => entry.code === 'nats_jetstream_backbone');
const infraText = [
  readProductText('docker-compose.yml'),
  readProductText('docker-compose.prod.yml'),
  readProductText('docker-compose.staging.yml'),
  readProductText('infra/k8s/dependencies/nats.yaml'),
  readProductText('infra/k8s/runtime.env.example'),
].join('\n');
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
]).filter(
  (line) =>
    !line.includes('packages/shared/src/platform-tools/index.ts') &&
    !line.includes('packages/shared/src/types/integration/schema.ts') &&
    !line.includes('packages/database/prisma/migrations/20260528022000_add_platform_tool_connections')
);
const checks = [
  {
    id: 'nats_catalog_readiness_only',
    passed:
      nats?.defaultState === 'disabled_readiness_only' &&
      nats?.deliveryCapability.includes('deferred to Phase 8'),
  },
  {
    id: 'infra_readiness_present',
    passed: infraText.includes('nats') || infraText.includes('NATS_URL'),
  },
  {
    id: 'no_app_nats_client_dependency',
    passed: !Object.keys(deps).some((name) => name === 'nats'),
  },
  {
    id: 'no_phase7_stream_bridge_claim',
    passed:
      appNatsClientHits.length === 0 &&
      signals.service.includes('provider_dispatch') &&
      !signals.service.includes('JetStream'),
  },
];

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'k8s_render',
  data_mode: 'read_only_uat',
  target_scope: 'nats_backbone',
  nats,
  appNatsClientHits,
  checks,
  passed: checks.every((check) => check.passed),
});
