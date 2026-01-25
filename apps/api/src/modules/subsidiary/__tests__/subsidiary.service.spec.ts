// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock @tcrn/database
vi.mock('@tcrn/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}));

import { SubsidiaryService } from '../subsidiary.service';
import { prisma } from '@tcrn/database';

const mockPrisma = prisma as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
  $executeRawUnsafe: ReturnType<typeof vi.fn>;
};

describe('SubsidiaryService', () => {
  let service: SubsidiaryService;

  const mockSubsidiary = {
    id: 'subsidiary-123',
    parentId: null,
    code: 'SUB001',
    path: '/SUB001',
    depth: 0,
    nameEn: 'Main Office',
    nameZh: '总部',
    nameJa: '本社',
    descriptionEn: 'Main office description',
    descriptionZh: null,
    descriptionJa: null,
    sortOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SubsidiaryService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('should return subsidiary by ID', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([mockSubsidiary]);

      const result = await service.findById('subsidiary-123', 'tenant_test');

      expect(result).toEqual(mockSubsidiary);
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('should return null when subsidiary not found', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      const result = await service.findById('invalid-id', 'tenant_test');

      expect(result).toBeNull();
    });
  });

  describe('findByCode', () => {
    it('should return subsidiary by code', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([mockSubsidiary]);

      const result = await service.findByCode('SUB001', 'tenant_test');

      expect(result?.code).toBe('SUB001');
    });

    it('should return null when code not found', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      const result = await service.findByCode('INVALID', 'tenant_test');

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it.skip('should list subsidiaries with pagination', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockSubsidiary])
        .mockResolvedValueOnce([{ count: BigInt(1) }]);

      const result = await service.list('tenant_test', { page: 1, pageSize: 20 });

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
    });

    it('should filter by parent ID', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(0) }]);

      await service.list('tenant_test', { parentId: 'parent-123' });

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('should filter by active status', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockSubsidiary])
        .mockResolvedValueOnce([{ count: BigInt(1) }]);

      await service.list('tenant_test', { isActive: true });

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
    });
  });
});
