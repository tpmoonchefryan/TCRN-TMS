#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const baseUrl = process.env.TCRN_SCHEMATHESIS_BASE_URL;
const requireTool = process.env.TCRN_TOOLING_REQUIRE === '1';
const defaultIncludePathRegex = '^/api/v1/health(/(live|ready))?$';

function failOrSkip(message, code = 2) {
  console.warn(`[tooling:schemathesis] SKIP: ${message}`);
  process.exit(requireTool ? code : 0);
}

function normalizedHost(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    failOrSkip('TCRN_SCHEMATHESIS_BASE_URL must be a valid http:// or https:// URL.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    failOrSkip('TCRN_SCHEMATHESIS_BASE_URL must use http:// or https://.');
  }

  return parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
}

function assertAllowedBaseUrl(rawUrl) {
  const host = normalizedHost(rawUrl);
  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
  const privateHosts = new Set(
    (process.env.TCRN_CONTRACT_PRIVATE_HOSTS ?? '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );

  if (localHosts.has(host) || privateHosts.has(host)) {
    return;
  }

  failOrSkip(
    `refusing Schemathesis smoke against unapproved host "${host}". Use localhost/127.0.0.1 or exact TCRN_CONTRACT_PRIVATE_HOSTS.`
  );
}

if (!baseUrl) {
  failOrSkip(
    'set TCRN_SCHEMATHESIS_BASE_URL to a local/test API base URL to run public contract smoke.'
  );
}

assertAllowedBaseUrl(baseUrl);

const includePathRegex =
  process.env.TCRN_SCHEMATHESIS_INCLUDE_PATH_REGEX || defaultIncludePathRegex;

if (
  includePathRegex !== defaultIncludePathRegex &&
  process.env.TCRN_SCHEMATHESIS_ROUTE_PACKET_ACCEPTED !== '1'
) {
  failOrSkip('custom Schemathesis route regex requires TCRN_SCHEMATHESIS_ROUTE_PACKET_ACCEPTED=1.');
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
    includePathRegex,
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
