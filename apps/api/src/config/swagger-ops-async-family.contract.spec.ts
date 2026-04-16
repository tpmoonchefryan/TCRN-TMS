import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { EmailTemplateController } from '../modules/email/controllers/email-template.controller';
import {
  CreateEmailTemplateDto,
  EmailTemplateQueryDto,
  PreviewEmailTemplateDto,
  UpdateEmailTemplateDto,
} from '../modules/email/dto/email-template.dto';
import { ExportController } from '../modules/export/controllers/export.controller';
import {
  CreateExportJobDto,
  ExportJobQueryDto,
} from '../modules/export/dto/export.dto';
import { ReportController } from '../modules/report/controllers/report.controller';
import {
  CreateMfrJobDto,
  MfrFilterCriteriaDto,
  MfrSearchRequestDto,
  ReportJobListQueryDto,
} from '../modules/report/dto/report.dto';

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

describe('Swagger ops and async family contract', () => {
  it('documents response status coverage for email-template routes', () => {
    expect(getResponseStatuses(EmailTemplateController, 'findAll')).toEqual([
      '200',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(EmailTemplateController, 'findOne')).toEqual([
      '200',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(EmailTemplateController, 'create')).toEqual([
      '201',
      '400',
      '401',
      '403',
      '409',
    ]);
    expect(getResponseStatuses(EmailTemplateController, 'update')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(EmailTemplateController, 'deactivate')).toEqual([
      '200',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(EmailTemplateController, 'reactivate')).toEqual([
      '200',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(EmailTemplateController, 'preview')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
  });

  it('documents response status coverage for export routes', () => {
    expect(getResponseStatuses(ExportController, 'createExport')).toEqual([
      '201',
      '400',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(ExportController, 'listJobs')).toEqual(['200', '401', '403']);
    expect(getResponseStatuses(ExportController, 'getJob')).toEqual([
      '200',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(ExportController, 'downloadExport')).toEqual([
      '302',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(ExportController, 'cancelJob')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
  });

  it('documents response status coverage for report routes', () => {
    expect(getResponseStatuses(ReportController, 'searchMfr')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(ReportController, 'createMfrJob')).toEqual([
      '201',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(ReportController, 'listMfrJobs')).toEqual([
      '200',
      '400',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(ReportController, 'getMfrJob')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(ReportController, 'downloadMfrJob')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(ReportController, 'cancelMfrJob')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
  });

  it('documents explicit path params across async ops routes', () => {
    expect(getPathParamNames(EmailTemplateController, 'findOne')).toEqual(['code']);
    expect(getPathParamNames(EmailTemplateController, 'update')).toEqual(['code']);
    expect(getPathParamNames(EmailTemplateController, 'deactivate')).toEqual(['code']);
    expect(getPathParamNames(EmailTemplateController, 'reactivate')).toEqual(['code']);
    expect(getPathParamNames(EmailTemplateController, 'preview')).toEqual(['code']);

    expect(getPathParamNames(ExportController, 'getJob')).toEqual(['jobId']);
    expect(getPathParamNames(ExportController, 'downloadExport')).toEqual(['jobId']);
    expect(getPathParamNames(ExportController, 'cancelJob')).toEqual(['jobId']);

    expect(getPathParamNames(ReportController, 'getMfrJob')).toEqual(['jobId']);
    expect(getPathParamNames(ReportController, 'downloadMfrJob')).toEqual(['jobId']);
    expect(getPathParamNames(ReportController, 'cancelMfrJob')).toEqual(['jobId']);
  });

  it('documents async query params and DTO property schemas', () => {
    expect(getQueryParamNames(ReportController, 'getMfrJob')).toEqual(['talent_id']);
    expect(getQueryParamNames(ReportController, 'downloadMfrJob')).toEqual(['talent_id']);
    expect(getQueryParamNames(ReportController, 'cancelMfrJob')).toEqual(['talent_id']);

    expect(getDocumentedDtoProperties(CreateEmailTemplateDto)).toEqual([
      'bodyHtmlEn',
      'bodyHtmlJa',
      'bodyHtmlZh',
      'bodyTextEn',
      'bodyTextJa',
      'bodyTextZh',
      'category',
      'code',
      'nameEn',
      'nameJa',
      'nameZh',
      'subjectEn',
      'subjectJa',
      'subjectZh',
      'variables',
    ]);
    expect(getDocumentedDtoProperties(UpdateEmailTemplateDto)).toEqual([
      'bodyHtmlEn',
      'bodyHtmlJa',
      'bodyHtmlZh',
      'bodyTextEn',
      'bodyTextJa',
      'bodyTextZh',
      'category',
      'isActive',
      'nameEn',
      'nameJa',
      'nameZh',
      'subjectEn',
      'subjectJa',
      'subjectZh',
      'variables',
    ]);
    expect(getDocumentedDtoProperties(PreviewEmailTemplateDto)).toEqual([
      'locale',
      'variables',
    ]);
    expect(getDocumentedDtoProperties(EmailTemplateQueryDto)).toEqual([
      'category',
      'isActive',
    ]);

    expect(getDocumentedDtoProperties(CreateExportJobDto)).toEqual([
      'customerIds',
      'fields',
      'format',
      'jobType',
      'membershipClassCode',
      'tags',
    ]);
    expect(getDocumentedDtoProperties(ExportJobQueryDto)).toEqual([
      'page',
      'pageSize',
      'status',
    ]);

    expect(getDocumentedDtoProperties(MfrFilterCriteriaDto)).toEqual([
      'includeExpired',
      'includeInactive',
      'membershipClassCodes',
      'membershipLevelCodes',
      'membershipTypeCodes',
      'platformCodes',
      'statusCodes',
      'validFromEnd',
      'validFromStart',
      'validToEnd',
      'validToStart',
    ]);
    expect(getDocumentedDtoProperties(MfrSearchRequestDto)).toEqual([
      'filters',
      'previewLimit',
      'talentId',
    ]);
    expect(getDocumentedDtoProperties(CreateMfrJobDto)).toEqual([
      'filters',
      'format',
      'talentId',
    ]);
    expect(getDocumentedDtoProperties(ReportJobListQueryDto)).toEqual([
      'createdFrom',
      'createdTo',
      'page',
      'pageSize',
      'status',
      'talentId',
    ]);
  });
});
