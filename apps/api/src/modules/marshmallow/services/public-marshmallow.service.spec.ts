import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../database';
import { TechEventLogService } from '../../log';
import { CaptchaService } from './captcha.service';
import { MarshmallowRateLimitService } from './marshmallow-rate-limit.service';
import { MarshmallowReactionService } from './marshmallow-reaction.service';
import { ProfanityFilterService } from './profanity-filter.service';
import { PublicMarshmallowService } from './public-marshmallow.service';
import { TrustScoreService } from './trust-score.service';

describe('PublicMarshmallowService', () => {
  let service: PublicMarshmallowService;
  let mockDatabaseService: Pick<DatabaseService, 'getPrisma'>;
  let mockPrisma: {
    $queryRawUnsafe: ReturnType<typeof vi.fn>;
    $executeRawUnsafe: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = {
      $queryRawUnsafe: vi.fn(),
      $executeRawUnsafe: vi.fn(),
    };

    mockDatabaseService = {
      getPrisma: vi.fn().mockReturnValue(mockPrisma),
    };

    service = new PublicMarshmallowService(
      mockDatabaseService as DatabaseService,
      {} as ProfanityFilterService,
      {} as MarshmallowRateLimitService,
      {} as CaptchaService,
      {} as MarshmallowReactionService,
      {} as TechEventLogService,
      {} as TrustScoreService,
      { get: vi.fn() } as any,
    );
  });

  it('filters public config lookup by published talent lifecycle', async () => {
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ schemaName: 'tenant_demo' }])
      .mockResolvedValueOnce([]);

    await expect(service.getConfig('demo')).rejects.toThrow(NotFoundException);
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(`AND lifecycle_status = 'published'`),
      'demo',
    );
  });

  it('returns captcha mode in the public config contract', async () => {
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ schemaName: 'tenant_demo' }])
      .mockResolvedValueOnce([
        {
          id: 'talent-1',
          displayName: 'Demo Talent',
          avatarUrl: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'config-1',
          isEnabled: true,
          title: 'Ask Demo',
          welcomeText: 'Welcome',
          placeholderText: 'Ask away',
          thankYouText: 'Thanks',
          allowAnonymous: true,
          captchaMode: 'never',
          moderationEnabled: false,
          autoApprove: true,
          profanityFilterEnabled: false,
          externalBlocklistEnabled: false,
          maxMessageLength: 500,
          minMessageLength: 1,
          rateLimitPerIp: 1,
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
        },
      ]);

    await expect(service.getConfig('demo')).resolves.toMatchObject({
      title: 'Ask Demo',
      allowAnonymous: true,
      captchaMode: 'never',
    });
  });

  it('requires enabled config and published talent when marking read via SSO', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

    await expect(
      service.markAsReadAuth('demo', '550e8400-e29b-41d4-a716-446655440010', {
        userId: 'user-1',
        displayName: 'Demo User',
        talentId: '550e8400-e29b-41d4-a716-446655440000',
        tenantSchema: 'tenant_demo',
        ip: '127.0.0.1',
      }),
    ).rejects.toThrow(NotFoundException);

    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining(`AND c.is_enabled = true`),
      '550e8400-e29b-41d4-a716-446655440010',
      'demo',
    );
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining(`AND t.lifecycle_status = 'published'`),
      '550e8400-e29b-41d4-a716-446655440010',
      'demo',
    );
  });
});
