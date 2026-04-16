// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TalentCustomDomainService } from '../../../talent';
import { MarshmallowConfigApplicationService } from '../../application/marshmallow-config.service';
import { MarshmallowConfigService } from '../marshmallow-config.service';

describe('MarshmallowConfigService', () => {
  let service: MarshmallowConfigService;
  let mockApplicationService: Partial<MarshmallowConfigApplicationService>;
  let mockTalentCustomDomainService: Partial<TalentCustomDomainService>;

  const mockConfig = {
    id: 'config-123',
    talentId: 'talent-123',
    isEnabled: true,
    title: null,
    welcomeText: null,
    placeholderText: '写下你想说的话...',
    thankYouText: '感谢你的提问！',
    allowAnonymous: true,
    captchaMode: 'auto',
    moderationEnabled: true,
    autoApprove: false,
    profanityFilterEnabled: true,
    externalBlocklistEnabled: true,
    maxMessageLength: 500,
    minMessageLength: 1,
    rateLimitPerIp: 5,
    rateLimitWindowHours: 1,
    reactionsEnabled: true,
    allowedReactions: [],
    theme: {},
    avatarUrl: null,
    termsContentEn: null,
    termsContentZh: null,
    termsContentJa: null,
    privacyContentEn: null,
    privacyContentZh: null,
    privacyContentJa: null,
    stats: {
      totalMessages: 0,
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      unreadCount: 0,
    },
    marshmallowUrl: 'http://localhost:3000/m/test',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockContext = {
    tenantId: 'tenant-123',
    userId: 'user-123',
    tenantSchema: 'tenant_test',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockApplicationService = {
      getOrCreate: vi.fn().mockResolvedValue(mockConfig),
      update: vi.fn().mockResolvedValue({ ...mockConfig, isEnabled: false, version: 2 }),
      findExistingConfig: vi.fn().mockResolvedValue(mockConfig),
    };

    mockTalentCustomDomainService = {
      setCustomDomain: vi.fn().mockResolvedValue({
        customDomain: 'marshmallow.example.com',
        token: 'token-123',
        txtRecord: 'tcrn-verify=token-123',
      }),
      verifyCustomDomain: vi.fn().mockResolvedValue({
        verified: true,
        message: 'Domain verified successfully',
      }),
    };

    service = new MarshmallowConfigService(
      mockApplicationService as MarshmallowConfigApplicationService,
      mockTalentCustomDomainService as TalentCustomDomainService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getOrCreate', () => {
    it('delegates config reads to the layered application service', async () => {
      const result = await service.getOrCreate('talent-123', 'tenant_test');

      expect(result.isEnabled).toBe(true);
      expect(result.captchaMode).toBe('auto');
      expect(mockApplicationService.getOrCreate).toHaveBeenCalledWith(
        'talent-123',
        'tenant_test',
      );
    });
  });

  describe('update', () => {
    it('delegates config updates to the layered application service', async () => {
      const dto = {
        version: 1,
        isEnabled: false,
      };

      await expect(
        service.update('talent-123', 'tenant_test', dto, mockContext),
      ).resolves.toMatchObject({
        isEnabled: false,
        version: 2,
      });

      expect(mockApplicationService.update).toHaveBeenCalledWith(
        'talent-123',
        'tenant_test',
        dto,
        mockContext,
      );
    });
  });

  describe('setCustomDomain', () => {
    it('delegates marshmallow custom-domain writes to the talent custom-domain owner', async () => {
      const response = await service.setCustomDomain(
        'talent-123',
        'marshmallow.example.com',
        mockContext,
      );

      expect(response.customDomain).toBe('marshmallow.example.com');
      expect(mockApplicationService.getOrCreate).toHaveBeenCalledWith(
        'talent-123',
        'tenant_test',
      );
      expect(mockTalentCustomDomainService.setCustomDomain).toHaveBeenCalledWith(
        'talent-123',
        'tenant_test',
        'marshmallow.example.com',
      );
    });

    it('maps duplicate-domain conflicts back to the marshmallow route contract', async () => {
      vi.mocked(mockTalentCustomDomainService.setCustomDomain).mockRejectedValueOnce(
        new BadRequestException({
          code: 'RES_ALREADY_EXISTS',
        }),
      );

      await expect(
        service.setCustomDomain('talent-123', 'marshmallow.example.com', mockContext),
      ).rejects.toMatchObject({
        response: {
          code: 'RES_ALREADY_EXISTS',
        },
      });
    });
  });

  describe('verifyCustomDomain', () => {
    it('checks config existence before delegating DNS verification to talent custom-domain ownership', async () => {
      await expect(
        service.verifyCustomDomain('talent-123', mockContext),
      ).resolves.toEqual({
        verified: true,
        message: 'Domain verified successfully',
      });

      expect(mockApplicationService.findExistingConfig).toHaveBeenCalledWith(
        'talent-123',
        'tenant_test',
      );
      expect(
        mockTalentCustomDomainService.verifyCustomDomain,
      ).toHaveBeenCalledWith('talent-123', 'tenant_test');
    });
  });
});
