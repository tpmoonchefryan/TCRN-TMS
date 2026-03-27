// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Read-only rollback exporter for legacy RBAC prune candidates.
//
// This script generates SQL that can restore the exact legacy resource,
// policy, and role_policy rows for selected prune candidates.
// It is intended to be run before any approved prune apply.

import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'node:url';

import { auditLegacyRbac, formatCanonicalLabel } from './audit-legacy-rbac';
import { buildPrunePlan, promoteRuntimeVerifiedTargetInAudit } from './prune-legacy-rbac';
import { verifyLegacyPruneRuntime } from './verify-legacy-prune-runtime';

export interface CliOptions {
  schemas: string[];
  skipTemplate: boolean;
  legacyCodes: string[];
  allowUsers: string[];
  runtimeProof: boolean;
  json: boolean;
}

interface ResourceRow {
  id: string;
  code: string;
  name_en: string;
  name_zh: string | null;
  name_ja: string | null;
  description: string | null;
  module: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface PolicyRow {
  id: string;
  resource_id: string;
  action: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface RolePolicyRow {
  id: string;
  role_id: string;
  policy_id: string;
  role_code: string;
  effect: string;
  created_at: Date;
}

interface RollbackTargetExport {
  legacyCode: string;
  canonicalCode: string | null;
  canonicalCodes: string[];
  resource: ResourceRow;
  policies: PolicyRow[];
  rolePolicies: RolePolicyRow[];
  sql: string;
}

interface SchemaRollbackExport {
  schemaName: string;
  targets: RollbackTargetExport[];
}

interface RollbackExportSummary {
  filters: {
    schemas: string[];
    legacyCodes: string[];
    allowUsers: string[];
    runtimeProof: boolean;
    skipTemplate: boolean;
  };
  exports: SchemaRollbackExport[];
}

function parseCliArgs(argv: string[]): CliOptions {
  const schemas: string[] = [];
  const legacyCodes: string[] = [];
  const allowUsers: string[] = [];
  let skipTemplate = false;
  let runtimeProof = false;
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

    if (arg === '--resource') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --resource');
      }

      legacyCodes.push(value);
      index += 1;
      continue;
    }

    if (arg === '--allow-user') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --allow-user');
      }

      allowUsers.push(value);
      index += 1;
      continue;
    }

    if (arg === '--skip-template') {
      skipTemplate = true;
      continue;
    }

    if (arg === '--runtime-proof') {
      runtimeProof = true;
      continue;
    }

    if (arg === '--json') {
      json = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (schemas.length === 0) {
    throw new Error('Rollback export requires at least one explicit --schema.');
  }

  if (legacyCodes.length === 0) {
    throw new Error('Rollback export requires at least one explicit --resource.');
  }

  return {
    schemas,
    skipTemplate,
    legacyCodes: [...new Set(legacyCodes)],
    allowUsers: [...new Set(allowUsers)],
    runtimeProof,
    json,
  };
}

