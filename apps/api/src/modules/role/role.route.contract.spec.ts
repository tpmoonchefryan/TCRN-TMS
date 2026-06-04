import 'reflect-metadata';

import { GoneException, MethodNotAllowedException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it, vi } from 'vitest';

import { PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator';
import { SystemRoleController } from '../system-role/system-role.controller';
import { ListRolesQueryDto, RoleController } from './role.controller';
import { UserRoleController } from './user-role.controller';

interface ControllerRoute {
  methodName: string;
  requestMethod: RequestMethod;
  path: string;
}

const normalizePaths = (value: string | string[] | undefined): string[] => {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

const getControllerRoutes = (controller: object): ControllerRoute[] => {
  const controllerClass = controller as { prototype: Record<string, unknown> };
  const methodNames = Object.getOwnPropertyNames(controllerClass.prototype).filter(
    (methodName) =>
      methodName !== 'constructor' && typeof controllerClass.prototype[methodName] === 'function'
  );

  return methodNames.flatMap((methodName) => {
    const handler = controllerClass.prototype[methodName];
    const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler) as
      | RequestMethod
      | undefined;

    if (requestMethod === undefined) {
      return [];
    }

    return normalizePaths(Reflect.getMetadata(PATH_METADATA, handler)).map((path) => ({
      methodName,
      requestMethod,
      path,
    }));
  });
};

const getMethodPermissions = (controller: object, methodName: string) =>
  Reflect.getMetadata(
    PERMISSIONS_KEY,
    (controller as { prototype: Record<string, unknown> }).prototype[methodName]
  ) as Array<{ resource: string; action: string }> | undefined;

describe('Role route contracts', () => {
  it('uses explicit role resource param names and PATCH for permission set mutations', () => {
    expect(Reflect.getMetadata(PATH_METADATA, RoleController)).toBe('roles');
    expect(getControllerRoutes(RoleController)).toEqual(
      expect.arrayContaining([
        {
          methodName: 'getById',
          requestMethod: RequestMethod.GET,
          path: ':roleId',
        },
        {
          methodName: 'update',
          requestMethod: RequestMethod.PATCH,
          path: ':roleId',
        },
        {
          methodName: 'setPermissions',
          requestMethod: RequestMethod.PATCH,
          path: ':roleId/permissions',
        },
        {
          methodName: 'deactivate',
          requestMethod: RequestMethod.POST,
          path: ':roleId/deactivate',
        },
        {
          methodName: 'reactivate',
          requestMethod: RequestMethod.POST,
          path: ':roleId/reactivate',
        },
      ])
    );
  });

  it('declares explicit permissions for role and user-role routes', () => {
    expect(getMethodPermissions(RoleController, 'list')).toEqual([
      { resource: 'role', action: 'read' },
    ]);
    expect(getMethodPermissions(RoleController, 'create')).toEqual([
      { resource: 'role', action: 'create' },
    ]);
    expect(getMethodPermissions(RoleController, 'getById')).toEqual([
      { resource: 'role', action: 'read' },
    ]);
    expect(getMethodPermissions(RoleController, 'update')).toEqual([
      { resource: 'role', action: 'update' },
    ]);
    expect(getMethodPermissions(RoleController, 'setPermissions')).toEqual([
      { resource: 'role', action: 'update' },
    ]);
    expect(getMethodPermissions(RoleController, 'deactivate')).toEqual([
      { resource: 'role', action: 'update' },
    ]);
    expect(getMethodPermissions(RoleController, 'reactivate')).toEqual([
      { resource: 'role', action: 'update' },
    ]);

    expect(getMethodPermissions(UserRoleController, 'getUserRoles')).toEqual([
      { resource: 'system_user', action: 'read' },
    ]);
    expect(getMethodPermissions(UserRoleController, 'assignRole')).toEqual([
      { resource: 'system_user', action: 'create' },
    ]);
    expect(getMethodPermissions(UserRoleController, 'updateAssignment')).toEqual([
      { resource: 'system_user', action: 'update' },
    ]);
    expect(getMethodPermissions(UserRoleController, 'removeAssignment')).toEqual([
      { resource: 'system_user', action: 'delete' },
    ]);

    expect(getMethodPermissions(SystemRoleController, 'create')).toEqual([
      { resource: 'role', action: 'create' },
    ]);
    expect(getMethodPermissions(SystemRoleController, 'findAll')).toEqual([
      { resource: 'role', action: 'read' },
    ]);
    expect(getMethodPermissions(SystemRoleController, 'findOne')).toEqual([
      { resource: 'role', action: 'read' },
    ]);
    expect(getMethodPermissions(SystemRoleController, 'update')).toEqual([
      { resource: 'role', action: 'update' },
    ]);
    expect(getMethodPermissions(SystemRoleController, 'remove')).toEqual([
      { resource: 'role', action: 'delete' },
    ]);
  });

  it('rejects role deletion through the canonical controller path', async () => {
    const controller = new RoleController({} as never);

    await expect(controller.remove('550e8400-e29b-41d4-a716-446655440000')).rejects.toThrow(
      MethodNotAllowedException
    );
  });

  it('parses false role-list boolean query values without enabling compatibility rows', async () => {
    const dto = plainToInstance(ListRolesQueryDto, {
      isSystem: 'false',
      includeCompatibility: 'false',
    });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto).toMatchObject({
      isSystem: false,
      includeCompatibility: false,
    });
  });

  it('passes explicit false role-list query values to the role service as false', async () => {
    const roleService = {
      list: vi.fn().mockResolvedValue([]),
    };
    const controller = new RoleController(roleService as never);

    await controller.list(
      {
        tenantSchema: 'tenant_test',
      } as never,
      {
        isSystem: true,
        includeCompatibility: true,
      },
      {
        headers: {},
        query: {
          isSystem: 'false',
          includeCompatibility: 'false',
        },
      } as never
    );

    expect(roleService.list).toHaveBeenCalledWith('tenant_test', {
      search: undefined,
      isSystem: false,
      includeCompatibility: false,
      sort: undefined,
    });
  });

  it('rejects legacy role status routes directly from the controller', async () => {
    const controller = new RoleController({} as never);

    await expect(
      controller.deactivate(
        {} as never,
        '550e8400-e29b-41d4-a716-446655440000',
        { version: 1 }
      )
    ).rejects.toThrow(GoneException);
    await expect(
      controller.reactivate(
        {} as never,
        '550e8400-e29b-41d4-a716-446655440000',
        { version: 1 }
      )
    ).rejects.toThrow(GoneException);
  });

  it('rejects system-role mutations directly from the compatibility controller', async () => {
    const controller = new SystemRoleController({} as never, {} as never);

    await expect(controller.create({} as never)).rejects.toThrow(GoneException);
    await expect(
      controller.update('550e8400-e29b-41d4-a716-446655440000', {} as never)
    ).rejects.toThrow(GoneException);
    await expect(controller.remove('550e8400-e29b-41d4-a716-446655440000')).rejects.toThrow(
      MethodNotAllowedException
    );
  });

  it('uses explicit systemRoleId path params on system role endpoints', () => {
    expect(Reflect.getMetadata(PATH_METADATA, SystemRoleController)).toBe('system-roles');
    expect(getControllerRoutes(SystemRoleController)).toEqual(
      expect.arrayContaining([
        {
          methodName: 'findOne',
          requestMethod: RequestMethod.GET,
          path: ':systemRoleId',
        },
        {
          methodName: 'update',
          requestMethod: RequestMethod.PATCH,
          path: ':systemRoleId',
        },
        {
          methodName: 'remove',
          requestMethod: RequestMethod.DELETE,
          path: ':systemRoleId',
        },
      ])
    );
  });
});
