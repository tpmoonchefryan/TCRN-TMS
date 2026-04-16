import 'reflect-metadata';

import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { SystemUserController } from './system-user.controller';

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

describe('SystemUserController route contract', () => {
  it('uses explicit systemUserId param names across detail and command routes', () => {
    expect(Reflect.getMetadata(PATH_METADATA, SystemUserController)).toBe('system-users');
    expect(getControllerRoutes(SystemUserController)).toEqual(
      expect.arrayContaining([
        {
          methodName: 'getById',
          requestMethod: RequestMethod.GET,
          path: ':systemUserId',
        },
        {
          methodName: 'update',
          requestMethod: RequestMethod.PATCH,
          path: ':systemUserId',
        },
        {
          methodName: 'resetPassword',
          requestMethod: RequestMethod.POST,
          path: ':systemUserId/reset-password',
        },
        {
          methodName: 'deactivate',
          requestMethod: RequestMethod.POST,
          path: ':systemUserId/deactivate',
        },
        {
          methodName: 'reactivate',
          requestMethod: RequestMethod.POST,
          path: ':systemUserId/reactivate',
        },
        {
          methodName: 'forceTotp',
          requestMethod: RequestMethod.POST,
          path: ':systemUserId/force-totp',
        },
        {
          methodName: 'getScopeAccess',
          requestMethod: RequestMethod.GET,
          path: ':systemUserId/scope-access',
        },
        {
          methodName: 'setScopeAccess',
          requestMethod: RequestMethod.POST,
          path: ':systemUserId/scope-access',
        },
      ]),
    );
  });
});
