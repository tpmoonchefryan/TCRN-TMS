// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { parseArgs, readJson, readProductText, writeJson } from './event-backbone-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'event-backbone-license-sbom-posture.json';
const rootPackage = readJson('package.json');
const apiPackage = readJson('apps/api/package.json');
const lockfile = readProductText('pnpm-lock.yaml');
const dependencyNames = Object.keys({
  ...(rootPackage.dependencies ?? {}),
  ...(rootPackage.devDependencies ?? {}),
  ...(apiPackage.dependencies ?? {}),
  ...(apiPackage.devDependencies ?? {}),
});
const natsDependency = dependencyNames.find((name) => name === 'nats') ?? null;

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_scan',
  data_mode: 'source_scan',
  target_scope: 'nats_bridge',
  nats: {
    dependency: natsDependency,
    license: 'Apache-2.0 posture recorded for existing infra image/readiness; no app client installed',
    posture: 'disabled_readiness_phase_8',
  },
  lockfileSignals: {
    natsClient: /\bnats@/i.test(lockfile),
  },
  passed: !natsDependency,
});
