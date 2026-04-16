import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import {
  GlobalConfigController,
  SetConfigDto,
} from '../modules/config/global-config.controller';
import {
  EmailConfigController,
} from '../modules/email/controllers/email-config.controller';
import {
  SaveEmailConfigDto,
  SmtpConfigDto,
  TencentSesConfigDto,
  TestEmailDto,
} from '../modules/email/dto/email-config.dto';
import {
  ResetFieldDto,
  SettingsController,
  UpdateSettingsDto,
} from '../modules/settings/settings.controller';

const API_RESPONSE_METADATA_KEY = 'swagger/apiResponse';
const API_PARAMETERS_METADATA_KEY = 'swagger/apiParameters';
const API_MODEL_PROPERTIES_ARRAY_METADATA_KEY = 'swagger/apiModelPropertiesArray';

type ControllerClass = { prototype: object };

const getResponseStatuses = (
  controllerClass: ControllerClass,
  methodName: string,
): string[] => {
  const prototype = controllerClass.prototype as Record<string, unknown>;
  const metadata = Reflect.getMetadata(
    API_RESPONSE_METADATA_KEY,
    prototype[methodName],
  ) as Record<string, unknown> | undefined;

  return Object.keys(metadata ?? {}).sort();
};

const getPathParamNames = (
  controllerClass: ControllerClass,
  methodName: string,
): string[] => {
  const prototype = controllerClass.prototype as Record<string, unknown>;
  const metadata = Reflect.getMetadata(
    API_PARAMETERS_METADATA_KEY,
    prototype[methodName],
  ) as Array<{ in?: string; name?: string }> | undefined;

  return (metadata ?? [])
    .filter((parameter) => parameter.in === 'path' && typeof parameter.name === 'string')
    .map((parameter) => parameter.name as string)
    .sort();
};

const getDocumentedDtoProperties = (dtoClass: { prototype: object }): string[] => {
  const metadata = Reflect.getMetadata(
    API_MODEL_PROPERTIES_ARRAY_METADATA_KEY,
    dtoClass.prototype,
  ) as string[] | undefined;

  return (metadata ?? []).map((property) => property.replace(/^:/, '')).sort();
};

describe('Swagger tenant-root config family contract', () => {
  it('documents response status coverage for settings routes', () => {
    expect(getResponseStatuses(SettingsController, 'getTenantSettings')).toEqual(['200', '401']);
    expect(getResponseStatuses(SettingsController, 'updateTenantSettings')).toEqual([
      '200',
      '400',
      '401',
    ]);
    expect(getResponseStatuses(SettingsController, 'getSubsidiarySettings')).toEqual([
      '200',
      '401',
      '404',
    ]);
    expect(getResponseStatuses(SettingsController, 'updateSubsidiarySettings')).toEqual([
      '200',
      '400',
      '401',
      '404',
    ]);
    expect(getResponseStatuses(SettingsController, 'resetSubsidiarySetting')).toEqual([
      '200',
      '400',
      '401',
      '404',
    ]);
    expect(getResponseStatuses(SettingsController, 'getTalentSettings')).toEqual([
      '200',
      '401',
      '404',
    ]);
    expect(getResponseStatuses(SettingsController, 'updateTalentSettings')).toEqual([
      '200',
      '400',
      '401',
      '404',
    ]);
    expect(getResponseStatuses(SettingsController, 'resetTalentSetting')).toEqual([
      '200',
      '400',
      '401',
      '404',
    ]);
  });

  it('documents path params for settings scope routes', () => {
    expect(getPathParamNames(SettingsController, 'getSubsidiarySettings')).toEqual(['subsidiaryId']);
    expect(getPathParamNames(SettingsController, 'updateSubsidiarySettings')).toEqual([
      'subsidiaryId',
    ]);
    expect(getPathParamNames(SettingsController, 'resetSubsidiarySetting')).toEqual([
      'subsidiaryId',
    ]);
    expect(getPathParamNames(SettingsController, 'getTalentSettings')).toEqual(['talentId']);
    expect(getPathParamNames(SettingsController, 'updateTalentSettings')).toEqual(['talentId']);
    expect(getPathParamNames(SettingsController, 'resetTalentSetting')).toEqual(['talentId']);
  });

  it('documents response status coverage for global platform config routes', () => {
    expect(getResponseStatuses(GlobalConfigController, 'get')).toEqual([
      '200',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(GlobalConfigController, 'set')).toEqual([
      '200',
      '400',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(GlobalConfigController, 'list')).toEqual(['200', '401', '403']);
    expect(getPathParamNames(GlobalConfigController, 'get')).toEqual(['key']);
    expect(getPathParamNames(GlobalConfigController, 'set')).toEqual(['key']);
  });

  it('documents response status coverage for email config routes', () => {
    expect(getResponseStatuses(EmailConfigController, 'getConfig')).toEqual(['200', '401', '403']);
    expect(getResponseStatuses(EmailConfigController, 'saveConfig')).toEqual([
      '200',
      '400',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(EmailConfigController, 'sendTestEmail')).toEqual([
      '200',
      '400',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(EmailConfigController, 'testConnection')).toEqual([
      '200',
      '400',
      '401',
      '403',
    ]);
  });

  it('documents request-body DTO properties for the tenant-root config family', () => {
    expect(getDocumentedDtoProperties(UpdateSettingsDto)).toEqual(['settings', 'version']);
    expect(getDocumentedDtoProperties(ResetFieldDto)).toEqual(['field']);
    expect(getDocumentedDtoProperties(SetConfigDto)).toEqual(['value']);
    expect(getDocumentedDtoProperties(SaveEmailConfigDto)).toEqual([
      'provider',
      'smtp',
      'tencentSes',
    ]);
    expect(getDocumentedDtoProperties(TestEmailDto)).toEqual(['testEmail']);
    expect(getDocumentedDtoProperties(TencentSesConfigDto)).toEqual([
      'fromAddress',
      'fromName',
      'region',
      'replyTo',
      'secretId',
      'secretKey',
    ]);
    expect(getDocumentedDtoProperties(SmtpConfigDto)).toEqual([
      'fromAddress',
      'fromName',
      'host',
      'password',
      'port',
      'secure',
      'username',
    ]);
  });
});
