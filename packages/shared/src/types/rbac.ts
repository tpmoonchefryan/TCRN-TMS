// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { PermissionAction, RbacRolePolicyEffect } from '../rbac/catalog';
import type { PolicyEffect } from './enums';

export interface Permission {
  id: string;
  resourceCode: string;
  action: PermissionAction;
  effect: PolicyEffect;
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
  code: string;
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
  resourceCode: string;
  action: PermissionAction;
  effect: RbacRolePolicyEffect;
  name: string;
}

export interface SystemRolePermission {
  resource: string;
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
