import 'reflect-metadata';

import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { CustomerController } from './controllers/customer.controller';
import { ExternalIdController } from './controllers/external-id.controller';
import { MembershipController } from './controllers/membership.controller';
import { PlatformIdentityController } from './controllers/platform-identity.controller';

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
    (methodName) =>
      methodName !== 'constructor' && typeof controllerClass.prototype[methodName] === 'function',
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

describe('Customer private route contract', () => {
  it('keeps customer profile routes under the canonical talent-root customer family', () => {
    const controllerPath = Reflect.getMetadata(PATH_METADATA, CustomerController);
    const routes = getControllerRoutes(CustomerController);

    expect(controllerPath).toBe('talents/:talentId/customers');
    expect(routes).toEqual(
      expect.arrayContaining([
        { methodName: 'list', requestMethod: RequestMethod.GET, path: '/' },
        { methodName: 'getById', requestMethod: RequestMethod.GET, path: ':customerId' },
        { methodName: 'createIndividual', requestMethod: RequestMethod.POST, path: 'individuals' },
        {
          methodName: 'updateIndividual',
          requestMethod: RequestMethod.PATCH,
          path: 'individuals/:customerId',
        },
        {
          methodName: 'createPiiPortalSession',
          requestMethod: RequestMethod.POST,
          path: 'individuals/:customerId/pii-portal-session',
        },
        {
          methodName: 'createCompanyPiiPortalSession',
          requestMethod: RequestMethod.POST,
          path: 'companies/:customerId/pii-portal-session',
        },
        {
          methodName: 'updateIndividualPii',
          requestMethod: RequestMethod.PATCH,
          path: 'individuals/:customerId/pii',
        },
        { methodName: 'createCompany', requestMethod: RequestMethod.POST, path: 'companies' },
        {
          methodName: 'updateCompany',
          requestMethod: RequestMethod.PATCH,
          path: 'companies/:customerId',
        },
        {
          methodName: 'deactivate',
          requestMethod: RequestMethod.POST,
          path: ':customerId/deactivate',
        },
        {
          methodName: 'reactivate',
          requestMethod: RequestMethod.POST,
          path: ':customerId/reactivate',
        },
        { methodName: 'batchOperation', requestMethod: RequestMethod.POST, path: 'batch' },
      ]),
    );
  });

  it('keeps nested customer subresources under talent-root customer paths', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PlatformIdentityController)).toBe(
      'talents/:talentId/customers/:customerId/platform-identities',
    );
    expect(Reflect.getMetadata(PATH_METADATA, MembershipController)).toBe(
      'talents/:talentId/customers/:customerId/memberships',
    );
    expect(Reflect.getMetadata(PATH_METADATA, ExternalIdController)).toBe(
      'talents/:talentId/customers/:customerId/external-ids',
    );
  });

  it('does not keep flat customer-root controller paths for migrated customer endpoints', () => {
    expect(Reflect.getMetadata(PATH_METADATA, CustomerController)).not.toBe('customers');
    expect(Reflect.getMetadata(PATH_METADATA, PlatformIdentityController)).not.toBe(
      'customers/:customerId/platform-identities',
    );
    expect(Reflect.getMetadata(PATH_METADATA, MembershipController)).not.toBe(
      'customers/:customerId/memberships',
    );
    expect(Reflect.getMetadata(PATH_METADATA, ExternalIdController)).not.toBe(
      'customers/:customerId/external-ids',
    );
  });
});
