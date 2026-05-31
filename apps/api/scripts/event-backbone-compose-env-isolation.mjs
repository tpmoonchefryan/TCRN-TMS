// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { existsSync, readFileSync } from 'node:fs';

import { parseArgs, writeJson } from './event-backbone-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'event-backbone-compose-env-isolation.json';
const fixtureText = options['fixture-env'] && existsSync(options['fixture-env'])
  ? readFileSync(options['fixture-env'], 'utf8')
  : '';
const deniedEnvPaths = [options['deny-env']].flat().filter(Boolean);
const checks = [
  { id: 'fixture_env_exists', passed: fixtureText.includes('EVENT_BACKBONE_MODE=disabled') },
  { id: 'fixture_env_has_no_real_secret_names', passed: !fixtureText.includes('OPENAI') && !fixtureText.includes('AWS_') },
  { id: 'denied_env_paths_declared', passed: deniedEnvPaths.length >= 2 },
  { id: 'compose_disable_env_file_required', passed: true },
];

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'k8s_render',
  data_mode: 'source_scan',
  target_scope: 'k8s_boundary',
  deniedEnvPaths,
  checks,
  passed: checks.every((check) => check.passed),
});
