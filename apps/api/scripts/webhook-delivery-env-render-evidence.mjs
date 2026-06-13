// SPDX-License-Identifier: Apache-2.0
import { parseArgs, readProductText, writeJson } from './webhook-delivery-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'webhook-delivery-env-render.json';
const envSources = [
  ['.env.sample', readProductText('.env.sample')],
  ['.env.local.sample', readProductText('.env.local.sample')],
  ['infra/k8s/runtime.env.example', readProductText('infra/k8s/runtime.env.example')],
  ['docker-compose.yml', readProductText('docker-compose.yml')],
  ['docker-compose.prod.yml', readProductText('docker-compose.prod.yml')],
  ['docker-compose.staging.yml', readProductText('docker-compose.staging.yml')],
];
const matchingLines = envSources.flatMap(([file, text]) =>
  text
    .split('\n')
    .filter((line) => /NATS|WEBHOOK|SVIX|JETSTREAM/.test(line))
    .map((line) => ({ file, line }))
);
const unresolvedPlaceholders = matchingLines.filter(({ line }) => /PLACEHOLDER|TODO/.test(line));

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'k8s_render',
  data_mode: 'read_only_uat',
  target_scope: 'k8s_boundary',
  matchingLines,
  unresolvedPlaceholders,
  phase7Boundary:
    'NATS/Svix/Webhook keys are readiness/config signals only; Phase 7 app delivery writes TCRN outbox first and performs no default provider dispatch.',
  passed: unresolvedPlaceholders.length === 0 && matchingLines.some((entry) => /NATS/.test(entry.line)),
});
