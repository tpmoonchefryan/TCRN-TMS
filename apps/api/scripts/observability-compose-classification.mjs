// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { parseArgs, writeJson } from './observability-script-utils.mjs';

const options = parseArgs();
const composePath = options.compose ?? 'observability-compose-profile-config.redacted.yml';
const out = options.out ?? 'observability-compose-classification.json';
const source = readFileSync(composePath, 'utf8');
const servicePresent = (name) => new RegExp(`^\\s{2}${name}:`, 'm').test(source);

const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'compose_render',
  data_mode: 'compose_render',
  target_scope: 'compose_boundary',
  composePath,
  localOptInServices: ['loki', 'tempo'].filter(servicePresent),
  forbiddenAlwaysOnServices: ['grafana', 'prometheus', 'jaeger', 'mimir', 'otel-collector'].filter(servicePresent),
  secretsRedacted: !/(PASSWORD|SECRET|TOKEN|KEY):\s*(?!["']?\[redacted\])\S/i.test(source),
  classification:
    'Loki and Tempo may appear only as local opt-in observability-profile services; no external observability UI or collector is introduced as always-on in Phase 5.',
};

payload.passed =
  payload.localOptInServices.includes('loki') &&
  payload.localOptInServices.includes('tempo') &&
  payload.forbiddenAlwaysOnServices.length === 0 &&
  payload.secretsRedacted;

writeJson(out, payload);
