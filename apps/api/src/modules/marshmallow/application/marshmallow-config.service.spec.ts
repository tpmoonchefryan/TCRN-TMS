// SPDX-License-Identifier: Apache-2.0
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createLocalizedText } from '@tcrn/shared';

import { ChangeLogService } from '../../log';
import { MarshmallowConfigRepository } from '../infrastructure/marshmallow-config.repository';
import { MarshmallowConfigApplicationService } from './marshmallow-config.service';

describe('MarshmallowConfigApplicationService', () => {
  let service: MarshmallowConfigApplicationService;

  const mockRepository = {
    findConfigByTalentId: vi.fn(),
    findActiveTalent: vi.fn(),
    insertDefaultConfig: vi.fn(),
    findStatsByConfigId: vi.fn(),
    findTenantCodeBySchema: vi.fn(),
    findTalentRouteRecord: vi.fn(),
    updateConfigFields: vi.fn(),
  };

  const mockChangeLogService = {
    createDirect: vi.fn(),
  };

  const mockConfigService = {
    get: vi.fn((key: string, fallback?: string) => {
      if (key === 'APP_URL') {
        return fallback ?? 'http://localhost:3000';
      }

      if (key === 'TURNSTILE_SITE_KEY') {
        return 'site-key';
      }

      if (key === 'TURNSTILE_SECRET_KEY') {
        return 'secret-key';
      }

      return fallback;
    }),
  };

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
    termsContent: createLocalizedText({ en: '' }),
    privacyContent: createLocalizedText({ en: '' }),
    createdAt: new Date('2026-04-13T09:00:00.000Z'),
    updatedAt: new Date('2026-04-13T09:00:00.000Z'),
    version: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigService.get.mockImplementation((key: string, fallback?: string) => {
      if (key === 'APP_URL') {
        return fallback ?? 'http://localhost:3000';
      }

      if (key === 'TURNSTILE_SITE_KEY') {
        return 'site-key';
      }

      if (key === 'TURNSTILE_SECRET_KEY') {
        return 'secret-key';
      }

      return fallback;
    });
    service = new MarshmallowConfigApplicationService(
      mockRepository as unknown as MarshmallowConfigRepository,
      mockChangeLogService as unknown as ChangeLogService,
      mockConfigService as unknown as ConfigService
    );
  });

  it('creates a default config from active talent settings when none exists', async () => {
    mockRepository.findConfigByTalentId.mockResolvedValueOnce(null);
    mockRepository.findActiveTalent.mockResolvedValue({
      id: 'talent-123',
      homepagePath: 'demo',
      settings: { marshmallowEnabled: false },
    });
    mockRepository.insertDefaultConfig.mockResolvedValue(mockConfig);
    mockRepository.findStatsByConfigId.mockResolvedValue({
      total: 0n,
      pending: 0n,
      approved: 0n,
      rejected: 0n,
      unread: 0n,
    });
    mockRepository.findTenantCodeBySchema.mockResolvedValue('tenant-code');
    mockRepository.findTalentRouteRecord.mockResolvedValue({
      code: 'TALENT_123',
      homepagePath: 'demo',
    });

    await expect(service.getOrCreate('talent-123', 'tenant_test')).resolves.toMatchObject({
      id: 'config-123',
      talentId: 'talent-123',
      stats: {
        totalMessages: 0,
        pendingCount: 0,
      },
      turnstile: {
        siteKeyConfigured: true,
        secretKeyConfigured: true,
        ready: true,
      },
      marshmallowUrl: 'http://localhost:3000/tenant-code/talent_123/marshmallow',
    });
  });

  it('returns non-secret Turnstile runtime status with test-runtime bypass readiness', async () => {
    mockConfigService.get.mockImplementation((key: string, fallback?: string) => {
      if (key === 'APP_URL') {
        return fallback ?? 'http://localhost:3000';
      }

      if (key === 'TURNSTILE_SITE_KEY') {
        return 'site-key';
      }

      if (key === 'TURNSTILE_SECRET_KEY') {
        return '';
      }

      return fallback;
    });
    mockRepository.findConfigByTalentId.mockResolvedValue(mockConfig);
    mockRepository.findStatsByConfigId.mockResolvedValue({
      total: 0n,
      pending: 0n,
      approved: 0n,
      rejected: 0n,
      unread: 0n,
    });
    mockRepository.findTenantCodeBySchema.mockResolvedValue('tenant-code');
    mockRepository.findTalentRouteRecord.mockResolvedValue({
      code: 'TALENT_123',
      homepagePath: 'demo',
    });

    await expect(service.getOrCreate('talent-123', 'tenant_test')).resolves.toMatchObject({
      turnstile: {
        environment: 'test',
        siteKeyConfigured: true,
        secretKeyConfigured: false,
        runtimeBypass: true,
        ready: true,
      },
    });
  });

  it('throws when the target talent does not exist while creating config', async () => {
    mockRepository.findConfigByTalentId.mockResolvedValueOnce(null);
    mockRepository.findActiveTalent.mockResolvedValue(null);

    await expect(service.getOrCreate('missing-talent', 'tenant_test')).rejects.toThrow(
      NotFoundException
    );
  });

  it('updates config fields and writes a change log through the layered boundaries', async () => {
    mockRepository.findConfigByTalentId
      .mockResolvedValueOnce(mockConfig)
      .mockResolvedValueOnce({ ...mockConfig, isEnabled: false, version: 2 });
    mockRepository.updateConfigFields.mockResolvedValue(undefined);
    mockRepository.findStatsByConfigId.mockResolvedValue({
      total: 0n,
      pending: 0n,
      approved: 0n,
      rejected: 0n,
      unread: 0n,
    });
    mockRepository.findTenantCodeBySchema.mockResolvedValue('tenant-code');
    mockRepository.findTalentRouteRecord.mockResolvedValue({
      code: 'TALENT_123',
      homepagePath: 'demo',
    });
    mockChangeLogService.createDirect.mockResolvedValue(undefined);

    await expect(
      service.update(
        'talent-123',
        'tenant_test',
        { version: 1, isEnabled: false },
        {
          tenantId: 'tenant-123',
          tenantSchema: 'tenant_test',
          userId: 'user-123',
        }
      )
    ).resolves.toMatchObject({
      id: 'config-123',
      isEnabled: false,
      version: 2,
    });

    expect(mockRepository.updateConfigFields).toHaveBeenCalled();
    expect(mockChangeLogService.createDirect).toHaveBeenCalled();
  });

  it('fails closed on optimistic-lock mismatch', async () => {
    mockRepository.findConfigByTalentId.mockResolvedValue(mockConfig);

    await expect(
      service.update(
        'talent-123',
        'tenant_test',
        { version: 2, isEnabled: false },
        {
          tenantId: 'tenant-123',
          tenantSchema: 'tenant_test',
          userId: 'user-123',
        }
      )
    ).rejects.toThrow(ConflictException);
  });
});
