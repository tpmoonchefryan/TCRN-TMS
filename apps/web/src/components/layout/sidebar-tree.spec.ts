import { describe, expect, it } from 'vitest';

import { buildSidebarTree, getSidebarHref } from './sidebar-tree';

describe('sidebar-tree', () => {
  it('builds a tenant root with recursive subsidiary and talent children', () => {
    const tree = buildSidebarTree(
      [
        {
          id: 'sub-1',
          code: 'sub-1',
          displayName: 'Subsidiary 1',
          path: '/sub-1',
          talents: [
            {
              id: 'tal-1',
              code: 'tal-1',
              displayName: 'Talent 1',
              path: '/sub-1/tal-1',
              lifecycleStatus: 'published',
            },
          ],
          children: [
            {
              id: 'sub-2',
              code: 'sub-2',
              displayName: 'Subsidiary 2',
              path: '/sub-1/sub-2',
              talents: [],
              children: [],
            },
          ],
        },
      ],
      'tenant-1'
    );

    expect(tree).toEqual([
      {
        id: 'tenant-1',
        name: 'Tenant',
        type: 'tenant',
        children: [
          {
            id: 'sub-1',
            name: 'Subsidiary 1',
            type: 'subsidiary',
            children: [
              {
                id: 'sub-2',
                name: 'Subsidiary 2',
                type: 'subsidiary',
                children: [],
              },
              {
                id: 'tal-1',
                name: 'Talent 1',
                type: 'talent',
                children: [],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('returns the current sidebar hrefs for tenant, subsidiary, and talent nodes', () => {
    expect(getSidebarHref({ id: 'tenant-1', name: 'Tenant', type: 'tenant', children: [] })).toBe(
      '/organization'
    );
    expect(
      getSidebarHref({ id: 'sub-1', name: 'Subsidiary', type: 'subsidiary', children: [] })
    ).toBe('/organization/subsidiaries/sub-1');
    expect(getSidebarHref({ id: 'tal-1', name: 'Talent', type: 'talent', children: [] })).toBe(
      '/organization/talents/tal-1'
    );
  });
});
