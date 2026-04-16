// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CompanyCustomerApplicationService } from '../../application/company-customer.service';
import {
  CreateCompanyCustomerDto,
  ProfileType,
  UpdateCompanyCustomerDto,
} from '../../dto/customer.dto';
import { CompanyCustomerService } from '../company-customer.service';

describe('CompanyCustomerService', () => {
  const context: RequestContext = {
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userId: 'user-1',
    userName: 'Tester',
    ipAddress: '127.0.0.1',
    userAgent: 'Vitest',
    requestId: 'req-1',
  };

  const mockApplicationService = {
    create: vi.fn(),
    update: vi.fn(),
    createPiiPortalSession: vi.fn(),
  } as unknown as CompanyCustomerApplicationService;

  const service = new CompanyCustomerService(mockApplicationService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates create to the application service', async () => {
    const dto: CreateCompanyCustomerDto = {
      nickname: 'Acme',
      companyLegalName: 'Acme Corporation',
    };
    const expected = {
      id: 'customer-1',
      profileType: ProfileType.COMPANY,
      nickname: 'Acme',
      company: {
        companyLegalName: 'Acme Corporation',
        companyShortName: undefined,
      },
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
    };
    vi.mocked(mockApplicationService.create).mockResolvedValue(expected);

    await expect(
      service.create('talent-1', dto, context),
    ).resolves.toEqual(expected);

    expect(mockApplicationService.create).toHaveBeenCalledWith(
      'talent-1',
      dto,
      context,
    );
  });

  it('delegates update to the application service', async () => {
    const dto: UpdateCompanyCustomerDto = {
      version: 1,
      pii: {
        contactName: 'Alice',
      },
    };
    const expected = {
      id: 'customer-1',
      nickname: 'Acme',
      version: 2,
      updatedAt: new Date('2026-04-14T00:05:00.000Z'),
    };
    vi.mocked(mockApplicationService.update).mockResolvedValue(expected);

    await expect(
      service.update('customer-1', 'talent-1', dto, context),
    ).resolves.toEqual(expected);

    expect(mockApplicationService.update).toHaveBeenCalledWith(
      'customer-1',
      'talent-1',
      dto,
      context,
    );
  });

  it('delegates company pii portal session creation to the application service', async () => {
    const expected = {
      redirectUrl: 'https://pii.example.com/session/company-1',
      expiresAt: '2026-04-15T08:05:00.000Z',
    };
    vi.mocked(mockApplicationService.createPiiPortalSession).mockResolvedValue(expected);

    await expect(
      service.createPiiPortalSession('customer-1', 'talent-1', context),
    ).resolves.toEqual(expected);

    expect(mockApplicationService.createPiiPortalSession).toHaveBeenCalledWith(
      'customer-1',
      'talent-1',
      context,
    );
  });
});
