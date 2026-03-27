// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Read-only planner for tenant-local historical role cleanup.
//
// This planner turns the legacy RBAC audit into role-centric output so we can
// review which historical roles still block prune and whether they are already
// inactive/unassigned enough to retire or explicitly exclude.

import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { RBAC_ROLE_TEMPLATES } from '@tcrn/shared';
import { fileURLToPath } from 'node:url';

import {
  auditLegacyRbac,
  HISTORICAL_ROLE_CODES,
  type CliOptions as LegacyAuditCliOptions,
  type HistoricalRoleAudit,
  type LegacyRbacAuditSummary,
  type ResourceGrantEntry,
  type SchemaLegacyAudit,
} from './audit-legacy-rbac';

const DEFAULT_ROLE_CODES = HISTORICAL_ROLE_CODES.filter((roleCode) => roleCode !== 'TENANT_ADMIN');

export interface CliOptions {
  schemas: string[];
  roles: string[];
  json: boolean;
}

export type HistoricalRoleDecision =
  | 'absent'
  | 'authored_contract_role'
  | 'blocked_reference_audit_incomplete'
  | 'blocked_delegated_admin_reference'
  | 'blocked_assigned_users'
  | 'blocked_active_role'
  | 'retire_or_exclude_before_prune'
  | 'retire_residue';

export type HistoricalRoleReferenceAuditStatus =
  | 'complete'
  | 'missing_delegated_admin_table';

export interface HistoricalRoleReferenceAudit {
  roleCode: string;
  roleId: string | null;
  rolePolicyCount: number;
  delegatedAdminCount: number | null;
  referenceAudit: HistoricalRoleReferenceAuditStatus;
}

export interface HistoricalRoleNormalizationPlan {
  roleCode: string;
  roleId: string | null;
  present: boolean;
  authoredContractRole: boolean;
  aliasOf: string | null;
  isActive: boolean | null;
  assignedUsers: number;
  rolePolicyCount: number;
  delegatedAdminCount: number | null;
  referenceAudit: HistoricalRoleReferenceAuditStatus;
  decision: HistoricalRoleDecision;
  reason: string;
  legacyResourceCodes: string[];
  coveredLegacyGrants: string[];
  blockingLegacyOnlyGrants: string[];
  ignoredLegacyOnlyGrants: string[];
}

export interface SchemaHistoricalRoleNormalizationPlan {
  schemaName: string;
  roles: HistoricalRoleNormalizationPlan[];
}

export interface HistoricalRoleNormalizationPlanSummary {
  filters: {
    schemas: string[];
    roles: string[];
  };
  plans: SchemaHistoricalRoleNormalizationPlan[];
  skipped: LegacyRbacAuditSummary['skipped'];
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

