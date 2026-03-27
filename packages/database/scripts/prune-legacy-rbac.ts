// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Guarded prune planner for legacy RBAC resources.
//
// Default mode is dry-run only. Apply mode is intentionally strict:
// - requires explicit schema selection
// - requires explicit legacy resource selection
// - refuses when any target is unmapped, coverage-blocked, snapshot-blocked, or skipped

import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'node:url';

import {
  auditLegacyRbac,
  formatCanonicalLabel,
  type LegacyRbacAuditSummary,
  type LegacyTargetAudit,
  type PruneReadiness,
} from './audit-legacy-rbac';
import { verifyLegacyPruneRuntime } from './verify-legacy-prune-runtime';

export interface CliOptions {
  schemas: string[];
  skipTemplate: boolean;
  legacyCodes: string[];
  allowUsers: string[];
  runtimeProof: boolean;
  apply: boolean;
  json: boolean;
}

export interface PlannedDeleteCounts {
  rolePolicies: number;
  policies: number;
  resources: number;
}

export interface PlannedPruneTarget {
  legacyCode: string;
  canonicalCode: string | null;
  canonicalCodes: string[];
  readiness: PruneReadiness;
  reason: string;
  assignedRoleCount: number;
  affectedUserCount: number;
  plannedDeletes: PlannedDeleteCounts;
}

export interface BlockedPruneTarget {
  legacyCode: string;
  canonicalCode: string | null;
  canonicalCodes: string[];
  readiness: PruneReadiness;
  reason: string;
  assignedRoleCount: number;
  affectedUserCount: number;
}

export interface SchemaPrunePlan {
  schemaName: string;
  candidates: PlannedPruneTarget[];
  blocked: BlockedPruneTarget[];
  absent: string[];
}

export interface ApplyDeleteCounts extends PlannedDeleteCounts {}

export interface AppliedPruneTarget {
  legacyCode: string;
  deleted: ApplyDeleteCounts;
}

export interface AppliedSchemaPrune {
  schemaName: string;
  targets: AppliedPruneTarget[];
}

export interface PrunePlanSummary {
  mode: 'dry_run' | 'apply';
  filters: {
    schemas: string[];
    legacyCodes: string[];
    allowUsers: string[];
    runtimeProof: boolean;
    skipTemplate: boolean;
  };
  plans: SchemaPrunePlan[];
  skipped: LegacyRbacAuditSummary['skipped'];
  applied: AppliedSchemaPrune[];
}

interface DeleteCountRow {
  rolePolicies: bigint;
  policies: bigint;
  resources: bigint;
}

function parseCliArgs(argv: string[]): CliOptions {
  const schemas: string[] = [];
  const legacyCodes: string[] = [];
  const allowUsers: string[] = [];
  let skipTemplate = false;
  let runtimeProof = false;
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
    schemas,
    skipTemplate,
    legacyCodes: [...new Set(legacyCodes)],
    allowUsers: [...new Set(allowUsers)],
    runtimeProof,
    apply,
    json,
  };
}

function matchesSelectedResources(target: LegacyTargetAudit, legacyCodes: string[]): boolean {
  if (legacyCodes.length === 0) {
    return true;
  }

  return legacyCodes.includes(target.legacyCode);
}

function toCandidate(target: LegacyTargetAudit): PlannedPruneTarget {
  return {
    legacyCode: target.legacyCode,
    canonicalCode: target.canonicalCode,
    canonicalCodes: target.canonicalCodes,
    readiness: target.readiness,
    reason: target.reason,
    assignedRoleCount: target.legacy.assignedRoleCount,
    affectedUserCount: target.legacy.affectedUserCount,
    plannedDeletes: {
      rolePolicies: target.legacy.rolePolicyCount,
      policies: target.legacy.policyCount,
      resources: target.legacy.present ? 1 : 0,
    },
  };
}

function toBlocked(target: LegacyTargetAudit): BlockedPruneTarget {
  return {
    legacyCode: target.legacyCode,
    canonicalCode: target.canonicalCode,
    canonicalCodes: target.canonicalCodes,
    readiness: target.readiness,
    reason: target.reason,
    assignedRoleCount: target.legacy.assignedRoleCount,
    affectedUserCount: target.legacy.affectedUserCount,
  };
}

