// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Read-only verification for Phase 3 SSO storage rollout parity.

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { PrismaClient } from '../src/platform/prisma/client';
import { loadRepoEnvFiles } from './load-repo-env';

loadRepoEnvFiles(import.meta.url);

interface CliOptions {
  evidenceJson?: string;
}

interface TenantSchemaRow {
  tenantCode: string;
  schemaName: string;
}

interface ColumnRow {
  columnName: string;
  dataType: string;
  isNullable: string;
}

interface IndexRow {
  indexName: string;
  indexDef: string;
}

const prisma = new PrismaClient();

const REQUIRED_PROVIDER_COLUMNS = [
  'id',
  'tenant_id',
  'code',
  'display_name',
  'provider_type',
  'owner_scope',
  'client_secret_ref',
  'claim_mapping_policy',
  'is_enabled',
] as const;

const REQUIRED_LINK_COLUMNS = [
  'id',
  'user_id',
  'provider_id',
  'provider_code',
  'provider_issuer',
  'subject',
  'email',
  'display_name',
  'claims_hash',
  'linked_at',
  'last_login_at',
  'revoked_at',
  'revoked_by',
] as const;

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--evidence-json' && next) {
      options.evidenceJson = next;
      index += 1;
    }
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

async function tableExists(schemaName: string, tableName: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `
      SELECT to_regclass($1) IS NOT NULL AS "exists"
    `,
    `${schemaName}.${tableName}`
  );

  return Boolean(rows[0]?.exists);
}

async function columns(schemaName: string, tableName: string) {
  return prisma.$queryRawUnsafe<ColumnRow[]>(
    `
      SELECT
        column_name AS "columnName",
        data_type AS "dataType",
        is_nullable AS "isNullable"
      FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name = $2
      ORDER BY ordinal_position
    `,
    schemaName,
    tableName
  );
}

async function checkRequiredColumns(
  schemaName: string,
  tableName: string,
  requiredColumns: readonly string[]
) {
  const actualColumns = await columns(schemaName, tableName);
  const actual = new Set(actualColumns.map((column) => column.columnName));

  return {
    schemaName,
    tableName,
    exists: await tableExists(schemaName, tableName),
    columns: actualColumns,
    missingColumns: requiredColumns.filter((column) => !actual.has(column)),
  };
}

