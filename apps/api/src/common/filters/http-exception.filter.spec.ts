// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '@tcrn/shared';
import type { Request } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpExceptionFilter } from './http-exception.filter';

interface MockResponse {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
}

function createHost(request: Partial<Request>, response: MockResponse): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
}

function createResponse(): MockResponse {
  const response: MockResponse = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
}

describe('HttpExceptionFilter trace id envelope', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });

  it('adds traceId and compatibility requestId to ordinary HttpException responses', () => {
    const filter = new HttpExceptionFilter();
    const logger = {
      warn: vi.fn(),
      error: vi.fn(),
    };
    (filter as unknown as { logger: typeof logger }).logger = logger;
    const response = createResponse();
    const request = {
      method: 'GET',
      url: '/api/v1/settings/custom-domains',
      headers: {},
      ip: '127.0.0.1',
      traceId: 'trace_visible_123',
      requestId: 'trace_visible_123',
    } as Partial<Request>;

    filter.catch(
      new HttpException(
        {
          code: ErrorCodes.SYS_DATABASE_ERROR,
          message: 'Custom domain registry is unavailable',
          details: { resource: 'custom-domain' },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      ),
      createHost(request, response),
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: ErrorCodes.SYS_DATABASE_ERROR,
        message: 'Custom domain registry is unavailable',
        details: { resource: 'custom-domain' },
        traceId: 'trace_visible_123',
        requestId: 'trace_visible_123',
      },
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('SYS_DATABASE_ERROR'),
      expect.objectContaining({
        traceId: 'trace_visible_123',
        requestId: 'trace_visible_123',
      }),
    );
  });

  it('keeps unhandled production errors safe while logging the same traceId', () => {
    process.env.NODE_ENV = 'production';
    const filter = new HttpExceptionFilter();
    const logger = {
      warn: vi.fn(),
      error: vi.fn(),
    };
    (filter as unknown as { logger: typeof logger }).logger = logger;
    const response = createResponse();
    const request = {
      method: 'POST',
      url: '/api/v1/talents/talent-id/custom-domain',
      headers: {},
      ip: '127.0.0.1',
      traceId: 'trace_safe_500',
      requestId: 'trace_safe_500',
    } as Partial<Request>;

    filter.catch(
      new Error('PrismaClientKnownRequestError: relation public.custom_domain_binding does not exist'),
      createHost(request, response),
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: ErrorCodes.SYS_ERROR,
        message: 'Internal server error',
        traceId: 'trace_safe_500',
        requestId: 'trace_safe_500',
      },
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('PrismaClientKnownRequestError'),
      expect.any(String),
      expect.objectContaining({
        traceId: 'trace_safe_500',
        requestId: 'trace_safe_500',
      }),
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('SYS_ERROR'),
      expect.objectContaining({
        traceId: 'trace_safe_500',
        requestId: 'trace_safe_500',
      }),
    );
  });
});
