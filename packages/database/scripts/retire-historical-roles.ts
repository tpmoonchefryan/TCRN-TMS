// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Disabled retirement executor for tenant-local historical roles.
//
// Role rows are retained for audit history. This command preserves the
// read-only historical-role planner output and refuses apply-mode hard deletion.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '../src/platform/prisma/client';
import { loadRepoEnvFiles } from './load-repo-env';
import {
  type CliOptions as PlannerCliOptions,
  type HistoricalRoleNormalizationPlan,
  type HistoricalRoleNormalizationPlanSummary,
  planHistoricalRoleNormalization,
} from './plan-historical-role-normalization';

loadRepoEnvFiles(import.meta.url);

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
  roleId: string | null;
  status: 'blocked';
  reason: string;
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
    markdown: false,
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
  if (summary.mode !== 'apply') {
    return;
  }

  throw new Error(
    'Role row hard deletion is disabled. Roles are retained for audit history; use the read-only historical-role normalization plan and an Owner-approved retention/migration plan instead.',
  );
}

export async function executeRetirementPlan(
  prisma: PrismaClient,
  summary: HistoricalRoleRetirementSummary,
): Promise<HistoricalRoleRetirementSummary> {
  void prisma;
  assertApplyAllowed(summary);

  return {
    ...summary,
    applied: [],
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
        console.log(`  ${role.roleCode}: ${role.status} (${role.reason})`);
      }
    }

    console.log(
      '\nApply mode is disabled. Keep role rows retained and use an Owner-approved retention/migration plan for any future cleanup.',
    );
    return;
  }

  console.log(
    '\nDry-run only. Apply mode is disabled because role rows are retained for audit history.',
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
