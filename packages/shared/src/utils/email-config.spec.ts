// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_EMAIL_PROVIDER,
  normalizeStoredEmailConfig,
} from './email-config';

describe('normalizeStoredEmailConfig', () => {
  it('returns the default provider for non-object values', () => {
    expect(normalizeStoredEmailConfig(null)).toEqual({
      provider: DEFAULT_EMAIL_PROVIDER,
    });
  });

  it('keeps only supported field types for Tencent SES config', () => {
    expect(
      normalizeStoredEmailConfig({
        provider: 'tencent_ses',
        tencentSes: {
          secretId: 'secret-id',
          secretKey: 'secret-key',
          region: 'ap-singapore',
          fromAddress: 'noreply@example.com',
          fromName: 'TCRN',
          replyTo: 'reply@example.com',
          ignored: 123,
        },
      }),
    ).toEqual({
      provider: 'tencent_ses',
      tencentSes: {
        secretId: 'secret-id',
        secretKey: 'secret-key',
        region: 'ap-singapore',
        fromAddress: 'noreply@example.com',
        fromName: 'TCRN',
        replyTo: 'reply@example.com',
      },
      smtp: undefined,
    });
  });

  it('keeps only supported field types for SMTP config', () => {
    expect(
      normalizeStoredEmailConfig({
        provider: 'smtp',
        smtp: {
          host: 'smtp.example.com',
          port: 587,
          secure: false,
          username: 'mailer',
          password: 'password',
          fromAddress: 'mail@example.com',
          fromName: 'SMTP Sender',
          replyTo: 'ignored',
        },
      }),
    ).toEqual({
      provider: 'smtp',
      tencentSes: undefined,
      smtp: {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        username: 'mailer',
        password: 'password',
        fromAddress: 'mail@example.com',
        fromName: 'SMTP Sender',
      },
    });
  });
});
