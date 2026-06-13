// SPDX-License-Identifier: Apache-2.0
import type { Request } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { OrganizationController } from '../organization.controller';
import type { OrganizationService, OrganizationTree } from '../organization.service';

describe('OrganizationController', () => {
  let controller: OrganizationController;
  let mockOrganizationService: Pick<OrganizationService, 'getTree'>;
  let mockPermissionSnapshotService: {
    checkPermission: ReturnType<typeof vi.fn>;
    refreshAndCheckPermission: ReturnType<typeof vi.fn>;
  };

  const user: AuthenticatedUser = {
    id: 'user-1',
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    email: 'user@example.com',
    username: 'user',
  };

  const organizationTree: OrganizationTree = {
    tenant: {
      id: 'tenant-1',
      code: 'TENANT',
      name: 'Tenant',
    },
    tree: [
      {
        id: 'sub-1',
        type: 'subsidiary',
        code: 'TOKYO',
        name: 'Tokyo',
        path: '/TOKYO/',
        depth: 1,
        isActive: true,
        talentCount: 1,
        talents: [
          {
            id: 'talent-1',
            code: 'SORA',
            name: 'Sora',
            displayName: 'Sora',
            avatarUrl: 'https://example.com/avatar.png',
            homepagePath: 'sora',
            lifecycleStatus: 'published',
            publishedAt: new Date('2026-04-11T00:00:00.000Z'),
            isActive: true,
          },
        ],
        children: [
          {
            id: 'sub-2',
            type: 'subsidiary',
            code: 'GAMING',
            name: 'Gaming',
            path: '/TOKYO/GAMING/',
            depth: 2,
            isActive: true,
            talentCount: 0,
            children: [],
          },
        ],
      },
    ],
    talentsWithoutSubsidiary: [
      {
        id: 'talent-2',
        code: 'DIRECT',
        name: 'Direct Talent',
        displayName: 'Direct Talent',
        avatarUrl: null,
        homepagePath: null,
        lifecycleStatus: 'draft',
        publishedAt: null,
        isActive: false,
      },
    ],
  };

  beforeEach(() => {
    mockOrganizationService = {
      getTree: vi.fn(),
    };
    mockPermissionSnapshotService = {
      checkPermission: vi.fn().mockResolvedValue(true),
      refreshAndCheckPermission: vi.fn(),
    };

    controller = new OrganizationController(
      mockOrganizationService as OrganizationService,
      mockPermissionSnapshotService as never
    );
  });

  it('maps the recursive organization tree into the frontend response contract', async () => {
    (mockOrganizationService.getTree as ReturnType<typeof vi.fn>).mockResolvedValue(
      organizationTree
    );

    const result = await controller.getTree(user, {}, {
      headers: {
        'accept-language': 'zh-CN,zh;q=0.9',
      },
    } as Request);

    expect(mockOrganizationService.getTree).toHaveBeenCalledWith('tenant-1', 'tenant_test', {
      includeTalents: true,
      includeInactive: false,
      search: undefined,
      language: 'zh-CN',
      userId: 'user-1',
    });

    expect(result).toEqual({
      success: true,
      data: {
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
                name: 'Sora',
                displayName: 'Sora',
                avatarUrl: 'https://example.com/avatar.png',
                subsidiaryId: 'sub-1',
                subsidiaryName: 'Tokyo',
                path: '/TOKYO/SORA/',
                homepagePath: 'sora',
                lifecycleStatus: 'published',
                publishedAt: '2026-04-11T00:00:00.000Z',
                isActive: true,
                lifecycleMaintenance: {
                  canManage: true,
                },
              },
            ],
            children: [
              {
                id: 'sub-2',
                code: 'GAMING',
                displayName: 'Gaming',
                parentId: 'sub-1',
                path: '/TOKYO/GAMING/',
                talents: [],
                children: [],
              },
            ],
          },
        ],
        directTalents: [
          {
            id: 'talent-2',
            code: 'DIRECT',
            name: 'Direct Talent',
            displayName: 'Direct Talent',
            avatarUrl: null,
            subsidiaryId: null,
            path: '/DIRECT/',
            homepagePath: null,
            lifecycleStatus: 'draft',
            publishedAt: null,
            isActive: false,
            lifecycleMaintenance: {
              canManage: true,
            },
          },
        ],
      },
    });

    expect(mockPermissionSnapshotService.checkPermission).toHaveBeenCalledWith(
      'tenant_test',
      'user-1',
      'talent',
      'write',
      'tenant',
      null
    );
    expect(mockPermissionSnapshotService.refreshAndCheckPermission).not.toHaveBeenCalled();
  });
});
