// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TenantContextGuard } from './tenant-context.guard';

const tenant = {
  id: '00000000-0000-4000-8000-0000000000ac',
  code: 'AC',
  name: 'Admin Center',
  schemaName: 'tenant_ac',
  tier: 'ac',
  isActive: true,
};

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('TenantContextGuard', () => {
  const tenantService = {
    getTenantById: vi.fn(),
    setTenantContext: vi.fn(),
  };
  let guard: TenantContextGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    tenantService.getTenantById.mockResolvedValue(tenant);
    tenantService.setTenantContext.mockResolvedValue(undefined);
    guard = new TenantContextGuard(tenantService as never);
  });

  it('binds private route tenant context from the authenticated JWT tenant', async () => {
    const request = {
      user: { tenantId: tenant.id, tenantSchema: tenant.schemaName },
      headers: { 'x-tenant-id': tenant.id },
      tenantContext: {
        tenantId: tenant.id,
        tenantCode: tenant.code,
        schemaName: tenant.schemaName,
        tier: tenant.tier,
      },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(tenantService.getTenantById).toHaveBeenCalledWith(tenant.id);
    expect(tenantService.setTenantContext).toHaveBeenCalledWith(tenant.schemaName);
    expect(request.tenantContext).toEqual({
      tenantId: tenant.id,
      tenantCode: tenant.code,
      schemaName: tenant.schemaName,
      tier: tenant.tier,
    });
  });

  it('rejects mismatched X-Tenant-ID after authentication', async () => {
    const request = {
      user: { tenantId: tenant.id, tenantSchema: tenant.schemaName },
      headers: { 'x-tenant-id': '00000000-0000-4000-8000-000000000bad' },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(tenantService.setTenantContext).not.toHaveBeenCalled();
  });

  it('rejects a middleware tenant context that differs from the JWT tenant', async () => {
    const request = {
      user: { tenantId: tenant.id, tenantSchema: tenant.schemaName },
      headers: {},
      tenantContext: {
        tenantId: '00000000-0000-4000-8000-000000000bad',
        tenantCode: 'BAD',
        schemaName: 'tenant_bad',
        tier: 'ac',
      },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(tenantService.setTenantContext).not.toHaveBeenCalled();
  });
});
