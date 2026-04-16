import 'reflect-metadata';

import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import {
  IntegrationController,
  SubsidiaryIntegrationAdapterController,
  TalentIntegrationAdapterController,
} from './controllers';

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

describe('Integration private route contract', () => {
  it('keeps webhooks and tenant-owned adapters under the tenant-root integration family', () => {
    expect(Reflect.getMetadata(PATH_METADATA, IntegrationController)).toBe('integration');
    expect(getControllerRoutes(IntegrationController)).toEqual(
      expect.arrayContaining([
        { methodName: 'listTenantAdapters', requestMethod: RequestMethod.GET, path: 'adapters' },
        { methodName: 'createTenantAdapter', requestMethod: RequestMethod.POST, path: 'adapters' },
        {
          methodName: 'resolveTenantEffectiveAdapter',
          requestMethod: RequestMethod.GET,
          path: 'adapters/effective/:platformCode',
        },
        {
          methodName: 'updateAdapterConfigs',
          requestMethod: RequestMethod.PATCH,
          path: 'adapters/:adapterId/configs',
        },
        { methodName: 'listWebhooks', requestMethod: RequestMethod.GET, path: 'webhooks' },
        { methodName: 'createWebhook', requestMethod: RequestMethod.POST, path: 'webhooks' },
        {
          methodName: 'getWebhook',
          requestMethod: RequestMethod.GET,
          path: 'webhooks/:webhookId',
        },
        {
          methodName: 'updateWebhook',
          requestMethod: RequestMethod.PATCH,
          path: 'webhooks/:webhookId',
        },
        {
          methodName: 'deleteWebhook',
          requestMethod: RequestMethod.DELETE,
          path: 'webhooks/:webhookId',
        },
        {
          methodName: 'deactivateWebhook',
          requestMethod: RequestMethod.POST,
          path: 'webhooks/:webhookId/deactivate',
        },
        {
          methodName: 'reactivateWebhook',
          requestMethod: RequestMethod.POST,
          path: 'webhooks/:webhookId/reactivate',
        },
        {
          methodName: 'regenerateConsumerKey',
          requestMethod: RequestMethod.POST,
          path: 'consumers/:consumerId/regenerate-key',
        },
      ]),
    );
  });

  it('moves owner-target adapter collection commands to explicit subsidiary and talent roots', () => {
    expect(Reflect.getMetadata(PATH_METADATA, SubsidiaryIntegrationAdapterController)).toBe(
      'subsidiaries/:subsidiaryId/integration/adapters',
    );
    expect(Reflect.getMetadata(PATH_METADATA, TalentIntegrationAdapterController)).toBe(
      'talents/:talentId/integration/adapters',
    );

    expect(getControllerRoutes(SubsidiaryIntegrationAdapterController)).toEqual(
      expect.arrayContaining([
        { methodName: 'listSubsidiaryAdapters', requestMethod: RequestMethod.GET, path: '/' },
        { methodName: 'createSubsidiaryAdapter', requestMethod: RequestMethod.POST, path: '/' },
        {
          methodName: 'resolveSubsidiaryEffectiveAdapter',
          requestMethod: RequestMethod.GET,
          path: 'effective/:platformCode',
        },
        {
          methodName: 'disableSubsidiaryInheritedAdapter',
          requestMethod: RequestMethod.POST,
          path: ':adapterId/disable',
        },
        {
          methodName: 'enableSubsidiaryInheritedAdapter',
          requestMethod: RequestMethod.POST,
          path: ':adapterId/enable',
        },
      ]),
    );

    expect(getControllerRoutes(TalentIntegrationAdapterController)).toEqual(
      expect.arrayContaining([
        { methodName: 'listTalentAdapters', requestMethod: RequestMethod.GET, path: '/' },
        { methodName: 'createTalentAdapter', requestMethod: RequestMethod.POST, path: '/' },
        {
          methodName: 'resolveTalentEffectiveAdapter',
          requestMethod: RequestMethod.GET,
          path: 'effective/:platformCode',
        },
        {
          methodName: 'disableTalentInheritedAdapter',
          requestMethod: RequestMethod.POST,
          path: ':adapterId/disable',
        },
        {
          methodName: 'enableTalentInheritedAdapter',
          requestMethod: RequestMethod.POST,
          path: ':adapterId/enable',
        },
      ]),
    );
  });
});
