// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
} from 'class-validator';

export enum ImportJobType {
  INDIVIDUAL_IMPORT = 'individual_import',
  COMPANY_IMPORT = 'company_import',
}

export enum ImportJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  PARTIAL = 'partial',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export class CreateImportJobDto {
  @IsUUID()
  talentId!: string;

  @IsOptional()
  @IsString()
  consumerCode?: string;
}

export class ImportJobQueryDto {
  @IsOptional()
  @IsEnum(ImportJobStatus)
  status?: ImportJobStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;
}

export interface ImportProgress {
  totalRows: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  warningRows: number;
  percentage: number;
}

export interface ImportJobResponse {
  id: string;
  jobType: ImportJobType;
  status: ImportJobStatus;
  fileName: string;
  consumerCode: string | null;
  progress: ImportProgress;
  startedAt: string | null;
  completedAt: string | null;
  estimatedRemainingSeconds: number | null;
  createdAt: string;
  createdBy: { id: string; username: string };
}

export interface ImportError {
  rowNumber: number;
  errorCode: string;
  errorMessage: string;
  originalData: string;
}

// CSV row schemas
export interface IndividualImportRow {
  external_id?: string;
  nickname: string;
  given_name?: string;
  family_name?: string;
  gender?: string;
  birth_date?: string;
  primary_language?: string;
  phone_type?: string;
  phone_number?: string;
  email_type?: string;
  email_address?: string;
  status_code?: string;
  tags?: string;
  notes?: string;
}

export interface CompanyImportRow {
  external_id?: string;
  nickname: string;
  company_legal_name: string;
  company_short_name?: string;
  registration_number?: string;
  vat_id?: string;
  establishment_date?: string;
  business_segment_code?: string;
  website?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_department?: string;
  status_code?: string;
  tags?: string;
  notes?: string;
}

export interface ParsedPhoneNumber {
  typeCode: string;
  number: string;
  isPrimary: boolean;
}

export interface ParsedEmail {
  typeCode: string;
  address: string;
  isPrimary: boolean;
}
