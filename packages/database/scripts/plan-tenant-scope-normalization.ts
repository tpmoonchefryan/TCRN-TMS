// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Read-only planner for tenant-scope user_role normalization.
//
// Canonical shape:
// - scope_type = 'tenant'
// - scope_id = NULL
//
// This planner identifies which tenant-scope assignment groups can be safely
// collapsed into that canonical shape without deleting live access outright.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';

import { getSchemaSyncFailureReason } from './sync-rbac-contract';

export interface CliOptions {
  schemas: string[];
  users: string[];
  json: boolean;
}

export type ScopeIdStatus =
  | 'null_scope'
  | 'matches_current_tenant'
  | 'matches_other_active_tenant'
  | 'missing_public_tenant';

export type NormalizationStatus =
  | 'already_normalized'
  | 'safe_to_normalize'
  | 'blocked_cross_tenant_reference'
  | 'blocked_metadata_mismatch'
  | 'blocked_multiple_null_rows'
  | 'blocked_missing_current_tenant';

export interface AssignmentRow {
  assignmentId: string;
  userId: string;
  username: string;
  roleId: string;
  roleCode: string;
  scopeId: string | null;
  matchedTenantCode: string | null;
  matchedTenantSchema: string | null;
  scopeIdStatus: ScopeIdStatus;
  inherit: boolean;
  grantedAt: Date;
  grantedBy: string | null;
  expiresAt: Date | null;
}

export interface PlannedActionSummary {
  keepAssignmentId: string | null;
  updateToNullAssignmentId: string | null;
  deleteAssignmentIds: string[];
}

export interface PlannedNormalizationGroup {
  userId: string;
  username: string;
  roleId: string;
  roleCode: string;
  status: NormalizationStatus;
  reason: string;
  rowCount: number;
  counts: {
    nullScope: number;
    currentTenantScope: number;
    otherActiveTenantScope: number;
    missingPublicTenantScope: number;
  };
  plannedActions: PlannedActionSummary;
  assignments: AssignmentRow[];
}

export interface SchemaNormalizationPlan {
  schemaName: string;
  currentTenantId: string | null;
  currentTenantCode: string | null;
  safe: PlannedNormalizationGroup[];
  blocked: PlannedNormalizationGroup[];
  alreadyNormalized: PlannedNormalizationGroup[];
}

export interface SkippedSchemaPlan {
  schemaName: string;
  reason: string;
}

export interface NormalizationPlanSummary {
  filters: {
    schemas: string[];
    users: string[];
  };
  plans: SchemaNormalizationPlan[];
  skipped: SkippedSchemaPlan[];
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

  return {
    schemas: [...new Set(schemas)],
    users: [...new Set(users)],
    json,
  };
}

async function tableExists(
  prisma: PrismaClient,
  schemaName: string,
  tableName: string
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
    tableName
  );

  return rows[0]?.exists ?? false;
}

