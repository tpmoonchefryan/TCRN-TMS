import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicHomepageReadRepository } from '../infrastructure/public-homepage-read.repository';
import { DomainLookupService } from './domain-lookup.service';

describe('DomainLookupService', () => {
  let service: DomainLookupService;
  let mockPublicHomepageReadRepository: {
    listActiveTenantSchemas: ReturnType<typeof vi.fn>;
    findVerifiedDomainBindingRoute: ReturnType<typeof vi.fn>;
    findVerifiedDomainRoute: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPublicHomepageReadRepository = {
      listActiveTenantSchemas: vi.fn(),
      findVerifiedDomainBindingRoute: vi.fn(),
      findVerifiedDomainRoute: vi.fn(),
    };

    service = new DomainLookupService(
      mockPublicHomepageReadRepository as unknown as PublicHomepageReadRepository,
    );
  });

  it('prefers verified domain binding records and exposes inherited route metadata', async () => {
    mockPublicHomepageReadRepository.listActiveTenantSchemas.mockResolvedValue(['tenant_demo']);
    mockPublicHomepageReadRepository.findVerifiedDomainBindingRoute.mockResolvedValue({
      domainId: 'domain-1',
      hostname: 'brand.example.com',
      ownerType: 'tenant',
      ownerId: null,
      tenantSchema: 'tenant_demo',
      talentId: null,
    });

    const result = await service.lookupDomain('Brand.Example.COM.');

    expect(result).toEqual({
      homepagePath: 'homepage',
      marshmallowPath: 'marshmallow',
      tenantSchema: 'tenant_demo',
      talentId: null,
      domainId: 'domain-1',
      hostname: 'brand.example.com',
      ownerType: 'tenant',
      ownerId: null,
      routeMode: 'scoped_talent_path',
      routePrefix: ':talentCode',
      requiresTalentPath: true,
    });
    expect(mockPublicHomepageReadRepository.findVerifiedDomainBindingRoute).toHaveBeenCalledWith(
      'tenant_demo',
      'brand.example.com',
      null,
    );
    expect(mockPublicHomepageReadRepository.findVerifiedDomainRoute).not.toHaveBeenCalled();
  });

  it('resolves shared domain only when an explicit talent code selection exists', async () => {
    mockPublicHomepageReadRepository.listActiveTenantSchemas.mockResolvedValue(['tenant_demo']);
    mockPublicHomepageReadRepository.findVerifiedDomainBindingRoute.mockResolvedValue({
      domainId: 'domain-1',
      hostname: 'brand.example.com',
      ownerType: 'tenant',
      ownerId: null,
      tenantSchema: 'tenant_demo',
      talentId: 'talent-1',
    });

    const result = await service.lookupDomain('Brand.Example.COM.', 'SORA');

    expect(result).toEqual({
      homepagePath: 'homepage',
      marshmallowPath: 'marshmallow',
      tenantSchema: 'tenant_demo',
      talentId: 'talent-1',
      domainId: 'domain-1',
      hostname: 'brand.example.com',
      ownerType: 'tenant',
      ownerId: null,
      routeMode: 'scoped_talent_path',
      routePrefix: 'SORA',
      requiresTalentPath: true,
    });
    expect(mockPublicHomepageReadRepository.findVerifiedDomainBindingRoute).toHaveBeenCalledWith(
      'tenant_demo',
      'brand.example.com',
      'SORA',
    );
    expect(mockPublicHomepageReadRepository.findVerifiedDomainRoute).not.toHaveBeenCalled();
  });

  it('does not fall back to legacy dedicated lookup when a shared-domain talent code was requested', async () => {
    mockPublicHomepageReadRepository.listActiveTenantSchemas.mockResolvedValue(['tenant_demo']);
    mockPublicHomepageReadRepository.findVerifiedDomainBindingRoute.mockResolvedValue(null);

    await expect(service.lookupDomain('brand.example.com', 'SORA')).resolves.toBeNull();
    expect(mockPublicHomepageReadRepository.findVerifiedDomainRoute).not.toHaveBeenCalled();
  });

  it('falls back to legacy published talent custom domains', async () => {
    mockPublicHomepageReadRepository.listActiveTenantSchemas.mockResolvedValue(['tenant_demo']);
    mockPublicHomepageReadRepository.findVerifiedDomainBindingRoute.mockResolvedValue(null);
    mockPublicHomepageReadRepository.findVerifiedDomainRoute.mockResolvedValue({
      talentId: 'talent-1',
      homepagePath: 'demo-home',
      marshmallowPath: 'demo-mm',
      code: 'demo-code',
    });

    const result = await service.lookupDomain('Example.COM.');

    expect(result).toEqual({
      homepagePath: 'homepage',
      marshmallowPath: 'marshmallow',
      tenantSchema: 'tenant_demo',
      talentId: 'talent-1',
      domainId: null,
      hostname: null,
      ownerType: 'legacy_talent',
      ownerId: 'talent-1',
      routeMode: 'dedicated_talent',
      routePrefix: null,
      requiresTalentPath: false,
    });
    expect(mockPublicHomepageReadRepository.findVerifiedDomainRoute).toHaveBeenCalledWith(
      'tenant_demo',
      'example.com',
    );
  });

  it('returns null when no tenant contains a published mapping', async () => {
    mockPublicHomepageReadRepository.listActiveTenantSchemas.mockResolvedValue(['tenant_demo']);
    mockPublicHomepageReadRepository.findVerifiedDomainBindingRoute.mockResolvedValue(null);
    mockPublicHomepageReadRepository.findVerifiedDomainRoute.mockResolvedValue(null);

    await expect(service.lookupDomain('missing.example.com')).resolves.toBeNull();
  });
});
