// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Read-only rollback exporter for historical-role retirement candidates.
//
// This script generates SQL that can restore the exact role and role_policy rows
// for selected historical-role retirement candidates.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';

import {
  type HistoricalRoleNormalizationPlan,
  type HistoricalRoleNormalizationPlanSummary,
  planHistoricalRoleNormalization,
} from './plan-historical-role-normalization';
import { buildExecutionPlan, type CliOptions as RetirementCliOptions } from './retire-historical-roles';

export interface CliOptions {
  schemas: string[];
  roles: string[];
  json: boolean;
}

interface RoleRow {
  id: string;
  code: string;
  name_en: string;
  name_zh: string | null;
  name_ja: string | null;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
  version: number;
}

interface RolePolicyRow {
  id: string;
  role_id: string;
  policy_id: string;
  effect: string;
  created_at: Date;
  resource_code: string;
  action: string;
}

export interface RollbackRoleExport {
  roleCode: string;
  roleId: string;
  role: RoleRow;
  rolePolicies: RolePolicyRow[];
  sql: string;
}

export interface SchemaRollbackExport {
  schemaName: string;
  roles: RollbackRoleExport[];
}

export interface RollbackExportSummary {
  filters: {
    schemas: string[];
    roles: string[];
  };
  exports: SchemaRollbackExport[];
}

function parseCliArgs(argv: string[]): CliOptions {
  const schemas: string[] = [];
  const roles: string[] = [];
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

    if (arg === '--role') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --role');
      }

      roles.push(value);
      index += 1;
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

  if (roles.length === 0) {
    throw new Error('Rollback export requires at least one explicit --role.');
  }

  return {
    schemas: [...new Set(schemas)],
    roles: [...new Set(roles)],
    json,
  };
}

