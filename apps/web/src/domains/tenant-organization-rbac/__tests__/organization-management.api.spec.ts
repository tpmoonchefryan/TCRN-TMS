// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, expect, it } from 'vitest';

import {
  buildOrganizationNodeRoute,
  flattenOrganizationSubsidiaries,
} from '@/domains/tenant-organization-rbac/api/organization-management.api';
import type { SubsidiaryInfo } from '@/platform/state/talent-store';

const mockSubsidiaries: SubsidiaryInfo[] = [
  {
    id: 'subsidiary-root',
    code: 'ROOT',
    displayName: 'Root Subsidiary',
    path: 'root',
    talents: [],
    children: [
      {
        id: 'subsidiary-child',
        code: 'CHILD',
        displayName: 'Child Subsidiary',
        path: 'root/child',
        parentId: 'subsidiary-root',
        talents: [
          {
            id: 'talent-nested',
            code: 'TALENT_NESTED',
            displayName: 'Nested Talent',
            path: 'nested-talent',
            lifecycleStatus: 'published',
            publishedAt: '2026-04-11T00:00:00.000Z',
          },
        ],
        children: [],
      },
    ],
  },
];

describe('organization-management.api', () => {
  it('flattens subsidiary options with hierarchy indentation', () => {
    expect(flattenOrganizationSubsidiaries(mockSubsidiaries)).toEqual([
      { id: 'subsidiary-root', displayName: 'Root Subsidiary' },
      { id: 'subsidiary-child', displayName: '  Child Subsidiary' },
    ]);
  });

  it('builds nested talent routes when the talent belongs to a subsidiary', () => {
    expect(
      buildOrganizationNodeRoute({
        tenantId: 'tenant-1',
        node: {
          id: 'talent-nested',
          type: 'talent',
        },
        action: 'settings',
        subsidiaries: mockSubsidiaries,
      }),
    ).toBe('/tenant/tenant-1/subsidiary/subsidiary-child/talent/talent-nested/settings');
  });

  it('builds direct talent routes when the talent has no subsidiary parent', () => {
    expect(
      buildOrganizationNodeRoute({
        tenantId: 'tenant-1',
        node: {
          id: 'talent-direct',
          type: 'talent',
        },
        action: 'details',
        subsidiaries: mockSubsidiaries,
      }),
    ).toBe('/tenant/tenant-1/talent/talent-direct/details');
  });
});
