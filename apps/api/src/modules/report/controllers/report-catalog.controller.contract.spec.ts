import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';

import { ReportCatalogController } from './report-catalog.controller';

const getRoutes = () => {
  const methodNames = Object.getOwnPropertyNames(ReportCatalogController.prototype).filter(
    (methodName) =>
      methodName !== 'constructor' &&
      typeof ReportCatalogController.prototype[methodName] === 'function'
  );

  return methodNames.flatMap((methodName) => {
    const handler = ReportCatalogController.prototype[methodName];
    const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler) as
      | RequestMethod
      | undefined;

    if (requestMethod === undefined) {
      return [];
    }

    const pathValue = Reflect.getMetadata(PATH_METADATA, handler) as string | string[] | undefined;
    const paths = Array.isArray(pathValue) ? pathValue : pathValue ? [pathValue] : [];

    return paths.map((path) => ({
      methodName,
      requestMethod,
      path,
    }));
  });
};

describe('ReportCatalogController route contract', () => {
  it('exposes catalog read routes without altering the existing MFR runtime family', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ReportCatalogController)).toBe('reports');
    expect(getRoutes()).toEqual(
      expect.arrayContaining([
        {
          methodName: 'listCatalog',
          requestMethod: RequestMethod.GET,
          path: 'catalog',
        },
        {
          methodName: 'getCatalogItem',
          requestMethod: RequestMethod.GET,
          path: 'catalog/:reportId',
        },
      ])
    );
  });
});
