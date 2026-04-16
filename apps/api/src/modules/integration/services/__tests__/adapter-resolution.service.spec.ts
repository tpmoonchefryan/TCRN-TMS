// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import 'reflect-metadata';

import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdapterResolutionApplicationService } from '../../application/adapter-resolution.service';
import { OwnerType } from '../../dto/integration.dto';
import { AdapterResolutionService } from '../adapter-resolution.service';

describe('AdapterResolutionService', () => {
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
    resolveEffectiveAdapter: vi.fn(),
  } as unknown as AdapterResolutionApplicationService;

  const service = new AdapterResolutionService(mockApplicationService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates effective adapter resolution to the application layer', async () => {
    const target = {
      ownerType: OwnerType.TALENT,
      ownerId: 'talent-1',
      platformCode: 'TCRN_PII_PLATFORM',
    };
    vi.mocked(mockApplicationService.resolveEffectiveAdapter).mockResolvedValue({
      id: 'adapter-1',
    } as never);

    await expect(
      service.resolveEffectiveAdapter(target, context),
    ).resolves.toEqual({ id: 'adapter-1' });

    expect(mockApplicationService.resolveEffectiveAdapter).toHaveBeenCalledWith(
      target,
      context,
    );
  });
});
