// SPDX-License-Identifier: Apache-2.0
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const productRoot = path.resolve(scriptDir, '../../..');

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

export function relativeProductPath(filePath) {
  return path.relative(productRoot, filePath);
}

export function writeJson(out, payload) {
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(payload, null, 2));

  if (!payload.passed) {
    process.exitCode = 1;
  }
}

export function runGit(args) {
  return execFileSync('git', args, {
    cwd: productRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
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

export function observabilitySource() {
  return readProductText('packages/shared/src/observability-adapters/index.ts');
}

export function observabilityCodes() {
  return extractConstStringArray(observabilitySource(), 'OBSERVABILITY_ADAPTER_CODES');
}

export const LOCKED_OBSERVABILITY_ADAPTER_CODES = [
  'otel_trace_exporter',
  'otel_metrics_exporter',
  'loki_log_backend',
  'tempo_trace_backend',
  'prometheus_metrics_backend',
  'prometheus_alert_rules',
  'grafana_console',
];

export function exactLockedCatalog(codes) {
  return (
    codes.length === LOCKED_OBSERVABILITY_ADAPTER_CODES.length &&
    codes.every((code, index) => code === LOCKED_OBSERVABILITY_ADAPTER_CODES[index])
  );
}

export function hasUnresolvedPlaceholders(text) {
  return /\b(TBD|TODO|FIXME|<[^>\n]+>|replace-me-(?!db-password|redis-password|minio-password|tencent-ses-secret-id|tencent-ses-secret-key|with-at-least-32-characters|fingerprint-secret|64-char-hex-key-for-stored-email-config|db-host))/i.test(
    text
  );
}
