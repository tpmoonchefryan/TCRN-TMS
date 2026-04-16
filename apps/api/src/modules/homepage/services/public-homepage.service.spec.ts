import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicHomepageReadRepository } from '../infrastructure/public-homepage-read.repository';
import { DomainLookupService } from './domain-lookup.service';
import { PublicHomepageService } from './public-homepage.service';

describe('PublicHomepageService', () => {
  let service: PublicHomepageService;
  let mockPublicHomepageReadRepository: {
    listActiveTenantSchemas: ReturnType<typeof vi.fn>;
    findPublishedTalentByPath: ReturnType<typeof vi.fn>;
    findPublishedTalentById: ReturnType<typeof vi.fn>;
    findPublishedHomepageRecord: ReturnType<typeof vi.fn>;
    findHomepageVersion: ReturnType<typeof vi.fn>;
  };
  let mockDomainLookupService: Pick<DomainLookupService, 'lookupDomain'>;

  beforeEach(() => {
    mockPublicHomepageReadRepository = {
      listActiveTenantSchemas: vi.fn(),
      findPublishedTalentByPath: vi.fn(),
      findPublishedTalentById: vi.fn(),
      findPublishedHomepageRecord: vi.fn(),
      findHomepageVersion: vi.fn(),
    };

    mockDomainLookupService = {
      lookupDomain: vi.fn(),
    };

    service = new PublicHomepageService(
      mockPublicHomepageReadRepository as unknown as PublicHomepageReadRepository,
      mockDomainLookupService as DomainLookupService,
    );
  });

  it('filters public path resolution by published lifecycle', async () => {
    mockPublicHomepageReadRepository.listActiveTenantSchemas.mockResolvedValue(['tenant_demo']);
    mockPublicHomepageReadRepository.findPublishedTalentByPath.mockResolvedValue(null);

    await expect(service.getPublishedHomepage('demo')).resolves.toBeNull();
    expect(mockPublicHomepageReadRepository.findPublishedTalentByPath).toHaveBeenCalledWith(
      'tenant_demo',
      'demo',
    );
  });

  it('uses custom-domain lookup mapping to load the published homepage from the owning talent', async () => {
    vi.mocked(mockDomainLookupService.lookupDomain).mockResolvedValue({
      homepagePath: 'demo-home',
      marshmallowPath: 'demo-mm',
      tenantSchema: 'tenant_demo',
      talentId: '550e8400-e29b-41d4-a716-446655440000',
    });
    mockPublicHomepageReadRepository.findPublishedTalentById.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      displayName: 'Demo Talent',
      avatarUrl: 'https://example.com/avatar.png',
      homepagePath: 'demo-home',
      timezone: 'Asia/Tokyo',
    });
    mockPublicHomepageReadRepository.findPublishedHomepageRecord.mockResolvedValue({
      id: 'homepage-1',
      isPublished: true,
      publishedVersionId: 'version-1',
      seoTitle: 'Demo SEO',
      seoDescription: 'Demo description',
      ogImageUrl: 'https://example.com/og.png',
    });
    mockPublicHomepageReadRepository.findHomepageVersion.mockResolvedValue({
      content: {
        version: '1.0.0',
        components: [],
      },
      theme: {
        preset: 'default',
        visualStyle: 'simple',
        colors: {},
        background: {},
        card: {},
        typography: {},
        animation: {},
        decorations: {},
      },
      publishedAt: new Date('2026-04-12T00:00:00.000Z'),
      createdAt: new Date('2026-04-11T00:00:00.000Z'),
    });

    const result = await service.getPublishedHomepageByDomain('demo.example.com');

    expect(result).toMatchObject({
      talent: {
        displayName: 'Demo Talent',
        avatarUrl: 'https://example.com/avatar.png',
        timezone: 'Asia/Tokyo',
      },
      seo: {
        title: 'Demo SEO',
      },
      updatedAt: '2026-04-12T00:00:00.000Z',
    });
    expect(mockPublicHomepageReadRepository.findPublishedTalentById).toHaveBeenCalledWith(
      'tenant_demo',
      '550e8400-e29b-41d4-a716-446655440000',
    );
  });
});
