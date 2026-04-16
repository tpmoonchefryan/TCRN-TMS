// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../database';
import { EmailConfigApplicationService } from '../application/email-config.service';
import type {
  DecryptedEmailConfig,
  EmailConfigResponse,
  SaveEmailConfigDto,
} from '../dto/email-config.dto';
import { EmailConfigService } from './email-config.service';

describe('EmailConfigService', () => {
  let service: EmailConfigService;

  const mockEmailConfigApplicationService = {
    getConfig: vi.fn(),
    saveConfig: vi.fn(),
    getDecryptedConfig: vi.fn(),
    isConfigured: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new EmailConfigService(
      {} as DatabaseService,
      {} as ConfigService,
      mockEmailConfigApplicationService as unknown as EmailConfigApplicationService,
    );
  });

  it('delegates read paths to the layered email-config application service', async () => {
    const response = {
      provider: 'tencent_ses',
      isConfigured: true,
    } as EmailConfigResponse;
    const decrypted = {
      provider: 'smtp',
      smtp: {
        host: 'smtp.example.com',
        port: 465,
        secure: true,
        username: 'smtp-user',
        password: 'plain-password',
        fromAddress: 'noreply@example.com',
        fromName: 'TCRN',
      },
    } as DecryptedEmailConfig;

    mockEmailConfigApplicationService.getConfig.mockResolvedValue(response);
    mockEmailConfigApplicationService.getDecryptedConfig.mockResolvedValue(decrypted);
    mockEmailConfigApplicationService.isConfigured.mockResolvedValue(true);

    await expect(service.getConfig()).resolves.toEqual(response);
    await expect(service.getDecryptedConfig()).resolves.toEqual(decrypted);
    await expect(service.isConfigured()).resolves.toBe(true);

    expect(mockEmailConfigApplicationService.getConfig).toHaveBeenCalledTimes(1);
    expect(mockEmailConfigApplicationService.getDecryptedConfig).toHaveBeenCalledTimes(1);
    expect(mockEmailConfigApplicationService.isConfigured).toHaveBeenCalledTimes(1);
  });

  it('delegates saveConfig to the layered email-config application service', async () => {
    const dto = {
      provider: 'smtp',
      smtp: {
        host: 'smtp.example.com',
        port: 465,
        secure: true,
        username: 'smtp-user',
        password: 'smtp-password',
        fromAddress: 'noreply@example.com',
        fromName: 'TCRN',
      },
    } as SaveEmailConfigDto;

    mockEmailConfigApplicationService.saveConfig.mockResolvedValue({
      provider: 'smtp',
      isConfigured: true,
    });

    await expect(service.saveConfig(dto)).resolves.toEqual({
      provider: 'smtp',
      isConfigured: true,
    });

    expect(mockEmailConfigApplicationService.saveConfig).toHaveBeenCalledWith(dto);
  });
});
