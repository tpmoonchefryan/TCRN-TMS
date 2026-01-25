// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { IsEnum, IsOptional, IsString, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ExportJobType {
  CUSTOMER_EXPORT = 'customer_export',
  MEMBERSHIP_EXPORT = 'membership_export',
  REPORT_EXPORT = 'report_export',
  MARSHMALLOW_EXPORT = 'marshmallow_export',
}

export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
  JSON = 'json',
}

export enum ExportJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export class CreateExportJobDto {
  @ApiProperty({ enum: ExportJobType })
  @IsEnum(ExportJobType)
  jobType: ExportJobType;

  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.CSV })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.CSV;

  @ApiPropertyOptional({ description: 'Filter by customer IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  customerIds?: string[];

  @ApiPropertyOptional({ description: 'Filter by tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Filter by membership class code' })
  @IsOptional()
  @IsString()
  membershipClassCode?: string;

  @ApiPropertyOptional({ description: 'Include PII fields (requires permission)' })
  @IsOptional()
  includePii?: boolean = false;

  @ApiPropertyOptional({ description: 'Fields to export' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  // Marshmallow-specific filters
  @ApiPropertyOptional({ description: 'Filter by message status (for marshmallow)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  messageStatus?: string[];

  @ApiPropertyOptional({ description: 'Start date for marshmallow export' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for marshmallow export' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Include rejected messages (for marshmallow)' })
  @IsOptional()
  includeRejected?: boolean = false;
}

export class ExportJobQueryDto {
  @ApiPropertyOptional({ enum: ExportJobStatus })
  @IsOptional()
  @IsEnum(ExportJobStatus)
  status?: ExportJobStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  pageSize?: number = 20;
}

export interface ExportJobResponse {
  id: string;
  jobType: ExportJobType;
  format: ExportFormat;
  status: ExportJobStatus;
  fileName: string | null;
  totalRecords: number;
  processedRecords: number;
  downloadUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
  completedAt: string | null;
}
