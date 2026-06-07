#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';

const baseUrl = process.env.TCRN_BRUNO_BASE_URL;
const requireTool = process.env.TCRN_TOOLING_REQUIRE === '1';
const collectionRoot = path.join(process.cwd(), 'bruno/tcrn-tms');
const timeoutMs = Number.parseInt(process.env.TCRN_BRUNO_TIMEOUT_MS ?? '15000', 10);
const requests = ['health/health.bru', 'health/health-live.bru', 'health/health-ready.bru'];

function failOrSkip(message, code = 2) {
  console.warn(`[tooling:bruno] SKIP: ${message}`);
  process.exit(requireTool ? code : 0);
}

function normalizedHost(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    failOrSkip('TCRN_BRUNO_BASE_URL must be a valid http:// or https:// URL.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    failOrSkip('TCRN_BRUNO_BASE_URL must use http:// or https://.');
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
    `refusing Bruno smoke against unapproved host "${host}". Use localhost/127.0.0.1 or exact TCRN_CONTRACT_PRIVATE_HOSTS.`
  );
}

if (!baseUrl) {
  failOrSkip('set TCRN_BRUNO_BASE_URL to a local/test API base URL to run health smoke.');
}

assertAllowedBaseUrl(baseUrl);

let worstStatus = 0;

for (const request of requests) {
  const result = spawnSync(
    'bru',
    [
      'run',
      request,
      '--env-file',
      'environments/local.bru',
      '--env-var',
      `baseUrl=${baseUrl.replace(/\/+$/g, '')}`,
      '--disable-cookies',
      '--reporter-skip-all-headers',
      '--reporter-skip-body',
      '--bail',
    ],
    {
      cwd: collectionRoot,
      env: process.env,
      shell: false,
      stdio: 'inherit',
      timeout: Number.isFinite(timeoutMs) ? timeoutMs : 15000,
      killSignal: 'SIGTERM',
    }
  );

  if (result.error?.code === 'ENOENT') {
    failOrSkip(
      'bru is not installed on PATH. Install @usebruno/cli before treating this as proof.',
      127
    );
  }

  if (result.error?.code === 'ETIMEDOUT') {
    console.warn(
      `[tooling:bruno] ADVISORY_TIMEOUT request=${request} after ${timeoutMs}ms. ` +
        'The result is non-blocking unless TCRN_TOOLING_REQUIRE=1 is set.'
    );
    worstStatus = worstStatus || 124;
    continue;
  }

  if (result.error) {
    console.error(`[tooling:bruno] ERROR request=${request}: ${result.error.message}`);
    worstStatus = worstStatus || 1;
    continue;
  }

  const status = result.status ?? 1;
  if (status !== 0) {
    worstStatus = worstStatus || status;
  }
}

if (worstStatus !== 0) {
  console.warn(
    `[tooling:bruno] ADVISORY_EXIT=${worstStatus}. ` +
      'The result is non-blocking unless TCRN_TOOLING_REQUIRE=1 is set.'
  );
  process.exit(requireTool ? worstStatus : 0);
}

console.log('[tooling:bruno] OK');
