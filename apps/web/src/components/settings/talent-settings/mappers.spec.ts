// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { describe, expect, it } from 'vitest';

import {
  mapConfigEntities,
  mapDictionaryRecords,
  mapTalentApiResponseToTalentData,
} from './mappers';

describe('talent settings mappers', () => {
  it('maps talent api response into local talent settings data', () => {
    expect(
      mapTalentApiResponseToTalentData(
        {
          id: 'talent-1',
          code: 'AC',
          nameEn: 'Aqua',
          displayName: 'Aqua',
          path: '/AC/',
          createdAt: '2026-03-29T00:00:00.000Z',
          updatedAt: '2026-03-29T00:00:00.000Z',
          subsidiaryId: null,
          profileStoreId: null,
          profileStore: null,
          nameZh: null,
          nameJa: null,
          name: 'Aqua',
          descriptionEn: null,
          descriptionZh: null,
          descriptionJa: null,
          avatarUrl: null,
          homepagePath: null,
          timezone: 'UTC',
          isActive: true,
          version: 1,
          settings: {
            inheritTimezone: false,
            homepageEnabled: true,
            marshmallowEnabled: false,
          },
          externalPagesDomain: {
            homepage: {
              customDomain: 'aqua.example.com',
              customDomainVerified: true,
              customDomainVerificationToken: null,
            },
            marshmallow: null,
          },
          stats: { customerCount: 42, pendingMessagesCount: 0 },
        },
        'subsidiary-fallback'
      )
    ).toMatchObject({
      id: 'talent-1',
      code: 'AC',
      displayName: 'Aqua',
      subsidiaryId: 'subsidiary-fallback',
      path: '/AC/',
      homepagePath: 'ac',
      timezone: 'UTC',
      customerCount: 42,
      settings: {
        inheritTimezone: false,
        homepageEnabled: true,
        marshmallowEnabled: false,
      },
      externalPagesDomain: {
        homepage: {
          customDomain: 'aqua.example.com',
          customDomainVerified: true,
        },
        marshmallow: null,
      },
    });
  });

  it('maps config entity api records into local config entities', () => {
    expect(
      mapConfigEntities([
        {
          id: 'cfg-1',
          code: 'VIP',
          nameEn: 'VIP',
          ownerType: 'talent',
          inheritedFrom: 'Tenant',
        },
      ])
    ).toEqual([
      expect.objectContaining({
        id: 'cfg-1',
        code: 'VIP',
        nameEn: 'VIP',
        ownerType: 'talent',
        inheritedFrom: 'Tenant',
        isActive: true,
      }),
    ]);
  });

  it('maps dictionary api records into local dictionary records', () => {
    expect(
      mapDictionaryRecords([
        {
          code: 'BILI',
          nameEn: 'Bilibili',
          nameZh: '哔哩哔哩',
        },
      ])
    ).toEqual([
      {
        code: 'BILI',
        nameEn: 'Bilibili',
        nameZh: '哔哩哔哩',
        nameJa: '',
        isActive: true,
      },
    ]);
  });
});
