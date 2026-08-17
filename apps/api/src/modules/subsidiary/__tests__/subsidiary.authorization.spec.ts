// SPDX-License-Identifier: Apache-2.0
// TCRN-TMS-INC-001 — the seven subsidiary endpoints carry authorization.
//
// All seven required a valid JWT and nothing else: PermissionGuard passes through
// when a handler declares no permissions, so an authenticated identity from any
// tenant could list, create, rename, move, deactivate and reactivate organization
// units. The catalog had `subsidiary` with read/write/delete/admin the whole time
// and no handler referenced it.
//
// The incident says plainly that a static decorator is not the repair: "在服务支撑 CI
// 通过前不得把静态装饰器视为修复完成". So this file asserts two things a decorator
// alone cannot — that the metadata actually reaches the guard, and that the guard
// refuses an authenticated identity without the permission.

import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PERMISSIONS_KEY } from '../../../common/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { SubsidiaryController } from '../subsidiary.controller';

/** Handler name → the permission the endpoint must demand. */
const EXPECTED: Record<string, { resource: string; action: string }> = {
  list: { resource: 'subsidiary', action: 'read' },
  create: { resource: 'subsidiary', action: 'write' },
  getById: { resource: 'subsidiary', action: 'read' },
  update: { resource: 'subsidiary', action: 'write' },
  move: { resource: 'subsidiary', action: 'write' },
  deactivate: { resource: 'subsidiary', action: 'write' },
  reactivate: { resource: 'subsidiary', action: 'write' },
};

const handlers = Object.getOwnPropertyNames(SubsidiaryController.prototype).filter(
  (name) => name !== 'constructor'
);

describe('subsidiary endpoint authorization', () => {
  it('every route handler declares a permission', () => {
    // Read from the class rather than from a list kept beside it: a new endpoint
    // added without a permission is the defect, and a hand-kept list would not see
    // it. This is the check that fails when someone adds the eighth route.
    const undeclared = handlers.filter(
      (name) => !Reflect.getMetadata(PERMISSIONS_KEY, SubsidiaryController.prototype[name as keyof object])
    );

    expect(undeclared).toEqual([]);
  });

  it.each(Object.entries(EXPECTED))('%s demands its catalog permission', (name, expected) => {
    const declared = Reflect.getMetadata(
      PERMISSIONS_KEY,
      SubsidiaryController.prototype[name as keyof object]
    );

    expect(declared).toEqual([expected]);
  });

  it('the expectation table names exactly the handlers the class has', () => {
    // I first wrote `findOne` for what the class calls `getById`, and the only symptom
    // was Reflect.getMetadata receiving undefined. A table beside a class is a second
    // roster; this is what keeps the two from drifting apart silently.
    expect(Object.keys(EXPECTED).sort()).toEqual([...handlers].sort());
  });

  it('a write endpoint never settles for read', () => {
    // The mistake this catches is binding everything to `read` because that is what
    // the first endpoint needed. Deactivating an organization unit is a write.
    for (const name of ['create', 'update', 'move', 'deactivate', 'reactivate']) {
      const declared = Reflect.getMetadata(
        PERMISSIONS_KEY,
        SubsidiaryController.prototype[name as keyof object]
      );

      expect(declared[0].action).toBe('write');
    }
  });
});

describe('PermissionGuard refuses an authenticated identity without the permission', () => {
  let guard: PermissionGuard;
  let permissionService: { checkPermission: ReturnType<typeof vi.fn>; refreshAndCheckPermission: ReturnType<typeof vi.fn> };

  const context = (permissions: unknown) =>
    ({
      getHandler: () => PermissionGuard,
      getClass: () => PermissionGuard,
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'user-1', tenantSchema: 'tenant_1' }, params: {}, query: {} }),
      }),
    }) as never;

  beforeEach(() => {
    permissionService = {
      checkPermission: vi.fn().mockResolvedValue(false),
      refreshAndCheckPermission: vi.fn().mockResolvedValue(false),
    };
    const reflector = {
      getAllAndOverride: vi.fn((key: unknown) =>
        key === PERMISSIONS_KEY ? [{ resource: 'subsidiary', action: 'write' }] : undefined
      ),
    } as unknown as Reflector;
    guard = new PermissionGuard(reflector, permissionService as never);
  });

  it('denies when the identity holds no subsidiary permission', async () => {
    // Authenticated and refused: this is the state the seven endpoints could not
    // reach before, because with no declared permission the guard passed through.
    await expect(guard.canActivate(context(true))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('a handler that declares nothing is passed through — the shape of the original gap', async () => {
    // PermissionGuard returns true when no permission is declared. That is correct
    // behaviour for an endpoint with no authorization requirement, and it is exactly
    // why the seven subsidiary routes were reachable: the guard was mounted and had
    // nothing to enforce. Pinning it here keeps the reason visible.
    const silent = {
      getAllAndOverride: vi.fn(() => undefined),
    } as unknown as Reflector;
    const passthrough = new PermissionGuard(silent, permissionService as never);

    await expect(passthrough.canActivate(context(true))).resolves.toBe(true);
    expect(permissionService.refreshAndCheckPermission).not.toHaveBeenCalled();
  });

  it('allows when the identity holds it', async () => {
    permissionService.checkPermission.mockResolvedValue(true);
    permissionService.refreshAndCheckPermission.mockResolvedValue(true);

    await expect(guard.canActivate(context(true))).resolves.toBe(true);
  });
});
