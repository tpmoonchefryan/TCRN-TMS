// SPDX-License-Identifier: Apache-2.0
import { parseArgs, readJson, readProductText, writeJson } from './webhook-delivery-script-utils.mjs';

const options = parseArgs();
const out = options.out ?? 'webhook-delivery-license-sbom-posture.json';
const rootPackage = readJson('package.json');
const apiPackage = readJson('apps/api/package.json');
const lockfile = readProductText('pnpm-lock.yaml');
const dependencyNames = Object.keys({
  ...(rootPackage.dependencies ?? {}),
  ...(rootPackage.devDependencies ?? {}),
  ...(apiPackage.dependencies ?? {}),
  ...(apiPackage.devDependencies ?? {}),
});
const svixDependency = dependencyNames.find((name) => /svix/i.test(name)) ?? null;
const natsDependency = dependencyNames.find((name) => name === 'nats') ?? null;

writeJson(out, {
  checkedAt: new Date().toISOString(),
  test_layer: 'source_scan',
  data_mode: 'source_scan',
  target_scope: 'provider_profile',
  svix: {
    dependency: svixDependency,
    license: svixDependency ? 'requires SBOM/license review before ready' : 'not installed',
    posture: 'disabled_readiness_only',
  },
  nats: {
    dependency: natsDependency,
    license: 'Apache-2.0 posture recorded for existing infra image/readiness; no app client installed',
    posture: 'disabled_readiness_only_phase_7',
  },
  lockfileSignals: {
    svix: /svix/i.test(lockfile),
    natsClient: /\bnats@/i.test(lockfile),
  },
  passed: !svixDependency && !natsDependency,
});
