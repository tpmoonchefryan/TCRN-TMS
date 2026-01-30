// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsEmail,
    IsIn,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
    ValidateNested,
} from 'class-validator';

/**
 * Tencent Cloud SES configuration
 */
export class TencentSesConfigDto {
  @IsString()
  secretId!: string;

  @IsString()
  secretKey!: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsEmail()
  fromAddress!: string;

  @IsString()
  fromName!: string;

  @IsString()
  @IsOptional()
  replyTo?: string;
}

/**
 * SMTP configuration
 */
export class SmtpConfigDto {
  @IsString()
  host!: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  port!: number;

  @IsBoolean()
  secure!: boolean;

  @IsString()
  username!: string;

  @IsString()
  password!: string;

  @IsEmail()
  fromAddress!: string;

  @IsString()
  fromName!: string;
}

/**
 * Email provider type
 */
export type EmailProvider = 'tencent_ses' | 'smtp';

/**
 * Email configuration DTO for saving
 */
export class SaveEmailConfigDto {
  @IsIn(['tencent_ses', 'smtp'])
  provider!: EmailProvider;

  @IsOptional()
  @ValidateNested()
  @Type(() => TencentSesConfigDto)
  tencentSes?: TencentSesConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SmtpConfigDto)
  smtp?: SmtpConfigDto;
}

/**
 * Test email DTO
 */
export class TestEmailDto {
  @IsEmail()
  testEmail!: string;
}

/**
 * Email configuration response (with masked sensitive fields)
 */
export interface EmailConfigResponse {
  provider: EmailProvider;
  tencentSes?: {
    secretId: string; // Masked
    secretKey: string; // Masked
    region: string;
    fromAddress: string;
    fromName: string;
    replyTo?: string;
  };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string; // Masked
    fromAddress: string;
    fromName: string;
  };
  isConfigured: boolean;
  lastUpdated?: string;
}

/**
 * Internal email configuration (decrypted)
 */
export interface DecryptedEmailConfig {
  provider: EmailProvider;
  tencentSes?: {
    secretId: string;
    secretKey: string;
    region: string;
    fromAddress: string;
    fromName: string;
    replyTo?: string;
  };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromAddress: string;
    fromName: string;
  };
}

/**
 * Default regions for Tencent SES
 */
export const TENCENT_SES_REGIONS = [
  { value: 'ap-hongkong', label: 'Hong Kong (ap-hongkong)' },
  { value: 'ap-singapore', label: 'Singapore (ap-singapore)' },
  { value: 'ap-guangzhou', label: 'Guangzhou (ap-guangzhou)' },
  { value: 'ap-shanghai', label: 'Shanghai (ap-shanghai)' },
  { value: 'ap-beijing', label: 'Beijing (ap-beijing)' },
] as const;

/**
 * Default SMTP ports
 */
export const SMTP_DEFAULT_PORTS = {
  ssl: 465,
  tls: 587,
  plain: 25,
} as const;
