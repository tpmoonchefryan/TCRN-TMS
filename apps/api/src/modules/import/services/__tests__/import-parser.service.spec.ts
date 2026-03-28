// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it } from 'vitest';

import {
  COMPANY_IMPORT_HEADERS,
  ImportParserService,
  INDIVIDUAL_IMPORT_HEADERS,
} from '../import-parser.service';

describe('ImportParserService', () => {
  let service: ImportParserService;

  beforeEach(() => {
    service = new ImportParserService();
  });

  describe('parseIndividualRow', () => {
    it('should parse valid individual row', () => {
      const row = {
        nickname: 'Test User',
        primary_language: 'en',
        status_code: 'ACTIVE',
        tags: 'vip,new',
      };

      const result = service.parseIndividualRow(row, 1);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const data = result.data!;
      expect(data.nickname).toBe('Test User');
      expect(data.primaryLanguage).toBe('en');
      expect(data.statusCode).toBe('ACTIVE');
      expect(data.tags).toEqual(['vip', 'new']);
      expect(result.warnings).toBeInstanceOf(Array);
    });

    it('should fail validation for invalid primary language length', () => {
      const row = {
        nickname: 'Test',
        primary_language: 'english',
      };

      const result = service.parseIndividualRow(row, 1);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should parse tags from comma-separated string', () => {
      const row = {
        nickname: 'Test',
        tags: 'vip, loyal, active',
      };

      const result = service.parseIndividualRow(row, 1);

      expect(result.data!.tags).toEqual(['vip', 'loyal', 'active']); // eslint-disable-line @typescript-eslint/no-non-null-assertion
    });

    it('should handle empty row gracefully', () => {
      const row = {
        nickname: 'Minimal',
      };

      const result = service.parseIndividualRow(row, 1);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const data = result.data!;
      expect(data.nickname).toBe('Minimal');
      expect(data.tags).toEqual([]);
    });
  });

  describe('validateCsvTemplate', () => {
    it('accepts the current individual template headers', () => {
      const csv = [
        INDIVIDUAL_IMPORT_HEADERS.join(','),
        'EXT001,Test User,en,ACTIVE,vip,notes',
      ].join('\n');

      const result = service.validateCsvTemplate(csv, 'individual');

      expect(result.success).toBe(true);
      expect(result.totalRows).toBe(1);
      expect(result.errors).toEqual([]);
    });

    it('rejects unexpected headers for individual imports', () => {
      const csv = [
        `${INDIVIDUAL_IMPORT_HEADERS.join(',')},legacy_pii_email`,
        'EXT001,Test User,en,ACTIVE,vip,notes,hidden@example.com',
      ].join('\n');

      const result = service.validateCsvTemplate(csv, 'individual');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Unexpected headers: legacy_pii_email');
    });

    it('rejects missing company headers', () => {
      const csv = [
        COMPANY_IMPORT_HEADERS.filter((header) => header !== 'company_legal_name').join(','),
        'EXT002,Corp Alias,ABC Corp,91110000XXXXXXXX,91110000XXXXXXXX,2020-01-01,TECH,https://www.abc.com,ACTIVE,biz,notes',
      ].join('\n');

      const result = service.validateCsvTemplate(csv, 'company');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Missing required headers: company_legal_name');
    });

    it('rejects duplicate headers', () => {
      const csv = [
        'external_id,nickname,nickname,primary_language,status_code,tags,notes',
        'EXT001,Test User,Duplicate,en,ACTIVE,vip,notes',
      ].join('\n');

      const result = service.validateCsvTemplate(csv, 'individual');

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Duplicate headers are not allowed');
    });
  });

  describe('parseCompanyRow', () => {
    it('should parse valid company row', () => {
      const row = {
        nickname: 'ACME',
        company_legal_name: 'ACME Corporation',
        registration_number: '12345678',
        website: 'https://acme.example',
      };

      const result = service.parseCompanyRow(row, 1);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const data = result.data!;
      expect(data.nickname).toBe('ACME');
      expect(data.companyLegalName).toBe('ACME Corporation');
      expect(data.registrationNumber).toBe('12345678');
      expect(data.website).toBe('https://acme.example');
    });

    it('should handle optional company fields', () => {
      const row = {
        nickname: 'MinimalCorp',
        company_legal_name: 'Minimal Corporation',
      };

      const result = service.parseCompanyRow(row, 1);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const data = result.data!;
      expect(data.companyLegalName).toBe('Minimal Corporation');
      expect(data.companyShortName).toBeUndefined();
      expect(result.warnings).toBeInstanceOf(Array);
    });

    it.skip('should validate establishment date format', () => {
      const row = {
        nickname: 'Test Corp',
        company_legal_name: 'Test Corporation',
        establishment_date: '2020-01-15',
      };

      const result = service.parseCompanyRow(row, 1);

      expect(result.data!.establishmentDate).toBe('2020-01-15'); // eslint-disable-line @typescript-eslint/no-non-null-assertion
    });

    it.skip('should warn for invalid establishment date', () => {
      const row = {
        nickname: 'Test Corp',
        company_legal_name: 'Test Corporation',
        establishment_date: 'not-a-date',
      };

      const result = service.parseCompanyRow(row, 1);

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
