import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { JwtAuthGuard } from '../jwt-auth.guard';

function buildContext(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('rejects an external IdP token as a TCRN API bearer token', async () => {
    const request: Record<string, unknown> = {
      headers: {
        authorization: 'Bearer mock-idp-access-token',
      },
    };
    const guard = new JwtAuthGuard(
      {
        getAllAndOverride: vi.fn().mockReturnValue(false),
      } as never,
      {
        verifyAccessToken: vi
          .fn()
          .mockRejectedValue(new UnauthorizedException('not a TCRN access token')),
      } as never
    );

    await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException
    );

    expect(request.user).toBeUndefined();
  });

  it('attaches TCRN subject context only after AuthService verifies the access token', async () => {
    const request: Record<string, unknown> = {
      headers: {
        authorization: 'Bearer tcrn-access-token',
      },
    };
    const guard = new JwtAuthGuard(
      {
        getAllAndOverride: vi.fn().mockReturnValue(false),
      } as never,
      {
        verifyAccessToken: vi.fn().mockResolvedValue({
          sub: 'user-123',
          tid: 'tenant-123',
          tsc: 'tenant_uat',
          email: 'corp.admin@uat.test',
          username: 'corp.admin',
        }),
      } as never
    );

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);

    expect(request.user).toEqual({
      id: 'user-123',
      tenantId: 'tenant-123',
      tenantSchema: 'tenant_uat',
      email: 'corp.admin@uat.test',
      username: 'corp.admin',
    });
  });
});
