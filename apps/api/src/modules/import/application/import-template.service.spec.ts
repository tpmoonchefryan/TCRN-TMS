// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it } from 'vitest';

import {
  COMPANY_IMPORT_HEADERS,
  INDIVIDUAL_IMPORT_HEADERS,
} from '../domain/import-template.policy';
import { ImportTemplateApplicationService } from './import-template.service';

describe('ImportTemplateApplicationService', () => {
  let service: ImportTemplateApplicationService;

  beforeEach(() => {
    service = new ImportTemplateApplicationService();
  });

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

  it('parses an individual import row into the canonical application shape', () => {
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
    expect(result.data).toEqual({
      nickname: 'Test User',
      primaryLanguage: 'en',
      statusCode: 'ACTIVE',
      tags: ['vip', 'new'],
      warnings: [],
    });
  });

  it('generates the expected error CSV envelope', () => {
    const csv = service.generateErrorsCsv([
      {
        rowNumber: 3,
        errorCode: 'VALIDATION_FAILED',
        errorMessage: 'nickname is required',
        originalData: '{"nickname":""}',
      },
    ]);

    expect(csv).toContain('row_number,error_code,error_message,original_data');
    expect(csv).toContain('VALIDATION_FAILED');
    expect(csv).toContain('nickname is required');
  });
});
