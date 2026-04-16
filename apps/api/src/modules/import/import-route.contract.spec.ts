import 'reflect-metadata';

import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { ImportController } from './controllers/import.controller';

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

describe('ImportController private route contract', () => {
  it('keeps customer import routes under the canonical talent-root import family', () => {
    const controllerPath = Reflect.getMetadata(PATH_METADATA, ImportController);
    const routes = getControllerRoutes(ImportController);

    expect(controllerPath).toBe('talents/:talentId/imports/customers');
    expect(routes).toEqual(
      expect.arrayContaining([
        {
          methodName: 'downloadIndividualTemplate',
          requestMethod: RequestMethod.GET,
          path: 'individuals/template',
        },
        {
          methodName: 'downloadCompanyTemplate',
          requestMethod: RequestMethod.GET,
          path: 'companies/template',
        },
        { methodName: 'uploadIndividual', requestMethod: RequestMethod.POST, path: 'individuals' },
        { methodName: 'uploadCompany', requestMethod: RequestMethod.POST, path: 'companies' },
        { methodName: 'listJobs', requestMethod: RequestMethod.GET, path: '/' },
        { methodName: 'getJob', requestMethod: RequestMethod.GET, path: ':type/:jobId' },
        {
          methodName: 'getJobErrors',
          requestMethod: RequestMethod.GET,
          path: ':type/:jobId/errors',
        },
        { methodName: 'cancelJob', requestMethod: RequestMethod.DELETE, path: ':type/:jobId' },
      ]),
    );
  });

  it('does not keep the legacy flat import controller path', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ImportController)).not.toBe('imports/customers');
  });
});
