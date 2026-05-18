import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { createLocalizedText } from '@tcrn/shared';
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
  let mockCaptchaService: Pick<
    CaptchaService,
    'getTurnstileConfigStatus' | 'getTurnstileConfigStatusForTenant' | 'shouldRequireCaptcha' | 'verifyTurnstile'
  >;
  let mockRateLimitService: Pick<MarshmallowRateLimitService, 'checkRateLimit'>;
  let mockProfanityFilter: Pick<ProfanityFilterService, 'filter'>;
  let mockTechEventLog: Pick<TechEventLogService, 'log'>;
  let mockTrustScoreService: Pick<TrustScoreService, 'recordContentResult'>;
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
    mockCaptchaService = {
      getTurnstileConfigStatus: vi.fn().mockReturnValue({
        siteKeyConfigured: true,
        secretKeyConfigured: true,
        providerReady: true,
        runtimeBypass: false,
        environment: 'staging',
        ready: true,
      }),
      getTurnstileConfigStatusForTenant: vi.fn().mockResolvedValue({
        siteKey: 'tenant-site-key',
        source: 'tenant',
        siteKeyConfigured: true,
        secretKeyConfigured: true,
        providerReady: true,
        runtimeBypass: false,
        environment: 'staging',
        ready: true,
      }),
      shouldRequireCaptcha: vi.fn().mockResolvedValue({ required: false }),
      verifyTurnstile: vi.fn().mockResolvedValue(true),
    };
    mockRateLimitService = {
      checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
    };
    mockProfanityFilter = {
      filter: vi.fn().mockResolvedValue({
        action: 'allow',
        filteredContent: null,
        flags: [],
        score: 100,
      }),
    };
    mockTechEventLog = {
      log: vi.fn().mockResolvedValue(undefined),
    };
    mockTrustScoreService = {
      recordContentResult: vi.fn().mockResolvedValue(undefined),
    };

    service = new PublicMarshmallowService(
      mockDatabaseService as DatabaseService,
      mockProfanityFilter as ProfanityFilterService,
      mockRateLimitService as MarshmallowRateLimitService,
      mockCaptchaService as CaptchaService,
      {} as MarshmallowReactionService,
      mockTechEventLog as TechEventLogService,
      mockTrustScoreService as TrustScoreService,
      { get: vi.fn() } as any,
    );
  });

  function mockPublicSubmitLookup(configOverrides: Record<string, unknown> = {}) {
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
          thankYouText: 'Question received.',
          allowAnonymous: true,
          captchaMode: 'always',
          moderationEnabled: false,
          autoApprove: true,
          profanityFilterEnabled: false,
          externalBlocklistEnabled: false,
          maxMessageLength: 500,
          minMessageLength: 1,
          rateLimitPerIp: 1,
          rateLimitWindowHours: 1,
          reactionsEnabled: false,
          allowedReactions: [],
          theme: {},
          avatarUrl: null,
          termsContent: createLocalizedText({ en: '' }),
          privacyContent: createLocalizedText({ en: '' }),
          ...configOverrides,
        },
      ])
      .mockResolvedValueOnce([{ id: 'message-1', status: 'approved' }]);
  }

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
          termsContent: createLocalizedText({ en: '' }),
          privacyContent: createLocalizedText({ en: '' }),
        },
      ]);

    await expect(service.getConfig('demo')).resolves.toMatchObject({
      title: 'Ask Demo',
      allowAnonymous: true,
      captchaMode: 'never',
      turnstile: {
        environment: 'staging',
        providerReady: true,
        runtimeBypass: false,
        siteKeyConfigured: true,
        secretKeyConfigured: true,
        ready: true,
      },
    });
  });

  it('allows public submission without a Turnstile token when server-side runtime bypass is active', async () => {
    mockPublicSubmitLookup();
    (mockCaptchaService.shouldRequireCaptcha as ReturnType<typeof vi.fn>).mockResolvedValue({
      required: false,
      reason: 'runtime_bypass',
    });

    await expect(
      service.submitMessage(
        'demo',
        {
          content: 'Hello',
          isAnonymous: true,
          fingerprint: 'fp-test',
        },
        { ip: '127.0.0.1', userAgent: 'Mozilla/5.0 Chrome/120.0' },
      ),
    ).resolves.toMatchObject({
      id: 'message-1',
      message: 'Question received.',
    });
    expect(mockCaptchaService.verifyTurnstile).not.toHaveBeenCalled();
  });

  it('fails closed server-side when CAPTCHA is required and provider config is incomplete', async () => {
    mockPublicSubmitLookup();
    (mockCaptchaService.shouldRequireCaptcha as ReturnType<typeof vi.fn>).mockResolvedValue({
      required: true,
      unavailable: true,
      reason: 'turnstile_not_configured',
    });

    let caught: unknown;
    try {
      await service.submitMessage(
        'demo',
        {
          content: 'Hello',
          isAnonymous: true,
          fingerprint: 'fp-test',
        },
        { ip: '127.0.0.1', userAgent: 'Mozilla/5.0 Chrome/120.0' },
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ForbiddenException);
    expect((caught as ForbiddenException).getResponse()).toMatchObject({
      code: 'CAPTCHA_UNAVAILABLE',
      message: 'Submission is temporarily unavailable. Please try again later.',
    });
    expect(mockCaptchaService.verifyTurnstile).not.toHaveBeenCalled();
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

  it('does not expose responder email or internal ids in public message responses', async () => {
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
          termsContent: createLocalizedText({ en: '' }),
          privacyContent: createLocalizedText({ en: '' }),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: '550e8400-e29b-41d4-a716-446655440020',
          content: 'Happy birthday!',
          senderName: 'Fan',
          isAnonymous: false,
          isRead: false,
          replyContent: 'Thank you!',
          repliedAt: new Date('2026-05-11T00:00:00.000Z'),
          repliedById: '550e8400-e29b-41d4-a716-446655440100',
          repliedByName: null,
          repliedByAvatar: null,
          reactionCounts: { heart: 2 },
          isPinned: false,
          createdAt: new Date('2026-05-10T00:00:00.000Z'),
          imageUrl: null,
          imageUrls: [],
        },
      ]);

    await expect(
      service.getMessages('demo', { limit: 20 }),
    ).resolves.toMatchObject({
      messages: [
        {
          repliedBy: {
            displayName: 'Staff',
            avatarUrl: null,
          },
        },
      ],
    });

    const publicMessagesQuery = mockPrisma.$queryRawUnsafe.mock.calls[3]?.[0];
    expect(publicMessagesQuery).not.toContain('u.email');
  });

  it('rejects unauthenticated public mark-read state mutation', async () => {
    await expect(
      service.markAsRead('demo', '550e8400-e29b-41d4-a716-446655440010', {
        fingerprint: 'fp-demo',
        ip: '127.0.0.1',
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(mockTechEventLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'MARSHMALLOW_PUBLIC_MARK_READ_BLOCKED',
      }),
      expect.objectContaining({
        ipAddress: '127.0.0.1',
      }),
    );
  });
});
