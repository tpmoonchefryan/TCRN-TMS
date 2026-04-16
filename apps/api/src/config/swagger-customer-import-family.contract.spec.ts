import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { CustomerController } from '../modules/customer/controllers/customer.controller';
import { ExternalIdController } from '../modules/customer/controllers/external-id.controller';
import { MembershipController } from '../modules/customer/controllers/membership.controller';
import { PlatformIdentityController } from '../modules/customer/controllers/platform-identity.controller';
import { ImportController } from '../modules/import/controllers/import.controller';
import {
  CreateImportJobDto,
  ImportJobQueryDto,
} from '../modules/import/dto/import.dto';

const API_RESPONSE_METADATA_KEY = 'swagger/apiResponse';
const API_PARAMETERS_METADATA_KEY = 'swagger/apiParameters';
const API_MODEL_PROPERTIES_ARRAY_METADATA_KEY = 'swagger/apiModelPropertiesArray';

type ControllerClass = { prototype: object };
type SwaggerResponseMetadata = Record<string, { schema?: unknown; content?: unknown }>;

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

const getResponseMetadata = (
  controllerClass: ControllerClass,
  methodName: string,
): SwaggerResponseMetadata => {
  const prototype = controllerClass.prototype as Record<string, unknown>;
  return ((Reflect.getMetadata(
    API_RESPONSE_METADATA_KEY,
    prototype[methodName],
  ) as SwaggerResponseMetadata | undefined) ?? {});
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

describe('Swagger customer and import family contract', () => {
  it('attaches explicit response schemas to customer and import routes', () => {
    const controllerMethods: Array<[ControllerClass, string[]]> = [
      [CustomerController, ['list', 'getById', 'createIndividual', 'updateIndividual', 'createPiiPortalSession', 'createCompanyPiiPortalSession', 'updateIndividualPii', 'createCompany', 'updateCompany', 'deactivate', 'reactivate', 'batchOperation']],
      [ExternalIdController, ['list', 'create', 'delete']],
      [MembershipController, ['list', 'create', 'update']],
      [PlatformIdentityController, ['list', 'create', 'update', 'getHistory']],
      [ImportController, ['downloadIndividualTemplate', 'downloadCompanyTemplate', 'uploadIndividual', 'uploadCompany', 'listJobs', 'getJob', 'getJobErrors', 'cancelJob']],
    ];

    for (const [controllerClass, methodNames] of controllerMethods) {
      for (const methodName of methodNames) {
        const responseEntries = Object.values(getResponseMetadata(controllerClass, methodName));
        expect(responseEntries.length).toBeGreaterThan(0);
        expect(
          responseEntries.every(
            (response) => Boolean(response?.schema || response?.content),
          ),
        ).toBe(true);
      }
    }
  });

  it('documents response status coverage for customer profile routes', () => {
    expect(getResponseStatuses(CustomerController, 'list')).toEqual(['200', '401', '403']);
    expect(getResponseStatuses(CustomerController, 'getById')).toEqual([
      '200',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(CustomerController, 'createIndividual')).toEqual([
      '201',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(CustomerController, 'updateIndividual')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
      '409',
    ]);
    expect(getResponseStatuses(CustomerController, 'createPiiPortalSession')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(CustomerController, 'createCompanyPiiPortalSession')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(CustomerController, 'updateIndividualPii')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
      '409',
    ]);
    expect(getResponseStatuses(CustomerController, 'createCompany')).toEqual([
      '201',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(CustomerController, 'updateCompany')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
      '409',
    ]);
    expect(getResponseStatuses(CustomerController, 'deactivate')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
      '409',
    ]);
    expect(getResponseStatuses(CustomerController, 'reactivate')).toEqual([
      '200',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(CustomerController, 'batchOperation')).toEqual([
      '200',
      '202',
      '400',
      '401',
      '403',
      '404',
    ]);
  });

  it('documents response status coverage for nested customer subresources', () => {
    expect(getResponseStatuses(ExternalIdController, 'list')).toEqual([
      '200',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(ExternalIdController, 'create')).toEqual([
      '201',
      '400',
      '401',
      '403',
      '404',
      '409',
    ]);
    expect(getResponseStatuses(ExternalIdController, 'delete')).toEqual([
      '200',
      '401',
      '403',
      '404',
    ]);

    expect(getResponseStatuses(MembershipController, 'list')).toEqual([
      '200',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(MembershipController, 'create')).toEqual([
      '201',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(MembershipController, 'update')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);

    expect(getResponseStatuses(PlatformIdentityController, 'list')).toEqual([
      '200',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(PlatformIdentityController, 'create')).toEqual([
      '201',
      '400',
      '401',
      '403',
      '404',
      '409',
    ]);
    expect(getResponseStatuses(PlatformIdentityController, 'update')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
      '409',
    ]);
    expect(getResponseStatuses(PlatformIdentityController, 'getHistory')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
  });

  it('documents response status coverage for import routes', () => {
    expect(getResponseStatuses(ImportController, 'downloadIndividualTemplate')).toEqual([
      '200',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(ImportController, 'downloadCompanyTemplate')).toEqual([
      '200',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(ImportController, 'uploadIndividual')).toEqual([
      '201',
      '400',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(ImportController, 'uploadCompany')).toEqual([
      '201',
      '400',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(ImportController, 'listJobs')).toEqual([
      '200',
      '400',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(ImportController, 'getJob')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(ImportController, 'getJobErrors')).toEqual([
      '200',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(ImportController, 'cancelJob')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
  });

  it('documents explicit path params across customer and import routes', () => {
    expect(getPathParamNames(CustomerController, 'list')).toEqual(['talentId']);
    expect(getPathParamNames(CustomerController, 'getById')).toEqual(['customerId', 'talentId']);
    expect(getPathParamNames(CustomerController, 'createIndividual')).toEqual(['talentId']);
    expect(getPathParamNames(CustomerController, 'updateIndividual')).toEqual([
      'customerId',
      'talentId',
    ]);
    expect(getPathParamNames(CustomerController, 'createPiiPortalSession')).toEqual([
      'customerId',
      'talentId',
    ]);
    expect(getPathParamNames(CustomerController, 'createCompanyPiiPortalSession')).toEqual([
      'customerId',
      'talentId',
    ]);
    expect(getPathParamNames(CustomerController, 'updateIndividualPii')).toEqual([
      'customerId',
      'talentId',
    ]);
    expect(getPathParamNames(CustomerController, 'createCompany')).toEqual(['talentId']);
    expect(getPathParamNames(CustomerController, 'updateCompany')).toEqual([
      'customerId',
      'talentId',
    ]);
    expect(getPathParamNames(CustomerController, 'deactivate')).toEqual([
      'customerId',
      'talentId',
    ]);
    expect(getPathParamNames(CustomerController, 'reactivate')).toEqual([
      'customerId',
      'talentId',
    ]);
    expect(getPathParamNames(CustomerController, 'batchOperation')).toEqual(['talentId']);

    expect(getPathParamNames(ExternalIdController, 'list')).toEqual(['customerId', 'talentId']);
    expect(getPathParamNames(ExternalIdController, 'create')).toEqual(['customerId', 'talentId']);
    expect(getPathParamNames(ExternalIdController, 'delete')).toEqual([
      'customerId',
      'externalIdId',
      'talentId',
    ]);

    expect(getPathParamNames(MembershipController, 'list')).toEqual(['customerId', 'talentId']);
    expect(getPathParamNames(MembershipController, 'create')).toEqual(['customerId', 'talentId']);
    expect(getPathParamNames(MembershipController, 'update')).toEqual([
      'customerId',
      'recordId',
      'talentId',
    ]);

    expect(getPathParamNames(PlatformIdentityController, 'list')).toEqual([
      'customerId',
      'talentId',
    ]);
    expect(getPathParamNames(PlatformIdentityController, 'create')).toEqual([
      'customerId',
      'talentId',
    ]);
    expect(getPathParamNames(PlatformIdentityController, 'update')).toEqual([
      'customerId',
      'identityId',
      'talentId',
    ]);
    expect(getPathParamNames(PlatformIdentityController, 'getHistory')).toEqual([
      'customerId',
      'talentId',
    ]);

    expect(getPathParamNames(ImportController, 'downloadIndividualTemplate')).toEqual([
      'talentId',
    ]);
    expect(getPathParamNames(ImportController, 'downloadCompanyTemplate')).toEqual([
      'talentId',
    ]);
    expect(getPathParamNames(ImportController, 'uploadIndividual')).toEqual(['talentId']);
    expect(getPathParamNames(ImportController, 'uploadCompany')).toEqual(['talentId']);
    expect(getPathParamNames(ImportController, 'listJobs')).toEqual(['talentId']);
    expect(getPathParamNames(ImportController, 'getJob')).toEqual(['jobId', 'talentId', 'type']);
    expect(getPathParamNames(ImportController, 'getJobErrors')).toEqual([
      'jobId',
      'talentId',
      'type',
    ]);
    expect(getPathParamNames(ImportController, 'cancelJob')).toEqual([
      'jobId',
      'talentId',
      'type',
    ]);
  });

  it('documents request/query DTO properties for import jobs', () => {
    expect(getDocumentedDtoProperties(CreateImportJobDto)).toEqual(['consumerCode']);
    expect(getDocumentedDtoProperties(ImportJobQueryDto)).toEqual([
      'page',
      'pageSize',
      'status',
    ]);
  });
});
