// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum ExportJobType {
  CUSTOMER_EXPORT = 'customer_export',
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
  @ApiProperty({
    enum: ExportJobType,
    description: 'Generic /exports currently supports customer_export only',
  })
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

  @ApiPropertyOptional({ description: 'Fields to export' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];
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
