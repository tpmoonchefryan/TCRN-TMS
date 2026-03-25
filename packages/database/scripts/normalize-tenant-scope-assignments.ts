// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Guarded normalizer for tenant-scope user_role residue.
//
// Default mode is dry-run only. Apply mode is intentionally strict:
// - requires explicit schema selection
// - reuses the read-only planner as the only source of candidate groups
// - refuses when any selected schema still contains blocked groups or was skipped

import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'node:url';

import {
  planTenantScopeNormalization,
  type CliOptions as PlannerCliOptions,
  type NormalizationPlanSummary,
  type PlannedNormalizationGroup,
} from './plan-tenant-scope-normalization';

export interface CliOptions {
  schemas: string[];
  users: string[];
  apply: boolean;
  json: boolean;
}

export interface SchemaNormalizationExecutionPlan {
  schemaName: string;
  currentTenantId: string | null;
  currentTenantCode: string | null;
  candidates: PlannedNormalizationGroup[];
  blocked: PlannedNormalizationGroup[];
  alreadyNormalized: PlannedNormalizationGroup[];
}

export interface AppliedNormalizationGroup {
  userId: string;
  username: string;
  roleId: string;
  roleCode: string;
  keepAssignmentId: string;
  updateToNullAssignmentId: string | null;
  updatedToNull: number;
  deleteAssignmentIds: string[];
  deletedCount: number;
}

export interface AppliedSchemaNormalization {
  schemaName: string;
  groups: AppliedNormalizationGroup[];
}

export interface NormalizationExecutionSummary {
  mode: 'dry_run' | 'apply';
  filters: {
    schemas: string[];
    users: string[];
  };
  plans: SchemaNormalizationExecutionPlan[];
  skipped: NormalizationPlanSummary['skipped'];
  applied: AppliedSchemaNormalization[];
}

interface CountRow {
  count: bigint;
}

function parseCliArgs(argv: string[]): CliOptions {
  const schemas: string[] = [];
  const users: string[] = [];
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

    if (arg === '--user') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --user');
      }

      users.push(value);
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
    users: [...new Set(users)],
    apply,
    json,
  };
}

function toPlannerOptions(options: CliOptions): PlannerCliOptions {
  return {
    schemas: options.schemas,
    users: options.users,
    json: false,
  };
}

export function buildExecutionPlan(
  planSummary: NormalizationPlanSummary,
  options: CliOptions,
): NormalizationExecutionSummary {
  return {
    mode: options.apply ? 'apply' : 'dry_run',
    filters: {
      schemas: options.schemas,
      users: options.users,
    },
    plans: planSummary.plans.map((plan) => ({
      schemaName: plan.schemaName,
      currentTenantId: plan.currentTenantId,
      currentTenantCode: plan.currentTenantCode,
      candidates: plan.safe,
      blocked: plan.blocked,
      alreadyNormalized: plan.alreadyNormalized,
    })),
    skipped: planSummary.skipped,
    applied: [],
  };
}

function assertApplyAllowed(summary: NormalizationExecutionSummary): void {
  if (summary.filters.schemas.length === 0) {
    throw new Error('Apply mode requires at least one explicit --schema.');
  }

  if (summary.skipped.length > 0) {
    throw new Error(
      `Apply mode refused because some schemas were skipped: ${summary.skipped.map((item) => `${item.schemaName} (${item.reason})`).join(', ')}`,
    );
  }

  const blockedEntries = summary.plans.flatMap((plan) =>
    plan.blocked.map((group) => `${plan.schemaName}:${group.username}/${group.roleCode}[${group.status}]`),
  );

  if (blockedEntries.length > 0) {
    throw new Error(
      `Apply mode refused because blocked tenant-scope groups remain: ${blockedEntries.join(', ')}`,
    );
  }
}

