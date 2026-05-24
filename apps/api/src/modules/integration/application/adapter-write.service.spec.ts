// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createLocalizedText,
  ErrorCodes,
  getIntegrationAdapterCreateDefinition,
  LogSeverity,
  type RequestContext,
  TechEventType,
} from '@tcrn/shared';

import { ChangeLogService, TechEventLogService } from '../../log';
import type { IntegrationAdapterOwnerScope } from '../domain/adapter-read.policy';
import { AdapterType, OwnerType } from '../dto/integration.dto';
import { AdapterWriteRepository } from '../infrastructure/adapter-write.repository';
import { AdapterCryptoService } from '../services/adapter-crypto.service';
import { AdapterReadApplicationService } from './adapter-read.service';
import { AdapterWriteApplicationService } from './adapter-write.service';

describe('AdapterWriteApplicationService', () => {
  const aiAdapterDefinition = getIntegrationAdapterCreateDefinition('ai-adapter');

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
    findPlatformByCode: vi.fn(),
    ensurePlatformForDefinition: vi.fn(),
    findByCode: vi.fn(),
    findByPlatformAndType: vi.fn(),
    create: vi.fn(),
    upsertConfigs: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    incrementVersion: vi.fn(),
    deleteConfig: vi.fn(),
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
    mockTechEventLog
  );
  const localized = (en: string) => createLocalizedText({ en });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockRepository.withTransaction).mockImplementation(async (operation) =>
      operation(prisma)
    );
  });

  it('creates adapters from the addable AI Adapter definition and encrypts tokens without free platform/type input', async () => {
    vi.mocked(mockRepository.ensurePlatformForDefinition).mockResolvedValue({
      id: 'platform-ai-adapter',
      code: 'AI_ADAPTER',
      displayName: 'AI Adapter',
      iconUrl: null,
    } as never);
    vi.mocked(mockRepository.findByCode).mockResolvedValue(null);
    vi.mocked(mockRepository.findByPlatformAndType).mockResolvedValue(null);
    vi.mocked(mockRepository.create).mockResolvedValue('adapter-ai-1');
    vi.mocked(mockReadApplicationService.findById).mockResolvedValue({
      id: 'adapter-ai-1',
      code: 'AI_ADAPTER',
    } as never);

    await expect(
      service.create(
        {
          definitionKey: 'ai-adapter',
          configs: [
            {
              configKey: 'provider',
              configValue: 'OPENAI',
            },
            {
              configKey: 'endpoint_path',
              configValue: '/v1/responses',
            },
            {
              configKey: 'model',
              configValue: 'gpt-example',
            },
            {
              configKey: 'token',
              configValue: 'provider-token',
            },
          ],
        },
        context,
        scope
      )
    ).resolves.toEqual({
      id: 'adapter-ai-1',
      code: 'AI_ADAPTER',
    });

    expect(mockRepository.findPlatformById).not.toHaveBeenCalled();
    expect(mockRepository.create).toHaveBeenCalledWith(
      prisma,
      'tenant_test',
      expect.objectContaining({
        platformId: 'platform-ai-adapter',
        code: 'AI_ADAPTER',
        name: aiAdapterDefinition?.name,
        adapterType: 'ai',
        extraData: expect.objectContaining({
          definitionKey: 'ai-adapter',
          aiProvider: 'OPENAI',
          protocol: expect.objectContaining({
            invocationRuntime: 'not_implemented',
          }),
        }),
      })
    );
    expect(mockRepository.upsertConfigs).toHaveBeenCalledWith(
      prisma,
      'tenant_test',
      'adapter-ai-1',
      [
        {
          configKey: 'provider',
          configValue: 'OPENAI',
          isSecret: false,
        },
        {
          configKey: 'endpoint_path',
          configValue: '/v1/responses',
          isSecret: false,
        },
        {
          configKey: 'model',
          configValue: 'gpt-example',
          isSecret: false,
        },
        {
          configKey: 'token',
          configValue: 'encrypted:provider-token',
          isSecret: true,
        },
      ]
    );
  });

  it('rejects free adapter identity fields when using a supported definition', async () => {
    await expect(
      service.create(
        {
          definitionKey: 'ai-adapter',
          platformId: '11111111-1111-4111-8111-111111111111',
          adapterType: AdapterType.API_KEY,
          code: 'FREE_FORM',
          name: localized('Free form adapter'),
          configs: [
            { configKey: 'provider', configValue: 'OPENAI' },
            { configKey: 'endpoint_path', configValue: '/v1/responses' },
            { configKey: 'model', configValue: 'gpt-example' },
            { configKey: 'token', configValue: 'provider-token' },
          ],
        },
        context,
        scope
      )
    ).rejects.toMatchObject({
      response: {
        code: ErrorCodes.VALIDATION_FAILED,
        message: "Adapter definition 'ai-adapter' controls platform, type, code, and name fields",
      },
    });
    expect(mockRepository.ensurePlatformForDefinition).not.toHaveBeenCalled();
  });

  it('rejects legacy adapter definition keys in create while keeping legacy records readable elsewhere', async () => {
    await expect(
      service.create(
        {
          definitionKey: 'openai-ai',
          configs: [
            { configKey: 'endpoint_path', configValue: '/v1/responses' },
            { configKey: 'model', configValue: 'gpt-example' },
            { configKey: 'token', configValue: 'provider-token' },
          ],
        },
        context,
        scope
      )
    ).rejects.toMatchObject({
      response: {
        code: ErrorCodes.VALIDATION_FAILED,
        message: "Unsupported adapter definition 'openai-ai'",
      },
    });
    expect(mockRepository.ensurePlatformForDefinition).not.toHaveBeenCalled();
  });

  it('rejects unsupported AI provider values for the generic AI Adapter definition', async () => {
    await expect(
      service.create(
        {
          definitionKey: 'ai-adapter',
          configs: [
            { configKey: 'provider', configValue: 'BILIBILI' },
            { configKey: 'endpoint_path', configValue: '/v1/responses' },
            { configKey: 'model', configValue: 'gpt-example' },
            { configKey: 'token', configValue: 'provider-token' },
          ],
        },
        context,
        scope
      )
    ).rejects.toMatchObject({
      response: {
        code: ErrorCodes.VALIDATION_FAILED,
        message: "Config 'provider' value is not supported by adapter definition 'ai-adapter'",
      },
    });
    expect(mockRepository.ensurePlatformForDefinition).not.toHaveBeenCalled();
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
          name: localized('Bili Sync'),
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
        scope
      )
    ).resolves.toEqual({
      id: 'adapter-1',
      code: 'BILI_SYNC',
    });

    expect(mockRepository.upsertConfigs).toHaveBeenCalledWith(prisma, 'tenant_test', 'adapter-1', [
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
    ]);
    expect(mockReadApplicationService.findById).toHaveBeenCalledWith('adapter-1', context);
  });

  it('keeps adapter version-conflict semantics on update', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue({
      id: 'adapter-1',
      ownerType: OwnerType.TENANT,
      ownerId: null,
      platformId: 'platform-1',
      code: 'BILI_SYNC',
      name: localized('Bili Sync'),
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
          name: { en: 'Bili Sync Updated' },
          version: 2,
        },
        context
      )
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
      name: localized('Bili Sync'),
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
              mutation: 'replace',
              configValue: 'rotated-secret',
            },
          ],
        },
        context
      )
    ).resolves.toEqual({
      updatedCount: 1,
      adapterVersion: 6,
    });

    expect(mockRepository.upsertConfigs).toHaveBeenCalledWith(prisma, 'tenant_test', 'adapter-1', [
      {
        configKey: 'client_secret',
        configValue: 'encrypted:rotated-secret',
        isSecret: true,
      },
    ]);
    expect(mockTechEventLog.log).toHaveBeenCalledWith({
      eventType: TechEventType.SECURITY_EVENT,
      scope: 'security',
      severity: LogSeverity.WARN,
      payload: {
        action: 'secret_replaced',
        adapterId: 'adapter-1',
        configKey: 'client_secret',
        userId: 'user-1',
      },
    });
  });

  it('keeps untouched secrets, clears optional secrets, and audit-logs clear without secret values', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue({
      id: 'adapter-1',
      ownerType: OwnerType.TENANT,
      ownerId: null,
      platformId: 'platform-1',
      code: 'BILI_SYNC',
      name: localized('Bili Sync'),
      adapterType: AdapterType.OAUTH,
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
              mutation: 'keep',
            },
            {
              configKey: 'access_token',
              mutation: 'clear',
            },
            {
              configKey: 'endpoint_url',
              mutation: 'replace',
              configValue: 'https://new.example.com',
            },
          ],
        },
        context
      )
    ).resolves.toEqual({
      updatedCount: 2,
      adapterVersion: 6,
    });

    expect(mockRepository.upsertConfigs).toHaveBeenCalledWith(prisma, 'tenant_test', 'adapter-1', [
      {
        configKey: 'endpoint_url',
        configValue: 'https://new.example.com',
        isSecret: false,
      },
    ]);
    expect(mockRepository.deleteConfig).toHaveBeenCalledWith(
      prisma,
      'tenant_test',
      'adapter-1',
      'access_token'
    );
    expect(mockTechEventLog.log).toHaveBeenCalledWith({
      eventType: TechEventType.SECURITY_EVENT,
      scope: 'security',
      severity: LogSeverity.WARN,
      payload: {
        action: 'secret_cleared',
        adapterId: 'adapter-1',
        configKey: 'access_token',
        userId: 'user-1',
      },
    });
  });

  it('treats keep-only config payloads as non-mutating', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue({
      id: 'adapter-1',
      ownerType: OwnerType.TENANT,
      ownerId: null,
      platformId: 'platform-1',
      code: 'BILI_SYNC',
      name: localized('Bili Sync'),
      adapterType: AdapterType.OAUTH,
      inherit: true,
      isActive: true,
      createdBy: 'user-1',
      updatedBy: 'user-1',
      version: 5,
    } as never);

    await expect(
      service.updateConfigs(
        'adapter-1',
        {
          adapterVersion: 5,
          configs: [
            {
              configKey: 'client_secret',
              mutation: 'keep',
            },
          ],
        },
        context
      )
    ).resolves.toEqual({
      updatedCount: 0,
      adapterVersion: 5,
    });

    expect(mockRepository.upsertConfigs).not.toHaveBeenCalled();
    expect(mockRepository.deleteConfig).not.toHaveBeenCalled();
    expect(mockRepository.incrementVersion).not.toHaveBeenCalled();
    expect(mockChangeLogService.create).not.toHaveBeenCalled();
    expect(mockTechEventLog.log).not.toHaveBeenCalled();
  });

  it('rejects required secret clear mutations', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue({
      id: 'adapter-1',
      ownerType: OwnerType.TENANT,
      ownerId: null,
      platformId: 'platform-1',
      code: 'BILI_SYNC',
      name: localized('Bili Sync'),
      adapterType: AdapterType.OAUTH,
      inherit: true,
      isActive: true,
      createdBy: 'user-1',
      updatedBy: 'user-1',
      version: 5,
    } as never);

    await expect(
      service.updateConfigs(
        'adapter-1',
        {
          adapterVersion: 5,
          configs: [
            {
              configKey: 'client_secret',
              mutation: 'clear',
            },
          ],
        },
        context
      )
    ).rejects.toMatchObject({
      response: {
        code: ErrorCodes.VALIDATION_FAILED,
        message:
          "Required secret 'client_secret' cannot be cleared; replace the secret or disable the adapter instead",
      },
    });

    expect(mockRepository.deleteConfig).not.toHaveBeenCalled();
    expect(mockRepository.upsertConfigs).not.toHaveBeenCalled();
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

    await expect(service.revealConfig('adapter-1', 'client_secret', context)).resolves.toEqual({
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
