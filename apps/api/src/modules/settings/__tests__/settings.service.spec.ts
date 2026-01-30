// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { prisma } from '@tcrn/database';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @tcrn/database before importing service
vi.mock('@tcrn/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}));

import { SettingsService } from '../settings.service';

const mockPrisma = prisma as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
  $executeRawUnsafe: ReturnType<typeof vi.fn>;
};

describe('SettingsService', () => {
  let service: SettingsService;
  const testSchema = 'tenant_test123';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SettingsService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getEffectiveSettings', () => {
    it('should return tenant settings with defaults', async () => {
      // Mock tenant settings query
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        { settings: { timezone: 'Asia/Tokyo' } },
      ]);

      const result = await service.getEffectiveSettings(testSchema, 'tenant', null);

      expect(result).toBeDefined();
      expect(result.scopeType).toBe('tenant');
      expect(result.settings.timezone).toBe('Asia/Tokyo');
      expect(result.settings.defaultLanguage).toBe('en'); // From defaults
    });

    it('should return default settings when no custom settings exist', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ settings: {} }]);

      const result = await service.getEffectiveSettings(testSchema, 'tenant', null);

      expect(result.settings.defaultLanguage).toBe('en');
      expect(result.settings.currency).toBe('USD');
      expect(result.settings.maxImportRows).toBe(50000);
    });

    it('should track overrides and inherited fields correctly', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        { settings: { timezone: 'Asia/Tokyo', currency: 'JPY' } },
      ]);

      const result = await service.getEffectiveSettings(testSchema, 'tenant', null);

      // Fields that were overridden at this scope
      expect(result.overrides).toContain('timezone');
      expect(result.overrides).toContain('currency');
      
      // Fields inherited from default
      expect(result.inheritedFrom.defaultLanguage).toBe('default');
    });

    it('should handle talent scope with subsidiary inheritance', async () => {
      // Mock talent query
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ subsidiary_id: 'sub-123' }]) // Talent subsidiary lookup
        .mockResolvedValueOnce([{ id: 'sub-123', path: '/DIV_A/', version: 1 }]) // Subsidiary path
        .mockResolvedValueOnce([{ id: 'sub-123', code: 'DIV_A' }]) // Subsidiaries in path
        .mockResolvedValueOnce([{ settings: { timezone: 'UTC' } }]) // Tenant settings
        .mockResolvedValueOnce([{ id: 'sub-123', version: 1 }]) // Subsidiary query
        .mockResolvedValueOnce([]) // Scope settings for subsidiary (empty)
        .mockResolvedValueOnce([{ settings: { currency: 'EUR' }, version: 2 }]); // Talent settings

      const result = await service.getEffectiveSettings(testSchema, 'talent', 'talent-123');

      expect(result.scopeType).toBe('talent');
      expect(result.scopeId).toBe('talent-123');
    });

    it('should throw NotFoundException for non-existent talent', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]); // Talent not found

      await expect(
        service.getEffectiveSettings(testSchema, 'talent', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSettings', () => {
    beforeEach(() => {
      // Mock validateScopeExists for tenant
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ id: 'tenant-123' }]);
    });

    it('should update tenant settings', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ settings: { timezone: 'UTC' } }]) // Current settings
        .mockResolvedValueOnce([{ settings: { timezone: 'Asia/Tokyo' } }]); // After update
      mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(1);

      const result = await service.updateSettings(
        testSchema,
        'tenant',
        null,
        { timezone: 'Asia/Tokyo' },
        1,
        'user-123',
      );

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException on version conflict', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        { settings: { timezone: 'UTC' }, version: 5 },
      ]);

      await expect(
        service.updateSettings(
          testSchema,
          'tenant',
          null,
          { timezone: 'Asia/Tokyo' },
          3, // Wrong version
          'user-123',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should merge new settings with existing', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ settings: { timezone: 'UTC', currency: 'USD' }, version: 1 }])
        .mockResolvedValueOnce([{ settings: {} }]); // For getEffectiveSettings
      mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(1);

      await service.updateSettings(
        testSchema,
        'tenant',
        null,
        { language: 'ja' },
        1,
        'user-123',
      );

      // Verify the merged settings were saved
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('timezone'),
        testSchema,
      );
    });

    it('should validate scope exists before updating', async () => {
      mockPrisma.$queryRawUnsafe.mockReset();
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]); // Tenant not found

      await expect(
        service.updateSettings(
          testSchema,
          'tenant',
          null,
          { timezone: 'Asia/Tokyo' },
          1,
          'user-123',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resetToInherited', () => {
    it('should throw BadRequestException for tenant scope', async () => {
      await expect(
        service.resetToInherited(testSchema, 'tenant', null, 'timezone', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should remove field from subsidiary settings', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ id: 'sub-123', version: 1 }]) // getScopeOwnSettings - subsidiary query
        .mockResolvedValueOnce([]) // getScopeOwnSettings - scope settings table
        // getEffectiveSettings chain:
        .mockResolvedValueOnce([{ id: 'sub-123', path: '/DIV_A/', version: 1 }]) // getSubsidiaryChain - subsidiary
        .mockResolvedValueOnce([{ id: 'sub-123', code: 'DIV_A' }]) // getSubsidiaryChain - subsidiaries by code
        .mockResolvedValueOnce([{ settings: { timezone: 'UTC' } }]) // Tenant settings
        .mockResolvedValueOnce([{ id: 'sub-123', version: 1 }]) // Subsidiary settings check
        .mockResolvedValueOnce([]); // Scope settings for subsidiary
      
      const result = await service.resetToInherited(
        testSchema,
        'subsidiary',
        'sub-123',
        'timezone',
        'user-123',
      );

      expect(result).toBeDefined();
    });

    it('should return current settings if no custom settings exist', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ id: 'sub-123', version: 1 }]) // getScopeOwnSettings - subsidiary query
        .mockResolvedValueOnce([]) // getScopeOwnSettings - scope settings table (no settings to reset)
        // getEffectiveSettings chain:
        .mockResolvedValueOnce([{ id: 'sub-123', path: '/DIV_A/', version: 1 }]) // getSubsidiaryChain - subsidiary
        .mockResolvedValueOnce([{ id: 'sub-123', code: 'DIV_A' }]) // getSubsidiaryChain - subsidiaries by code
        .mockResolvedValueOnce([{ settings: {} }]) // Tenant settings
        .mockResolvedValueOnce([{ id: 'sub-123', version: 1 }]) // Subsidiary settings check
        .mockResolvedValueOnce([]); // Scope settings for subsidiary

      const result = await service.resetToInherited(
        testSchema,
        'subsidiary',
        'sub-123',
        'timezone',
        'user-123',
      );

      expect(result).toBeDefined();
      // Should not have called save since there were no settings to reset
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty settings object', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ settings: null }]);

      const result = await service.getEffectiveSettings(testSchema, 'tenant', null);

      // Should still have default settings
      expect(result.settings.defaultLanguage).toBe('en');
    });

    it('should handle deeply nested password policy settings', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        { 
          settings: { 
            passwordPolicy: { 
              minLength: 16,
              requireSpecial: false,
            } 
          } 
        },
      ]);

      const result = await service.getEffectiveSettings(testSchema, 'tenant', null);

      // Settings should be merged
      expect(result.settings.passwordPolicy).toEqual({
        minLength: 16,
        requireSpecial: false,
      });
    });

    it('should handle subsidiary not found', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ subsidiary_id: 'sub-123' }]) // Talent with subsidiary
        .mockResolvedValueOnce([]); // Subsidiary not found

      await expect(
        service.getEffectiveSettings(testSchema, 'talent', 'talent-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Default Settings', () => {
    it('should have all required default fields', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ settings: {} }]);

      const result = await service.getEffectiveSettings(testSchema, 'tenant', null);

      expect(result.settings).toHaveProperty('defaultLanguage');
      expect(result.settings).toHaveProperty('timezone');
      expect(result.settings).toHaveProperty('dateFormat');
      expect(result.settings).toHaveProperty('currency');
      expect(result.settings).toHaveProperty('customerImportEnabled');
      expect(result.settings).toHaveProperty('maxImportRows');
      expect(result.settings).toHaveProperty('totpRequiredForAll');
      expect(result.settings).toHaveProperty('allowCustomHomepage');
      expect(result.settings).toHaveProperty('allowMarshmallow');
      expect(result.settings).toHaveProperty('passwordPolicy');
    });

    it('should have correct default values', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ settings: {} }]);

      const result = await service.getEffectiveSettings(testSchema, 'tenant', null);

      expect(result.settings.defaultLanguage).toBe('en');
      expect(result.settings.timezone).toBe('UTC');
      expect(result.settings.dateFormat).toBe('YYYY-MM-DD');
      expect(result.settings.currency).toBe('USD');
      expect(result.settings.customerImportEnabled).toBe(true);
      expect(result.settings.maxImportRows).toBe(50000);
      expect(result.settings.totpRequiredForAll).toBe(false);
    });
  });
});