function toPlannerOptions(options: CliOptions): RetirementCliOptions {
  return {
    schemas: options.schemas,
    roles: options.roles,
    apply: false,
    json: false,
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
  role: RoleRow,
  rolePolicies: RolePolicyRow[],
): string {
  const statements: string[] = [
    `-- Rollback export for ${schemaName}:${role.code}`,
    '-- Assumption: this is used after a matching historical-role retirement removed the role row.',
    'BEGIN;',
    `INSERT INTO "${schemaName}".role (` +
      'id, code, name_en, name_zh, name_ja, description, is_system, is_active, created_at, updated_at, created_by, updated_by, version' +
      ') VALUES (' +
      [
        sqlLiteral(role.id),
        sqlLiteral(role.code),
        sqlLiteral(role.name_en),
        sqlLiteral(role.name_zh),
        sqlLiteral(role.name_ja),
        sqlLiteral(role.description),
        sqlLiteral(role.is_system),
        sqlLiteral(role.is_active),
        sqlLiteral(role.created_at),
        sqlLiteral(role.updated_at),
        sqlLiteral(role.created_by),
        sqlLiteral(role.updated_by),
        sqlLiteral(role.version),
      ].join(', ') +
      ') ON CONFLICT (code) DO NOTHING;',
  ];

  for (const rolePolicy of rolePolicies) {
    statements.push(
      `-- permission=${rolePolicy.resource_code}:${rolePolicy.action} effect=${rolePolicy.effect}`,
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
        ') ON CONFLICT (role_id, policy_id) DO NOTHING;',
    );
  }

  statements.push('COMMIT;');

  return `${statements.join('\n')}\n`;
}

function getCandidateRole(
  plan: HistoricalRoleNormalizationPlan,
): HistoricalRoleNormalizationPlan {
  if (!plan.roleId) {
    throw new Error(`Role ${plan.roleCode} is missing roleId and cannot be exported.`);
  }

  return plan;
}

async function exportRole(
  prisma: PrismaClient,
  schemaName: string,
  rolePlan: HistoricalRoleNormalizationPlan,
): Promise<RollbackRoleExport> {
  const candidate = getCandidateRole(rolePlan);

  const roleRows = await prisma.$queryRawUnsafe<RoleRow[]>(
    `
      SELECT
        id,
        code,
        name_en,
        name_zh,
        name_ja,
        description,
        is_system,
        is_active,
        created_at,
        updated_at,
        created_by,
        updated_by,
        version
      FROM "${schemaName}".role
      WHERE id = CAST($1 AS uuid)
    `,
    candidate.roleId,
  );

  if (roleRows.length === 0) {
    throw new Error(`Role ${schemaName}:${candidate.roleCode} is absent; nothing to export.`);
  }

  const role = roleRows[0];

  const rolePolicies = await prisma.$queryRawUnsafe<RolePolicyRow[]>(
    `
      SELECT
        rp.id,
        rp.role_id,
        rp.policy_id,
        rp.effect,
        rp.created_at,
        res.code AS resource_code,
        p.action AS action
      FROM "${schemaName}".role_policy rp
      JOIN "${schemaName}".policy p ON p.id = rp.policy_id
      JOIN "${schemaName}".resource res ON res.id = p.resource_id
      WHERE rp.role_id = CAST($1 AS uuid)
      ORDER BY res.code, p.action, rp.id
    `,
    candidate.roleId,
  );

  return {
    roleCode: candidate.roleCode,
    roleId: candidate.roleId,
    role,
    rolePolicies,
    sql: buildRollbackSql(schemaName, role, rolePolicies),
  };
}

export async function exportRollbackSummary(
  prisma: PrismaClient,
  options: CliOptions,
): Promise<RollbackExportSummary> {
  const plannerSummary: HistoricalRoleNormalizationPlanSummary =
    await planHistoricalRoleNormalization(prisma, {
      schemas: options.schemas,
      roles: options.roles,
      json: false,
    });
  const executionPlan = buildExecutionPlan(plannerSummary, toPlannerOptions(options));

  if (executionPlan.skipped.length > 0) {
    throw new Error(
      `Rollback export refused because some schemas were skipped: ${executionPlan.skipped.map((item) => `${item.schemaName} (${item.reason})`).join(', ')}`,
    );
  }

  const blockedEntries = executionPlan.plans.flatMap((plan) =>
    plan.blocked.map((rolePlan) => `${plan.schemaName}:${rolePlan.roleCode}[${rolePlan.decision}]`),
  );

  if (blockedEntries.length > 0) {
    throw new Error(
      `Rollback export refused because selected roles are not retirement candidates: ${blockedEntries.join(', ')}`,
    );
  }

  const absentEntries = executionPlan.plans.flatMap((plan) =>
    plan.absent.map((roleCode) => `${plan.schemaName}:${roleCode}`),
  );

  if (absentEntries.length > 0) {
    throw new Error(
      `Rollback export refused because selected roles are already absent: ${absentEntries.join(', ')}`,
    );
  }

  const exports: SchemaRollbackExport[] = [];

  for (const plan of executionPlan.plans) {
    const roles: RollbackRoleExport[] = [];

    for (const rolePlan of plan.candidates) {
      roles.push(await exportRole(prisma, plan.schemaName, rolePlan));
    }

    exports.push({
      schemaName: plan.schemaName,
      roles,
    });
  }

  return {
    filters: {
      schemas: options.schemas,
      roles: executionPlan.filters.roles,
    },
    exports,
  };
}

function printSummary(summary: RollbackExportSummary): void {
  for (const schemaExport of summary.exports) {
    console.log(`\nSchema: ${schemaExport.schemaName}`);

    for (const roleExport of schemaExport.roles) {
      console.log(
        `- ${roleExport.roleCode}: rolePolicies=${roleExport.rolePolicies.length} roleId=${roleExport.roleId}`,
      );
    }
  }
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const options = parseCliArgs(process.argv.slice(2));

  try {
    const summary = await exportRollbackSummary(prisma, options);

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
    console.error('Historical role rollback export failed:', error);
    process.exit(1);
  });
}
