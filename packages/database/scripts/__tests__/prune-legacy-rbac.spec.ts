// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  LegacyRbacAuditSummary,
  LegacyTargetAudit,
  ResourceAudit,
} from '../audit-legacy-rbac';
import { selectRuntimeProofTargets } from '../prune-legacy-rbac';

function createResourceAudit(code: string): ResourceAudit {
  return {
    code,
    present: true,
    isActive: true,
    policyCount: 1,
    rolePolicyCount: 1,
    assignedRoleCount: 0,
    affectedUserCount: 0,
    roleCodes: [],
    grants: [],
  };
}

function createTarget(
  legacyCode: string,
  readiness: LegacyTargetAudit['readiness']
): LegacyTargetAudit {
  return {
    legacyCode,
    canonicalCode: `${legacyCode}.canonical`,
    canonicalCodes: [`${legacyCode}.canonical`],
    note: `${legacyCode} note`,
    legacy: createResourceAudit(legacyCode),
    canonical: createResourceAudit(`${legacyCode}.canonical`),
    canonicalResources: [createResourceAudit(`${legacyCode}.canonical`)],
    missingCanonicalCodes: [],
    legacyOnlyGrants: [],
    ignoredLegacyOnlyGrants: [],
    excludedLegacyOnlyGrants: [],
    canonicalOnlyGrants: [],
    readiness,
    reason: `${legacyCode}:${readiness}`,
  };
}

describe('selectRuntimeProofTargets', () => {
  const summary: LegacyRbacAuditSummary = {
    audited: [
      {
        schemaName: 'tenant_ac',
        targets: [
          createTarget('homepage', 'covered_assigned_verified'),
          createTarget('log.change', 'covered_requires_snapshot_refresh'),
          createTarget('log.integration', 'absent'),
        ],
        historicalRoles: [],
        compatResources: [],
      },
      {
        schemaName: 'tenant_other',
        targets: [createTarget('system', 'covered_unassigned')],
        historicalRoles: [],
        compatResources: [],
      },
    ],
    skipped: [],
  };

  it('skips already absent targets during runtime proof selection', () => {
    assert.deepEqual(
      selectRuntimeProofTargets(summary, 'tenant_ac', [
        'homepage',
        'log.change',
        'log.integration',
      ]),
      ['homepage', 'log.change']
    );
  });

  it('falls back to all non-absent targets when no explicit resource filter is provided', () => {
    assert.deepEqual(selectRuntimeProofTargets(summary, 'tenant_ac', []), [
      'homepage',
      'log.change',
    ]);
  });

  it('returns an empty list when the selected schema is not present in the audit summary', () => {
    assert.deepEqual(selectRuntimeProofTargets(summary, 'tenant_missing', ['homepage']), []);
  });
});
