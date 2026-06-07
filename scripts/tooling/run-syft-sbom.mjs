#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const productRoot = process.cwd();
const shouldGenerate = process.env.TCRN_GENERATE_SBOM === '1';
const keepSbom = process.env.TCRN_KEEP_SBOM === '1';
const requireTool = process.env.TCRN_TOOLING_REQUIRE === '1';
const sbomDir = path.join(productRoot, '.tmp/sbom');
const sbomPath = path.join(sbomDir, 'tcrn-tms.syft.json');

if (!shouldGenerate) {
  console.log('[tooling:syft] SKIP: set TCRN_GENERATE_SBOM=1 for release/audit SBOM evidence.');
  process.exit(0);
}

mkdirSync(sbomDir, { recursive: true });

const result = spawnSync(
  'syft',
  [
    'scan',
    'dir:.',
    '--exclude',
    './node_modules',
    '--exclude',
    './**/node_modules',
    '--exclude',
    './.next',
    '--output',
    `syft-json=${sbomPath}`,
  ],
  {
    cwd: productRoot,
    env: process.env,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  }
);

if (result.error?.code === 'ENOENT') {
  console.warn('[tooling:syft] SKIP: syft is not installed on PATH.');
  process.exit(requireTool ? 127 : 0);
}
if (result.error) {
  throw result.error;
}

let packageCount = null;
let parseFailed = false;
if (existsSync(sbomPath)) {
  try {
    const sbom = JSON.parse(readFileSync(sbomPath, 'utf8'));
    packageCount = Array.isArray(sbom.artifacts) ? sbom.artifacts.length : null;
  } catch {
    parseFailed = true;
  }
}

if (!keepSbom) {
  rmSync(sbomDir, { force: true, recursive: true });
}

if (parseFailed) {
  console.warn(
    `[tooling:syft] ADVISORY_EXIT=1: unable to parse SBOM output stderr_lines=${result.stderr.split('\n').filter(Boolean).length} ` +
      (keepSbom ? `sbom=${sbomPath}` : 'sbom=cleaned')
  );
  process.exit(requireTool ? 1 : 0);
}

if (result.status !== 0) {
  console.warn(
    `[tooling:syft] ADVISORY_EXIT=${result.status} stderr_lines=${result.stderr.split('\n').filter(Boolean).length}. ` +
      'The result is non-blocking unless TCRN_TOOLING_REQUIRE=1 is set.'
  );
  process.exit(requireTool ? result.status : 0);
}

console.log(
  `[tooling:syft] OK${packageCount === null ? '' : ` packages=${packageCount}`} ` +
    (keepSbom ? `sbom=${sbomPath}` : 'sbom=cleaned')
);
