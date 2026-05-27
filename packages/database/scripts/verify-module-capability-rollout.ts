// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Read-only verification for Phase 1 Module / Capability Registry rollout.

import { PrismaClient } from '../src/platform/prisma/client';
import { loadRepoEnvFiles } from './load-repo-env';

loadRepoEnvFiles(import.meta.url);

interface TenantRow {
  id: string;
  code: string;
  tier: string;
  settings: Record<string, unknown>;
}

interface AssignmentRow {
  tenantId: string;
  capabilityCode: string;
  enabled: boolean;
}

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.$queryRawUnsafe<TenantRow[]>(`
    SELECT id::text, code, tier, settings
    FROM public.tenant
    ORDER BY code ASC
  `);

  const assignments = await prisma.$queryRawUnsafe<AssignmentRow[]>(`
    SELECT
      tenant_id::text AS "tenantId",
      capability_code AS "capabilityCode",
      enabled
    FROM public.tenant_capability_assignment
    ORDER BY tenant_id ASC, capability_code ASC
  `);

  const assignmentsByTenant = new Map<string, AssignmentRow[]>();

  for (const assignment of assignments) {
    const current = assignmentsByTenant.get(assignment.tenantId) ?? [];
    current.push(assignment);
    assignmentsByTenant.set(assignment.tenantId, current);
  }

  const tenantReports = tenants.map((tenant) => {
    const tenantAssignments = assignmentsByTenant.get(tenant.id) ?? [];
    const enabledAssignableCapabilityCodes = tenantAssignments
      .filter((assignment) => assignment.enabled)
      .map((assignment) => assignment.capabilityCode)
      .sort();

    return {
      code: tenant.code,
      tier: tenant.tier,
      enabledAssignableCapabilityCodes,
      retiredFeatureKeyAbsent: !Object.prototype.hasOwnProperty.call(tenant.settings, 'features'),
    };
  });

  const failures = tenantReports.flatMap((tenant) =>
    tenant.retiredFeatureKeyAbsent ? [] : [`${tenant.code} still has retired feature key`]
  );

  const report = {
    checkedAt: new Date().toISOString(),
    tenantCount: tenants.length,
    assignmentCount: assignments.length,
    tenants: tenantReports,
    legacyAliasMapping: {
      homepage: 'public_presence.homepage',
      marshmallow: 'marshmallow.mailbox',
      advancedReports: 'reports.mfr',
      apiIntegration: 'integration.webhooks',
      unsupportedLegacyKeysRemainInert: ['multiSubsidiary'],
    },
    passed: failures.length === 0,
    failures,
  };

  console.log(JSON.stringify(report, null, 2));

  if (!report.passed) {
    process.exitCode = 1;
  }
}

void main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
