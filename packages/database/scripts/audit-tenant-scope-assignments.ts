// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Read-only audit for tenant-scope user_role assignments.
//
// Goal:
// - surface whether tenant-scope rows are normalized to scope_id = NULL
// - distinguish current-tenant IDs from other active-tenant IDs and missing IDs

import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'node:url';

import { getSchemaSyncFailureReason } from './sync-rbac-contract';

interface CliOptions {
  schemas: string[];
  json: boolean;
}

type ScopeIdStatus = 'null_scope' | 'matches_current_tenant' | 'matches_other_active_tenant' | 'missing_public_tenant';

interface ScopeAssignmentDetail {
  assignmentId: string;
  userId: string;
  username: string;
  roleCode: string;
  scopeId: string | null;
  matchedTenantCode: string | null;
  matchedTenantSchema: string | null;
  scopeIdStatus: ScopeIdStatus;
}

interface SchemaScopeAudit {
  schemaName: string;
  currentTenantId: string | null;
  currentTenantCode: string | null;
  counts: {
    totalTenantRows: number;
    nullScope: number;
    currentTenantScope: number;
    otherActiveTenantScope: number;
    missingPublicTenantScope: number;
  };
  details: ScopeAssignmentDetail[];
}

interface SkippedSchemaAudit {
  schemaName: string;
  reason: string;
}

interface ScopeAuditSummary {
  filters: {
    schemas: string[];
  };
  audited: SchemaScopeAudit[];
  skipped: SkippedSchemaAudit[];
}

function parseCliArgs(argv: string[]): CliOptions {
  const schemas: string[] = [];
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--schema') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --schema');
      }

      schemas.push(value);
      index += 1;
      continue;
    }

    if (arg === '--json') {
      json = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    schemas: [...new Set(schemas)],
    json,
  };
}

