// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsEmail,
    IsIn,
    IsNumber,
    IsObject,
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
  @ApiProperty({ description: 'Tencent Cloud Secret ID', example: 'AKIDEXAMPLE1234' })
  @IsString()
  secretId!: string;

  @ApiProperty({ description: 'Tencent Cloud Secret Key', example: 'super-secret-key' })
  @IsString()
  secretKey!: string;

  @ApiPropertyOptional({ description: 'Tencent SES region', example: 'ap-hongkong' })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiProperty({ description: 'Sender email address', example: 'noreply@tcrn.app' })
  @IsEmail()
  fromAddress!: string;

  @ApiProperty({ description: 'Sender display name', example: 'TCRN TMS' })
  @IsString()
  fromName!: string;

  @ApiPropertyOptional({ description: 'Optional reply-to address', example: 'support@tcrn.app' })
  @IsString()
  @IsOptional()
  replyTo?: string;
}

/**
 * SMTP configuration
 */
export class SmtpConfigDto {
  @ApiProperty({ description: 'SMTP host', example: 'smtp.example.com' })
  @IsString()
  host!: string;

  @ApiProperty({ description: 'SMTP port', example: 465, minimum: 1, maximum: 65535 })
  @IsNumber()
  @Min(1)
  @Max(65535)
  port!: number;

  @ApiProperty({ description: 'Whether the SMTP transport uses TLS/SSL', example: true })
  @IsBoolean()
  secure!: boolean;

  @ApiProperty({ description: 'SMTP username', example: 'smtp-user' })
  @IsString()
  username!: string;

  @ApiProperty({ description: 'SMTP password', example: 'smtp-password' })
  @IsString()
  password!: string;

  @ApiProperty({ description: 'Sender email address', example: 'noreply@tcrn.app' })
  @IsEmail()
  fromAddress!: string;

  @ApiProperty({ description: 'Sender display name', example: 'TCRN TMS' })
  @IsString()
  fromName!: string;
}

export class TenantEmailSenderOverrideDto {
  @ApiPropertyOptional({ description: 'Tenant-specific sender email address', example: 'tenant-a@example.com' })
  @IsEmail()
  @IsOptional()
  fromAddress?: string;

  @ApiPropertyOptional({ description: 'Tenant-specific sender display name', example: 'Tenant A Support' })
  @IsString()
  @IsOptional()
  fromName?: string;

  @ApiPropertyOptional({ description: 'Tenant-specific reply-to address', example: 'tenant-a-support@example.com' })
  @IsEmail()
  @IsOptional()
  replyTo?: string;
}

/**
 * Email provider type
 */
export type EmailProvider = 'tencent_ses' | 'smtp';

/**
 * Email configuration DTO for saving
 */
export class SaveEmailConfigDto {
  @ApiProperty({ enum: ['tencent_ses', 'smtp'], example: 'smtp' })
  @IsIn(['tencent_ses', 'smtp'])
  provider!: EmailProvider;

  @ApiPropertyOptional({ type: () => TencentSesConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TencentSesConfigDto)
  tencentSes?: TencentSesConfigDto;

  @ApiPropertyOptional({ type: () => SmtpConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SmtpConfigDto)
  smtp?: SmtpConfigDto;

  @ApiPropertyOptional({
    description: 'Tenant-schema keyed sender identity overrides managed by AC administrators',
    additionalProperties: {
      type: 'object',
      properties: {
        fromAddress: { type: 'string', example: 'tenant-a@example.com' },
        fromName: { type: 'string', example: 'Tenant A Support' },
        replyTo: { type: 'string', example: 'tenant-a-support@example.com' },
      },
    },
    example: {
      tenant_acme: {
        fromAddress: 'noreply@acme.example.com',
        fromName: 'Acme Support',
        replyTo: 'support@acme.example.com',
      },
    },
  })
  @IsObject()
  @IsOptional()
  tenantSenderOverrides?: Record<string, TenantEmailSenderOverrideDto>;
}

/**
 * Test email DTO
 */
export class TestEmailDto {
  @ApiProperty({ description: 'Destination email address for the test message', example: 'operator@tcrn.app' })
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
  tenantSenderOverrides?: Record<string, {
    fromAddress?: string;
    fromName?: string;
    replyTo?: string;
  }>;
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
  tenantSenderOverrides?: Record<string, {
    fromAddress?: string;
    fromName?: string;
    replyTo?: string;
  }>;
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
