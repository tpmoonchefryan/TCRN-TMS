// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Validation helper for explicit historical-role exclusions used by legacy-prune staging.

import { PrismaClient } from '@prisma/client';

import {
  planHistoricalRoleNormalization,
  type HistoricalRoleNormalizationPlan,
  type HistoricalRoleNormalizationPlanSummary,
} from './plan-historical-role-normalization';

export interface ExclusionValidationOptions {
  schemas: string[];
  roles: string[];
}

export interface HistoricalRoleExclusionValidationSummary {
  filters: {
    schemas: string[];
    roles: string[];
  };
  allowed: Array<{
    schemaName: string;
    role: HistoricalRoleNormalizationPlan;
  }>;
  blocked: Array<{
    schemaName: string;
    role: HistoricalRoleNormalizationPlan;
  }>;
  skipped: HistoricalRoleNormalizationPlanSummary['skipped'];
}

function isAllowedExclusionDecision(decision: HistoricalRoleNormalizationPlan['decision']): boolean {
  return (
    decision === 'absent' ||
    decision === 'retire_or_exclude_before_prune' ||
    decision === 'retire_residue'
  );
}

export async function validateHistoricalRoleExclusions(
  prisma: PrismaClient,
  options: ExclusionValidationOptions,
): Promise<HistoricalRoleExclusionValidationSummary> {
  const summary = await planHistoricalRoleNormalization(prisma, {
    schemas: options.schemas,
    roles: options.roles,
    json: false,
  });

  const allowed: HistoricalRoleExclusionValidationSummary['allowed'] = [];
  const blocked: HistoricalRoleExclusionValidationSummary['blocked'] = [];

  for (const plan of summary.plans) {
    for (const role of plan.roles) {
      if (isAllowedExclusionDecision(role.decision)) {
        allowed.push({
          schemaName: plan.schemaName,
          role,
        });
        continue;
      }

      blocked.push({
        schemaName: plan.schemaName,
        role,
      });
    }
  }

  return {
    filters: {
      schemas: options.schemas,
      roles: summary.filters.roles,
    },
    allowed,
    blocked,
    skipped: summary.skipped,
  };
}

export function assertHistoricalRoleExclusionsSafe(
  summary: HistoricalRoleExclusionValidationSummary,
): void {
  if (summary.skipped.length > 0) {
    throw new Error(
      `Historical-role exclusion refused because some schemas were skipped: ${summary.skipped.map((item) => `${item.schemaName} (${item.reason})`).join(', ')}`,
    );
  }

  if (summary.blocked.length > 0) {
    throw new Error(
      `Historical-role exclusion refused because some selected roles are not safe to exclude: ${summary.blocked.map((item) => `${item.schemaName}:${item.role.roleCode}[${item.role.decision}]`).join(', ')}`,
    );
  }
}
