// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Guarded retirement executor for tenant-local historical roles.
//
// Default mode is dry-run only. Apply mode is intentionally strict:
// - requires explicit schema selection
// - requires explicit role selection
// - reuses the read-only historical-role planner as the only source of candidates
// - refuses when selected roles are authored, absent, assigned, active, or referenced by delegated_admin

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';

import {
  type CliOptions as PlannerCliOptions,
  type HistoricalRoleNormalizationPlan,
  type HistoricalRoleNormalizationPlanSummary,
  planHistoricalRoleNormalization,
} from './plan-historical-role-normalization';

export interface CliOptions {
  schemas: string[];
  roles: string[];
  apply: boolean;
  json: boolean;
}

export interface SchemaHistoricalRoleRetirementPlan {
  schemaName: string;
  candidates: HistoricalRoleNormalizationPlan[];
  blocked: HistoricalRoleNormalizationPlan[];
  absent: string[];
}

export interface AppliedHistoricalRoleRetirement {
  roleCode: string;
  roleId: string;
  deletedRolePolicies: number;
  deletedRoles: number;
}

export interface AppliedSchemaHistoricalRoleRetirement {
  schemaName: string;
  roles: AppliedHistoricalRoleRetirement[];
}

export interface HistoricalRoleRetirementSummary {
  mode: 'dry_run' | 'apply';
  filters: {
    schemas: string[];
    roles: string[];
    explicitRoleSelection: boolean;
  };
  plans: SchemaHistoricalRoleRetirementPlan[];
  skipped: HistoricalRoleNormalizationPlanSummary['skipped'];
  applied: AppliedSchemaHistoricalRoleRetirement[];
}

interface CountRow {
  count: bigint;
}

function parseCliArgs(argv: string[]): CliOptions {
  const schemas: string[] = [];
  const roles: string[] = [];
  let apply = false;
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

    if (arg === '--apply') {
      apply = true;
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
    roles: [...new Set(roles)],
    apply,
    json,
  };
}

function toPlannerOptions(options: CliOptions): PlannerCliOptions {
  return {
    schemas: options.schemas,
    roles: options.roles,
    json: false,
  };
}

function isRetirementCandidate(rolePlan: HistoricalRoleNormalizationPlan): boolean {
  return (
    rolePlan.decision === 'retire_or_exclude_before_prune' ||
    rolePlan.decision === 'retire_residue'
  );
}

export function buildExecutionPlan(
  planSummary: HistoricalRoleNormalizationPlanSummary,
  options: CliOptions,
): HistoricalRoleRetirementSummary {
  return {
    mode: options.apply ? 'apply' : 'dry_run',
    filters: {
      schemas: options.schemas,
      roles: planSummary.filters.roles,
      explicitRoleSelection: options.roles.length > 0,
    },
    plans: planSummary.plans.map((plan) => {
      const candidates: HistoricalRoleNormalizationPlan[] = [];
      const blocked: HistoricalRoleNormalizationPlan[] = [];
      const absent: string[] = [];

      for (const rolePlan of plan.roles) {
        if (rolePlan.decision === 'absent') {
          absent.push(rolePlan.roleCode);
          continue;
        }

        if (isRetirementCandidate(rolePlan)) {
          candidates.push(rolePlan);
          continue;
        }

        blocked.push(rolePlan);
      }

      return {
        schemaName: plan.schemaName,
        candidates,
        blocked,
        absent,
      };
    }),
    skipped: planSummary.skipped,
    applied: [],
  };
}