export function buildPrunePlan(
  auditSummary: LegacyRbacAuditSummary,
  options: CliOptions,
): PrunePlanSummary {
  const plans = auditSummary.audited.map((schemaAudit) => {
    const selectedTargets = schemaAudit.targets.filter((target) =>
      matchesSelectedResources(target, options.legacyCodes),
    );

    const candidates: PlannedPruneTarget[] = [];
    const blocked: BlockedPruneTarget[] = [];
    const absent: string[] = [];

    for (const target of selectedTargets) {
      if (target.readiness === 'absent') {
        absent.push(target.legacyCode);
        continue;
      }

      if (
        target.readiness === 'covered_unassigned' ||
        target.readiness === 'covered_assigned_verified'
      ) {
        candidates.push(toCandidate(target));
        continue;
      }

      blocked.push(toBlocked(target));
    }

    return {
      schemaName: schemaAudit.schemaName,
      candidates,
      blocked,
      absent,
    };
  });

  return {
    mode: options.apply ? 'apply' : 'dry_run',
    filters: {
      schemas: options.schemas,
      legacyCodes: options.legacyCodes,
      allowUsers: options.allowUsers,
      runtimeProof: options.runtimeProof,
      skipTemplate: options.skipTemplate,
    },
    plans,
    skipped: auditSummary.skipped,
    applied: [],
  };
}

export function promoteRuntimeVerifiedTargetInAudit(
  auditSummary: LegacyRbacAuditSummary,
  schemaName: string,
  legacyCode: string,
  proofUsers: string[],
): LegacyRbacAuditSummary {
  return {
    ...auditSummary,
    audited: auditSummary.audited.map((schemaAudit) => {
      if (schemaAudit.schemaName !== schemaName) {
        return schemaAudit;
      }

      return {
        ...schemaAudit,
        targets: schemaAudit.targets.map((target) => {
          if (
            target.legacyCode !== legacyCode ||
            target.readiness !== 'covered_requires_snapshot_refresh'
          ) {
            return target;
          }

          return {
            ...target,
            readiness: 'covered_assigned_verified',
            reason:
              `${target.reason} Runtime proof verified for affected users: ${proofUsers.join(', ')}.`,
          };
        }),
      };
    }),
  };
}

function assertApplyAllowed(summary: PrunePlanSummary): void {
  if (summary.filters.schemas.length === 0) {
    throw new Error('Apply mode requires at least one explicit --schema.');
  }

  if (summary.filters.legacyCodes.length === 0) {
    throw new Error('Apply mode requires at least one explicit --resource.');
  }

  if (summary.skipped.length > 0) {
    throw new Error(
      `Apply mode refused because some schemas were skipped: ${summary.skipped.map((item) => `${item.schemaName} (${item.reason})`).join(', ')}`,
    );
  }

  const blockedEntries = summary.plans.flatMap((plan) =>
    plan.blocked.map((target) => `${plan.schemaName}:${target.legacyCode}[${target.readiness}]`),
  );

  if (blockedEntries.length > 0) {
    throw new Error(
      `Apply mode refused because blocked targets remain: ${blockedEntries.join(', ')}`,
    );
  }
}

async function applyPruneTarget(
  prisma: PrismaClient,
  schemaName: string,
  legacyCode: string,
): Promise<ApplyDeleteCounts> {
  const rows = await prisma.$queryRawUnsafe<DeleteCountRow[]>(
    `
      WITH resource_lookup AS (
        SELECT id
        FROM "${schemaName}".resource
        WHERE code = $1
      ),
      deleted_role_policies AS (
        DELETE FROM "${schemaName}".role_policy rp
        USING "${schemaName}".policy p, resource_lookup r
        WHERE rp.policy_id = p.id
          AND p.resource_id = r.id
        RETURNING rp.id
      ),
      deleted_policies AS (
        DELETE FROM "${schemaName}".policy p
        USING resource_lookup r
        WHERE p.resource_id = r.id
        RETURNING p.id
      ),
      deleted_resources AS (
        DELETE FROM "${schemaName}".resource res
        WHERE res.code = $1
        RETURNING res.id
      )
      SELECT
        (SELECT COUNT(*)::bigint FROM deleted_role_policies) AS "rolePolicies",
        (SELECT COUNT(*)::bigint FROM deleted_policies) AS "policies",
        (SELECT COUNT(*)::bigint FROM deleted_resources) AS "resources"
    `,
    legacyCode,
  );

  return {
    rolePolicies: Number(rows[0]?.rolePolicies ?? 0n),
    policies: Number(rows[0]?.policies ?? 0n),
    resources: Number(rows[0]?.resources ?? 0n),
  };
}

