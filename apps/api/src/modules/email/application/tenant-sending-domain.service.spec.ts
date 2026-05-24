// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TenantSendingDomainRepository } from '../infrastructure/tenant-sending-domain.repository';
import { TenantSendingDomainService } from './tenant-sending-domain.service';

describe('TenantSendingDomainService', () => {
  let service: TenantSendingDomainService;
  let repository: {
    findTenantById: ReturnType<typeof vi.fn>;
    findTenantBySchema: ReturnType<typeof vi.fn>;
    updateTenantSettings: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      findTenantById: vi.fn(),
      findTenantBySchema: vi.fn(),
      updateTenantSettings: vi.fn(),
    };

    service = new TenantSendingDomainService(
      repository as unknown as TenantSendingDomainRepository,
      {
        now: () => '2026-05-08T10:00:00.000Z',
        id: () => 'domain-generated',
        token: () => 'token-generated',
      }
    );
  });

  it('lets AC save per-tenant sending domains with generated DNS records', async () => {
    repository.findTenantById.mockResolvedValue({
      id: 'tenant-1',
      schemaName: 'tenant_alpha',
      settings: {},
    });
    repository.updateTenantSettings.mockResolvedValue(undefined);

    const result = await service.saveManagedTenantSendingDomains('tenant-1', {
      domains: [
        {
          domain: 'mail.alpha.example.com',
          status: 'pending_dns',
        },
      ],
    });

    expect(repository.updateTenantSettings).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        emailSendingDomains: [
          expect.objectContaining({
            id: 'domain-generated',
            domain: 'mail.alpha.example.com',
            status: 'pending_dns',
            dnsRecords: [
              {
                type: 'TXT',
                host: '_tcrn-email.mail.alpha.example.com',
                value: 'tcrn-email-verification=token-generated',
              },
            ],
          }),
        ],
      })
    );
    expect(result.domains[0].dnsRecords[0].host).toBe('_tcrn-email.mail.alpha.example.com');
  });

  it('rejects tenant default selection for unverified domains', async () => {
    repository.findTenantBySchema.mockResolvedValue({
      id: 'tenant-1',
      schemaName: 'tenant_alpha',
      settings: {
        emailSendingDomains: [
          {
            id: 'domain-1',
            domain: 'mail.alpha.example.com',
            status: 'pending_dns',
            dnsRecords: [],
            createdAt: '2026-05-08T09:00:00.000Z',
            updatedAt: '2026-05-08T09:00:00.000Z',
          },
        ],
      },
    });

    await expect(
      service.saveTenantSenderSelection('tenant_alpha', {
        defaultDomainId: 'domain-1',
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('ignores malformed stored sending-domain records without hiding valid tenant options', async () => {
    repository.findTenantBySchema.mockResolvedValue({
      id: 'tenant-1',
      schemaName: 'tenant_alpha',
      settings: {
        emailSendingDomains: [
          {
            id: 'domain-bad',
            domain: 'not a hostname',
            status: 'verified',
            verificationToken: 'bad-token',
            dnsRecords: [],
            createdAt: '2026-05-08T09:00:00.000Z',
            updatedAt: '2026-05-08T09:00:00.000Z',
          },
          {
            id: 'domain-good',
            domain: 'MAIL.ALPHA.EXAMPLE.COM',
            status: 'verified',
            verificationToken: 'good-token',
            dnsRecords: [],
            createdAt: '2026-05-08T09:00:00.000Z',
            updatedAt: '2026-05-08T09:00:00.000Z',
          },
        ],
      },
    });

    const result = await service.getTenantSenderSelection('tenant_alpha');

    expect(result.domains).toEqual([
      {
        id: 'domain-good',
        domain: 'mail.alpha.example.com',
        status: 'verified',
        selectable: true,
      },
    ]);
  });

  it('returns not found when AC manages an unknown tenant', async () => {
    repository.findTenantById.mockResolvedValue(null);

    await expect(service.getManagedTenantSendingDomains('missing-tenant')).rejects.toThrow(
      NotFoundException
    );
  });
});