function assertApplyAllowed(summary: HistoricalRoleRetirementSummary): void {
  if (summary.filters.schemas.length === 0) {
    throw new Error('Apply mode requires at least one explicit --schema.');
  }

  if (!summary.filters.explicitRoleSelection) {
    throw new Error('Apply mode requires at least one explicit --role.');
  }

  if (summary.skipped.length > 0) {
    throw new Error(
      `Apply mode refused because some schemas were skipped: ${summary.skipped.map((item) => `${item.schemaName} (${item.reason})`).join(', ')}`,
    );
  }

  const blockedEntries = summary.plans.flatMap((plan) =>
    plan.blocked.map((rolePlan) => `${plan.schemaName}:${rolePlan.roleCode}[${rolePlan.decision}]`),
  );

  if (blockedEntries.length > 0) {
    throw new Error(
      `Apply mode refused because selected roles are not retirement candidates: ${blockedEntries.join(', ')}`,
    );
  }

  const absentEntries = summary.plans.flatMap((plan) =>
    plan.absent.map((roleCode) => `${plan.schemaName}:${roleCode}`),
  );

  if (absentEntries.length > 0) {
    throw new Error(
      `Apply mode refused because selected roles are already absent: ${absentEntries.join(', ')}`,
    );
  }
}

async function countRows(
  prisma: PrismaClient,
  schemaName: string,
  tableName: 'delegated_admin' | 'role_policy' | 'user_role',
  roleId: string,
): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<CountRow[]>(
    tableName === 'delegated_admin'
      ? `
          SELECT COUNT(*)::bigint AS count
          FROM "${schemaName}".delegated_admin
          WHERE admin_role_id = CAST($1 AS uuid)
        `
      : `
          SELECT COUNT(*)::bigint AS count
          FROM "${schemaName}".${tableName}
          WHERE role_id = CAST($1 AS uuid)
        `,
    roleId,
  );

  return Number(rows[0]?.count ?? 0n);
}

async function retireRole(
  prisma: PrismaClient,
  schemaName: string,
  rolePlan: HistoricalRoleNormalizationPlan,
): Promise<AppliedHistoricalRoleRetirement> {
  if (!rolePlan.roleId) {
    throw new Error(`Role ${schemaName}:${rolePlan.roleCode} is missing roleId and cannot be retired.`);
  }

  const rolePolicyCount = await countRows(prisma, schemaName, 'role_policy', rolePlan.roleId);

  if (rolePolicyCount !== rolePlan.rolePolicyCount) {
    throw new Error(
      `Role ${schemaName}:${rolePlan.roleCode} changed since planning: expected ${rolePlan.rolePolicyCount} role_policy rows, found ${rolePolicyCount}.`,
    );
  }

  const assignedUsers = await countRows(prisma, schemaName, 'user_role', rolePlan.roleId);

  if (assignedUsers !== 0) {
    throw new Error(
      `Role ${schemaName}:${rolePlan.roleCode} still has ${assignedUsers} user_role rows and cannot be retired.`,
    );
  }

  if (rolePlan.referenceAudit !== 'complete') {
    throw new Error(
      `Role ${schemaName}:${rolePlan.roleCode} has incomplete reference audit (${rolePlan.referenceAudit}) and cannot be retired.`,
    );
  }

  const delegatedAdminCount = await countRows(prisma, schemaName, 'delegated_admin', rolePlan.roleId);

  if (delegatedAdminCount !== 0) {
    throw new Error(
      `Role ${schemaName}:${rolePlan.roleCode} is still referenced by ${delegatedAdminCount} delegated_admin rows and cannot be retired.`,
    );
  }

  const deletedRoleRows = await prisma.$queryRawUnsafe<CountRow[]>(
    `
      WITH deleted_rows AS (
        DELETE FROM "${schemaName}".role
        WHERE id = CAST($1 AS uuid)
          AND code = $2
          AND is_active = false
          AND NOT EXISTS (
            SELECT 1
            FROM "${schemaName}".user_role
            WHERE role_id = CAST($1 AS uuid)
          )
          AND NOT EXISTS (
            SELECT 1
            FROM "${schemaName}".delegated_admin
            WHERE admin_role_id = CAST($1 AS uuid)
          )
        RETURNING id
      )
      SELECT COUNT(*)::bigint AS count
      FROM deleted_rows
    `,
    rolePlan.roleId,
    rolePlan.roleCode,
  );

  const deletedRoles = Number(deletedRoleRows[0]?.count ?? 0n);

  if (deletedRoles !== 1) {
    throw new Error(
      `Expected to delete exactly one role row for ${schemaName}:${rolePlan.roleCode}, but deleted ${deletedRoles}.`,
    );
  }

  return {
    roleCode: rolePlan.roleCode,
    roleId: rolePlan.roleId,
    deletedRolePolicies: rolePolicyCount,
    deletedRoles,
  };
}

