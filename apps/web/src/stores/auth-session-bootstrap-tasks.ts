// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { EffectivePermissionMap } from '@tcrn/shared';

import {
  organizationApi,
  type OrganizationTreeSubsidiaryRecord,
} from '@/lib/api/modules/organization';
import { permissionApi } from '@/lib/api/modules/permission';

import type { SessionBootstrapTaskResult } from './auth-session-bootstrap';
import type { PermissionScope } from './auth-store.types';
import type { SubsidiaryInfo, TalentInfo } from './talent-store';

export interface SessionBootstrapTalentStore {
  isLoading: boolean;
  currentTalent: TalentInfo | null;
  setOrganizationTree: (tree: SubsidiaryInfo[]) => void;
  setDirectTalents: (talents: TalentInfo[]) => void;
  setAccessibleTalents: (talents: TalentInfo[]) => void;
  setCurrentTalent: (talent: TalentInfo | null) => void;
  setCurrentTenant: (tenantId: string, tenantCode: string) => void;
  setIsLoading: (loading: boolean) => void;
  setHasFetched: (state: boolean) => void;
  setFetchError: (error: string | null) => void;
}

export interface SessionBootstrapPermissionStore {
  applyPermissionSnapshot: (
    permissions: EffectivePermissionMap,
    scope: PermissionScope
  ) => void;
  clearPermissionSnapshot: () => void;
}

const collectAccessibleTalents = (
  subsidiaries: OrganizationTreeSubsidiaryRecord[]
): TalentInfo[] => {
  const talents: TalentInfo[] = [];

  const visit = (nodes: OrganizationTreeSubsidiaryRecord[]) => {
    for (const subsidiary of nodes) {
      talents.push(...subsidiary.talents);
      visit(subsidiary.children);
    }
  };

  visit(subsidiaries);

  return talents;
};

export const fetchAccessibleTalentsForSession = async (params: {
  talentStore: SessionBootstrapTalentStore;
  getTenantCode: () => string | null;
  organizationClient?: Pick<typeof organizationApi, 'getTree'>;
}): Promise<SessionBootstrapTaskResult> => {
  const { talentStore, getTenantCode, organizationClient = organizationApi } = params;

  if (talentStore.isLoading) {
    return { success: true };
  }

  try {
    talentStore.setIsLoading(true);
    talentStore.setFetchError(null);

    const orgResponse = await organizationClient.getTree();

    if (orgResponse.success && orgResponse.data) {
      const { subsidiaries = [], directTalents = [], tenantId } = orgResponse.data;
      const allTalents = [...collectAccessibleTalents(subsidiaries), ...directTalents];

      talentStore.setOrganizationTree(subsidiaries);
      talentStore.setDirectTalents(directTalents);
      talentStore.setAccessibleTalents(allTalents);

      if (tenantId) {
        talentStore.setCurrentTenant(tenantId, getTenantCode() || '');
      }

      if (allTalents.length === 1 && !talentStore.currentTalent) {
        talentStore.setCurrentTalent(allTalents[0]);
      }

      return { success: true };
    }

    const error = orgResponse.error?.message || 'Failed to load organization';
    talentStore.setFetchError(error);
    return { success: false, error };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load organization';
    talentStore.setFetchError(message);
    return { success: false, error: message };
  } finally {
    talentStore.setIsLoading(false);
    talentStore.setHasFetched(true);
  }
};

export const fetchPermissionSnapshotForSession = async (params: {
  scope?: PermissionScope;
  permissionStore: SessionBootstrapPermissionStore;
  permissionClient?: Pick<typeof permissionApi, 'getMyPermissions'>;
  warn?: (message: string) => void;
}): Promise<SessionBootstrapTaskResult> => {
  const {
    scope,
    permissionStore,
    permissionClient = permissionApi,
    warn = console.warn,
  } = params;

  try {
    const response = await permissionClient.getMyPermissions({
      scopeType: scope?.scopeType,
      scopeId: scope?.scopeId,
    });

    if (response.success && response.data) {
      permissionStore.applyPermissionSnapshot(
        response.data.permissions,
        scope || { scopeType: 'GLOBAL' }
      );
      return { success: true };
    }

    permissionStore.clearPermissionSnapshot();
    return {
      success: false,
      error: response.error?.message || 'Failed to fetch permission snapshot',
    };
  } catch {
    permissionStore.clearPermissionSnapshot();
    warn('Failed to fetch permissions from backend; permission checks will fail closed');
    return {
      success: false,
      error: 'Failed to fetch permission snapshot',
    };
  }
};
