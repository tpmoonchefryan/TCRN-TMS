// SPDX-License-Identifier: Apache-2.0
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

import { SUPPORTED_UI_LOCALES, type LocalizedText, type PartialLocalizedText } from '@tcrn/shared';

const LOCALIZED_TEXT_EXAMPLE: LocalizedText = {
  en: 'Welcome Email',
  zh_HANS: '欢迎邮件',
  zh_HANT: '歡迎郵件',
  ja: 'ウェルカムメール',
  ko: '환영 이메일',
  fr: 'E-mail de bienvenue',
};

export class CreateEmailTemplateDto {
  @ApiProperty({ description: 'Unique template code', example: 'WELCOME_EMAIL', maxLength: 64 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code!: string;

  @ApiProperty({
    description: 'Localized template name keyed by supported UI locale',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: LOCALIZED_TEXT_EXAMPLE,
  })
  @IsObject()
  name!: LocalizedText;

  @ApiProperty({
    description: 'Localized subject keyed by supported UI locale',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      en: 'Welcome to TCRN',
      zh_HANS: '欢迎来到 TCRN',
      zh_HANT: '歡迎來到 TCRN',
      ja: 'TCRN へようこそ',
      ko: 'TCRN에 오신 것을 환영합니다',
      fr: 'Bienvenue sur TCRN',
    },
  })
  @IsObject()
  subject!: LocalizedText;

  @ApiProperty({
    description: 'Localized HTML body keyed by supported UI locale',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      en: '<p>Hello {{name}}</p>',
      zh_HANS: '<p>你好 {{name}}</p>',
      zh_HANT: '<p>你好 {{name}}</p>',
      ja: '<p>こんにちは {{name}}</p>',
      ko: '<p>안녕하세요 {{name}}</p>',
      fr: '<p>Bonjour {{name}}</p>',
    },
  })
  @IsObject()
  bodyHtml!: LocalizedText;

  @ApiPropertyOptional({
    description: 'Localized plain-text body keyed by supported UI locale',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      en: 'Hello {{name}}',
      zh_HANS: '你好 {{name}}',
      zh_HANT: '你好 {{name}}',
      ja: 'こんにちは {{name}}',
      ko: '안녕하세요 {{name}}',
      fr: 'Bonjour {{name}}',
    },
  })
  @IsOptional()
  @IsObject()
  bodyText?: LocalizedText;

  @ApiPropertyOptional({
    description: 'Template variables available for rendering',
    example: ['name', 'supportEmail'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiProperty({
    description: 'Template category',
    enum: ['system', 'business'],
    example: 'system',
  })
  @IsIn(['system', 'business'])
  category!: string;
}

export class UpdateEmailTemplateDto {
  @ApiPropertyOptional({
    description: 'Localized template name patch keyed by supported UI locale',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  name?: PartialLocalizedText;

  @ApiPropertyOptional({
    description: 'Localized subject patch keyed by supported UI locale',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  subject?: PartialLocalizedText;

  @ApiPropertyOptional({
    description: 'Localized HTML body patch keyed by supported UI locale',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  bodyHtml?: PartialLocalizedText;

  @ApiPropertyOptional({
    description: 'Localized plain-text body patch keyed by supported UI locale',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  bodyText?: PartialLocalizedText;

  @ApiPropertyOptional({
    description: 'Template variables available for rendering',
    example: ['name', 'supportEmail'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({
    description: 'Template category',
    enum: ['system', 'business'],
    example: 'system',
  })
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
  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: ['system', 'business'],
    example: 'system',
  })
  @IsOptional()
  @IsIn(['system', 'business'])
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by active state', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
