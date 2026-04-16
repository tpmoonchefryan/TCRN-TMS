// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProfanityFilterService } from '../profanity-filter.service';

describe('ProfanityFilterService', () => {
  let service: ProfanityFilterService;

  const mockPrisma = {
    externalBlocklistPattern: {
      findMany: vi.fn(),
    },
    blocklistEntry: {
      findMany: vi.fn(),
    },
  };

  const mockDatabaseService = {
    getPrisma: vi.fn(() => mockPrisma),
  };

  const mockRedisService = {
    get: vi.fn(),
    set: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.externalBlocklistPattern.findMany.mockResolvedValue([]);
    mockPrisma.blocklistEntry.findMany.mockResolvedValue([]);
    mockRedisService.get.mockResolvedValue(null);
    mockRedisService.set.mockResolvedValue(undefined);

    service = new ProfanityFilterService(
      mockDatabaseService as never,
      mockRedisService as never,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes clean content when no rules match', async () => {
    const result = await service.filter('Hello this is a friendly message', 'talent-123', {
      profanityFilterEnabled: true,
      externalBlocklistEnabled: true,
    });

    expect(result.passed).toBe(true);
    expect(result.action).toBe('allow');
    expect(result.flags).toEqual([]);
    expect(result.score.category).toBe('safe');
  });

  it('rejects explicit profanity through the layered domain policy', async () => {
    const result = await service.filter('This is fucking rude, fuck that.', 'talent-123', {
      profanityFilterEnabled: true,
      externalBlocklistEnabled: false,
    });

    expect(result.passed).toBe(false);
    expect(result.action).toBe('reject');
    expect(result.flags.some((flag) => flag.startsWith('profanity:high:fuck'))).toBe(true);
    expect(result.matchedPatterns).toContain('fuck');
  });

  it('records zero-width evasion and escalates the result to flag', async () => {
    const result = await service.filter('He\u200Bllo there', 'talent-123', {
      profanityFilterEnabled: false,
      externalBlocklistEnabled: false,
    });

    expect(result.passed).toBe(true);
    expect(result.action).toBe('flag');
    expect(result.flags).toContain('evasion:zero_width');
    expect(result.score.score).toBeGreaterThan(0);
  });

  it('uses cached external patterns to reject matching domains', async () => {
    mockRedisService.get.mockResolvedValueOnce(JSON.stringify([
      {
        id: 'pattern-1',
        pattern: 'spam.com',
        patternType: 'domain',
        action: 'reject',
        replacement: null,
        severity: 'high',
      },
    ]));

    const result = await service.filter('Visit https://spam.com now', 'talent-123', {
      profanityFilterEnabled: false,
      externalBlocklistEnabled: true,
    });

    expect(result.passed).toBe(false);
    expect(result.action).toBe('reject');
    expect(result.flags).toContain('external:spam.com');
    expect(mockPrisma.externalBlocklistPattern.findMany).not.toHaveBeenCalled();
  });

  it('loads external patterns from the database and caches them on cache miss', async () => {
    mockPrisma.externalBlocklistPattern.findMany.mockResolvedValueOnce([
      {
        id: 'pattern-2',
        pattern: 'blocked.example',
        patternType: 'domain',
        action: 'flag',
        replacement: null,
        severity: 'medium',
      },
    ]);

    const result = await service.filter('https://blocked.example/path', 'talent-123', {
      profanityFilterEnabled: false,
      externalBlocklistEnabled: true,
    });

    expect(result.action).toBe('flag');
    expect(mockPrisma.externalBlocklistPattern.findMany).toHaveBeenCalledTimes(1);
    expect(mockRedisService.set).toHaveBeenCalledWith(
      'external_blocklist:talent-123',
      JSON.stringify([
        {
          id: 'pattern-2',
          pattern: 'blocked.example',
          patternType: 'domain',
          action: 'flag',
          replacement: null,
          severity: 'medium',
        },
      ]),
      300,
    );
  });

  it('matches custom blocklist entries from the database', async () => {
    mockPrisma.blocklistEntry.findMany.mockResolvedValueOnce([
      {
        pattern: 'forbidden',
        patternType: 'keyword',
        action: 'flag',
        severity: 'medium',
      },
    ]);

    const result = await service.filter('This contains forbidden language', 'talent-123', {
      profanityFilterEnabled: true,
      externalBlocklistEnabled: false,
    });

    expect(result.passed).toBe(true);
    expect(result.action).toBe('flag');
    expect(result.flags).toContain('blocklist:forbidden');
    expect(result.matchedPatterns).toContain('forbidden');
  });
});
