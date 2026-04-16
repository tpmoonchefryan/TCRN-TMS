// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { ExecutionContext } from '@nestjs/common';
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
    };

    guard = new PermissionGuard(
      mockReflector,
      mockPermissionService as never,
    );
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

    expect(mockPermissionService.checkPermission).toHaveBeenCalledWith(
      'tenant_test',
      'user-1',
      'customer.profile',
      'read',
      'talent',
      'talent-1',
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

    expect(mockPermissionService.checkPermission).toHaveBeenCalledWith(
      'tenant_test',
      'user-1',
      'customer.profile',
      'read',
      'subsidiary',
      'subsidiary-1',
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

    expect(mockPermissionService.checkPermission).toHaveBeenCalledWith(
      'tenant_test',
      'user-1',
      'customer.profile',
      'read',
      'talent',
      'talent-from-query',
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

    expect(mockPermissionService.checkPermission).toHaveBeenCalledWith(
      'tenant_test',
      'user-1',
      'customer.profile',
      'read',
      undefined,
      undefined,
    );
  });
});
