// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';

import { toNullableJsonInput } from '../../../platform/persistence/managed-name-translations';
import type { EmailTemplateStoredRecord } from '../domain/email-template.policy';

export interface CreateEmailTemplatePersistenceInput {
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  subjectEn: string;
  subjectZh: string | null;
  subjectJa: string | null;
  bodyHtmlEn: string;
  bodyHtmlZh: string | null;
  bodyHtmlJa: string | null;
  bodyTextEn: string | null;
  bodyTextZh: string | null;
  bodyTextJa: string | null;
  variables: string[];
  category: string;
  extraData: Record<string, unknown> | null;
}

export interface UpdateEmailTemplatePersistenceInput {
  nameEn?: string;
  nameZh?: string | null;
  nameJa?: string | null;
  subjectEn?: string;
  subjectZh?: string | null;
  subjectJa?: string | null;
  bodyHtmlEn?: string;
  bodyHtmlZh?: string | null;
  bodyHtmlJa?: string | null;
  bodyTextEn?: string | null;
  bodyTextZh?: string | null;
  bodyTextJa?: string | null;
  variables?: string[];
  category?: string;
  isActive?: boolean;
  extraData?: Record<string, unknown> | null;
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
    });
  }

  findByCode(code: string) {
    return prisma.emailTemplate.findUnique({
      where: { code },
    });
  }

  create(input: CreateEmailTemplatePersistenceInput): Promise<EmailTemplateStoredRecord> {
    return prisma.emailTemplate.create({
      data: {
        code: input.code,
        nameEn: input.nameEn,
        nameZh: input.nameZh,
        nameJa: input.nameJa,
        subjectEn: input.subjectEn,
        subjectZh: input.subjectZh,
        subjectJa: input.subjectJa,
        bodyHtmlEn: input.bodyHtmlEn,
        bodyHtmlZh: input.bodyHtmlZh,
        bodyHtmlJa: input.bodyHtmlJa,
        bodyTextEn: input.bodyTextEn,
        bodyTextZh: input.bodyTextZh,
        bodyTextJa: input.bodyTextJa,
        variables: input.variables,
        category: input.category,
        extraData: toNullableJsonInput(input.extraData),
      },
    });
  }

  update(
    code: string,
    input: UpdateEmailTemplatePersistenceInput,
  ): Promise<EmailTemplateStoredRecord> {
    return prisma.emailTemplate.update({
      where: { code },
      data: {
        ...(input.nameEn !== undefined ? { nameEn: input.nameEn } : {}),
        ...(input.nameZh !== undefined ? { nameZh: input.nameZh } : {}),
        ...(input.nameJa !== undefined ? { nameJa: input.nameJa } : {}),
        ...(input.subjectEn !== undefined ? { subjectEn: input.subjectEn } : {}),
        ...(input.subjectZh !== undefined ? { subjectZh: input.subjectZh } : {}),
        ...(input.subjectJa !== undefined ? { subjectJa: input.subjectJa } : {}),
        ...(input.bodyHtmlEn !== undefined ? { bodyHtmlEn: input.bodyHtmlEn } : {}),
        ...(input.bodyHtmlZh !== undefined ? { bodyHtmlZh: input.bodyHtmlZh } : {}),
        ...(input.bodyHtmlJa !== undefined ? { bodyHtmlJa: input.bodyHtmlJa } : {}),
        ...(input.bodyTextEn !== undefined ? { bodyTextEn: input.bodyTextEn } : {}),
        ...(input.bodyTextZh !== undefined ? { bodyTextZh: input.bodyTextZh } : {}),
        ...(input.bodyTextJa !== undefined ? { bodyTextJa: input.bodyTextJa } : {}),
        ...(input.variables !== undefined ? { variables: input.variables } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.extraData !== undefined
          ? { extraData: toNullableJsonInput(input.extraData) }
          : {}),
      },
    });
  }
}
