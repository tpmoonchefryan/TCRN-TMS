// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../database';
import type { SaveEmailConfigDto } from '../dto/email-config.dto';
import { EmailConfigService } from './email-config.service';

describe('EmailConfigService', () => {
  let service: EmailConfigService;
  let mockDatabaseService: Pick<DatabaseService, 'getPrisma'>;
  let mockConfigService: Pick<ConfigService, 'get'>;
  let mockPrisma: {
    globalConfig: {
      findUnique: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
    };
  };

  const baseDate = new Date('2026-03-30T00:00:00.000Z');
  const encryptionKey = '1'.repeat(64);

  beforeEach(() => {
    mockPrisma = {
      globalConfig: {
        findUnique: vi.fn(),
        upsert: vi.fn().mockResolvedValue(undefined),
      },
    };

    mockDatabaseService = {
      getPrisma: vi.fn().mockReturnValue(mockPrisma),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'EMAIL_CONFIG_ENCRYPTION_KEY') {
          return encryptionKey;
        }

        return undefined;
      }),
    };

    service = new EmailConfigService(
      mockDatabaseService as DatabaseService,
      mockConfigService as ConfigService,
    );
  });

  it('masks stored Tencent SES secrets when returning config', async () => {
    const cryptoAccess = service as unknown as {
      encrypt(value: string): string;
    };

    mockPrisma.globalConfig.findUnique.mockResolvedValue({
      value: {
        provider: 'tencent_ses',
        tencentSes: {
          secretId: cryptoAccess.encrypt('abcdefghijkl'),
          secretKey: cryptoAccess.encrypt('qrstuvwxyz12'),
          region: 'ap-singapore',
          fromAddress: 'noreply@example.com',
          fromName: 'TCRN',
          replyTo: 'reply@example.com',
        },
      },
      updatedAt: baseDate,
    });

    const result = await service.getConfig();

    expect(result).toEqual({
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
    const cryptoAccess = service as unknown as {
      decrypt(value: string): string;
      encrypt(value: string): string;
    };
    const existingSecretId = 'existing-secret-id';
    const existingSecretKey = 'existing-secret-key';
    let savedValue: Record<string, unknown> | undefined;

    mockPrisma.globalConfig.findUnique
      .mockResolvedValueOnce({
        value: {
          provider: 'tencent_ses',
          tencentSes: {
            secretId: cryptoAccess.encrypt(existingSecretId),
            secretKey: cryptoAccess.encrypt(existingSecretKey),
            region: 'ap-hongkong',
            fromAddress: 'old@example.com',
            fromName: 'Old Name',
          },
        },
        updatedAt: baseDate,
      })
      .mockImplementation(async () => ({
        value: savedValue,
        updatedAt: baseDate,
      }));

    mockPrisma.globalConfig.upsert.mockImplementation(async (args: { update: { value: Record<string, unknown> } }) => {
      savedValue = args.update.value;
      return undefined;
    });

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
    const savedTencentSes = (savedValue?.tencentSes ?? {}) as Record<string, string>;

    expect(savedValue).toMatchObject({
      provider: 'tencent_ses',
      tencentSes: {
        region: 'ap-singapore',
        fromAddress: 'new@example.com',
        fromName: 'New Name',
        replyTo: 'reply@example.com',
      },
    });
    expect(cryptoAccess.decrypt(savedTencentSes.secretId)).toBe(existingSecretId);
    expect(cryptoAccess.decrypt(savedTencentSes.secretKey)).toBe(existingSecretKey);
    expect(result.tencentSes?.secretId).toBe('exis***t-id');
    expect(result.tencentSes?.secretKey).toBe('exis***-key');
  });
});
