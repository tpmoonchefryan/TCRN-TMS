// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmailQueueGateway } from '../infrastructure/email-queue.gateway';
import { EmailDispatchApplicationService } from './email-dispatch.service';
import { EmailTemplateApplicationService } from './email-template.service';

describe('EmailDispatchApplicationService', () => {
  let service: EmailDispatchApplicationService;

  const mockEmailQueueGateway = {
    enqueue: vi.fn(),
  };

  const mockEmailTemplateService = {
    findByCode: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new EmailDispatchApplicationService(
      mockEmailQueueGateway as unknown as EmailQueueGateway,
      mockEmailTemplateService as unknown as EmailTemplateApplicationService,
    );
  });

  it('queues email jobs with the explicit recipient-email payload', async () => {
    mockEmailTemplateService.findByCode.mockResolvedValue({
      code: 'WELCOME_EMAIL',
      isActive: true,
    });
    mockEmailQueueGateway.enqueue.mockResolvedValue({
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

    expect(mockEmailQueueGateway.enqueue).toHaveBeenCalledWith({
      tenantSchema: 'tenant_test',
      templateCode: 'WELCOME_EMAIL',
      recipientEmail: 'operator@example.com',
      locale: 'en',
      variables: {},
    });
  });

  it('rejects missing templates with the existing not-found semantics', async () => {
    mockEmailTemplateService.findByCode.mockResolvedValue(null);

    await expect(
      service.send({
        tenantSchema: 'tenant_test',
        templateCode: 'MISSING_TEMPLATE',
        recipientEmail: 'operator@example.com',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects inactive templates with the existing not-found semantics', async () => {
    mockEmailTemplateService.findByCode.mockResolvedValue({
      code: 'WELCOME_EMAIL',
      isActive: false,
    });

    await expect(
      service.send({
        tenantSchema: 'tenant_test',
        templateCode: 'WELCOME_EMAIL',
        recipientEmail: 'operator@example.com',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects requests without an explicit recipient email', async () => {
    mockEmailTemplateService.findByCode.mockResolvedValue({
      code: 'WELCOME_EMAIL',
      isActive: true,
    });

    await expect(
      service.send({
        tenantSchema: 'tenant_test',
        templateCode: 'WELCOME_EMAIL',
      } as never),
    ).rejects.toThrow('recipientEmail must be provided');
  });

  it('maps system and business helpers onto the same dispatch path', async () => {
    mockEmailTemplateService.findByCode.mockResolvedValue({
      code: 'WELCOME_EMAIL',
      isActive: true,
    });
    mockEmailQueueGateway.enqueue.mockResolvedValue({
      jobId: 'job-456',
    });

    await expect(
      service.sendSystemEmail(
        'system@example.com',
        'WELCOME_EMAIL',
        'ja',
        { name: 'Sora' },
      ),
    ).resolves.toEqual({
      jobId: 'job-456',
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
      jobId: 'job-456',
    });

    expect(mockEmailQueueGateway.enqueue).toHaveBeenNthCalledWith(1, {
      tenantSchema: 'public',
      templateCode: 'WELCOME_EMAIL',
      recipientEmail: 'system@example.com',
      locale: 'ja',
      variables: { name: 'Sora' },
    });
    expect(mockEmailQueueGateway.enqueue).toHaveBeenNthCalledWith(2, {
      tenantSchema: 'tenant_test',
      templateCode: 'WELCOME_EMAIL',
      recipientEmail: 'business@example.com',
      locale: 'zh',
      variables: { name: 'Mio' },
    });
  });
});