async function getSchemaPlanFailureReason(
  prisma: PrismaClient,
  schemaName: string
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

async function getTargetSchemas(prisma: PrismaClient, options: CliOptions): Promise<string[]> {
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

function buildUserFilterClause(options: CliOptions): string {
  if (options.users.length === 0) {
    return '';
  }

  return `
    AND (
      su.username = ANY($2::text[])
      OR ur.user_id::text = ANY($2::text[])
    )
  `;
}

async function getCurrentTenant(
  prisma: PrismaClient,
  schemaName: string
): Promise<{ id: string; code: string } | null> {
  const rows = await prisma.$queryRaw<Array<{ id: string; code: string }>>`
    SELECT id, code
    FROM public.tenant
    WHERE schema_name = ${schemaName}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getTenantScopeAssignments(
  prisma: PrismaClient,
  schemaName: string,
  currentTenantId: string | null,
  options: CliOptions
): Promise<AssignmentRow[]> {
  const userFilterClause = buildUserFilterClause(options);
  const fallbackTenantId = currentTenantId ?? '00000000-0000-0000-0000-000000000000';

  if (options.users.length > 0) {
    return prisma.$queryRawUnsafe<AssignmentRow[]>(
      `
        SELECT
          ur.id AS "assignmentId",
          ur.user_id AS "userId",
          su.username AS username,
          ur.role_id AS "roleId",
          r.code AS "roleCode",
          ur.scope_id AS "scopeId",
          pt.code AS "matchedTenantCode",
          pt.schema_name AS "matchedTenantSchema",
          CASE
            WHEN ur.scope_id IS NULL THEN 'null_scope'
            WHEN ur.scope_id = $1::uuid THEN 'matches_current_tenant'
            WHEN pt.id IS NOT NULL THEN 'matches_other_active_tenant'
            ELSE 'missing_public_tenant'
          END AS "scopeIdStatus",
          ur.inherit AS inherit,
          ur.granted_at AS "grantedAt",
          ur.granted_by AS "grantedBy",
          ur.expires_at AS "expiresAt"
        FROM "${schemaName}".user_role ur
        JOIN "${schemaName}".system_user su ON su.id = ur.user_id
        JOIN "${schemaName}".role r ON r.id = ur.role_id
        LEFT JOIN public.tenant pt ON pt.id = ur.scope_id
        WHERE ur.scope_type = 'tenant'
        ${userFilterClause}
        ORDER BY su.username, r.code, ur.granted_at DESC, ur.id
      `,
      fallbackTenantId,
      options.users
    );
  }

  return prisma.$queryRawUnsafe<AssignmentRow[]>(
    `
      SELECT
        ur.id AS "assignmentId",
        ur.user_id AS "userId",
        su.username AS username,
        ur.role_id AS "roleId",
        r.code AS "roleCode",
        ur.scope_id AS "scopeId",
        pt.code AS "matchedTenantCode",
        pt.schema_name AS "matchedTenantSchema",
        CASE
          WHEN ur.scope_id IS NULL THEN 'null_scope'
          WHEN ur.scope_id = $1::uuid THEN 'matches_current_tenant'
          WHEN pt.id IS NOT NULL THEN 'matches_other_active_tenant'
          ELSE 'missing_public_tenant'
        END AS "scopeIdStatus",
        ur.inherit AS inherit,
        ur.granted_at AS "grantedAt",
        ur.granted_by AS "grantedBy",
        ur.expires_at AS "expiresAt"
      FROM "${schemaName}".user_role ur
      JOIN "${schemaName}".system_user su ON su.id = ur.user_id
      JOIN "${schemaName}".role r ON r.id = ur.role_id
      LEFT JOIN public.tenant pt ON pt.id = ur.scope_id
      WHERE ur.scope_type = 'tenant'
      ORDER BY su.username, r.code, ur.granted_at DESC, ur.id
    `,
    fallbackTenantId
  );
}

function groupAssignments(rows: AssignmentRow[]): Map<string, AssignmentRow[]> {
  const groups = new Map<string, AssignmentRow[]>();

  for (const row of rows) {
    const key = `${row.userId}:${row.roleId}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key)?.push(row);
  }

  return groups;
}

function sortByPreference(rows: AssignmentRow[]): AssignmentRow[] {
  const statusRank: Record<ScopeIdStatus, number> = {
    null_scope: 0,
    matches_current_tenant: 1,
    missing_public_tenant: 2,
    matches_other_active_tenant: 3,
  };

  return [...rows].sort((left, right) => {
    const statusDelta = statusRank[left.scopeIdStatus] - statusRank[right.scopeIdStatus];

    if (statusDelta !== 0) {
      return statusDelta;
    }

    const grantedDelta = right.grantedAt.getTime() - left.grantedAt.getTime();

    if (grantedDelta !== 0) {
      return grantedDelta;
    }

    return left.assignmentId.localeCompare(right.assignmentId);
  });
}

