import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';

import { DictionaryController } from './dictionary.controller';

interface ControllerRoute {
  methodName: string;
  path: string;
  requestMethod: RequestMethod;
}

const normalizePaths = (value: string | string[] | undefined): string[] => {
  if (value === undefined || value === '') {
    return [''];
  }

  return Array.isArray(value) ? value : [value];
};

const getControllerRoutes = (controller: typeof DictionaryController): ControllerRoute[] => {
  const methodNames = Object.getOwnPropertyNames(controller.prototype).filter(
    (methodName) =>
      methodName !== 'constructor' && typeof controller.prototype[methodName] === 'function'
  );

  return methodNames.flatMap((methodName) => {
    const handler = controller.prototype[methodName];
    const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler) as
      | RequestMethod
      | undefined;

    if (requestMethod === undefined) {
      return [];
    }

    return normalizePaths(Reflect.getMetadata(PATH_METADATA, handler)).map((path) => ({
      methodName,
      path,
      requestMethod,
    }));
  });
};

describe('DictionaryController route contract', () => {
  it('keeps System Dictionary read and AC-only write routes under /system-dictionary', () => {
    expect(Reflect.getMetadata(PATH_METADATA, DictionaryController)).toBe('system-dictionary');
    expect(getControllerRoutes(DictionaryController)).toEqual(
      expect.arrayContaining([
        { methodName: 'listTypes', requestMethod: RequestMethod.GET, path: '/' },
        { methodName: 'getByType', requestMethod: RequestMethod.GET, path: ':type' },
        { methodName: 'getItem', requestMethod: RequestMethod.GET, path: ':type/:code' },
        { methodName: 'createType', requestMethod: RequestMethod.POST, path: '/' },
        { methodName: 'updateType', requestMethod: RequestMethod.PATCH, path: ':type' },
        { methodName: 'createItem', requestMethod: RequestMethod.POST, path: ':type/items' },
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
      ])
    );
  });

  it('registers item routes after type routes so dictionary type reads stay unambiguous', () => {
    const routes = getControllerRoutes(DictionaryController).filter(
      (route) => route.requestMethod === RequestMethod.GET
    );
    const routeIndex = (path: string) => routes.findIndex((route) => route.path === path);

    expect(routeIndex('/')).toBeLessThan(routeIndex(':type'));
    expect(routeIndex(':type')).toBeLessThan(routeIndex(':type/:code'));
  });
});
