import 'reflect-metadata';

import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { TalentController } from './talent.controller';

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

const getControllerRoutes = (controller: typeof TalentController): ControllerRoute[] => {
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

describe('TalentController lifecycle route contract', () => {
  it('keeps the canonical talent lifecycle routes on publish/disable/re-enable', () => {
    const controllerPath = Reflect.getMetadata(PATH_METADATA, TalentController);
    const routes = getControllerRoutes(TalentController);

    expect(controllerPath).toBe('talents');
    expect(routes).toEqual(
      expect.arrayContaining([
        {
          methodName: 'getPublishReadiness',
          requestMethod: RequestMethod.GET,
          path: ':talentId/publish-readiness',
        },
        {
          methodName: 'publish',
          requestMethod: RequestMethod.POST,
          path: ':talentId/publish',
        },
        {
          methodName: 'disable',
          requestMethod: RequestMethod.POST,
          path: ':talentId/disable',
        },
        {
          methodName: 'reEnable',
          requestMethod: RequestMethod.POST,
          path: ':talentId/re-enable',
        },
        {
          methodName: 'getById',
          requestMethod: RequestMethod.GET,
          path: ':talentId',
        },
        {
          methodName: 'update',
          requestMethod: RequestMethod.PATCH,
          path: ':talentId',
        },
        {
          methodName: 'deleteTalent',
          requestMethod: RequestMethod.DELETE,
          path: ':talentId',
        },
        {
          methodName: 'move',
          requestMethod: RequestMethod.POST,
          path: ':talentId/move',
        },
        {
          methodName: 'getCustomDomainConfig',
          requestMethod: RequestMethod.GET,
          path: ':talentId/custom-domain',
        },
        {
          methodName: 'setCustomDomain',
          requestMethod: RequestMethod.POST,
          path: ':talentId/custom-domain',
        },
        {
          methodName: 'verifyCustomDomain',
          requestMethod: RequestMethod.POST,
          path: ':talentId/custom-domain/verify',
        },
        {
          methodName: 'updateServicePaths',
          requestMethod: RequestMethod.PATCH,
          path: ':talentId/custom-domain/paths',
        },
        {
          methodName: 'updateSslMode',
          requestMethod: RequestMethod.PATCH,
          path: ':talentId/custom-domain/ssl-mode',
        },
      ]),
    );
  });

  it('does not reintroduce legacy talent deactivate/reactivate routes or method aliases', () => {
    const routes = getControllerRoutes(TalentController);
    const lifecyclePaths = routes.map((route) => route.path);
    const methodNames = Object.getOwnPropertyNames(TalentController.prototype);

    expect(lifecyclePaths).not.toContain(':id/deactivate');
    expect(lifecyclePaths).not.toContain(':id/reactivate');
    expect(lifecyclePaths).not.toContain(':id/publish');
    expect(lifecyclePaths).not.toContain(':id/re-enable');
    expect(lifecyclePaths).not.toContain(':talentId/delete');
    expect(methodNames).not.toContain('deactivate');
    expect(methodNames).not.toContain('reactivate');
  });
});