export async function executePrunePlan(
  prisma: PrismaClient,
  summary: PrunePlanSummary,
): Promise<PrunePlanSummary> {
  assertApplyAllowed(summary);

  const applied: AppliedSchemaPrune[] = [];

  for (const plan of summary.plans) {
    if (plan.candidates.length === 0) {
      continue;
    }

    const targets = await prisma.$transaction(async (tx) => {
      const deletions: AppliedPruneTarget[] = [];

      for (const candidate of plan.candidates) {
        deletions.push({
          legacyCode: candidate.legacyCode,
          deleted: await applyPruneTarget(tx, plan.schemaName, candidate.legacyCode),
        });
      }

      return deletions;
    });

    applied.push({
      schemaName: plan.schemaName,
      targets,
    });
  }

  return {
    ...summary,
    applied,
  };
}

function printSummary(summary: PrunePlanSummary): void {
  console.log(`Mode: ${summary.mode}`);

  if (summary.filters.schemas.length > 0) {
    console.log(`Schemas: ${summary.filters.schemas.join(', ')}`);
  } else {
    console.log('Schemas: all public.tenant schemas plus tenant_template unless --skip-template');
  }

  if (summary.filters.legacyCodes.length > 0) {
    console.log(`Legacy resources: ${summary.filters.legacyCodes.join(', ')}`);
  } else {
    console.log('Legacy resources: all audited legacy targets');
  }

  if (summary.filters.runtimeProof) {
    console.log(`Runtime proof: enabled (${summary.filters.allowUsers.join(', ') || 'no allowlist'})`);
  }

  for (const plan of summary.plans) {
    console.log(`\nSchema: ${plan.schemaName}`);

    if (plan.candidates.length === 0 && plan.blocked.length === 0 && plan.absent.length === 0) {
      console.log('- no selected legacy targets');
      continue;
    }

    for (const candidate of plan.candidates) {
      console.log(
        `- candidate ${candidate.legacyCode} -> ${formatCanonicalLabel(candidate)} [${candidate.readiness}]`,
      );
      console.log(
        `  would delete resource=${candidate.plannedDeletes.resources} policies=${candidate.plannedDeletes.policies} rolePolicies=${candidate.plannedDeletes.rolePolicies}`,
      );
      console.log(`  note: ${candidate.reason}`);
    }

    for (const blocked of plan.blocked) {
      console.log(
        `- blocked ${blocked.legacyCode} -> ${formatCanonicalLabel(blocked)} [${blocked.readiness}]`,
      );
      console.log(
        `  assignedRoles=${blocked.assignedRoleCount} affectedUsers=${blocked.affectedUserCount}`,
      );
      console.log(`  note: ${blocked.reason}`);
    }

    if (plan.absent.length > 0) {
      console.log(`- already absent: ${plan.absent.join(', ')}`);
    }
  }

  if (summary.skipped.length > 0) {
    console.log('\nSkipped schemas:');

    for (const skipped of summary.skipped) {
      console.log(`- ${skipped.schemaName}: ${skipped.reason}`);
    }
  }

  if (summary.applied.length > 0) {
    console.log('\nApplied deletions:');

    for (const appliedSchema of summary.applied) {
      console.log(`- ${appliedSchema.schemaName}`);

      for (const target of appliedSchema.targets) {
        console.log(
          `  ${target.legacyCode}: resource=${target.deleted.resources} policies=${target.deleted.policies} rolePolicies=${target.deleted.rolePolicies}`,
        );
      }
    }

    console.log(
      '\nNext step: run pnpm --filter @tcrn/database db:refresh-snapshots and targeted RBAC integration proof.',
    );
    return;
  }

  console.log(
    '\nDry-run only. Apply mode requires explicit --schema and --resource, and refuses blocked targets.',
  );
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const options = parseCliArgs(process.argv.slice(2));

  try {
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

    const plan = buildPrunePlan(auditSummary, options);
    const result = options.apply ? await executePrunePlan(prisma, plan) : plan;

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
    console.error('Legacy RBAC prune planning failed:', error);
    process.exit(1);
  });
}
