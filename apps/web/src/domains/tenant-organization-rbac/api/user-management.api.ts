// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { RbacScopeType } from '@tcrn/shared';

import {
  type CreateSystemUserPayload,
  systemRoleApi,
  systemUserApi,
  type SystemUserListItem,
  type SystemUserListQuery,
  type SystemUserScopeAccessMutation,
  type UpdateSystemUserPayload,
  userRoleApi,
} from '@/lib/api/modules/user-management';
import type { SubsidiaryInfo, TalentInfo } from '@/platform/state/talent-store';

export interface ScopeAccessibilityState {
  enabled: boolean;
  includeSubunits?: boolean;
}

interface ScopeNodeMapEntry {
  parentId: string | null;
  type: RbacScopeType;
  childIds: string[];
}

export const userManagementDomainApi = {
  listUsers: (query?: SystemUserListQuery) => systemUserApi.list(query),

  getUser: (userId: string) => systemUserApi.get(userId),

  createUser: (payload: CreateSystemUserPayload) => systemUserApi.create(payload),

  updateUser: (userId: string, payload: UpdateSystemUserPayload) =>
    systemUserApi.update(userId, payload),

  resetPassword: (
    userId: string,
    payload?: { newPassword?: string; forceReset?: boolean },
  ) => systemUserApi.resetPassword(userId, payload),

  deactivateUser: (userId: string) => systemUserApi.deactivate(userId),

  reactivateUser: (userId: string) => systemUserApi.reactivate(userId),

  listRoles: (params?: { isActive?: boolean; isSystem?: boolean; search?: string }) =>
    systemRoleApi.list(params),

  getRole: (roleId: string) => systemRoleApi.get(roleId),

  createRole: (payload: Parameters<typeof systemRoleApi.create>[0]) => systemRoleApi.create(payload),

  updateRole: (roleId: string, payload: Parameters<typeof systemRoleApi.update>[1]) =>
    systemRoleApi.update(roleId, payload),

  deleteRole: (roleId: string) => systemRoleApi.delete(roleId),

  getUserRoles: (userId: string) => userRoleApi.getUserRoles(userId),

  assignRole: (userId: string, payload: Parameters<typeof userRoleApi.assignRole>[1]) =>
    userRoleApi.assignRole(userId, payload),

  removeRole: (userId: string, assignmentId: string) => userRoleApi.removeRole(userId, assignmentId),

  updateRoleInherit: (userId: string, assignmentId: string, inherit: boolean) =>
    userRoleApi.updateRoleInherit(userId, assignmentId, inherit),

  getScopeAccess: (userId: string) => systemUserApi.getScopeAccess(userId),

  saveScopeAccess: (userId: string, accesses: SystemUserScopeAccessMutation[]) =>
    systemUserApi.setScopeAccess(userId, accesses),
};

export function buildUserManagementTabPath(params: {
  tenantId: string;
  tab: 'users' | 'roles' | 'delegation';
}): string {
  const { tab, tenantId } = params;

  if (tab === 'users') {
    return `/tenant/${tenantId}/user-management`;
  }

  return `/tenant/${tenantId}/user-management?tab=${tab}`;
}

export function buildScopeNodeMap(params: {
  tenantId: string;
  organizationTree: SubsidiaryInfo[];
  directTalents: TalentInfo[];
}): Record<string, ScopeNodeMapEntry> {
  const { directTalents, organizationTree, tenantId } = params;
  const nodeMap: Record<string, ScopeNodeMapEntry> = {
    [tenantId]: {
      parentId: null,
      type: 'tenant',
      childIds: [],
    },
  };

  const processSubsidiary = (subsidiary: SubsidiaryInfo, parentId: string) => {
    nodeMap[subsidiary.id] = {
      parentId,
      type: 'subsidiary',
      childIds: [],
    };
    nodeMap[parentId]?.childIds.push(subsidiary.id);

    for (const child of subsidiary.children) {
      processSubsidiary(child, subsidiary.id);
    }

    for (const talent of subsidiary.talents) {
      nodeMap[talent.id] = {
        parentId: subsidiary.id,
        type: 'talent',
        childIds: [],
      };
      nodeMap[subsidiary.id]?.childIds.push(talent.id);
    }
  };

  for (const subsidiary of organizationTree) {
    processSubsidiary(subsidiary, tenantId);
  }

  for (const talent of directTalents) {
    nodeMap[talent.id] = {
      parentId: tenantId,
      type: 'talent',
      childIds: [],
    };
    nodeMap[tenantId]?.childIds.push(talent.id);
  }

  return nodeMap;
}

