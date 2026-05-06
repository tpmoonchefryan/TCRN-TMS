import { describe, expect, it } from 'vitest';

import { DatabaseService } from './database.service';

describe('DatabaseService', () => {
  const service = new DatabaseService();

  describe('calculatePaginationMeta', () => {
    it('returns the standard meta.pagination shape used by API envelopes', () => {
      expect(service.calculatePaginationMeta(51, 2, 50)).toEqual({
        page: 2,
        pageSize: 50,
        totalCount: 51,
        totalPages: 2,
        hasNext: false,
        hasPrev: true,
      });
    });

    it('keeps empty collections on a valid first page instead of exposing zero pages', () => {
      expect(service.calculatePaginationMeta(0, 1, 20)).toEqual({
        page: 1,
        pageSize: 20,
        totalCount: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });
  });

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