function getKeepAssignmentId(group: PlannedNormalizationGroup): string {
  if (!group.plannedActions.keepAssignmentId) {
    throw new Error(`Group ${group.username}/${group.roleCode} does not have a keeper assignment.`);
  }

  return group.plannedActions.keepAssignmentId;
}

function getAssignmentScopeId(
  group: PlannedNormalizationGroup,
  assignmentId: string,
): string | null {
  const assignment = group.assignments.find((row) => row.assignmentId === assignmentId);

  if (!assignment) {
    throw new Error(`Assignment ${assignmentId} is missing from group ${group.username}/${group.roleCode}.`);
  }

  return assignment.scopeId;
}

async function updateKeeperToNull(
  prisma: PrismaClient,
  schemaName: string,
  group: PlannedNormalizationGroup,
): Promise<number> {
  const updateAssignmentId = group.plannedActions.updateToNullAssignmentId;

  if (!updateAssignmentId) {
    return 0;
  }

  const originalScopeId = getAssignmentScopeId(group, updateAssignmentId);

  if (!originalScopeId) {
    throw new Error(
      `Group ${group.username}/${group.roleCode} planned keeper update is missing its original scope id.`,
    );
  }

  const rows = await prisma.$queryRawUnsafe<CountRow[]>(
    `
      WITH updated_rows AS (
        UPDATE "${schemaName}".user_role
        SET scope_id = NULL
        WHERE id = $1::uuid
          AND scope_type = 'tenant'
          AND scope_id = $2::uuid
        RETURNING id
      )
      SELECT COUNT(*)::bigint AS count
      FROM updated_rows
    `,
    updateAssignmentId,
    originalScopeId,
  );

  const updatedCount = Number(rows[0]?.count ?? 0n);

  if (updatedCount !== 1) {
    throw new Error(
      `Expected to update exactly one keeper row for ${schemaName}:${group.username}/${group.roleCode}, but updated ${updatedCount}.`,
    );
  }

  return updatedCount;
}

async function deleteDuplicateAssignments(
  prisma: PrismaClient,
  schemaName: string,
  group: PlannedNormalizationGroup,
): Promise<number> {
  if (group.plannedActions.deleteAssignmentIds.length === 0) {
    return 0;
  }

  const rows = await prisma.$queryRawUnsafe<CountRow[]>(
    `
      WITH deleted_rows AS (
        DELETE FROM "${schemaName}".user_role
        WHERE id = ANY($1::uuid[])
          AND scope_type = 'tenant'
        RETURNING id
      )
      SELECT COUNT(*)::bigint AS count
      FROM deleted_rows
    `,
    group.plannedActions.deleteAssignmentIds,
  );

  const deletedCount = Number(rows[0]?.count ?? 0n);

  if (deletedCount !== group.plannedActions.deleteAssignmentIds.length) {
    throw new Error(
      `Expected to delete ${group.plannedActions.deleteAssignmentIds.length} duplicate rows for ${schemaName}:${group.username}/${group.roleCode}, but deleted ${deletedCount}.`,
    );
  }

  return deletedCount;
}

export async function executeNormalizationPlan(
  prisma: PrismaClient,
  summary: NormalizationExecutionSummary,
): Promise<NormalizationExecutionSummary> {
  assertApplyAllowed(summary);

  const applied: AppliedSchemaNormalization[] = [];

  for (const plan of summary.plans) {
    if (plan.candidates.length === 0) {
      continue;
    }

    const groups = await prisma.$transaction(async (tx) => {
      const appliedGroups: AppliedNormalizationGroup[] = [];

      for (const group of plan.candidates) {
        const updatedToNull = await updateKeeperToNull(tx, plan.schemaName, group);
        const deletedCount = await deleteDuplicateAssignments(tx, plan.schemaName, group);

        appliedGroups.push({
          userId: group.userId,
          username: group.username,
          roleId: group.roleId,
          roleCode: group.roleCode,
          keepAssignmentId: getKeepAssignmentId(group),
          updateToNullAssignmentId: group.plannedActions.updateToNullAssignmentId,
          updatedToNull,
          deleteAssignmentIds: group.plannedActions.deleteAssignmentIds,
          deletedCount,
        });
      }

      return appliedGroups;
    });

    applied.push({
      schemaName: plan.schemaName,
      groups,
    });
  }

  return {
    ...summary,
    applied,
  };
}

