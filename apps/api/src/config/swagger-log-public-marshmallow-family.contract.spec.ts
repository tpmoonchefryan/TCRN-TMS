import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { ChangeLogController } from '../modules/log/controllers/change-log.controller';
import { ComplianceReportController } from '../modules/log/controllers/compliance-report.controller';
import { IntegrationLogController } from '../modules/log/controllers/integration-log.controller';
import { TechEventLogController } from '../modules/log/controllers/tech-event-log.controller';
import { PublicMarshmallowController } from '../modules/marshmallow/controllers/public-marshmallow.controller';
import {
  MarkReadDto,
  PublicMessagesQueryDto,
  ReactDto,
  SsoMarkReadDto,
  SsoReplyDto,
  SubmitMessageDto,
} from '../modules/marshmallow/dto/marshmallow.dto';

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

describe('Swagger log and public marshmallow family contract', () => {
  it('attaches explicit response schemas to remaining log and public marshmallow routes', () => {
    const controllerMethods: Array<[ControllerClass, string[]]> = [
      [ChangeLogController, ['list', 'getObjectHistory', 'getOperatorHistory']],
      [IntegrationLogController, ['list', 'getByTraceId', 'getFailed']],
      [TechEventLogController, ['list', 'getByTraceId']],
      [ComplianceReportController, ['generateReport']],
      [PublicMarshmallowController, ['getConfig', 'getMessages', 'submitMessage', 'previewImage', 'toggleReaction', 'markAsRead', 'validateSsoToken', 'markAsReadAuth', 'replyAuth']],
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

  it('documents response status coverage for remaining log controllers', () => {
    expect(getResponseStatuses(ChangeLogController, 'list')).toEqual(['200', '401', '403']);
    expect(getResponseStatuses(ChangeLogController, 'getObjectHistory')).toEqual([
      '200',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(ChangeLogController, 'getOperatorHistory')).toEqual([
      '200',
      '401',
      '403',
    ]);

    expect(getResponseStatuses(IntegrationLogController, 'list')).toEqual([
      '200',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(IntegrationLogController, 'getByTraceId')).toEqual([
      '200',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(IntegrationLogController, 'getFailed')).toEqual([
      '200',
      '401',
      '403',
    ]);

    expect(getResponseStatuses(TechEventLogController, 'list')).toEqual([
      '200',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(TechEventLogController, 'getByTraceId')).toEqual([
      '200',
      '401',
      '403',
    ]);

    expect(getResponseStatuses(ComplianceReportController, 'generateReport')).toEqual([
      '200',
      '401',
      '403',
    ]);
  });

  it('documents response status coverage for public marshmallow routes', () => {
    expect(getResponseStatuses(PublicMarshmallowController, 'getConfig')).toEqual([
      '200',
      '404',
    ]);
    expect(getResponseStatuses(PublicMarshmallowController, 'getMessages')).toEqual([
      '200',
      '400',
      '404',
    ]);
    expect(getResponseStatuses(PublicMarshmallowController, 'submitMessage')).toEqual([
      '201',
      '400',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(PublicMarshmallowController, 'previewImage')).toEqual([
      '200',
      '400',
    ]);
    expect(getResponseStatuses(PublicMarshmallowController, 'toggleReaction')).toEqual([
      '200',
      '400',
      '404',
    ]);
    expect(getResponseStatuses(PublicMarshmallowController, 'markAsRead')).toEqual([
      '200',
      '400',
      '404',
    ]);
    expect(getResponseStatuses(PublicMarshmallowController, 'validateSsoToken')).toEqual([
      '200',
      '400',
    ]);
    expect(getResponseStatuses(PublicMarshmallowController, 'markAsReadAuth')).toEqual([
      '200',
      '400',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(PublicMarshmallowController, 'replyAuth')).toEqual([
      '200',
      '400',
      '403',
      '404',
    ]);
  });

  it('documents explicit path params across remaining log and public routes', () => {
    expect(getPathParamNames(ChangeLogController, 'getObjectHistory')).toEqual([
      'objectId',
      'objectType',
    ]);
    expect(getPathParamNames(ChangeLogController, 'getOperatorHistory')).toEqual(['operatorId']);
    expect(getPathParamNames(IntegrationLogController, 'getByTraceId')).toEqual(['traceId']);
    expect(getPathParamNames(TechEventLogController, 'getByTraceId')).toEqual(['traceId']);

    expect(getPathParamNames(PublicMarshmallowController, 'getConfig')).toEqual(['path']);
    expect(getPathParamNames(PublicMarshmallowController, 'getMessages')).toEqual(['path']);
    expect(getPathParamNames(PublicMarshmallowController, 'submitMessage')).toEqual(['path']);
    expect(getPathParamNames(PublicMarshmallowController, 'toggleReaction')).toEqual([
      'messageId',
    ]);
    expect(getPathParamNames(PublicMarshmallowController, 'markAsRead')).toEqual([
      'messageId',
      'path',
    ]);
    expect(getPathParamNames(PublicMarshmallowController, 'markAsReadAuth')).toEqual([
      'messageId',
      'path',
    ]);
    expect(getPathParamNames(PublicMarshmallowController, 'replyAuth')).toEqual([
      'messageId',
      'path',
    ]);
  });

  it('documents DTO properties for public marshmallow requests', () => {
    expect(getDocumentedDtoProperties(SubmitMessageDto)).toEqual([
      'content',
      'fingerprint',
      'honeypot',
      'isAnonymous',
      'selectedImageUrls',
      'senderName',
      'socialLink',
      'turnstileToken',
    ]);
    expect(getDocumentedDtoProperties(PublicMessagesQueryDto)).toEqual([
      '_t',
      'cursor',
      'fingerprint',
      'limit',
    ]);
    expect(getDocumentedDtoProperties(ReactDto)).toEqual(['fingerprint', 'reaction']);
    expect(getDocumentedDtoProperties(MarkReadDto)).toEqual(['fingerprint']);
    expect(getDocumentedDtoProperties(SsoMarkReadDto)).toEqual(['ssoToken']);
    expect(getDocumentedDtoProperties(SsoReplyDto)).toEqual(['content', 'ssoToken']);
  });
});
