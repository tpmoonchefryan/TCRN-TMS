// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import {
    CompanyImportRow,
    IndividualImportRow,
} from '../dto/import.dto';

// Validation schemas
const IndividualRowSchema = z.object({
  external_id: z.string().max(128).optional(),
  nickname: z.string().min(1).max(128),
  primary_language: z.string().length(2).optional().or(z.literal('')),
  status_code: z.string().max(32).optional(),
  tags: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

const CompanyRowSchema = z.object({
  external_id: z.string().max(128).optional(),
  nickname: z.string().min(1).max(128),
  company_legal_name: z.string().min(1).max(255),
  company_short_name: z.string().max(128).optional(),
  registration_number: z.string().max(64).optional(),
  vat_id: z.string().max(64).optional(),
  establishment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  business_segment_code: z.string().max(32).optional(),
  website: z.string().url().max(512).optional().or(z.literal('')),
  status_code: z.string().max(32).optional(),
  tags: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export const INDIVIDUAL_IMPORT_HEADERS = [
  'external_id',
  'nickname',
  'primary_language',
  'status_code',
  'tags',
  'notes',
] as const;

export const COMPANY_IMPORT_HEADERS = [
  'external_id',
  'nickname',
  'company_legal_name',
  'company_short_name',
  'registration_number',
  'vat_id',
  'establishment_date',
  'business_segment_code',
  'website',
  'status_code',
  'tags',
  'notes',
] as const;

export type ImportTemplateKind = 'individual' | 'company';

export interface ParsedIndividualRow {
  externalId?: string;
  nickname: string;
  primaryLanguage?: string;
  statusCode?: string;
  tags: string[];
  notes?: string;
  warnings: string[];
}

export interface ParsedCompanyRow {
  externalId?: string;
  nickname: string;
  companyLegalName: string;
  companyShortName?: string;
  registrationNumber?: string;
  vatId?: string;
  establishmentDate?: string;
  businessSegmentCode?: string;
  website?: string;
  statusCode?: string;
  tags: string[];
  notes?: string;
  warnings: string[];
}

export interface ParseResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
}

export interface CsvTemplateValidationResult {
  success: boolean;
  headers: string[];
  totalRows: number;
  errors: string[];
}

@Injectable()
export class ImportParserService {
  validateCsvTemplate(
    content: string,
    templateKind: ImportTemplateKind,
  ): CsvTemplateValidationResult {
    const normalizedContent = content.replace(/^\ufeff/, '');
    const lines = normalizedContent
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length > 0);

    if (lines.length === 0) {
      return {
        success: false,
        headers: [],
        totalRows: 0,
        errors: ['CSV file is empty'],
      };
    }

    const headers = lines[0].split(',').map((header) => header.trim());
    const expectedHeaders = [...this.getExpectedHeaders(templateKind)];
    const errors: string[] = [];

    const duplicateHeaders = headers.filter(
      (header, index) => header.length > 0 && headers.indexOf(header) !== index,
    );
    if (duplicateHeaders.length > 0) {
      errors.push(`Duplicate headers are not allowed: ${[...new Set(duplicateHeaders)].join(', ')}`);
    }

    const missingHeaders = expectedHeaders.filter((header) => !headers.includes(header));
    if (missingHeaders.length > 0) {
      errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    const unexpectedHeaders = headers.filter((header) => !expectedHeaders.includes(header));
    if (unexpectedHeaders.length > 0) {
      errors.push(`Unexpected headers: ${unexpectedHeaders.join(', ')}`);
    }

    return {
      success: errors.length === 0,
      headers,
      totalRows: Math.max(0, lines.length - 1),
      errors,
    };
  }

  /**
   * Parse individual import row
   */
  parseIndividualRow(row: IndividualImportRow, _rowNumber: number): ParseResult<ParsedIndividualRow> {
    const warnings: string[] = [];

    // Validate with Zod
    const validation = IndividualRowSchema.safeParse(row);
    if (!validation.success) {
      const zodErrors = validation.error.issues.map(
        (e) => `${e.path.join('.')}: ${e.message}`,
      );
      return {
        success: false,
        errors: zodErrors,
        warnings: [],
      };
    }

    // Parse tags
    const tags = row.tags?.split(',').map((t) => t.trim()).filter(Boolean) || [];

    return {
      success: true,
      data: {
        externalId: row.external_id || undefined,
        nickname: row.nickname,
        primaryLanguage: row.primary_language || undefined,
        statusCode: row.status_code || undefined,
        tags,
        notes: row.notes || undefined,
        warnings,
      },
      errors: [],
      warnings,
    };
  }

  /**
   * Parse company import row
   */
  parseCompanyRow(row: CompanyImportRow, _rowNumber: number): ParseResult<ParsedCompanyRow> {
    const warnings: string[] = [];

    // Validate with Zod
    const validation = CompanyRowSchema.safeParse(row);
    if (!validation.success) {
      const zodErrors = validation.error.issues.map(
        (e) => `${e.path.join('.')}: ${e.message}`,
      );
      return {
        success: false,
        errors: zodErrors,
        warnings: [],
      };
    }

    // Parse tags
    const tags = row.tags?.split(',').map((t) => t.trim()).filter(Boolean) || [];

    return {
      success: true,
      data: {
        externalId: row.external_id || undefined,
        nickname: row.nickname,
        companyLegalName: row.company_legal_name,
        companyShortName: row.company_short_name || undefined,
        registrationNumber: row.registration_number || undefined,
        vatId: row.vat_id || undefined,
        establishmentDate: row.establishment_date || undefined,
        businessSegmentCode: row.business_segment_code || undefined,
        website: row.website || undefined,
        statusCode: row.status_code || undefined,
        tags,
        notes: row.notes || undefined,
        warnings,
      },
      errors: [],
      warnings,
    };
  }

  /**
   * Generate individual import template CSV
   */
  generateIndividualTemplate(): string {
    const exampleRow = [
      'EXT001',
      '粉丝小明',
      'zh',
      'ACTIVE',
      '活跃,高价值',
      '老粉丝',
    ];

    return [INDIVIDUAL_IMPORT_HEADERS.join(','), exampleRow.join(',')].join('\n');
  }

  /**
   * Generate company import template CSV
   */
  generateCompanyTemplate(): string {
    const exampleRow = [
      'EXT002',
      '合作方A',
      'ABC科技有限公司',
      'ABC公司',
      '91110000XXXXXXXX',
      '91110000XXXXXXXX',
      '2020-01-01',
      'TECH',
      'https://www.abc.com',
      'ACTIVE',
      '商务',
      '年度合作伙伴',
    ];

    return [COMPANY_IMPORT_HEADERS.join(','), exampleRow.join(',')].join('\n');
  }

  /**
   * Generate errors CSV
   */
  generateErrorsCsv(errors: Array<{
    rowNumber: number;
    errorCode: string;
    errorMessage: string;
    originalData: string;
  }>): string {
    const headers = ['row_number', 'error_code', 'error_message', 'original_data'];
    const rows = errors.map((e) => [
      e.rowNumber.toString(),
      e.errorCode,
      `"${e.errorMessage.replace(/"/g, '""')}"`,
      `"${e.originalData.replace(/"/g, '""')}"`,
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  private getExpectedHeaders(templateKind: ImportTemplateKind): readonly string[] {
    return templateKind === 'company'
      ? COMPANY_IMPORT_HEADERS
      : INDIVIDUAL_IMPORT_HEADERS;
  }
}
