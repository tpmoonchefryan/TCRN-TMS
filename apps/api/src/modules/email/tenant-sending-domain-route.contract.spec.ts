import 'reflect-metadata';

import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator';
import { TenantSendingDomainController } from './controllers/tenant-sending-domain.controller';

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

const getMethodPermissions = (methodName: string) =>
  Reflect.getMetadata(PERMISSIONS_KEY, TenantSendingDomainController.prototype[methodName]) as
    | Array<{ resource: string; action: string }>
    | undefined;

describe('Tenant sending-domain route contract', () => {
  it('splits AC provisioning from ordinary tenant sender selection', () => {
    expect(Reflect.getMetadata(PATH_METADATA, TenantSendingDomainController)).toBe('email');
    expect(getControllerRoutes(TenantSendingDomainController)).toEqual(
      expect.arrayContaining([
        {
          methodName: 'getManagedTenantSendingDomains',
          requestMethod: RequestMethod.GET,
          path: 'tenants/:tenantId/sending-domains',
        },
        {
          methodName: 'saveManagedTenantSendingDomains',
          requestMethod: RequestMethod.PATCH,
          path: 'tenants/:tenantId/sending-domains',
        },
        {
          methodName: 'getTenantSenderDomains',
          requestMethod: RequestMethod.GET,
          path: 'sender-domains',
        },
        {
          methodName: 'saveTenantSenderDomains',
          requestMethod: RequestMethod.PATCH,
          path: 'sender-domains',
        },
      ]),
    );
  });

  it('keeps AC provisioning and ordinary tenant sender selection on explicit RBAC resources', () => {
    expect(getMethodPermissions('getManagedTenantSendingDomains')).toEqual([
      { resource: 'tenant.manage', action: 'read' },
    ]);
    expect(getMethodPermissions('saveManagedTenantSendingDomains')).toEqual([
      { resource: 'tenant.manage', action: 'update' },
    ]);
    expect(getMethodPermissions('getTenantSenderDomains')).toEqual([
      { resource: 'settings', action: 'read' },
    ]);
    expect(getMethodPermissions('saveTenantSenderDomains')).toEqual([
      { resource: 'settings', action: 'update' },
    ]);
  });
});
