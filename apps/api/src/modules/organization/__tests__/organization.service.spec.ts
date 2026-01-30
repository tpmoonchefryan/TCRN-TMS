// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { NotFoundException } from '@nestjs/common';
import { prisma } from '@tcrn/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock prisma before importing service
vi.mock('@tcrn/database', () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
  },
}));

import { OrganizationService } from '../organization.service';

const mockPrisma = prisma as unknown as {
  tenant: { findUnique: ReturnType<typeof vi.fn> };
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
};

describe('OrganizationService', () => {
  let service: OrganizationService;

  const testTenantId = 'tenant-123';
  const testTenantSchema = 'tenant_abc123';

  const mockTenant = {
    id: testTenantId,
    code: 'TEST',
    name: 'Test Tenant',
  };

  const mockSubsidiaries = [
    {
      id: 'sub-1',
      parent_id: null,
      code: 'DIV_A',
      path: '/DIV_A/',
      depth: 1,
      name_en: 'Division A',
      name_zh: '部门A',
      name_ja: '部署A',
      is_active: true,
    },
    {
      id: 'sub-2',
      parent_id: 'sub-1',
      code: 'DIV_A1',
      path: '/DIV_A/DIV_A1/',
      depth: 2,
      name_en: 'Division A-1',
      name_zh: null,
      name_ja: null,
      is_active: true,
    },
    {
      id: 'sub-3',
      parent_id: null,
      code: 'DIV_B',
      path: '/DIV_B/',
      depth: 1,
      name_en: 'Division B',
      name_zh: null,
      name_ja: null,
      is_active: false,
    },
  ];

  const mockTalents = [
    {
      id: 'talent-1',
      subsidiary_id: 'sub-1',
      code: 'T001',
      name_en: 'Talent One',
      name_zh: null,
      name_ja: null,
      display_name: 'Talent 1',
      avatar_url: 'https://example.com/avatar1.jpg',
      homepage_path: 't1',
      is_active: true,
    },
    {
      id: 'talent-2',
      subsidiary_id: null,
      code: 'T002',
      name_en: 'Talent Two',
      name_zh: null,
      name_ja: null,
      display_name: 'Talent 2',
      avatar_url: null,
      homepage_path: null,
      is_active: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrganizationService();
  });

  describe('getTree', () => {
    beforeEach(() => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce(mockSubsidiaries) // Get subsidiaries
        .mockResolvedValueOnce([{ subsidiary_id: 'sub-1', count: BigInt(1) }]) // Talent counts
        .mockResolvedValueOnce(mockTalents); // Get talents
    });

    it('should return organization tree structure', async () => {
      const result = await service.getTree(testTenantId, testTenantSchema);

      expect(result).toBeDefined();
      expect(result.tenant).toEqual({
        id: testTenantId,
        code: 'TEST',
        name: 'Test Tenant',
      });
      expect(result.tree).toBeDefined();
      expect(Array.isArray(result.tree)).toBe(true);
    });

    it('should throw NotFoundException when tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.getTree('non-existent', testTenantSchema),
      ).rejects.toThrow(NotFoundException);
    });

    it('should filter inactive subsidiaries when includeInactive is false', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      
      await service.getTree(testTenantId, testTenantSchema, { includeInactive: false });

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('is_active = true'),
      );
    });

    it('should support different languages', async () => {
      const result = await service.getTree(testTenantId, testTenantSchema, { language: 'zh' });

      expect(result).toBeDefined();
    });

    it('should call search query when search is provided', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      // Reset mocks for search test
      mockPrisma.$queryRawUnsafe.mockReset();
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ path: '/DIV_A/' }]) // Search matched subsidiaries (returns path field)
        .mockResolvedValueOnce([]) // Search matched talents
        .mockResolvedValueOnce([mockSubsidiaries[0]]) // Get matching subsidiaries by path array
        .mockResolvedValueOnce([]) // Talent counts
        .mockResolvedValueOnce([]); // Get talents

      await service.getTree(testTenantId, testTenantSchema, { search: 'Division' });

      // Should have called $queryRawUnsafe for search
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('should include talents without subsidiary', async () => {
      const result = await service.getTree(testTenantId, testTenantSchema);

      expect(result.talentsWithoutSubsidiary).toBeDefined();
    });
  });

  describe('getBreadcrumb', () => {
    beforeEach(() => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
    });

    it('should return breadcrumb for path', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockSubsidiaries[0]]) // Get subsidiary for DIV_A
        .mockResolvedValueOnce([mockSubsidiaries[1]]); // Get subsidiary for DIV_A1

      const result = await service.getBreadcrumb(
        testTenantId,
        testTenantSchema,
        '/DIV_A/DIV_A1/',
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0]).toEqual({
        id: testTenantId,
        type: 'tenant',
        code: 'TEST',
        name: 'Test Tenant',
      });
    });

    it('should throw NotFoundException when tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.getBreadcrumb('non-existent', testTenantSchema, '/path/'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle talent in path', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockSubsidiaries[0]]) // Get subsidiary for DIV_A
        .mockResolvedValueOnce([]) // No subsidiary match for T001
        .mockResolvedValueOnce([mockTalents[0]]); // Get talent for T001

      const result = await service.getBreadcrumb(
        testTenantId,
        testTenantSchema,
        '/DIV_A/T001/',
      );

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should support different languages', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        { ...mockSubsidiaries[0], name_zh: '部门A' },
      ]);

      const result = await service.getBreadcrumb(
        testTenantId,
        testTenantSchema,
        '/DIV_A/',
        'zh',
      );

      const subsidiaryBreadcrumb = result.find(b => b.type === 'subsidiary');
      if (subsidiaryBreadcrumb) {
        expect(subsidiaryBreadcrumb.name).toBe('部门A');
      }
    });
  });

  describe('getChildren', () => {
    it('should return root level children when parentId is null', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockSubsidiaries[0], mockSubsidiaries[2]]) // Root subsidiaries
        .mockResolvedValueOnce([{ parent_id: 'sub-1', count: BigInt(1) }]) // Child counts
        .mockResolvedValueOnce([{ subsidiary_id: 'sub-1', count: BigInt(1) }]) // Talent counts
        .mockResolvedValueOnce([mockTalents[1]]); // Direct talents

      const result = await service.getChildren(testTenantSchema, null);

      expect(result.subsidiaries).toBeDefined();
      expect(result.talents).toBeDefined();
    });

    it('should return children of specific parent', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockSubsidiaries[1]]) // Child subsidiaries
        .mockResolvedValueOnce([]) // Child counts
        .mockResolvedValueOnce([]) // Talent counts
        .mockResolvedValueOnce([mockTalents[0]]); // Talents under sub-1

      const result = await service.getChildren(testTenantSchema, 'sub-1');

      expect(result.subsidiaries).toBeDefined();
    });

    it('should return subsidiary with talentCount', async () => {
      mockPrisma.$queryRawUnsafe.mockReset();
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockSubsidiaries[0]]) // Root subsidiaries
        .mockResolvedValueOnce([]) // No child subsidiary counts
        .mockResolvedValueOnce([{ subsidiary_id: 'sub-1', count: BigInt(5) }]); // Talent counts

      const result = await service.getChildren(testTenantSchema, null, { includeTalents: false });

      const divisionA = result.subsidiaries.find(s => s.id === 'sub-1');
      expect(divisionA).toBeDefined();
      expect(divisionA?.talentCount).toBe(5);
    });

    it('should filter inactive when requested', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockSubsidiaries[0]]) // Only active
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getChildren(testTenantSchema, null, { includeInactive: false });

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('is_active = true'),
      );
    });
  });

  describe('getRootNodes', () => {
    it('should return tenant info with root nodes', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockSubsidiaries[0]])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockTalents[1]]);

      const result = await service.getRootNodes(testTenantId, testTenantSchema);

      expect(result.tenant).toEqual({
        id: testTenantId,
        code: 'TEST',
        name: 'Test Tenant',
      });
      expect(result.subsidiaries).toBeDefined();
      expect(result.directTalents).toBeDefined();
    });

    it('should throw NotFoundException when tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.getRootNodes('non-existent', testTenantSchema),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Edge Cases', () => {
    it('should return empty talentsWithoutSubsidiary when no orphan talents', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.$queryRawUnsafe.mockReset();
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([mockSubsidiaries[0]]) // Subsidiaries
        .mockResolvedValueOnce([]) // No talent counts
        .mockResolvedValueOnce([{ ...mockTalents[0], subsidiary_id: 'sub-1' }]); // All talents have subsidiary

      const result = await service.getTree(testTenantId, testTenantSchema);

      expect(result.talentsWithoutSubsidiary).toEqual([]);
    });

    it('should handle breadcrumb with single segment', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.$queryRawUnsafe.mockReset();
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockSubsidiaries[0]]); // subsidiary for DIV_A

      const result = await service.getBreadcrumb(
        testTenantId,
        testTenantSchema,
        '/DIV_A/',
      );

      // tenant + 1 subsidiary = 2
      expect(result.length).toBe(2);
      expect(result[0].type).toBe('tenant');
      expect(result[1].type).toBe('subsidiary');
    });

    it('should use English name when localized name is null', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.$queryRawUnsafe.mockReset();
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        { ...mockSubsidiaries[0], name_zh: null },
      ]);

      const result = await service.getBreadcrumb(
        testTenantId,
        testTenantSchema,
        '/DIV_A/',
        'zh',
      );

      // Should fallback to English name
      const subsidiaryBreadcrumb = result.find(b => b.type === 'subsidiary');
      expect(subsidiaryBreadcrumb?.name).toBe('Division A');
    });
  });
});
