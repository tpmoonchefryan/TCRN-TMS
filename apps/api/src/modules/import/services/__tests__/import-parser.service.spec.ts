// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it } from 'vitest';

import {
  ImportParserService,
} from '../import-parser.service';

describe('ImportParserService', () => {
  let service: ImportParserService;

  beforeEach(() => {
    service = new ImportParserService();
  });

  it('delegates individual-row parsing to the layered application service', () => {
    const result = service.parseIndividualRow(
      {
        nickname: 'Test User',
        primary_language: 'en',
        status_code: 'ACTIVE',
        tags: 'vip,new',
      },
      1,
    );

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      nickname: 'Test User',
      primaryLanguage: 'en',
      statusCode: 'ACTIVE',
      tags: ['vip', 'new'],
    });
  });

  it('keeps template generation and validation available through the compatibility facade', () => {
    const template = service.generateIndividualTemplate();
    const validation = service.validateCsvTemplate(template, 'individual');

    expect(template).toContain('nickname');
    expect(validation.success).toBe(true);
    expect(validation.totalRows).toBe(1);
  });

  it('delegates company-row parsing and error-csv generation to the layered application service', () => {
    const rowResult = service.parseCompanyRow(
      {
        nickname: 'ACME',
        company_legal_name: 'ACME Corporation',
        registration_number: '12345678',
      },
      1,
    );
    const csv = service.generateErrorsCsv([
      {
        rowNumber: 2,
        errorCode: 'VALIDATION_FAILED',
        errorMessage: 'invalid row',
        originalData: '{"nickname":"ACME"}',
      },
    ]);

    expect(rowResult.success).toBe(true);
    expect(rowResult.data).toMatchObject({
      nickname: 'ACME',
      companyLegalName: 'ACME Corporation',
      registrationNumber: '12345678',
    });
    expect(csv).toContain('row_number,error_code,error_message,original_data');
  });
});
