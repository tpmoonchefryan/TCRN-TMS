import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CAPABILITIES_KEY } from '../decorators/require-capabilities.decorator';
import { CapabilityGuard } from './capability.guard';

describe('CapabilityGuard', () => {
  let guard: CapabilityGuard;
  let mockReflector: Reflector;
  let moduleCapabilityService: {
    getCurrentTenantEffectiveCapabilities: ReturnType<typeof vi.fn>;
  };

  const createContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      getHandler: () => CapabilityGuard,
      getClass: () => CapabilityGuard,
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: vi.fn((key: unknown) =>
        key === CAPABILITIES_KEY ? ['public_presence.homepage'] : undefined
      ),
    } as unknown as Reflector;
    moduleCapabilityService = {
      getCurrentTenantEffectiveCapabilities: vi.fn().mockResolvedValue({
        effective: {
          enabledCapabilityCodes: ['public_presence.homepage'],
        },
      }),
    };
    guard = new CapabilityGuard(mockReflector, moduleCapabilityService as never);
  });

  it('allows routes without required capabilities', async () => {
    vi.mocked(mockReflector.getAllAndOverride).mockReturnValueOnce(undefined);

    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
    expect(moduleCapabilityService.getCurrentTenantEffectiveCapabilities).not.toHaveBeenCalled();
  });

  it('fails closed when a capability-gated route has no tenant context', async () => {
    await expect(guard.canActivate(createContext({ user: { id: 'user-1' } }))).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(moduleCapabilityService.getCurrentTenantEffectiveCapabilities).not.toHaveBeenCalled();
  });

  it('denies when the tenant effective snapshot lacks the required capability', async () => {
    moduleCapabilityService.getCurrentTenantEffectiveCapabilities.mockResolvedValueOnce({
      effective: {
        enabledCapabilityCodes: ['marshmallow.mailbox'],
      },
    });

    await expect(
      guard.canActivate(createContext({ user: { id: 'user-1', tenantId: 'tenant-1' } }))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('delegates disabled tenant denial to the effective capability resolver', async () => {
    moduleCapabilityService.getCurrentTenantEffectiveCapabilities.mockRejectedValueOnce(
      new ForbiddenException({ code: 'TENANT_DISABLED', message: 'Tenant is disabled' })
    );

    await expect(
      guard.canActivate(createContext({ user: { id: 'user-1', tenantId: 'tenant-1' } }))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
