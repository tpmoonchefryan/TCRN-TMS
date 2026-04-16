// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmailDispatchApplicationService } from '../application/email-dispatch.service';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  const mockEmailDispatchApplicationService = {
    send: vi.fn(),
    sendSystemEmail: vi.fn(),
    sendBusinessEmail: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new EmailService(
      {} as never,
      {} as never,
      mockEmailDispatchApplicationService as unknown as EmailDispatchApplicationService,
    );
  });

  it('delegates send to the layered application service', async () => {
    mockEmailDispatchApplicationService.send.mockResolvedValue({
      jobId: 'job-123',
    });

    await expect(
      service.send({
        tenantSchema: 'tenant_test',
        templateCode: 'WELCOME_EMAIL',
        recipientEmail: 'operator@example.com',
      }),
    ).resolves.toEqual({
      jobId: 'job-123',
    });

    expect(mockEmailDispatchApplicationService.send).toHaveBeenCalledWith({
      tenantSchema: 'tenant_test',
      templateCode: 'WELCOME_EMAIL',
      recipientEmail: 'operator@example.com',
    });
  });

  it('delegates system and business helpers to the layered application service', async () => {
    mockEmailDispatchApplicationService.sendSystemEmail.mockResolvedValue({
      jobId: 'job-system',
    });
    mockEmailDispatchApplicationService.sendBusinessEmail.mockResolvedValue({
      jobId: 'job-business',
    });

    await expect(
      service.sendSystemEmail(
        'system@example.com',
        'WELCOME_EMAIL',
        'en',
        { name: 'Sora' },
      ),
    ).resolves.toEqual({
      jobId: 'job-system',
    });
    await expect(
      service.sendBusinessEmail(
        'tenant_test',
        'business@example.com',
        'WELCOME_EMAIL',
        'zh',
        { name: 'Mio' },
      ),
    ).resolves.toEqual({
      jobId: 'job-business',
    });

    expect(mockEmailDispatchApplicationService.sendSystemEmail).toHaveBeenCalledWith(
      'system@example.com',
      'WELCOME_EMAIL',
      'en',
      { name: 'Sora' },
    );
    expect(mockEmailDispatchApplicationService.sendBusinessEmail).toHaveBeenCalledWith(
      'tenant_test',
      'business@example.com',
      'WELCOME_EMAIL',
      'zh',
      { name: 'Mio' },
    );
  });
});
