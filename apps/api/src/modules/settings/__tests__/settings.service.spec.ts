// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsApplicationService } from '../application/settings-application.service';
import { SettingsRepository } from '../infrastructure/settings.repository';

describe('SettingsApplicationService', () => {
  let service: SettingsApplicationService;
  let mockSettingsRepository: {
    findTenantBySchema: ReturnType<typeof vi.fn>;
    findSubsidiaryById: ReturnType<typeof vi.fn>;
    listSubsidiariesByCodes: ReturnType<typeof vi.fn>;
    findTalentById: ReturnType<typeof vi.fn>;
    findScopeSettingsRecord: ReturnType<typeof vi.fn>;
    updateTenantSettings: ReturnType<typeof vi.fn>;
    updateTalentSettings: ReturnType<typeof vi.fn>;
    upsertScopeSettings: ReturnType<typeof vi.fn>;
  };

  const testSchema = 'tenant_test123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSettingsRepository = {
      findTenantBySchema: vi.fn(),
      findSubsidiaryById: vi.fn(),
      listSubsidiariesByCodes: vi.fn(),
      findTalentById: vi.fn(),
      findScopeSettingsRecord: vi.fn(),
      updateTenantSettings: vi.fn(),
      updateTalentSettings: vi.fn(),
      upsertScopeSettings: vi.fn(),
    };

    service = new SettingsApplicationService(
      mockSettingsRepository as unknown as SettingsRepository,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getEffectiveSettings', () => {
    it('should return tenant settings with defaults', async () => {
      mockSettingsRepository.findTenantBySchema.mockResolvedValue({
        id: 'tenant-123',
        settings: { timezone: 'Asia/Tokyo' },
      });

      const result = await service.getEffectiveSettings(testSchema, 'tenant', null);

      expect(result.scopeType).toBe('tenant');
      expect(result.settings.timezone).toBe('Asia/Tokyo');
      expect(result.settings.defaultLanguage).toBe('en');
    });

    it('should return default settings when tenant custom settings are empty', async () => {
      mockSettingsRepository.findTenantBySchema.mockResolvedValue({
        id: 'tenant-123',
        settings: {},
      });

      const result = await service.getEffectiveSettings(testSchema, 'tenant', null);

      expect(result.settings.defaultLanguage).toBe('en');
      expect(result.settings.currency).toBe('USD');
      expect(result.settings.maxImportRows).toBe(50000);
    });

    it('should track overrides and inherited fields correctly', async () => {
      mockSettingsRepository.findTenantBySchema.mockResolvedValue({
        id: 'tenant-123',
        settings: { timezone: 'Asia/Tokyo', currency: 'JPY' },
      });

      const result = await service.getEffectiveSettings(testSchema, 'tenant', null);

      expect(result.overrides).toContain('timezone');
      expect(result.overrides).toContain('currency');
      expect(result.inheritedFrom.defaultLanguage).toBe('default');
    });

    it('should handle talent scope with subsidiary inheritance', async () => {
      mockSettingsRepository.findTalentById
        .mockResolvedValueOnce({
          id: 'talent-123',
          subsidiaryId: 'sub-123',
          settings: { currency: 'EUR' },
          version: 2,
        })
        .mockResolvedValueOnce({
          id: 'talent-123',
          subsidiaryId: 'sub-123',
          settings: { currency: 'EUR' },
          version: 2,
        });
      mockSettingsRepository.findSubsidiaryById
        .mockResolvedValueOnce({
          id: 'sub-123',
          path: '/DIV_A/',
          version: 1,
        })
        .mockResolvedValueOnce({
          id: 'sub-123',
          path: '/DIV_A/',
          version: 1,
        });
      mockSettingsRepository.listSubsidiariesByCodes.mockResolvedValue([
        { id: 'sub-123', code: 'DIV_A' },
      ]);
      mockSettingsRepository.findTenantBySchema.mockResolvedValue({
        id: 'tenant-123',
        settings: { timezone: 'UTC' },
      });
      mockSettingsRepository.findScopeSettingsRecord.mockResolvedValue(null);

      const result = await service.getEffectiveSettings(testSchema, 'talent', 'talent-123');

      expect(result.scopeType).toBe('talent');
      expect(result.scopeId).toBe('talent-123');
      expect(result.settings.currency).toBe('EUR');
      expect(result.settings.timezone).toBe('UTC');
    });

    it('should throw NotFoundException for non-existent talent', async () => {
      mockSettingsRepository.findTalentById.mockResolvedValue(null);

      await expect(
        service.getEffectiveSettings(testSchema, 'talent', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSettings', () => {
    it('should update tenant settings', async () => {
      mockSettingsRepository.findTenantBySchema
        .mockResolvedValueOnce({
          id: 'tenant-123',
          settings: { timezone: 'UTC' },
        })
        .mockResolvedValueOnce({
          id: 'tenant-123',
          settings: { timezone: 'UTC' },
        })
        .mockResolvedValueOnce({
          id: 'tenant-123',
          settings: { timezone: 'Asia/Tokyo' },
        });
      mockSettingsRepository.updateTenantSettings.mockResolvedValue(undefined);

      const result = await service.updateSettings(
        testSchema,
        'tenant',
        null,
        { timezone: 'Asia/Tokyo' },
        1,
        'user-123',
      );

      expect(mockSettingsRepository.updateTenantSettings).toHaveBeenCalledWith(
        testSchema,
        expect.objectContaining({ timezone: 'Asia/Tokyo' }),
      );
      expect(result.settings.timezone).toBe('Asia/Tokyo');
    });

    it('should throw BadRequestException on version conflict', async () => {
      mockSettingsRepository.findTenantBySchema
        .mockResolvedValueOnce({ id: 'tenant-123', settings: {} })
        .mockResolvedValueOnce({ id: 'tenant-123', settings: { timezone: 'UTC' } });

      await expect(
        service.updateSettings(
          testSchema,
          'tenant',
          null,
          { timezone: 'Asia/Tokyo' },
          3,
          'user-123',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should merge new settings with existing tenant settings', async () => {
      mockSettingsRepository.findTenantBySchema
        .mockResolvedValueOnce({
          id: 'tenant-123',
          settings: { timezone: 'UTC', currency: 'USD' },
        })
        .mockResolvedValueOnce({
          id: 'tenant-123',
          settings: { timezone: 'UTC', currency: 'USD' },
        })
        .mockResolvedValueOnce({
          id: 'tenant-123',
          settings: { timezone: 'UTC', currency: 'USD', language: 'ja' },
        });
      mockSettingsRepository.updateTenantSettings.mockResolvedValue(undefined);

      await service.updateSettings(
        testSchema,
        'tenant',
        null,
        { language: 'ja' },
        1,
        'user-123',
      );

      expect(mockSettingsRepository.updateTenantSettings).toHaveBeenCalledWith(
        testSchema,
        expect.objectContaining({
          timezone: 'UTC',
          currency: 'USD',
          language: 'ja',
        }),
      );
    });

    it('should validate scope exists before updating', async () => {
      mockSettingsRepository.findTenantBySchema.mockResolvedValue(null);

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
      mockSettingsRepository.findSubsidiaryById
        .mockResolvedValueOnce({
          id: 'sub-123',
          path: '/DIV_A/',
          version: 1,
        })
        .mockResolvedValueOnce({
          id: 'sub-123',
          path: '/DIV_A/',
          version: 1,
        });
      mockSettingsRepository.findScopeSettingsRecord
        .mockResolvedValueOnce({
          settings: { timezone: 'Asia/Tokyo' },
          version: 2,
        })
        .mockResolvedValueOnce(null);
      mockSettingsRepository.upsertScopeSettings.mockResolvedValue(undefined);
      mockSettingsRepository.listSubsidiariesByCodes.mockResolvedValue([
        { id: 'sub-123', code: 'DIV_A' },
      ]);
      mockSettingsRepository.findTenantBySchema.mockResolvedValue({
        id: 'tenant-123',
        settings: { timezone: 'UTC' },
      });

      const result = await service.resetToInherited(
        testSchema,
        'subsidiary',
        'sub-123',
        'timezone',
        'user-123',
      );

      expect(mockSettingsRepository.upsertScopeSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: {},
        }),
      );
      expect(result.settings.timezone).toBe('UTC');
    });

    it('should return current settings if no custom settings exist', async () => {
      mockSettingsRepository.findSubsidiaryById
        .mockResolvedValueOnce({
          id: 'sub-123',
          path: '/DIV_A/',
          version: 1,
        })
        .mockResolvedValueOnce({
          id: 'sub-123',
          path: '/DIV_A/',
          version: 1,
        });
      mockSettingsRepository.findScopeSettingsRecord.mockResolvedValue(null);
      mockSettingsRepository.listSubsidiariesByCodes.mockResolvedValue([
        { id: 'sub-123', code: 'DIV_A' },
      ]);
      mockSettingsRepository.findTenantBySchema.mockResolvedValue({
        id: 'tenant-123',
        settings: {},
      });

      const result = await service.resetToInherited(
        testSchema,
        'subsidiary',
        'sub-123',
        'timezone',
        'user-123',
      );

      expect(result).toBeDefined();
      expect(mockSettingsRepository.upsertScopeSettings).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty settings object', async () => {
      mockSettingsRepository.findTenantBySchema.mockResolvedValue({
        id: 'tenant-123',
        settings: null,
      });

      const result = await service.getEffectiveSettings(testSchema, 'tenant', null);

      expect(result.settings.defaultLanguage).toBe('en');
    });

    it('should handle deeply nested password policy settings', async () => {
      mockSettingsRepository.findTenantBySchema.mockResolvedValue({
        id: 'tenant-123',
        settings: {
          passwordPolicy: {
            minLength: 16,
            requireSpecial: false,
          },
        },
      });

      const result = await service.getEffectiveSettings(testSchema, 'tenant', null);

      expect(result.settings.passwordPolicy).toEqual({
        minLength: 16,
        requireSpecial: false,
      });
    });

    it('should handle subsidiary not found for talent inheritance chain', async () => {
      mockSettingsRepository.findTalentById.mockResolvedValue({
        id: 'talent-123',
        subsidiaryId: 'sub-123',
        settings: {},
        version: 1,
      });
      mockSettingsRepository.findSubsidiaryById.mockResolvedValue(null);

      await expect(
        service.getEffectiveSettings(testSchema, 'talent', 'talent-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Default Settings', () => {
    it('should have all required default fields', async () => {
      mockSettingsRepository.findTenantBySchema.mockResolvedValue({
        id: 'tenant-123',
        settings: {},
      });

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
      mockSettingsRepository.findTenantBySchema.mockResolvedValue({
        id: 'tenant-123',
        settings: {},
      });

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
