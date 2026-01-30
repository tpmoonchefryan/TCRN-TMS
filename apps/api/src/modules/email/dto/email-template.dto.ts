// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License


import {
    IsArray,
    IsBoolean,
    IsIn,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateEmailTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code!: string;

  @IsString()
  @MaxLength(128)
  nameEn!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameZh?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameJa?: string;

  @IsString()
  @MaxLength(255)
  subjectEn!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subjectZh?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subjectJa?: string;

  @IsString()
  bodyHtmlEn!: string;

  @IsOptional()
  @IsString()
  bodyHtmlZh?: string;

  @IsOptional()
  @IsString()
  bodyHtmlJa?: string;

  @IsOptional()
  @IsString()
  bodyTextEn?: string;

  @IsOptional()
  @IsString()
  bodyTextZh?: string;

  @IsOptional()
  @IsString()
  bodyTextJa?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsIn(['system', 'business'])
  category!: string;
}

export class UpdateEmailTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameZh?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameJa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subjectEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subjectZh?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subjectJa?: string;

  @IsOptional()
  @IsString()
  bodyHtmlEn?: string;

  @IsOptional()
  @IsString()
  bodyHtmlZh?: string;

  @IsOptional()
  @IsString()
  bodyHtmlJa?: string;

  @IsOptional()
  @IsString()
  bodyTextEn?: string;

  @IsOptional()
  @IsString()
  bodyTextZh?: string;

  @IsOptional()
  @IsString()
  bodyTextJa?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsIn(['system', 'business'])
  category?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PreviewEmailTemplateDto {
  @IsOptional()
  @IsIn(['en', 'zh', 'ja'])
  locale?: string;

  @IsOptional()
  @IsString()
  variables?: Record<string, string>;
}

export class EmailTemplateQueryDto {
  @IsOptional()
  @IsIn(['system', 'business'])
  category?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
