// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import {
    CompanyImportRow,
    IndividualImportRow,
    ParsedEmail,
    ParsedPhoneNumber,
} from '../dto/import.dto';

// Validation schemas
const IndividualRowSchema = z.object({
  external_id: z.string().max(128).optional(),
  nickname: z.string().min(1).max(128),
  given_name: z.string().max(64).optional(),
  family_name: z.string().max(64).optional(),
  gender: z.enum(['male', 'female', 'other', 'undisclosed']).optional(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  primary_language: z.string().length(2).optional().or(z.literal('')),
  phone_type: z.string().optional(),
  phone_number: z.string().optional(),
  email_type: z.string().optional(),
  email_address: z.string().optional(),
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
  contact_name: z.string().max(128).optional(),
  contact_phone: z.string().max(32).optional(),
  contact_email: z.string().email().max(255).optional().or(z.literal('')),
  contact_department: z.string().max(128).optional(),
  status_code: z.string().max(32).optional(),
  tags: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export interface ParsedIndividualRow {
  externalId?: string;
  nickname: string;
  givenName?: string;
  familyName?: string;
  gender?: string;
  birthDate?: string;
  primaryLanguage?: string;
  phoneNumbers: ParsedPhoneNumber[];
  emails: ParsedEmail[];
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
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactDepartment?: string;
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

@Injectable()
export class ImportParserService {
  /**
   * Parse individual import row
   */
  parseIndividualRow(row: IndividualImportRow, rowNumber: number): ParseResult<ParsedIndividualRow> {
    // const errors: string[] = [];
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

    // Parse multi-value fields
    const phoneTypes = row.phone_type?.split('|').map((s) => s.trim()).filter(Boolean) || [];
    const phoneNumbers = row.phone_number?.split('|').map((s) => s.trim()).filter(Boolean) || [];
    const emailTypes = row.email_type?.split('|').map((s) => s.trim()).filter(Boolean) || [];
    const emailAddresses = row.email_address?.split('|').map((s) => s.trim()).filter(Boolean) || [];

    // Check for count mismatch
    if (phoneTypes.length !== phoneNumbers.length && (phoneTypes.length > 0 || phoneNumbers.length > 0)) {
      warnings.push(
        `Row ${rowNumber}: phone_type count (${phoneTypes.length}) != phone_number count (${phoneNumbers.length})`,
      );
    }
    if (emailTypes.length !== emailAddresses.length && (emailTypes.length > 0 || emailAddresses.length > 0)) {
      warnings.push(
        `Row ${rowNumber}: email_type count (${emailTypes.length}) != email_address count (${emailAddresses.length})`,
      );
    }

    // Build phone numbers array (take shorter length)
    const phoneCount = Math.min(phoneTypes.length, phoneNumbers.length);
    const phones: ParsedPhoneNumber[] = Array.from({ length: phoneCount }, (_, i) => ({
      typeCode: phoneTypes[i],
      number: phoneNumbers[i],
      isPrimary: i === 0,
    }));

    // Build emails array (take shorter length)
    const emailCount = Math.min(emailTypes.length, emailAddresses.length);
    const emails: ParsedEmail[] = Array.from({ length: emailCount }, (_, i) => ({
      typeCode: emailTypes[i],
      address: emailAddresses[i],
      isPrimary: i === 0,
    }));

    // Parse tags
    const tags = row.tags?.split(',').map((t) => t.trim()).filter(Boolean) || [];

    return {
      success: true,
      data: {
        externalId: row.external_id || undefined,
        nickname: row.nickname,
        givenName: row.given_name || undefined,
        familyName: row.family_name || undefined,
        gender: row.gender || undefined,
        birthDate: row.birth_date || undefined,
        primaryLanguage: row.primary_language || undefined,
        phoneNumbers: phones,
        emails,
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
        contactName: row.contact_name || undefined,
        contactPhone: row.contact_phone || undefined,
        contactEmail: row.contact_email || undefined,
        contactDepartment: row.contact_department || undefined,
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
    const headers = [
      'external_id',
      'nickname',
      'given_name',
      'family_name',
      'gender',
      'birth_date',
      'primary_language',
      'phone_type',
      'phone_number',
      'email_type',
      'email_address',
      'status_code',
      'tags',
      'notes',
    ];

    const exampleRow = [
      'EXT001',
      '粉丝小明',
      '小明',
      '张',
      'male',
      '1995-06-15',
      'zh',
      'MOBILE|WORK',
      '+8613800138001|+862112345678',
      'PERSONAL|WORK',
      'fan@example.com|fan@company.com',
      'ACTIVE',
      '活跃,高价值',
      '老粉丝',
    ];

    return [headers.join(','), exampleRow.join(',')].join('\n');
  }

  /**
   * Generate company import template CSV
   */
  generateCompanyTemplate(): string {
    const headers = [
      'external_id',
      'nickname',
      'company_legal_name',
      'company_short_name',
      'registration_number',
      'vat_id',
      'establishment_date',
      'business_segment_code',
      'website',
      'contact_name',
      'contact_phone',
      'contact_email',
      'contact_department',
      'status_code',
      'tags',
      'notes',
    ];

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
      '李经理',
      '+8613900139000',
      'contact@abc.com',
      '市场部',
      'ACTIVE',
      '商务',
      '年度合作伙伴',
    ];

    return [headers.join(','), exampleRow.join(',')].join('\n');
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
}
