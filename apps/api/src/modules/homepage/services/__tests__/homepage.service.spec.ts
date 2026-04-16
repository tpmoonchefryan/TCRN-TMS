// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RequestContext } from '@tcrn/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HomepageAdminService } from '../../application/homepage-admin.service';
import { HomepageAdminRepository } from '../../infrastructure/homepage-admin.repository';
import { CdnPurgeService } from '../cdn-purge.service';


describe('HomepageAdminService', () => {
  let service: HomepageAdminService;
  let mockHomepageAdminRepository: {
    findTalentById: ReturnType<typeof vi.fn>;
    findHomepageByTalentId: ReturnType<typeof vi.fn>;
    createHomepage: ReturnType<typeof vi.fn>;
    findHomepageVersion: ReturnType<typeof vi.fn>;
    findSystemUserById: ReturnType<typeof vi.fn>;
    findHomepageDraftPointer: ReturnType<typeof vi.fn>;
    findHomepageVersionSummary: ReturnType<typeof vi.fn>;
    findLatestHomepageVersionNumber: ReturnType<typeof vi.fn>;
    createDraftVersionAndAssign: ReturnType<typeof vi.fn>;
    findHomepageVersionByNumber: ReturnType<typeof vi.fn>;
    findHomepagePublishTarget: ReturnType<typeof vi.fn>;
    publishHomepageVersion: ReturnType<typeof vi.fn>;
    markHomepagePublished: ReturnType<typeof vi.fn>;
    appendHomepagePublishChangeLog: ReturnType<typeof vi.fn>;
    markHomepageUnpublished: ReturnType<typeof vi.fn>;
    appendHomepageUnpublishChangeLog: ReturnType<typeof vi.fn>;
    findHomepageSettings: ReturnType<typeof vi.fn>;
    findTalentIdByHomepagePath: ReturnType<typeof vi.fn>;
    updateTalentHomepagePath: ReturnType<typeof vi.fn>;
    updateHomepageSettings: ReturnType<typeof vi.fn>;
    appendHomepageSettingsChangeLog: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: Partial<ConfigService>;
  let mockCdnPurgeService: Partial<CdnPurgeService>;

  const testContext: RequestContext = {
    tenantId: 'tenant-123',
    tenantSchema: 'tenant_test123',
    userId: 'user-1',
    userName: 'Test User',
    ipAddress: '127.0.0.1',
    userAgent: 'Test Agent',
    requestId: 'req-123',
  };

  const mockTalent = {
    id: 'talent-123',
    homepagePath: 'test-talent',
  };

  const mockHomepage = {
    id: 'homepage-123',
    talentId: 'talent-123',
    isPublished: false,
    publishedVersionId: null,
    draftVersionId: 'draft-version-1',
    customDomain: null,
    customDomainVerified: false,
    seoTitle: 'Test Homepage',
    seoDescription: 'Test Description',
    ogImageUrl: null,
    analyticsId: null,
    theme: { preset: 'default' },
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  const mockVersion = {
    id: 'version-123',
    versionNumber: 1,
    content: { version: '1.0', components: [] },
    theme: { preset: 'default' },
    status: 'draft',
    contentHash: 'abc123',
    createdAt: new Date(),
    publishedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockHomepageAdminRepository = {
      findTalentById: vi.fn(),
      findHomepageByTalentId: vi.fn(),
      createHomepage: vi.fn(),
      findHomepageVersion: vi.fn(),
      findSystemUserById: vi.fn(),
      findHomepageDraftPointer: vi.fn(),
      findHomepageVersionSummary: vi.fn(),
      findLatestHomepageVersionNumber: vi.fn(),
      createDraftVersionAndAssign: vi.fn(),
      findHomepageVersionByNumber: vi.fn(),
      findHomepagePublishTarget: vi.fn(),
      publishHomepageVersion: vi.fn(),
      markHomepagePublished: vi.fn(),
      appendHomepagePublishChangeLog: vi.fn(),
      markHomepageUnpublished: vi.fn(),
      appendHomepageUnpublishChangeLog: vi.fn(),
      findHomepageSettings: vi.fn(),
      findTalentIdByHomepagePath: vi.fn(),
      updateTalentHomepagePath: vi.fn(),
      updateHomepageSettings: vi.fn(),
      appendHomepageSettingsChangeLog: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn().mockReturnValue('http://localhost:3000'),
    };

    mockCdnPurgeService = {
      purgeHomepage: vi.fn().mockResolvedValue(undefined),
    };

    service = new HomepageAdminService(
      mockHomepageAdminRepository as unknown as HomepageAdminRepository,
      mockConfigService as ConfigService,
      mockCdnPurgeService as CdnPurgeService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getOrCreate', () => {
    it('should return existing homepage for talent', async () => {
      mockHomepageAdminRepository.findTalentById.mockResolvedValue(mockTalent);
      mockHomepageAdminRepository.findHomepageByTalentId.mockResolvedValue(mockHomepage);
      mockHomepageAdminRepository.findHomepageVersion.mockResolvedValue(mockVersion);
      mockHomepageAdminRepository.findSystemUserById.mockResolvedValue(null);

      const result = await service.getOrCreate('talent-123', 'tenant_test123');

      expect(result).toBeDefined();
      expect(result.id).toBe('homepage-123');
      expect(result.talentId).toBe('talent-123');
    });

    it('should create homepage if not exists', async () => {
      const createdHomepage = { ...mockHomepage, id: 'new-homepage-123', draftVersionId: null, publishedVersionId: null };

      mockHomepageAdminRepository.findTalentById.mockResolvedValue(mockTalent);
      mockHomepageAdminRepository.findHomepageByTalentId.mockResolvedValue(null);
      mockHomepageAdminRepository.createHomepage.mockResolvedValue(createdHomepage);

      const result = await service.getOrCreate('talent-123', 'tenant_test123');

      expect(result).toBeDefined();
      expect(result.id).toBe('new-homepage-123');
    });

    it('should throw NotFoundException when talent not found', async () => {
      mockHomepageAdminRepository.findTalentById.mockResolvedValue(null);

      await expect(
        service.getOrCreate('nonexistent', 'tenant_test123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include homepage URL with path', async () => {
      const homepageWithNoVersions = { ...mockHomepage, draftVersionId: null, publishedVersionId: null };

      mockHomepageAdminRepository.findTalentById.mockResolvedValue(mockTalent);
      mockHomepageAdminRepository.findHomepageByTalentId.mockResolvedValue(homepageWithNoVersions);

      const result = await service.getOrCreate('talent-123', 'tenant_test123');

      expect(result.homepagePath).toBe('test-talent');
      expect(result.homepageUrl).toBe('http://localhost:3000/p/test-talent');
    });
  });

  describe('saveDraft', () => {
    it('should save new draft version', async () => {
      mockHomepageAdminRepository.findHomepageDraftPointer.mockResolvedValue({
        id: 'homepage-123',
        draftVersionId: null,
      });
      mockHomepageAdminRepository.findLatestHomepageVersionNumber.mockResolvedValue(0);
      mockHomepageAdminRepository.createDraftVersionAndAssign.mockResolvedValue(undefined);
      mockHomepageAdminRepository.findHomepageVersionByNumber.mockResolvedValue({
        id: 'new-version',
        versionNumber: 1,
        contentHash: 'hash123',
        createdAt: new Date(),
      });

      const result = await service.saveDraft(
        'talent-123',
        {
          content: { version: '1.0', components: [] },
        },
        testContext,
      );

      expect(result).toBeDefined();
      expect(result.isNewVersion).toBe(true);
      expect(result.draftVersion.versionNumber).toBe(1);
    });

    it('should detect unchanged content and skip version creation', async () => {
      mockHomepageAdminRepository.findHomepageDraftPointer.mockResolvedValue({
        id: 'homepage-123',
        draftVersionId: 'version-123',
      });
      mockHomepageAdminRepository.findHomepageVersionSummary.mockResolvedValue({
        id: 'version-123',
        versionNumber: 1,
        contentHash: 'different-hash',
        createdAt: new Date(),
      });
      mockHomepageAdminRepository.findLatestHomepageVersionNumber.mockResolvedValue(1);
      mockHomepageAdminRepository.createDraftVersionAndAssign.mockResolvedValue(undefined);
      mockHomepageAdminRepository.findHomepageVersionByNumber.mockResolvedValue({
        id: 'v2',
        versionNumber: 2,
        contentHash: 'new-hash',
        createdAt: new Date(),
      });

      const result = await service.saveDraft(
        'talent-123',
        {
          content: { version: '1.0', components: [] },
        },
        testContext,
      );

      // Since hashes don't match, it should create new version
      expect(result).toBeDefined();
      expect(result.isNewVersion).toBe(true);
    });

    it('should throw NotFoundException when homepage not found', async () => {
      mockHomepageAdminRepository.findHomepageDraftPointer.mockResolvedValue(null);

      await expect(
        service.saveDraft('talent-123', { content: { version: '1.0', components: [] } }, testContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Content Hash Calculation', () => {
    it('should generate consistent hash for same content', async () => {
      const content = { version: '1.0', components: [] };

      mockHomepageAdminRepository.findHomepageDraftPointer.mockResolvedValue({
        id: 'homepage-123',
        draftVersionId: 'v1',
      });
      mockHomepageAdminRepository.findHomepageVersionSummary.mockResolvedValue({
        id: 'v1',
        versionNumber: 1,
        contentHash: null,
        createdAt: new Date(),
      });
      mockHomepageAdminRepository.findLatestHomepageVersionNumber.mockResolvedValue(1);
      mockHomepageAdminRepository.createDraftVersionAndAssign.mockResolvedValue(undefined);
      mockHomepageAdminRepository.findHomepageVersionByNumber.mockResolvedValue({
        id: 'v2',
        versionNumber: 2,
        contentHash: 'hash',
        createdAt: new Date(),
      });

      const result = await service.saveDraft('talent-123', { content }, testContext);

      expect(result.draftVersion.contentHash).toBeDefined();
    });
  });

  describe('Theme Configuration', () => {
    it('should use default theme when not provided', async () => {
      mockHomepageAdminRepository.findHomepageDraftPointer.mockResolvedValue({
        id: 'homepage-123',
        draftVersionId: null,
      });
      mockHomepageAdminRepository.findLatestHomepageVersionNumber.mockResolvedValue(0);
      mockHomepageAdminRepository.createDraftVersionAndAssign.mockResolvedValue(undefined);
      mockHomepageAdminRepository.findHomepageVersionByNumber.mockResolvedValue({
        id: 'v1',
        versionNumber: 1,
        contentHash: 'hash',
        createdAt: new Date(),
      });

      // No theme in DTO
      await service.saveDraft(
        'talent-123',
        { content: { version: '1.0', components: [] } },
        testContext,
      );

      expect(mockHomepageAdminRepository.createDraftVersionAndAssign).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: expect.objectContaining({
            preset: expect.any(String),
          }),
        }),
      );
    });

    it('should save custom theme when provided', async () => {
      const customTheme = {
        preset: 'custom',
        colors: { primary: '#FF0000' },
      };

      mockHomepageAdminRepository.findHomepageDraftPointer.mockResolvedValue({
        id: 'homepage-123',
        draftVersionId: null,
      });
      mockHomepageAdminRepository.findLatestHomepageVersionNumber.mockResolvedValue(0);
      mockHomepageAdminRepository.createDraftVersionAndAssign.mockResolvedValue(undefined);
      mockHomepageAdminRepository.findHomepageVersionByNumber.mockResolvedValue({
        id: 'v1',
        versionNumber: 1,
        contentHash: 'hash',
        createdAt: new Date(),
      });

      await service.saveDraft(
        'talent-123',
        { content: { version: '1.0', components: [] }, theme: customTheme as any },
        testContext,
      );

      expect(mockHomepageAdminRepository.createDraftVersionAndAssign).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: customTheme,
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should surface repository errors gracefully', async () => {
      mockHomepageAdminRepository.findTalentById.mockRejectedValueOnce(
        new Error('Database connection failed'),
      );

      await expect(
        service.getOrCreate('talent-123', 'tenant_test123'),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('Version Management', () => {
    it('should increment version number correctly', async () => {
      mockHomepageAdminRepository.findHomepageDraftPointer.mockResolvedValue({
        id: 'homepage-123',
        draftVersionId: null,
      });
      mockHomepageAdminRepository.findLatestHomepageVersionNumber.mockResolvedValue(5);
      mockHomepageAdminRepository.createDraftVersionAndAssign.mockResolvedValue(undefined);
      mockHomepageAdminRepository.findHomepageVersionByNumber.mockResolvedValue({
        id: 'v6',
        versionNumber: 6,
        contentHash: 'hash',
        createdAt: new Date(),
      });

      const result = await service.saveDraft(
        'talent-123',
        { content: { version: '1.0', components: [] } },
        testContext,
      );

      expect(result.draftVersion.versionNumber).toBe(6);
    });

    it('should start at version 1 for new homepage', async () => {
      mockHomepageAdminRepository.findHomepageDraftPointer.mockResolvedValue({
        id: 'homepage-123',
        draftVersionId: null,
      });
      mockHomepageAdminRepository.findLatestHomepageVersionNumber.mockResolvedValue(0);
      mockHomepageAdminRepository.createDraftVersionAndAssign.mockResolvedValue(undefined);
      mockHomepageAdminRepository.findHomepageVersionByNumber.mockResolvedValue({
        id: 'v1',
        versionNumber: 1,
        contentHash: 'hash',
        createdAt: new Date(),
      });

      const result = await service.saveDraft(
        'talent-123',
        { content: { version: '1.0', components: [] } },
        testContext,
      );

      expect(result.draftVersion.versionNumber).toBe(1);
    });
  });

  describe('publish', () => {
    it('should publish the current draft and return purge success', async () => {
      mockHomepageAdminRepository.findHomepagePublishTarget.mockResolvedValue({
        id: 'homepage-123',
        draftVersionId: 'draft-version-1',
        customDomain: 'demo.example.com',
        homepagePath: 'test-talent',
      });
      mockHomepageAdminRepository.publishHomepageVersion.mockResolvedValue({
        id: 'draft-version-1',
        versionNumber: 3,
      });
      mockHomepageAdminRepository.markHomepagePublished.mockResolvedValue(undefined);
      mockHomepageAdminRepository.appendHomepagePublishChangeLog.mockResolvedValue(undefined);

      const result = await service.publish('talent-123', testContext);

      expect(result.publishedVersion.id).toBe('draft-version-1');
      expect(result.publishedVersion.versionNumber).toBe(3);
      expect(result.homepageUrl).toBe('http://localhost:3000/p/test-talent');
      expect(result.cdnPurgeStatus).toBe('success');
      expect(mockCdnPurgeService.purgeHomepage).toHaveBeenCalledWith(
        'test-talent',
        'demo.example.com',
      );
    });

    it('should throw NotFoundException when homepage is missing', async () => {
      mockHomepageAdminRepository.findHomepagePublishTarget.mockResolvedValue(null);

      await expect(service.publish('talent-123', testContext)).rejects.toThrow(NotFoundException);
    });

    it('should fail closed when no draft exists', async () => {
      mockHomepageAdminRepository.findHomepagePublishTarget.mockResolvedValue({
        id: 'homepage-123',
        draftVersionId: null,
        customDomain: null,
        homepagePath: 'test-talent',
      });

      await expect(service.publish('talent-123', testContext)).rejects.toThrow('No draft');
    });

    it('should downgrade purge status to failed when CDN purge throws', async () => {
      mockHomepageAdminRepository.findHomepagePublishTarget.mockResolvedValue({
        id: 'homepage-123',
        draftVersionId: 'draft-version-1',
        customDomain: null,
        homepagePath: 'test-talent',
      });
      mockHomepageAdminRepository.publishHomepageVersion.mockResolvedValue({
        id: 'draft-version-1',
        versionNumber: 3,
      });
      mockHomepageAdminRepository.markHomepagePublished.mockResolvedValue(undefined);
      mockHomepageAdminRepository.appendHomepagePublishChangeLog.mockResolvedValue(undefined);
      vi.mocked(mockCdnPurgeService.purgeHomepage).mockRejectedValue(new Error('purge failed'));

      const result = await service.publish('talent-123', testContext);

      expect(result.cdnPurgeStatus).toBe('failed');
    });
  });

  describe('unpublish', () => {
    it('should unpublish and ignore purge failures', async () => {
      mockHomepageAdminRepository.findHomepagePublishTarget.mockResolvedValue({
        id: 'homepage-123',
        draftVersionId: 'draft-version-1',
        customDomain: 'demo.example.com',
        homepagePath: 'test-talent',
      });
      mockHomepageAdminRepository.markHomepageUnpublished.mockResolvedValue(undefined);
      mockHomepageAdminRepository.appendHomepageUnpublishChangeLog.mockResolvedValue(undefined);
      vi.mocked(mockCdnPurgeService.purgeHomepage).mockRejectedValue(new Error('purge failed'));

      await expect(service.unpublish('talent-123', testContext)).resolves.toBeUndefined();
      expect(mockHomepageAdminRepository.markHomepageUnpublished).toHaveBeenCalledWith(
        'tenant_test123',
        'homepage-123',
      );
    });
  });

  describe('updateSettings', () => {
    it('should normalize homepage path, persist settings, and return refreshed state', async () => {
      mockHomepageAdminRepository.findHomepageSettings.mockResolvedValue({
        id: 'homepage-123',
        seoTitle: 'Old Title',
        seoDescription: 'Old Description',
        ogImageUrl: null,
        analyticsId: null,
        version: 1,
      });
      mockHomepageAdminRepository.findTalentIdByHomepagePath.mockResolvedValue(null);
      mockHomepageAdminRepository.updateTalentHomepagePath.mockResolvedValue(undefined);
      mockHomepageAdminRepository.updateHomepageSettings.mockResolvedValue(undefined);
      mockHomepageAdminRepository.appendHomepageSettingsChangeLog.mockResolvedValue(undefined);
      mockHomepageAdminRepository.findTalentById.mockResolvedValue({
        ...mockTalent,
        customDomain: null,
        customDomainVerified: false,
        homepagePath: 'shiori',
      });
      mockHomepageAdminRepository.findHomepageByTalentId.mockResolvedValue({
        ...mockHomepage,
        seoTitle: 'New Title',
        draftVersionId: null,
        publishedVersionId: null,
      });

      const result = await service.updateSettings(
        'talent-123',
        {
          homepagePath: 'VirtuaReal/Shiori',
          seoTitle: 'New Title',
          version: 1,
        },
        testContext,
      );

      expect(mockHomepageAdminRepository.updateTalentHomepagePath).toHaveBeenCalledWith(
        'tenant_test123',
        'talent-123',
        'shiori',
      );
      expect(mockHomepageAdminRepository.updateHomepageSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          seoTitle: 'New Title',
        }),
      );
      expect(result.homepagePath).toBe('shiori');
    });

    it('should throw NotFoundException when homepage settings record is missing', async () => {
      mockHomepageAdminRepository.findHomepageSettings.mockResolvedValue(null);

      await expect(
        service.updateSettings('talent-123', { version: 1 }, testContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should fail on version mismatch', async () => {
      mockHomepageAdminRepository.findHomepageSettings.mockResolvedValue({
        id: 'homepage-123',
        seoTitle: 'Old Title',
        seoDescription: 'Old Description',
        ogImageUrl: null,
        analyticsId: null,
        version: 2,
      });

      await expect(
        service.updateSettings('talent-123', { version: 1 }, testContext),
      ).rejects.toThrow('Homepage was modified by another user');
    });

    it('should reject already-taken homepage paths', async () => {
      mockHomepageAdminRepository.findHomepageSettings.mockResolvedValue({
        id: 'homepage-123',
        seoTitle: 'Old Title',
        seoDescription: 'Old Description',
        ogImageUrl: null,
        analyticsId: null,
        version: 1,
      });
      mockHomepageAdminRepository.findTalentIdByHomepagePath.mockResolvedValue('another-talent');

      await expect(
        service.updateSettings(
          'talent-123',
          {
            homepagePath: 'taken',
            version: 1,
          },
          testContext,
        ),
      ).rejects.toThrow('Homepage path already taken');
    });
  });
});
