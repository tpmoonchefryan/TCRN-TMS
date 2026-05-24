import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';

import { AuthRateLimiterGuard } from './auth-rate-limiter.guard';

function createExecutionContext(path = '/api/v1/auth/login'): ExecutionContext {
  const response = {
    setHeader: vi.fn(),
  };
  const request = {
    headers: {},
    ip: '127.0.0.1',
    path,
    socket: {
      remoteAddress: '127.0.0.1',
    },
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as ExecutionContext;
}

describe('AuthRateLimiterGuard', () => {
  it('bypasses guard-level limiting in development', async () => {
    const guard = new AuthRateLimiterGuard({
      get: vi.fn((key: string) => (key === 'NODE_ENV' ? 'development' : undefined)),
    } as unknown as ConfigService);

    await guard.onModuleInit();

    await expect(guard.canActivate(createExecutionContext())).resolves.toBe(true);
  });

  it('bypasses guard-level limiting in test', async () => {
    const guard = new AuthRateLimiterGuard({
      get: vi.fn((key: string) => (key === 'NODE_ENV' ? 'test' : undefined)),
    } as unknown as ConfigService);

    await guard.onModuleInit();

    await expect(guard.canActivate(createExecutionContext('/api/v1/auth/refresh'))).resolves.toBe(
      true
    );
  });
});
