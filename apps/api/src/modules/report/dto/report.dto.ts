// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiPropertyOptional({ description: 'Filter by platform codes', example: ['youtube', 'bilibili'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platformCodes?: string[];

  @ApiPropertyOptional({ description: 'Filter by membership class codes', example: ['premium'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  membershipClassCodes?: string[];

  @ApiPropertyOptional({ description: 'Filter by membership type codes', example: ['monthly'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  membershipTypeCodes?: string[];

  @ApiPropertyOptional({ description: 'Filter by membership level codes', example: ['gold'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  membershipLevelCodes?: string[];

  @ApiPropertyOptional({ description: 'Filter by customer status codes', example: ['active'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  statusCodes?: string[];

  @ApiPropertyOptional({ description: 'Membership valid-from start date', example: '2026-01-01' })
  @IsOptional()
  @IsString()
  validFromStart?: string;

  @ApiPropertyOptional({ description: 'Membership valid-from end date', example: '2026-03-31' })
  @IsOptional()
  @IsString()
  validFromEnd?: string;

  @ApiPropertyOptional({ description: 'Membership valid-to start date', example: '2026-01-01' })
  @IsOptional()
  @IsString()
  validToStart?: string;

  @ApiPropertyOptional({ description: 'Membership valid-to end date', example: '2026-12-31' })
  @IsOptional()
  @IsString()
  validToEnd?: string;

  @ApiPropertyOptional({ description: 'Include expired memberships', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  includeExpired?: boolean;

  @ApiPropertyOptional({ description: 'Include inactive memberships', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;
}

// =============================================================================
// Search Request
// =============================================================================

export class MfrSearchRequestDto {
  @ApiProperty({ description: 'Talent identifier', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440010' })
  @IsUUID()
  talentId!: string;

  @ApiPropertyOptional({ description: 'MFR filter criteria', type: MfrFilterCriteriaDto })
  @IsOptional()
  @Type(() => MfrFilterCriteriaDto)
  filters?: MfrFilterCriteriaDto;

  @ApiPropertyOptional({ description: 'Preview row limit', example: 20, minimum: 1, maximum: 100, default: 20 })
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
  @ApiProperty({ description: 'Talent identifier', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440010' })
  @IsUUID()
  talentId!: string;

  @ApiPropertyOptional({ description: 'MFR filter criteria', type: MfrFilterCriteriaDto })
  @IsOptional()
  @Type(() => MfrFilterCriteriaDto)
  filters?: MfrFilterCriteriaDto;

  @ApiPropertyOptional({ description: 'Export format', enum: ReportFormat, example: ReportFormat.XLSX, default: ReportFormat.XLSX })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat = ReportFormat.XLSX;
}

// =============================================================================
// Job List Query
// =============================================================================

export class ReportJobListQueryDto {
  @ApiProperty({ description: 'Talent identifier', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440010' })
  @IsUUID()
  talentId!: string;

  @ApiPropertyOptional({
    description: 'Filter by one or more report-job statuses',
    example: 'pending,success',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Created-at lower bound', example: '2026-04-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  createdFrom?: string;

  @ApiPropertyOptional({ description: 'Created-at upper bound', example: '2026-04-30T23:59:59.999Z' })
  @IsOptional()
  @IsString()
  createdTo?: string;

  @ApiPropertyOptional({ description: 'Page number', example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20, minimum: 1, maximum: 100, default: 20 })
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

export interface LocalReportJobCreateResponse {
  deliveryMode: 'tms_job';
  jobId: string;
  status: ReportJobStatus;
  estimatedRows: number;
  createdAt: string;
}

export interface PiiPlatformReportCreateResponse {
  deliveryMode: 'pii_platform_portal';
  requestId: string;
  redirectUrl: string;
  expiresAt: string;
  estimatedRows: number;
  customerCount: number;
}

export type ReportCreateResponse =
  | LocalReportJobCreateResponse
  | PiiPlatformReportCreateResponse;

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
