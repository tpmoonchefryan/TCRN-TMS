// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { UserRoleAssignmentRecord } from '@tcrn/shared';

import {
  findUserRoleAssignment,
  getRbacScopeKey,
  toUserRoleAssignmentState,
} from '@/lib/rbac/user-role-assignment';

describe('user-role-assignment helpers', () => {
  const tenantId = 'tenant-123';

  const tenantAssignment: UserRoleAssignmentRecord = {
    id: 'assignment-tenant',
    role: {
      id: 'role-admin',
      code: 'ADMIN',
      name: 'Admin',
    },
    scopeType: 'tenant',
    scopeId: null,
    scopeName: null,
    scopePath: null,
    inherit: true,
    grantedAt: '2026-03-27T00:00:00.000Z',
    grantedBy: null,
    expiresAt: null,
  };

  const subsidiaryAssignment: UserRoleAssignmentRecord = {
    id: 'assignment-subsidiary',
    role: {
      id: 'role-editor',
      code: 'EDITOR',
      name: 'Editor',
    },
    scopeType: 'subsidiary',
    scopeId: 'subsidiary-456',
    scopeName: 'Subsidiary',
    scopePath: '/subsidiary',
    inherit: false,
    grantedAt: '2026-03-27T00:00:00.000Z',
    grantedBy: {
      id: 'grantor-1',
      username: 'admin',
    },
    expiresAt: null,
  };

  it('maps tenant scope to the selected tenant node id', () => {
    expect(getRbacScopeKey('tenant', null, tenantId)).toBe(tenantId);
  });

  it('maps typed assignment records to page state using role.code', () => {
    expect(toUserRoleAssignmentState(tenantAssignment)).toEqual({
      id: 'assignment-tenant',
      code: 'ADMIN',
      scopeType: 'tenant',
      scopeId: null,
      inherit: true,
    });
  });

  it('finds tenant assignments even when API scopeId is null', () => {
    const assignments = [
      toUserRoleAssignmentState(tenantAssignment),
      toUserRoleAssignmentState(subsidiaryAssignment),
    ];

    expect(
      findUserRoleAssignment(assignments, 'ADMIN', { id: tenantId, type: 'tenant' }, tenantId),
    ).toEqual({
      id: 'assignment-tenant',
      code: 'ADMIN',
      scopeType: 'tenant',
      scopeId: null,
      inherit: true,
    });
  });

  it('does not match assignments from a different scope', () => {
    const assignments = [toUserRoleAssignmentState(tenantAssignment)];

    expect(
      findUserRoleAssignment(
        assignments,
        'ADMIN',
        { id: 'subsidiary-456', type: 'subsidiary' },
        tenantId,
      ),
    ).toBeUndefined();
  });
});
