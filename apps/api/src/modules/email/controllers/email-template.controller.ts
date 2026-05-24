// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ErrorCodes, SUPPORTED_UI_LOCALES, type LocalizedText } from '@tcrn/shared';

import { RequirePermissions } from '../../../common/decorators';
import { JwtAuthGuard } from '../../../common/guards';
import {
  CreateEmailTemplateDto,
  EmailTemplateQueryDto,
  PreviewEmailTemplateDto,
  UpdateEmailTemplateDto,
} from '../dto/email-template.dto';
import type { SupportedLocale } from '../interfaces/email.interface';
import { EmailTemplateService } from '../services/email-template.service';

const createErrorEnvelopeSchema = (code: string, message: string) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: code },
        message: { type: 'string', example: message },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
  example: {
    success: false,
    error: { code, message },
  },
});

const localizedTextSchema = (example: LocalizedText) => ({
  type: 'object',
  additionalProperties: { type: 'string' },
  properties: Object.fromEntries(
    SUPPORTED_UI_LOCALES.map((locale) => [locale, { type: 'string', example: example[locale] }])
  ),
  required: [...SUPPORTED_UI_LOCALES],
});

const NAME_EXAMPLE: LocalizedText = {
  en: 'Welcome Email',
  zh_HANS: '欢迎邮件',
  zh_HANT: '歡迎郵件',
  ja: 'ウェルカムメール',
  ko: '환영 이메일',
  fr: 'E-mail de bienvenue',
};

const SUBJECT_EXAMPLE: LocalizedText = {
  en: 'Welcome to TCRN',
  zh_HANS: '欢迎来到 TCRN',
  zh_HANT: '歡迎來到 TCRN',
  ja: 'TCRN へようこそ',
  ko: 'TCRN에 오신 것을 환영합니다',
  fr: 'Bienvenue sur TCRN',
};

const BODY_HTML_EXAMPLE: LocalizedText = {
  en: '<p>Hello {{name}}</p>',
  zh_HANS: '<p>你好 {{name}}</p>',
  zh_HANT: '<p>你好 {{name}}</p>',
  ja: '<p>こんにちは {{name}}</p>',
  ko: '<p>안녕하세요 {{name}}</p>',
  fr: '<p>Bonjour {{name}}</p>',
};

const BODY_TEXT_EXAMPLE: LocalizedText = {
  en: 'Hello {{name}}',
  zh_HANS: '你好 {{name}}',
  zh_HANT: '你好 {{name}}',
  ja: 'こんにちは {{name}}',
  ko: '안녕하세요 {{name}}',
  fr: 'Bonjour {{name}}',
};

const EMAIL_TEMPLATE_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', example: 'WELCOME_EMAIL' },
    name: localizedTextSchema(NAME_EXAMPLE),
    subject: localizedTextSchema(SUBJECT_EXAMPLE),
    bodyHtml: localizedTextSchema(BODY_HTML_EXAMPLE),
    bodyText: localizedTextSchema(BODY_TEXT_EXAMPLE),
    variables: {
      type: 'array',
      items: { type: 'string' },
      example: ['name', 'supportEmail'],
    },
    category: { type: 'string', example: 'system' },
    isActive: { type: 'boolean', example: true },
  },
  required: [
    'code',
    'name',
    'subject',
    'bodyHtml',
    'bodyText',
    'variables',
    'category',
    'isActive',
  ],
};

const EMAIL_TEMPLATE_PREVIEW_SCHEMA = {
  type: 'object',
  properties: {
    subject: { type: 'string', example: 'Welcome to TCRN' },
    htmlBody: { type: 'string', example: '<p>Hello Aki</p>' },
    textBody: { type: 'string', nullable: true, example: 'Hello Aki' },
  },
  required: ['subject', 'htmlBody'],
};

const EMAIL_TEMPLATE_UNAUTHORIZED_SCHEMA = createErrorEnvelopeSchema(
  'AUTH_UNAUTHORIZED',
  'Authentication required'
);

const EMAIL_TEMPLATE_FORBIDDEN_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.PERM_ACCESS_DENIED,
  'Access denied'
);

const EMAIL_TEMPLATE_NOT_FOUND_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_NOT_FOUND,
  "Template with code 'WELCOME_EMAIL' not found"
);

const EMAIL_TEMPLATE_CONFLICT_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.RES_ALREADY_EXISTS,
  "Template with code 'WELCOME_EMAIL' already exists"
);

const EMAIL_TEMPLATE_BAD_REQUEST_SCHEMA = createErrorEnvelopeSchema(
  ErrorCodes.VALIDATION_FAILED,
  'Email template request is invalid'
);

@ApiTags('Ops - Email')
@ApiBearerAuth()
@Controller('email-templates')
@UseGuards(JwtAuthGuard)
export class EmailTemplateController {
  constructor(private readonly templateService: EmailTemplateService) {}

