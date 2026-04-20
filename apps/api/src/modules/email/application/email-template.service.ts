// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';

import {
  decorateEmailTemplate,
  type EmailTemplateStoredRecord,
  fillPreviewVariables,
  renderEmailTemplate,
} from '../domain/email-template.policy';
import { buildEmailTemplateTranslationPayload } from '../domain/email-template-translation.policy';
import type {
  CreateEmailTemplateDto,
  EmailTemplateQueryDto,
  UpdateEmailTemplateDto,
} from '../dto/email-template.dto';
import { EmailTemplateRepository } from '../infrastructure/email-template.repository';
import type { RenderedEmail, SupportedLocale } from '../interfaces/email.interface';

@Injectable()
export class EmailTemplateApplicationService {
  constructor(
    private readonly emailTemplateRepository: EmailTemplateRepository,
  ) {}

  async findAll(query?: EmailTemplateQueryDto) {
    const templates = await this.emailTemplateRepository.findMany({
      category: query?.category,
      isActive: query?.isActive,
    });

    return templates.map((template) => decorateEmailTemplate(template));
  }

  async findByCode(code: string) {
    const template = await this.emailTemplateRepository.findByCode(code);
    return template ? decorateEmailTemplate(template) : null;
  }

  async create(dto: CreateEmailTemplateDto) {
    const existing = await this.emailTemplateRepository.findByCode(dto.code);

    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.RES_ALREADY_EXISTS,
        message: `Template with code '${dto.code}' already exists`,
      });
    }

    const translationPayload = buildEmailTemplateTranslationPayload(dto);
    const created = await this.emailTemplateRepository.create({
      code: dto.code,
      nameEn: translationPayload.nameEn ?? dto.nameEn,
      nameZh: translationPayload.nameZh,
      nameJa: translationPayload.nameJa,
      subjectEn: translationPayload.subjectEn ?? dto.subjectEn,
      subjectZh: translationPayload.subjectZh,
      subjectJa: translationPayload.subjectJa,
      bodyHtmlEn: translationPayload.bodyHtmlEn ?? dto.bodyHtmlEn,
      bodyHtmlZh: translationPayload.bodyHtmlZh,
      bodyHtmlJa: translationPayload.bodyHtmlJa,
      bodyTextEn: translationPayload.bodyTextEn,
      bodyTextZh: translationPayload.bodyTextZh,
      bodyTextJa: translationPayload.bodyTextJa,
      variables: dto.variables || [],
      category: dto.category,
      extraData: translationPayload.extraData,
    });

    return decorateEmailTemplate(created);
  }

  async update(code: string, dto: UpdateEmailTemplateDto) {
    const current = await this.getTemplateOrThrow(code);
    const translationPayload = buildEmailTemplateTranslationPayload(dto, current);
    const updated = await this.emailTemplateRepository.update(code, {
      nameEn: translationPayload.nameEn ?? current.nameEn,
      nameZh: translationPayload.nameZh,
      nameJa: translationPayload.nameJa,
      subjectEn: translationPayload.subjectEn ?? current.subjectEn,
      subjectZh: translationPayload.subjectZh,
      subjectJa: translationPayload.subjectJa,
      bodyHtmlEn: translationPayload.bodyHtmlEn ?? current.bodyHtmlEn,
      bodyHtmlZh: translationPayload.bodyHtmlZh,
      bodyHtmlJa: translationPayload.bodyHtmlJa,
      bodyTextEn: translationPayload.bodyTextEn,
      bodyTextZh: translationPayload.bodyTextZh,
      bodyTextJa: translationPayload.bodyTextJa,
      variables: dto.variables,
      category: dto.category,
      isActive: dto.isActive,
      extraData: translationPayload.extraData,
    });

    return decorateEmailTemplate(updated);
  }

  async deactivate(code: string) {
    await this.getTemplateOrThrow(code);
    const updated = await this.emailTemplateRepository.update(code, { isActive: false });
    return decorateEmailTemplate(updated);
  }

  async reactivate(code: string) {
    await this.getTemplateOrThrow(code);
    const updated = await this.emailTemplateRepository.update(code, { isActive: true });
    return decorateEmailTemplate(updated);
  }

  renderTemplate(
    template: EmailTemplateStoredRecord,
    locale: SupportedLocale,
    variables: Record<string, string>,
  ): RenderedEmail {
    return renderEmailTemplate(template, locale, variables);
  }

  async preview(
    code: string,
    locale: SupportedLocale = 'en',
    variables: Record<string, string> = {},
  ): Promise<RenderedEmail> {
    const template = await this.getTemplateOrThrow(code);
    return renderEmailTemplate(
      template,
      locale,
      fillPreviewVariables(template.variables, variables),
    );
  }

  private async getTemplateOrThrow(code: string): Promise<EmailTemplateStoredRecord> {
    const template = await this.emailTemplateRepository.findByCode(code);

    if (!template) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: `Template with code '${code}' not found`,
      });
    }

    return template;
  }
}
