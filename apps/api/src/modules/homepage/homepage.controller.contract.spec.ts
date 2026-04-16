import 'reflect-metadata';

import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { HomepageController } from './controllers/homepage.controller';

interface ControllerRoute {
  methodName: string;
  requestMethod: RequestMethod;
  path: string;
}

interface ControllerClassLike {
  prototype: Record<string, unknown>;
}

const API_RESPONSE_METADATA_KEY = 'swagger/apiResponse';
const API_PARAMETERS_METADATA_KEY = 'swagger/apiParameters';

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
  const controllerClass = controller as unknown as ControllerClassLike;
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

describe('HomepageController private route contract', () => {
  const homepageControllerClass = HomepageController as unknown as ControllerClassLike;

  it('uses PATCH for draft saves and keeps talent-root homepage routes canonical', () => {
    expect(Reflect.getMetadata(PATH_METADATA, HomepageController)).toBe('talents/:talentId/homepage');
    expect(getControllerRoutes(HomepageController)).toEqual(
      expect.arrayContaining([
        {
          methodName: 'getHomepage',
          requestMethod: RequestMethod.GET,
          path: '/',
        },
        {
          methodName: 'saveDraft',
          requestMethod: RequestMethod.PATCH,
          path: 'draft',
        },
        {
          methodName: 'publish',
          requestMethod: RequestMethod.POST,
          path: 'publish',
        },
      ]),
    );
  });

  it('documents response status coverage for homepage admin routes', () => {
    const getStatuses = (methodName: string) =>
      Object.keys(
        (Reflect.getMetadata(
          API_RESPONSE_METADATA_KEY,
          homepageControllerClass.prototype[methodName],
        ) as Record<string, unknown> | undefined) ?? {},
      ).sort();

    expect(getStatuses('getHomepage')).toEqual(['200', '401', '404']);
    expect(getStatuses('saveDraft')).toEqual(['200', '401', '404']);
    expect(getStatuses('publish')).toEqual(['200', '400', '401', '404']);
    expect(getStatuses('unpublish')).toEqual(['200', '401', '404']);
    expect(getStatuses('updateSettings')).toEqual(['200', '401', '404', '409']);
    expect(getStatuses('listVersions')).toEqual(['200', '401', '404']);
    expect(getStatuses('getVersion')).toEqual(['200', '401', '404']);
    expect(getStatuses('restoreVersion')).toEqual(['200', '401', '404']);
  });

  it('documents talentId and versionId path params on homepage admin routes', () => {
    const getPathParamNames = (methodName: string) =>
      (((Reflect.getMetadata(
        API_PARAMETERS_METADATA_KEY,
        homepageControllerClass.prototype[methodName],
      ) as Array<{ in?: string; name?: string }> | undefined) ?? [])
        .filter((parameter) => parameter.in === 'path' && typeof parameter.name === 'string')
        .map((parameter) => parameter.name as string)
        .sort());

    expect(getPathParamNames('getHomepage')).toEqual(['talentId']);
    expect(getPathParamNames('saveDraft')).toEqual(['talentId']);
    expect(getPathParamNames('publish')).toEqual(['talentId']);
    expect(getPathParamNames('unpublish')).toEqual(['talentId']);
    expect(getPathParamNames('updateSettings')).toEqual(['talentId']);
    expect(getPathParamNames('listVersions')).toEqual(['talentId']);
    expect(getPathParamNames('getVersion')).toEqual(['talentId', 'versionId']);
    expect(getPathParamNames('restoreVersion')).toEqual(['talentId', 'versionId']);
  });
});
