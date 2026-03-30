// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Read-only rollback exporter for tenant-scope normalization candidates.
//
// This script generates SQL that can restore the exact pre-normalization
// `user_role` state for selected tenant-scope groups.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';

import {
  buildExecutionPlan,
  type CliOptions as NormalizerCliOptions,
} from './normalize-tenant-scope-assignments';
import {
  type AssignmentRow,
  type NormalizationPlanSummary,
  type PlannedNormalizationGroup,
  planTenantScopeNormalization,
} from './plan-tenant-scope-normalization';

export interface CliOptions {
  schemas: string[];
  users: string[];
  json: boolean;
}

export interface RollbackGroupExport {
  userId: string;
  username: string;
  roleId: string;
  roleCode: string;
  keepAssignmentId: string;
  updateToNullAssignmentId: string | null;
  deleteAssignmentIds: string[];
  sql: string;
}

export interface SchemaRollbackExport {
  schemaName: string;
  currentTenantCode: string | null;
  groups: RollbackGroupExport[];
}

export interface RollbackExportSummary {
  filters: {
    schemas: string[];
    users: string[];
  };
  exports: SchemaRollbackExport[];
}

function parseCliArgs(argv: string[]): CliOptions {
  const schemas: string[] = [];
  const users: string[] = [];
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

    if (arg === '--user') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --user');
      }

      users.push(value);
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

  return {
    schemas: [...new Set(schemas)],
    users: [...new Set(users)],
    json,
  };
}

function toPlannerOptions(options: CliOptions): NormalizerCliOptions {
  return {
    schemas: options.schemas,
    users: options.users,
    apply: false,
    json: false,
  };
}

function sqlLiteral(value: boolean | Date | string | null): string {
  if (value === null) {
    return 'NULL';
  }

  if (value instanceof Date) {
    return `'${value.toISOString().replace('T', ' ').replace('Z', '+00')}'`;
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  return `'${value.replaceAll("'", "''")}'`;
}

function getAssignment(
  group: PlannedNormalizationGroup,
  assignmentId: string,
): AssignmentRow {
  const assignment = group.assignments.find((row) => row.assignmentId === assignmentId);

  if (!assignment) {
    throw new Error(`Assignment ${assignmentId} is missing from group ${group.username}/${group.roleCode}.`);
  }

  return assignment;
}

function buildInsertSql(schemaName: string, assignment: AssignmentRow): string {
  return (
    `INSERT INTO "${schemaName}".user_role (` +
    'id, user_id, role_id, scope_type, scope_id, inherit, granted_at, granted_by, expires_at' +
    ') VALUES (' +
    [
      sqlLiteral(assignment.assignmentId),
      sqlLiteral(assignment.userId),
      sqlLiteral(assignment.roleId),
      sqlLiteral('tenant'),
      sqlLiteral(assignment.scopeId),
      sqlLiteral(assignment.inherit),
      sqlLiteral(assignment.grantedAt),
      sqlLiteral(assignment.grantedBy),
      sqlLiteral(assignment.expiresAt),
    ].join(', ') +
    ') ON CONFLICT DO NOTHING;'
  );
}

function buildRollbackSql(
  schemaName: string,
  group: PlannedNormalizationGroup,
): string {
  const keepAssignmentId = group.plannedActions.keepAssignmentId;

  if (!keepAssignmentId) {
    throw new Error(`Group ${group.username}/${group.roleCode} does not have a keeper assignment.`);
  }

  const statements: string[] = [
    `-- Rollback export for ${schemaName}:${group.username}/${group.roleCode}`,
    '-- Assumption: this is used after a matching tenant-scope normalization apply.',
    'BEGIN;',
  ];

  if (group.plannedActions.updateToNullAssignmentId) {
    const keeper = getAssignment(group, group.plannedActions.updateToNullAssignmentId);

    if (!keeper.scopeId) {
      throw new Error(
        `Group ${group.username}/${group.roleCode} keeper update is missing its original scope_id.`,
      );
    }

    statements.push(
      `UPDATE "${schemaName}".user_role`,
      `SET scope_id = ${sqlLiteral(keeper.scopeId)}`,
      `WHERE id = ${sqlLiteral(keeper.assignmentId)};`,
    );
  }

  for (const assignmentId of group.plannedActions.deleteAssignmentIds) {
    statements.push(buildInsertSql(schemaName, getAssignment(group, assignmentId)));
  }

  statements.push('COMMIT;');

  return `${statements.join('\n')}\n`;
}

export async function exportRollbackSummary(
  prisma: PrismaClient,
  options: CliOptions,
): Promise<RollbackExportSummary> {
  const plannerSummary: NormalizationPlanSummary = await planTenantScopeNormalization(
    prisma,
    toPlannerOptions(options),
  );
  const executionPlan = buildExecutionPlan(plannerSummary, {
    schemas: options.schemas,
    users: options.users,
    apply: false,
    json: false,
  });

  if (executionPlan.skipped.length > 0) {
    throw new Error(
      `Rollback export refused because some schemas were skipped: ${executionPlan.skipped.map((item) => `${item.schemaName} (${item.reason})`).join(', ')}`,
    );
  }

  const blockedEntries = executionPlan.plans.flatMap((plan) =>
    plan.blocked.map((group) => `${plan.schemaName}:${group.username}/${group.roleCode}[${group.status}]`),
  );

  if (blockedEntries.length > 0) {
    throw new Error(
      `Rollback export refused because selected groups are not normalization candidates: ${blockedEntries.join(', ')}`,
    );
  }

  return {
    filters: {
      schemas: options.schemas,
      users: options.users,
    },
    exports: executionPlan.plans.map((plan) => ({
      schemaName: plan.schemaName,
      currentTenantCode: plan.currentTenantCode,
      groups: plan.candidates.map((group) => ({
        userId: group.userId,
        username: group.username,
        roleId: group.roleId,
        roleCode: group.roleCode,
        keepAssignmentId: group.plannedActions.keepAssignmentId ?? '',
        updateToNullAssignmentId: group.plannedActions.updateToNullAssignmentId,
        deleteAssignmentIds: group.plannedActions.deleteAssignmentIds,
        sql: buildRollbackSql(plan.schemaName, group),
      })),
    })),
  };
}

function printSummary(summary: RollbackExportSummary): void {
  for (const schemaExport of summary.exports) {
    console.log(`-- Schema: ${schemaExport.schemaName} (${schemaExport.currentTenantCode ?? 'missing tenant'})`);

    for (const group of schemaExport.groups) {
      console.log(`-- Group: ${group.username} / ${group.roleCode}`);
      console.log(
        `-- Exported keeper=${group.keepAssignmentId} updateToNull=${group.updateToNullAssignmentId ?? 'none'} deleted=${group.deleteAssignmentIds.length}`,
      );
      process.stdout.write(group.sql);
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
              currentTenantCode: schemaExport.currentTenantCode,
              groups: schemaExport.groups.map((group) => ({
                userId: group.userId,
                username: group.username,
                roleCode: group.roleCode,
                keepAssignmentId: group.keepAssignmentId,
                updateToNullAssignmentId: group.updateToNullAssignmentId,
                deleteCount: group.deleteAssignmentIds.length,
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
    console.error('Tenant-scope normalization rollback export failed:', error);
    process.exit(1);
  });
}
