import 'reflect-metadata';

import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

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
});
