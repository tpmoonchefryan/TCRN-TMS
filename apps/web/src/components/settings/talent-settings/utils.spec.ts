// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { describe, expect, it } from 'vitest';

import type { ConfigEntity, DictionaryRecord } from '@/components/shared/constants';

import {
  addSocialLink,
  countInheritedConfigEntities,
  countLocalConfigEntities,
  filterConfigEntities,
  filterDictionaryRecords,
  normalizeSocialLinksForSave,
  removeSocialLink,
  updateSocialLink,
} from './utils';

describe('talent settings utils', () => {
  it('filters config entities across code and localized names', () => {
    const configEntities = {
      membership: [
        {
          id: '1',
          code: 'VIP',
          nameEn: 'VIP Tier',
          nameZh: '高级会员',
          nameJa: '',
          ownerType: 'talent',
          ownerLevel: 'Talent',
          isActive: true,
          isForceUse: false,
          isSystem: false,
          sortOrder: 0,
        },
        {
          id: '2',
          code: 'STANDARD',
          nameEn: 'Standard Tier',
          nameZh: '标准',
          nameJa: '',
          ownerType: 'tenant',
          ownerLevel: 'Tenant',
          isActive: true,
          isForceUse: false,
          isSystem: false,
          sortOrder: 1,
        },
      ] satisfies ConfigEntity[],
    };

    expect(filterConfigEntities(configEntities, 'membership', 'vip')).toHaveLength(1);
    expect(filterConfigEntities(configEntities, 'membership', '高级')).toHaveLength(1);
    expect(filterConfigEntities(configEntities, 'membership', '')).toHaveLength(2);
  });

  it('filters dictionary records across code and localized names', () => {
    const dictionaryRecords = {
      platform: [
        {
          code: 'BILI',
          nameEn: 'Bilibili',
          nameZh: '哔哩哔哩',
          nameJa: 'ビリビリ',
          isActive: true,
        },
        {
          code: 'YT',
          nameEn: 'YouTube',
          nameZh: '油管',
          nameJa: 'ユーチューブ',
          isActive: true,
        },
      ] satisfies DictionaryRecord[],
    };

    expect(filterDictionaryRecords(dictionaryRecords, 'platform', 'bili')).toHaveLength(1);
    expect(filterDictionaryRecords(dictionaryRecords, 'platform', '油管')).toHaveLength(1);
    expect(filterDictionaryRecords(dictionaryRecords, 'platform', '')).toHaveLength(2);
  });

  it('counts local and inherited config entities separately', () => {
    const configEntities = {
      membership: [
        {
          id: '1',
          code: 'VIP',
          nameEn: 'VIP Tier',
          nameZh: '高级会员',
          nameJa: '',
          ownerType: 'talent',
          ownerLevel: 'Talent',
          isActive: true,
          isForceUse: false,
          isSystem: false,
          sortOrder: 0,
        },
        {
          id: '2',
          code: 'STANDARD',
          nameEn: 'Standard Tier',
          nameZh: '标准',
          nameJa: '',
          ownerType: 'tenant',
          ownerLevel: 'Tenant',
          isActive: true,
          isForceUse: false,
          isSystem: false,
          sortOrder: 1,
          inheritedFrom: 'Tenant',
        },
      ] satisfies ConfigEntity[],
      channel: [
        {
          id: '3',
          code: 'STREAM',
          nameEn: 'Streaming',
          nameZh: '直播',
          nameJa: '',
          ownerType: 'subsidiary',
          ownerLevel: 'Subsidiary',
          isActive: true,
          isForceUse: false,
          isSystem: false,
          sortOrder: 2,
          inheritedFrom: 'Subsidiary',
        },
      ] satisfies ConfigEntity[],
    };

    expect(countLocalConfigEntities(configEntities)).toBe(1);
    expect(countInheritedConfigEntities(configEntities)).toBe(2);
  });

  it('adds, updates, removes, and normalizes social links for save', () => {
    const addedLinks = addSocialLink([{ platform: 'X', url: 'https://x.example' }]);
    expect(addedLinks).toEqual([
      { platform: 'X', url: 'https://x.example' },
      { platform: '', url: '' },
    ]);

    const updatedLinks = updateSocialLink(addedLinks, 1, 'platform', 'YouTube');
    expect(updatedLinks[1]).toEqual({ platform: 'YouTube', url: '' });

    const normalizedLinks = normalizeSocialLinksForSave([
      ...updatedLinks,
      { platform: '', url: 'https://ignored.example' },
      { platform: 'Bilibili', url: 'https://bili.example' },
    ]);
    expect(normalizedLinks).toEqual([
      { platform: 'X', url: 'https://x.example' },
      { platform: 'Bilibili', url: 'https://bili.example' },
    ]);

    expect(removeSocialLink(normalizedLinks, 0)).toEqual([
      { platform: 'Bilibili', url: 'https://bili.example' },
    ]);
  });
});