export function buildGroupPlan(
  rows: AssignmentRow[],
  currentTenantId: string | null
): PlannedNormalizationGroup {
  const sortedRows = sortByPreference(rows);
  const sample = sortedRows[0];
  const counts = {
    nullScope: rows.filter((row) => row.scopeIdStatus === 'null_scope').length,
    currentTenantScope: rows.filter((row) => row.scopeIdStatus === 'matches_current_tenant').length,
    otherActiveTenantScope: rows.filter(
      (row) => row.scopeIdStatus === 'matches_other_active_tenant'
    ).length,
    missingPublicTenantScope: rows.filter((row) => row.scopeIdStatus === 'missing_public_tenant')
      .length,
  };

  const distinctInherit = new Set(rows.map((row) => String(row.inherit))).size;
  const distinctExpires = new Set(rows.map((row) => row.expiresAt?.toISOString() ?? 'NULL')).size;
  const distinctGrantedBy = new Set(rows.map((row) => row.grantedBy ?? 'NULL')).size;

  if (!currentTenantId) {
    return {
      userId: sample.userId,
      username: sample.username,
      roleId: sample.roleId,
      roleCode: sample.roleCode,
      status: 'blocked_missing_current_tenant',
      reason: 'Schema is not mapped to a current public.tenant row.',
      rowCount: rows.length,
      counts,
      plannedActions: {
        keepAssignmentId: null,
        updateToNullAssignmentId: null,
        deleteAssignmentIds: [],
      },
      assignments: sortedRows,
    };
  }

  if (counts.nullScope > 1) {
    return {
      userId: sample.userId,
      username: sample.username,
      roleId: sample.roleId,
      roleCode: sample.roleCode,
      status: 'blocked_multiple_null_rows',
      reason: 'Multiple tenant-scope NULL rows exist for the same user/role group.',
      rowCount: rows.length,
      counts,
      plannedActions: {
        keepAssignmentId: null,
        updateToNullAssignmentId: null,
        deleteAssignmentIds: [],
      },
      assignments: sortedRows,
    };
  }

  if (counts.otherActiveTenantScope > 0) {
    return {
      userId: sample.userId,
      username: sample.username,
      roleId: sample.roleId,
      roleCode: sample.roleCode,
      status: 'blocked_cross_tenant_reference',
      reason: 'Tenant-scope rows reference another currently active tenant id.',
      rowCount: rows.length,
      counts,
      plannedActions: {
        keepAssignmentId: null,
        updateToNullAssignmentId: null,
        deleteAssignmentIds: [],
      },
      assignments: sortedRows,
    };
  }

  if (distinctInherit > 1 || distinctExpires > 1 || distinctGrantedBy > 1) {
    return {
      userId: sample.userId,
      username: sample.username,
      roleId: sample.roleId,
      roleCode: sample.roleCode,
      status: 'blocked_metadata_mismatch',
      reason:
        'Tenant-scope duplicate rows do not share the same inherit / expiresAt / grantedBy metadata.',
      rowCount: rows.length,
      counts,
      plannedActions: {
        keepAssignmentId: null,
        updateToNullAssignmentId: null,
        deleteAssignmentIds: [],
      },
      assignments: sortedRows,
    };
  }

  const keeper = sortedRows[0];
  const deleteAssignmentIds = sortedRows
    .filter((row) => row.assignmentId !== keeper.assignmentId)
    .map((row) => row.assignmentId);

  if (rows.length === 1 && keeper.scopeIdStatus === 'null_scope') {
    return {
      userId: sample.userId,
      username: sample.username,
      roleId: sample.roleId,
      roleCode: sample.roleCode,
      status: 'already_normalized',
      reason: 'Exactly one canonical tenant-scope NULL row exists.',
      rowCount: rows.length,
      counts,
      plannedActions: {
        keepAssignmentId: keeper.assignmentId,
        updateToNullAssignmentId: null,
        deleteAssignmentIds: [],
      },
      assignments: sortedRows,
    };
  }

  return {
    userId: sample.userId,
    username: sample.username,
    roleId: sample.roleId,
    roleCode: sample.roleCode,
    status: 'safe_to_normalize',
    reason:
      keeper.scopeIdStatus === 'null_scope'
        ? 'Canonical NULL row already exists; duplicate tenant-scope residue can be deleted.'
        : 'A single keeper row can be normalized to scope_id = NULL and duplicate tenant-scope residue can be deleted.',
    rowCount: rows.length,
    counts,
    plannedActions: {
      keepAssignmentId: keeper.assignmentId,
      updateToNullAssignmentId: keeper.scopeId === null ? null : keeper.assignmentId,
      deleteAssignmentIds,
    },
    assignments: sortedRows,
  };
}

