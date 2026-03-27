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
        nameEn: 'Customer Profile',
        nameZh: '客户档案',
        nameJa: '顧客プロファイル',
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
        nameEn: 'Customer Profile',
        nameZh: null,
        nameJa: null,
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
});
