// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  type CreateExportJobInput,
  DataExportFormatSchema,
  type ExportJobQueryInput,
  ExportJobStatusSchema,
  ExportJobTypeSchema,
} from '@tcrn/shared';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

const EXPORT_JOB_TYPE_VALUES = ExportJobTypeSchema.options;
const EXPORT_FORMAT_VALUES = DataExportFormatSchema.options;
const EXPORT_JOB_STATUS_VALUES = ExportJobStatusSchema.options;

export const ExportJobType = {
  CUSTOMER_EXPORT: EXPORT_JOB_TYPE_VALUES[0],
} as const;

export type ExportJobTypeValue = CreateExportJobInput['jobType'];

export const ExportFormat = {
  CSV: EXPORT_FORMAT_VALUES[0],
  XLSX: EXPORT_FORMAT_VALUES[1],
  JSON: EXPORT_FORMAT_VALUES[2],
} as const;

export type ExportFormatValue = NonNullable<CreateExportJobInput['format']>;

export const ExportJobStatus = {
  PENDING: EXPORT_JOB_STATUS_VALUES[0],
  RUNNING: EXPORT_JOB_STATUS_VALUES[1],
  SUCCESS: EXPORT_JOB_STATUS_VALUES[2],
  FAILED: EXPORT_JOB_STATUS_VALUES[3],
  CANCELLED: EXPORT_JOB_STATUS_VALUES[4],
} as const;

export type ExportJobStatusValue = NonNullable<ExportJobQueryInput['status']>;

export class CreateExportJobDto {
  @ApiProperty({
    enum: EXPORT_JOB_TYPE_VALUES,
    description: 'Generic /exports currently supports customer_export only',
  })
  @IsIn(EXPORT_JOB_TYPE_VALUES)
  jobType!: CreateExportJobInput['jobType'];

  @ApiPropertyOptional({ enum: EXPORT_FORMAT_VALUES, default: ExportFormat.CSV })
  @IsOptional()
  @IsIn(EXPORT_FORMAT_VALUES)
  format?: CreateExportJobInput['format'] = ExportFormat.CSV;

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
  @ApiPropertyOptional({ enum: EXPORT_JOB_STATUS_VALUES })
  @IsOptional()
  @IsIn(EXPORT_JOB_STATUS_VALUES)
  status?: ExportJobQueryInput['status'];

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  pageSize?: number = 20;
}

export interface ExportJobResponse {
  id: string;
  jobType: ExportJobTypeValue;
  format: ExportFormatValue;
  status: ExportJobStatusValue;
  fileName: string | null;
  totalRecords: number;
  processedRecords: number;
  downloadUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
  completedAt: string | null;
}
