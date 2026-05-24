import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';

import { PERMISSIONS_KEY } from '../../common/decorators';
import { PublicPresenceAssetController } from './controllers/public-presence-asset.controller';

interface ControllerRoute {
  methodName: string;
  path: string;
  requestMethod: RequestMethod;
}

interface ControllerClassLike {
  prototype: Record<string, unknown>;
}

const normalizePaths = (value: string | string[] | undefined): string[] => {
  if (value === undefined || value === '') {
    return [''];
  }

  return Array.isArray(value) ? value : [value];
};

const getControllerRoutes = (controller: object): ControllerRoute[] => {
  const controllerClass = controller as unknown as ControllerClassLike;
  const methodNames = Object.getOwnPropertyNames(controllerClass.prototype).filter(
    (methodName) =>
      methodName !== 'constructor' && typeof controllerClass.prototype[methodName] === 'function'
  );

  return methodNames.flatMap((methodName) => {
    const handler = controllerClass.prototype[methodName];
    const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler) as
      | RequestMethod
      | undefined;

    if (requestMethod === undefined) {
      return [];
    }

    return normalizePaths(Reflect.getMetadata(PATH_METADATA, handler)).map((path) => ({
      methodName,
      path,
      requestMethod,
    }));
  });
};

describe('PublicPresenceAssetController route contract', () => {
  const controllerClass = PublicPresenceAssetController as unknown as ControllerClassLike;

  it('keeps asset-scoped CRUD under /public-presence/assets', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PublicPresenceAssetController)).toBe(
      'public-presence/assets'
    );
    expect(getControllerRoutes(PublicPresenceAssetController)).toEqual(
      expect.arrayContaining([
        { methodName: 'listAssets', requestMethod: RequestMethod.GET, path: '/' },
        { methodName: 'getAssetDetail', requestMethod: RequestMethod.GET, path: ':assetId' },
        {
          methodName: 'listAssetRevisions',
          requestMethod: RequestMethod.GET,
          path: ':assetId/revisions',
        },
        { methodName: 'createAsset', requestMethod: RequestMethod.POST, path: '/' },
        {
          methodName: 'saveAssetDraft',
          requestMethod: RequestMethod.PUT,
          path: ':assetId/current',
        },
        {
          methodName: 'validateAsset',
          requestMethod: RequestMethod.POST,
          path: ':assetId/current/validate',
        },
        {
          methodName: 'duplicateAsset',
          requestMethod: RequestMethod.POST,
          path: ':assetId/duplicate',
        },
      ])
    );
  });

  it('protects validation writes separately from document writes', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controllerClass.prototype.listAssets)).toEqual([
      { resource: 'public_presence.document', action: 'read' },
    ]);

    expect(Reflect.getMetadata(PERMISSIONS_KEY, controllerClass.prototype.createAsset)).toEqual([
      { resource: 'public_presence.document', action: 'write' },
    ]);

    expect(Reflect.getMetadata(PERMISSIONS_KEY, controllerClass.prototype.validateAsset)).toEqual([
      { resource: 'public_presence.validation', action: 'write' },
    ]);
  });
});
