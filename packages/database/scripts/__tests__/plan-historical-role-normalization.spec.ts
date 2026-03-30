// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
/* eslint-disable simple-import-sort/imports */
// sort-imports-ignore
import { describe, it } from 'node:test';

import assert from 'node:assert/strict';

import type {
  HistoricalRoleAudit,
  LegacyRbacAuditSummary,
  LegacyTargetAudit,
  ResourceAudit,
  ResourceGrantEntry,
} from '../audit-legacy-rbac';
import type {
  CliOptions,
  HistoricalRoleReferenceAudit,
} from '../plan-historical-role-normalization';
import {
  buildHistoricalRoleNormalizationPlan,
  formatHistoricalRoleNormalizationPlanMarkdown,
} from '../plan-historical-role-normalization';

function createResourceAudit(code: string, grants: ResourceGrantEntry[] = []): ResourceAudit {
  return {
    code,
    present: true,
    isActive: true,
    policyCount: grants.length,
    rolePolicyCount: grants.length,
    assignedRoleCount: grants.length > 0 ? 1 : 0,
    affectedUserCount: 0,
    roleCodes: [...new Set(grants.map((grant) => grant.roleCode))],
    grants,
  };
}

function createTarget(
  legacyCode: string,
  options: {
    grants?: ResourceGrantEntry[];
    legacyOnlyGrants?: string[];
    ignoredLegacyOnlyGrants?: string[];
  } = {}
): LegacyTargetAudit {
  return {
    legacyCode,
    canonicalCode: `${legacyCode}.canonical`,
    canonicalCodes: [`${legacyCode}.canonical`],
    note: `${legacyCode} note`,
    legacy: createResourceAudit(legacyCode, options.grants),
    canonical: createResourceAudit(`${legacyCode}.canonical`),
    canonicalResources: [createResourceAudit(`${legacyCode}.canonical`)],
    missingCanonicalCodes: [],
    legacyOnlyGrants: options.legacyOnlyGrants ?? [],
    ignoredLegacyOnlyGrants: options.ignoredLegacyOnlyGrants ?? [],
    excludedLegacyOnlyGrants: [],
    canonicalOnlyGrants: [],
    readiness: 'covered_assigned_verified',
    reason: `${legacyCode} ready`,
  };
}

function createSummary(
  role: HistoricalRoleAudit | null,
  targets: LegacyTargetAudit[] = []
): LegacyRbacAuditSummary {
  return {
    audited: [
      {
        schemaName: 'tenant_uat_corp',
        targets,
        historicalRoles: role ? [role] : [],
        compatResources: [],
      },
    ],
    skipped: [],
  };
}

function createReferenceAudit(
  roleCode: string,
  overrides: Partial<HistoricalRoleReferenceAudit> = {}
): HistoricalRoleReferenceAudit {
  return {
    roleCode,
    roleId: `${roleCode.toLowerCase()}-id`,
    rolePolicyCount: 0,
    delegatedAdminCount: 0,
    referenceAudit: 'complete',
    ...overrides,
  };
}

function createOptions(roles: string[]): CliOptions {
  return {
    schemas: ['tenant_uat_corp'],
    roles,
    json: false,
    markdown: false,
  };
}

function createReferenceAuditMap(
  roleCode: string,
  overrides: Partial<HistoricalRoleReferenceAudit> = {}
): ReadonlyMap<string, HistoricalRoleReferenceAudit> {
  return new Map([[`tenant_uat_corp:${roleCode}`, createReferenceAudit(roleCode, overrides)]]);
}

