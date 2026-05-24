import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../database';
import { PublicHomepageReadRepository } from './public-homepage-read.repository';

describe('PublicHomepageReadRepository', () => {
  let queryRawUnsafe: ReturnType<typeof vi.fn>;
  let repository: PublicHomepageReadRepository;

  beforeEach(() => {
    queryRawUnsafe = vi.fn();
    repository = new PublicHomepageReadRepository({
      getPrisma: () => ({
        $queryRawUnsafe: queryRawUnsafe,
      }),
    } as unknown as DatabaseService);
  });

  it('returns null for binding lookup when the additive custom-domain registry is not migrated', async () => {
    queryRawUnsafe.mockRejectedValueOnce({
      code: 'P2010',
      message:
        'Raw query failed. Code: 42P01. relation "public.custom_domain_talent_selection" does not exist',
    });

    await expect(
      repository.findVerifiedDomainBindingRoute('tenant_demo', 'brand.example.com', 'sora')
    ).resolves.toBeNull();
  });

  it('rethrows non-registry binding lookup errors', async () => {
    queryRawUnsafe.mockRejectedValueOnce(new Error('connection terminated unexpectedly'));

    await expect(
      repository.findVerifiedDomainBindingRoute('tenant_demo', 'brand.example.com', null)
    ).rejects.toThrow('connection terminated unexpectedly');
  });
});
