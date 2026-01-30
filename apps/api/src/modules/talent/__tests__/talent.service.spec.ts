// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { prisma } from '@tcrn/database';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @tcrn/database
vi.mock('@tcrn/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}));

import { TalentService } from '../talent.service';

const mockPrisma = prisma as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
  $executeRawUnsafe: ReturnType<typeof vi.fn>;
};

describe('TalentService', () => {
  let service: TalentService;

  const mockTalent = {
    id: 'talent-123',
    subsidiaryId: 'subsidiary-123',
    profileStoreId: 'store-123',
    code: 'TALENT001',
    path: '/SUB001/TALENT001',
    nameEn: 'Test Talent',
    nameZh: '测试艺人',
    nameJa: 'テストタレント',
    displayName: 'Test Talent',
    descriptionEn: 'A test talent',
    descriptionZh: null,
    descriptionJa: null,
    avatarUrl: 'https://example.com/avatar.png',
    homepagePath: '/test-talent',
    timezone: 'Asia/Tokyo',
    isActive: true,
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TalentService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('should return talent by ID', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([mockTalent]);

      const result = await service.findById('talent-123', 'tenant_test');

      expect(result).toEqual(mockTalent);
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('should return null when talent not found', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      const result = await service.findById('invalid-id', 'tenant_test');

      expect(result).toBeNull();
    });
  });

  describe('findByCode', () => {
    it('should return talent by code', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([mockTalent]);

      const result = await service.findByCode('TALENT001', 'tenant_test');

      expect(result?.code).toBe('TALENT001');
    });

    it('should return null when code not found', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      const result = await service.findByCode('INVALID', 'tenant_test');

      expect(result).toBeNull();
    });
  });

  describe('findByHomepagePath', () => {
    it('should return talent by homepage path', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([mockTalent]);

      const result = await service.findByHomepagePath('/test-talent', 'tenant_test');

      expect(result?.homepagePath).toBe('/test-talent');
    });

    it('should return null when homepage path not found', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      const result = await service.findByHomepagePath('/unknown', 'tenant_test');

      expect(result).toBeNull();
    });
  });
});
