// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
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
  @ApiPropertyOptional({
    description: 'Consumer code used to map upstream source records',
    example: 'CRM',
  })
  @IsOptional()
  @IsString()
  consumerCode?: string;
}

export class ImportJobQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by import-job status',
    enum: ImportJobStatus,
    example: ImportJobStatus.RUNNING,
  })
  @IsOptional()
  @IsEnum(ImportJobStatus)
  status?: ImportJobStatus;

  @ApiPropertyOptional({ description: 'Page number', example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20, minimum: 1, maximum: 50, default: 20 })
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
  primary_language?: string;
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
  status_code?: string;
  tags?: string;
  notes?: string;
}