function printSummary(summary: NormalizationExecutionSummary): void {
  console.log(`Mode: ${summary.mode}`);

  if (summary.filters.schemas.length > 0) {
    console.log(`Schemas: ${summary.filters.schemas.join(', ')}`);
  } else {
    console.log('Schemas: all active public.tenant schemas');
  }

  if (summary.filters.users.length > 0) {
    console.log(`Users: ${summary.filters.users.join(', ')}`);
  } else {
    console.log('Users: all tenant-scope groups in selected schemas');
  }

  for (const plan of summary.plans) {
    console.log(`\nSchema: ${plan.schemaName}`);
    console.log(`- current tenant: ${plan.currentTenantCode ?? 'missing'} (${plan.currentTenantId ?? 'n/a'})`);

    if (plan.candidates.length === 0 && plan.blocked.length === 0 && plan.alreadyNormalized.length === 0) {
      console.log('- no tenant-scope groups found');
      continue;
    }

    for (const candidate of plan.candidates) {
      console.log(`- candidate ${candidate.username} / ${candidate.roleCode} [${candidate.status}]`);
      console.log(
        `  keep=${candidate.plannedActions.keepAssignmentId} updateToNull=${candidate.plannedActions.updateToNullAssignmentId ?? 'none'} deleteCount=${candidate.plannedActions.deleteAssignmentIds.length}`,
      );
      console.log(`  note: ${candidate.reason}`);
    }

    for (const blocked of plan.blocked) {
      console.log(`- blocked ${blocked.username} / ${blocked.roleCode} [${blocked.status}]`);
      console.log(
        `  rows=${blocked.rowCount} null=${blocked.counts.nullScope} current=${blocked.counts.currentTenantScope} otherActive=${blocked.counts.otherActiveTenantScope} missing=${blocked.counts.missingPublicTenantScope}`,
      );
      console.log(`  note: ${blocked.reason}`);
    }

    for (const normalized of plan.alreadyNormalized) {
      console.log(`- normalized ${normalized.username} / ${normalized.roleCode} [${normalized.status}]`);
      console.log(`  note: ${normalized.reason}`);
    }
  }

  if (summary.skipped.length > 0) {
    console.log('\nSkipped schemas:');

    for (const skipped of summary.skipped) {
      console.log(`- ${skipped.schemaName}: ${skipped.reason}`);
    }
  }

  if (summary.applied.length > 0) {
    console.log('\nApplied tenant-scope normalization:');

    for (const appliedSchema of summary.applied) {
      console.log(`- ${appliedSchema.schemaName}`);

      for (const group of appliedSchema.groups) {
        console.log(
          `  ${group.username} / ${group.roleCode}: updatedToNull=${group.updatedToNull} deleted=${group.deletedCount}`,
        );
      }
    }

    console.log(
      '\nNext step: export rollback before future apply runs, then refresh snapshots and rerun targeted runtime proof.',
    );
    return;
  }

  console.log(
    '\nDry-run only. Apply mode requires explicit --schema and refuses blocked or skipped groups.',
  );
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const options = parseCliArgs(process.argv.slice(2));

  try {
    const plannerSummary = await planTenantScopeNormalization(prisma, toPlannerOptions(options));
    const executionPlan = buildExecutionPlan(plannerSummary, options);
    const result = options.apply ? await executeNormalizationPlan(prisma, executionPlan) : executionPlan;

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
    console.error('Tenant-scope normalization failed:', error);
    process.exit(1);
  });
}
