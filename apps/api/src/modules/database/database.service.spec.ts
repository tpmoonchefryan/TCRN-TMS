import { describe, expect, it } from 'vitest';

import { DatabaseService } from './database.service';

describe('DatabaseService', () => {
  const service = new DatabaseService();

  describe('getLocalizedField', () => {
    const entity = {
      nameEn: 'English name',
      nameZh: '中文名',
      nameJa: '日本語名',
    };

    it('normalizes full UI locale tags before selecting legacy trilingual fields', () => {
      expect(service.getLocalizedField(entity, 'name', 'zh_HANT')).toBe('中文名');
      expect(service.getLocalizedField(entity, 'name', 'zh-CN')).toBe('中文名');
      expect(service.getLocalizedField(entity, 'name', 'ja-JP')).toBe('日本語名');
    });

    it('falls non-trilingual UI locale tags back to English legacy fields', () => {
      expect(service.getLocalizedField(entity, 'name', 'fr')).toBe('English name');
      expect(service.getLocalizedField(entity, 'name', 'ko')).toBe('English name');
      expect(service.getLocalizedField(entity, 'name', 'de')).toBe('English name');
    });
  });
});
