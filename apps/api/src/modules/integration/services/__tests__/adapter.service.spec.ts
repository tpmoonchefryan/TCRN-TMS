// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import 'reflect-metadata';

import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdapterReadApplicationService } from '../../application/adapter-read.service';
import { AdapterWriteApplicationService } from '../../application/adapter-write.service';
import { OwnerType } from '../../dto/integration.dto';
import { AdapterService } from '../adapter.service';

describe('AdapterService', () => {
  const context: RequestContext = {
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userId: 'user-1',
    userName: 'Tester',
    ipAddress: '127.0.0.1',
    userAgent: 'Vitest',
    requestId: 'req-1',
  };

  const mockAdapterReadApplicationService = {
    findMany: vi.fn(),
    findById: vi.fn(),
  } as unknown as AdapterReadApplicationService;

  const mockAdapterWriteApplicationService = {
    create: vi.fn(),
    update: vi.fn(),
    updateConfigs: vi.fn(),
    revealConfig: vi.fn(),
    deactivate: vi.fn(),
    reactivate: vi.fn(),
    disableInherited: vi.fn(),
    enableInherited: vi.fn(),
  } as unknown as AdapterWriteApplicationService;

  const service = new AdapterService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    mockAdapterReadApplicationService,
    mockAdapterWriteApplicationService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates read paths to the layered adapter read application service', async () => {
    const scope = {
      ownerType: OwnerType.TENANT,
      ownerId: null,
    };
    const query = {
      includeInherited: false,
      includeDisabled: false,
    };
    vi.mocked(mockAdapterReadApplicationService.findMany).mockResolvedValue([
      { id: 'adapter-1' },
    ] as never);
    vi.mocked(mockAdapterReadApplicationService.findById).mockResolvedValue({
      id: 'adapter-1',
      code: 'BILI_SYNC',
    } as never);

    await expect(
      service.findMany(scope, query as never, context),
    ).resolves.toEqual([{ id: 'adapter-1' }]);
    await expect(
      service.findById('adapter-1', context),
    ).resolves.toEqual({
      id: 'adapter-1',
      code: 'BILI_SYNC',
    });

    expect(mockAdapterReadApplicationService.findMany).toHaveBeenCalledWith(
      scope,
      query,
      context,
    );
    expect(mockAdapterReadApplicationService.findById).toHaveBeenCalledWith(
      'adapter-1',
      context,
    );
  });

  it('delegates write, config, reveal, and lifecycle paths to the layered adapter write application service', async () => {
    const scope = {
      ownerType: OwnerType.SUBSIDIARY,
      ownerId: 'subsidiary-1',
    };
    const createDto = {
      platformId: 'platform-1',
      code: 'BILI_SYNC',
      nameEn: 'Bili Sync',
      adapterType: 'oauth',
    };
    const updateDto = {
      nameEn: 'Bili Sync Updated',
      version: 3,
    };
    const updateConfigsDto = {
      adapterVersion: 4,
      configs: [
        {
          configKey: 'client_secret',
          configValue: 'rotated',
        },
      ],
    };
    vi.mocked(mockAdapterWriteApplicationService.create).mockResolvedValue({
      id: 'adapter-1',
    } as never);
    vi.mocked(mockAdapterWriteApplicationService.update).mockResolvedValue({
      id: 'adapter-1',
    } as never);
    vi.mocked(mockAdapterWriteApplicationService.updateConfigs).mockResolvedValue({
      updatedCount: 1,
      adapterVersion: 5,
    } as never);
    vi.mocked(mockAdapterWriteApplicationService.revealConfig).mockResolvedValue({
      configKey: 'client_secret',
    } as never);
    vi.mocked(mockAdapterWriteApplicationService.deactivate).mockResolvedValue({
      id: 'adapter-1',
      isActive: false,
    } as never);
    vi.mocked(mockAdapterWriteApplicationService.reactivate).mockResolvedValue({
      id: 'adapter-1',
      isActive: true,
    } as never);
    vi.mocked(mockAdapterWriteApplicationService.disableInherited).mockResolvedValue({
      id: 'adapter-1',
      isDisabledHere: true,
    } as never);
    vi.mocked(mockAdapterWriteApplicationService.enableInherited).mockResolvedValue({
      id: 'adapter-1',
      isDisabledHere: false,
    } as never);

    await expect(
      service.create(createDto as never, context, scope),
    ).resolves.toEqual({ id: 'adapter-1' });
    await expect(
      service.update('adapter-1', updateDto as never, context),
    ).resolves.toEqual({ id: 'adapter-1' });
    await expect(
      service.updateConfigs('adapter-1', updateConfigsDto as never, context),
    ).resolves.toEqual({
      updatedCount: 1,
      adapterVersion: 5,
    });
    await expect(
      service.revealConfig('adapter-1', 'client_secret', context),
    ).resolves.toEqual({
      configKey: 'client_secret',
    });
    await expect(
      service.deactivate('adapter-1', context),
    ).resolves.toEqual({
      id: 'adapter-1',
      isActive: false,
    });
    await expect(
      service.reactivate('adapter-1', context),
    ).resolves.toEqual({
      id: 'adapter-1',
      isActive: true,
    });
    await expect(
      service.disableInherited('adapter-1', scope, context),
    ).resolves.toEqual({
      id: 'adapter-1',
      isDisabledHere: true,
    });
    await expect(
      service.enableInherited('adapter-1', scope, context),
    ).resolves.toEqual({
      id: 'adapter-1',
      isDisabledHere: false,
    });

    expect(mockAdapterWriteApplicationService.create).toHaveBeenCalledWith(
      createDto,
      context,
      scope,
    );
    expect(mockAdapterWriteApplicationService.update).toHaveBeenCalledWith(
      'adapter-1',
      updateDto,
      context,
    );
    expect(mockAdapterWriteApplicationService.updateConfigs).toHaveBeenCalledWith(
      'adapter-1',
      updateConfigsDto,
      context,
    );
    expect(mockAdapterWriteApplicationService.revealConfig).toHaveBeenCalledWith(
      'adapter-1',
      'client_secret',
      context,
    );
    expect(mockAdapterWriteApplicationService.deactivate).toHaveBeenCalledWith(
      'adapter-1',
      context,
    );
    expect(mockAdapterWriteApplicationService.reactivate).toHaveBeenCalledWith(
      'adapter-1',
      context,
    );
    expect(mockAdapterWriteApplicationService.disableInherited).toHaveBeenCalledWith(
      'adapter-1',
      scope,
      context,
    );
    expect(mockAdapterWriteApplicationService.enableInherited).toHaveBeenCalledWith(
      'adapter-1',
      scope,
      context,
    );
  });
});
