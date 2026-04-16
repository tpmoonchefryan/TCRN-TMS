import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import {
  CreateRoleDto,
  RoleActivationDto,
  RoleController,
  SetPermissionsDto,
  UpdateRoleDto,
} from '../modules/role/role.controller';
import { SystemRoleController } from '../modules/system-role/system-role.controller';
import {
  CreateUserDto,
  ResetPasswordDto,
  SetScopeAccessDto,
  SystemUserController,
  UpdateUserDto,
} from '../modules/system-user/system-user.controller';

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

describe('Swagger admin RBAC family contract', () => {
  it('documents response status coverage for role routes', () => {
    expect(getResponseStatuses(RoleController, 'list')).toEqual(['200', '401']);
    expect(getResponseStatuses(RoleController, 'create')).toEqual(['201', '400', '401']);
    expect(getResponseStatuses(RoleController, 'getById')).toEqual(['200', '401', '404']);
    expect(getResponseStatuses(RoleController, 'update')).toEqual(['200', '400', '401', '404']);
    expect(getResponseStatuses(RoleController, 'setPermissions')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(RoleController, 'deactivate')).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(getResponseStatuses(RoleController, 'reactivate')).toEqual([
      '200',
      '400',
      '401',
      '404',
    ]);
  });

  it('documents response status coverage for system-user routes', () => {
    expect(getResponseStatuses(SystemUserController, 'list')).toEqual(['200', '401']);
    expect(getResponseStatuses(SystemUserController, 'create')).toEqual(['201', '400', '401']);
    expect(getResponseStatuses(SystemUserController, 'getById')).toEqual(['200', '401', '404']);
    expect(getResponseStatuses(SystemUserController, 'update')).toEqual(['200', '401', '404']);
    expect(getResponseStatuses(SystemUserController, 'resetPassword')).toEqual([
      '200',
      '401',
      '404',
    ]);
    expect(getResponseStatuses(SystemUserController, 'deactivate')).toEqual([
      '200',
      '401',
      '404',
    ]);
    expect(getResponseStatuses(SystemUserController, 'reactivate')).toEqual([
      '200',
      '401',
      '404',
    ]);
    expect(getResponseStatuses(SystemUserController, 'forceTotp')).toEqual([
      '200',
      '401',
      '404',
    ]);
    expect(getResponseStatuses(SystemUserController, 'getScopeAccess')).toEqual(['200', '401']);
    expect(getResponseStatuses(SystemUserController, 'setScopeAccess')).toEqual(['200', '401']);
  });

  it('documents response status coverage for system-role routes', () => {
    expect(getResponseStatuses(SystemRoleController, 'create')).toEqual(['201', '400', '401']);
    expect(getResponseStatuses(SystemRoleController, 'findAll')).toEqual(['200', '401']);
    expect(getResponseStatuses(SystemRoleController, 'findOne')).toEqual(['200', '401', '404']);
    expect(getResponseStatuses(SystemRoleController, 'update')).toEqual([
      '200',
      '400',
      '401',
      '404',
    ]);
    expect(getResponseStatuses(SystemRoleController, 'remove')).toEqual([
      '200',
      '400',
      '401',
      '404',
    ]);
  });

  it('documents path params for admin RBAC resource routes', () => {
    expect(getPathParamNames(RoleController, 'getById')).toEqual(['roleId']);
    expect(getPathParamNames(RoleController, 'update')).toEqual(['roleId']);
    expect(getPathParamNames(RoleController, 'setPermissions')).toEqual(['roleId']);
    expect(getPathParamNames(RoleController, 'deactivate')).toEqual(['roleId']);
    expect(getPathParamNames(RoleController, 'reactivate')).toEqual(['roleId']);

    expect(getPathParamNames(SystemUserController, 'getById')).toEqual(['systemUserId']);
    expect(getPathParamNames(SystemUserController, 'update')).toEqual(['systemUserId']);
    expect(getPathParamNames(SystemUserController, 'resetPassword')).toEqual(['systemUserId']);
    expect(getPathParamNames(SystemUserController, 'deactivate')).toEqual(['systemUserId']);
    expect(getPathParamNames(SystemUserController, 'reactivate')).toEqual(['systemUserId']);
    expect(getPathParamNames(SystemUserController, 'forceTotp')).toEqual(['systemUserId']);
    expect(getPathParamNames(SystemUserController, 'getScopeAccess')).toEqual(['systemUserId']);
    expect(getPathParamNames(SystemUserController, 'setScopeAccess')).toEqual(['systemUserId']);

    expect(getPathParamNames(SystemRoleController, 'findOne')).toEqual(['systemRoleId']);
    expect(getPathParamNames(SystemRoleController, 'update')).toEqual(['systemRoleId']);
    expect(getPathParamNames(SystemRoleController, 'remove')).toEqual(['systemRoleId']);
  });

  it('documents request DTO properties for role and system-user mutations', () => {
    expect(getDocumentedDtoProperties(CreateRoleDto)).toEqual([
      'code',
      'description',
      'nameEn',
      'nameJa',
      'nameZh',
      'permissionIds',
    ]);
    expect(getDocumentedDtoProperties(UpdateRoleDto)).toEqual([
      'description',
      'nameEn',
      'nameJa',
      'nameZh',
      'version',
    ]);
    expect(getDocumentedDtoProperties(SetPermissionsDto)).toEqual(['permissionIds', 'version']);
    expect(getDocumentedDtoProperties(RoleActivationDto)).toEqual(['version']);

    expect(getDocumentedDtoProperties(CreateUserDto)).toEqual([
      'displayName',
      'email',
      'forceReset',
      'password',
      'phone',
      'preferredLanguage',
      'username',
    ]);
    expect(getDocumentedDtoProperties(UpdateUserDto)).toEqual([
      'avatarUrl',
      'displayName',
      'phone',
      'preferredLanguage',
    ]);
    expect(getDocumentedDtoProperties(ResetPasswordDto)).toEqual([
      'forceReset',
      'newPassword',
      'notifyUser',
    ]);
    expect(getDocumentedDtoProperties(SetScopeAccessDto)).toEqual(['accesses']);
  });
});
