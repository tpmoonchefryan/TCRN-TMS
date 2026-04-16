import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import {
  CreateDictionaryItemDto,
  CreateDictionaryTypeDto,
  DeactivateItemDto,
  DictionaryController,
  UpdateDictionaryItemDto,
  UpdateDictionaryTypeDto,
} from '../modules/dictionary/dictionary.controller';
import { OrganizationController } from '../modules/organization/organization.controller';
import {
  CreateSubsidiaryDto,
  DeactivateSubsidiaryDto,
  MoveSubsidiaryDto,
  ReactivateSubsidiaryDto,
  SubsidiaryController,
  UpdateSubsidiaryDto,
} from '../modules/subsidiary/subsidiary.controller';
import {
  CreateTalentDto,
  MoveTalentDto,
  SetCustomDomainDto,
  TalentController,
  TalentLifecycleMutationDto,
  UpdateCustomDomainPathsDto,
  UpdateCustomDomainSslModeDto,
  UpdateTalentDto,
} from '../modules/talent/talent.controller';
import {
  CreateTenantDto,
  DeactivateTenantDto,
  TenantController,
  UpdateTenantDto,
} from '../modules/tenant/tenant.controller';

const API_RESPONSE_METADATA_KEY = 'swagger/apiResponse';
const API_PARAMETERS_METADATA_KEY = 'swagger/apiParameters';
const API_MODEL_PROPERTIES_ARRAY_METADATA_KEY = 'swagger/apiModelPropertiesArray';

type ControllerClass = { prototype: object };

const getResponseStatuses = (controllerClass: ControllerClass, methodName: string): string[] => {
  const prototype = controllerClass.prototype as Record<string, unknown>;
  const metadata = Reflect.getMetadata(
    API_RESPONSE_METADATA_KEY,
    prototype[methodName],
  ) as Record<string, unknown> | undefined;

  return Object.keys(metadata ?? {}).sort();
};

