// SPDX-License-Identifier: Apache-2.0
import {
  BULLMQ_QUEUE_CLASSIFICATIONS,
  TCRN_EVENT_DEFINITIONS,
  readEventRegistryBaseline,
} from '@tcrn/shared';

import {
  parseArgs,
  readProductText,
  runGit,
  runRg,
  sourceSignals,
  writeJson,
} from './event-backbone-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'event-backbone-inventory-baseline.json';
const queueSource = readProductText('apps/worker/src/queues/index.ts');
const workerRuntime = readProductText('apps/worker/src/worker-runtime.ts');
const infraText = [
  readProductText('docker-compose.yml'),
  readProductText('docker-compose.staging.yml'),
  readProductText('docker-compose.prod.yml'),
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
]).filter((line) => !line.includes('packages/shared/src/platform-tools/index.ts'));
const signals = sourceSignals();
const queueNames = [...queueSource.matchAll(/([A-Z_]+): '([^']+)'/g)].map((match) => match[2]);
const registry = readEventRegistryBaseline('local');
const productStatus = runGit(['status', '--short', '--branch']);
const productHead = runGit(['rev-parse', 'HEAD']);
const checks = [
  { id: 'product_status_recorded', passed: productStatus.includes('main...origin/main') },
  { id: 'head_recorded', passed: /^[0-9a-f]{40}$/.test(productHead) },
  { id: 'all_queue_names_classified', passed: queueNames.every((queue) => BULLMQ_QUEUE_CLASSIFICATIONS.some((entry) => entry.queue === queue)) },
  { id: 'worker_groups_present', passed: workerRuntime.includes('WORKER_GROUPS') && workerRuntime.includes('customer-data') && workerRuntime.includes('observability') },
  { id: 'nats_infra_present', passed: infraText.includes('NATS_URL') && infraText.includes('nats') },
  { id: 'no_app_level_nats_client', passed: appNatsClientHits.length === 0 },
  {
    id: 'phase7_webhook_boundary_present',
    passed: registry.definitions.some((definition) => definition.code === 'webhook.delivery.replayed'),
  },
  { id: 'registry_baseline_nonempty', passed: registry.total === TCRN_EVENT_DEFINITIONS.length && registry.total > 40 },
];

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_scan',
  data_mode: 'read_only_uat',
  target_scope: 'event_registry',
  product: {
    status: productStatus,
    head: productHead,
  },
  queueNames,
  workerGroups: BULLMQ_QUEUE_CLASSIFICATIONS,
  registry: {
    total: registry.total,
    families: [...new Set(registry.definitions.map((definition) => definition.family))],
  },
  appNatsClientHits,
  checks,
  passed: checks.every((check) => check.passed),
});
