// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

import {
  type CsvTemplateValidationResult,
  generateCompanyImportTemplate,
  generateImportErrorsCsv,
  generateIndividualImportTemplate,
  type ImportErrorCsvRow,
  type ImportTemplateKind,
  parseCompanyImportRow,
  type ParsedCompanyRow,
  type ParsedIndividualRow,
  parseIndividualImportRow,
  type ParseResult,
  validateCsvTemplate,
} from '../domain/import-template.policy';
import type {
  CompanyImportRow,
  IndividualImportRow,
} from '../dto/import.dto';

@Injectable()
export class ImportTemplateApplicationService {
  validateCsvTemplate(
    content: string,
    templateKind: ImportTemplateKind,
  ): CsvTemplateValidationResult {
    return validateCsvTemplate(content, templateKind);
  }

  parseIndividualRow(
    row: IndividualImportRow,
    _rowNumber: number,
  ): ParseResult<ParsedIndividualRow> {
    return parseIndividualImportRow(row);
  }

  parseCompanyRow(
    row: CompanyImportRow,
    _rowNumber: number,
  ): ParseResult<ParsedCompanyRow> {
    return parseCompanyImportRow(row);
  }

  generateIndividualTemplate(): string {
    return generateIndividualImportTemplate();
  }

  generateCompanyTemplate(): string {
    return generateCompanyImportTemplate();
  }

  generateErrorsCsv(errors: ImportErrorCsvRow[]): string {
    return generateImportErrorsCsv(errors);
  }
}