const getPathParamNames = (controllerClass: ControllerClass, methodName: string): string[] => {
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

describe('Swagger organization resource family contract', () => {
  it('documents response status coverage for tenant routes', () => {
    expect(getResponseStatuses(TenantController, 'listTenants')).toEqual(['200', '401', '403']);
    expect(getResponseStatuses(TenantController, 'createTenant')).toEqual(['201', '400', '401', '403']);
    expect(getResponseStatuses(TenantController, 'getTenant')).toEqual(['200', '401', '403', '404']);
    expect(getResponseStatuses(TenantController, 'updateTenant')).toEqual(['200', '401', '403', '404']);
    expect(getResponseStatuses(TenantController, 'activateTenant')).toEqual(['200', '401', '403', '404']);
    expect(getResponseStatuses(TenantController, 'deactivateTenant')).toEqual(['200', '401', '403', '404']);
  });

  it('documents response status coverage for subsidiary routes', () => {
    expect(getResponseStatuses(SubsidiaryController, 'list')).toEqual(['200', '401']);
    expect(getResponseStatuses(SubsidiaryController, 'create')).toEqual(['201', '400', '401', '404']);
    expect(getResponseStatuses(SubsidiaryController, 'getById')).toEqual(['200', '401', '404']);
    expect(getResponseStatuses(SubsidiaryController, 'update')).toEqual(['200', '400', '401', '404']);
    expect(getResponseStatuses(SubsidiaryController, 'move')).toEqual(['401', '409']);
    expect(getResponseStatuses(SubsidiaryController, 'deactivate')).toEqual(['200', '400', '401', '404']);
    expect(getResponseStatuses(SubsidiaryController, 'reactivate')).toEqual(['200', '400', '401', '404']);
  });

  it('documents response status coverage for talent routes', () => {
    expect(getResponseStatuses(TalentController, 'list')).toEqual(['200', '401']);
    expect(getResponseStatuses(TalentController, 'create')).toEqual(['201', '400', '401', '404']);
    expect(getResponseStatuses(TalentController, 'getById')).toEqual(['200', '401', '404']);
    expect(getResponseStatuses(TalentController, 'update')).toEqual(['200', '400', '401', '404']);
    expect(getResponseStatuses(TalentController, 'move')).toEqual(['401', '409']);
    expect(getResponseStatuses(TalentController, 'getPublishReadiness')).toEqual(['200', '401', '404']);
    expect(getResponseStatuses(TalentController, 'publish')).toEqual(['200', '400', '401', '404', '409']);
    expect(getResponseStatuses(TalentController, 'disable')).toEqual(['200', '400', '401', '404', '409']);
    expect(getResponseStatuses(TalentController, 'reEnable')).toEqual(['200', '400', '401', '404', '409']);
    expect(getResponseStatuses(TalentController, 'getCustomDomainConfig')).toEqual(['200', '401', '404']);
    expect(getResponseStatuses(TalentController, 'setCustomDomain')).toEqual(['200', '400', '401', '404']);
    expect(getResponseStatuses(TalentController, 'verifyCustomDomain')).toEqual(['200', '400', '401', '404']);
    expect(getResponseStatuses(TalentController, 'updateServicePaths')).toEqual(['200', '401', '404']);
    expect(getResponseStatuses(TalentController, 'updateSslMode')).toEqual(['200', '401', '404']);
  });

  it('documents response status coverage for dictionary and organization routes', () => {
    expect(getResponseStatuses(DictionaryController, 'listTypes')).toEqual(['200', '401']);
    expect(getResponseStatuses(DictionaryController, 'getByType')).toEqual(['200', '401', '404']);
    expect(getResponseStatuses(DictionaryController, 'getItem')).toEqual(['200', '401', '404']);
    expect(getResponseStatuses(DictionaryController, 'createType')).toEqual(['201', '400', '401', '403']);
    expect(getResponseStatuses(DictionaryController, 'updateType')).toEqual(['200', '400', '401', '403', '404']);
    expect(getResponseStatuses(DictionaryController, 'createItem')).toEqual(['201', '400', '401', '403', '404']);
    expect(getResponseStatuses(DictionaryController, 'updateItem')).toEqual(['200', '400', '401', '403', '404']);
    expect(getResponseStatuses(DictionaryController, 'deactivateItem')).toEqual(['200', '400', '401', '403', '404']);
    expect(getResponseStatuses(DictionaryController, 'reactivateItem')).toEqual(['200', '400', '401', '403', '404']);

    expect(getResponseStatuses(OrganizationController, 'getTree')).toEqual(['200', '401', '404']);
    expect(getResponseStatuses(OrganizationController, 'getRootNodes')).toEqual(['200', '401', '404']);
    expect(getResponseStatuses(OrganizationController, 'getChildren')).toEqual(['200', '401']);
    expect(getResponseStatuses(OrganizationController, 'getByPath')).toEqual(['200', '401', '404']);
  });

  it('documents explicit path params across organization resource routes', () => {
    expect(getPathParamNames(TenantController, 'getTenant')).toEqual(['tenantId']);
    expect(getPathParamNames(TenantController, 'updateTenant')).toEqual(['tenantId']);
    expect(getPathParamNames(TenantController, 'activateTenant')).toEqual(['tenantId']);
    expect(getPathParamNames(TenantController, 'deactivateTenant')).toEqual(['tenantId']);

    expect(getPathParamNames(SubsidiaryController, 'getById')).toEqual(['subsidiaryId']);
    expect(getPathParamNames(SubsidiaryController, 'update')).toEqual(['subsidiaryId']);
    expect(getPathParamNames(SubsidiaryController, 'move')).toEqual(['subsidiaryId']);
    expect(getPathParamNames(SubsidiaryController, 'deactivate')).toEqual(['subsidiaryId']);
    expect(getPathParamNames(SubsidiaryController, 'reactivate')).toEqual(['subsidiaryId']);

    expect(getPathParamNames(TalentController, 'getById')).toEqual(['talentId']);
    expect(getPathParamNames(TalentController, 'update')).toEqual(['talentId']);
    expect(getPathParamNames(TalentController, 'move')).toEqual(['talentId']);
    expect(getPathParamNames(TalentController, 'getPublishReadiness')).toEqual(['talentId']);
    expect(getPathParamNames(TalentController, 'publish')).toEqual(['talentId']);
    expect(getPathParamNames(TalentController, 'disable')).toEqual(['talentId']);
    expect(getPathParamNames(TalentController, 'reEnable')).toEqual(['talentId']);
    expect(getPathParamNames(TalentController, 'getCustomDomainConfig')).toEqual(['talentId']);
    expect(getPathParamNames(TalentController, 'setCustomDomain')).toEqual(['talentId']);
    expect(getPathParamNames(TalentController, 'verifyCustomDomain')).toEqual(['talentId']);
    expect(getPathParamNames(TalentController, 'updateServicePaths')).toEqual(['talentId']);
    expect(getPathParamNames(TalentController, 'updateSslMode')).toEqual(['talentId']);

    expect(getPathParamNames(DictionaryController, 'getByType')).toEqual(['type']);
    expect(getPathParamNames(DictionaryController, 'getItem')).toEqual(['code', 'type']);
    expect(getPathParamNames(DictionaryController, 'updateType')).toEqual(['type']);
    expect(getPathParamNames(DictionaryController, 'createItem')).toEqual(['type']);
    expect(getPathParamNames(DictionaryController, 'updateItem')).toEqual(['itemId', 'type']);
    expect(getPathParamNames(DictionaryController, 'deactivateItem')).toEqual(['itemId', 'type']);
    expect(getPathParamNames(DictionaryController, 'reactivateItem')).toEqual(['itemId', 'type']);

    expect(getPathParamNames(OrganizationController, 'getByPath')).toEqual(['subpath']);
  });

  it('documents request-body DTO properties for tenant and subsidiary mutations', () => {
    expect(getDocumentedDtoProperties(CreateTenantDto)).toEqual(['adminUser', 'code', 'name', 'settings']);
    expect(getDocumentedDtoProperties(UpdateTenantDto)).toEqual(['name', 'settings', 'version']);
    expect(getDocumentedDtoProperties(DeactivateTenantDto)).toEqual(['reason']);

    expect(getDocumentedDtoProperties(CreateSubsidiaryDto)).toEqual([
      'code',
      'descriptionEn',
      'descriptionJa',
      'descriptionZh',
      'nameEn',
      'nameJa',
      'nameZh',
      'parentId',
      'sortOrder',
    ]);
    expect(getDocumentedDtoProperties(UpdateSubsidiaryDto)).toEqual([
      'descriptionEn',
      'descriptionJa',
      'descriptionZh',
      'nameEn',
      'nameJa',
      'nameZh',
      'sortOrder',
      'version',
    ]);
    expect(getDocumentedDtoProperties(MoveSubsidiaryDto)).toEqual(['newParentId', 'version']);
    expect(getDocumentedDtoProperties(DeactivateSubsidiaryDto)).toEqual(['cascade', 'version']);
    expect(getDocumentedDtoProperties(ReactivateSubsidiaryDto)).toEqual(['version']);
  });

  it('documents request-body DTO properties for talent and dictionary mutations', () => {
    expect(getDocumentedDtoProperties(CreateTalentDto)).toEqual([
      'avatarUrl',
      'code',
      'descriptionEn',
      'descriptionJa',
      'descriptionZh',
      'displayName',
      'homepagePath',
      'nameEn',
      'nameJa',
      'nameZh',
      'profileStoreId',
      'settings',
      'subsidiaryId',
      'timezone',
    ]);
    expect(getDocumentedDtoProperties(UpdateTalentDto)).toEqual([
      'avatarUrl',
      'descriptionEn',
      'descriptionJa',
      'descriptionZh',
      'displayName',
      'homepagePath',
      'nameEn',
      'nameJa',
      'nameZh',
      'settings',
      'timezone',
      'version',
    ]);
    expect(getDocumentedDtoProperties(MoveTalentDto)).toEqual(['newSubsidiaryId', 'version']);
    expect(getDocumentedDtoProperties(TalentLifecycleMutationDto)).toEqual(['version']);
    expect(getDocumentedDtoProperties(SetCustomDomainDto)).toEqual(['customDomain']);
    expect(getDocumentedDtoProperties(UpdateCustomDomainPathsDto)).toEqual([
      'homepageCustomPath',
      'marshmallowCustomPath',
    ]);
    expect(getDocumentedDtoProperties(UpdateCustomDomainSslModeDto)).toEqual(['sslMode']);

    expect(getDocumentedDtoProperties(CreateDictionaryTypeDto)).toEqual([
      'code',
      'descriptionEn',
      'descriptionJa',
      'descriptionZh',
      'nameEn',
      'nameJa',
      'nameZh',
      'sortOrder',
    ]);
    expect(getDocumentedDtoProperties(UpdateDictionaryTypeDto)).toEqual([
      'descriptionEn',
      'descriptionJa',
      'descriptionZh',
      'nameEn',
      'nameJa',
      'nameZh',
      'sortOrder',
      'version',
    ]);
    expect(getDocumentedDtoProperties(CreateDictionaryItemDto)).toEqual([
      'code',
      'descriptionEn',
      'descriptionJa',
      'descriptionZh',
      'extraData',
      'nameEn',
      'nameJa',
      'nameZh',
      'sortOrder',
    ]);
    expect(getDocumentedDtoProperties(UpdateDictionaryItemDto)).toEqual([
      'descriptionEn',
      'descriptionJa',
      'descriptionZh',
      'extraData',
      'nameEn',
      'nameJa',
      'nameZh',
      'sortOrder',
      'version',
    ]);
    expect(getDocumentedDtoProperties(DeactivateItemDto)).toEqual(['version']);
  });
});
