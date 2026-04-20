// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SUPPORTED_UI_LOCALES } from '@tcrn/shared';
import {
    IsArray,
    IsBoolean,
    IsIn,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateEmailTemplateDto {
  @ApiProperty({ description: 'Unique template code', example: 'WELCOME_EMAIL', maxLength: 64 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code!: string;

  @ApiProperty({ description: 'Template name in English', example: 'Welcome Email', maxLength: 128 })
  @IsString()
  @MaxLength(128)
  nameEn!: string;

  @ApiPropertyOptional({ description: 'Template name in Chinese', example: '欢迎邮件', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameZh?: string;

  @ApiPropertyOptional({ description: 'Template name in Japanese', example: 'ウェルカムメール', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameJa?: string;

  @ApiPropertyOptional({
    description: 'Managed name translations by locale code',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      en: 'Welcome Email',
      zh_HANS: '欢迎邮件',
      zh_HANT: '歡迎郵件',
      fr: 'E-mail de bienvenue',
    },
  })
  @IsOptional()
  @IsObject()
  translations?: Record<string, string>;

  @ApiProperty({ description: 'Subject in English', example: 'Welcome to TCRN', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  subjectEn!: string;

  @ApiPropertyOptional({ description: 'Subject in Chinese', example: '欢迎来到 TCRN', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subjectZh?: string;

  @ApiPropertyOptional({ description: 'Subject in Japanese', example: 'TCRN へようこそ', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subjectJa?: string;

  @ApiPropertyOptional({
    description: 'Managed subject translations by locale code',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      en: 'Welcome to TCRN',
      zh_HANS: '欢迎来到 TCRN',
      ko: 'TCRN에 오신 것을 환영합니다',
    },
  })
  @IsOptional()
  @IsObject()
  subjectTranslations?: Record<string, string>;

  @ApiProperty({ description: 'HTML body in English', example: '<p>Hello {{name}}</p>' })
  @IsString()
  bodyHtmlEn!: string;

  @ApiPropertyOptional({ description: 'HTML body in Chinese', example: '<p>你好 {{name}}</p>' })
  @IsOptional()
  @IsString()
  bodyHtmlZh?: string;

  @ApiPropertyOptional({ description: 'HTML body in Japanese', example: '<p>こんにちは {{name}}</p>' })
  @IsOptional()
  @IsString()
  bodyHtmlJa?: string;

  @ApiPropertyOptional({
    description: 'Managed HTML body translations by locale code',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  bodyHtmlTranslations?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Plain-text body in English', example: 'Hello {{name}}' })
  @IsOptional()
  @IsString()
  bodyTextEn?: string;

  @ApiPropertyOptional({ description: 'Plain-text body in Chinese', example: '你好 {{name}}' })
  @IsOptional()
  @IsString()
  bodyTextZh?: string;

  @ApiPropertyOptional({ description: 'Plain-text body in Japanese', example: 'こんにちは {{name}}' })
  @IsOptional()
  @IsString()
  bodyTextJa?: string;

  @ApiPropertyOptional({
    description: 'Managed plain-text body translations by locale code',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  bodyTextTranslations?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Template variables available for rendering',
    example: ['name', 'supportEmail'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiProperty({ description: 'Template category', enum: ['system', 'business'], example: 'system' })
  @IsIn(['system', 'business'])
  category!: string;
}

export class UpdateEmailTemplateDto {
  @ApiPropertyOptional({ description: 'Template name in English', example: 'Welcome Email', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Template name in Chinese', example: '欢迎邮件', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameZh?: string;

  @ApiPropertyOptional({ description: 'Template name in Japanese', example: 'ウェルカムメール', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameJa?: string;

  @ApiPropertyOptional({
    description: 'Managed name translations by locale code',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  translations?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Subject in English', example: 'Welcome to TCRN', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subjectEn?: string;

  @ApiPropertyOptional({ description: 'Subject in Chinese', example: '欢迎来到 TCRN', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subjectZh?: string;

  @ApiPropertyOptional({ description: 'Subject in Japanese', example: 'TCRN へようこそ', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subjectJa?: string;

  @ApiPropertyOptional({
    description: 'Managed subject translations by locale code',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  subjectTranslations?: Record<string, string>;

  @ApiPropertyOptional({ description: 'HTML body in English', example: '<p>Hello {{name}}</p>' })
  @IsOptional()
  @IsString()
  bodyHtmlEn?: string;

  @ApiPropertyOptional({ description: 'HTML body in Chinese', example: '<p>你好 {{name}}</p>' })
  @IsOptional()
  @IsString()
  bodyHtmlZh?: string;

  @ApiPropertyOptional({ description: 'HTML body in Japanese', example: '<p>こんにちは {{name}}</p>' })
  @IsOptional()
  @IsString()
  bodyHtmlJa?: string;

  @ApiPropertyOptional({
    description: 'Managed HTML body translations by locale code',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  bodyHtmlTranslations?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Plain-text body in English', example: 'Hello {{name}}' })
  @IsOptional()
  @IsString()
  bodyTextEn?: string;

  @ApiPropertyOptional({ description: 'Plain-text body in Chinese', example: '你好 {{name}}' })
  @IsOptional()
  @IsString()
  bodyTextZh?: string;

  @ApiPropertyOptional({ description: 'Plain-text body in Japanese', example: 'こんにちは {{name}}' })
  @IsOptional()
  @IsString()
  bodyTextJa?: string;

  @ApiPropertyOptional({
    description: 'Managed plain-text body translations by locale code',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  bodyTextTranslations?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Template variables available for rendering',
    example: ['name', 'supportEmail'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({ description: 'Template category', enum: ['system', 'business'], example: 'system' })
  @IsOptional()
  @IsIn(['system', 'business'])
  category?: string;

  @ApiPropertyOptional({ description: 'Whether the template is active', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PreviewEmailTemplateDto {
  @ApiPropertyOptional({ description: 'Preview locale', enum: SUPPORTED_UI_LOCALES, example: 'ja' })
  @IsOptional()
  @IsIn(SUPPORTED_UI_LOCALES)
  locale?: string;

  @ApiPropertyOptional({
    description: 'Variables injected during preview rendering',
    example: { name: 'Aki', supportEmail: 'support@example.com' },
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsString()
  variables?: Record<string, string>;
}

export class EmailTemplateQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category', enum: ['system', 'business'], example: 'system' })
  @IsOptional()
  @IsIn(['system', 'business'])
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by active state', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
