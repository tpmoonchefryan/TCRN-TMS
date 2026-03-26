// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { RbacScopeType, UserRoleAssignmentRecord } from '@tcrn/shared';

export interface UserRoleAssignmentState {
  id: string;
  code: string;
  scopeType: RbacScopeType;
  scopeId: string | null;
  inherit: boolean;
}

export interface RoleScopeSelection {
  id: string;
  type: RbacScopeType;
}

export function getRbacScopeKey(
  scopeType: RbacScopeType,
  scopeId: string | null | undefined,
  tenantId: string,
): string | null {
  if (scopeType === 'tenant') {
    return tenantId;
  }

  return scopeId ?? null;
}

export function toUserRoleAssignmentState(
  assignment: UserRoleAssignmentRecord,
): UserRoleAssignmentState {
  return {
    id: assignment.id,
    code: assignment.role.code,
    scopeType: assignment.scopeType,
    scopeId: assignment.scopeId,
    inherit: assignment.inherit,
  };
}

export function findUserRoleAssignment(
  assignments: UserRoleAssignmentState[],
  roleCode: string,
  scope: RoleScopeSelection,
  tenantId: string,
): UserRoleAssignmentState | undefined {
  const selectedScopeKey = getRbacScopeKey(scope.type, scope.id, tenantId);

  return assignments.find(
    (assignment) =>
      assignment.code === roleCode &&
      getRbacScopeKey(assignment.scopeType, assignment.scopeId, tenantId) === selectedScopeKey,
  );
}