export async function executeRetirementPlan(
  prisma: PrismaClient,
  summary: HistoricalRoleRetirementSummary,
): Promise<HistoricalRoleRetirementSummary> {
  assertApplyAllowed(summary);

  const applied: AppliedSchemaHistoricalRoleRetirement[] = [];

  for (const plan of summary.plans) {
    if (plan.candidates.length === 0) {
      continue;
    }

    const roles = await prisma.$transaction(async (tx) => {
      const appliedRoles: AppliedHistoricalRoleRetirement[] = [];

      for (const rolePlan of plan.candidates) {
        appliedRoles.push(await retireRole(tx, plan.schemaName, rolePlan));
      }

      return appliedRoles;
    });

    applied.push({
      schemaName: plan.schemaName,
      roles,
    });
  }

  return {
    ...summary,
    applied,
  };
}

function printSummary(summary: HistoricalRoleRetirementSummary): void {
  console.log(`Mode: ${summary.mode}`);

  if (summary.filters.schemas.length > 0) {
    console.log(`Schemas: ${summary.filters.schemas.join(', ')}`);
  } else {
    console.log('Schemas: all active public.tenant schemas');
  }

  if (summary.filters.roles.length > 0) {
    console.log(`Roles: ${summary.filters.roles.join(', ')}`);
  } else {
    console.log('Roles: default historical-role set');
  }

  for (const plan of summary.plans) {
    console.log(`\nSchema: ${plan.schemaName}`);

    if (plan.candidates.length === 0 && plan.blocked.length === 0 && plan.absent.length === 0) {
      console.log('- no selected historical roles found');
      continue;
    }

    for (const candidate of plan.candidates) {
      console.log(`- candidate ${candidate.roleCode} [${candidate.decision}]`);
      console.log(
        `  roleId=${candidate.roleId ?? 'missing'} rolePolicies=${candidate.rolePolicyCount} delegatedAdmins=${candidate.delegatedAdminCount ?? 'n/a'}`,
      );
      console.log(`  note: ${candidate.reason}`);
    }

    for (const blocked of plan.blocked) {
      console.log(`- blocked ${blocked.roleCode} [${blocked.decision}]`);
      console.log(
        `  active=${String(blocked.isActive)} assignedUsers=${blocked.assignedUsers} rolePolicies=${blocked.rolePolicyCount} delegatedAdmins=${blocked.delegatedAdminCount ?? 'n/a'}`,
      );
      console.log(`  note: ${blocked.reason}`);
    }

    for (const roleCode of plan.absent) {
      console.log(`- absent ${roleCode}`);
    }
  }

  if (summary.skipped.length > 0) {
    console.log('\nSkipped schemas:');

    for (const skipped of summary.skipped) {
      console.log(`- ${skipped.schemaName}: ${skipped.reason}`);
    }
  }

  if (summary.applied.length > 0) {
    console.log('\nApplied historical-role retirement:');

    for (const appliedSchema of summary.applied) {
      console.log(`- ${appliedSchema.schemaName}`);

      for (const role of appliedSchema.roles) {
        console.log(
          `  ${role.roleCode}: deletedRoles=${role.deletedRoles} deletedRolePolicies=${role.deletedRolePolicies}`,
        );
      }
    }

    console.log(
      '\nNext step: refresh snapshots only if affected users exist later, and rerun legacy-prune planning for previously blocked targets.',
    );
    return;
  }

  console.log(
    '\nDry-run only. Apply mode requires explicit --schema and --role and refuses blocked, skipped, or absent selections.',
  );
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const options = parseCliArgs(process.argv.slice(2));

  try {
    const plannerSummary = await planHistoricalRoleNormalization(prisma, toPlannerOptions(options));
    const executionPlan = buildExecutionPlan(plannerSummary, options);
    const result = options.apply ? await executeRetirementPlan(prisma, executionPlan) : executionPlan;

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    printSummary(result);
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
    console.error('Historical role retirement failed:', error);
    process.exit(1);
  });
}
