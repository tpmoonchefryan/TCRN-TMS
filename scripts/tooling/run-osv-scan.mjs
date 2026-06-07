#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const requireTool = process.env.TCRN_TOOLING_REQUIRE === '1';

function run(args) {
  return spawnSync('osv-scanner', args, {
    cwd: process.cwd(),
    env: process.env,
    shell: false,
    encoding: 'utf8',
  });
}

const args = [
  'scan',
  'source',
  '--lockfile',
  'pnpm-lock.yaml',
  '--experimental-exclude',
  'node_modules',
  '--experimental-exclude',
  '.next',
  '--experimental-exclude',
  'dist',
  '--format',
  'json',
  '--verbosity',
  'warn',
  '.',
];

const result = run(args);

if (result.error?.code === 'ENOENT') {
  console.warn('[tooling:osv] SKIP: osv-scanner is not installed on PATH.');
  process.exit(requireTool ? 127 : 0);
}
if (result.error) {
  throw result.error;
}

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
const unsupportedLockfile =
  output.includes('could not determine extractor suitable to this file') ||
  output.includes('No package sources found');

if (unsupportedLockfile) {
  console.warn(
    '[tooling:osv] SKIP: osv-scanner 2.x did not accept the current pnpm lockfile/source layout. ' +
      'Keep Trivy as the active dependency advisory lane until OSV support is proven.'
  );
  process.exit(requireTool ? result.status || 1 : 0);
}

let vulnerabilityCount = 0;
let packageCount = 0;
const ecosystems = {};
const severity = {};

try {
  const report = JSON.parse(result.stdout || '{}');
  for (const scanResult of report.results ?? []) {
    for (const pkg of scanResult.packages ?? []) {
      const vulnerabilities = Array.isArray(pkg.vulnerabilities) ? pkg.vulnerabilities : [];
      if (vulnerabilities.length === 0) {
        continue;
      }
      packageCount += 1;
      const ecosystem = pkg.package?.ecosystem ?? 'unknown';
      ecosystems[ecosystem] = (ecosystems[ecosystem] ?? 0) + 1;
      for (const vulnerability of vulnerabilities) {
        vulnerabilityCount += 1;
        const sev =
          vulnerability.database_specific?.severity ??
          vulnerability.severity?.[0]?.type ??
          vulnerability.severity?.[0]?.score ??
          'unknown';
        severity[sev] = (severity[sev] ?? 0) + 1;
      }
    }
  }
} catch {
  console.warn('[tooling:osv] ADVISORY_EXIT=1: unable to parse JSON output.');
  process.exit(requireTool ? 1 : 0);
}

const message = `packages=${packageCount} vulnerabilities=${vulnerabilityCount} ecosystems=${JSON.stringify(
  ecosystems
)} severity=${JSON.stringify(severity)}`;

if (result.status !== 0) {
  console.warn(
    `[tooling:osv] ADVISORY_EXIT=${result.status} ${message}. ` +
      'The result is non-blocking unless TCRN_TOOLING_REQUIRE=1 is set.'
  );
  process.exit(requireTool ? result.status : 0);
}

console.log(`[tooling:osv] OK ${message}`);
