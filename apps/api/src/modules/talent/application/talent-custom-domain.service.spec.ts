// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => ({
    toString: () => 'token-123',
  })),
}));

vi.mock('dns', () => ({
  promises: {
    resolveTxt: vi.fn(),
  },
}));

import { promises as dnsPromises } from 'dns';

import { TalentCustomDomainRepository } from '../infrastructure/talent-custom-domain.repository';
import { TalentCustomDomainService } from './talent-custom-domain.service';

describe('TalentCustomDomainService', () => {
  const mockRepository = {
    getCustomDomainConfig: vi.fn(),
    clearCustomDomain: vi.fn(),
    findTalentIdByCustomDomain: vi.fn(),
    setCustomDomain: vi.fn(),
    markCustomDomainVerified: vi.fn(),
    updateServicePaths: vi.fn(),
    updateSslMode: vi.fn(),
    listCustomDomainBindingsForTalent: vi.fn(),
    listSelectedInheritedDomainIds: vi.fn(),
  } as unknown as TalentCustomDomainRepository;

  const service = new TalentCustomDomainService(mockRepository);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets a normalized custom domain and returns the TXT verification record', async () => {
    vi.mocked(mockRepository.findTalentIdByCustomDomain).mockResolvedValue(null);
    vi.mocked(mockRepository.setCustomDomain).mockResolvedValue(true);

    await expect(
      service.setCustomDomain(
        'talent-123',
        'tenant_test',
        'Talent.Example.com ',
      ),
    ).resolves.toEqual({
      customDomain: 'talent.example.com',
      token: 'token-123',
      txtRecord: 'tcrn-verify=token-123',
    });
  });

  it('fails closed when another talent already owns the custom domain', async () => {
    vi.mocked(mockRepository.findTalentIdByCustomDomain).mockResolvedValue(
      'talent-456',
    );

    await expect(
      service.setCustomDomain('talent-123', 'tenant_test', 'talent.example.com'),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns legacy-compatible config with additive effective domain fields', async () => {
    vi.mocked(mockRepository.getCustomDomainConfig).mockResolvedValue({
      talentId: 'talent-123',
      talentCode: 'shiori',
      subsidiaryId: 'sub-1',
      customDomain: 'talent.example.com',
      customDomainVerified: true,
      customDomainVerificationToken: 'token-123',
      customDomainSslMode: 'auto',
      homepageCustomPath: 'legacy-home',
      marshmallowCustomPath: 'legacy-ask',
    });
    vi.mocked(mockRepository.listCustomDomainBindingsForTalent).mockResolvedValue([
      {
        id: 'tenant-domain',
        hostname: 'tenant.example.com',
        ownerType: 'tenant',
        ownerId: null,
        ownerDepth: null,
        customDomainVerified: true,
        customDomainVerificationToken: null,
        customDomainSslMode: 'cloudflare',
        isActive: true,
      },
    ]);
    vi.mocked(mockRepository.listSelectedInheritedDomainIds).mockResolvedValue([
      'tenant-domain',
    ]);

    await expect(
      service.getCustomDomainConfig('talent-123', 'tenant_test'),
    ).resolves.toMatchObject({
      customDomain: 'talent.example.com',
      homepageCustomPath: 'homepage',
      marshmallowCustomPath: 'marshmallow',
      selectedInheritedDomainIds: ['tenant-domain'],
      domains: [
        expect.objectContaining({
          hostname: 'talent.example.com',
          routeMode: 'dedicated_talent',
          homepagePath: 'homepage',
        }),
        expect.objectContaining({
          id: 'tenant-domain',
          selected: true,
          routeMode: 'scoped_talent_path',
          homepagePath: 'shiori/homepage',
        }),
      ],
      inheritedDomains: [
        expect.objectContaining({ id: 'tenant-domain' }),
      ],
    });
  });

  it('verifies the custom domain when the expected TXT record exists', async () => {
    vi.mocked(mockRepository.getCustomDomainConfig).mockResolvedValue({
      talentId: 'talent-123',
      talentCode: 'shiori',
      subsidiaryId: null,
      customDomain: 'talent.example.com',
      customDomainVerified: false,
      customDomainVerificationToken: 'token-123',
      customDomainSslMode: 'auto',
      homepageCustomPath: 'homepage',
      marshmallowCustomPath: 'marshmallow',
    });
    vi.mocked(dnsPromises.resolveTxt).mockResolvedValue([
      ['tcrn-verify=token-123'],
    ] as never);

    await expect(
      service.verifyCustomDomain('talent-123', 'tenant_test'),
    ).resolves.toEqual({
      verified: true,
      message: 'Domain verified successfully',
    });
  });

  it('returns fixed custom-domain paths and does not mutate legacy path storage', async () => {
    vi.mocked(mockRepository.getCustomDomainConfig).mockResolvedValue({
      talentId: 'talent-123',
      talentCode: 'shiori',
      subsidiaryId: null,
      customDomain: 'talent.example.com',
      customDomainVerified: false,
      customDomainVerificationToken: 'token-123',
      customDomainSslMode: 'auto',
      homepageCustomPath: 'legacy-home',
      marshmallowCustomPath: 'legacy-ask',
    });

    await expect(
      service.updateServicePaths('talent-123', 'tenant_test', {
        homepageCustomPath: '/homepage',
        marshmallowCustomPath: '/marshmallow',
      }),
    ).resolves.toEqual({
      homepageCustomPath: 'homepage',
      marshmallowCustomPath: 'marshmallow',
    });
    expect(mockRepository.updateServicePaths).not.toHaveBeenCalled();
  });

  it('fails closed when updating SSL mode for a missing talent', async () => {
    vi.mocked(mockRepository.updateSslMode).mockResolvedValue(null);

    await expect(
      service.updateSslMode('talent-123', 'tenant_test', 'cloudflare'),
    ).rejects.toThrow(NotFoundException);
  });
});
