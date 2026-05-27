// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

export const REQUIRED_TOOL_CODES = [
  'keycloak',
  'grafana',
  'flagsmith',
  'svix',
  'nats-jetstream',
  'apisix',
  'appsmith',
  'backstage',
  'openfga',
  'opa',
  'cerbos',
];

export function parseOutArg(argv, fallback) {
  const outIndex = argv.indexOf('--out');
  return outIndex >= 0 && argv[outIndex + 1] ? argv[outIndex + 1] : fallback;
}

export function loadProductEnv() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const productRoot = path.resolve(currentDir, '../../..');

  for (const fileName of ['.env', '.env.local']) {
    const filePath = path.join(productRoot, fileName);

    if (!existsSync(filePath)) {
      continue;
    }

    const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        continue;
      }

      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').replace(/^['"]|['"]$/g, '');

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

export function createPool() {
  loadProductEnv();

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for platform tool evidence scripts');
  }

  return new pg.Pool({ connectionString: process.env.DATABASE_URL });
}

export async function writeEvidence(outPath, payload) {
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(payload, null, 2));

  if (!payload.passed) {
    process.exitCode = 1;
  }
}

export async function withPool(fn) {
  const pool = createPool();

  try {
    return await fn(pool);
  } finally {
    await pool.end();
  }
}

export async function findAcTenant(pool) {
  const result = await pool.query(
    "SELECT id, code, schema_name FROM public.tenant WHERE tier = 'ac' AND is_active = true ORDER BY created_at ASC LIMIT 1"
  );
  return result.rows[0] ?? null;
}
