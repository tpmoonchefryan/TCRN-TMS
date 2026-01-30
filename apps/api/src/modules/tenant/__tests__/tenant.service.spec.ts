// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { NotFoundException } from '@nestjs/common';
import { createTenantSchema, getTenantSchemaName, prisma, setTenantSchema, withTenantContext } from '@tcrn/database';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @tcrn/database before importing service
vi.mock('@tcrn/database', () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  getTenantSchemaName: vi.fn(),
  setTenantSchema: vi.fn(),
  createTenantSchema: vi.fn(),
  withTenantContext: vi.fn(),
}));

import { TenantService } from '../tenant.service';

const mockPrisma = prisma as unknown as {
  tenant: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe('TenantService', () => {
  let service: TenantService;

  const mockTenant = {
    id: 'tenant-123',
    code: 'TEST_TENANT',
    name: 'Test Tenant',
    schemaName: 'tenant_abc123',
    tier: 'standard',
    isActive: true,
    settings: { timezone: 'Asia/Tokyo' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TenantService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTenantByCode', () => {
    it('should return tenant with exact code match', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const result = await service.getTenantByCode('TEST_TENANT');

      expect(result).toEqual(mockTenant);
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { code: 'TEST_TENANT' },
      });
    });

    it('should try case-insensitive match when exact match fails', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.findFirst.mockResolvedValue(mockTenant);

      const result = await service.getTenantByCode('test_tenant');

      expect(result).toEqual(mockTenant);
      expect(mockPrisma.tenant.findFirst).toHaveBeenCalledWith({
        where: {
          code: {
            equals: 'test_tenant',
            mode: 'insensitive',
          },
        },
      });
    });

    it('should return null when tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.findFirst.mockResolvedValue(null);

      const result = await service.getTenantByCode('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('getTenantById', () => {
    it('should return tenant by ID', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const result = await service.getTenantById('tenant-123');

      expect(result).toEqual(mockTenant);
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'tenant-123' },
      });
    });

    it('should return null for non-existent ID', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      const result = await service.getTenantById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getTenantBySchemaName', () => {
    it('should return tenant by schema name', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const result = await service.getTenantBySchemaName('tenant_abc123');

      expect(result).toEqual(mockTenant);
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { schemaName: 'tenant_abc123' },
      });
    });
  });

  describe('createTenant', () => {
    it('should create tenant with schema', async () => {
      const newTenant = { ...mockTenant, schemaName: '' };
      const updatedTenant = { ...mockTenant };

      mockPrisma.tenant.create.mockResolvedValue(newTenant);
      (createTenantSchema as ReturnType<typeof vi.fn>).mockResolvedValue('tenant_abc123');
      mockPrisma.tenant.update.mockResolvedValue(updatedTenant);

      const result = await service.createTenant({
        code: 'TEST_TENANT',
        name: 'Test Tenant',
      });

      expect(result).toEqual(updatedTenant);
      expect(mockPrisma.tenant.create).toHaveBeenCalledWith({
        data: {
          code: 'TEST_TENANT',
          name: 'Test Tenant',
          schemaName: '',
          tier: 'standard',
          settings: {},
        },
      });
      expect(createTenantSchema).toHaveBeenCalledWith('tenant-123');
    });

    it('should create tenant with custom tier', async () => {
      const newTenant = { ...mockTenant, tier: 'ac', schemaName: '' };
      mockPrisma.tenant.create.mockResolvedValue(newTenant);
      (createTenantSchema as ReturnType<typeof vi.fn>).mockResolvedValue('tenant_abc123');
      mockPrisma.tenant.update.mockResolvedValue({ ...newTenant, schemaName: 'tenant_abc123' });

      await service.createTenant({
        code: 'TEST_TENANT',
        name: 'Test Tenant',
        tier: 'ac',
      });

      expect(mockPrisma.tenant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tier: 'ac',
        }),
      });
    });

    it('should create tenant with initial settings', async () => {
      mockPrisma.tenant.create.mockResolvedValue({ ...mockTenant, schemaName: '' });
      (createTenantSchema as ReturnType<typeof vi.fn>).mockResolvedValue('tenant_abc123');
      mockPrisma.tenant.update.mockResolvedValue(mockTenant);

      await service.createTenant({
        code: 'TEST_TENANT',
        name: 'Test Tenant',
        settings: { theme: 'dark' },
      });

      expect(mockPrisma.tenant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          settings: { theme: 'dark' },
        }),
      });
    });
  });

  describe('setTenantActive', () => {
    it('should activate tenant', async () => {
      mockPrisma.tenant.update.mockResolvedValue({ ...mockTenant, isActive: true });

      const result = await service.setTenantActive('tenant-123', true);

      expect(result.isActive).toBe(true);
      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-123' },
        data: { isActive: true },
      });
    });

    it('should deactivate tenant', async () => {
      mockPrisma.tenant.update.mockResolvedValue({ ...mockTenant, isActive: false });

      const result = await service.setTenantActive('tenant-123', false);

      expect(result.isActive).toBe(false);
    });
  });

  describe('updateTenantSettings', () => {
    it('should merge new settings with existing', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.tenant.update.mockResolvedValue({
        ...mockTenant,
        settings: { timezone: 'Asia/Tokyo', language: 'ja' },
      });

      const _result = await service.updateTenantSettings('tenant-123', { language: 'ja' });
      
      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-123' },
        data: { settings: { timezone: 'Asia/Tokyo', language: 'ja' } },
      });
    });

    it('should throw NotFoundException when tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTenantSettings('nonexistent', { language: 'ja' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle empty existing settings', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ ...mockTenant, settings: null });
      mockPrisma.tenant.update.mockResolvedValue({
        ...mockTenant,
        settings: { language: 'ja' },
      });

      await service.updateTenantSettings('tenant-123', { language: 'ja' });

      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-123' },
        data: { settings: { language: 'ja' } },
      });
    });
  });

  describe('listActiveTenants', () => {
    it('should return all active tenants sorted by code', async () => {
      const tenants = [mockTenant, { ...mockTenant, id: 'tenant-456', code: 'ANOTHER' }];
      mockPrisma.tenant.findMany.mockResolvedValue(tenants);

      const result = await service.listActiveTenants();

      expect(result).toEqual(tenants);
      expect(mockPrisma.tenant.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      });
    });

    it('should return empty array when no active tenants', async () => {
      mockPrisma.tenant.findMany.mockResolvedValue([]);

      const result = await service.listActiveTenants();

      expect(result).toEqual([]);
    });
  });

  describe('setTenantContext', () => {
    it('should set tenant schema context', async () => {
      await service.setTenantContext('tenant_abc123');

      expect(setTenantSchema).toHaveBeenCalledWith('tenant_abc123');
    });
  });

  describe('withTenant', () => {
    it('should execute function within tenant context', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');
      (withTenantContext as ReturnType<typeof vi.fn>).mockImplementation(
        (_schema, fn) => fn(),
      );

      const result = await service.withTenant('tenant_abc123', mockFn);

      expect(withTenantContext).toHaveBeenCalledWith('tenant_abc123', mockFn);
      expect(result).toBe('result');
    });
  });

  describe('getSchemaNameFromId', () => {
    it('should return schema name from tenant ID', () => {
      (getTenantSchemaName as ReturnType<typeof vi.fn>).mockReturnValue('tenant_abc123');

      const result = service.getSchemaNameFromId('tenant-123');

      expect(result).toBe('tenant_abc123');
      expect(getTenantSchemaName).toHaveBeenCalledWith('tenant-123');
    });
  });

  describe('validateTenantAccess', () => {
    it('should return true for matching tenant IDs with active tenant', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const result = await service.validateTenantAccess('tenant-123', 'tenant-123');

      expect(result).toBe(true);
    });

    it('should return false for mismatched tenant IDs', async () => {
      const result = await service.validateTenantAccess('tenant-123', 'tenant-456');

      expect(result).toBe(false);
      expect(mockPrisma.tenant.findUnique).not.toHaveBeenCalled();
    });

    it('should return false for inactive tenant', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ ...mockTenant, isActive: false });

      const result = await service.validateTenantAccess('tenant-123', 'tenant-123');

      expect(result).toBe(false);
    });

    it('should return false when tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      const result = await service.validateTenantAccess('tenant-123', 'tenant-123');

      expect(result).toBe(false);
    });
  });
});
