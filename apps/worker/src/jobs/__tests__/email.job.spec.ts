// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { createCipheriv } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockLogger, mockPrisma } = vi.hoisted(() => ({
  mockLogger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  mockPrisma: {
    globalConfig: {
      findUnique: vi.fn(),
    },
    emailTemplate: {
      findUnique: vi.fn(),
    },
    $executeRawUnsafe: vi.fn(),
  },
}));

vi.mock('@tcrn/database', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../logger', () => ({
  workerLogger: mockLogger,
}));

vi.mock('../../services/pii-client', () => ({
  getPiiClient: vi.fn(),
}));

import { getEmailConfig } from '../email.job';

const ALGORITHM = 'aes-256-gcm';
const AUTH_TAG_LENGTH = 16;
const IV_LENGTH = 12;

function encrypt(plaintext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  const iv = Buffer.alloc(IV_LENGTH, 1);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

describe('getEmailConfig', () => {
  const encryptionKey = '2'.repeat(64);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EMAIL_CONFIG_ENCRYPTION_KEY = encryptionKey;
    delete process.env.TENCENT_SES_SECRET_ID;
    delete process.env.TENCENT_SES_SECRET_KEY;
    delete process.env.TENCENT_SES_REGION;
    delete process.env.TENCENT_SES_FROM_ADDRESS;
    delete process.env.TENCENT_SES_FROM_NAME;
    delete process.env.TENCENT_SES_REPLY_TO;
  });

  it('normalizes stored Tencent SES config from global config', async () => {
    mockPrisma.globalConfig.findUnique.mockResolvedValue({
      value: {
        provider: 'tencent_ses',
        tencentSes: {
          secretId: encrypt('ses-secret-id', encryptionKey),
          secretKey: encrypt('ses-secret-key', encryptionKey),
          region: 'ap-singapore',
          fromAddress: 'noreply@example.com',
          fromName: 'TCRN',
          replyTo: 'reply@example.com',
        },
      },
    });

    const result = await getEmailConfig();

    expect(result).toEqual({
      provider: 'tencent_ses',
      tencentSes: {
        secretId: 'ses-secret-id',
        secretKey: 'ses-secret-key',
        region: 'ap-singapore',
        fromAddress: 'noreply@example.com',
        fromName: 'TCRN',
        replyTo: 'reply@example.com',
      },
    });
  });

  it('normalizes stored SMTP config from global config', async () => {
    mockPrisma.globalConfig.findUnique.mockResolvedValue({
      value: {
        provider: 'smtp',
        smtp: {
          host: 'smtp.example.com',
          port: 587,
          secure: false,
          username: 'mailer',
          password: encrypt('smtp-password', encryptionKey),
          fromAddress: 'mail@example.com',
          fromName: 'SMTP Sender',
        },
      },
    });

    const result = await getEmailConfig();

    expect(result).toEqual({
      provider: 'smtp',
      smtp: {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        username: 'mailer',
        password: 'smtp-password',
        fromAddress: 'mail@example.com',
        fromName: 'SMTP Sender',
      },
    });
  });
});
