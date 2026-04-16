// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import 'reflect-metadata';

import { ErrorCodes, LogSeverity, type RequestContext, TechEventType } from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChangeLogService, TechEventLogService } from '../../log';
import type { IntegrationAdapterOwnerScope } from '../domain/adapter-read.policy';
import { AdapterType, OwnerType } from '../dto/integration.dto';
import { AdapterWriteRepository } from '../infrastructure/adapter-write.repository';
import { AdapterCryptoService } from '../services/adapter-crypto.service';
import { AdapterReadApplicationService } from './adapter-read.service';
import { AdapterWriteApplicationService } from './adapter-write.service';

describe('AdapterWriteApplicationService', () => {
  const context: RequestContext = {
    tenantId: 'tenant-1',
    tenantSchema: 'tenant_test',
    userId: 'user-1',
    userName: 'Tester',
    ipAddress: '127.0.0.1',
    userAgent: 'Vitest',
    requestId: 'req-1',
  };

  const scope: IntegrationAdapterOwnerScope = {
    ownerType: OwnerType.SUBSIDIARY,
    ownerId: 'subsidiary-1',
  };

  const prisma = {} as never;

  const mockRepository = {
    withTransaction: vi.fn(),
    findPlatformById: vi.fn(),
    findByCode: vi.fn(),
    findByPlatformAndType: vi.fn(),
    create: vi.fn(),
    upsertConfigs: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    incrementVersion: vi.fn(),
    findConfig: vi.fn(),
    findDisabledOverride: vi.fn(),
    upsertDisabledOverride: vi.fn(),
    deleteDisabledOverride: vi.fn(),
    setActiveStatus: vi.fn(),
  } as unknown as AdapterWriteRepository;

  const mockReadApplicationService = {
    findById: vi.fn(),
  } as unknown as AdapterReadApplicationService;

  const mockCryptoService = {
    encrypt: vi.fn((value: string) => `encrypted:${value}`),
    decrypt: vi.fn((value: string) => `decrypted:${value}`),
  } as unknown as AdapterCryptoService;

  const mockChangeLogService = {
    create: vi.fn().mockResolvedValue(undefined),
  } as unknown as ChangeLogService;

  const mockTechEventLog = {
    log: vi.fn().mockResolvedValue(undefined),
  } as unknown as TechEventLogService;

  const service = new AdapterWriteApplicationService(
    mockRepository,
    mockReadApplicationService,
    mockCryptoService,
    mockChangeLogService,
    mockTechEventLog,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockRepository.withTransaction).mockImplementation(async (operation) =>
      operation(prisma),
    );
  });

  it('creates adapters through the write repository and encrypts secret configs', async () => {
    vi.mocked(mockRepository.findPlatformById).mockResolvedValue({
      id: 'platform-1',
      code: 'BILIBILI',
      displayName: 'Bilibili',
      iconUrl: null,
    } as never);
    vi.mocked(mockRepository.findByCode).mockResolvedValue(null);
    vi.mocked(mockRepository.findByPlatformAndType).mockResolvedValue(null);
    vi.mocked(mockRepository.create).mockResolvedValue('adapter-1');
    vi.mocked(mockReadApplicationService.findById).mockResolvedValue({
      id: 'adapter-1',
      code: 'BILI_SYNC',
    } as never);

    await expect(
      service.create(
        {
          platformId: 'platform-1',
          code: 'BILI_SYNC',
          nameEn: 'Bili Sync',
          adapterType: AdapterType.OAUTH,
          configs: [
            {
              configKey: 'client_secret',
              configValue: 'top-secret',
            },
            {
              configKey: 'endpoint',
              configValue: 'https://example.com',
            },
          ],
        },
        context,
        scope,
      ),
    ).resolves.toEqual({
      id: 'adapter-1',
      code: 'BILI_SYNC',
    });

    expect(mockRepository.upsertConfigs).toHaveBeenCalledWith(
      prisma,
      'tenant_test',
      'adapter-1',
      [
        {
          configKey: 'client_secret',
          configValue: 'encrypted:top-secret',
          isSecret: true,
        },
        {
          configKey: 'endpoint',
          configValue: 'https://example.com',
          isSecret: false,
        },
      ],
    );
    expect(mockReadApplicationService.findById).toHaveBeenCalledWith('adapter-1', context);
  });

  it('keeps adapter version-conflict semantics on update', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue({
      id: 'adapter-1',
      ownerType: OwnerType.TENANT,
      ownerId: null,
      platformId: 'platform-1',
      code: 'BILI_SYNC',
      nameEn: 'Bili Sync',
      nameZh: null,
      nameJa: null,
      adapterType: 'oauth',
      inherit: true,
      isActive: true,
      createdBy: 'user-1',
      updatedBy: 'user-1',
      version: 3,
    } as never);

    await expect(
      service.update(
        'adapter-1',
        {
          nameEn: 'Bili Sync Updated',
          version: 2,
        },
        context,
      ),
    ).rejects.toMatchObject({
      response: {
        code: ErrorCodes.VERSION_CONFLICT,
        message: 'Adapter was modified by another user',
      },
    });

    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('updates configs through the layered repository and returns the new version', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue({
      id: 'adapter-1',
      ownerType: OwnerType.TENANT,
      ownerId: null,
      platformId: 'platform-1',
      code: 'BILI_SYNC',
      nameEn: 'Bili Sync',
      nameZh: null,
      nameJa: null,
      adapterType: 'oauth',
      inherit: true,
      isActive: true,
      createdBy: 'user-1',
      updatedBy: 'user-1',
      version: 5,
    } as never);
    vi.mocked(mockRepository.incrementVersion).mockResolvedValue(6);

    await expect(
      service.updateConfigs(
        'adapter-1',
        {
          adapterVersion: 5,
          configs: [
            {
              configKey: 'client_secret',
              configValue: 'rotated-secret',
            },
          ],
        },
        context,
      ),
    ).resolves.toEqual({
      updatedCount: 1,
      adapterVersion: 6,
    });

    expect(mockRepository.upsertConfigs).toHaveBeenCalledWith(
      prisma,
      'tenant_test',
      'adapter-1',
      [
        {
          configKey: 'client_secret',
          configValue: 'encrypted:rotated-secret',
          isSecret: true,
        },
      ],
    );
  });

  it('decrypts secret config reveals and emits the same security tech event payload', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-14T00:00:00.000Z'));
    vi.mocked(mockRepository.findConfig).mockResolvedValue({
      id: 'config-1',
      configKey: 'client_secret',
      configValue: 'encrypted-secret',
      isSecret: true,
    } as never);

    await expect(
      service.revealConfig('adapter-1', 'client_secret', context),
    ).resolves.toEqual({
      configKey: 'client_secret',
      configValue: 'decrypted:encrypted-secret',
      revealedAt: '2026-04-14T00:00:00.000Z',
      expiresInSeconds: 30,
    });

    expect(mockTechEventLog.log).toHaveBeenCalledWith({
      eventType: TechEventType.SECURITY_EVENT,
      scope: 'security',
      severity: LogSeverity.WARN,
      payload: {
        action: 'secret_revealed',
        adapterId: 'adapter-1',
        configKey: 'client_secret',
        userId: 'user-1',
      },
    });
    vi.useRealTimers();
  });
});
