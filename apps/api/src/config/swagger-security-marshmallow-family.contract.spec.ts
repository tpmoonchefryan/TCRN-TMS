import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { LogSearchController } from '../modules/log/controllers/log-search.controller';
import { ExternalBlocklistController } from '../modules/marshmallow/controllers/external-blocklist.controller';
import { MarshmallowController } from '../modules/marshmallow/controllers/marshmallow.controller';
import {
  BatchToggleDto,
  CreateExternalBlocklistDto,
  DisableExternalBlocklistDto,
  ExternalBlocklistQueryDto,
  UpdateExternalBlocklistDto,
} from '../modules/marshmallow/dto/external-blocklist.dto';
import {
  BatchActionDto,
  ExportMessagesDto,
  MessageListQueryDto,
  RejectMessageDto,
  ReplyMessageDto,
  UpdateConfigDto,
  UpdateMessageDto,
} from '../modules/marshmallow/dto/marshmallow.dto';
import { SecurityController } from '../modules/security/controllers/security.controller';

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

describe('Swagger security and marshmallow family contract', () => {
  it('attaches explicit response schemas to security, blocklist, and marshmallow routes', () => {
    const controllerMethods: Array<[ControllerClass, string[]]> = [
      [SecurityController, ['getFingerprint', 'listBlocklist', 'createBlocklist', 'testBlocklist', 'getBlocklist', 'updateBlocklist', 'deleteBlocklist', 'disableBlocklist', 'enableBlocklist', 'listIpRules', 'createIpRule', 'checkIpAccess', 'deleteIpRule']],
      [ExternalBlocklistController, ['findMany', 'findWithInheritance', 'findWithInheritanceTalent', 'findById', 'create', 'update', 'delete', 'disableInScope', 'enableInScope', 'batchToggle']],
      [MarshmallowController, ['getConfig', 'updateConfig', 'uploadAvatar', 'setCustomDomain', 'verifyCustomDomain', 'generateSsoToken', 'listMessages', 'approveMessage', 'rejectMessage', 'unrejectMessage', 'replyMessage', 'batchAction', 'updateMessage', 'exportMessages', 'getExportJob', 'getExportDownloadUrl']],
      [LogSearchController, ['search']],
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

  it('documents response status coverage for security routes', () => {
    expect(getResponseStatuses(SecurityController, 'getFingerprint')).toEqual(['200', '401']);
    expect(getResponseStatuses(SecurityController, 'listBlocklist')).toEqual([
      '200',
      '400',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(SecurityController, 'createBlocklist')).toEqual([
      '201',
      '400',
      '401',
      '403',
      '409',
    ]);
    expect(getResponseStatuses(SecurityController, 'testBlocklist')).toEqual([
      '200',
      '400',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(SecurityController, 'getBlocklist')).toEqual([
      '200',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(SecurityController, 'updateBlocklist')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
      '409',
    ]);
    expect(getResponseStatuses(SecurityController, 'deleteBlocklist')).toEqual([
      '200',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(SecurityController, 'disableBlocklist')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(SecurityController, 'enableBlocklist')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(SecurityController, 'listIpRules')).toEqual([
      '200',
      '400',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(SecurityController, 'createIpRule')).toEqual([
      '201',
      '400',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(SecurityController, 'checkIpAccess')).toEqual([
      '200',
      '400',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(SecurityController, 'deleteIpRule')).toEqual([
      '200',
      '401',
      '403',
      '404',
    ]);
  });

  it('documents response status coverage for external blocklist and log-search routes', () => {
    expect(getResponseStatuses(ExternalBlocklistController, 'findMany')).toEqual([
      '200',
      '400',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(ExternalBlocklistController, 'findWithInheritance')).toEqual([
      '200',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(ExternalBlocklistController, 'findWithInheritanceTalent')).toEqual([
      '200',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(ExternalBlocklistController, 'findById')).toEqual([
      '200',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(ExternalBlocklistController, 'create')).toEqual([
      '201',
      '400',
      '401',
      '403',
      '409',
    ]);
    expect(getResponseStatuses(ExternalBlocklistController, 'update')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
      '409',
    ]);
    expect(getResponseStatuses(ExternalBlocklistController, 'delete')).toEqual([
      '200',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(ExternalBlocklistController, 'disableInScope')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(ExternalBlocklistController, 'enableInScope')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(ExternalBlocklistController, 'batchToggle')).toEqual([
      '200',
      '400',
      '401',
      '403',
    ]);

    expect(getResponseStatuses(LogSearchController, 'search')).toEqual(['200', '401', '403']);
  });

  it('documents response status coverage for marshmallow routes', () => {
    expect(getResponseStatuses(MarshmallowController, 'getConfig')).toEqual([
      '200',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(MarshmallowController, 'updateConfig')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
      '409',
    ]);
    expect(getResponseStatuses(MarshmallowController, 'uploadAvatar')).toEqual([
      '201',
      '400',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(MarshmallowController, 'setCustomDomain')).toEqual([
      '201',
      '400',
      '401',
      '403',
      '404',
      '409',
    ]);
    expect(getResponseStatuses(MarshmallowController, 'verifyCustomDomain')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(MarshmallowController, 'generateSsoToken')).toEqual([
      '201',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(MarshmallowController, 'listMessages')).toEqual([
      '200',
      '400',
      '401',
      '403',
    ]);
    expect(getResponseStatuses(MarshmallowController, 'approveMessage')).toEqual([
      '201',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(MarshmallowController, 'rejectMessage')).toEqual([
      '201',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(MarshmallowController, 'unrejectMessage')).toEqual([
      '201',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(MarshmallowController, 'replyMessage')).toEqual([
      '201',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(MarshmallowController, 'batchAction')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(MarshmallowController, 'updateMessage')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(MarshmallowController, 'exportMessages')).toEqual([
      '202',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(MarshmallowController, 'getExportJob')).toEqual([
      '200',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(MarshmallowController, 'getExportDownloadUrl')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
  });

  it('documents explicit path params across security and marshmallow routes', () => {
    expect(getPathParamNames(SecurityController, 'getBlocklist')).toEqual(['id']);
    expect(getPathParamNames(SecurityController, 'updateBlocklist')).toEqual(['id']);
    expect(getPathParamNames(SecurityController, 'deleteBlocklist')).toEqual(['id']);
    expect(getPathParamNames(SecurityController, 'disableBlocklist')).toEqual(['id']);
    expect(getPathParamNames(SecurityController, 'enableBlocklist')).toEqual(['id']);
    expect(getPathParamNames(SecurityController, 'deleteIpRule')).toEqual(['id']);

    expect(getPathParamNames(ExternalBlocklistController, 'findWithInheritance')).toEqual([
      'scopeId',
      'scopeType',
    ]);
    expect(getPathParamNames(ExternalBlocklistController, 'findWithInheritanceTalent')).toEqual([
      'talentId',
    ]);
    expect(getPathParamNames(ExternalBlocklistController, 'findById')).toEqual(['id']);
    expect(getPathParamNames(ExternalBlocklistController, 'update')).toEqual(['id']);
    expect(getPathParamNames(ExternalBlocklistController, 'delete')).toEqual(['id']);
    expect(getPathParamNames(ExternalBlocklistController, 'disableInScope')).toEqual(['id']);
    expect(getPathParamNames(ExternalBlocklistController, 'enableInScope')).toEqual(['id']);

    expect(getPathParamNames(MarshmallowController, 'getConfig')).toEqual(['talentId']);
    expect(getPathParamNames(MarshmallowController, 'updateConfig')).toEqual(['talentId']);
    expect(getPathParamNames(MarshmallowController, 'uploadAvatar')).toEqual(['talentId']);
    expect(getPathParamNames(MarshmallowController, 'setCustomDomain')).toEqual(['talentId']);
    expect(getPathParamNames(MarshmallowController, 'verifyCustomDomain')).toEqual(['talentId']);
    expect(getPathParamNames(MarshmallowController, 'generateSsoToken')).toEqual(['talentId']);
    expect(getPathParamNames(MarshmallowController, 'listMessages')).toEqual(['talentId']);
    expect(getPathParamNames(MarshmallowController, 'approveMessage')).toEqual([
      'messageId',
      'talentId',
    ]);
    expect(getPathParamNames(MarshmallowController, 'rejectMessage')).toEqual([
      'messageId',
      'talentId',
    ]);
    expect(getPathParamNames(MarshmallowController, 'unrejectMessage')).toEqual([
      'messageId',
      'talentId',
    ]);
    expect(getPathParamNames(MarshmallowController, 'replyMessage')).toEqual([
      'messageId',
      'talentId',
    ]);
    expect(getPathParamNames(MarshmallowController, 'batchAction')).toEqual(['talentId']);
    expect(getPathParamNames(MarshmallowController, 'updateMessage')).toEqual([
      'messageId',
      'talentId',
    ]);
    expect(getPathParamNames(MarshmallowController, 'exportMessages')).toEqual(['talentId']);
    expect(getPathParamNames(MarshmallowController, 'getExportJob')).toEqual([
      'jobId',
      'talentId',
    ]);
    expect(getPathParamNames(MarshmallowController, 'getExportDownloadUrl')).toEqual([
      'jobId',
      'talentId',
    ]);
  });

  it('documents request/query DTO properties for marshmallow and external blocklist flows', () => {
    expect(getDocumentedDtoProperties(ExternalBlocklistQueryDto)).toEqual([
      'category',
      'includeDisabled',
      'includeInactive',
      'includeInherited',
      'page',
      'pageSize',
      'scopeId',
      'scopeType',
    ]);
    expect(getDocumentedDtoProperties(DisableExternalBlocklistDto)).toEqual([
      'scopeId',
      'scopeType',
    ]);
    expect(getDocumentedDtoProperties(CreateExternalBlocklistDto)).toEqual([
      'action',
      'category',
      'description',
      'inherit',
      'isForceUse',
      'nameEn',
      'nameJa',
      'nameZh',
      'ownerId',
      'ownerType',
      'pattern',
      'patternType',
      'replacement',
      'severity',
      'sortOrder',
    ]);
    expect(getDocumentedDtoProperties(UpdateExternalBlocklistDto)).toEqual([
      'action',
      'category',
      'description',
      'inherit',
      'isActive',
      'isForceUse',
      'nameEn',
      'nameJa',
      'nameZh',
      'pattern',
      'patternType',
      'replacement',
      'severity',
      'sortOrder',
      'version',
    ]);
    expect(getDocumentedDtoProperties(BatchToggleDto)).toEqual(['ids', 'isActive']);

    expect(getDocumentedDtoProperties(UpdateConfigDto)).toEqual([
      'allowAnonymous',
      'allowedReactions',
      'autoApprove',
      'avatarUrl',
      'captchaMode',
      'externalBlocklistEnabled',
      'isEnabled',
      'maxMessageLength',
      'minMessageLength',
      'moderationEnabled',
      'placeholderText',
      'privacyContentEn',
      'privacyContentJa',
      'privacyContentZh',
      'profanityFilterEnabled',
      'rateLimitPerIp',
      'rateLimitWindowHours',
      'reactionsEnabled',
      'termsContentEn',
      'termsContentJa',
      'termsContentZh',
      'thankYouText',
      'theme',
      'title',
      'version',
      'welcomeText',
    ]);
    expect(getDocumentedDtoProperties(MessageListQueryDto)).toEqual([
      'endDate',
      'hasReply',
      'isRead',
      'isStarred',
      'keyword',
      'page',
      'pageSize',
      'sortBy',
      'sortOrder',
      'startDate',
      'status',
    ]);
    expect(getDocumentedDtoProperties(RejectMessageDto)).toEqual(['note', 'reason']);
    expect(getDocumentedDtoProperties(ReplyMessageDto)).toEqual(['content']);
    expect(getDocumentedDtoProperties(BatchActionDto)).toEqual([
      'action',
      'messageIds',
      'rejectionReason',
    ]);
    expect(getDocumentedDtoProperties(UpdateMessageDto)).toEqual([
      'isPinned',
      'isRead',
      'isStarred',
    ]);
    expect(getDocumentedDtoProperties(ExportMessagesDto)).toEqual([
      'endDate',
      'format',
      'includeRejected',
      'startDate',
      'status',
    ]);
  });
});
