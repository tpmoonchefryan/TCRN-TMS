// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it } from 'vitest';

import { ExcelBuilderService, MfrRowData } from '../excel-builder.service';

describe('ExcelBuilderService', () => {
  let service: ExcelBuilderService;

  beforeEach(() => {
    service = new ExcelBuilderService();
  });

  describe('buildMfrRow', () => {
    it('should build a row array from row data', () => {
      const data: MfrRowData = {
        nickname: 'TestUser',
        realName: 'John Doe',
        platform: 'YouTube',
        platformUid: 'UC12345',
        platformNickname: 'TestChannel',
        membershipClass: 'Streaming',
        membershipType: 'Monthly',
        membershipLevel: 'Gold',
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2024-12-31'),
        autoRenew: true,
        status: 'Active',
        phone: '+1234567890',
        email: 'test@example.com',
      };

      const result = service.buildMfrRow(data);

      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toBe('TestUser');
      expect(result[1]).toBe('John Doe');
      expect(result[2]).toBe('YouTube');
    });

    it('should handle null nickname', () => {
      const data: MfrRowData = {
        nickname: null,
        realName: 'John Doe',
        platform: 'YouTube',
        platformUid: 'UC12345',
        platformNickname: 'TestChannel',
        membershipClass: 'Streaming',
        membershipType: 'Monthly',
        membershipLevel: 'Gold',
        validFrom: new Date('2024-01-01'),
        validTo: null,
        autoRenew: false,
        status: 'Active',
        phone: '',
        email: '',
      };

      const result = service.buildMfrRow(data);

      expect(result[0]).toBe('');
    });

    it('should handle null validTo', () => {
      const data: MfrRowData = {
        nickname: 'Test',
        realName: 'John',
        platform: 'YouTube',
        platformUid: 'UC123',
        platformNickname: 'Test',
        membershipClass: 'Streaming',
        membershipType: 'Monthly',
        membershipLevel: 'Gold',
        validFrom: new Date('2024-01-01'),
        validTo: null,
        autoRenew: false,
        status: 'Active',
        phone: '',
        email: '',
      };

      const result = service.buildMfrRow(data);

      // validTo should be formatted or empty
      expect(result).toBeDefined();
    });
  });

  describe('column definitions', () => {
    it('should export MFR_COLUMNS', async () => {
      const { MFR_COLUMNS } = await import('../excel-builder.service');

      expect(MFR_COLUMNS).toBeInstanceOf(Array);
      expect(MFR_COLUMNS.length).toBeGreaterThan(0);
      expect(MFR_COLUMNS[0]).toHaveProperty('header');
      expect(MFR_COLUMNS[0]).toHaveProperty('key');
      expect(MFR_COLUMNS[0]).toHaveProperty('width');
    });

    it('should export LEGEND_DATA', async () => {
      const { LEGEND_DATA } = await import('../excel-builder.service');

      expect(LEGEND_DATA).toBeInstanceOf(Array);
      expect(LEGEND_DATA.length).toBeGreaterThan(0);
      expect(LEGEND_DATA[0]).toHaveProperty('column');
      expect(LEGEND_DATA[0]).toHaveProperty('description');
    });
  });
});
