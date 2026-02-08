// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConflictException,Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tcrn/database';

import type {
  CreateEmailTemplateDto,
  EmailTemplateQueryDto,
  UpdateEmailTemplateDto,
} from '../dto/email-template.dto';
import type { RenderedEmail, SupportedLocale } from '../interfaces/email.interface';

@Injectable()
export class EmailTemplateService {
  /**
   * Find all email templates with optional filters
   */
  async findAll(query?: EmailTemplateQueryDto) {
    const where: Record<string, unknown> = {};

    if (query?.category) {
      where.category = query.category;
    }
    if (query?.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    return prisma.emailTemplate.findMany({
      where,
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });
  }

  /**
   * Find template by code
   */
  async findByCode(code: string) {
    return prisma.emailTemplate.findUnique({
      where: { code },
    });
  }

  /**
   * Create new email template
   */
  async create(dto: CreateEmailTemplateDto) {
    const existing = await this.findByCode(dto.code);
    if (existing) {
      throw new ConflictException(`Template with code '${dto.code}' already exists`);
    }

    return prisma.emailTemplate.create({
      data: {
        code: dto.code,
        nameEn: dto.nameEn,
        nameZh: dto.nameZh,
        nameJa: dto.nameJa,
        subjectEn: dto.subjectEn,
        subjectZh: dto.subjectZh,
        subjectJa: dto.subjectJa,
        bodyHtmlEn: dto.bodyHtmlEn,
        bodyHtmlZh: dto.bodyHtmlZh,
        bodyHtmlJa: dto.bodyHtmlJa,
        bodyTextEn: dto.bodyTextEn,
        bodyTextZh: dto.bodyTextZh,
        bodyTextJa: dto.bodyTextJa,
        variables: dto.variables || [],
        category: dto.category,
      },
    });
  }

  /**
   * Update email template
   */
  async update(code: string, dto: UpdateEmailTemplateDto) {
    const existing = await this.findByCode(code);
    if (!existing) {
      throw new NotFoundException(`Template with code '${code}' not found`);
    }

    return prisma.emailTemplate.update({
      where: { code },
      data: dto,
    });
  }

  /**
   * Deactivate email template (soft delete)
   */
  async deactivate(code: string) {
    const existing = await this.findByCode(code);
    if (!existing) {
      throw new NotFoundException(`Template with code '${code}' not found`);
    }

    return prisma.emailTemplate.update({
      where: { code },
      data: { isActive: false },
    });
  }

  /**
   * Reactivate email template
   */
  async reactivate(code: string) {
    const existing = await this.findByCode(code);
    if (!existing) {
      throw new NotFoundException(`Template with code '${code}' not found`);
    }

    return prisma.emailTemplate.update({
      where: { code },
      data: { isActive: true },
    });
  }

  /**
   * Render template with variables
   */
  renderTemplate(
    template: {
      subjectEn: string;
      subjectZh: string | null;
      subjectJa: string | null;
      bodyHtmlEn: string;
      bodyHtmlZh: string | null;
      bodyHtmlJa: string | null;
      bodyTextEn: string | null;
      bodyTextZh: string | null;
      bodyTextJa: string | null;
    },
    locale: SupportedLocale,
    variables: Record<string, string>,
  ): RenderedEmail {
    // Select locale-specific content with fallback to English
    let subject: string;
    let htmlBody: string;
    let textBody: string | undefined;

    switch (locale) {
      case 'zh':
        subject = template.subjectZh || template.subjectEn;
        htmlBody = template.bodyHtmlZh || template.bodyHtmlEn;
        textBody = template.bodyTextZh || template.bodyTextEn || undefined;
        break;
      case 'ja':
        subject = template.subjectJa || template.subjectEn;
        htmlBody = template.bodyHtmlJa || template.bodyHtmlEn;
        textBody = template.bodyTextJa || template.bodyTextEn || undefined;
        break;
      default:
        subject = template.subjectEn;
        htmlBody = template.bodyHtmlEn;
        textBody = template.bodyTextEn || undefined;
    }

    // Replace variables using {{variableName}} pattern
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(pattern, value);
      htmlBody = htmlBody.replace(pattern, value);
      if (textBody) {
        textBody = textBody.replace(pattern, value);
      }
    }

    return { subject, htmlBody, textBody };
  }

  /**
   * Preview rendered template
   */
  async preview(
    code: string,
    locale: SupportedLocale = 'en',
    variables: Record<string, string> = {},
  ): Promise<RenderedEmail> {
    const template = await this.findByCode(code);
    if (!template) {
      throw new NotFoundException(`Template with code '${code}' not found`);
    }

    // Fill in sample values for undefined variables
    const templateVars = template.variables || [];
    const filledVariables = { ...variables };
    for (const varName of templateVars) {
      if (!filledVariables[varName]) {
        filledVariables[varName] = `[${varName}]`;
      }
    }

    return this.renderTemplate(template, locale, filledVariables);
  }
}
