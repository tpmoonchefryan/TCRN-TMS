// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { IsEmail, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

import { SUPPORTED_UI_LOCALES } from '@tcrn/shared';

export class SendEmailDto {
  @IsString()
  tenantSchema!: string;

  @IsString()
  templateCode!: string;

  @IsEmail()
  recipientEmail!: string;

  @IsOptional()
  @IsIn(SUPPORTED_UI_LOCALES)
  locale?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}

export class SendEmailResponseDto {
  jobId!: string;
}
