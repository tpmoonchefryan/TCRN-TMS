// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { parseArgs, readProductText, sourceSignals, writeJson } from './event-backbone-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'event-backbone-env-render.json';
const envText = readProductText('infra/k8s/runtime.env.example');
const composeText = [
  readProductText('docker-compose.yml'),
  readProductText('docker-compose.staging.yml'),
  readProductText('docker-compose.prod.yml'),
].join('\n');
const localComposeText = readProductText('docker-compose.yml');
const prodComposeText = readProductText('docker-compose.prod.yml');
const signals = sourceSignals();
const checks = [
  { id: 'event_backbone_env_default_disabled', passed: signals.configSchema.includes('EVENT_BACKBONE_MODE') && signals.configSchema.includes(".default('disabled')") },
  { id: 'nats_url_infra_present', passed: envText.includes('NATS_URL') && composeText.includes('NATS_URL') },
  { id: 'nats_service_profile_gated', passed: /nats:[\s\S]{0,240}profiles:\s*\n\s*-\s*event-backbone/.test(localComposeText) },
  { id: 'nats_ports_loopback_only', passed: localComposeText.includes("'127.0.0.1:4222:4222'") && localComposeText.includes("'127.0.0.1:8222:8222'") && !localComposeText.includes("'4222:4222'") && !localComposeText.includes("'8222:8222'") },
  { id: 'prod_no_default_nats_dependency', passed: !/depends_on:[\s\S]{0,220}\bnats:\s*\n\s*condition:\s*service_started/.test(prodComposeText) },
  { id: 'no_event_backbone_secret_env', passed: !signals.configSchema.includes('EVENT_BACKBONE_SECRET') },
  { id: 'webhook_phase7_env_unchanged', passed: signals.configSchema.includes('WEBHOOK_DELIVERY_DISPATCH_MODE') },
];

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'k8s_render',
  data_mode: 'source_scan',
  target_scope: 'k8s_boundary',
  checks,
  passed: checks.every((check) => check.passed),
});
