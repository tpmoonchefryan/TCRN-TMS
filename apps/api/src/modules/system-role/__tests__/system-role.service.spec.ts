// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatabaseService } from '../../database/database.service';
import { SystemRoleService } from '../system-role.service';

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
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockTx) => Promise<unknown>) => callback(mockTx));

    const mockDatabaseService = {
      getPrisma: () => mockPrisma,
    } as unknown as DatabaseService;

    service = new SystemRoleService(mockDatabaseService);
  });

  it('returns permission effects from role policy rows', async () => {
    mockPrisma.role.findUnique.mockResolvedValue({
      id: 'role-1',
      code: 'EXPORT_MANAGER',
      nameEn: 'Export Manager',
      nameZh: '导出管理',
      nameJa: null,
      extraData: {
        translations: {
          fr: "Responsable d’export",
        },
      },
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
    expect(result?.translations).toEqual({
      en: 'Export Manager',
      zh_HANS: '导出管理',
      fr: "Responsable d’export",
    });
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

  it('builds typed list filters for system-role reads', async () => {
    mockPrisma.role.findMany.mockResolvedValue([]);
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

    await service.findAll({
      isActive: true,
      isSystem: true,
      search: 'export',
    }, 'tenant_test123');

    expect(mockPrisma.role.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          isSystem: true,
          OR: [
            { code: { contains: 'export', mode: 'insensitive' } },
            { nameEn: { contains: 'export', mode: 'insensitive' } },
            { nameZh: { contains: 'export', mode: 'insensitive' } },
            { nameJa: { contains: 'export', mode: 'insensitive' } },
          ],
        },
      }),
    );
  });

  it('overlays tenant-local user counts for role list rows', async () => {
    mockPrisma.role.findMany.mockResolvedValue([
      {
        id: 'role-1',
        code: 'EDITOR',
        isSystem: true,
        isActive: true,
        _count: {
          userRoles: 0,
          rolePolicies: 2,
        },
      },
    ]);
    mockPrisma.$queryRawUnsafe.mockResolvedValue([
      { roleId: 'role-1', userCount: BigInt(3) },
    ]);

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
        id: 'role-1',
        code: 'PLATFORM_ADMIN',
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

    expect(result.map((role) => role.code)).toEqual(['ADMIN']);
  });

  it('preserves explicit effects and defaults missing effects to grant on create', async () => {
    mockPrisma.role.findUnique.mockResolvedValue(null);
    mockTx.role.create.mockResolvedValue({ id: 'role-1' });
    mockTx.policy.findMany.mockResolvedValue([
      { id: 'policy-1', action: 'delete', resource: { code: 'customer.export' } },
      { id: 'policy-2', action: 'read', resource: { code: 'customer.export' } },
    ]);

    await service.create({
      code: 'EXPORT_MANAGER',
      nameEn: 'Export Manager',
      permissions: [
        { resource: 'customer.export', action: 'delete', effect: 'deny' },
        { resource: 'customer.export', action: 'read' },
      ],
    });

    expect(mockTx.rolePolicy.createMany).toHaveBeenCalledWith({
      data: [
        { roleId: 'role-1', policyId: 'policy-1', effect: 'deny' },
        { roleId: 'role-1', policyId: 'policy-2', effect: 'grant' },
      ],
    });
  });

  it('stores non-legacy role name translations in extraData while keeping legacy columns aligned', async () => {
    mockPrisma.role.findUnique.mockResolvedValue(null);
    mockTx.role.create.mockResolvedValue({
      id: 'role-1',
      code: 'EXPORT_MANAGER',
      nameEn: 'Export Manager',
      nameZh: '导出经理',
      nameJa: 'エクスポート管理者',
      extraData: {
        translations: {
          zh_HANT: '匯出經理',
          fr: "Responsable d’export",
        },
      },
    });
    mockTx.policy.findMany.mockResolvedValue([]);

    await service.create({
      code: 'EXPORT_MANAGER',
      nameEn: 'Export Manager',
      translations: {
        zh_HANS: '导出经理',
        zh_HANT: '匯出經理',
        ja: 'エクスポート管理者',
        fr: "Responsable d’export",
      },
    });

    expect(mockTx.role.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: 'EXPORT_MANAGER',
        nameEn: 'Export Manager',
        nameZh: '导出经理',
        nameJa: 'エクスポート管理者',
        extraData: {
          translations: {
            zh_HANT: '匯出經理',
            fr: "Responsable d’export",
          },
        },
        isSystem: true,
      }),
    });
  });

  it('fails closed when a catalog-backed permission is missing from the database policy table', async () => {
    mockPrisma.role.findUnique.mockResolvedValue(null);
    mockTx.role.create.mockResolvedValue({ id: 'role-1' });
    mockTx.policy.findMany.mockResolvedValue([
      { id: 'policy-1', action: 'read', resource: { code: 'customer.export' } },
    ]);

    await expect(service.create({
      code: 'EXPORT_MANAGER',
      nameEn: 'Export Manager',
      permissions: [
        { resource: 'customer.export', action: 'read' },
        { resource: 'customer.export', action: 'delete' },
      ],
    })).rejects.toThrow(
      'RBAC policy customer.export:delete is missing from the database contract',
    );

    expect(mockTx.rolePolicy.createMany).not.toHaveBeenCalled();
  });
});
