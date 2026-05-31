// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { parseArgs, readProductText, writeJson } from './runtime-flag-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'runtime-flag-env-render.json';
const files = ['.env.sample', '.env.local.sample', 'infra/k8s/runtime.env.example'];
const envLines = files.flatMap((file) =>
  readProductText(file)
    .split('\n')
    .filter((line) => /RUNTIME_FLAG|OPENFEATURE|FLAGSMITH|FEATURE_FLAGS/.test(line))
    .map((line) => ({ file, line }))
);
const forbiddenAuthorityLines = envLines.filter((entry) =>
  /FEATURE_FLAGS=|ENABLE_.*MODULE|CAPABILITY|PERMISSION|QUOTA|LICENSE/.test(entry.line)
);
const nonDisabledProviderLines = envLines.filter(
  (entry) =>
    /RUNTIME_FLAG_PROVIDER_MODE|OPENFEATURE|FLAGSMITH/.test(entry.line) &&
    !/disabled|stub|false|^#/.test(entry.line)
);

const payload = {
  checkedAt: new Date().toISOString(),
  test_layer: 'k8s_render',
  data_mode: 'source_scan',
  target_scope: 'k8s_boundary',
  envLines,
  forbiddenAuthorityLines,
  nonDisabledProviderLines,
  defaultMode:
    envLines.length === 0
      ? 'no_runtime_flag_provider_env_introduced'
      : 'runtime_flag_provider_env_must_remain_disabled_or_stubbed',
};

payload.passed = forbiddenAuthorityLines.length === 0 && nonDisabledProviderLines.length === 0;

writeJson(out, payload);
