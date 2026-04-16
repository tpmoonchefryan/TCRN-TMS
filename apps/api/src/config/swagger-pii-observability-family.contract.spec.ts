import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { LogSearchController } from '../modules/log/controllers/log-search.controller';
import {
  PiiServiceConfigController,
} from '../modules/pii-config/controllers/pii-service-config.controller';
import {
  ProfileStoreController,
} from '../modules/pii-config/controllers/profile-store.controller';
import {
  CreatePiiServiceConfigDto,
  CreateProfileStoreDto,
  PaginationQueryDto,
  UpdatePiiServiceConfigDto,
  UpdateProfileStoreDto,
} from '../modules/pii-config/dto/pii-config.dto';
import { RateLimitStatsController } from '../modules/security/controllers/rate-limit-stats.controller';

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

const getQueryParamNames = (
  controllerClass: ControllerClass,
  methodName: string,
): string[] => {
  const prototype = controllerClass.prototype as Record<string, unknown>;
  const metadata = Reflect.getMetadata(
    API_PARAMETERS_METADATA_KEY,
    prototype[methodName],
  ) as Array<{ in?: string; name?: string }> | undefined;

  return (metadata ?? [])
    .filter((parameter) => parameter.in === 'query' && typeof parameter.name === 'string')
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

describe('Swagger PII and observability family contract', () => {
  it('documents response status coverage for profile-store routes', () => {
    expect(getResponseStatuses(ProfileStoreController, 'list')).toEqual(['200', '401', '403']);
    expect(getResponseStatuses(ProfileStoreController, 'getById')).toEqual([
      '200',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(ProfileStoreController, 'create')).toEqual([
      '201',
      '400',
      '401',
      '403',
      '404',
      '409',
    ]);
    expect(getResponseStatuses(ProfileStoreController, 'update')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
      '409',
    ]);
  });

  it('documents response status coverage for pii-service-config routes', () => {
    expect(getResponseStatuses(PiiServiceConfigController, 'list')).toEqual(['401', '403', '409']);
    expect(getResponseStatuses(PiiServiceConfigController, 'getById')).toEqual([
      '401',
      '403',
      '409',
    ]);
    expect(getResponseStatuses(PiiServiceConfigController, 'create')).toEqual([
      '401',
      '403',
      '409',
    ]);
    expect(getResponseStatuses(PiiServiceConfigController, 'update')).toEqual([
      '401',
      '403',
      '409',
    ]);
    expect(getResponseStatuses(PiiServiceConfigController, 'testConnection')).toEqual([
      '401',
      '403',
      '409',
    ]);
  });

  it('documents response status coverage for log search and rate-limit routes', () => {
    expect(getResponseStatuses(LogSearchController, 'search')).toEqual(['200', '401', '403']);
    expect(getResponseStatuses(LogSearchController, 'searchChangeLogs')).toEqual([
      '200',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(LogSearchController, 'searchTechEvents')).toEqual([
      '200',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(LogSearchController, 'searchIntegrationLogs')).toEqual([
      '200',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(RateLimitStatsController, 'getStats')).toEqual(['200', '401']);
  });

  it('documents explicit path params for pii config detail and mutation routes', () => {
    expect(getPathParamNames(ProfileStoreController, 'getById')).toEqual(['id']);
    expect(getPathParamNames(ProfileStoreController, 'update')).toEqual(['id']);
    expect(getPathParamNames(PiiServiceConfigController, 'getById')).toEqual(['id']);
    expect(getPathParamNames(PiiServiceConfigController, 'update')).toEqual(['id']);
    expect(getPathParamNames(PiiServiceConfigController, 'testConnection')).toEqual(['id']);
  });

  it('documents log-search query params needed by the current compatibility contract', () => {
    expect(getQueryParamNames(LogSearchController, 'search')).toEqual([
      'app',
      'end',
      'keyword',
      'limit',
      'query',
      'severity',
      'start',
      'stream',
      'timeRange',
    ]);
  });

  it('documents request and query DTO properties for the pii config family', () => {
    expect(getDocumentedDtoProperties(CreatePiiServiceConfigDto)).toEqual([
      'apiKey',
      'apiUrl',
      'authType',
      'code',
      'descriptionEn',
      'descriptionJa',
      'descriptionZh',
      'healthCheckIntervalSec',
      'healthCheckUrl',
      'mtlsCaCert',
      'mtlsClientCert',
      'mtlsClientKey',
      'nameEn',
      'nameJa',
      'nameZh',
    ]);
    expect(getDocumentedDtoProperties(UpdatePiiServiceConfigDto)).toEqual([
      'apiKey',
      'apiUrl',
      'authType',
      'descriptionEn',
      'descriptionJa',
      'descriptionZh',
      'healthCheckIntervalSec',
      'healthCheckUrl',
      'isActive',
      'mtlsCaCert',
      'mtlsClientCert',
      'mtlsClientKey',
      'nameEn',
      'nameJa',
      'nameZh',
      'version',
    ]);
    expect(getDocumentedDtoProperties(CreateProfileStoreDto)).toEqual([
      'code',
      'descriptionEn',
      'descriptionJa',
      'descriptionZh',
      'isDefault',
      'nameEn',
      'nameJa',
      'nameZh',
    ]);
    expect(getDocumentedDtoProperties(UpdateProfileStoreDto)).toEqual([
      'descriptionEn',
      'descriptionJa',
      'descriptionZh',
      'isActive',
      'isDefault',
      'nameEn',
      'nameJa',
      'nameZh',
      'version',
    ]);
    expect(getDocumentedDtoProperties(PaginationQueryDto)).toEqual([
      'includeInactive',
      'page',
      'pageSize',
    ]);
  });
});
