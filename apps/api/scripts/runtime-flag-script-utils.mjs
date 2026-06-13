// SPDX-License-Identifier: Apache-2.0
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const productRoot = path.resolve(scriptDir, '../../..');
export const runtimeFixturePath = path.join(productRoot, 'tmp/p6-runtime-flags/fixtures.json');

export const LOCKED_RUNTIME_FLAG_ADAPTER_CODES = [
  'tcrn_static_provider',
  'openfeature_bridge',
  'flagsmith_provider',
  'runtime_kill_switch_policy',
];

export const LOCKED_RUNTIME_FLAG_CODES = [
  'runtime_flags.provider_readiness_probe',
  'runtime_flags.safe_degraded_mode_probe',
];

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg.startsWith('--')) {
      if (next && !next.startsWith('--')) {
        options[arg.slice(2)] = next;
        index += 1;
      } else {
        options[arg.slice(2)] = true;
      }
    } else if (!options._) {
      options._ = [arg];
    } else {
      options._.push(arg);
    }
  }

  return options;
}

export function resolveProductPath(...segments) {
  return path.join(productRoot, ...segments);
}

export function readProductText(...segments) {
  return readFileSync(resolveProductPath(...segments), 'utf8');
}

export function readJson(...segments) {
  return JSON.parse(readProductText(...segments));
}

export function writeJson(out, payload) {
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(payload, null, 2));

  if (!payload.passed) {
    process.exitCode = 1;
  }
}

export function writeFixture(payload) {
  mkdirSync(path.dirname(runtimeFixturePath), { recursive: true });
  writeFileSync(runtimeFixturePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export function readFixture() {
  try {
    return JSON.parse(readFileSync(runtimeFixturePath, 'utf8'));
  } catch {
    return null;
  }
}

export function removeFixture() {
  rmSync(runtimeFixturePath, { force: true });
}

export function runGit(args) {
  return execFileSync('git', args, {
    cwd: productRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

export function runRg(args) {
  try {
    return execFileSync('rg', args, {
      cwd: productRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function extractConstStringArray(sourceText, constName) {
  const match = sourceText.match(
    new RegExp(`export const ${constName} = \\[([\\s\\S]*?)\\] as const;`)
  );

  if (!match) {
    return [];
  }

  return Array.from(match[1].matchAll(/'([^']+)'/g)).map((entry) => entry[1]);
}

export function runtimeFlagSource() {
  return readProductText('packages/shared/src/runtime-flags/index.ts');
}

export function runtimeFlagServiceSource() {
  return readProductText('apps/api/src/modules/runtime-flags/runtime-flags.service.ts');
}

export function runtimeFlagControllerSource() {
  return readProductText('apps/api/src/modules/runtime-flags/runtime-flags.controller.ts');
}

export function runtimeFlagCodes() {
  return extractConstStringArray(runtimeFlagSource(), 'RUNTIME_FLAG_ADAPTER_CODES');
}

export function exactLockedCatalog(codes) {
  return (
    codes.length === LOCKED_RUNTIME_FLAG_ADAPTER_CODES.length &&
    codes.every((code, index) => code === LOCKED_RUNTIME_FLAG_ADAPTER_CODES[index])
  );
}

export function classifyRuntimeFlagHits(lines) {
  return lines.map((line) => {
    const lower = line.toLowerCase();
    const compact = lower.replace(/[^a-z0-9]/g, '');
    const classification =
      lower.includes('runtime-flag') ||
      lower.includes('runtime_flag') ||
      lower.includes('runtime flags') ||
      compact.includes('runtimeflag') ||
      compact.includes('runtimeflags') ||
      compact.includes('runtimefeatureflag') ||
      compact.includes('flagsruntime') ||
      compact.includes('flagcode') ||
      compact.includes('registeredflag') ||
      compact.includes('providermaycreateunknownflags') ||
      compact.includes('globalconfigfeatureflagsallowed') ||
      lower.includes('flagsmith') ||
      lower.includes('openfeature')
        ? 'runtime_flag'
        : lower.includes('feature_flags') ||
            lower.includes('feature flags') ||
            lower.includes('feature flag') ||
            lower.includes('settings.features')
          ? 'legacy_feature_quarantine'
        : lower.includes('blocklist') ||
            lower.includes('profanity') ||
            lower.includes('security') ||
            lower.includes('moderation')
          ? 'moderation_security_flag'
          : lower.includes('evidence') || lower.includes('retired')
            ? 'historical_evidence'
            : 'unrelated_flag_term';

    return { line, classification };
  });
}
