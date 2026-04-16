import 'reflect-metadata';

import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { SystemRoleController } from '../system-role/system-role.controller';
import { RoleController } from './role.controller';

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
    (methodName) => methodName !== 'constructor' && typeof controllerClass.prototype[methodName] === 'function',
  );

  return methodNames.flatMap((methodName) => {
    const handler = controllerClass.prototype[methodName];
    const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;

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
      ]),
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
      ]),
    );
  });
});
