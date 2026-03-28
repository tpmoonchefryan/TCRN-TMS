// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type {
  CheckPermissionsResponse,
  MyPermissionsResponse,
  Permission,
  PermissionCheckRequest,
  ResourceDefinition,
} from '@tcrn/shared';

import { apiClient } from '../core';

export const permissionApi = {
  list: (params?: { resourceCode?: string; action?: string; isActive?: boolean }) =>
    apiClient.get<Permission[]>('/api/v1/permissions', params),

  getResources: () => apiClient.get<ResourceDefinition[]>('/api/v1/permissions/resources'),

  check: (checks: PermissionCheckRequest[]) =>
    apiClient.post<CheckPermissionsResponse>('/api/v1/permissions/check', { checks }),

  getMyPermissions: (params?: { scopeType?: string; scopeId?: string }) =>
    apiClient.get<MyPermissionsResponse>('/api/v1/users/me/permissions', params),
};
