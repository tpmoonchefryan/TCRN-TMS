import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@tcrn/database';
import { createLocalizedText } from '@tcrn/shared';

import { TalentWriteRepository } from './talent-write.repository';

vi.mock('@tcrn/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
  },
}));

const mockPrisma = prisma as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
};

describe('TalentWriteRepository create', () => {
  const repository = new TalentWriteRepository();

  beforeEach(() => {
    mockPrisma.$queryRawUnsafe.mockReset();
  });

  it('binds actor UUID and settings JSON to the correct INSERT placeholders', async () => {
    const now = new Date('2026-05-24T12:00:00.000Z');
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      {
        artistStageId: '33333333-3333-4333-8333-333333333333',
        avatarUrl: null,
        code: 'SORA',
        createdAt: now,
        description: createLocalizedText({ en: 'Sora' }),
        displayName: 'Sora',
        extraData: null,
        homepagePath: null,
        id: '55555555-5555-4555-8555-555555555555',
        isActive: true,
        lifecycleStatus: 'published',
        name: createLocalizedText({ en: 'Sora' }),
        path: '/SORA/',
        profileStoreId: '22222222-2222-4222-8222-222222222222',
        publishedAt: now,
        publishedBy: '44444444-4444-4444-8444-444444444444',
        settings: {
          inheritTimezone: false,
          marshmallowEnabled: true,
        },
        subsidiaryId: null,
        timezone: 'Asia/Tokyo',
        updatedAt: now,
        version: 1,
      },
    ]);

    await expect(
      repository.create(
        'tenant_test',
        {
          artistStageId: '33333333-3333-4333-8333-333333333333',
          code: 'SORA',
          displayName: 'Sora',
          lifecycleStatus: 'published',
          name: createLocalizedText({ en: 'Sora' }),
          path: '/SORA/',
          profileStoreId: '22222222-2222-4222-8222-222222222222',
          settings: {
            inheritTimezone: false,
            marshmallowEnabled: true,
          },
        },
        '44444444-4444-4444-8444-444444444444'
      )
    ).resolves.toMatchObject({
      artistStageId: '33333333-3333-4333-8333-333333333333',
      lifecycleStatus: 'published',
      publishedBy: '44444444-4444-4444-8444-444444444444',
      settings: {
        inheritTimezone: false,
        marshmallowEnabled: true,
      },
    });

    const [sql, ...params] = mockPrisma.$queryRawUnsafe.mock.calls[0];

    expect(String(sql)).toContain(
      "CASE WHEN $14::varchar = 'published' THEN $15::uuid ELSE NULL END, $16::jsonb"
    );
    expect(String(sql)).toContain('created_by, updated_by');
    expect(params[14]).toBe('44444444-4444-4444-8444-444444444444');
    expect(JSON.parse(params[15] as string)).toEqual({
      inheritTimezone: false,
      marshmallowEnabled: true,
    });
  });
});