function sqlLiteral(value: boolean | Date | number | string | null): string {
  if (value === null) {
    return 'NULL';
  }

  if (value instanceof Date) {
    return `'${value.toISOString().replace('T', ' ').replace('Z', '+00')}'`;
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return `'${value.replaceAll("'", "''")}'`;
}

function buildRollbackSql(
  schemaName: string,
  resource: ResourceRow,
  policies: PolicyRow[],
  rolePolicies: RolePolicyRow[],
): string {
  const statements: string[] = [
    `-- Rollback export for ${schemaName}:${resource.code}`,
    '-- Assumption: this is used after a matching prune removed the legacy rows.',
    'BEGIN;',
    `INSERT INTO "${schemaName}".resource (` +
      'id, code, name_en, name_zh, name_ja, description, module, sort_order, is_active, created_at, updated_at' +
      ') VALUES (' +
      [
        sqlLiteral(resource.id),
        sqlLiteral(resource.code),
        sqlLiteral(resource.name_en),
        sqlLiteral(resource.name_zh),
        sqlLiteral(resource.name_ja),
        sqlLiteral(resource.description),
        sqlLiteral(resource.module),
        sqlLiteral(resource.sort_order),
        sqlLiteral(resource.is_active),
        sqlLiteral(resource.created_at),
        sqlLiteral(resource.updated_at),
      ].join(', ') +
      ') ON CONFLICT DO NOTHING;',
  ];

  for (const policy of policies) {
    statements.push(
      `INSERT INTO "${schemaName}".policy (` +
        'id, resource_id, action, description, is_active, created_at, updated_at' +
        ') VALUES (' +
        [
          sqlLiteral(policy.id),
          sqlLiteral(policy.resource_id),
          sqlLiteral(policy.action),
          sqlLiteral(policy.description),
          sqlLiteral(policy.is_active),
          sqlLiteral(policy.created_at),
          sqlLiteral(policy.updated_at),
        ].join(', ') +
        ') ON CONFLICT DO NOTHING;',
    );
  }

  for (const rolePolicy of rolePolicies) {
    statements.push(
      `-- role_code=${rolePolicy.role_code}`,
      `INSERT INTO "${schemaName}".role_policy (` +
        'id, role_id, policy_id, effect, created_at' +
        ') VALUES (' +
        [
          sqlLiteral(rolePolicy.id),
          sqlLiteral(rolePolicy.role_id),
          sqlLiteral(rolePolicy.policy_id),
          sqlLiteral(rolePolicy.effect),
          sqlLiteral(rolePolicy.created_at),
        ].join(', ') +
        ') ON CONFLICT DO NOTHING;',
    );
  }

  statements.push('COMMIT;');

  return `${statements.join('\n')}\n`;
}

async function exportTarget(
  prisma: PrismaClient,
  schemaName: string,
  legacyCode: string,
  canonicalCode: string | null,
  canonicalCodes: string[],
): Promise<RollbackTargetExport> {
  const resourceRows = await prisma.$queryRawUnsafe<ResourceRow[]>(
    `
      SELECT
        id,
        code,
        name_en,
        name_zh,
        name_ja,
        description,
        module,
        sort_order,
        is_active,
        created_at,
        updated_at
      FROM "${schemaName}".resource
      WHERE code = $1
    `,
    legacyCode,
  );

  if (resourceRows.length === 0) {
    throw new Error(`Resource ${legacyCode} is absent in ${schemaName}; nothing to export.`);
  }

  const resource = resourceRows[0];

  const policies = await prisma.$queryRawUnsafe<PolicyRow[]>(
    `
      SELECT
        id,
        resource_id,
        action,
        description,
        is_active,
        created_at,
        updated_at
      FROM "${schemaName}".policy
      WHERE resource_id = CAST($1 AS uuid)
      ORDER BY action
    `,
    resource.id,
  );

  const rolePolicies = await prisma.$queryRawUnsafe<RolePolicyRow[]>(
    `
      SELECT
        rp.id,
        rp.role_id,
        rp.policy_id,
        r.code AS role_code,
        rp.effect,
        rp.created_at
      FROM "${schemaName}".role_policy rp
      JOIN "${schemaName}".policy p ON p.id = rp.policy_id
      JOIN "${schemaName}".role r ON r.id = rp.role_id
      WHERE p.resource_id = CAST($1 AS uuid)
      ORDER BY r.code, rp.effect, rp.id
    `,
    resource.id,
  );

  return {
    legacyCode,
    canonicalCode,
    canonicalCodes,
    resource,
    policies,
    rolePolicies,
    sql: buildRollbackSql(schemaName, resource, policies, rolePolicies),
  };
}

export async function exportRollbackSummary(
  prisma: PrismaClient,
  options: CliOptions,
): Promise<RollbackExportSummary> {
  let auditSummary = await auditLegacyRbac(prisma, {
    schemas: options.schemas,
    skipTemplate: options.skipTemplate,
    includeHistoricalRoles: false,
    includeCompatResources: false,
    json: false,
  });

  if (options.runtimeProof) {
    const runtimeProof = await verifyLegacyPruneRuntime(prisma, {
      schemas: options.schemas,
      legacyCodes: options.legacyCodes,
      allowUsers: options.allowUsers,
      json: false,
    });

    if (!runtimeProof.target.verified) {
      throw new Error(`Runtime proof failed: ${runtimeProof.target.reason}`);
    }

    auditSummary = promoteRuntimeVerifiedTargetInAudit(
      auditSummary,
      options.schemas[0],
      options.legacyCodes[0],
      runtimeProof.target.affectedUsers.map((user) => user.username),
    );
  }

  const prunePlan = buildPrunePlan(auditSummary, {
    schemas: options.schemas,
    skipTemplate: options.skipTemplate,
    legacyCodes: options.legacyCodes,
    allowUsers: options.allowUsers,
    runtimeProof: options.runtimeProof,
    apply: false,
    json: false,
  });

  if (prunePlan.skipped.length > 0) {
    throw new Error(
      `Rollback export refused because some schemas were skipped: ${prunePlan.skipped.map((item) => `${item.schemaName} (${item.reason})`).join(', ')}`,
    );
  }

  const blockedEntries = prunePlan.plans.flatMap((plan) =>
    plan.blocked.map((target) => `${plan.schemaName}:${target.legacyCode}[${target.readiness}]`),
  );

  if (blockedEntries.length > 0) {
    throw new Error(
      `Rollback export refused because selected targets are not prune candidates: ${blockedEntries.join(', ')}`,
    );
  }

  const absentEntries = prunePlan.plans.flatMap((plan) =>
    plan.absent.map((legacyCode) => `${plan.schemaName}:${legacyCode}`),
  );

  if (absentEntries.length > 0) {
    throw new Error(
      `Rollback export refused because selected targets are already absent: ${absentEntries.join(', ')}`,
    );
  }

  const exports: SchemaRollbackExport[] = [];

  for (const plan of prunePlan.plans) {
    const targets: RollbackTargetExport[] = [];

    for (const candidate of plan.candidates) {
      targets.push(
        await exportTarget(
          prisma,
          plan.schemaName,
          candidate.legacyCode,
          candidate.canonicalCode,
          candidate.canonicalCodes,
        ),
      );
    }

    exports.push({
      schemaName: plan.schemaName,
      targets,
    });
  }

  return {
    filters: {
      schemas: options.schemas,
      legacyCodes: options.legacyCodes,
      allowUsers: options.allowUsers,
      runtimeProof: options.runtimeProof,
      skipTemplate: options.skipTemplate,
    },
    exports,
  };
}

function printSummary(summary: RollbackExportSummary): void {
  for (const schemaExport of summary.exports) {
    console.log(`-- Schema: ${schemaExport.schemaName}`);

    for (const target of schemaExport.targets) {
      console.log(
        `-- Legacy resource ${target.legacyCode} -> ${formatCanonicalLabel(target)}`,
      );
      console.log(
        `-- Exported resource=1 policies=${target.policies.length} rolePolicies=${target.rolePolicies.length}`,
      );
      process.stdout.write(target.sql);
      console.log('');
    }
  }
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const options = parseCliArgs(process.argv.slice(2));

  try {
    const summary = await exportRollbackSummary(prisma, options);

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            filters: summary.filters,
            exports: summary.exports.map((schemaExport) => ({
              schemaName: schemaExport.schemaName,
              targets: schemaExport.targets.map((target) => ({
                legacyCode: target.legacyCode,
                canonicalCode: target.canonicalCode,
                canonicalCodes: target.canonicalCodes,
                resourceCount: 1,
                policyCount: target.policies.length,
                rolePolicyCount: target.rolePolicies.length,
              })),
            })),
          },
          null,
          2,
        ),
      );
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
    console.error('Legacy RBAC rollback export failed:', error);
    process.exit(1);
  });
}