export function getAncestorScopeIds(
  nodeId: string,
  nodeMap: Record<string, ScopeNodeMapEntry>,
): string[] {
  const ancestors: string[] = [];
  let currentId = nodeMap[nodeId]?.parentId;

  while (currentId) {
    const currentNode = nodeMap[currentId];
    if (currentNode && currentNode.type !== 'talent') {
      ancestors.push(currentId);
    }
    currentId = currentNode?.parentId ?? null;
  }

  return ancestors;
}

export function getDescendantScopeIds(
  nodeId: string,
  nodeMap: Record<string, ScopeNodeMapEntry>,
): string[] {
  const descendants: string[] = [];
  const queue = [...(nodeMap[nodeId]?.childIds || [])];

  while (queue.length > 0) {
    const nextId = queue.shift();
    if (!nextId) {
      continue;
    }

    descendants.push(nextId);
    queue.push(...(nodeMap[nextId]?.childIds || []));
  }

  return descendants;
}

export function applyScopeAccessibilityChange(params: {
  currentState: Record<string, ScopeAccessibilityState>;
  nodeId: string;
  nextState: ScopeAccessibilityState;
  nodeMap: Record<string, ScopeNodeMapEntry>;
}): Record<string, ScopeAccessibilityState> {
  const { currentState, nextState, nodeId, nodeMap } = params;
  const updatedState = { ...currentState };
  const previousState = currentState[nodeId];
  const wasEnabled = previousState?.enabled ?? false;
  const wasIncludeSubunits = previousState?.includeSubunits ?? false;
  const isEnabled = nextState.enabled;
  const includeSubunits = nextState.includeSubunits ?? false;

  updatedState[nodeId] = nextState;

  if (!wasEnabled && isEnabled) {
    for (const ancestorId of getAncestorScopeIds(nodeId, nodeMap)) {
      if (!updatedState[ancestorId]?.enabled) {
        updatedState[ancestorId] = {
          enabled: true,
          includeSubunits: updatedState[ancestorId]?.includeSubunits ?? false,
        };
      }
    }
  }

  if (isEnabled && !wasIncludeSubunits && includeSubunits) {
    for (const descendantId of getDescendantScopeIds(nodeId, nodeMap)) {
      updatedState[descendantId] = {
        enabled: true,
        includeSubunits: updatedState[descendantId]?.includeSubunits ?? false,
      };
    }
  }

  if (wasEnabled && !isEnabled) {
    updatedState[nodeId] = {
      enabled: false,
      includeSubunits: false,
    };
  }

  return updatedState;
}

export function buildScopeAccessMutations(params: {
  accessibilityState: Record<string, ScopeAccessibilityState>;
  nodeMap: Record<string, ScopeNodeMapEntry>;
  tenantId: string;
}): SystemUserScopeAccessMutation[] {
  const { accessibilityState, nodeMap, tenantId } = params;
  const accesses: SystemUserScopeAccessMutation[] = [];

  for (const [nodeId, nodeState] of Object.entries(accessibilityState)) {
    if (!nodeState.enabled) {
      continue;
    }

    const scopeType: RbacScopeType | null =
      nodeId === tenantId ? 'tenant' : (nodeMap[nodeId]?.type ?? null);

    if (!scopeType) {
      continue;
    }

    accesses.push({
      scopeType,
      scopeId: scopeType === 'tenant' ? undefined : nodeId,
      includeSubunits: nodeState.includeSubunits ?? false,
    });
  }

  return accesses;
}

export type { SystemUserListItem };
