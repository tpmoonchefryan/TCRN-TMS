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

    const result = await service.findOne('role-1');

    expect(result?.permissions).toEqual([
      { resource: 'customer.export', action: 'delete', effect: 'deny' },
    ]);
  });

  it('builds typed list filters for system-role reads', async () => {
    mockPrisma.role.findMany.mockResolvedValue([]);

    await service.findAll({
      isActive: true,
      isSystem: true,
      search: 'export',
    });

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
