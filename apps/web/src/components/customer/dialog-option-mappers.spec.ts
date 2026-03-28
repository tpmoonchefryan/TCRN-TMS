// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, expect, it } from 'vitest';

import {
  mapConsumerOptions,
  mapMembershipTree,
  mapPlatformOptions,
} from '@/components/customer/dialog-option-mappers';

describe('customer dialog option mappers', () => {
  it('prefers dictionary extraData.displayName when mapping platforms', () => {
    const result = mapPlatformOptions([
      {
        id: 'platform-1',
        dictionaryCode: 'social_platforms',
        code: 'TWITTER',
        name: 'Twitter',
        nameEn: 'Twitter',
        sortOrder: 1,
        isActive: true,
        extraData: { displayName: 'Twitter/X' },
        createdAt: '2026-03-29T00:00:00.000Z',
        updatedAt: '2026-03-29T00:00:00.000Z',
        version: 1,
      },
    ]);

    expect(result).toEqual([
      { id: 'platform-1', code: 'TWITTER', displayName: 'Twitter/X' },
    ]);
  });

  it('maps localized config entity names for consumers', () => {
    const result = mapConsumerOptions([
      {
        id: 'consumer-1',
        code: 'CRM',
        name: 'CRM Localized',
        nameEn: 'CRM',
        sortOrder: 1,
        isActive: true,
        version: 1,
      },
    ]);

    expect(result).toEqual([
      { id: 'consumer-1', code: 'CRM', nameEn: 'CRM' },
    ]);
  });

  it('maps membership tree responses into dialog-ready hierarchy', () => {
    const result = mapMembershipTree([
      {
        id: 'class-1',
        code: 'SUBSCRIPTION',
        name: 'Subscription',
        nameEn: 'Subscription',
        sortOrder: 1,
        isActive: true,
        types: [
          {
            id: 'type-1',
            code: 'CHANNEL_MEMBERSHIP',
            name: 'Channel Membership',
            nameEn: 'Channel Membership',
            classId: 'class-1',
            externalControl: false,
            defaultRenewalDays: 30,
            sortOrder: 1,
            isActive: true,
            levels: [
              {
                id: 'level-1',
                code: 'TIER1',
                name: 'Tier 1',
                nameEn: 'Tier 1',
                typeId: 'type-1',
                rank: 1,
                color: '#10b981',
                badgeUrl: null,
                sortOrder: 1,
                isActive: true,
              },
            ],
          },
        ],
      },
    ]);

    expect(result[0]).toMatchObject({
      id: 'class-1',
      code: 'SUBSCRIPTION',
      types: [
        {
          id: 'type-1',
          code: 'CHANNEL_MEMBERSHIP',
          levels: [
            {
              id: 'level-1',
              code: 'TIER1',
              rank: 1,
              typeId: 'type-1',
            },
          ],
        },
      ],
    });
  });
});
