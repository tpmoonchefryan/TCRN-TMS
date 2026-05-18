// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma, type Prisma } from '@tcrn/database';
import type { LocalizedText } from '@tcrn/shared';

import {
  readLocalizedText,
  toLocalizedTextJsonInput,
} from '../../../platform/persistence/localized-text.persistence';
import type { EmailTemplateStoredRecord } from '../domain/email-template.policy';

export interface CreateEmailTemplatePersistenceInput {
  code: string;
  name: LocalizedText;
  subject: LocalizedText;
  bodyHtml: LocalizedText;
  bodyText: LocalizedText;
  variables: string[];
  category: string;
}

export interface UpdateEmailTemplatePersistenceInput {
  name?: LocalizedText;
  subject?: LocalizedText;
  bodyHtml?: LocalizedText;
  bodyText?: LocalizedText;
  variables?: string[];
  category?: string;
  isActive?: boolean;
}

type PrismaEmailTemplateRecord = {
  code: string;
  name: Prisma.JsonValue;
  subject: Prisma.JsonValue;
  bodyHtml: Prisma.JsonValue;
  bodyText: Prisma.JsonValue;
  variables: string[];
  category: string;
  isActive: boolean;
};

function mapEmailTemplateRecord(record: PrismaEmailTemplateRecord): EmailTemplateStoredRecord {
  return {
    code: record.code,
    name: readLocalizedText(record.name, 'email_template.name'),
    subject: readLocalizedText(record.subject, 'email_template.subject'),
    bodyHtml: readLocalizedText(record.bodyHtml, 'email_template.body_html'),
    bodyText: readLocalizedText(record.bodyText, 'email_template.body_text'),
    variables: record.variables,
    category: record.category,
    isActive: record.isActive,
  };
}

@Injectable()
export class EmailTemplateRepository {
  findMany(filters: {
    category?: string;
    isActive?: boolean;
  }): Promise<EmailTemplateStoredRecord[]> {
    const where: Record<string, unknown> = {};

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return prisma.emailTemplate.findMany({
      where,
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    }).then((records) => records.map(mapEmailTemplateRecord));
  }

  async findByCode(code: string): Promise<EmailTemplateStoredRecord | null> {
    const record = await prisma.emailTemplate.findUnique({
      where: { code },
    });

    return record ? mapEmailTemplateRecord(record) : null;
  }

  async create(input: CreateEmailTemplatePersistenceInput): Promise<EmailTemplateStoredRecord> {
    const record = await prisma.emailTemplate.create({
      data: {
        code: input.code,
        name: toLocalizedTextJsonInput(input.name),
        subject: toLocalizedTextJsonInput(input.subject),
        bodyHtml: toLocalizedTextJsonInput(input.bodyHtml),
        bodyText: toLocalizedTextJsonInput(input.bodyText),
        variables: input.variables,
        category: input.category,
      },
    });

    return mapEmailTemplateRecord(record);
  }

  async update(
    code: string,
    input: UpdateEmailTemplatePersistenceInput,
  ): Promise<EmailTemplateStoredRecord> {
    const record = await prisma.emailTemplate.update({
      where: { code },
      data: {
        ...(input.name !== undefined ? { name: toLocalizedTextJsonInput(input.name) } : {}),
        ...(input.subject !== undefined ? { subject: toLocalizedTextJsonInput(input.subject) } : {}),
        ...(input.bodyHtml !== undefined ? { bodyHtml: toLocalizedTextJsonInput(input.bodyHtml) } : {}),
        ...(input.bodyText !== undefined ? { bodyText: toLocalizedTextJsonInput(input.bodyText) } : {}),
        ...(input.variables !== undefined ? { variables: input.variables } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    return mapEmailTemplateRecord(record);
  }
}
