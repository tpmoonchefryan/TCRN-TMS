// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_TOOL_CODES = [
  'keycloak',
  'grafana',
  'flagsmith',
  'svix',
  'nats-jetstream',
  'apisix',
  'appsmith',
  'backstage',
  'openfga',
  'opa',
  'cerbos',
];

function parseOutArg(argv, fallback) {
  const outIndex = argv.indexOf('--out');
  return outIndex >= 0 && argv[outIndex + 1] ? argv[outIndex + 1] : fallback;
}

function readIfExists(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

const out = parseOutArg(process.argv.slice(2), 'platform-tool-deployment-boundary.json');
const apiScriptDir = path.dirname(fileURLToPath(import.meta.url));
const productRoot = path.resolve(apiScriptDir, '../../..');
const composeFiles = ['docker-compose.yml', 'docker-compose.prod.yml', 'docker-compose.staging.yml'];
const composeText = composeFiles.map((file) => readIfExists(path.join(productRoot, file))).join('\n');
const composeTextWithoutAllowedImages = composeText
  .replace(/grafana\/loki/gi, 'allowed-loki-image')
  .replace(/grafana\/tempo/gi, 'allowed-tempo-image');
const renderedToolHits = REQUIRED_TOOL_CODES.filter((code) =>
  composeTextWithoutAllowedImages.includes(code)
);
const allowedExistingInfraHits = ['nats', 'loki', 'tempo'].filter((needle) =>
  composeText.toLowerCase().includes(needle)
);
const forbiddenInstalledTools = renderedToolHits.filter((code) => code !== 'nats-jetstream');
const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'k8s_render',
  data_mode: 'source_scan',
  target_scope: 'k8s_boundary',
  liveClusterRequired: false,
  catalogCodes: REQUIRED_TOOL_CODES,
  composeFiles,
  allowedExistingInfraHits,
  renderedToolHits,
  forbiddenInstalledTools,
  boundary:
    'Phase 4 may record deployment metadata and existing infra classification; full external tool installation remains out of scope.',
  passed: forbiddenInstalledTools.length === 0,
};

mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(payload, null, 2));

if (!payload.passed) {
  process.exitCode = 1;
}
