// SPDX-License-Identifier: Apache-2.0
import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthFailureLimiterService } from '../auth-failure-limiter.service';

describe('AuthFailureLimiterService', () => {
  let service: AuthFailureLimiterService;

  beforeEach(() => {
    const configService = {
      get: vi.fn((key: string, fallback: unknown) => {
        const values: Record<string, unknown> = {
          AUTH_FAILURE_MAX_ATTEMPTS: 2,
          AUTH_FAILURE_WINDOW_MS: 60_000,
          AUTH_FAILURE_LOCKOUT_MS: 60_000,
        };
        return values[key] ?? fallback;
      }),
    };

    service = new AuthFailureLimiterService(configService as unknown as ConfigService);
  });

  it('locks an IP after configured failed login attempts', async () => {
    await service.assertCanAttempt('203.0.113.10');
    await service.recordFailure('203.0.113.10');
    await service.recordFailure('203.0.113.10');

    await expect(service.assertCanAttempt('203.0.113.10')).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it('clears accumulated failures after successful credential verification', async () => {
    await service.recordFailure('203.0.113.10');
    await service.clearFailures('203.0.113.10');

    await expect(service.assertCanAttempt('203.0.113.10')).resolves.toBeUndefined();
  });
});
