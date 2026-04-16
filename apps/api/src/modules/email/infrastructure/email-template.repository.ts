// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';
import { prisma } from '@tcrn/database';

import type {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
} from '../dto/email-template.dto';

@Injectable()
export class EmailTemplateRepository {
  findMany(filters: {
    category?: string;
    isActive?: boolean;
  }) {
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

  create(dto: CreateEmailTemplateDto) {
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

  update(code: string, dto: UpdateEmailTemplateDto) {
    return prisma.emailTemplate.update({
      where: { code },
      data: dto,
    });
  }
}
