import 'reflect-metadata';

import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { SettingsController } from './settings.controller';

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

const getControllerRoutes = (controller: typeof SettingsController): ControllerRoute[] => {
  const methodNames = Object.getOwnPropertyNames(controller.prototype).filter(
    (methodName) => methodName !== 'constructor' && typeof controller.prototype[methodName] === 'function',
  );

  return methodNames.flatMap((methodName) => {
    const handler = controller.prototype[methodName];
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

describe('SettingsController private route contract', () => {
  it('keeps settings mutations on PATCH and explicit owner param names', () => {
    const routes = getControllerRoutes(SettingsController);

    expect(routes).toEqual(
      expect.arrayContaining([
        {
          methodName: 'getTenantSettings',
          requestMethod: RequestMethod.GET,
          path: 'organization/settings',
        },
        {
          methodName: 'updateTenantSettings',
          requestMethod: RequestMethod.PATCH,
          path: 'organization/settings',
        },
        {
          methodName: 'getSubsidiarySettings',
          requestMethod: RequestMethod.GET,
          path: 'subsidiaries/:subsidiaryId/settings',
        },
        {
          methodName: 'updateSubsidiarySettings',
          requestMethod: RequestMethod.PATCH,
          path: 'subsidiaries/:subsidiaryId/settings',
        },
        {
          methodName: 'resetSubsidiarySetting',
          requestMethod: RequestMethod.PATCH,
          path: 'subsidiaries/:subsidiaryId/settings/reset',
        },
        {
          methodName: 'getTalentSettings',
          requestMethod: RequestMethod.GET,
          path: 'talents/:talentId/settings',
        },
        {
          methodName: 'updateTalentSettings',
          requestMethod: RequestMethod.PATCH,
          path: 'talents/:talentId/settings',
        },
        {
          methodName: 'resetTalentSetting',
          requestMethod: RequestMethod.PATCH,
          path: 'talents/:talentId/settings/reset',
        },
      ]),
    );
  });
});
