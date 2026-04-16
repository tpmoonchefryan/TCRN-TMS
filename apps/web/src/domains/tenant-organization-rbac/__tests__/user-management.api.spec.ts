// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, expect, it } from 'vitest';

import {
  applyScopeAccessibilityChange,
  buildScopeAccessMutations,
  buildScopeNodeMap,
  buildUserManagementTabPath,
} from '@/domains/tenant-organization-rbac/api/user-management.api';
import type { SubsidiaryInfo, TalentInfo } from '@/platform/state/talent-store';

const mockOrganizationTree: SubsidiaryInfo[] = [
  {
    id: 'subsidiary-a',
    code: 'SUB_A',
    displayName: 'Subsidiary A',
    path: 'subsidiary-a',
    talents: [],
    children: [
      {
        id: 'subsidiary-b',
        code: 'SUB_B',
        displayName: 'Subsidiary B',
        parentId: 'subsidiary-a',
        path: 'subsidiary-a/subsidiary-b',
        talents: [
          {
            id: 'talent-b1',
            code: 'TALENT_B1',
            displayName: 'Talent B1',
            path: 'talent-b1',
            lifecycleStatus: 'draft',
            publishedAt: null,
          },
        ],
        children: [],
      },
    ],
  },
];

const mockDirectTalents: TalentInfo[] = [
  {
    id: 'talent-direct',
    code: 'TALENT_DIRECT',
    displayName: 'Direct Talent',
    path: 'talent-direct',
    lifecycleStatus: 'published',
    publishedAt: '2026-04-11T00:00:00.000Z',
  },
];

describe('user-management.api', () => {
  it('builds canonical tab paths for user management', () => {
    expect(
      buildUserManagementTabPath({
        tenantId: 'tenant-1',
        tab: 'users',
      }),
    ).toBe('/tenant/tenant-1/user-management');

    expect(
      buildUserManagementTabPath({
        tenantId: 'tenant-1',
        tab: 'delegation',
      }),
    ).toBe('/tenant/tenant-1/user-management?tab=delegation');
  });

  it('enables ancestor scopes and descendant scopes when includeSubunits is enabled', () => {
    const nodeMap = buildScopeNodeMap({
      tenantId: 'tenant-1',
      organizationTree: mockOrganizationTree,
      directTalents: mockDirectTalents,
    });

    const nextState = applyScopeAccessibilityChange({
      currentState: {
        'tenant-1': { enabled: true, includeSubunits: false },
      },
      nodeId: 'subsidiary-b',
      nextState: {
        enabled: true,
        includeSubunits: true,
      },
      nodeMap,
    });

    expect(nextState['tenant-1']).toEqual({ enabled: true, includeSubunits: false });
    expect(nextState['subsidiary-a']).toEqual({ enabled: true, includeSubunits: false });
    expect(nextState['subsidiary-b']).toEqual({ enabled: true, includeSubunits: true });
    expect(nextState['talent-b1']).toEqual({ enabled: true, includeSubunits: false });

    expect(
      buildScopeAccessMutations({
        accessibilityState: nextState,
        nodeMap,
        tenantId: 'tenant-1',
      }),
    ).toEqual([
      {
        scopeType: 'tenant',
        scopeId: undefined,
        includeSubunits: false,
      },
      {
        scopeType: 'subsidiary',
        scopeId: 'subsidiary-b',
        includeSubunits: true,
      },
      {
        scopeType: 'subsidiary',
        scopeId: 'subsidiary-a',
        includeSubunits: false,
      },
      {
        scopeType: 'talent',
        scopeId: 'talent-b1',
        includeSubunits: false,
      },
    ]);
  });
});
