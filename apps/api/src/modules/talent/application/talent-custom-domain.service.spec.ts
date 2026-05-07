// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
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
    listCustomDomainBindingsForScope: vi.fn(),
    listSelectedInheritedDomainIds: vi.fn(),
    customDomainOwnerExists: vi.fn(),
    findCustomDomainBindingById: vi.fn(),
    findCustomDomainBindingByHostname: vi.fn(),
    findLegacyCustomDomainOwner: vi.fn(),
    createCustomDomainBinding: vi.fn(),
    updateCustomDomainBinding: vi.fn(),
    markCustomDomainBindingVerified: vi.fn(),
    replaceSelectedInheritedDomainIds: vi.fn(),
  } as unknown as TalentCustomDomainRepository;

  const service = new TalentCustomDomainService(mockRepository);
  const missingSelectionRelationError = {
    code: 'P2010',
    message: 'Raw query failed. Code: 42P01. relation "public.custom_domain_talent_selection" does not exist',
  };
  const missingBindingRelationError = {
    code: 'P2010',
    message: 'Raw query failed. Code: 42P01. relation "public.custom_domain_binding" does not exist',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets a normalized custom domain and returns the TXT verification record', async () => {
    vi.mocked(mockRepository.findTalentIdByCustomDomain).mockResolvedValue(null);
    vi.mocked(mockRepository.findCustomDomainBindingByHostname).mockResolvedValue(null);
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
    vi.mocked(mockRepository.findCustomDomainBindingByHostname).mockResolvedValue(null);

    await expect(
      service.setCustomDomain('talent-123', 'tenant_test', 'talent.example.com'),
    ).rejects.toThrow(BadRequestException);
  });


  it('fails closed when a legacy talent domain collides with binding registry', async () => {
    vi.mocked(mockRepository.findTalentIdByCustomDomain).mockResolvedValue(null);
    vi.mocked(mockRepository.findCustomDomainBindingByHostname).mockResolvedValue({
      id: 'domain-1',
      hostname: 'talent.example.com',
      ownerType: 'tenant',
      ownerId: null,
      ownerDepth: null,
      customDomainVerified: true,
      customDomainVerificationToken: null,
      customDomainSslMode: 'auto',
      isActive: true,
    });

    await expect(
      service.setCustomDomain('talent-123', 'tenant_test', 'talent.example.com'),
    ).rejects.toThrow(BadRequestException);
    expect(mockRepository.setCustomDomain).not.toHaveBeenCalled();
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

  it('keeps legacy custom-domain config readable when additive registry tables are missing', async () => {
    vi.mocked(mockRepository.getCustomDomainConfig).mockResolvedValue({
      talentId: 'talent-123',
      talentCode: 'shiori',
      subsidiaryId: null,
      customDomain: 'talent.example.com',
      customDomainVerified: true,
      customDomainVerificationToken: 'token-123',
      customDomainSslMode: 'auto',
      homepageCustomPath: 'legacy-home',
      marshmallowCustomPath: 'legacy-ask',
    });
    vi.mocked(mockRepository.listCustomDomainBindingsForTalent).mockRejectedValue(
      missingBindingRelationError,
    );
    vi.mocked(mockRepository.listSelectedInheritedDomainIds).mockRejectedValue(
      missingSelectionRelationError,
    );

    await expect(
      service.getCustomDomainConfig('talent-123', 'tenant_test'),
    ).resolves.toMatchObject({
      customDomain: 'talent.example.com',
      selectedInheritedDomainIds: [],
      domains: [
        expect.objectContaining({
          hostname: 'talent.example.com',
          routeMode: 'dedicated_talent',
          selected: true,
        }),
      ],
      inheritedDomains: [],
    });
  });

  it('lists scoped custom-domain bindings with inherited and selected state for talent settings', async () => {
    vi.mocked(mockRepository.customDomainOwnerExists).mockResolvedValue(true);
    vi.mocked(mockRepository.listCustomDomainBindingsForScope).mockResolvedValue([
      {
        id: 'talent-domain',
        hostname: 'fans.example.com',
        ownerType: 'talent',
        ownerId: 'talent-123',
        ownerDepth: null,
        customDomainVerified: true,
        customDomainVerificationToken: null,
        customDomainSslMode: 'auto',
        isActive: true,
      },
      {
        id: 'tenant-domain',
        hostname: 'brand.example.com',
        ownerType: 'tenant',
        ownerId: null,
        ownerDepth: null,
        customDomainVerified: true,
        customDomainVerificationToken: null,
        customDomainSslMode: 'cloudflare',
        isActive: true,
      },
    ]);
    vi.mocked(mockRepository.listSelectedInheritedDomainIds).mockResolvedValue(['tenant-domain']);

    await expect(
      service.listCustomDomainBindings('tenant_test', {
        scopeType: 'talent',
        scopeId: 'talent-123',
        includeInherited: true,
        includeInactive: false,
      }),
    ).resolves.toEqual({
      domains: [
        expect.objectContaining({
          id: 'talent-domain',
          inherited: false,
          selected: true,
          routeMode: 'dedicated_talent',
        }),
        expect.objectContaining({
          id: 'tenant-domain',
          inherited: true,
          selected: true,
          routeMode: 'scoped_talent_path',
        }),
      ],
    });
  });

  it('returns operator-safe storage errors for scoped custom-domain binding list reads', async () => {
    vi.mocked(mockRepository.customDomainOwnerExists).mockResolvedValue(true);
    vi.mocked(mockRepository.listCustomDomainBindingsForScope).mockRejectedValue(
      missingBindingRelationError,
    );

    await expect(
      service.listCustomDomainBindings('tenant_test', {
        scopeType: 'tenant',
        scopeId: null,
        includeInherited: true,
        includeInactive: false,
      }),
    ).rejects.toThrow(ServiceUnavailableException);
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


  it('creates a tenant-owned domain binding with normalized hostname and TXT record', async () => {
    vi.mocked(mockRepository.customDomainOwnerExists).mockResolvedValue(true);
    vi.mocked(mockRepository.findCustomDomainBindingByHostname).mockResolvedValue(null);
    vi.mocked(mockRepository.findLegacyCustomDomainOwner).mockResolvedValue(null);
    vi.mocked(mockRepository.createCustomDomainBinding).mockResolvedValue({
      id: 'domain-1',
      hostname: 'brand.example.com',
      ownerType: 'tenant',
      ownerId: null,
      ownerDepth: null,
      customDomainVerified: false,
      customDomainVerificationToken: 'token-123',
      customDomainSslMode: 'cloudflare',
      isActive: true,
    });

    await expect(
      service.createCustomDomainBinding('tenant_test', {
        ownerType: 'tenant',
        ownerId: null,
        hostname: 'Brand.Example.COM.',
        customDomainSslMode: 'cloudflare',
      }),
    ).resolves.toEqual({
      domain: expect.objectContaining({
        id: 'domain-1',
        hostname: 'brand.example.com',
        ownerType: 'tenant',
      }),
      token: 'token-123',
      txtRecord: 'tcrn-verify=token-123',
    });
    expect(mockRepository.createCustomDomainBinding).toHaveBeenCalledWith(
      'tenant_test',
      {
        ownerType: 'tenant',
        ownerId: null,
        hostname: 'brand.example.com',
        customDomainSslMode: 'cloudflare',
        isActive: true,
      },
      'token-123',
    );
  });

  it('fails closed when a domain binding hostname collides with existing registry', async () => {
    vi.mocked(mockRepository.customDomainOwnerExists).mockResolvedValue(true);
    vi.mocked(mockRepository.findCustomDomainBindingByHostname).mockResolvedValue({
      id: 'existing-domain',
      hostname: 'brand.example.com',
      ownerType: 'tenant',
      ownerId: null,
      ownerDepth: null,
      customDomainVerified: true,
      customDomainVerificationToken: null,
      customDomainSslMode: 'auto',
      isActive: true,
    });
    vi.mocked(mockRepository.findLegacyCustomDomainOwner).mockResolvedValue(null);

    await expect(
      service.createCustomDomainBinding('tenant_test', {
        ownerType: 'tenant',
        hostname: 'brand.example.com',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(mockRepository.createCustomDomainBinding).not.toHaveBeenCalled();
  });

  it('fails closed when the binding owner is outside the tenant scope', async () => {
    vi.mocked(mockRepository.customDomainOwnerExists).mockResolvedValue(false);

    await expect(
      service.createCustomDomainBinding('tenant_test', {
        ownerType: 'subsidiary',
        ownerId: 'sub-foreign',
        hostname: 'brand.example.com',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(mockRepository.findCustomDomainBindingByHostname).not.toHaveBeenCalled();
  });

  it('verifies a domain binding when the expected TXT record exists', async () => {
    vi.mocked(mockRepository.findCustomDomainBindingById).mockResolvedValue({
      id: 'domain-1',
      hostname: 'brand.example.com',
      ownerType: 'tenant',
      ownerId: null,
      ownerDepth: null,
      customDomainVerified: false,
      customDomainVerificationToken: 'token-123',
      customDomainSslMode: 'auto',
      isActive: true,
    });
    vi.mocked(dnsPromises.resolveTxt).mockResolvedValue([
      ['tcrn-verify=token-123'],
    ] as never);

    await expect(
      service.verifyCustomDomainBinding('tenant_test', 'domain-1'),
    ).resolves.toEqual({
      verified: true,
      message: 'Domain binding verified successfully',
    });
    expect(mockRepository.markCustomDomainBindingVerified).toHaveBeenCalledWith(
      'tenant_test',
      'domain-1',
    );
  });

  it('fails closed when selecting an unverified inherited domain', async () => {
    vi.mocked(mockRepository.getCustomDomainConfig).mockResolvedValue({
      talentId: 'talent-123',
      talentCode: 'shiori',
      subsidiaryId: null,
      customDomain: null,
      customDomainVerified: false,
      customDomainVerificationToken: null,
      customDomainSslMode: 'auto',
      homepageCustomPath: null,
      marshmallowCustomPath: null,
    });
    vi.mocked(mockRepository.listCustomDomainBindingsForTalent).mockResolvedValue([
      {
        id: 'tenant-domain',
        hostname: 'tenant.example.com',
        ownerType: 'tenant',
        ownerId: null,
        ownerDepth: null,
        customDomainVerified: false,
        customDomainVerificationToken: 'token-123',
        customDomainSslMode: 'auto',
        isActive: true,
      },
    ]);
    vi.mocked(mockRepository.listSelectedInheritedDomainIds).mockResolvedValue([]);

    await expect(
      service.setSelectedInheritedDomainIds('talent-123', 'tenant_test', ['tenant-domain']),
    ).rejects.toThrow(BadRequestException);
    expect(mockRepository.replaceSelectedInheritedDomainIds).not.toHaveBeenCalled();
  });

  it('returns a stable unavailable error when inherited-domain selection storage is missing', async () => {
    vi.mocked(mockRepository.getCustomDomainConfig).mockResolvedValue({
      talentId: 'talent-123',
      talentCode: 'shiori',
      subsidiaryId: null,
      customDomain: null,
      customDomainVerified: false,
      customDomainVerificationToken: null,
      customDomainSslMode: 'auto',
      homepageCustomPath: null,
      marshmallowCustomPath: null,
    });
    vi.mocked(mockRepository.listCustomDomainBindingsForTalent).mockResolvedValue([
      {
        id: 'tenant-domain',
        hostname: 'tenant.example.com',
        ownerType: 'tenant',
        ownerId: null,
        ownerDepth: null,
        customDomainVerified: true,
        customDomainVerificationToken: 'token-123',
        customDomainSslMode: 'auto',
        isActive: true,
      },
    ]);
    vi.mocked(mockRepository.listSelectedInheritedDomainIds).mockResolvedValue([]);
    vi.mocked(mockRepository.replaceSelectedInheritedDomainIds).mockRejectedValue(
      missingSelectionRelationError,
    );

    let caught: unknown;
    try {
      await service.setSelectedInheritedDomainIds('talent-123', 'tenant_test', ['tenant-domain']);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ServiceUnavailableException);
    expect((caught as ServiceUnavailableException).getResponse()).toMatchObject({
      code: 'SYS_DATABASE_ERROR',
      message:
        'Custom-domain storage is unavailable. Ask an administrator to apply the custom-domain database migration.',
    });
  });

  it('replaces selected inherited domain ids when domains are verified and in scope', async () => {
    vi.mocked(mockRepository.getCustomDomainConfig).mockResolvedValue({
      talentId: 'talent-123',
      talentCode: 'shiori',
      subsidiaryId: null,
      customDomain: null,
      customDomainVerified: false,
      customDomainVerificationToken: null,
      customDomainSslMode: 'auto',
      homepageCustomPath: null,
      marshmallowCustomPath: null,
    });
    vi.mocked(mockRepository.listCustomDomainBindingsForTalent).mockResolvedValue([
      {
        id: 'tenant-domain',
        hostname: 'tenant.example.com',
        ownerType: 'tenant',
        ownerId: null,
        ownerDepth: null,
        customDomainVerified: true,
        customDomainVerificationToken: 'token-123',
        customDomainSslMode: 'auto',
        isActive: true,
      },
    ]);
    vi.mocked(mockRepository.listSelectedInheritedDomainIds)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(['tenant-domain']);
    vi.mocked(mockRepository.replaceSelectedInheritedDomainIds).mockResolvedValue(undefined);

    await expect(
      service.setSelectedInheritedDomainIds('talent-123', 'tenant_test', [
        'tenant-domain',
        'tenant-domain',
      ]),
    ).resolves.toMatchObject({
      selectedInheritedDomainIds: ['tenant-domain'],
      inheritedDomains: [expect.objectContaining({
        id: 'tenant-domain',
        selected: true,
      })],
    });
    expect(mockRepository.replaceSelectedInheritedDomainIds).toHaveBeenCalledWith(
      'tenant_test',
      'talent-123',
      ['tenant-domain'],
    );
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