async function tableExists(
  prisma: PrismaClient,
  schemaName: string,
  tableName: string,
): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = $1
          AND table_name = $2
      ) AS exists
    `,
    schemaName,
    tableName,
  );

  return rows[0]?.exists ?? false;
}

async function getSchemaAuditFailureReason(
  prisma: PrismaClient,
  schemaName: string,
): Promise<string | null> {
  const syncFailureReason = await getSchemaSyncFailureReason(prisma, schemaName);

  if (syncFailureReason) {
    return syncFailureReason;
  }

  for (const tableName of ['user_role', 'system_user', 'role']) {
    if (!(await tableExists(prisma, schemaName, tableName))) {
      return `Schema ${schemaName} is missing ${tableName}.`;
    }
  }

  return null;
}

async function getTargetSchemas(
  prisma: PrismaClient,
  options: CliOptions,
): Promise<string[]> {
  if (options.schemas.length > 0) {
    return options.schemas;
  }

  const tenants = await prisma.$queryRaw<Array<{ schemaName: string | null }>>`
    SELECT schema_name AS "schemaName"
    FROM public.tenant
    WHERE is_active = true
      AND schema_name IS NOT NULL
      AND schema_name != ''
    ORDER BY schema_name
  `;

  return tenants
    .map((tenant) => tenant.schemaName)
    .filter((schemaName): schemaName is string => Boolean(schemaName));
}

async function getSchemaScopeAudit(
  prisma: PrismaClient,
  schemaName: string,
): Promise<SchemaScopeAudit> {
  const currentTenantRows = await prisma.$queryRaw<Array<{ id: string; code: string }>>`
    SELECT id, code
    FROM public.tenant
    WHERE schema_name = ${schemaName}
    LIMIT 1
  `;
  const currentTenant = currentTenantRows[0] ?? null;

  const details = await prisma.$queryRawUnsafe<ScopeAssignmentDetail[]>(
    `
      SELECT
        ur.id AS "assignmentId",
        ur.user_id AS "userId",
        su.username AS username,
        r.code AS "roleCode",
        ur.scope_id AS "scopeId",
        pt.code AS "matchedTenantCode",
        pt.schema_name AS "matchedTenantSchema",
        CASE
          WHEN ur.scope_id IS NULL THEN 'null_scope'
          WHEN ur.scope_id = $1::uuid THEN 'matches_current_tenant'
          WHEN pt.id IS NOT NULL THEN 'matches_other_active_tenant'
          ELSE 'missing_public_tenant'
        END AS "scopeIdStatus"
      FROM "${schemaName}".user_role ur
      JOIN "${schemaName}".system_user su ON su.id = ur.user_id
      JOIN "${schemaName}".role r ON r.id = ur.role_id
      LEFT JOIN public.tenant pt ON pt.id = ur.scope_id
      WHERE ur.scope_type = 'tenant'
      ORDER BY su.username, r.code, ur.id
    `,
    currentTenant?.id ?? '00000000-0000-0000-0000-000000000000',
  );

  return {
    schemaName,
    currentTenantId: currentTenant?.id ?? null,
    currentTenantCode: currentTenant?.code ?? null,
    counts: {
      totalTenantRows: details.length,
      nullScope: details.filter((detail) => detail.scopeIdStatus === 'null_scope').length,
      currentTenantScope: details.filter((detail) => detail.scopeIdStatus === 'matches_current_tenant').length,
      otherActiveTenantScope: details.filter((detail) => detail.scopeIdStatus === 'matches_other_active_tenant').length,
      missingPublicTenantScope: details.filter((detail) => detail.scopeIdStatus === 'missing_public_tenant').length,
    },
    details,
  };
}

async function auditTenantScopeAssignments(
  prisma: PrismaClient,
  options: CliOptions,
): Promise<ScopeAuditSummary> {
  const schemaNames = await getTargetSchemas(prisma, options);
  const audited: SchemaScopeAudit[] = [];
  const skipped: SkippedSchemaAudit[] = [];

  for (const schemaName of schemaNames) {
    const failureReason = await getSchemaAuditFailureReason(prisma, schemaName);

    if (failureReason) {
      skipped.push({ schemaName, reason: failureReason });
      continue;
    }

    audited.push(await getSchemaScopeAudit(prisma, schemaName));
  }

  return {
    filters: {
      schemas: options.schemas,
    },
    audited,
    skipped,
  };
}

function printSummary(summary: ScopeAuditSummary): void {
  for (const schemaAudit of summary.audited) {
    console.log(`\nSchema: ${schemaAudit.schemaName}`);
    console.log(
      `- current tenant: ${schemaAudit.currentTenantCode ?? 'missing'} (${schemaAudit.currentTenantId ?? 'n/a'})`,
    );
    console.log(`- tenant-scope rows: ${schemaAudit.counts.totalTenantRows}`);
    console.log(`- scope_id NULL: ${schemaAudit.counts.nullScope}`);
    console.log(`- scope_id matches current tenant: ${schemaAudit.counts.currentTenantScope}`);
    console.log(`- scope_id matches other active tenant: ${schemaAudit.counts.otherActiveTenantScope}`);
    console.log(`- scope_id missing from public.tenant: ${schemaAudit.counts.missingPublicTenantScope}`);

    for (const detail of schemaAudit.details) {
      console.log(
        `  - ${detail.username} / ${detail.roleCode} / ${detail.assignmentId}: scopeId=${detail.scopeId ?? 'NULL'} [${detail.scopeIdStatus}]`,
      );
    }
  }

  if (summary.skipped.length > 0) {
    console.log('\nSkipped schemas:');

    for (const skipped of summary.skipped) {
      console.log(`- ${skipped.schemaName}: ${skipped.reason}`);
    }
  }
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const options = parseCliArgs(process.argv.slice(2));

  try {
    const summary = await auditTenantScopeAssignments(prisma, options);

    if (options.json) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    printSummary(summary);
  } finally {
    await prisma.$disconnect();
  }
}

function isDirectExecution(): boolean {
  if (!process.argv[1]) {
    return false;
  }

  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectExecution()) {
  main().catch((error) => {
    console.error('Tenant-scope assignment audit failed:', error);
    process.exit(1);
  });
}
