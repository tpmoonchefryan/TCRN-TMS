// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Read-only cleanup verification for Phase 3 SSO disposable fixtures.

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { PrismaClient } from '../src/platform/prisma/client';
import { loadRepoEnvFiles } from './load-repo-env';

loadRepoEnvFiles(import.meta.url);

interface CliOptions {
  prefix: string;
  evidenceJson?: string;
}

interface ProviderResidue {
  id: string;
  tenantCode: string;
  code: string;
  ownerScope: string;
}

interface LinkResidue {
  tenantSchema: string;
  id: string;
  providerCode: string;
  providerIssuer: string;
  subject: string;
  revokedAt: string | null;
}

const prisma = new PrismaClient();

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    prefix: 'TEST_P3_SSO',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--prefix' && next) {
      options.prefix = next;
      index += 1;
    } else if (arg === '--evidence-json' && next) {
      options.evidenceJson = next;
      index += 1;
    }
  }

  if (!options.prefix.startsWith('TEST_')) {
    throw new Error('Fixture cleanup verification prefix must start with TEST_.');
  }

  return options;
}

function writeEvidence(filePath: string | undefined, payload: unknown) {
  if (!filePath) {
    return;
  }

  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function quoteIdent(identifier: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }

  return `"${identifier}"`;
}

function providerCode(prefix: string) {
  return `${prefix.toLowerCase().replace(/_/g, '-')}-mock`;
}

async function listTenantSchemas() {
  const rows = await prisma.$queryRawUnsafe<Array<{ schemaName: string }>>(`
    SELECT schema_name AS "schemaName"
    FROM public.tenant
    ORDER BY schema_name
  `);

  return rows.map((row) => row.schemaName);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const expectedProviderCode = providerCode(options.prefix);
  const providerResidue = await prisma.$queryRawUnsafe<ProviderResidue[]>(
    `
      SELECT
        p.id::text,
        t.code AS "tenantCode",
        p.code,
        p.owner_scope AS "ownerScope"
      FROM public.tms_sso_provider p
      JOIN public.tenant t ON t.id = p.tenant_id
      WHERE p.code = $1
         OR p.code LIKE $2
      ORDER BY t.code, p.code
    `,
    expectedProviderCode,
    `${options.prefix.toLowerCase().replace(/_/g, '-')}%`
  );
  const linkResidue: LinkResidue[] = [];

  for (const tenantSchema of await listTenantSchemas()) {
    const schema = quoteIdent(tenantSchema);
    const tableExists = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `
        SELECT to_regclass($1) IS NOT NULL AS "exists"
      `,
      `${tenantSchema}.tms_sso_account_link`
    );

    if (!tableExists[0]?.exists) {
      continue;
    }

    const rows = await prisma.$queryRawUnsafe<LinkResidue[]>(
      `
        SELECT
          $1 AS "tenantSchema",
          id::text,
          provider_code AS "providerCode",
          provider_issuer AS "providerIssuer",
          subject,
          revoked_at::text AS "revokedAt"
        FROM ${schema}.tms_sso_account_link
        WHERE provider_code = $2
           OR subject LIKE $3
        ORDER BY provider_code, subject
      `,
      tenantSchema,
      expectedProviderCode,
      `${options.prefix}%`
    );

    linkResidue.push(...rows);
  }

  const payload = {
    checkedAt: new Date().toISOString(),
    test_layer: 'manual_readback',
    data_mode: 'disposable_fixture',
    target_scope: 'profile_account_link',
    prefix: options.prefix,
    providerResidue,
    linkResidue,
    passed: providerResidue.length === 0 && linkResidue.length === 0,
  };

  writeEvidence(options.evidenceJson, payload);
  console.log(JSON.stringify(payload, null, 2));

  if (!payload.passed) {
    process.exitCode = 1;
  }
}

void main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