async function buildSchemaPlan(
  prisma: PrismaClient,
  schemaName: string,
  options: CliOptions
): Promise<SchemaNormalizationPlan> {
  const currentTenant = await getCurrentTenant(prisma, schemaName);
  const assignments = await getTenantScopeAssignments(
    prisma,
    schemaName,
    currentTenant?.id ?? null,
    options
  );
  const grouped = groupAssignments(assignments);

  const safe: PlannedNormalizationGroup[] = [];
  const blocked: PlannedNormalizationGroup[] = [];
  const alreadyNormalized: PlannedNormalizationGroup[] = [];

  for (const rows of grouped.values()) {
    const plan = buildGroupPlan(rows, currentTenant?.id ?? null);

    if (plan.status === 'safe_to_normalize') {
      safe.push(plan);
      continue;
    }

    if (plan.status === 'already_normalized') {
      alreadyNormalized.push(plan);
      continue;
    }

    blocked.push(plan);
  }

  return {
    schemaName,
    currentTenantId: currentTenant?.id ?? null,
    currentTenantCode: currentTenant?.code ?? null,
    safe,
    blocked,
    alreadyNormalized,
  };
}

export async function planTenantScopeNormalization(
  prisma: PrismaClient,
  options: CliOptions
): Promise<NormalizationPlanSummary> {
  const schemaNames = await getTargetSchemas(prisma, options);
  const plans: SchemaNormalizationPlan[] = [];
  const skipped: SkippedSchemaPlan[] = [];

  for (const schemaName of schemaNames) {
    const failureReason = await getSchemaPlanFailureReason(prisma, schemaName);

    if (failureReason) {
      skipped.push({ schemaName, reason: failureReason });
      continue;
    }

    plans.push(await buildSchemaPlan(prisma, schemaName, options));
  }

  return {
    filters: {
      schemas: options.schemas,
      users: options.users,
    },
    plans,
    skipped,
  };
}

function printGroup(prefix: string, group: PlannedNormalizationGroup): void {
  console.log(`${prefix}${group.username} / ${group.roleCode} [${group.status}]`);
  console.log(
    `  rows=${group.rowCount} null=${group.counts.nullScope} current=${group.counts.currentTenantScope} otherActive=${group.counts.otherActiveTenantScope} missing=${group.counts.missingPublicTenantScope}`
  );
  console.log(`  reason: ${group.reason}`);

  if (group.plannedActions.keepAssignmentId) {
    console.log(`  keep: ${group.plannedActions.keepAssignmentId}`);
  }

  if (group.plannedActions.updateToNullAssignmentId) {
    console.log(`  update_to_null: ${group.plannedActions.updateToNullAssignmentId}`);
  }

  if (group.plannedActions.deleteAssignmentIds.length > 0) {
    console.log(`  delete: ${group.plannedActions.deleteAssignmentIds.join(', ')}`);
  }
}

function printSummary(summary: NormalizationPlanSummary): void {
  for (const plan of summary.plans) {
    console.log(`\nSchema: ${plan.schemaName}`);
    console.log(
      `- current tenant: ${plan.currentTenantCode ?? 'missing'} (${plan.currentTenantId ?? 'n/a'})`
    );
    console.log(`- safe groups: ${plan.safe.length}`);
    console.log(`- blocked groups: ${plan.blocked.length}`);
    console.log(`- already normalized groups: ${plan.alreadyNormalized.length}`);

    for (const group of plan.safe) {
      printGroup('- safe: ', group);
    }

    for (const group of plan.blocked) {
      printGroup('- blocked: ', group);
    }

    for (const group of plan.alreadyNormalized) {
      printGroup('- normalized: ', group);
    }
  }

  if (summary.skipped.length > 0) {
    console.log('\nSkipped schemas:');

    for (const skipped of summary.skipped) {
      console.log(`- ${skipped.schemaName}: ${skipped.reason}`);
    }
  }

  console.log('\nNo destructive action is implemented in this planner.');
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const options = parseCliArgs(process.argv.slice(2));

  try {
    const summary = await planTenantScopeNormalization(prisma, options);

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
    console.error('Tenant-scope normalization planning failed:', error);
    process.exit(1);
  });
}
