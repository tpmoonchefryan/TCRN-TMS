#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';

const productRoot = process.cwd();
const apiRoot = path.join(productRoot, 'apps/api');
const rawArgs = process.argv.slice(2);
const outDirIndex = rawArgs.indexOf('--out-dir');
const requestedOutDir =
  outDirIndex >= 0 && rawArgs[outDirIndex + 1] ? rawArgs[outDirIndex + 1] : '.tmp/openapi-current';
const absoluteOutDir = path.resolve(productRoot, requestedOutDir);
const apiRelativeOutDir = path.relative(apiRoot, absoluteOutDir);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? productRoot,
    env: process.env,
    shell: false,
    stdio: options.stdio ?? 'inherit',
  });

  if (result.error) {
    console.error(`[tooling:openapi] ERROR: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (process.env.TCRN_OPENAPI_SKIP_WORKSPACE_PREPARE !== '1') {
  run('pnpm', ['--filter', '@tcrn/shared', 'build']);
  run('pnpm', ['--filter', '@tcrn/database', 'build']);
}

run('pnpm', [
  '--dir',
  'apps/api',
  'exec',
  'ts-node',
  'scripts/api-registry-openapi-export.ts',
  '--out-dir',
  apiRelativeOutDir,
]);
