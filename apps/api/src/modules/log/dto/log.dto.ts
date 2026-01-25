// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ChangeAction, LogSeverity, IntegrationDirection } from '@tcrn/shared';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';

/**
 * Base pagination DTO
 */
export class PaginationDto {
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

/**
 * Change Log Query DTO
 */
export class ChangeLogQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  objectType?: string;

  @IsOptional()
  @IsUUID()
  objectId?: string;

  @IsOptional()
  @IsUUID()
  operatorId?: string;

  @IsOptional()
  @IsEnum(ChangeAction)
  action?: ChangeAction;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  requestId?: string;
}

/**
 * Tech Event Log Query DTO
 */
export class TechEventLogQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(LogSeverity)
  severity?: LogSeverity;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  traceId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * Integration Log Query DTO
 */
export class IntegrationLogQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  consumerId?: string;

  @IsOptional()
  @IsString()
  consumerCode?: string;

  @IsOptional()
  @IsEnum(IntegrationDirection)
  direction?: IntegrationDirection;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  responseStatus?: number;

  @IsOptional()
  @IsString()
  traceId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * Log Search DTO
 */
export class LogSearchDto extends PaginationDto {
  @IsString()
  keyword!: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  logType?: 'change' | 'tech' | 'integration';
}
