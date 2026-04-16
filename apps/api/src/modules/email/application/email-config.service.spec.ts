// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SaveEmailConfigDto } from '../dto/email-config.dto';
import {
  EmailConfigRepository,
  type StoredEmailConfigRecord,
} from '../infrastructure/email-config.repository';
import { EmailConfigCryptoService } from '../infrastructure/email-config-crypto.service';
import { EmailConfigApplicationService } from './email-config.service';

describe('EmailConfigApplicationService', () => {
  let service: EmailConfigApplicationService;
  let storedConfig: StoredEmailConfigRecord | null;

  const baseDate = new Date('2026-03-30T00:00:00.000Z');

  const mockEmailConfigRepository = {
    findStoredConfig: vi.fn(),
    saveStoredConfig: vi.fn(),
  };

  const mockEmailConfigCryptoService = {
    encrypt: vi.fn((value: string) => `encrypted:${value}`),
    decryptField: vi.fn((value: string) => {
      if (value === 'encrypted:existing-secret-id') {
        return 'existing-secret-id';
      }

      if (value === 'encrypted:existing-secret-key') {
        return 'existing-secret-key';
      }

      if (value === 'encrypted:abcdefghijkl') {
        return 'abcdefghijkl';
      }

      if (value === 'encrypted:qrstuvwxyz12') {
        return 'qrstuvwxyz12';
      }

      return value;
    }),
    maskValue: vi.fn((value: string) => {
      if (!value) {
        return '';
      }

      if (value.length <= 8) {
        return '***';
      }

      return `${value.slice(0, 4)}***${value.slice(-4)}`;
    }),
  };

  const mockConfigService = {
    get: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    storedConfig = null;

    mockEmailConfigRepository.findStoredConfig.mockImplementation(async () => storedConfig);
    mockEmailConfigRepository.saveStoredConfig.mockImplementation(
      async (value: StoredEmailConfigRecord['value']) => {
        storedConfig = {
          value,
          updatedAt: baseDate,
        };
      },
    );

    service = new EmailConfigApplicationService(
      mockEmailConfigRepository as unknown as EmailConfigRepository,
      mockEmailConfigCryptoService as unknown as EmailConfigCryptoService,
      mockConfigService as unknown as ConfigService,
    );
  });

  it('masks stored Tencent SES secrets when returning config', async () => {
    storedConfig = {
      value: {
        provider: 'tencent_ses',
        tencentSes: {
          secretId: 'encrypted:abcdefghijkl',
          secretKey: 'encrypted:qrstuvwxyz12',
          region: 'ap-singapore',
          fromAddress: 'noreply@example.com',
          fromName: 'TCRN',
          replyTo: 'reply@example.com',
        },
      },
      updatedAt: baseDate,
    };

    await expect(service.getConfig()).resolves.toEqual({
      provider: 'tencent_ses',
      isConfigured: true,
      lastUpdated: baseDate.toISOString(),
      tencentSes: {
        secretId: 'abcd***ijkl',
        secretKey: 'qrst***yz12',
        region: 'ap-singapore',
        fromAddress: 'noreply@example.com',
        fromName: 'TCRN',
        replyTo: 'reply@example.com',
      },
    });
  });

  it('preserves masked existing secrets when saving config', async () => {
    storedConfig = {
      value: {
        provider: 'tencent_ses',
        tencentSes: {
          secretId: 'encrypted:existing-secret-id',
          secretKey: 'encrypted:existing-secret-key',
          region: 'ap-hongkong',
          fromAddress: 'old@example.com',
          fromName: 'Old Name',
        },
      },
      updatedAt: baseDate,
    };

    const dto = {
      provider: 'tencent_ses',
      tencentSes: {
        secretId: 'abcd***ijkl',
        secretKey: 'qrst***yz12',
        region: 'ap-singapore',
        fromAddress: 'new@example.com',
        fromName: 'New Name',
        replyTo: 'reply@example.com',
      },
    } as SaveEmailConfigDto;

    const result = await service.saveConfig(dto);

    expect(mockEmailConfigRepository.saveStoredConfig).toHaveBeenCalledWith({
      provider: 'tencent_ses',
      tencentSes: {
        secretId: 'encrypted:existing-secret-id',
        secretKey: 'encrypted:existing-secret-key',
        region: 'ap-singapore',
        fromAddress: 'new@example.com',
        fromName: 'New Name',
        replyTo: 'reply@example.com',
      },
    });
    expect(result.tencentSes?.secretId).toBe('exis***t-id');
    expect(result.tencentSes?.secretKey).toBe('exis***-key');
  });

  it('falls back to env-backed Tencent SES config when no stored config exists', async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'TENCENT_SES_SECRET_ID':
          return 'env-secret-id';
        case 'TENCENT_SES_SECRET_KEY':
          return 'env-secret-key';
        case 'TENCENT_SES_REGION':
          return 'ap-beijing';
        case 'TENCENT_SES_FROM_ADDRESS':
          return 'env@example.com';
        case 'TENCENT_SES_FROM_NAME':
          return 'Env Sender';
        case 'TENCENT_SES_REPLY_TO':
          return 'reply@example.com';
        default:
          return undefined;
      }
    });

    await expect(service.getDecryptedConfig()).resolves.toEqual({
      provider: 'tencent_ses',
      tencentSes: {
        secretId: 'env-secret-id',
        secretKey: 'env-secret-key',
        region: 'ap-beijing',
        fromAddress: 'env@example.com',
        fromName: 'Env Sender',
        replyTo: 'reply@example.com',
      },
    });
    await expect(service.isConfigured()).resolves.toBe(true);
  });
});
