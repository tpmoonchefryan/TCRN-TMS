// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { PermissionAction, RbacResourceCode, RbacRolePolicyEffect } from '../rbac/catalog';

export interface Permission {
  id: string;
  resourceCode: RbacResourceCode;
  action: PermissionAction;
  name?: string;
  description?: string | null;
  isSystem?: boolean;
  isActive?: boolean;
}

export interface LocalizedPermissionData extends Omit<Permission, 'name'> {
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceActionDefinition {
  code: RbacResourceCode;
  name: string;
  actions: PermissionAction[];
}

export interface ResourceDefinition {
  module: string;
  moduleName: string;
  resources: ResourceActionDefinition[];
}

export interface RolePermission {
  id: string;
  resourceCode: RbacResourceCode;
  action: PermissionAction;
  effect: RbacRolePolicyEffect;
  name: string;
}

export interface SystemRolePermission {
  resource: RbacResourceCode;
  action: PermissionAction;
  effect?: RbacRolePolicyEffect;
}

export interface SystemRoleRecord {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  permissionCount?: number;
  userCount?: number;
  permissions?: SystemRolePermission[];
}

export type RbacScopeType = 'tenant' | 'subsidiary' | 'talent';

export interface UserRoleAssignmentRole {
  id: string;
  code: string;
  name: string;
}

export interface UserRoleAssignmentGrantor {
  id: string;
  username: string | null;
}

export interface UserRoleAssignmentRecord {
  id: string;
  role: UserRoleAssignmentRole;
  scopeType: RbacScopeType;
  scopeId: string | null;
  scopeName: string | null;
  scopePath: string | null;
  inherit: boolean;
  grantedAt: string;
  grantedBy: UserRoleAssignmentGrantor | null;
  expiresAt: string | null;
}

export interface AssignUserRoleRequest {
  roleId?: string;
  roleCode?: string;
  scopeType: RbacScopeType;
  scopeId?: string | null;
  inherit: boolean;
  expiresAt?: string | null;
}

export interface AssignUserRoleResponse {
  id: string;
  userId: string;
  roleId: string;
  scopeType: RbacScopeType;
  scopeId: string | null;
  inherit: boolean;
  grantedAt: string;
  snapshotUpdateQueued: boolean;
}

export interface UpdateUserRoleAssignmentRequest {
  inherit?: boolean;
  expiresAt?: string | null;
}

export interface UpdateUserRoleAssignmentResponse {
  id: string;
  inherit: boolean;
  expiresAt: string | null;
  snapshotUpdateQueued: boolean;
}

export interface RemoveUserRoleAssignmentResponse {
  message: string;
  snapshotUpdateQueued: boolean;
}

export interface RoleSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissionCount: number;
  userCount: number;
  createdAt: string;
  version: number;
}

export interface RoleDetail {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  nameZh: string | null;
  nameJa: string | null;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissions: RolePermission[];
  createdAt: string;
  updatedAt: string;
  version: number;
  permissionCount?: number;
  userCount?: number;
}

export interface CreateRoleRequest {
  code: string;
  nameEn: string;
  nameZh?: string;
  nameJa?: string;
  description?: string;
  permissionIds: string[];
}

export interface UpdateRoleRequest {
  nameEn?: string;
  nameZh?: string;
  nameJa?: string;
  description?: string;
  version: number;
}
