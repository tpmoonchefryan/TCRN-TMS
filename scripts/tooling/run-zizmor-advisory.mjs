#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const productRoot = process.cwd();
const requireTool = process.env.TCRN_TOOLING_REQUIRE === '1';
const keepZizmor = process.env.TCRN_KEEP_ZIZMOR === '1';
const reportDir = path.join(productRoot, '.tmp/zizmor');
const reportPath = path.join(reportDir, 'tcrn-tms-zizmor.json');

const result = spawnSync('zizmor', ['--format', 'json', '--no-progress', '.github/workflows'], {
  cwd: productRoot,
  env: process.env,
  shell: false,
  stdio: ['ignore', 'pipe', 'pipe'],
  encoding: 'utf8',
});

if (result.error?.code === 'ENOENT') {
  console.warn('[tooling:zizmor] SKIP: zizmor is not installed on PATH.');
  process.exit(requireTool ? 127 : 0);
}
if (result.error) {
  throw result.error;
}

let findings = [];
try {
  findings = JSON.parse(result.stdout || '[]');
} catch {
  if (!keepZizmor) {
    rmSync(reportDir, { force: true, recursive: true });
  }
  console.warn(
    `[tooling:zizmor] ADVISORY_EXIT=1: unable to parse JSON output stdout_bytes=${result.stdout.length} stderr_bytes=${result.stderr.length} ` +
      (keepZizmor ? `report=${reportPath}` : 'report=cleaned')
  );
  process.exit(requireTool ? 1 : 0);
}

if (keepZizmor) {
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(findings, null, 2)}\n`);
}

const summary = {
  total: findings.length,
  ignored: 0,
  severity: {},
  confidence: {},
  auditIds: {},
};

for (const finding of findings) {
  if (finding.ignored) {
    summary.ignored += 1;
  }
  const severity = finding.determinations?.severity ?? 'unknown';
  const confidence = finding.determinations?.confidence ?? 'unknown';
  const ident = finding.ident ?? 'unknown';
  summary.severity[severity] = (summary.severity[severity] ?? 0) + 1;
  summary.confidence[confidence] = (summary.confidence[confidence] ?? 0) + 1;
  summary.auditIds[ident] = (summary.auditIds[ident] ?? 0) + 1;
}

const topAuditIds = Object.entries(summary.auditIds)
  .sort((left, right) => right[1] - left[1])
  .slice(0, 8)
  .map(([ident, count]) => `${ident}:${count}`)
  .join(',');

if (!keepZizmor) {
  rmSync(reportDir, { force: true, recursive: true });
}

if (result.status !== 0) {
  console.warn(
    `[tooling:zizmor] ADVISORY_EXIT=${result.status} total=${summary.total} ignored=${summary.ignored} ` +
      `severity=${JSON.stringify(summary.severity)} confidence=${JSON.stringify(summary.confidence)} ` +
      `top=${topAuditIds || 'none'} ` +
      (keepZizmor ? `report=${reportPath}` : 'report=cleaned')
  );
  process.exit(requireTool ? result.status : 0);
}

console.log(
  `[tooling:zizmor] OK total=${summary.total} ignored=${summary.ignored} ` +
    `severity=${JSON.stringify(summary.severity)} confidence=${JSON.stringify(summary.confidence)} ` +
    `top=${topAuditIds || 'none'} ` +
    (keepZizmor ? `report=${reportPath}` : 'report=cleaned')
);
