#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const productRoot = process.cwd();
const requireTool = process.env.TCRN_TOOLING_REQUIRE === '1';
const keepActionlint = process.env.TCRN_KEEP_ACTIONLINT === '1';
const reportDir = path.join(productRoot, '.tmp/actionlint');
const reportPath = path.join(reportDir, 'tcrn-tms-actionlint.json');

mkdirSync(reportDir, { recursive: true });

const result = spawnSync('actionlint', ['-format', '{{json .}}'], {
  cwd: productRoot,
  env: process.env,
  shell: false,
  stdio: ['ignore', 'pipe', 'pipe'],
  encoding: 'utf8',
});

if (result.error?.code === 'ENOENT') {
  console.warn('[tooling:actionlint] SKIP: actionlint is not installed on PATH.');
  process.exit(requireTool ? 127 : 0);
}
if (result.error) {
  throw result.error;
}

let findings = [];
let parseFailed = false;
if (result.stdout) {
  writeFileSync(reportPath, result.stdout);
}
if (existsSync(reportPath)) {
  try {
    findings = JSON.parse(readFileSync(reportPath, 'utf8') || '[]');
  } catch {
    parseFailed = true;
  }
}

const kinds = {};
const workflows = {};

for (const finding of findings) {
  const kind = finding.kind ?? 'unknown';
  const workflow = finding.filepath ?? 'unknown';
  kinds[kind] = (kinds[kind] ?? 0) + 1;
  workflows[workflow] = (workflows[workflow] ?? 0) + 1;
}

const topWorkflows = Object.entries(workflows)
  .sort((left, right) => right[1] - left[1])
  .slice(0, 8)
  .map(([workflow, count]) => `${workflow}:${count}`)
  .join(',');

if (!keepActionlint) {
  rmSync(reportDir, { force: true, recursive: true });
}

if (parseFailed) {
  console.warn(
    `[tooling:actionlint] ADVISORY_EXIT=1: unable to parse JSON output stdout_bytes=${result.stdout.length} stderr_bytes=${result.stderr.length} ` +
      (keepActionlint ? `report=${reportPath}` : 'report=cleaned')
  );
  process.exit(requireTool ? 1 : 0);
}

const message =
  `total=${findings.length} kinds=${JSON.stringify(kinds)} ` +
  `top_workflows=${topWorkflows || 'none'} ` +
  (keepActionlint ? `report=${reportPath}` : 'report=cleaned');

if (result.status !== 0) {
  console.warn(
    `[tooling:actionlint] ADVISORY_EXIT=${result.status} ${message}. ` +
      'The result is non-blocking unless TCRN_TOOLING_REQUIRE=1 is set.'
  );
  process.exit(requireTool ? result.status : 0);
}

console.log(`[tooling:actionlint] OK ${message}`);
