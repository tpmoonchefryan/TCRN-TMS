// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ConflictException, NotFoundException } from '@nestjs/common';
import type { RequestContext } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../database';
import { ChangeLogService } from '../../log';
import { PiiClientService } from '../../pii';
import { PiiServiceConfigRepository } from '../infrastructure/pii-service-config.repository';
import { PiiServiceConfigApplicationService } from './pii-service-config.service';

describe('PiiServiceConfigApplicationService', () => {
  const context: RequestContext = {
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userId: 'user-1',
    userName: 'Admin',
    ipAddress: '127.0.0.1',
    requestId: 'req-1',
  };

  const mockRepository = {
    findMany: vi.fn(),
    countMany: vi.fn(),
    countProfileStoresByConfigId: vi.fn(),
    findById: vi.fn(),
    findForUpdate: vi.fn(),
    findByCode: vi.fn(),
    findForConnectionTest: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateHealthStatus: vi.fn(),
  } as unknown as PiiServiceConfigRepository;

  const mockDatabaseService = {
    calculatePaginationMeta: vi.fn(),
  } as unknown as DatabaseService;

  const mockChangeLogService = {
    createDirect: vi.fn(),
  } as unknown as ChangeLogService;

  const mockPiiClientService = {
    checkHealth: vi.fn(),
  } as unknown as PiiClientService;

  const service = new PiiServiceConfigApplicationService(
    mockRepository,
    mockDatabaseService,
    mockChangeLogService,
    mockPiiClientService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockDatabaseService.calculatePaginationMeta).mockReturnValue({
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    } as never);
  });

  it('returns mapped list items with pagination metadata', async () => {
    vi.mocked(mockRepository.findMany).mockResolvedValue([
      {
        id: 'config-1',
        code: 'DEFAULT_PII',
        nameEn: 'Default PII',
        nameZh: null,
        nameJa: null,
        apiUrl: 'https://pii.example.com',
        authType: 'mtls',
        isHealthy: true,
        lastHealthCheckAt: null,
        isActive: true,
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
        version: 1,
      },
    ]);
    vi.mocked(mockRepository.countMany).mockResolvedValue(1);
    vi.mocked(mockRepository.countProfileStoresByConfigId).mockResolvedValue(2);

    await expect(
      service.findMany({}, context),
    ).resolves.toEqual({
      items: [
        {
          id: 'config-1',
          code: 'DEFAULT_PII',
          name: 'Default PII',
          nameZh: null,
          nameJa: null,
          apiUrl: 'https://pii.example.com',
          authType: 'mtls',
          isHealthy: true,
          lastHealthCheckAt: null,
          isActive: true,
          profileStoreCount: 2,
          createdAt: new Date('2026-04-14T00:00:00.000Z'),
          version: 1,
        },
      ],
      meta: {
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
        },
      },
    });
  });

  it('fails closed when the detail record does not exist', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    await expect(
      service.findById('missing-config', context),
    ).rejects.toThrow(NotFoundException);
  });

  it('creates a config with derived health-check defaults and writes a change log', async () => {
    vi.mocked(mockRepository.findByCode).mockResolvedValue(null);
    vi.mocked(mockRepository.create).mockResolvedValue({
      id: 'config-1',
      code: 'DEFAULT_PII',
      nameEn: 'Default PII',
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
    });

    await expect(
      service.create(
        {
          code: 'DEFAULT_PII',
          nameEn: 'Default PII',
          apiUrl: 'https://pii.example.com',
          authType: 'mtls' as never,
        },
        context,
      ),
    ).resolves.toEqual({
      id: 'config-1',
      code: 'DEFAULT_PII',
      name: 'Default PII',
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
    });

    expect(mockRepository.create).toHaveBeenCalledWith(
      'tenant_test',
      expect.objectContaining({
        healthCheckUrl: 'https://pii.example.com/health',
        healthCheckIntervalSec: 60,
      }),
      'user-1',
    );
    expect(mockChangeLogService.createDirect).toHaveBeenCalled();
  });

  it('fails closed on duplicate create code', async () => {
    vi.mocked(mockRepository.findByCode).mockResolvedValue({ id: 'existing' });

    await expect(
      service.create(
        {
          code: 'DEFAULT_PII',
          nameEn: 'Default PII',
          apiUrl: 'https://pii.example.com',
          authType: 'mtls' as never,
        },
        context,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('fails closed on optimistic-lock mismatch during update', async () => {
    vi.mocked(mockRepository.findForUpdate).mockResolvedValue({
      id: 'config-1',
      code: 'DEFAULT_PII',
      nameEn: 'Old Name',
      apiUrl: 'https://old.example.com',
      isActive: true,
      version: 1,
    });

    await expect(
      service.update(
        'config-1',
        {
          version: 2,
          nameEn: 'New Name',
        },
        context,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('updates the config and records the stable audit payload', async () => {
    vi.mocked(mockRepository.findForUpdate).mockResolvedValue({
      id: 'config-1',
      code: 'DEFAULT_PII',
      nameEn: 'Old Name',
      apiUrl: 'https://old.example.com',
      isActive: true,
      version: 1,
    });
    vi.mocked(mockRepository.update).mockResolvedValue({
      id: 'config-1',
      code: 'DEFAULT_PII',
      nameEn: 'New Name',
      apiUrl: 'https://new.example.com',
      isActive: false,
      version: 2,
      updatedAt: new Date('2026-04-14T00:05:00.000Z'),
    });

    await expect(
      service.update(
        'config-1',
        {
          version: 1,
          nameEn: 'New Name',
          apiUrl: 'https://new.example.com',
          isActive: false,
        },
        context,
      ),
    ).resolves.toEqual({
      id: 'config-1',
      code: 'DEFAULT_PII',
      version: 2,
      updatedAt: new Date('2026-04-14T00:05:00.000Z'),
    });

    expect(mockChangeLogService.createDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        objectType: 'pii_service_config',
        oldValue: {
          nameEn: 'Old Name',
          apiUrl: 'https://old.example.com',
          isActive: true,
        },
        newValue: {
          nameEn: 'New Name',
          apiUrl: 'https://new.example.com',
          isActive: false,
        },
      }),
      context,
    );
  });

  it('fails closed when testConnection targets a missing config', async () => {
    vi.mocked(mockRepository.findForConnectionTest).mockResolvedValue(null);

    await expect(
      service.testConnection('missing-config', context),
    ).rejects.toThrow(NotFoundException);
  });

  it('tests health via the layered repository/client path and persists status', async () => {
    vi.mocked(mockRepository.findForConnectionTest).mockResolvedValue({
      id: 'config-1',
      apiUrl: 'https://pii.example.com',
      healthCheckUrl: 'https://pii.example.com/health',
    });
    vi.mocked(mockPiiClientService.checkHealth).mockResolvedValue({
      status: 'ok',
      latencyMs: 42,
    } as never);

    await expect(
      service.testConnection('config-1', context),
    ).resolves.toMatchObject({
      status: 'ok',
      latencyMs: 42,
    });

    expect(mockPiiClientService.checkHealth).toHaveBeenCalledWith(
      'https://pii.example.com',
    );
    expect(mockRepository.updateHealthStatus).toHaveBeenCalledWith(
      'tenant_test',
      'config-1',
      true,
    );
  });
});
