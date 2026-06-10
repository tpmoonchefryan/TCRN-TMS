#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const productRoot = process.cwd();
const requireTool = process.env.TCRN_TOOLING_REQUIRE === '1';
const keepGitleaks = process.env.TCRN_KEEP_GITLEAKS === '1';
const scanHistory = process.env.TCRN_GITLEAKS_HISTORY === '1';
const reportDir = path.join(productRoot, '.tmp/gitleaks');
const reportPath = path.join(reportDir, 'tcrn-tms-gitleaks.json');

mkdirSync(reportDir, { recursive: true });

const gitleaksArgs = [
  'detect',
  '--redact',
  '--report-format',
  'json',
  '--report-path',
  reportPath,
  '--source',
  '.',
];

if (!scanHistory) {
  gitleaksArgs.splice(2, 0, '--log-opts=-1');
}

const result = spawnSync(
  'gitleaks',
  gitleaksArgs,
  {
    cwd: productRoot,
    env: process.env,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  }
);

if (result.error?.code === 'ENOENT') {
  console.warn('[tooling:gitleaks] SKIP: gitleaks is not installed on PATH.');
  process.exit(requireTool ? 127 : 0);
}
if (result.error) {
  throw result.error;
}

let findings = [];
let parseFailed = false;
if (existsSync(reportPath)) {
  try {
    findings = JSON.parse(readFileSync(reportPath, 'utf8') || '[]');
  } catch {
    parseFailed = true;
  }
}

const summary = {
  total: findings.length,
  rules: {},
  historyCommits: new Set(),
};

for (const finding of findings) {
  const rule = finding.RuleID ?? 'unknown';
  summary.rules[rule] = (summary.rules[rule] ?? 0) + 1;
  if (finding.Commit) {
    summary.historyCommits.add(finding.Commit);
  }
}

const topRules = Object.entries(summary.rules)
  .sort((left, right) => right[1] - left[1])
  .slice(0, 8)
  .map(([rule, count]) => `${rule}:${count}`)
  .join(',');

if (!keepGitleaks) {
  rmSync(reportDir, { force: true, recursive: true });
}

if (parseFailed) {
  console.warn(
    `[tooling:gitleaks] ADVISORY_EXIT=1: unable to parse JSON output stdout_bytes=${result.stdout.length} stderr_bytes=${result.stderr.length} ` +
      (keepGitleaks ? `report=${reportPath}` : 'report=cleaned')
  );
  process.exit(requireTool ? 1 : 0);
}

const message =
  `scope=${scanHistory ? 'history' : 'head'} total=${summary.total} rules=${topRules || 'none'} ` +
  `history_commits=${summary.historyCommits.size} ` +
  (keepGitleaks ? `report=${reportPath}` : 'report=cleaned');

if (result.status !== 0) {
  console.warn(
    `[tooling:gitleaks] ADVISORY_EXIT=${result.status} ${message}. ` +
      'The result is non-blocking unless TCRN_TOOLING_REQUIRE=1 is set.'
  );
  process.exit(requireTool ? result.status : 0);
}

console.log(`[tooling:gitleaks] OK ${message}`);
