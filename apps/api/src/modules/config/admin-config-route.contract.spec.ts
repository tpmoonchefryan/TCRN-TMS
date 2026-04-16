import 'reflect-metadata';

import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { DictionaryController } from '../dictionary/dictionary.controller';
import { EmailConfigController } from '../email/controllers/email-config.controller';
import { GlobalConfigController } from './global-config.controller';

interface ControllerRoute {
  methodName: string;
  requestMethod: RequestMethod;
  path: string;
}

const normalizePaths = (value: string | string[] | undefined): string[] => {
  if (value === undefined) {
    return [''];
  }

  if (!value) {
    return [''];
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

describe('Admin config route contracts', () => {
  it('uses PATCH for global platform config and email config writes', () => {
    expect(Reflect.getMetadata(PATH_METADATA, GlobalConfigController)).toBe('platform/config');
    expect(Reflect.getMetadata(PATH_METADATA, EmailConfigController)).toBe('email/config');

    expect(getControllerRoutes(GlobalConfigController)).toEqual(
      expect.arrayContaining([
        {
          methodName: 'set',
          requestMethod: RequestMethod.PATCH,
          path: ':key',
        },
      ]),
    );

    expect(getControllerRoutes(EmailConfigController)).toEqual(
      expect.arrayContaining([
        {
          methodName: 'saveConfig',
          requestMethod: RequestMethod.PATCH,
          path: '/',
        },
      ]),
    );
  });

  it('uses PATCH for dictionary updates and explicit item param names', () => {
    expect(Reflect.getMetadata(PATH_METADATA, DictionaryController)).toBe('system-dictionary');
    expect(getControllerRoutes(DictionaryController)).toEqual(
      expect.arrayContaining([
        {
          methodName: 'updateType',
          requestMethod: RequestMethod.PATCH,
          path: ':type',
        },
        {
          methodName: 'updateItem',
          requestMethod: RequestMethod.PATCH,
          path: ':type/items/:itemId',
        },
        {
          methodName: 'deactivateItem',
          requestMethod: RequestMethod.DELETE,
          path: ':type/items/:itemId',
        },
        {
          methodName: 'reactivateItem',
          requestMethod: RequestMethod.POST,
          path: ':type/items/:itemId/reactivate',
        },
      ]),
    );
  });
});
