import { describe, expect, it } from 'vitest';

import { buildTalentEffectiveCustomDomains } from './talent-custom-domain.policy';

describe('buildTalentEffectiveCustomDomains', () => {
  const legacyConfig = {
    talentId: 'talent-1',
    talentCode: 'shiori',
    subsidiaryId: 'sub-leaf',
    customDomain: 'legacy.example.com',
    customDomainVerified: true,
    customDomainVerificationToken: 'legacy-token',
    customDomainSslMode: 'auto' as const,
    homepageCustomPath: 'legacy-home',
    marshmallowCustomPath: 'legacy-mm',
  };

  it('keeps the legacy talent domain as a dedicated fixed-route domain', () => {
    expect(
      buildTalentEffectiveCustomDomains({
        legacyConfig,
        bindingRecords: [],
        selectedInheritedDomainIds: [],
      }),
    ).toEqual([
      expect.objectContaining({
        id: 'legacy:legacy.example.com',
        hostname: 'legacy.example.com',
        ownerType: 'talent',
        inherited: false,
        selected: true,
        routeMode: 'dedicated_talent',
        routePrefix: null,
        homepagePath: 'homepage',
        marshmallowPath: 'marshmallow',
      }),
    ]);
  });

  it('orders talent, nearest subsidiary, ancestor subsidiary, then tenant domains', () => {
    const domains = buildTalentEffectiveCustomDomains({
      legacyConfig: {
        ...legacyConfig,
        customDomain: null,
      },
      selectedInheritedDomainIds: ['domain-leaf'],
      bindingRecords: [
        {
          id: 'domain-tenant',
          hostname: 'tenant.example.com',
          ownerType: 'tenant',
          ownerId: null,
          ownerDepth: null,
          customDomainVerified: true,
          customDomainVerificationToken: null,
          customDomainSslMode: 'auto' as const,
          isActive: true,
        },
        {
          id: 'domain-root',
          hostname: 'root.example.com',
          ownerType: 'subsidiary',
          ownerId: 'sub-root',
          ownerDepth: 1,
          customDomainVerified: true,
          customDomainVerificationToken: null,
          customDomainSslMode: 'cloudflare',
          isActive: true,
        },
        {
          id: 'domain-leaf',
          hostname: 'leaf.example.com',
          ownerType: 'subsidiary',
          ownerId: 'sub-leaf',
          ownerDepth: 2,
          customDomainVerified: true,
          customDomainVerificationToken: null,
          customDomainSslMode: 'self_hosted',
          isActive: true,
        },
        {
          id: 'domain-talent',
          hostname: 'talent.example.com',
          ownerType: 'talent',
          ownerId: 'talent-1',
          ownerDepth: null,
          customDomainVerified: true,
          customDomainVerificationToken: null,
          customDomainSslMode: 'auto' as const,
          isActive: true,
        },
      ],
    });

    expect(domains.map((domain) => domain.id)).toEqual([
      'domain-talent',
      'domain-leaf',
      'domain-root',
      'domain-tenant',
    ]);
    expect(domains[1]).toMatchObject({
      selected: true,
      routeMode: 'scoped_talent_path',
      routePrefix: 'shiori',
      homepagePath: 'shiori/homepage',
      marshmallowPath: 'shiori/marshmallow',
    });
  });
});
