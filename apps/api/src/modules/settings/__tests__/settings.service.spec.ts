// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsApplicationService } from '../application/settings-application.service';
import { SettingsRepository } from '../infrastructure/settings.repository';
import type { SettingsSecretCryptoService } from '../infrastructure/settings-secret-crypto.service';

describe('SettingsApplicationService', () => {
  let service: SettingsApplicationService;
  let mockSettingsRepository: {
    findTenantBySchema: ReturnType<typeof vi.fn>;
    findSubsidiaryById: ReturnType<typeof vi.fn>;
    listArtistStageCatalog: ReturnType<typeof vi.fn>;
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
      listArtistStageCatalog: vi.fn(),
      listSubsidiariesByCodes: vi.fn(),
      findTalentById: vi.fn(),
      findScopeSettingsRecord: vi.fn(),
      updateTenantSettings: vi.fn(),
      updateTalentSettings: vi.fn(),
      upsertScopeSettings: vi.fn(),
    };

    service = new SettingsApplicationService(
      mockSettingsRepository as unknown as SettingsRepository
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

    it('should not expose AC-managed email domain storage through general tenant settings', async () => {
      mockSettingsRepository.findTenantBySchema.mockResolvedValue({
        id: 'tenant-123',
        settings: {
          timezone: 'Asia/Tokyo',
          emailSendingDomains: [
            {
              id: 'domain-1',
              domain: 'mail.alpha.example.com',
              status: 'pending_dns',
              verificationToken: 'dns-token-should-stay-ac-only',
              dnsRecords: [
                {
                  type: 'TXT',
                  host: '_tcrn-email.mail.alpha.example.com',
                  value: 'tcrn-email-verification=dns-token-should-stay-ac-only',
                },
              ],
              createdAt: '2026-05-08T09:00:00.000Z',
              updatedAt: '2026-05-08T09:00:00.000Z',
            },
          ],
          emailSenderPreferences: {
            defaultDomainId: 'domain-1',
            fromName: 'Alpha Support',
            replyTo: 'support@alpha.example.com',
          },
          turnstileConfig: {
            siteKey: 'tenant-site-key',
            secretKeyEncrypted: 'v1:encrypted-secret-should-stay-hidden',
          },
        },
      });

      const result = await service.getEffectiveSettings(testSchema, 'tenant', null);

      expect(result.settings.timezone).toBe('Asia/Tokyo');
      expect(result.settings).not.toHaveProperty('emailSendingDomains');
      expect(result.settings).not.toHaveProperty('emailSenderPreferences');
      expect(result.settings).not.toHaveProperty('turnstileConfig');
      expect(result.overrides).not.toContain('emailSendingDomains');
      expect(result.overrides).not.toContain('emailSenderPreferences');
      expect(result.overrides).not.toContain('turnstileConfig');
      expect(JSON.stringify(result)).not.toContain('dns-token-should-stay-ac-only');
      expect(JSON.stringify(result)).not.toContain('encrypted-secret-should-stay-hidden');
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
        service.getEffectiveSettings(testSchema, 'talent', 'nonexistent')
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
        'user-123'
      );

      expect(mockSettingsRepository.updateTenantSettings).toHaveBeenCalledWith(
        testSchema,
        expect.objectContaining({ timezone: 'Asia/Tokyo' })
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
          'user-123'
        )
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

      await service.updateSettings(testSchema, 'tenant', null, { language: 'ja' }, 1, 'user-123');

      expect(mockSettingsRepository.updateTenantSettings).toHaveBeenCalledWith(
        testSchema,
        expect.objectContaining({
          timezone: 'UTC',
          currency: 'USD',
          language: 'ja',
        })
      );
    });

    it('should normalize defaultLanguage updates to supported UI locale tags', async () => {
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
          settings: { timezone: 'UTC', defaultLanguage: 'zh_HANS' },
        });
      mockSettingsRepository.updateTenantSettings.mockResolvedValue(undefined);

      await service.updateSettings(
        testSchema,
        'tenant',
        null,
        { defaultLanguage: 'zh-CN' },
        1,
        'user-123'
      );

      expect(mockSettingsRepository.updateTenantSettings).toHaveBeenCalledWith(
        testSchema,
        expect.objectContaining({
          timezone: 'UTC',
          defaultLanguage: 'zh_HANS',
        })
      );
    });

    it('should reject unsupported defaultLanguage updates', async () => {
      mockSettingsRepository.findTenantBySchema
        .mockResolvedValueOnce({ id: 'tenant-123', settings: { timezone: 'UTC' } })
        .mockResolvedValueOnce({ id: 'tenant-123', settings: { timezone: 'UTC' } });

      await expect(
        service.updateSettings(testSchema, 'tenant', null, { defaultLanguage: 'xx' }, 1, 'user-123')
      ).rejects.toThrow(BadRequestException);
      expect(mockSettingsRepository.updateTenantSettings).not.toHaveBeenCalled();
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
          'user-123'
        )
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects tenant-only artistLifecycleFlow writes through lower-scope general settings', async () => {
      mockSettingsRepository.findTalentById.mockResolvedValue({
        id: 'talent-123',
        subsidiaryId: null,
        settings: {},
        version: 2,
      });

      await expect(
        service.updateSettings(
          testSchema,
          'talent',
          'talent-123',
          {
            artistLifecycleFlow: {
              nodes: [],
              transitions: [],
              homepagePolicyByStage: [],
            },
          },
          2,
          'user-123'
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('artistLifecycleFlow', () => {
    it('returns the effective tenant flow as read-only for lower scopes', async () => {
      mockSettingsRepository.findTalentById.mockResolvedValue({
        id: 'talent-123',
        subsidiaryId: null,
        settings: {},
        version: 3,
      });
      mockSettingsRepository.findTenantBySchema.mockResolvedValue({
        id: 'tenant-123',
        settings: {
          artistLifecycleFlow: {
            nodes: [
              {
                stageId: '11111111-1111-4111-8111-111111111111',
                stageCode: 'pre-debut',
              },
            ],
            transitions: [],
            homepagePolicyByStage: [
              {
                stageId: '11111111-1111-4111-8111-111111111111',
                allowedTemplateTypeCodes: ['pending-reveal'],
              },
            ],
          },
        },
      });
      mockSettingsRepository.listArtistStageCatalog.mockResolvedValue([
        {
          id: '11111111-1111-4111-8111-111111111111',
          code: 'pre-debut',
          isActive: true,
        },
      ]);

      const response = await service.getArtistLifecycleFlow(testSchema, 'talent', 'talent-123');

      expect(response.writable).toBe(false);
      expect(response.inheritedFrom).toBe('tenant');
      expect(response.flow.homepagePolicyByStage[0]?.allowedTemplateTypeCodes).toEqual([
        'pending-reveal',
      ]);
      expect(response.validationIssues).toEqual([]);
    });

    it('validates tenant flow updates against the artist stage catalog', async () => {
      mockSettingsRepository.findTenantBySchema.mockResolvedValue({
        id: 'tenant-123',
        settings: {},
      });
      mockSettingsRepository.listArtistStageCatalog.mockResolvedValue([
        {
          id: '11111111-1111-4111-8111-111111111111',
          code: 'pre-debut',
          isActive: true,
        },
      ]);

      await expect(
        service.updateArtistLifecycleFlow(testSchema, {
          nodes: [
            {
              stageId: '22222222-2222-4222-8222-222222222222',
              stageCode: 'active',
            },
          ],
          transitions: [],
          homepagePolicyByStage: [],
        })
      ).rejects.toThrow(BadRequestException);
      expect(mockSettingsRepository.updateTenantSettings).not.toHaveBeenCalled();
    });
  });

  describe('tenant Turnstile settings', () => {
    function createServiceWithTurnstileHelpers() {
      const mockSecretCrypto = {
        encrypt: vi.fn().mockReturnValue('v1:encrypted-secret'),
        decryptStoredSecret: vi.fn().mockReturnValue('tenant-secret-key'),
      };
      const mockConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'NODE_ENV') {
            return 'staging';
          }
          return null;
        }),
      };

      return {
        mockConfigService,
        mockSecretCrypto,
        service: new SettingsApplicationService(
          mockSettingsRepository as unknown as SettingsRepository,
          mockSecretCrypto as unknown as SettingsSecretCryptoService,
          mockConfigService as unknown as ConfigService
        ),
      };
    }

    it('encrypts tenant Turnstile Secret Key replacement and never returns the raw value', async () => {
      const helpers = createServiceWithTurnstileHelpers();
      mockSettingsRepository.findTenantBySchema
        .mockResolvedValueOnce({
          id: 'tenant-123',
          settings: {},
        })
        .mockResolvedValueOnce({
          id: 'tenant-123',
          settings: {
            turnstileConfig: {
              siteKey: 'tenant-site-key',
              secretKeyEncrypted: 'v1:encrypted-secret',
              updatedAt: '2026-05-08T10:00:00.000Z',
            },
          },
        });
      mockSettingsRepository.updateTenantSettings.mockResolvedValue(undefined);

      const result = await helpers.service.updateTenantTurnstileSettings(testSchema, {
        siteKey: ' tenant-site-key ',
        secretKeyMutation: 'replace',
        secretKey: ' tenant-secret-key ',
      });

      expect(helpers.mockSecretCrypto.encrypt).toHaveBeenCalledWith('tenant-secret-key');
      expect(mockSettingsRepository.updateTenantSettings).toHaveBeenCalledWith(
        testSchema,
        expect.objectContaining({
          turnstileConfig: expect.objectContaining({
            siteKey: 'tenant-site-key',
            secretKeyEncrypted: 'v1:encrypted-secret',
          }),
        })
      );
      expect(result).toMatchObject({
        siteKey: 'tenant-site-key',
        effectiveSiteKey: 'tenant-site-key',
        source: 'tenant',
        secretKeyConfigured: true,
        providerReady: true,
        ready: true,
        secretKeyMasked: '********',
      });
      expect(JSON.stringify(mockSettingsRepository.updateTenantSettings.mock.calls)).not.toContain(
        'tenant-secret-key'
      );
      expect(JSON.stringify(result)).not.toContain('tenant-secret-key');
    });

    it('rejects empty Secret Key replacement instead of treating empty as clear', async () => {
      const helpers = createServiceWithTurnstileHelpers();
      mockSettingsRepository.findTenantBySchema.mockResolvedValue({
        id: 'tenant-123',
        settings: {},
      });

      await expect(
        helpers.service.updateTenantTurnstileSettings(testSchema, {
          secretKeyMutation: 'replace',
          secretKey: '',
        })
      ).rejects.toThrow(BadRequestException);
      expect(mockSettingsRepository.updateTenantSettings).not.toHaveBeenCalled();
    });

    it('clears tenant Turnstile Secret Key only through explicit clear mutation', async () => {
      const helpers = createServiceWithTurnstileHelpers();
      mockSettingsRepository.findTenantBySchema
        .mockResolvedValueOnce({
          id: 'tenant-123',
          settings: {
            turnstileConfig: {
              siteKey: 'tenant-site-key',
              secretKeyEncrypted: 'v1:old-secret',
            },
          },
        })
        .mockResolvedValueOnce({
          id: 'tenant-123',
          settings: {
            turnstileConfig: {
              siteKey: 'tenant-site-key',
              secretKeyEncrypted: null,
            },
          },
        });
      mockSettingsRepository.updateTenantSettings.mockResolvedValue(undefined);

      const result = await helpers.service.updateTenantTurnstileSettings(testSchema, {
        secretKeyMutation: 'clear',
      });

      expect(mockSettingsRepository.updateTenantSettings).toHaveBeenCalledWith(
        testSchema,
        expect.objectContaining({
          turnstileConfig: expect.objectContaining({
            secretKeyEncrypted: null,
          }),
        })
      );
      expect(result).toMatchObject({
        secretKeyConfigured: false,
        providerReady: false,
        ready: false,
        secretKeyMasked: null,
      });
    });

    it('falls back to platform Turnstile keys only when tenant config is absent', async () => {
      const helpers = createServiceWithTurnstileHelpers();
      helpers.mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') {
          return 'staging';
        }
        if (key === 'TURNSTILE_SITE_KEY') {
          return 'env-site-key';
        }
        if (key === 'TURNSTILE_SECRET_KEY') {
          return 'env-secret-key';
        }
        return null;
      });
      mockSettingsRepository.findTenantBySchema.mockResolvedValue({
        id: 'tenant-123',
        settings: {},
      });

      await expect(helpers.service.getTenantTurnstileSettings(testSchema)).resolves.toMatchObject({
        effectiveSiteKey: 'env-site-key',
        source: 'environment',
        providerReady: true,
        ready: true,
        secretKeyMasked: null,
      });
    });
  });

  describe('resetToInherited', () => {
    it('should throw BadRequestException for tenant scope', async () => {
      await expect(
        service.resetToInherited(testSchema, 'tenant', null, 'timezone', 'user-123')
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
        'user-123'
      );

      expect(mockSettingsRepository.upsertScopeSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: {},
        })
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
        'user-123'
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
        service.getEffectiveSettings(testSchema, 'talent', 'talent-123')
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
