// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndividualCustomerPiiApplicationService } from '../../application/individual-customer-pii.service';
import { IndividualCustomerWriteApplicationService } from '../../application/individual-customer-write.service';
import { IndividualCustomerService } from '../individual-customer.service';

describe('IndividualCustomerService', () => {
  const context: RequestContext = {
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userId: 'user-1',
    userName: 'Tester',
    ipAddress: '127.0.0.1',
    userAgent: 'Vitest',
    requestId: 'req-1',
  };

  const mockWriteApplicationService = {
    create: vi.fn(),
    update: vi.fn(),
  } as unknown as IndividualCustomerWriteApplicationService;

  const mockPiiApplicationService = {
    createPortalSession: vi.fn(),
    updatePii: vi.fn(),
  } as unknown as IndividualCustomerPiiApplicationService;

  const service = new IndividualCustomerService(
    mockWriteApplicationService,
    mockPiiApplicationService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates create and update to the write application service', async () => {
    const createDto = {
      nickname: 'Test User',
    };
    const updateDto = {
      version: 1,
      nickname: 'Updated User',
    };
    vi.mocked(mockWriteApplicationService.create).mockResolvedValue({
      id: 'customer-1',
      profileType: 'individual',
      nickname: 'Test User',
    } as never);
    vi.mocked(mockWriteApplicationService.update).mockResolvedValue({
      id: 'customer-1',
      nickname: 'Updated User',
      version: 2,
    } as never);

    await expect(
      service.create('talent-1', createDto as any, context),
    ).resolves.toMatchObject({ id: 'customer-1' });
    await expect(
      service.update('customer-1', 'talent-1', updateDto as any, context),
    ).resolves.toMatchObject({ id: 'customer-1', version: 2 });

    expect(mockWriteApplicationService.create).toHaveBeenCalledWith(
      'talent-1',
      createDto,
      context,
    );
    expect(mockWriteApplicationService.update).toHaveBeenCalledWith(
      'customer-1',
      'talent-1',
      updateDto,
      context,
    );
  });

  it('delegates pii portal session creation and updates to the pii application service', async () => {
    const piiDto = {
      version: 1,
      pii: {
        givenName: 'Jane',
      },
    };
    vi.mocked(mockPiiApplicationService.createPortalSession).mockResolvedValue({
      redirectUrl: 'https://pii-platform.example.com/portal/sessions/session-1',
      expiresAt: '2026-04-14T08:05:00.000Z',
    } as never);
    vi.mocked(mockPiiApplicationService.updatePii).mockResolvedValue({
      id: 'customer-1',
      message: 'PII data synchronized to TCRN PII Platform',
    } as never);

    await expect(
      service.createPiiPortalSession('customer-1', 'talent-1', context),
    ).resolves.toEqual({
      redirectUrl: 'https://pii-platform.example.com/portal/sessions/session-1',
      expiresAt: '2026-04-14T08:05:00.000Z',
    });
    await expect(
      service.updatePii('customer-1', 'talent-1', piiDto as any, context),
    ).resolves.toEqual({
      id: 'customer-1',
      message: 'PII data synchronized to TCRN PII Platform',
    });

    expect(mockPiiApplicationService.createPortalSession).toHaveBeenCalledWith(
      'customer-1',
      'talent-1',
      context,
    );
    expect(mockPiiApplicationService.updatePii).toHaveBeenCalledWith(
      'customer-1',
      'talent-1',
      piiDto,
      context,
    );
  });
});
