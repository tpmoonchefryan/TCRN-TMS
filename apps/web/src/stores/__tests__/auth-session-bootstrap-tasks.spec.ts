// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { EffectivePermissionMap } from '@tcrn/shared';
import { describe, expect, it, vi } from 'vitest';

import {
  fetchAccessibleTalentsForSession,
  fetchPermissionSnapshotForSession,
  type SessionBootstrapPermissionStore,
  type SessionBootstrapTalentStore,
} from '../auth-session-bootstrap-tasks';
import type { PermissionScope } from '../auth-store.types';
import type { SubsidiaryInfo, TalentInfo } from '../talent-store';

interface MockTalentStore extends SessionBootstrapTalentStore {
  accessibleTalents: TalentInfo[];
  directTalents: TalentInfo[];
  organizationTree: SubsidiaryInfo[];
  currentTenantId: string | null;
  currentTenantCode: string | null;
  hasFetched: boolean;
  fetchError: string | null;
}

interface MockPermissionStore extends SessionBootstrapPermissionStore {
  effectivePermissions: EffectivePermissionMap | null;
  currentScope: PermissionScope | null;
}

const createTalent = (overrides?: Partial<TalentInfo>): TalentInfo => ({
  id: 'talent-1',
  code: 'TALENT_1',
  displayName: 'Talent 1',
  path: '/talents/talent-1',
  ...overrides,
});

const createSubsidiary = (overrides?: Partial<SubsidiaryInfo>): SubsidiaryInfo => ({
  id: 'subsidiary-1',
  code: 'SUB_1',
  displayName: 'Subsidiary 1',
  path: '/subsidiary-1',
  talents: [],
  children: [],
  ...overrides,
});

const createTalentStore = (): MockTalentStore => {
  const store: MockTalentStore = {
    isLoading: false,
    currentTalent: null,
    accessibleTalents: [],
    directTalents: [],
    organizationTree: [],
    currentTenantId: null,
    currentTenantCode: null,
    hasFetched: false,
    fetchError: 'stale error',
    setOrganizationTree: (tree) => {
      store.organizationTree = tree;
    },
    setDirectTalents: (talents) => {
      store.directTalents = talents;
    },
    setAccessibleTalents: (talents) => {
      store.accessibleTalents = talents;
    },
    setCurrentTalent: (talent) => {
      store.currentTalent = talent;
    },
    setCurrentTenant: (tenantId, tenantCode) => {
      store.currentTenantId = tenantId;
      store.currentTenantCode = tenantCode;
    },
    setIsLoading: (loading) => {
      store.isLoading = loading;
    },
    setHasFetched: (state) => {
      store.hasFetched = state;
    },
    setFetchError: (error) => {
      store.fetchError = error;
    },
  };

  return store;
};

const createPermissionStore = (): MockPermissionStore => {
  const store: MockPermissionStore = {
    effectivePermissions: { 'legacy.permission': 'grant' },
    currentScope: { scopeType: 'TENANT', scopeId: 'tenant-legacy' },
    applyPermissionSnapshot: (permissions, scope) => {
      store.effectivePermissions = permissions;
      store.currentScope = scope;
    },
    clearPermissionSnapshot: () => {
      store.effectivePermissions = null;
      store.currentScope = null;
    },
  };

  return store;
};

describe('auth-session-bootstrap-tasks', () => {
  it('populates accessible talent state and auto-selects the only talent', async () => {
    const directTalent = createTalent();
    const talentStore = createTalentStore();
    const organizationClient = {
      getTree: vi.fn().mockResolvedValue({
        success: true,
        data: {
          tenantId: 'tenant-live',
          subsidiaries: [createSubsidiary()],
          directTalents: [directTalent],
        },
      }),
    };

    await expect(
      fetchAccessibleTalentsForSession({
        talentStore,
        getTenantCode: () => 'TENANT_A',
        organizationClient,
      })
    ).resolves.toEqual({ success: true });

    expect(organizationClient.getTree).toHaveBeenCalledTimes(1);
    expect(talentStore.fetchError).toBeNull();
    expect(talentStore.hasFetched).toBe(true);
    expect(talentStore.isLoading).toBe(false);
    expect(talentStore.organizationTree).toHaveLength(1);
    expect(talentStore.directTalents).toEqual([directTalent]);
    expect(talentStore.accessibleTalents).toEqual([directTalent]);
    expect(talentStore.currentTenantId).toBe('tenant-live');
    expect(talentStore.currentTenantCode).toBe('TENANT_A');
    expect(talentStore.currentTalent).toEqual(directTalent);
  });

  it('returns the organization error and records it on the talent store', async () => {
    const talentStore = createTalentStore();
    const organizationClient = {
      getTree: vi.fn().mockResolvedValue({
        success: false,
        error: { message: 'tree unavailable' },
      }),
    };

    await expect(
      fetchAccessibleTalentsForSession({
        talentStore,
        getTenantCode: () => 'TENANT_A',
        organizationClient,
      })
    ).resolves.toEqual({
      success: false,
      error: 'tree unavailable',
    });

    expect(talentStore.fetchError).toBe('tree unavailable');
    expect(talentStore.hasFetched).toBe(true);
    expect(talentStore.isLoading).toBe(false);
    expect(talentStore.accessibleTalents).toEqual([]);
    expect(talentStore.currentTalent).toBeNull();
  });

  it('writes the permission snapshot and defaults to GLOBAL scope', async () => {
    const permissionStore = createPermissionStore();
    const permissions: EffectivePermissionMap = { 'customer.profile:read': 'grant' };
    const permissionClient = {
      getMyPermissions: vi.fn().mockResolvedValue({
        success: true,
        data: {
          userId: 'user-1',
          scope: { type: 'GLOBAL', id: null, name: null },
          permissions,
          roles: [],
        },
      }),
    };

    await expect(
      fetchPermissionSnapshotForSession({
        permissionStore,
        permissionClient,
      })
    ).resolves.toEqual({ success: true });

    expect(permissionClient.getMyPermissions).toHaveBeenCalledWith({
      scopeType: undefined,
      scopeId: undefined,
    });
    expect(permissionStore.effectivePermissions).toEqual(permissions);
    expect(permissionStore.currentScope).toEqual({ scopeType: 'GLOBAL' });
  });

  it('fails closed when permission bootstrap throws', async () => {
    const permissionStore = createPermissionStore();
    const warn = vi.fn();
    const permissionClient = {
      getMyPermissions: vi.fn().mockRejectedValue(new Error('offline')),
    };

    await expect(
      fetchPermissionSnapshotForSession({
        scope: { scopeType: 'TENANT', scopeId: 'tenant-live' },
        permissionStore,
        permissionClient,
        warn,
      })
    ).resolves.toEqual({
      success: false,
      error: 'Failed to fetch permission snapshot',
    });

    expect(permissionStore.effectivePermissions).toBeNull();
    expect(permissionStore.currentScope).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      'Failed to fetch permissions from backend; permission checks will fail closed'
    );
  });
});
