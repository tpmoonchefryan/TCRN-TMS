import 'reflect-metadata';

import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { ConfigController } from './config.controller';

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

const getControllerRoutes = (controller: typeof ConfigController): ControllerRoute[] => {
  const methodNames = Object.getOwnPropertyNames(controller.prototype).filter(
    (methodName) => methodName !== 'constructor' && typeof controller.prototype[methodName] === 'function',
  );

  return methodNames.flatMap((methodName) => {
    const handler = controller.prototype[methodName];
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

describe('ConfigController configuration-entity route contract', () => {
  it('keeps config entity management on list/create/get/update/deactivate/reactivate without hard-delete mutation routes', () => {
    const controllerPath = Reflect.getMetadata(PATH_METADATA, ConfigController);
    const routes = getControllerRoutes(ConfigController);

    expect(controllerPath).toBe('configuration-entity');
    expect(routes).toEqual(
      expect.arrayContaining([
        {
          methodName: 'list',
          requestMethod: RequestMethod.GET,
          path: ':entityType',
        },
        {
          methodName: 'create',
          requestMethod: RequestMethod.POST,
          path: ':entityType',
        },
        {
          methodName: 'getById',
          requestMethod: RequestMethod.GET,
          path: ':entityType/:id',
        },
        {
          methodName: 'update',
          requestMethod: RequestMethod.PATCH,
          path: ':entityType/:id',
        },
        {
          methodName: 'deactivate',
          requestMethod: RequestMethod.POST,
          path: ':entityType/:id/deactivate',
        },
        {
          methodName: 'reactivate',
          requestMethod: RequestMethod.POST,
          path: ':entityType/:id/reactivate',
        },
      ]),
    );
  });

  it('uses explicit consumer resource param names for consumer key lifecycle commands', () => {
    const routes = getControllerRoutes(ConfigController);

    expect(routes).toEqual(
      expect.arrayContaining([
        {
          methodName: 'generateConsumerKey',
          requestMethod: RequestMethod.POST,
          path: 'consumer/:consumerId/generate-key',
        },
        {
          methodName: 'rotateConsumerKey',
          requestMethod: RequestMethod.POST,
          path: 'consumer/:consumerId/rotate-key',
        },
        {
          methodName: 'revokeConsumerKey',
          requestMethod: RequestMethod.POST,
          path: 'consumer/:consumerId/revoke-key',
        },
      ]),
    );
  });

  it('does not expose a DELETE /:entityType/:id hard-delete route for configuration entities', () => {
    const routes = getControllerRoutes(ConfigController);
    const methodNames = Object.getOwnPropertyNames(ConfigController.prototype);

    expect(
      routes.some(
        (route) => route.requestMethod === RequestMethod.DELETE && route.path === ':entityType/:id',
      ),
    ).toBe(false);
    expect(methodNames).not.toContain('delete');
    expect(methodNames).not.toContain('remove');
  });
});
