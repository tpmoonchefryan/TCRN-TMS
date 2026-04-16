import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicHomepageReadRepository } from '../infrastructure/public-homepage-read.repository';
import { DomainLookupService } from './domain-lookup.service';

describe('DomainLookupService', () => {
  let service: DomainLookupService;
  let mockPublicHomepageReadRepository: {
    listActiveTenantSchemas: ReturnType<typeof vi.fn>;
    findVerifiedDomainRoute: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPublicHomepageReadRepository = {
      listActiveTenantSchemas: vi.fn(),
      findVerifiedDomainRoute: vi.fn(),
    };

    service = new DomainLookupService(
      mockPublicHomepageReadRepository as unknown as PublicHomepageReadRepository,
    );
  });

  it('looks up only published talents and normalizes the requested domain', async () => {
    mockPublicHomepageReadRepository.listActiveTenantSchemas.mockResolvedValue(['tenant_demo']);
    mockPublicHomepageReadRepository.findVerifiedDomainRoute.mockResolvedValue({
      talentId: 'talent-1',
      homepagePath: 'demo-home',
      marshmallowPath: 'demo-mm',
      code: 'demo-code',
    });

    const result = await service.lookupDomain('Example.COM.');

    expect(result).toEqual({
      homepagePath: 'demo-home',
      marshmallowPath: 'demo-mm',
      tenantSchema: 'tenant_demo',
      talentId: 'talent-1',
    });
    expect(mockPublicHomepageReadRepository.findVerifiedDomainRoute).toHaveBeenCalledWith(
      'tenant_demo',
      'example.com',
    );
  });

  it('returns null when no tenant contains a published mapping', async () => {
    mockPublicHomepageReadRepository.listActiveTenantSchemas.mockResolvedValue(['tenant_demo']);
    mockPublicHomepageReadRepository.findVerifiedDomainRoute.mockResolvedValue(null);

    await expect(service.lookupDomain('missing.example.com')).resolves.toBeNull();
  });
});
