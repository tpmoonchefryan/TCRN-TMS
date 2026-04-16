// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';

import {
  type EmailTemplateLocalizedContent,
  fillPreviewVariables,
  renderEmailTemplate,
} from '../domain/email-template.policy';
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
    return this.emailTemplateRepository.findMany({
      category: query?.category,
      isActive: query?.isActive,
    });
  }

  findByCode(code: string) {
    return this.emailTemplateRepository.findByCode(code);
  }

  async create(dto: CreateEmailTemplateDto) {
    const existing = await this.emailTemplateRepository.findByCode(dto.code);

    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.RES_ALREADY_EXISTS,
        message: `Template with code '${dto.code}' already exists`,
      });
    }

    return this.emailTemplateRepository.create(dto);
  }

  async update(code: string, dto: UpdateEmailTemplateDto) {
    await this.getTemplateOrThrow(code);
    return this.emailTemplateRepository.update(code, dto);
  }

  async deactivate(code: string) {
    await this.getTemplateOrThrow(code);
    return this.emailTemplateRepository.update(code, { isActive: false });
  }

  async reactivate(code: string) {
    await this.getTemplateOrThrow(code);
    return this.emailTemplateRepository.update(code, { isActive: true });
  }

  renderTemplate(
    template: EmailTemplateLocalizedContent,
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

  private async getTemplateOrThrow(code: string) {
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
