#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const productRoot = process.cwd();
const requireTool = process.env.TCRN_TOOLING_REQUIRE === '1';
const keepKnip = process.env.TCRN_KEEP_KNIP === '1';
const reportDir = path.join(productRoot, '.tmp/knip');
const reportPath = path.join(reportDir, 'tcrn-tms-knip.json');

mkdirSync(reportDir, { recursive: true });

const result = spawnSync('pnpm', ['exec', 'knip', '--config', 'knip.json', '--reporter', 'json'], {
  cwd: productRoot,
  env: process.env,
  shell: false,
  stdio: ['ignore', 'pipe', 'pipe'],
  encoding: 'utf8',
});

if (result.error?.code === 'ENOENT') {
  console.warn('[tooling:knip] SKIP: pnpm/knip is not installed on PATH.');
  process.exit(requireTool ? 127 : 0);
}
if (result.error) {
  throw result.error;
}

if (result.stdout) {
  mkdirSync(reportDir, { recursive: true });
  // Keep the raw JSON only in gitignored temp storage while this wrapper summarizes it.
  // It is deleted by default below unless TCRN_KEEP_KNIP=1 is set for private review.
  writeFileSync(reportPath, result.stdout);
}

let issues = [];
let parseFailed = false;
if (existsSync(reportPath)) {
  try {
    const report = JSON.parse(readFileSync(reportPath, 'utf8') || '{}');
    issues = Array.isArray(report.issues) ? report.issues : [];
  } catch {
    parseFailed = true;
  }
}

const categories = {};
const workspaces = {};
const issueKeys = [
  'files',
  'dependencies',
  'devDependencies',
  'optionalPeerDependencies',
  'unlisted',
  'binaries',
  'exports',
  'types',
  'enumMembers',
  'duplicates',
  'unresolved',
  'catalog',
  'namespaceMembers',
];

for (const issue of issues) {
  const workspace =
    String(issue.file ?? '')
      .split('/')
      .slice(0, 2)
      .join('/') || 'root';
  workspaces[workspace] = (workspaces[workspace] ?? 0) + 1;
  for (const key of issueKeys) {
    const count = Array.isArray(issue[key]) ? issue[key].length : 0;
    if (count > 0) {
      categories[key] = (categories[key] ?? 0) + count;
    }
  }
}

const topWorkspaces = Object.entries(workspaces)
  .sort((left, right) => right[1] - left[1])
  .slice(0, 8)
  .map(([workspace, count]) => `${workspace}:${count}`)
  .join(',');

if (!keepKnip) {
  rmSync(reportDir, { force: true, recursive: true });
}

if (parseFailed) {
  console.warn(
    `[tooling:knip] ADVISORY_EXIT=1: unable to parse JSON output stdout_bytes=${result.stdout.length} stderr_bytes=${result.stderr.length} ` +
      (keepKnip ? `report=${reportPath}` : 'report=cleaned')
  );
  process.exit(requireTool ? 1 : 0);
}

const message =
  `issues=${issues.length} categories=${JSON.stringify(categories)} ` +
  `top_workspaces=${topWorkspaces || 'none'} ` +
  (keepKnip ? `report=${reportPath}` : 'report=cleaned');

if (result.status !== 0) {
  console.warn(
    `[tooling:knip] ADVISORY_EXIT=${result.status} ${message}. ` +
      'The result is non-blocking unless TCRN_TOOLING_REQUIRE=1 is set.'
  );
  process.exit(requireTool ? result.status : 0);
}

console.log(`[tooling:knip] OK ${message}`);
