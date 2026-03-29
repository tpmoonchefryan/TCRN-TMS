// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildOrganizationScopeOptions,
  organizationApi,
  type OrganizationTreeResponse,
} from '@/lib/api/modules/organization';

const mockGet = vi.fn();

vi.mock('@/lib/api/core', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

describe('organizationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards tree query params to the organization tree endpoint', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: {
        tenantId: 'tenant-1',
        subsidiaries: [],
        directTalents: [],
      },
    });

    await organizationApi.getTree({
      search: 'tokyo',
      includeInactive: true,
      includeTalents: false,
    });

    expect(mockGet).toHaveBeenCalledWith('/api/v1/organization/tree', {
      search: 'tokyo',
      includeInactive: true,
      includeTalents: false,
    });
  });

  it('builds subsidiary and talent scope options from the recursive organization tree', () => {
    const tree: OrganizationTreeResponse = {
      tenantId: 'tenant-1',
      subsidiaries: [
        {
          id: 'sub-1',
          code: 'TOKYO',
          displayName: 'Tokyo',
          parentId: null,
          path: '/TOKYO/',
          talents: [
            {
              id: 'talent-1',
              code: 'SORA',
              displayName: 'Sora',
              subsidiaryId: 'sub-1',
              subsidiaryName: 'Tokyo',
              path: '/TOKYO/SORA/',
              homepagePath: 'sora',
            },
          ],
          children: [
            {
              id: 'sub-2',
              code: 'GAMING',
              displayName: 'Gaming',
              parentId: 'sub-1',
              path: '/TOKYO/GAMING/',
              talents: [
                {
                  id: 'talent-2',
                  code: 'MIO',
                  displayName: 'Mio',
                  subsidiaryId: 'sub-2',
                  subsidiaryName: 'Gaming',
                  path: '/TOKYO/GAMING/MIO/',
                },
              ],
              children: [],
            },
          ],
        },
      ],
      directTalents: [
        {
          id: 'talent-3',
          code: 'DIRECT',
          displayName: 'Direct Talent',
          path: '/DIRECT/',
        },
      ],
    };

    expect(buildOrganizationScopeOptions(tree)).toEqual([
      {
        id: 'sub-1',
        type: 'subsidiary',
        label: 'Tokyo',
        path: '/TOKYO/',
      },
      {
        id: 'talent-1',
        type: 'talent',
        label: 'Tokyo / Sora',
        path: '/TOKYO/SORA/',
      },
      {
        id: 'sub-2',
        type: 'subsidiary',
        label: 'Tokyo / Gaming',
        path: '/TOKYO/GAMING/',
      },
      {
        id: 'talent-2',
        type: 'talent',
        label: 'Tokyo / Gaming / Mio',
        path: '/TOKYO/GAMING/MIO/',
      },
      {
        id: 'talent-3',
        type: 'talent',
        label: 'Direct Talent',
        path: '/DIRECT/',
      },
    ]);
  });
});
