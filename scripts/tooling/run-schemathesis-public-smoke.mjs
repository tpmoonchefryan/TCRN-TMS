#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const baseUrl = process.env.TCRN_SCHEMATHESIS_BASE_URL;
const requireTool = process.env.TCRN_TOOLING_REQUIRE === '1';

if (!baseUrl) {
  console.warn(
    '[tooling:schemathesis] SKIP: set TCRN_SCHEMATHESIS_BASE_URL to a local/test API base URL to run public contract smoke.'
  );
  process.exit(requireTool ? 2 : 0);
}

const result = spawnSync(
  'schemathesis',
  [
    'run',
    'apps/api/openapi-baseline/openapi-public.json',
    '--url',
    baseUrl,
    '--phases',
    'examples,coverage',
    '--checks',
    'not_a_server_error,status_code_conformance,content_type_conformance,response_schema_conformance',
    '--include-path-regex',
    '^/api/v1/(health|public)',
    '--rate-limit',
    process.env.TCRN_SCHEMATHESIS_RATE_LIMIT || '30/m',
    '--max-examples',
    process.env.TCRN_SCHEMATHESIS_MAX_EXAMPLES || '3',
    '--request-timeout',
    process.env.TCRN_SCHEMATHESIS_REQUEST_TIMEOUT || '5',
    '--generation-database',
    'none',
    '--output-sanitize',
    'true',
    '--output-truncate',
    'true',
    '--no-color',
  ],
  {
    env: process.env,
    shell: false,
    stdio: 'inherit',
  }
);

if (result.error?.code === 'ENOENT') {
  console.warn('[tooling:schemathesis] SKIP: schemathesis is not installed on PATH.');
  process.exit(requireTool ? 127 : 0);
}

if (result.error) {
  console.error(`[tooling:schemathesis] ERROR: ${result.error.message}`);
  process.exit(requireTool ? 1 : 0);
}

const status = result.status ?? 1;
if (status !== 0) {
  console.warn(
    `[tooling:schemathesis] ADVISORY_EXIT=${status}. ` +
      'The result is non-blocking unless TCRN_TOOLING_REQUIRE=1 is set.'
  );
  process.exit(requireTool ? status : 0);
}

console.log('[tooling:schemathesis] OK');
