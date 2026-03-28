// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AssignmentRow } from '../plan-tenant-scope-normalization';
import { buildGroupPlan } from '../plan-tenant-scope-normalization';

const BASE_GRANTED_AT = new Date('2026-03-28T10:00:00.000Z');
const BASE_EXPIRES_AT = new Date('2026-12-31T00:00:00.000Z');

function createAssignment(overrides: Partial<AssignmentRow> = {}): AssignmentRow {
  return {
    assignmentId: 'assignment-1',
    userId: 'user-1',
    username: 'ac_admin',
    roleId: 'role-1',
    roleCode: 'PLATFORM_ADMIN',
    scopeId: 'tenant-current',
    matchedTenantCode: 'AC',
    matchedTenantSchema: 'tenant_ac',
    scopeIdStatus: 'matches_current_tenant',
    inherit: true,
    grantedAt: BASE_GRANTED_AT,
    grantedBy: 'seed-script',
    expiresAt: BASE_EXPIRES_AT,
    ...overrides,
  };
}

describe('buildGroupPlan', () => {
  it('blocks normalization when the schema is missing a current public tenant row', () => {
    const plan = buildGroupPlan([createAssignment()], null);

    assert.equal(plan.status, 'blocked_missing_current_tenant');
    assert.equal(plan.plannedActions.keepAssignmentId, null);
    assert.equal(plan.rowCount, 1);
  });

  it('blocks groups with multiple canonical NULL rows', () => {
    const plan = buildGroupPlan(
      [
        createAssignment({
          assignmentId: 'assignment-1',
          scopeId: null,
          matchedTenantCode: null,
          matchedTenantSchema: null,
          scopeIdStatus: 'null_scope',
        }),
        createAssignment({
          assignmentId: 'assignment-2',
          grantedAt: new Date('2026-03-28T09:00:00.000Z'),
          scopeId: null,
          matchedTenantCode: null,
          matchedTenantSchema: null,
          scopeIdStatus: 'null_scope',
        }),
      ],
      'tenant-current'
    );

    assert.equal(plan.status, 'blocked_multiple_null_rows');
    assert.equal(plan.counts.nullScope, 2);
  });

  it('blocks groups that reference another active tenant id', () => {
    const plan = buildGroupPlan(
      [
        createAssignment(),
        createAssignment({
          assignmentId: 'assignment-2',
          scopeId: 'tenant-other',
          matchedTenantCode: 'OTHER',
          matchedTenantSchema: 'tenant_other',
          scopeIdStatus: 'matches_other_active_tenant',
          grantedAt: new Date('2026-03-28T08:00:00.000Z'),
        }),
      ],
      'tenant-current'
    );

    assert.equal(plan.status, 'blocked_cross_tenant_reference');
    assert.equal(plan.counts.otherActiveTenantScope, 1);
  });

  it('blocks groups when duplicate rows have mismatched metadata', () => {
    const plan = buildGroupPlan(
      [
        createAssignment(),
        createAssignment({
          assignmentId: 'assignment-2',
          grantedBy: 'manual-fix',
          grantedAt: new Date('2026-03-28T08:00:00.000Z'),
        }),
      ],
      'tenant-current'
    );

    assert.equal(plan.status, 'blocked_metadata_mismatch');
    assert.match(plan.reason, /inherit \/ expiresAt \/ grantedBy/);
  });

  it('recognizes an already-normalized single NULL tenant-scope row', () => {
    const plan = buildGroupPlan(
      [
        createAssignment({
          scopeId: null,
          matchedTenantCode: null,
          matchedTenantSchema: null,
          scopeIdStatus: 'null_scope',
        }),
      ],
      'tenant-current'
    );

    assert.equal(plan.status, 'already_normalized');
    assert.deepEqual(plan.plannedActions, {
      keepAssignmentId: 'assignment-1',
      updateToNullAssignmentId: null,
      deleteAssignmentIds: [],
    });
  });

  it('plans a keeper update to NULL when only tenant-id residue exists', () => {
    const plan = buildGroupPlan(
      [
        createAssignment({
          assignmentId: 'assignment-keeper',
          grantedAt: new Date('2026-03-28T11:00:00.000Z'),
        }),
        createAssignment({
          assignmentId: 'assignment-residue',
          scopeId: 'tenant-stale',
          matchedTenantCode: null,
          matchedTenantSchema: null,
          scopeIdStatus: 'missing_public_tenant',
          grantedAt: new Date('2026-03-28T09:00:00.000Z'),
        }),
      ],
      'tenant-current'
    );

    assert.equal(plan.status, 'safe_to_normalize');
    assert.equal(plan.plannedActions.keepAssignmentId, 'assignment-keeper');
    assert.equal(plan.plannedActions.updateToNullAssignmentId, 'assignment-keeper');
    assert.deepEqual(plan.plannedActions.deleteAssignmentIds, ['assignment-residue']);
  });

  it('keeps an existing NULL keeper ahead of newer duplicate residue rows', () => {
    const plan = buildGroupPlan(
      [
        createAssignment({
          assignmentId: 'assignment-null',
          scopeId: null,
          matchedTenantCode: null,
          matchedTenantSchema: null,
          scopeIdStatus: 'null_scope',
          grantedAt: new Date('2026-03-28T08:00:00.000Z'),
        }),
        createAssignment({
          assignmentId: 'assignment-current',
          grantedAt: new Date('2026-03-28T12:00:00.000Z'),
        }),
      ],
      'tenant-current'
    );

    assert.equal(plan.status, 'safe_to_normalize');
    assert.equal(plan.plannedActions.keepAssignmentId, 'assignment-null');
    assert.equal(plan.plannedActions.updateToNullAssignmentId, null);
    assert.deepEqual(plan.plannedActions.deleteAssignmentIds, ['assignment-current']);
    assert.match(plan.reason, /Canonical NULL row already exists/);
  });
});
