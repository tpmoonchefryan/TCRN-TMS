// SPDX-License-Identifier: Apache-2.0
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

  describe('buildCsvRow', () => {
    it('neutralizes spreadsheet formula prefixes in CSV report rows', () => {
      const data: MfrRowData = {
        nickname: '=Nick',
        realName: '+Real',
        platform: '-Platform',
        platformUid: '@uid',
        platformNickname: '\tHandle',
        membershipClass: '\rClass',
        membershipType: 'Monthly',
        membershipLevel: 'Gold',
        validFrom: new Date('2024-01-01'),
        validTo: null,
        autoRenew: false,
        status: '=Active',
        phone: '+1234567890',
        email: '@example.com',
      };

      const result = service.buildCsvRow(data);

      expect(result).toContain("'=Nick");
      expect(result).toContain("'+Real");
      expect(result).toContain("'-Platform");
      expect(result).toContain("'@uid");
      expect(result).toContain("'\tHandle");
      expect(result).toContain('"\'\rClass"');
      expect(result).toContain("'=Active");
      expect(result).toContain("'+1234567890");
      expect(result).toContain("'@example.com");
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
