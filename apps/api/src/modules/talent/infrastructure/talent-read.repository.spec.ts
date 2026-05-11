import { prisma } from '@tcrn/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TalentReadRepository } from './talent-read.repository';

vi.mock('@tcrn/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
  },
}));

const mockPrisma = prisma as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
};

describe('TalentReadRepository external pages config', () => {
  const repository = new TalentReadRepository();

  beforeEach(() => {
    mockPrisma.$queryRawUnsafe.mockReset();
  });

  it('reads marshmallow path from talent.marshmallow_path instead of marshmallow_config.path', async () => {
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([
        {
          isPublished: true,
          customDomain: 'homepage.example.com',
          customDomainVerified: true,
          customDomainVerificationToken: 'homepage-token',
        },
      ])
      .mockResolvedValueOnce([
        {
          isEnabled: true,
          path: 'sora-ask',
          customDomain: 'marshmallow.example.com',
          customDomainVerified: false,
          customDomainVerificationToken: 'marshmallow-token',
        },
      ]);

    await expect(
      repository.getExternalPagesDomainConfig('talent-123', 'tenant_test'),
    ).resolves.toEqual({
      homepage: {
        isPublished: true,
        customDomain: 'homepage.example.com',
        customDomainVerified: true,
        customDomainVerificationToken: 'homepage-token',
      },
      marshmallow: {
        isEnabled: true,
        path: 'sora-ask',
        customDomain: 'marshmallow.example.com',
        customDomainVerified: false,
        customDomainVerificationToken: 'marshmallow-token',
      },
    });

    expect(mockPrisma.$queryRawUnsafe).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('t.marshmallow_path as "path"'),
      'talent-123',
    );
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        'LEFT JOIN "tenant_test".talent t ON t.id = mc.talent_id',
      ),
      'talent-123',
    );
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenNthCalledWith(
      2,
      expect.not.stringContaining('\n              path,'),
      'talent-123',
    );
  });

  it('keeps the existing null fallback when the marshmallow lookup fails', async () => {
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('column "path" does not exist'));

    await expect(
      repository.getExternalPagesDomainConfig('talent-123', 'tenant_test'),
    ).resolves.toEqual({
      homepage: null,
      marshmallow: null,
    });
  });
});