      if (!(HISTORICAL_ROLE_CODES as readonly string[]).includes(value)) {
        throw new Error(
          `Unsupported --role ${value}. Supported historical/compat roles: ${HISTORICAL_ROLE_CODES.join(', ')}`,
        );
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

  return {
    schemas: [...new Set(schemas)],
    roles: [...new Set(roles)],
    json,
  };
}

function toAuditOptions(options: CliOptions): LegacyAuditCliOptions {
  return {
    schemas: options.schemas,
    legacyCodes: [],
    skipTemplate: true,
    includeHistoricalRoles: true,
    includeCompatResources: false,
    excludeRoles: [],
    json: false,
  };
}

function selectedRoleCodes(options: CliOptions): string[] {
  if (options.roles.length > 0) {
    return options.roles;
  }

  return [...DEFAULT_ROLE_CODES];
}

function buildReferenceAuditKey(schemaName: string, roleCode: string): string {
  return `${schemaName}:${roleCode}`;
}

function getAuthoredRole(roleCode: string): {
  authoredContractRole: boolean;
  aliasOf: string | null;
} {
  const authoredRole = RBAC_ROLE_TEMPLATES.find((role) => role.code === roleCode);

  return {
    authoredContractRole: Boolean(authoredRole),
    aliasOf: authoredRole?.aliasOf ?? null,
  };
}

function formatRoleScopedGrant(
  legacyCode: string,
  grant: Pick<ResourceGrantEntry, 'action' | 'effect'>,
): string {
  return `${legacyCode}:${grant.action}:${grant.effect}`;
}

function toRoleGrantKey(
  roleCode: string,
  grant: Pick<ResourceGrantEntry, 'action' | 'effect'>,
): string {
  return `${roleCode}:${grant.action}:${grant.effect}`;
}

function findHistoricalRoleAudit(
  schemaAudit: SchemaLegacyAudit,
  roleCode: string,
): HistoricalRoleAudit {
  return (
    schemaAudit.historicalRoles.find((role) => role.roleCode === roleCode) ?? {
      roleCode,
      present: false,
      isActive: null,
      assignedUsers: 0,
    }
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function resourceCodesFromGrants(grants: string[]): string[] {
  return unique(grants.map((grant) => grant.split(':', 1)[0] ?? grant));
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

async function getHistoricalRoleReferenceAudit(
  prisma: PrismaClient,
  schemaName: string,
  roleCode: string,
): Promise<HistoricalRoleReferenceAudit> {
  const roleRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `
      SELECT id
      FROM "${schemaName}".role
      WHERE code = $1
      LIMIT 1
    `,
    roleCode,
  );

  const roleId = roleRows[0]?.id ?? null;
  const hasDelegatedAdminTable = await tableExists(prisma, schemaName, 'delegated_admin');

  if (!roleId) {
    return {
      roleCode,
      roleId: null,
      rolePolicyCount: 0,
      delegatedAdminCount: hasDelegatedAdminTable ? 0 : null,
      referenceAudit: hasDelegatedAdminTable ? 'complete' : 'missing_delegated_admin_table',
    };
  }

  const [rolePolicyRows, delegatedAdminRows] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*)::bigint AS count
        FROM "${schemaName}".role_policy
        WHERE role_id = CAST($1 AS uuid)
      `,
      roleId,
    ),
    hasDelegatedAdminTable
      ? prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `
            SELECT COUNT(*)::bigint AS count
            FROM "${schemaName}".delegated_admin
            WHERE admin_role_id = CAST($1 AS uuid)
          `,
          roleId,
        )
      : Promise.resolve([{ count: 0n }]),
  ]);

  return {
    roleCode,
    roleId,
    rolePolicyCount: Number(rolePolicyRows[0]?.count ?? 0n),
    delegatedAdminCount: hasDelegatedAdminTable
      ? Number(delegatedAdminRows[0]?.count ?? 0n)
      : null,
    referenceAudit: hasDelegatedAdminTable ? 'complete' : 'missing_delegated_admin_table',
  };
}

function buildRolePlan(
  schemaAudit: SchemaLegacyAudit,
  roleCode: string,
  referenceAudit: HistoricalRoleReferenceAudit,
): HistoricalRoleNormalizationPlan {
  const roleAudit = findHistoricalRoleAudit(schemaAudit, roleCode);
  const authoredRole = getAuthoredRole(roleCode);
  const coveredLegacyGrants: string[] = [];
  const blockingLegacyOnlyGrants: string[] = [];
  const ignoredLegacyOnlyGrants: string[] = [];

  for (const target of schemaAudit.targets) {
    const blockingGrantSet = new Set(target.legacyOnlyGrants);
    const ignoredGrantSet = new Set(target.ignoredLegacyOnlyGrants);

    for (const grant of target.legacy.grants) {
      if (grant.roleCode !== roleCode) {
        continue;
      }

      const roleGrantKey = toRoleGrantKey(roleCode, grant);
      const formattedGrant = formatRoleScopedGrant(target.legacyCode, grant);

      if (blockingGrantSet.has(roleGrantKey)) {
        blockingLegacyOnlyGrants.push(formattedGrant);
        continue;
      }

      if (ignoredGrantSet.has(roleGrantKey)) {
        ignoredLegacyOnlyGrants.push(formattedGrant);
        continue;
      }

      coveredLegacyGrants.push(formattedGrant);
    }
  }

  const legacyResourceCodes = resourceCodesFromGrants([
    ...coveredLegacyGrants,
    ...blockingLegacyOnlyGrants,
    ...ignoredLegacyOnlyGrants,
  ]);
  const uniqueCoveredLegacyGrants = unique(coveredLegacyGrants);
  const uniqueBlockingLegacyOnlyGrants = unique(blockingLegacyOnlyGrants);
  const uniqueIgnoredLegacyOnlyGrants = unique(ignoredLegacyOnlyGrants);

  if (authoredRole.authoredContractRole) {
    return {
      roleCode,
      roleId: referenceAudit.roleId,
      present: roleAudit.present,
      authoredContractRole: true,
      aliasOf: authoredRole.aliasOf,
      isActive: roleAudit.isActive,
      assignedUsers: roleAudit.assignedUsers,
      rolePolicyCount: referenceAudit.rolePolicyCount,
      delegatedAdminCount: referenceAudit.delegatedAdminCount,
      referenceAudit: referenceAudit.referenceAudit,
      decision: 'authored_contract_role',
      reason: authoredRole.aliasOf
        ? `Role is part of the current shared RBAC contract as a compatibility alias of ${authoredRole.aliasOf}; keep it out of historical-role retirement scope.`
        : 'Role is part of the current shared RBAC contract; keep it out of historical-role retirement scope.',
      legacyResourceCodes,
      coveredLegacyGrants: uniqueCoveredLegacyGrants,
      blockingLegacyOnlyGrants: uniqueBlockingLegacyOnlyGrants,
      ignoredLegacyOnlyGrants: uniqueIgnoredLegacyOnlyGrants,
    };
  }

  if (!roleAudit.present) {
    return {
      roleCode,
      roleId: null,
      present: false,
      authoredContractRole: false,
      aliasOf: null,
      isActive: null,
      assignedUsers: 0,
      rolePolicyCount: 0,
      delegatedAdminCount: referenceAudit.delegatedAdminCount,
      referenceAudit: referenceAudit.referenceAudit,
      decision: 'absent',
      reason: 'Role is absent in the selected schema.',
      legacyResourceCodes: [],
      coveredLegacyGrants: [],
      blockingLegacyOnlyGrants: [],
      ignoredLegacyOnlyGrants: [],
    };
  }

  if (referenceAudit.referenceAudit !== 'complete') {
    return {
      roleCode,
      roleId: referenceAudit.roleId,
      present: true,
      authoredContractRole: false,
      aliasOf: null,
      isActive: roleAudit.isActive,
      assignedUsers: roleAudit.assignedUsers,
      rolePolicyCount: referenceAudit.rolePolicyCount,
      delegatedAdminCount: referenceAudit.delegatedAdminCount,
      referenceAudit: referenceAudit.referenceAudit,
      decision: 'blocked_reference_audit_incomplete',
      reason:
        'Reference audit is incomplete because delegated_admin is missing in the selected schema; do not retire or exclude this role until reference integrity can be checked.',
      legacyResourceCodes,
      coveredLegacyGrants: uniqueCoveredLegacyGrants,
      blockingLegacyOnlyGrants: uniqueBlockingLegacyOnlyGrants,
      ignoredLegacyOnlyGrants: uniqueIgnoredLegacyOnlyGrants,
    };
  }

  if ((referenceAudit.delegatedAdminCount ?? 0) > 0) {
    return {
      roleCode,
      roleId: referenceAudit.roleId,
      present: true,
      authoredContractRole: false,
      aliasOf: null,
      isActive: roleAudit.isActive,
      assignedUsers: roleAudit.assignedUsers,
      rolePolicyCount: referenceAudit.rolePolicyCount,
      delegatedAdminCount: referenceAudit.delegatedAdminCount,
      referenceAudit: referenceAudit.referenceAudit,
      decision: 'blocked_delegated_admin_reference',
      reason: `Role is still referenced by ${referenceAudit.delegatedAdminCount} delegated_admin row(s); retiring it would implicitly mutate delegated-admin state.`,
      legacyResourceCodes,
      coveredLegacyGrants: uniqueCoveredLegacyGrants,
      blockingLegacyOnlyGrants: uniqueBlockingLegacyOnlyGrants,
      ignoredLegacyOnlyGrants: uniqueIgnoredLegacyOnlyGrants,
    };
  }

  if (roleAudit.assignedUsers > 0) {
    return {
      roleCode,
      roleId: referenceAudit.roleId,
      present: true,
      authoredContractRole: false,
      aliasOf: null,
      isActive: roleAudit.isActive,
      assignedUsers: roleAudit.assignedUsers,
      rolePolicyCount: referenceAudit.rolePolicyCount,
      delegatedAdminCount: referenceAudit.delegatedAdminCount,
      referenceAudit: referenceAudit.referenceAudit,
      decision: 'blocked_assigned_users',
      reason: `Role still has ${roleAudit.assignedUsers} assigned user(s); migrate or remove assignments before considering retirement or exclusion.`,
      legacyResourceCodes,
      coveredLegacyGrants: uniqueCoveredLegacyGrants,
      blockingLegacyOnlyGrants: uniqueBlockingLegacyOnlyGrants,
      ignoredLegacyOnlyGrants: uniqueIgnoredLegacyOnlyGrants,
    };
  }

  if (roleAudit.isActive) {
    return {
      roleCode,
      roleId: referenceAudit.roleId,
      present: true,
      authoredContractRole: false,
      aliasOf: null,
      isActive: true,
      assignedUsers: 0,
      rolePolicyCount: referenceAudit.rolePolicyCount,
      delegatedAdminCount: referenceAudit.delegatedAdminCount,
      referenceAudit: referenceAudit.referenceAudit,
      decision: 'blocked_active_role',
      reason:
        'Role is still active even though it is unassigned; deactivate it before treating it as cleanup or prune-exclusion residue.',
      legacyResourceCodes,
      coveredLegacyGrants: uniqueCoveredLegacyGrants,
      blockingLegacyOnlyGrants: uniqueBlockingLegacyOnlyGrants,
      ignoredLegacyOnlyGrants: uniqueIgnoredLegacyOnlyGrants,
    };
  }

  if (uniqueBlockingLegacyOnlyGrants.length > 0) {
    return {
      roleCode,
      roleId: referenceAudit.roleId,
      present: true,
      authoredContractRole: false,
      aliasOf: null,
      isActive: false,
      assignedUsers: 0,
      rolePolicyCount: referenceAudit.rolePolicyCount,
      delegatedAdminCount: referenceAudit.delegatedAdminCount,
      referenceAudit: referenceAudit.referenceAudit,
      decision: 'retire_or_exclude_before_prune',
      reason: `Role is inactive and unassigned, but still carries ${uniqueBlockingLegacyOnlyGrants.length} prune-blocking legacy grant(s) across ${resourceCodesFromGrants(uniqueBlockingLegacyOnlyGrants).length} resource(s); retire the role or exclude these grants explicitly before prune.`,
      legacyResourceCodes,
      coveredLegacyGrants: uniqueCoveredLegacyGrants,
      blockingLegacyOnlyGrants: uniqueBlockingLegacyOnlyGrants,
      ignoredLegacyOnlyGrants: uniqueIgnoredLegacyOnlyGrants,
    };
  }

  return {
    roleCode,
    roleId: referenceAudit.roleId,
    present: true,
    authoredContractRole: false,
    aliasOf: null,
    isActive: false,
    assignedUsers: 0,
    rolePolicyCount: referenceAudit.rolePolicyCount,
    delegatedAdminCount: referenceAudit.delegatedAdminCount,
    referenceAudit: referenceAudit.referenceAudit,
    decision: 'retire_residue',
    reason:
      legacyResourceCodes.length > 0
        ? 'Role is inactive and unassigned. It no longer contributes uncovered legacy grants, but still exists as historical residue on audited legacy resources.'
        : 'Role is inactive and unassigned and does not appear on the audited legacy resources; it is residue-only from the current prune perspective.',
    legacyResourceCodes,
    coveredLegacyGrants: uniqueCoveredLegacyGrants,
    blockingLegacyOnlyGrants: [],
    ignoredLegacyOnlyGrants: uniqueIgnoredLegacyOnlyGrants,
  };
}

export function buildHistoricalRoleNormalizationPlan(
  auditSummary: LegacyRbacAuditSummary,
  options: CliOptions,
  referenceAudits: ReadonlyMap<string, HistoricalRoleReferenceAudit> = new Map(),
): HistoricalRoleNormalizationPlanSummary {
  const roleCodes = selectedRoleCodes(options);

  return {
    filters: {
      schemas: options.schemas,
      roles: roleCodes,
    },
    plans: auditSummary.audited.map((schemaAudit) => ({
      schemaName: schemaAudit.schemaName,
      roles: roleCodes.map((roleCode) =>
        buildRolePlan(
          schemaAudit,
          roleCode,
          referenceAudits.get(buildReferenceAuditKey(schemaAudit.schemaName, roleCode)) ?? {
            roleCode,
            roleId: null,
            rolePolicyCount: 0,
            delegatedAdminCount: null,
            referenceAudit: 'missing_delegated_admin_table',
          },
        ),
      ),
    })),
    skipped: auditSummary.skipped,
  };
}

export async function planHistoricalRoleNormalization(
  prisma: PrismaClient,
  options: CliOptions,
): Promise<HistoricalRoleNormalizationPlanSummary> {
  const auditSummary = await auditLegacyRbac(prisma, toAuditOptions(options));
  const referenceAudits = new Map<string, HistoricalRoleReferenceAudit>();
  const roleCodes = selectedRoleCodes(options);

  for (const schemaAudit of auditSummary.audited) {
    for (const roleCode of roleCodes) {
      referenceAudits.set(
        buildReferenceAuditKey(schemaAudit.schemaName, roleCode),
        await getHistoricalRoleReferenceAudit(prisma, schemaAudit.schemaName, roleCode),
      );
    }
  }

  return buildHistoricalRoleNormalizationPlan(auditSummary, options, referenceAudits);
}

function printSummary(summary: HistoricalRoleNormalizationPlanSummary): void {
  for (const schemaPlan of summary.plans) {
    console.log(`\nSchema: ${schemaPlan.schemaName}`);

    for (const rolePlan of schemaPlan.roles) {
      console.log(`- ${rolePlan.roleCode} [${rolePlan.decision}]`);
      console.log(
        `  present=${String(rolePlan.present)} active=${String(rolePlan.isActive)} assignedUsers=${rolePlan.assignedUsers} rolePolicies=${rolePlan.rolePolicyCount} delegatedAdmins=${rolePlan.delegatedAdminCount ?? 'n/a'}`,
      );
      console.log(`  reference audit: ${rolePlan.referenceAudit}`);

      if (rolePlan.aliasOf) {
        console.log(`  aliasOf: ${rolePlan.aliasOf}`);
      }

      if (rolePlan.legacyResourceCodes.length > 0) {
        console.log(`  legacy resources: ${rolePlan.legacyResourceCodes.join(', ')}`);
      }

      if (rolePlan.blockingLegacyOnlyGrants.length > 0) {
        console.log(`  blocking legacy-only grants: ${rolePlan.blockingLegacyOnlyGrants.join(', ')}`);
      }

      if (rolePlan.ignoredLegacyOnlyGrants.length > 0) {
        console.log(`  ignored over-grants: ${rolePlan.ignoredLegacyOnlyGrants.join(', ')}`);
      }

      if (rolePlan.coveredLegacyGrants.length > 0) {
        console.log(`  covered legacy grants: ${rolePlan.coveredLegacyGrants.join(', ')}`);
      }

      console.log(`  note: ${rolePlan.reason}`);
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
    const summary = await planHistoricalRoleNormalization(prisma, options);

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
    console.error('Historical role normalization planning failed:', error);
    process.exit(1);
  });
}
