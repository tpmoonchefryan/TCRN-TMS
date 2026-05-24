import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';

import { PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator';
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
    (methodName) =>
      methodName !== 'constructor' && typeof controller.prototype[methodName] === 'function'
  );

  return methodNames.flatMap((methodName) => {
    const handler = controller.prototype[methodName];
    const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler) as
      | RequestMethod
      | undefined;

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
  Reflect.getMetadata(PERMISSIONS_KEY, SettingsController.prototype[methodName]) as
    | Array<{ resource: string; action: string }>
    | undefined;

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
          methodName: 'getTenantArtistLifecycleFlow',
          requestMethod: RequestMethod.GET,
          path: 'organization/settings/artist-lifecycle-flow',
        },
        {
          methodName: 'updateTenantArtistLifecycleFlow',
          requestMethod: RequestMethod.PATCH,
          path: 'organization/settings/artist-lifecycle-flow',
        },
        {
          methodName: 'getTenantTurnstileSettings',
          requestMethod: RequestMethod.GET,
          path: 'organization/settings/turnstile',
        },
        {
          methodName: 'updateTenantTurnstileSettings',
          requestMethod: RequestMethod.PATCH,
          path: 'organization/settings/turnstile',
        },
        {
          methodName: 'getSubsidiarySettings',
          requestMethod: RequestMethod.GET,
          path: 'subsidiaries/:subsidiaryId/settings',
        },
        {
          methodName: 'getSubsidiaryArtistLifecycleFlow',
          requestMethod: RequestMethod.GET,
          path: 'subsidiaries/:subsidiaryId/settings/artist-lifecycle-flow',
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
          methodName: 'getTalentArtistLifecycleFlow',
          requestMethod: RequestMethod.GET,
          path: 'talents/:talentId/settings/artist-lifecycle-flow',
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
      ])
    );
  });

  it('declares explicit RBAC metadata for settings and sensitive tenant config routes', () => {
    expect(getMethodPermissions('getTenantSettings')).toEqual([
      { resource: 'settings', action: 'read' },
    ]);
    expect(getMethodPermissions('updateTenantSettings')).toEqual([
      { resource: 'settings', action: 'update' },
    ]);
    expect(getMethodPermissions('getTenantArtistLifecycleFlow')).toEqual([
      { resource: 'settings', action: 'read' },
    ]);
    expect(getMethodPermissions('updateTenantArtistLifecycleFlow')).toEqual([
      { resource: 'settings', action: 'update' },
    ]);
    expect(getMethodPermissions('getTenantTurnstileSettings')).toEqual([
      { resource: 'config.platform_settings', action: 'read' },
    ]);
    expect(getMethodPermissions('updateTenantTurnstileSettings')).toEqual([
      { resource: 'config.platform_settings', action: 'update' },
    ]);
    expect(getMethodPermissions('getSubsidiarySettings')).toEqual([
      { resource: 'settings', action: 'read' },
    ]);
    expect(getMethodPermissions('getSubsidiaryArtistLifecycleFlow')).toEqual([
      { resource: 'settings', action: 'read' },
    ]);
    expect(getMethodPermissions('updateSubsidiarySettings')).toEqual([
      { resource: 'settings', action: 'update' },
    ]);
    expect(getMethodPermissions('resetSubsidiarySetting')).toEqual([
      { resource: 'settings', action: 'update' },
    ]);
    expect(getMethodPermissions('getTalentSettings')).toEqual([
      { resource: 'settings', action: 'read' },
    ]);
    expect(getMethodPermissions('getTalentArtistLifecycleFlow')).toEqual([
      { resource: 'settings', action: 'read' },
    ]);
    expect(getMethodPermissions('updateTalentSettings')).toEqual([
      { resource: 'settings', action: 'update' },
    ]);
    expect(getMethodPermissions('resetTalentSetting')).toEqual([
      { resource: 'settings', action: 'update' },
    ]);
  });
});
