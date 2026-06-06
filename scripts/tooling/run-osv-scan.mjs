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
  'table',
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

if (result.stdout) {
  process.stdout.write(result.stdout);
}
if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.status !== 0) {
  console.warn(
    `[tooling:osv] ADVISORY_EXIT=${result.status}. ` +
      'The result is non-blocking unless TCRN_TOOLING_REQUIRE=1 is set.'
  );
  process.exit(requireTool ? result.status : 0);
}

console.log('[tooling:osv] OK');
