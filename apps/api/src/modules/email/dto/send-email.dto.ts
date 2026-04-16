// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { IsEmail, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class SendEmailDto {
  @IsString()
  tenantSchema!: string;

  @IsString()
  templateCode!: string;

  @IsEmail()
  recipientEmail!: string;

  @IsOptional()
  @IsIn(['en', 'zh', 'ja'])
  locale?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}

export class SendEmailResponseDto {
  jobId!: string;
}
