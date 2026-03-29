// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { type ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IntegrationLogService } from '../../log';
import { ApiKeyService } from '../services/api-key.service';
import { ApiKeyGuard } from './api-key.guard';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let mockApiKeyService: Pick<ApiKeyService, 'validateApiKey' | 'isIpAllowed'>;
  let mockIntegrationLogService: Pick<IntegrationLogService, 'logInbound'>;

  const mockConsumer = {
    id: 'consumer-1',
    code: 'EXT_SYSTEM',
    allowedIps: ['10.0.0.1'],
  };

  const createContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    mockApiKeyService = {
      validateApiKey: vi.fn(),
      isIpAllowed: vi.fn(),
    };

    mockIntegrationLogService = {
      logInbound: vi.fn().mockResolvedValue(undefined),
    };

    guard = new ApiKeyGuard(
      mockApiKeyService as ApiKeyService,
      mockIntegrationLogService as IntegrationLogService,
    );
  });

  it('attaches the validated consumer and integration log context to the request', async () => {
    const request = {
      headers: {},
      query: {
        api_key: 'tcrn_valid_from_query',
      },
      method: 'POST',
      url: '/api/v1/webhooks/inbound',
      ip: '10.0.0.1',
      body: { hello: 'world' },
    };

    (mockApiKeyService.validateApiKey as ReturnType<typeof vi.fn>).mockResolvedValue(mockConsumer);
    (mockApiKeyService.isIpAllowed as ReturnType<typeof vi.fn>).mockReturnValue(true);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(mockApiKeyService.validateApiKey).toHaveBeenCalledWith('tcrn_valid_from_query');
    expect(request).toMatchObject({
      consumer: mockConsumer,
      _integrationLogContext: {
        consumer: mockConsumer,
      },
    });
    expect(mockIntegrationLogService.logInbound).not.toHaveBeenCalled();
  });

  it('logs inbound failures with normalized headers when the client IP is not allowed', async () => {
    const request = {
      headers: {
        'x-api-key': ['tcrn_valid_header'],
        'x-real-ip': '192.168.1.10',
        'x-trace-id': 'trace-123',
        cookie: 'secret-cookie',
      },
      query: {},
      method: 'POST',
      url: '/api/v1/webhooks/inbound',
      ip: '127.0.0.1',
      body: { ok: true },
    };

    (mockApiKeyService.validateApiKey as ReturnType<typeof vi.fn>).mockResolvedValue(mockConsumer);
    (mockApiKeyService.isIpAllowed as ReturnType<typeof vi.fn>).mockReturnValue(false);

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(ForbiddenException);

    expect(mockIntegrationLogService.logInbound).toHaveBeenCalledWith(
      expect.objectContaining({
        consumerId: 'consumer-1',
        consumerCode: 'EXT_SYSTEM',
        endpoint: '/api/v1/webhooks/inbound',
        method: 'POST',
        requestHeaders: {
          'x-api-key': '***',
          'x-real-ip': '192.168.1.10',
          'x-trace-id': 'trace-123',
          cookie: '***',
        },
        responseStatus: 403,
        errorMessage: 'IP not allowed',
        traceId: 'trace-123',
      }),
    );
  });

  it('logs inbound failures when the API key is missing', async () => {
    const request = {
      headers: {},
      query: {},
      method: 'GET',
      url: '/api/v1/webhooks/inbound',
      ip: '127.0.0.1',
      body: null,
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(UnauthorizedException);

    expect(mockIntegrationLogService.logInbound).toHaveBeenCalledWith(
      expect.objectContaining({
        consumerId: undefined,
        consumerCode: undefined,
        responseStatus: 401,
        errorMessage: 'Missing API Key',
      }),
    );
    expect(mockApiKeyService.validateApiKey).not.toHaveBeenCalled();
  });
});
