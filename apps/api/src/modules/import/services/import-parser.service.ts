// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import { ImportTemplateApplicationService } from '../application/import-template.service';
import type {
  CompanyImportRow,
  IndividualImportRow,
} from '../dto/import.dto';
export type {
  CsvTemplateValidationResult,
  ImportErrorCsvRow,
  ImportTemplateKind,
  ParsedCompanyRow,
  ParsedIndividualRow,
  ParseResult,
} from '../domain/import-template.policy';
export {
  COMPANY_IMPORT_HEADERS,
  INDIVIDUAL_IMPORT_HEADERS,
} from '../domain/import-template.policy';

@Injectable()
export class ImportParserService {
  constructor(
    private readonly importTemplateApplicationService: ImportTemplateApplicationService = new ImportTemplateApplicationService(),
  ) {}

  validateCsvTemplate(
    content: string,
    templateKind: import('../domain/import-template.policy').ImportTemplateKind,
  ) {
    return this.importTemplateApplicationService.validateCsvTemplate(content, templateKind);
  }

  /**
   * Parse individual import row
   */
  parseIndividualRow(row: IndividualImportRow, rowNumber: number) {
    return this.importTemplateApplicationService.parseIndividualRow(row, rowNumber);
  }

  /**
   * Parse company import row
   */
  parseCompanyRow(row: CompanyImportRow, rowNumber: number) {
    return this.importTemplateApplicationService.parseCompanyRow(row, rowNumber);
  }

  /**
   * Generate individual import template CSV
   */
  generateIndividualTemplate(): string {
    return this.importTemplateApplicationService.generateIndividualTemplate();
  }

  /**
   * Generate company import template CSV
   */
  generateCompanyTemplate(): string {
    return this.importTemplateApplicationService.generateCompanyTemplate();
  }

  /**
   * Generate errors CSV
   */
  generateErrorsCsv(
    errors: import('../domain/import-template.policy').ImportErrorCsvRow[],
  ): string {
    return this.importTemplateApplicationService.generateErrorsCsv(errors);
  }
}
