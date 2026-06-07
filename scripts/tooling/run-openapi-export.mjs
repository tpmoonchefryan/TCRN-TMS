#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const productRoot = process.cwd();
const apiRoot = path.join(productRoot, 'apps/api');
const rawArgs = process.argv.slice(2);
const outDirIndex = rawArgs.indexOf('--out-dir');
const requestedOutDir =
  outDirIndex >= 0 && rawArgs[outDirIndex + 1] ? rawArgs[outDirIndex + 1] : '.tmp/openapi-current';
const absoluteOutDir = path.resolve(productRoot, requestedOutDir);
const expectedDocuments = ['openapi-operations.json', 'openapi-config.json', 'openapi-public.json'];
const openApiDatabaseUrl =
  process.env.TCRN_OPENAPI_DATABASE_URL ||
  process.env.TCRN_OPENAPI_DATABASE_URL_PLACEHOLDER ||
  'postgresql://tcrn_openapi:tcrn_openapi@127.0.0.1:5432/tcrn_openapi?schema=public';
const openApiJwtSecret =
  process.env.TCRN_OPENAPI_JWT_SECRET ||
  'tcrn_openapi_placeholder_jwt_secret_for_static_contract_generation';
const toolingEnv = {
  ...process.env,
  DATABASE_URL: openApiDatabaseUrl,
  JWT_SECRET: openApiJwtSecret,
  NODE_ENV: process.env.NODE_ENV || 'test',
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? productRoot,
    env: options.env ?? toolingEnv,
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

run(
  'pnpm',
  ['exec', 'ts-node', 'scripts/api-registry-openapi-export.ts', '--out-dir', absoluteOutDir],
  { cwd: apiRoot }
);

const missingDocuments = expectedDocuments.filter((documentName) => {
  return !existsSync(path.join(absoluteOutDir, documentName));
});

if (missingDocuments.length > 0) {
  console.error(
    `[tooling:openapi] ERROR: export missing current document(s): ${missingDocuments.join(
      ', '
    )} in ${absoluteOutDir}`
  );
  process.exit(1);
}

console.log(`[tooling:openapi] export OK: ${absoluteOutDir}`);
