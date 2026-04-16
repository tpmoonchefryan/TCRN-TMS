import 'reflect-metadata';

import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { SubsidiaryController } from '../subsidiary/subsidiary.controller';
import { TalentController } from '../talent/talent.controller';
import { TenantController } from '../tenant/tenant.controller';

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

describe('Organization resource route contract', () => {
  it('uses explicit tenant and subsidiary resource param names', () => {
    expect(Reflect.getMetadata(PATH_METADATA, TenantController)).toBe('tenants');
    expect(Reflect.getMetadata(PATH_METADATA, SubsidiaryController)).toBe('subsidiaries');

    expect(getControllerRoutes(TenantController)).toEqual(
      expect.arrayContaining([
        {
          methodName: 'getTenant',
          requestMethod: RequestMethod.GET,
          path: ':tenantId',
        },
        {
          methodName: 'updateTenant',
          requestMethod: RequestMethod.PATCH,
          path: ':tenantId',
        },
        {
          methodName: 'activateTenant',
          requestMethod: RequestMethod.POST,
          path: ':tenantId/activate',
        },
        {
          methodName: 'deactivateTenant',
          requestMethod: RequestMethod.POST,
          path: ':tenantId/deactivate',
        },
      ]),
    );

    expect(getControllerRoutes(SubsidiaryController)).toEqual(
      expect.arrayContaining([
        {
          methodName: 'getById',
          requestMethod: RequestMethod.GET,
          path: ':subsidiaryId',
        },
        {
          methodName: 'update',
          requestMethod: RequestMethod.PATCH,
          path: ':subsidiaryId',
        },
        {
          methodName: 'move',
          requestMethod: RequestMethod.POST,
          path: ':subsidiaryId/move',
        },
        {
          methodName: 'deactivate',
          requestMethod: RequestMethod.POST,
          path: ':subsidiaryId/deactivate',
        },
        {
          methodName: 'reactivate',
          requestMethod: RequestMethod.POST,
          path: ':subsidiaryId/reactivate',
        },
      ]),
    );
  });

  it('keeps explicit talent resource param naming across talent lifecycle and domain routes', () => {
    expect(Reflect.getMetadata(PATH_METADATA, TalentController)).toBe('talents');

    const talentRoutes = getControllerRoutes(TalentController);

    expect(
      talentRoutes.some(
        (route) => route.path.includes(':id') && route.requestMethod !== undefined,
      ),
    ).toBe(false);
    expect(
      talentRoutes.some((route) => route.path === ':talentId/publish'),
    ).toBe(true);
    expect(
      talentRoutes.some((route) => route.path === ':talentId/custom-domain'),
    ).toBe(true);
  });
});
