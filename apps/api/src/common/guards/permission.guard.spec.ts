// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PERMISSIONS_KEY,
  type RequiredPermission,
  RESOLVED_PERMISSIONS_KEY,
} from '../decorators/require-permissions.decorator';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let mockReflector: Reflector;
  let mockPermissionService: {
    checkPermission: ReturnType<typeof vi.fn>;
    refreshAndCheckPermission: ReturnType<typeof vi.fn>;
  };

  const requiredPermissions: RequiredPermission[] = [
    { resource: 'customer.profile', action: 'read' },
  ];

  const createContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      getHandler: () => PermissionGuard,
      getClass: () => PermissionGuard,
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: vi.fn((key: unknown) => {
        if (key === PERMISSIONS_KEY) {
          return requiredPermissions;
        }

        if (key === RESOLVED_PERMISSIONS_KEY) {
          return undefined;
        }

        return undefined;
      }),
    } as unknown as Reflector;

    mockPermissionService = {
      checkPermission: vi.fn().mockResolvedValue(true),
      refreshAndCheckPermission: vi.fn().mockResolvedValue(true),
    };

    guard = new PermissionGuard(mockReflector, mockPermissionService as never);
  });

  it('uses talentId path scope ahead of legacy scope query values', async () => {
    const request = {
      user: {
        id: 'user-1',
        tenantSchema: 'tenant_test',
      },
      params: {
        talentId: 'talent-1',
      },
      query: {
        scopeType: 'tenant',
        scopeId: 'legacy-scope-id',
      },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(mockPermissionService.checkPermission).not.toHaveBeenCalled();
    expect(mockPermissionService.refreshAndCheckPermission).toHaveBeenCalledWith(
      'tenant_test',
      'user-1',
      'customer.profile',
      'read',
      'talent',
      'talent-1'
    );
  });

  it('uses subsidiaryId path scope when no talentId is present', async () => {
    const request = {
      user: {
        id: 'user-1',
        tenantSchema: 'tenant_test',
      },
      params: {
        subsidiaryId: 'subsidiary-1',
      },
      query: {},
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(mockPermissionService.checkPermission).not.toHaveBeenCalled();
    expect(mockPermissionService.refreshAndCheckPermission).toHaveBeenCalledWith(
      'tenant_test',
      'user-1',
      'customer.profile',
      'read',
      'subsidiary',
      'subsidiary-1'
    );
  });

  it('falls back to explicit scope query only when canonical owner params are absent', async () => {
    const request = {
      user: {
        id: 'user-1',
        tenantSchema: 'tenant_test',
      },
      params: {},
      query: {
        scopeType: 'talent',
        scopeId: 'talent-from-query',
      },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(mockPermissionService.checkPermission).not.toHaveBeenCalled();
    expect(mockPermissionService.refreshAndCheckPermission).toHaveBeenCalledWith(
      'tenant_test',
      'user-1',
      'customer.profile',
      'read',
      'talent',
      'talent-from-query'
    );
  });

  it('uses X-Talent-Id as the export collection permission scope before tenant fallback', async () => {
    const talentId = '11111111-1111-4111-8111-111111111111';
    const request = {
      user: {
        id: 'user-1',
        tenantSchema: 'tenant_test',
      },
      path: '/api/v1/exports',
      headers: {
        'x-talent-id': talentId,
      },
      params: {},
      query: {},
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(mockPermissionService.refreshAndCheckPermission).toHaveBeenCalledWith(
      'tenant_test',
      'user-1',
      'customer.profile',
      'read',
      'talent',
      talentId
    );
  });

  it('denies export collection access when the requested talent grant is unrelated', async () => {
    mockPermissionService.refreshAndCheckPermission.mockResolvedValueOnce(false);

    const request = {
      user: {
        id: 'user-1',
        tenantSchema: 'tenant_test',
      },
      path: '/api/v1/exports',
      headers: {
        'x-talent-id': '22222222-2222-4222-8222-222222222222',
      },
      params: {},
      query: {},
    };

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(mockPermissionService.refreshAndCheckPermission).toHaveBeenCalledWith(
      'tenant_test',
      'user-1',
      'customer.profile',
      'read',
      'talent',
      '22222222-2222-4222-8222-222222222222'
    );
  });

  it('falls back to tenant scope when no scope carrier is present', async () => {
    const request = {
      user: {
        id: 'user-1',
        tenantSchema: 'tenant_test',
      },
      params: {},
      query: {},
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(mockPermissionService.checkPermission).not.toHaveBeenCalled();
    expect(mockPermissionService.refreshAndCheckPermission).toHaveBeenCalledWith(
      'tenant_test',
      'user-1',
      'customer.profile',
      'read',
      undefined,
      undefined
    );
  });

  it('does not trust a cached grant and allows only after refreshing the snapshot', async () => {
    mockPermissionService.checkPermission.mockResolvedValueOnce(true);
    mockPermissionService.refreshAndCheckPermission.mockResolvedValueOnce(true);

    const request = {
      user: {
        id: 'user-1',
        tenantSchema: 'tenant_test',
      },
      params: {},
      query: {},
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(mockPermissionService.checkPermission).not.toHaveBeenCalled();
    expect(mockPermissionService.refreshAndCheckPermission).toHaveBeenCalledWith(
      'tenant_test',
      'user-1',
      'customer.profile',
      'read',
      undefined,
      undefined
    );
  });

  it('still denies access when the refreshed permission check remains false', async () => {
    mockPermissionService.refreshAndCheckPermission.mockResolvedValueOnce(false);

    const request = {
      user: {
        id: 'user-1',
        tenantSchema: 'tenant_test',
      },
      params: {},
      query: {},
    };

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(mockPermissionService.checkPermission).not.toHaveBeenCalled();
    expect(mockPermissionService.refreshAndCheckPermission).toHaveBeenCalledTimes(1);
  });
});
