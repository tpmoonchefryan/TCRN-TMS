#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const productRoot = process.cwd();
const requireTool = process.env.TCRN_TOOLING_REQUIRE === '1';
const keepTrivy = process.env.TCRN_KEEP_TRIVY === '1';
const trivyDir = path.join(productRoot, '.tmp/trivy');
const trivyPath = path.join(trivyDir, 'tcrn-tms-trivy.json');

mkdirSync(trivyDir, { recursive: true });

const result = spawnSync(
  'trivy',
  [
    'fs',
    '--scanners',
    'vuln,misconfig',
    '--skip-dirs',
    'node_modules',
    '--skip-dirs',
    '.next',
    '--skip-dirs',
    'dist',
    '--skip-dirs',
    'coverage',
    '--no-progress',
    '--format',
    'json',
    '--output',
    trivyPath,
    '.',
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
  console.warn('[tooling:trivy] SKIP: trivy is not installed on PATH.');
  process.exit(requireTool ? 127 : 0);
}
if (result.error) {
  throw result.error;
}

const summary = {
  vulnerabilities: {},
  misconfigurations: {},
  targets: 0,
};
let parseFailed = false;

if (existsSync(trivyPath)) {
  try {
    const report = JSON.parse(readFileSync(trivyPath, 'utf8'));
    for (const item of report.Results ?? []) {
      summary.targets += 1;
      for (const vulnerability of item.Vulnerabilities ?? []) {
        const severity = vulnerability.Severity ?? 'UNKNOWN';
        summary.vulnerabilities[severity] = (summary.vulnerabilities[severity] ?? 0) + 1;
      }
      for (const misconfiguration of item.Misconfigurations ?? []) {
        const severity = misconfiguration.Severity ?? 'UNKNOWN';
        summary.misconfigurations[severity] = (summary.misconfigurations[severity] ?? 0) + 1;
      }
    }
  } catch {
    parseFailed = true;
  }
}

if (!keepTrivy) {
  rmSync(trivyDir, { force: true, recursive: true });
}

if (parseFailed) {
  console.warn(
    `[tooling:trivy] ADVISORY_EXIT=1: unable to parse JSON report stderr_lines=${result.stderr.split('\n').filter(Boolean).length} ` +
      (keepTrivy ? `report=${trivyPath}` : 'report=cleaned')
  );
  process.exit(requireTool ? 1 : 0);
}

if (result.status !== 0) {
  console.warn(
    `[tooling:trivy] ADVISORY_EXIT=${result.status} stderr_lines=${result.stderr.split('\n').filter(Boolean).length}. ` +
      'The result is non-blocking unless TCRN_TOOLING_REQUIRE=1 is set.'
  );
  process.exit(requireTool ? result.status : 0);
}

console.log(
  `[tooling:trivy] OK targets=${summary.targets} ` +
    `vulnerabilities=${JSON.stringify(summary.vulnerabilities)} ` +
    `misconfigurations=${JSON.stringify(summary.misconfigurations)} ` +
    (keepTrivy ? `report=${trivyPath}` : 'report=cleaned')
);
