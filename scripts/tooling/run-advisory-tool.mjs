#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const usage = 'Usage: node scripts/tooling/run-advisory-tool.mjs <tool> [-- <args...>]';
const [tool, ...rawArgs] = process.argv.slice(2);

if (!tool) {
  console.error(usage);
  process.exit(2);
}

const args = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;
const requireTool = process.env.TCRN_TOOLING_REQUIRE === '1';
const result = spawnSync(tool, args, {
  env: process.env,
  shell: false,
  stdio: 'inherit'
});

if (result.error?.code === 'ENOENT') {
  console.warn(
    `[tooling:${tool}] SKIP: ${tool} is not installed on PATH. ` +
      'Install the official local binary before treating this advisory as proof.'
  );
  process.exit(requireTool ? 127 : 0);
}

if (result.error) {
  console.error(`[tooling:${tool}] ERROR: ${result.error.message}`);
  process.exit(requireTool ? 1 : 0);
}

const status = result.status ?? 1;

if (status !== 0) {
  console.warn(
    `[tooling:${tool}] ADVISORY_EXIT=${status}. ` +
      'The result is non-blocking unless TCRN_TOOLING_REQUIRE=1 is set.'
  );
  process.exit(requireTool ? status : 0);
}

console.log(`[tooling:${tool}] OK`);
