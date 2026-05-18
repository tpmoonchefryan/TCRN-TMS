// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { prisma } from '@tcrn/database';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tcrn/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
  },
}));

import { PermissionService } from '../permission.service';

const mockPrisma = prisma as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
};

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PermissionService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists discrete permission definitions without querying removed policy effect columns', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      {
        id: 'perm-1',
        resourceCode: 'customer.profile',
        action: 'read',
        description: 'Read customer profiles',
        isActive: true,
        createdAt: new Date('2026-03-27T00:00:00.000Z'),
        updatedAt: new Date('2026-03-27T00:00:00.000Z'),
      },
    ]);

    const result = await service.list('tenant_test', {
      resourceCode: 'customer.profile',
      action: 'read',
      isActive: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'perm-1',
      resourceCode: 'customer.profile',
      action: 'read',
      isActive: true,
    });

    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.not.stringContaining('p.effect'),
      'customer.profile',
      'read',
      true,
    );
  });

  it('finds a permission definition by id without selecting removed effect metadata', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      {
        id: 'perm-1',
        resourceCode: 'customer.profile',
        action: 'read',
        description: null,
        isActive: true,
        createdAt: new Date('2026-03-27T00:00:00.000Z'),
        updatedAt: new Date('2026-03-27T00:00:00.000Z'),
      },
    ]);

    const result = await service.findById('perm-1', 'tenant_test');

    expect(result?.id).toBe('perm-1');
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.not.stringContaining('p.effect'),
      'perm-1',
    );
  });

  it('returns only catalog-backed resource definitions for the UI contract', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      {
        code: 'customer.export',
        module: 'customer',
        actions: 'read,write,delete',
      },
      {
        code: 'legacy.unknown',
        module: 'legacy',
        actions: 'read',
      },
    ]);

    const result = await service.getResourceDefinitions('tenant_test', 'en');

    expect(result).toEqual([
      {
        module: 'customer',
        moduleName: 'Customer',
        resources: [
          {
            code: 'customer.export',
            name: 'Customer Export',
            actions: ['read', 'write', 'delete'],
          },
        ],
      },
    ]);
  });

  it('normalizes full Chinese locale tags for RBAC resource display names', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      {
        code: 'customer.export',
        module: 'customer',
        actions: 'read',
      },
    ]);

    const result = await service.getResourceDefinitions('tenant_test', 'zh-Hant-TW');

    expect(result[0]).toMatchObject({
      module: 'customer',
      moduleName: '客户管理',
      resources: [
        {
          code: 'customer.export',
          name: '客户导出',
          actions: ['read'],
        },
      ],
    });
  });

  it('falls untranslated supported UI locales back to English RBAC resource display names', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      {
        code: 'customer.export',
        module: 'customer',
        actions: 'read',
      },
    ]);

    const result = await service.getResourceDefinitions('tenant_test', 'fr-FR');

    expect(result[0]).toMatchObject({
      module: 'customer',
      moduleName: 'Customer',
      resources: [
        {
          code: 'customer.export',
          name: 'Customer Export',
          actions: ['read'],
        },
      ],
    });
  });
});