async function checkConstraint(tableName: string, constraintName: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = $1
          AND constraint_name = $2
      ) AS "exists"
    `,
    tableName,
    constraintName
  );

  return Boolean(rows[0]?.exists);
}

async function checkProviderTenantCodeUniqueIndex() {
  const rows = await prisma.$queryRawUnsafe<
    Array<{ exists: boolean; isUnique: boolean; predicate: string | null }>
  >(
    `
      SELECT
        TRUE AS "exists",
        i.indisunique AS "isUnique",
        pg_get_expr(i.indpred, i.indrelid) AS predicate
      FROM pg_class index_class
      JOIN pg_index i ON i.indexrelid = index_class.oid
      JOIN pg_class table_class ON table_class.oid = i.indrelid
      JOIN pg_namespace namespace ON namespace.oid = table_class.relnamespace
      WHERE namespace.nspname = 'public'
        AND table_class.relname = 'tms_sso_provider'
        AND index_class.relname = 'tms_sso_provider_tenant_code_unique'
      LIMIT 1
    `
  );

  return (
    rows[0] ?? {
      exists: false,
      isUnique: false,
      predicate: null,
    }
  );
}

async function checkAccountLinkIssuerIndexes(schemaName: string) {
  const rows = await prisma.$queryRawUnsafe<IndexRow[]>(
    `
      SELECT indexname AS "indexName", indexdef AS "indexDef"
      FROM pg_indexes
      WHERE schemaname = $1
        AND tablename = 'tms_sso_account_link'
        AND indexname = ANY($2::text[])
      ORDER BY indexname
    `,
    schemaName,
    [
      'tms_sso_account_link_provider_issuer_subject_idx',
      'tms_sso_account_link_active_subject_unique',
      'tms_sso_account_link_active_user_provider_unique',
    ]
  );
  const byName = new Map(rows.map((row) => [row.indexName, row.indexDef]));

  return {
    schemaName,
    indexes: rows,
    providerIssuerSubjectIndex:
      byName.get('tms_sso_account_link_provider_issuer_subject_idx') ?? null,
    activeSubjectUnique: byName.get('tms_sso_account_link_active_subject_unique') ?? null,
    activeUserProviderUnique:
      byName.get('tms_sso_account_link_active_user_provider_unique') ?? null,
  };
}

function indexCoversProviderIssuer(indexDef: string | null) {
  return Boolean(indexDef?.includes('provider_issuer'));
}

async function listTenantSchemas() {
  return prisma.$queryRawUnsafe<TenantSchemaRow[]>(`
    SELECT code AS "tenantCode", schema_name AS "schemaName"
    FROM public.tenant
    ORDER BY code
  `);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const provider = await checkRequiredColumns('public', 'tms_sso_provider', REQUIRED_PROVIDER_COLUMNS);
  const externalToolReadiness = await checkRequiredColumns(
    'public',
    'platform_external_tool_sso_readiness',
    ['id', 'tool_code', 'status', 'provider_id', 'fail_closed', 'evidence', 'updated_at']
  );
  const tenantTemplateLink = await checkRequiredColumns(
    'tenant_template',
    'tms_sso_account_link',
    REQUIRED_LINK_COLUMNS
  );
  const tenantSchemas = await listTenantSchemas();
  const tenantLinkTables = await Promise.all(
    tenantSchemas.map(async (tenant) => ({
      tenantCode: tenant.tenantCode,
      ...(await checkRequiredColumns(tenant.schemaName, 'tms_sso_account_link', REQUIRED_LINK_COLUMNS)),
    }))
  );
  const tenantTemplateIssuerIndexes = await checkAccountLinkIssuerIndexes('tenant_template');
  const tenantIssuerIndexes = await Promise.all(
    tenantSchemas.map(async (tenant) => ({
      tenantCode: tenant.tenantCode,
      ...(await checkAccountLinkIssuerIndexes(tenant.schemaName)),
    }))
  );
  const failures = [
    ...provider.missingColumns.map((column) => `public.tms_sso_provider missing ${column}`),
    ...externalToolReadiness.missingColumns.map(
      (column) => `public.platform_external_tool_sso_readiness missing ${column}`
    ),
    ...tenantTemplateLink.missingColumns.map(
      (column) => `tenant_template.tms_sso_account_link missing ${column}`
    ),
    ...tenantLinkTables.flatMap((table) =>
      table.exists
        ? table.missingColumns.map(
            (column) => `${table.schemaName}.tms_sso_account_link missing ${column}`
          )
        : [`${table.schemaName}.tms_sso_account_link missing`]
    ),
  ];
  const issuerIndexChecks = [tenantTemplateIssuerIndexes, ...tenantIssuerIndexes];
  for (const indexCheck of issuerIndexChecks) {
    if (!indexCoversProviderIssuer(indexCheck.providerIssuerSubjectIndex)) {
      failures.push(
        `${indexCheck.schemaName}.tms_sso_account_link provider issuer subject index missing`
      );
    }
    if (!indexCoversProviderIssuer(indexCheck.activeSubjectUnique)) {
      failures.push(
        `${indexCheck.schemaName}.tms_sso_account_link active subject unique issuer binding missing`
      );
    }
    if (!indexCoversProviderIssuer(indexCheck.activeUserProviderUnique)) {
      failures.push(
        `${indexCheck.schemaName}.tms_sso_account_link active user/provider unique issuer binding missing`
      );
    }
  }
  const providerOwnerScopeCheck = await checkConstraint(
    'tms_sso_provider',
    'tms_sso_provider_owner_scope_check'
  );
  const providerSecretRefCheck = await checkConstraint(
    'tms_sso_provider',
    'tms_sso_provider_secret_ref_check'
  );
  const providerTenantCodeUniqueIndex = await checkProviderTenantCodeUniqueIndex();

  if (!providerOwnerScopeCheck) {
    failures.push('public.tms_sso_provider owner-scope check constraint missing');
  }

  if (!providerSecretRefCheck) {
    failures.push('public.tms_sso_provider env secret-ref check constraint missing');
  }

  if (!providerTenantCodeUniqueIndex.exists || !providerTenantCodeUniqueIndex.isUnique) {
    failures.push('public.tms_sso_provider tenant/code unique index missing');
  }

  if (providerTenantCodeUniqueIndex.predicate !== null) {
    failures.push('public.tms_sso_provider tenant/code unique index must not be partial');
  }

  const payload = {
    checkedAt: new Date().toISOString(),
    test_layer: 'manual_readback',
    data_mode: 'read_only_uat',
    target_scope: 'tenant_product_sso',
    provider,
    externalToolReadiness,
    tenantTemplateLink,
    tenantLinkTables,
    tenantTemplateIssuerIndexes,
    tenantIssuerIndexes,
    constraints: {
      providerOwnerScopeCheck,
      providerSecretRefCheck,
      providerTenantCodeUniqueIndex,
    },
    tenantSchemaCount: tenantLinkTables.length,
    passed: failures.length === 0,
    failures,
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
