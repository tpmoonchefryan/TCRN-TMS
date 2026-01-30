// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min
} from 'class-validator';

// =============================================================================
// Enums
// =============================================================================

export enum ReportJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  CONSUMED = 'consumed',
  EXPIRED = 'expired',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
}

export enum ReportType {
  MFR = 'mfr',
}

// =============================================================================
// MFR Filter Criteria
// =============================================================================

export class MfrFilterCriteriaDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platformCodes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  membershipClassCodes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  membershipTypeCodes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  membershipLevelCodes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  statusCodes?: string[];

  @IsOptional()
  @IsString()
  validFromStart?: string;

  @IsOptional()
  @IsString()
  validFromEnd?: string;

  @IsOptional()
  @IsString()
  validToStart?: string;

  @IsOptional()
  @IsString()
  validToEnd?: string;

  @IsOptional()
  @IsBoolean()
  includeExpired?: boolean;

  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;
}

// =============================================================================
// Search Request
// =============================================================================

export class MfrSearchRequestDto {
  @IsUUID()
  talentId!: string;

  @IsOptional()
  @Type(() => MfrFilterCriteriaDto)
  filters?: MfrFilterCriteriaDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  previewLimit?: number = 20;
}

// =============================================================================
// Create Job Request
// =============================================================================

export enum ReportFormat {
  XLSX = 'xlsx',
  CSV = 'csv',
}

export class CreateMfrJobDto {
  @IsUUID()
  talentId!: string;

  @IsOptional()
  @Type(() => MfrFilterCriteriaDto)
  filters?: MfrFilterCriteriaDto;

  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat = ReportFormat.XLSX;
}

// =============================================================================
// Job List Query
// =============================================================================

export class ReportJobListQueryDto {
  @IsUUID()
  talentId!: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  createdFrom?: string;

  @IsOptional()
  @IsString()
  createdTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

// =============================================================================
// Response Interfaces
// =============================================================================

export interface MfrPreviewRow {
  nickname: string | null;
  platformName: string;
  membershipLevelName: string;
  validFrom: string;
  validTo: string | null;
  statusName: string;
}

export interface MfrSearchResult {
  totalCount: number;
  preview: MfrPreviewRow[];
  filterSummary: {
    platforms: string[];
    dateRange: string | null;
    includeExpired: boolean;
  };
}

export interface ReportJobResponse {
  id: string;
  reportType: string;
  status: ReportJobStatus;
  progress: {
    totalRows: number | null;
    processedRows: number;
    percentage: number;
  };
  error?: {
    code: string;
    message: string;
  };
  fileName: string | null;
  fileSizeBytes: number | null;
  queuedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    username: string;
  };
}

export interface ReportJobListItem {
  id: string;
  reportType: string;
  status: ReportJobStatus;
  totalRows: number | null;
  fileName: string | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
}
