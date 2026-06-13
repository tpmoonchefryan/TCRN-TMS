// SPDX-License-Identifier: Apache-2.0
import { GoneException, MethodNotAllowedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatabaseService } from '../../database/database.service';
import { SystemRoleService } from '../system-role.service';

const roleName = {
  en: 'Export Manager',
  zh_HANS: '导出管理',
  zh_HANT: '匯出管理',
  ja: 'エクスポート管理者',
  ko: '내보내기 관리자',
  fr: "Responsable d'export",
};

describe('SystemRoleService', () => {
  const mockTx = {
    role: {
      create: vi.fn(),
      update: vi.fn(),
    },
    policy: {
      findMany: vi.fn(),
    },
    rolePolicy: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  const mockPrisma = {
    role: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
    $transaction: vi.fn(),
  };

  let service: SystemRoleService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockTx) => Promise<unknown>) => callback(mockTx)
    );

    const mockDatabaseService = {
      getPrisma: () => mockPrisma,
    } as unknown as DatabaseService;

    service = new SystemRoleService(mockDatabaseService);
  });

  it('returns permission effects from role policy rows', async () => {
    mockPrisma.role.findUnique.mockResolvedValue({
      id: 'role-1',
      code: 'EXPORT_MANAGER',
      name: roleName,
      rolePolicies: [
        {
          effect: 'deny',
          policy: {
            action: 'delete',
            resource: { code: 'customer.export' },
          },
        },
      ],
    });
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([
        {
          scopeType: 'talent',
          scopeId: 'talent-1',
          scopeName: 'Tokino Sora',
          scopePath: '/TOKYO/SORA',
          assignmentCount: 2,
          userCount: 2,
          inheritedAssignmentCount: 1,
        },
      ])
      .mockResolvedValueOnce([
        {
          assignmentId: 'assignment-1',
          userId: 'user-1',
          username: 'alice',
          email: 'alice@example.com',
          displayName: 'Alice',
          avatarUrl: null,
          isActive: true,
          scopeType: 'talent',
          scopeId: 'talent-1',
          scopeName: 'Tokino Sora',
          scopePath: '/TOKYO/SORA',
          inherit: false,
          grantedAt: new Date('2026-04-17T08:00:00.000Z'),
          expiresAt: null,
        },
      ]);

    const result = await service.findOne('role-1', 'tenant_test123');

    expect(result?.permissions).toEqual([
      { resource: 'customer.export', action: 'delete', effect: 'deny' },
    ]);
    expect(result?.name).toEqual(roleName);
    expect(result?.scopeBindings).toEqual([
      expect.objectContaining({
        scopeType: 'talent',
        userCount: 2,
      }),
    ]);
    expect(result?.assignedUsers).toEqual([
      expect.objectContaining({
        username: 'alice',
        scopeName: 'Tokino Sora',
      }),
    ]);
  });

  it('builds typed list filters for system-role reads without role status filtering', async () => {
    mockPrisma.role.findMany.mockResolvedValue([]);
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

    await service.findAll(
      {
        isSystem: true,
        search: 'export',
      },
      'tenant_test123'
    );

    expect(mockPrisma.role.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isSystem: true,
          OR: [
            { code: { contains: 'export', mode: 'insensitive' } },
            { name: { path: ['en'], string_contains: 'export' } },
            { name: { path: ['zh_HANS'], string_contains: 'export' } },
            { name: { path: ['zh_HANT'], string_contains: 'export' } },
            { name: { path: ['ja'], string_contains: 'export' } },
            { name: { path: ['ko'], string_contains: 'export' } },
            { name: { path: ['fr'], string_contains: 'export' } },
          ],
        },
      })
    );
  });

  it('overlays tenant-local user counts for role list rows', async () => {
    mockPrisma.role.findMany.mockResolvedValue([
      {
        id: 'role-1',
        code: 'EDITOR',
        name: roleName,
        isSystem: true,
        isActive: true,
        _count: {
          userRoles: 0,
          rolePolicies: 2,
        },
      },
    ]);
    mockPrisma.$queryRawUnsafe.mockResolvedValue([{ roleId: 'role-1', userCount: BigInt(3) }]);

    const result = await service.findAll({}, 'tenant_test123');

    expect(result).toEqual([
      expect.objectContaining({
        id: 'role-1',
        permissionCount: 2,
        userCount: 3,
      }),
    ]);
  });

  it('filters workspace-incompatible roles from the list', async () => {
    mockPrisma.role.findMany.mockResolvedValue([
      {
        id: 'role-0',
        code: 'INITIAL_ADMIN',
        name: roleName,
        isSystem: true,
        isActive: true,
        _count: {
          userRoles: 0,
          rolePolicies: 1,
        },
      },
      {
        id: 'role-1',
        code: 'PLATFORM_ADMIN',
        name: roleName,
        isSystem: true,
        isActive: true,
        _count: {
          userRoles: 0,
          rolePolicies: 1,
        },
      },
      {
        id: 'role-2',
        code: 'ADMIN',
        name: roleName,
        isSystem: true,
        isActive: true,
        _count: {
          userRoles: 0,
          rolePolicies: 1,
        },
      },
    ]);
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

    const result = await service.findAll({}, 'tenant_test123', 'standard');

    expect(result.map((role) => role.code)).toEqual(['INITIAL_ADMIN']);
  });

  it('returns Gone for deprecated system-role creation', async () => {
    await expect(
      service.create({
        code: 'EXPORT_MANAGER',
        name: roleName,
        permissions: [
          { resource: 'customer.export', action: 'delete', effect: 'deny' },
          { resource: 'customer.export', action: 'read' },
        ],
      })
    ).rejects.toThrow(GoneException);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockTx.role.create).not.toHaveBeenCalled();
    expect(mockTx.rolePolicy.createMany).not.toHaveBeenCalled();
  });

  it('returns Gone for deprecated system-role updates', async () => {
    await expect(service.update('role-1', { compatibilityOnly: true })).rejects.toThrow(
      GoneException
    );

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockTx.role.update).not.toHaveBeenCalled();
  });

  it('returns MethodNotAllowed for system-role deletion', async () => {
    await expect(service.remove('role-1')).rejects.toThrow(MethodNotAllowedException);

    expect(mockPrisma.role.delete).not.toHaveBeenCalled();
  });
});