describe('buildHistoricalRoleNormalizationPlan', () => {
  it('uses the default historical-role filter when no explicit roles are provided', () => {
    const summary = createSummary(null);
    const plan = buildHistoricalRoleNormalizationPlan(summary, createOptions([]));

    assert.deepEqual(plan.filters.roles, [
      'SUPER_ADMIN',
      'INTEGRATION_ADMIN',
      'INTEGRATION_VIEWER',
    ]);
    assert.equal(plan.plans[0]?.roles.length, 3);
  });

  it('marks authored catalog aliases outside retirement scope', () => {
    const summary = createSummary({
      roleCode: 'TENANT_ADMIN',
      present: true,
      isActive: true,
      assignedUsers: 2,
    });

    const plan = buildHistoricalRoleNormalizationPlan(
      summary,
      createOptions(['TENANT_ADMIN']),
      createReferenceAuditMap('TENANT_ADMIN', {
        rolePolicyCount: 12,
      })
    );

    assert.equal(plan.plans[0]?.roles[0]?.decision, 'authored_contract_role');
    assert.equal(plan.plans[0]?.roles[0]?.authoredContractRole, true);
    assert.equal(plan.plans[0]?.roles[0]?.aliasOf, 'ADMIN');
  });

  it('marks non-authored missing roles as absent', () => {
    const plan = buildHistoricalRoleNormalizationPlan(
      createSummary(null),
      createOptions(['SUPER_ADMIN']),
      createReferenceAuditMap('SUPER_ADMIN', {
        roleId: null,
        delegatedAdminCount: null,
        referenceAudit: 'missing_delegated_admin_table',
      })
    );

    assert.equal(plan.plans[0]?.roles[0]?.decision, 'absent');
    assert.equal(plan.plans[0]?.roles[0]?.present, false);
    assert.equal(plan.plans[0]?.roles[0]?.reason, 'Role is absent in the selected schema.');
  });

  it('blocks retirement when reference auditing is incomplete', () => {
    const summary = createSummary({
      roleCode: 'SUPER_ADMIN',
      present: true,
      isActive: false,
      assignedUsers: 0,
    });

    const plan = buildHistoricalRoleNormalizationPlan(
      summary,
      createOptions(['SUPER_ADMIN']),
      createReferenceAuditMap('SUPER_ADMIN', {
        delegatedAdminCount: null,
        referenceAudit: 'missing_delegated_admin_table',
      })
    );

    assert.equal(plan.plans[0]?.roles[0]?.decision, 'blocked_reference_audit_incomplete');
    assert.match(plan.plans[0]?.roles[0]?.reason ?? '', /delegated_admin is missing/);
  });

  it('blocks retirement when delegated-admin rows still reference the role', () => {
    const summary = createSummary({
      roleCode: 'SUPER_ADMIN',
      present: true,
      isActive: false,
      assignedUsers: 0,
    });

    const plan = buildHistoricalRoleNormalizationPlan(
      summary,
      createOptions(['SUPER_ADMIN']),
      createReferenceAuditMap('SUPER_ADMIN', {
        delegatedAdminCount: 2,
        rolePolicyCount: 9,
      })
    );

    assert.equal(plan.plans[0]?.roles[0]?.decision, 'blocked_delegated_admin_reference');
    assert.match(plan.plans[0]?.roles[0]?.reason ?? '', /2 delegated_admin row/);
  });

  it('blocks retirement when users are still assigned to the role', () => {
    const summary = createSummary({
      roleCode: 'INTEGRATION_ADMIN',
      present: true,
      isActive: false,
      assignedUsers: 3,
    });

    const plan = buildHistoricalRoleNormalizationPlan(
      summary,
      createOptions(['INTEGRATION_ADMIN']),
      createReferenceAuditMap('INTEGRATION_ADMIN')
    );

    assert.equal(plan.plans[0]?.roles[0]?.decision, 'blocked_assigned_users');
    assert.match(plan.plans[0]?.roles[0]?.reason ?? '', /3 assigned user/);
  });

  it('blocks unassigned roles that are still active', () => {
    const summary = createSummary({
      roleCode: 'INTEGRATION_VIEWER',
      present: true,
      isActive: true,
      assignedUsers: 0,
    });

    const plan = buildHistoricalRoleNormalizationPlan(
      summary,
      createOptions(['INTEGRATION_VIEWER']),
      createReferenceAuditMap('INTEGRATION_VIEWER')
    );

    assert.equal(plan.plans[0]?.roles[0]?.decision, 'blocked_active_role');
    assert.match(plan.plans[0]?.roles[0]?.reason ?? '', /still active/);
  });

  it('marks inactive residue with blocking grants for retire-or-exclude planning', () => {
    const summary = createSummary(
      {
        roleCode: 'SUPER_ADMIN',
        present: true,
        isActive: false,
        assignedUsers: 0,
      },
      [
        createTarget('homepage', {
          grants: [{ roleCode: 'SUPER_ADMIN', action: 'read', effect: 'grant' }],
        }),
        createTarget('log.change', {
          grants: [{ roleCode: 'SUPER_ADMIN', action: 'write', effect: 'grant' }],
          legacyOnlyGrants: ['SUPER_ADMIN:write:grant'],
        }),
        createTarget('marshmallow', {
          grants: [{ roleCode: 'SUPER_ADMIN', action: 'delete', effect: 'grant' }],
          ignoredLegacyOnlyGrants: ['SUPER_ADMIN:delete:grant'],
        }),
      ]
    );

    const plan = buildHistoricalRoleNormalizationPlan(
      summary,
      createOptions(['SUPER_ADMIN']),
      createReferenceAuditMap('SUPER_ADMIN', {
        rolePolicyCount: 96,
      })
    );

    assert.equal(plan.plans[0]?.roles[0]?.decision, 'retire_or_exclude_before_prune');
    assert.deepEqual(plan.plans[0]?.roles[0]?.legacyResourceCodes, [
      'homepage',
      'log.change',
      'marshmallow',
    ]);
    assert.deepEqual(plan.plans[0]?.roles[0]?.coveredLegacyGrants, ['homepage:read:grant']);
    assert.deepEqual(plan.plans[0]?.roles[0]?.blockingLegacyOnlyGrants, ['log.change:write:grant']);
    assert.deepEqual(plan.plans[0]?.roles[0]?.ignoredLegacyOnlyGrants, [
      'marshmallow:delete:grant',
    ]);
  });

  it('marks inactive roles with no audited legacy grants as residue only', () => {
    const summary = createSummary({
      roleCode: 'INTEGRATION_VIEWER',
      present: true,
      isActive: false,
      assignedUsers: 0,
    });

    const plan = buildHistoricalRoleNormalizationPlan(
      summary,
      createOptions(['INTEGRATION_VIEWER']),
      createReferenceAuditMap('INTEGRATION_VIEWER', {
        rolePolicyCount: 4,
      })
    );

    assert.equal(plan.plans[0]?.roles[0]?.decision, 'retire_residue');
    assert.deepEqual(plan.plans[0]?.roles[0]?.legacyResourceCodes, []);
    assert.equal(
      plan.plans[0]?.roles[0]?.reason,
      'Role is inactive and unassigned and does not appear on the audited legacy resources; it is residue-only from the current prune perspective.'
    );
  });

  it('formats a markdown plan artifact with decisions and legacy grant details', () => {
    const summary = createSummary(
      {
        roleCode: 'SUPER_ADMIN',
        present: true,
        isActive: false,
        assignedUsers: 0,
      },
      [
        createTarget('homepage', {
          grants: [{ roleCode: 'SUPER_ADMIN', action: 'read', effect: 'grant' }],
        }),
        createTarget('log.change', {
          grants: [{ roleCode: 'SUPER_ADMIN', action: 'write', effect: 'grant' }],
          legacyOnlyGrants: ['SUPER_ADMIN:write:grant'],
        }),
      ]
    );

    const plan = buildHistoricalRoleNormalizationPlan(
      summary,
      createOptions(['SUPER_ADMIN']),
      createReferenceAuditMap('SUPER_ADMIN', {
        rolePolicyCount: 96,
      })
    );

    const markdown = formatHistoricalRoleNormalizationPlanMarkdown(plan);

    assert.match(markdown, /^# Historical Role Normalization Plan$/m);
    assert.match(markdown, /^## tenant_uat_corp$/m);
    assert.match(markdown, /^### SUPER_ADMIN$/m);
    assert.match(markdown, /- Decision: `retire_or_exclude_before_prune`/);
    assert.match(markdown, /- Legacy resources: `homepage`, `log\.change`/);
    assert.match(markdown, /- Blocking legacy-only grants: `log\.change:write:grant`/);
    assert.match(markdown, /- Covered legacy grants: `homepage:read:grant`/);
  });
});
