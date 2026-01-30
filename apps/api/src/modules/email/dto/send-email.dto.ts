// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class SendEmailDto {
  @IsString()
  tenantSchema!: string;

  @IsString()
  templateCode!: string;

  @IsOptional()
  @IsString()
  recipientPiiId?: string;

  @IsOptional()
  @IsString()
  recipientEmail?: string;

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
