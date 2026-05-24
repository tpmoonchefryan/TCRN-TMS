import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@tcrn/database';

import { TalentCustomDomainRepository } from './talent-custom-domain.repository';

vi.mock('@tcrn/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
  },
}));

const mockPrisma = prisma as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
};

describe('TalentCustomDomainRepository readiness checks', () => {
  const repository = new TalentCustomDomainRepository();

  beforeEach(() => {
    mockPrisma.$queryRawUnsafe.mockReset();
  });

  it('uses non-destructive catalog checks for both custom-domain registry tables', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([
      {
        customDomainBinding: 'public.custom_domain_binding',
        customDomainTalentSelection: 'public.custom_domain_talent_selection',
      },
    ]);

    await expect(repository.getCustomDomainRegistryReadiness()).resolves.toEqual({
      customDomainBinding: true,
      customDomainTalentSelection: true,
      ready: true,
    });
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("to_regclass('public.custom_domain_binding')")
    );
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("to_regclass('public.custom_domain_talent_selection')")
    );
  });

  it('reports missing registry pieces without touching the registry tables directly', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([
      {
        customDomainBinding: null,
        customDomainTalentSelection: 'public.custom_domain_talent_selection',
      },
    ]);

    await expect(repository.getCustomDomainRegistryReadiness()).resolves.toEqual({
      customDomainBinding: false,
      customDomainTalentSelection: true,
      ready: false,
    });
  });
});
