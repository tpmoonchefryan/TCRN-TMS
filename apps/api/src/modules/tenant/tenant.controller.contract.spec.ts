import 'reflect-metadata';

import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator';
import { DelegatedAdminController } from '../delegated-admin/delegated-admin.controller';
import { TenantController } from './tenant.controller';

interface ControllerRoute {
  methodName: string;
  requestMethod: RequestMethod;
  path: string;
}

const normalizePaths = (value: string | string[] | undefined): string[] => {
  if (value === undefined || !value) {
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

const getTenantPermissions = (methodName: string) =>
  Reflect.getMetadata(PERMISSIONS_KEY, TenantController.prototype[methodName]) as
    | Array<{ resource: string; action: string }>
    | undefined;

const getDelegatedAdminPermissions = (methodName: string) =>
  Reflect.getMetadata(PERMISSIONS_KEY, DelegatedAdminController.prototype[methodName]) as
    | Array<{ resource: string; action: string }>
    | undefined;

describe('Tenant and delegated-admin route contracts', () => {
  it('keeps tenant-root AC admin routes and permissions explicit', () => {
    expect(Reflect.getMetadata(PATH_METADATA, TenantController)).toBe('tenants');
    expect(getControllerRoutes(TenantController)).toEqual(
      expect.arrayContaining([
        { methodName: 'listTenants', requestMethod: RequestMethod.GET, path: '/' },
        { methodName: 'createTenant', requestMethod: RequestMethod.POST, path: '/' },
        { methodName: 'getTenant', requestMethod: RequestMethod.GET, path: ':tenantId' },
        { methodName: 'updateTenant', requestMethod: RequestMethod.PATCH, path: ':tenantId' },
        { methodName: 'activateTenant', requestMethod: RequestMethod.POST, path: ':tenantId/activate' },
        {
          methodName: 'deactivateTenant',
          requestMethod: RequestMethod.POST,
          path: ':tenantId/deactivate',
        },
      ]),
    );

    expect(getTenantPermissions('listTenants')).toEqual([
      { resource: 'tenant.manage', action: 'read' },
    ]);
    expect(getTenantPermissions('createTenant')).toEqual([
      { resource: 'tenant.manage', action: 'create' },
    ]);
    expect(getTenantPermissions('getTenant')).toEqual([
      { resource: 'tenant.manage', action: 'read' },
    ]);
    expect(getTenantPermissions('updateTenant')).toEqual([
      { resource: 'tenant.manage', action: 'update' },
    ]);
    expect(getTenantPermissions('activateTenant')).toEqual([
      { resource: 'tenant.manage', action: 'update' },
    ]);
    expect(getTenantPermissions('deactivateTenant')).toEqual([
      { resource: 'tenant.manage', action: 'update' },
    ]);
  });

  it('keeps delegated-admin routes on explicit tenant.manage permissions', () => {
    expect(Reflect.getMetadata(PATH_METADATA, DelegatedAdminController)).toBe('delegated-admins');
    expect(getControllerRoutes(DelegatedAdminController)).toEqual(
      expect.arrayContaining([
        { methodName: 'list', requestMethod: RequestMethod.GET, path: '/' },
        { methodName: 'create', requestMethod: RequestMethod.POST, path: '/' },
        { methodName: 'delete', requestMethod: RequestMethod.DELETE, path: ':id' },
        { methodName: 'getMyScopes', requestMethod: RequestMethod.GET, path: 'my-scopes' },
      ]),
    );

    expect(getDelegatedAdminPermissions('list')).toEqual([
      { resource: 'tenant.manage', action: 'read' },
    ]);
    expect(getDelegatedAdminPermissions('create')).toEqual([
      { resource: 'tenant.manage', action: 'create' },
    ]);
    expect(getDelegatedAdminPermissions('delete')).toEqual([
      { resource: 'tenant.manage', action: 'delete' },
    ]);
    expect(getDelegatedAdminPermissions('getMyScopes')).toEqual([
      { resource: 'tenant.manage', action: 'read' },
    ]);
  });
});