  @Get()
  @RequirePermissions({ resource: 'email.template', action: 'read' })
  @ApiOperation({ summary: 'List email templates' })
  @ApiResponse({
    status: 200,
    description: 'Returns email templates',
    schema: {
      type: 'array',
      items: EMAIL_TEMPLATE_ITEM_SCHEMA,
      example: [
        {
          code: 'WELCOME_EMAIL',
          name: NAME_EXAMPLE,
          subject: SUBJECT_EXAMPLE,
          bodyHtml: BODY_HTML_EXAMPLE,
          bodyText: BODY_TEXT_EXAMPLE,
          variables: ['name', 'supportEmail'],
          category: 'system',
          isActive: true,
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to read email templates',
    schema: EMAIL_TEMPLATE_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to read email templates',
    schema: EMAIL_TEMPLATE_FORBIDDEN_SCHEMA,
  })
  async findAll(@Query() query: EmailTemplateQueryDto) {
    return this.templateService.findAll(query);
  }

  @Get(':code')
  @RequirePermissions({ resource: 'email.template', action: 'read' })
  @ApiOperation({ summary: 'Get email template by code' })
  @ApiParam({
    name: 'code',
    description: 'Email-template code',
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns email template detail',
    schema: EMAIL_TEMPLATE_ITEM_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to read email template detail',
    schema: EMAIL_TEMPLATE_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to read email template detail',
    schema: EMAIL_TEMPLATE_FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Email template was not found',
    schema: EMAIL_TEMPLATE_NOT_FOUND_SCHEMA,
  })
  async findOne(@Param('code') code: string) {
    return this.templateService.findByCode(code);
  }

  @Post()
  @RequirePermissions({ resource: 'email.template', action: 'create' })
  @ApiOperation({ summary: 'Create email template' })
  @ApiResponse({
    status: 201,
    description: 'Email template created',
    schema: EMAIL_TEMPLATE_ITEM_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Email-template payload is invalid',
    schema: EMAIL_TEMPLATE_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to create email templates',
    schema: EMAIL_TEMPLATE_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to create email templates',
    schema: EMAIL_TEMPLATE_FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 409,
    description: 'Email template code already exists',
    schema: EMAIL_TEMPLATE_CONFLICT_SCHEMA,
  })
  async create(@Body() dto: CreateEmailTemplateDto) {
    return this.templateService.create(dto);
  }

  @Patch(':code')
  @RequirePermissions({ resource: 'email.template', action: 'update' })
  @ApiOperation({ summary: 'Update email template' })
  @ApiParam({
    name: 'code',
    description: 'Email-template code',
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 200,
    description: 'Email template updated',
    schema: EMAIL_TEMPLATE_ITEM_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Email-template update is invalid',
    schema: EMAIL_TEMPLATE_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to update email templates',
    schema: EMAIL_TEMPLATE_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to update email templates',
    schema: EMAIL_TEMPLATE_FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Email template was not found',
    schema: EMAIL_TEMPLATE_NOT_FOUND_SCHEMA,
  })
  async update(@Param('code') code: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.templateService.update(code, dto);
  }

  @Delete(':code')
  @RequirePermissions({ resource: 'email.template', action: 'delete' })
  @ApiOperation({ summary: 'Deactivate email template' })
  @ApiParam({
    name: 'code',
    description: 'Email-template code',
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 200,
    description: 'Email template deactivated',
    schema: EMAIL_TEMPLATE_ITEM_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to deactivate email templates',
    schema: EMAIL_TEMPLATE_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to deactivate email templates',
    schema: EMAIL_TEMPLATE_FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Email template was not found',
    schema: EMAIL_TEMPLATE_NOT_FOUND_SCHEMA,
  })
  async deactivate(@Param('code') code: string) {
    return this.templateService.deactivate(code);
  }

  @Post(':code/reactivate')
  @RequirePermissions({ resource: 'email.template', action: 'update' })
  @ApiOperation({ summary: 'Reactivate email template' })
  @ApiParam({
    name: 'code',
    description: 'Email-template code',
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 200,
    description: 'Email template reactivated',
    schema: EMAIL_TEMPLATE_ITEM_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to reactivate email templates',
    schema: EMAIL_TEMPLATE_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to reactivate email templates',
    schema: EMAIL_TEMPLATE_FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Email template was not found',
    schema: EMAIL_TEMPLATE_NOT_FOUND_SCHEMA,
  })
  async reactivate(@Param('code') code: string) {
    return this.templateService.reactivate(code);
  }

  @Post(':code/preview')
  @RequirePermissions({ resource: 'email.template', action: 'read' })
  @ApiOperation({ summary: 'Preview rendered email template' })
  @ApiParam({
    name: 'code',
    description: 'Email-template code',
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns rendered email preview',
    schema: EMAIL_TEMPLATE_PREVIEW_SCHEMA,
  })
  @ApiResponse({
    status: 400,
    description: 'Preview request is invalid',
    schema: EMAIL_TEMPLATE_BAD_REQUEST_SCHEMA,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required to preview email templates',
    schema: EMAIL_TEMPLATE_UNAUTHORIZED_SCHEMA,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to preview email templates',
    schema: EMAIL_TEMPLATE_FORBIDDEN_SCHEMA,
  })
  @ApiResponse({
    status: 404,
    description: 'Email template was not found',
    schema: EMAIL_TEMPLATE_NOT_FOUND_SCHEMA,
  })
  async preview(@Param('code') code: string, @Body() dto: PreviewEmailTemplateDto) {
    return this.templateService.preview(
      code,
      (dto.locale as SupportedLocale) || 'en',
      dto.variables || {}
    );
  }
}
