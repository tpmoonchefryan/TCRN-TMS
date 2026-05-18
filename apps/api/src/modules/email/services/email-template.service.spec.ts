// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
} from '../dto/email-template.dto';
import { EmailTemplateService } from './email-template.service';

describe('EmailTemplateService', () => {
  let service: EmailTemplateService;
  let mockRepository: {
    findMany: ReturnType<typeof vi.fn>;
    findByCode: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  const baseTemplate = {
    code: 'WELCOME_EMAIL',
    name: {
      en: 'Welcome Email',
      zh_HANS: '欢迎邮件',
      zh_HANT: '歡迎郵件',
      ja: 'ウェルカムメール',
      ko: '환영 이메일',
      fr: 'E-mail de bienvenue',
    },
    subject: {
      en: 'Welcome {{name}}',
      zh_HANS: '欢迎 {{name}}',
      zh_HANT: '歡迎 {{name}}',
      ja: 'Welcome {{name}}',
      ko: '환영합니다 {{name}}',
      fr: 'Bienvenue {{name}}',
    },
    bodyHtml: {
      en: '<p>Hello {{name}}</p>',
      zh_HANS: '<p>你好 {{name}}</p>',
      zh_HANT: '<p>您好 {{name}}</p>',
      ja: '<p>Hello {{name}}</p>',
      ko: '<p>안녕하세요 {{name}}</p>',
      fr: '<p>Bonjour {{name}}</p>',
    },
    bodyText: {
      en: 'Hello {{name}}',
      zh_HANS: 'Hello {{name}}',
      zh_HANT: 'Hello {{name}}',
      ja: 'Hello {{name}}',
      ko: '안녕하세요 {{name}}',
      fr: 'Bonjour {{name}}',
    },
    variables: ['name', 'supportEmail'],
    category: 'system',
    isActive: true,
  };

  beforeEach(() => {
    mockRepository = {
      findMany: vi.fn(),
      findByCode: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };

    service = new EmailTemplateService(mockRepository as never);
  });

  it('renders locale content with english fallback and variable replacement', () => {
    expect(
      service.renderTemplate(baseTemplate, 'ja', {
        name: 'Aki',
      }),
    ).toEqual({
      subject: 'Welcome Aki',
      htmlBody: '<p>Hello Aki</p>',
      textBody: 'Hello Aki',
    });

    expect(
      service.renderTemplate(baseTemplate, 'zh_HANS', {
        name: 'Mio',
      }),
    ).toEqual({
      subject: '欢迎 Mio',
      htmlBody: '<p>你好 Mio</p>',
        textBody: 'Hello Mio',
      });

    expect(
      service.renderTemplate(baseTemplate, 'fr', {
        name: 'Marine',
      }),
    ).toEqual({
      subject: 'Bienvenue Marine',
      htmlBody: '<p>Bonjour Marine</p>',
      textBody: 'Bonjour Marine',
    });

    expect(
      service.renderTemplate(baseTemplate, 'zh_HANT', {
        name: 'Suisei',
      }),
    ).toEqual({
      subject: '歡迎 Suisei',
      htmlBody: '<p>您好 Suisei</p>',
      textBody: 'Hello Suisei',
    });
  });

  it('fills missing preview variables with placeholders', async () => {
    mockRepository.findByCode.mockResolvedValue(baseTemplate);

    await expect(
      service.preview('WELCOME_EMAIL', 'en', { name: 'Sora' }),
    ).resolves.toEqual({
      subject: 'Welcome Sora',
      htmlBody: '<p>Hello Sora</p>',
      textBody: 'Hello Sora',
    });
  });

  it('throws conflict when creating a duplicate template code', async () => {
    mockRepository.findByCode.mockResolvedValue(baseTemplate);

    await expect(
      service.create({
        code: 'WELCOME_EMAIL',
        name: baseTemplate.name,
        subject: baseTemplate.subject,
        bodyHtml: baseTemplate.bodyHtml,
        category: 'system',
      } as CreateEmailTemplateDto),
    ).rejects.toThrow(ConflictException);
  });

  it('throws not found when updating a missing template', async () => {
    mockRepository.findByCode.mockResolvedValue(null);

    await expect(
      service.update('MISSING', {
        name: { en: 'Updated' },
      } as UpdateEmailTemplateDto),
    ).rejects.toThrow(NotFoundException);
  });
});
