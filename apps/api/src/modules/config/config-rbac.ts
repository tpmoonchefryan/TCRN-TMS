// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { NotFoundException } from '@nestjs/common';
import type { PermissionActionInput, RbacResourceCode } from '@tcrn/shared';

import {
  type RequiredPermission,
  RequirePermissions,
  RequireResolvedPermissions,
} from '../../common/decorators/require-permissions.decorator';
import { CONFIG_TABLE_NAMES, type ConfigEntityType } from './config.types';

export const CONFIG_ENTITY_RESOURCE_MAP: Record<ConfigEntityType, RbacResourceCode> = {
  'channel-category': 'config.dictionary',
  'social-platform': 'config.platform_registry',
  'business-segment': 'config.dictionary',
  'communication-type': 'config.dictionary',
  'address-type': 'config.dictionary',
  'customer-status': 'config.customer_status',
  'reason-category': 'config.dictionary',
  'inactivation-reason': 'config.dictionary',
  'membership-class': 'config.membership',
  'membership-type': 'config.membership',
  'membership-level': 'config.membership',
  consent: 'config.dictionary',
  consumer: 'integration.consumer',
  'blocklist-entry': 'security.blocklist',
  'pii-service-config': 'config.pii_service',
  'profile-store': 'config.profile_store',
};

export function isValidConfigEntityType(type: string): type is ConfigEntityType {
  return type in CONFIG_TABLE_NAMES;
}

export function assertValidConfigEntityType(type: string): ConfigEntityType {
  if (!isValidConfigEntityType(type)) {
    throw new NotFoundException({
      code: 'ENTITY_TYPE_NOT_FOUND',
      message: `Entity type '${type}' not found`,
    });
  }

  return type;
}

export function getConfigEntityPermission(
  entityType: string,
  action: PermissionActionInput
): RequiredPermission {
  const validEntityType = assertValidConfigEntityType(entityType);

  return {
    resource: CONFIG_ENTITY_RESOURCE_MAP[validEntityType],
    action,
  };
}

export const RequireConfigEntityPermission = (action: PermissionActionInput) =>
  RequireResolvedPermissions((request) => [
    getConfigEntityPermission(
      Array.isArray(request.params.entityType)
        ? request.params.entityType[0] ?? ''
        : request.params.entityType,
      action
    ),
  ]);

export const RequirePlatformConfigPermission = (action: PermissionActionInput) =>
  RequirePermissions({ resource: 'config.platform_settings', action });
