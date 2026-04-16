// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@tcrn/database';
import {
  type CreateSystemRoleInput,
  ErrorCodes,
  type RbacRolePolicyEffect,
  resolveRbacPermission,
  type RolePermissionInput,
  type UpdateSystemRoleInput,
} from '@tcrn/shared';

import { DatabaseService } from '../database/database.service';

@Injectable()
export class SystemRoleService {
  constructor(private db: DatabaseService) {}

  async create(createDto: CreateSystemRoleInput) {
    const { permissions, ...roleData } = createDto;

    const existing = await this.db.getPrisma().role.findUnique({
      where: { code: createDto.code },
    });

    if (existing) {
      throw new BadRequestException(`Role code '${createDto.code}' already exists`);
    }

    return this.db.getPrisma().$transaction(async (tx) => {
      // 1. Create Role
      const role = await tx.role.create({
        data: {
          ...roleData,
          isSystem: true,
        },
      });

      // 2. Handle Permissions
      if (permissions && permissions.length > 0) {
        await this.assignPermissions(tx, role.id, permissions);
      }

      return role;
    });
  }

  async findAll(filters?: { isActive?: boolean; isSystem?: boolean; search?: string }) {
    // Build where clause based on filters
    const where: Prisma.RoleWhereInput = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.isSystem !== undefined) {
      where.isSystem = filters.isSystem;
    }

    if (filters?.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { nameEn: { contains: filters.search, mode: 'insensitive' } },
        { nameZh: { contains: filters.search, mode: 'insensitive' } },
        { nameJa: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Return roles with optional filters, sorted by isSystem desc, then by code
    const roles = await this.db.getPrisma().role.findMany({
      where,
      orderBy: [
        { isSystem: 'desc' },
        { code: 'asc' },
      ],
      include: {
        _count: {
          select: {
            userRoles: true,
            rolePolicies: true,
          },
        },
      },
    });

    // Transform _count to expected format
    return roles.map((role) => ({
      ...role,
      permissionCount: role._count?.rolePolicies ?? 0,
      userCount: role._count?.userRoles ?? 0,
      _count: undefined,
    }));
  }

  async findOne(id: string) {
    const role = await this.db.getPrisma().role.findUnique({
      where: { id },
      include: {
         rolePolicies: {
           include: {
             policy: {
               include: {
                 resource: true
               }
             }
           }
         }
      }
    });

    if (!role) return null;

    // Transform rolePolicies to permissions array for frontend
    const permissions = role.rolePolicies.map((rp) => ({
      resource: rp.policy.resource.code,
      action: rp.policy.action,
      effect: rp.effect,
    }));

    return {
      ...role,
      permissions,
      permissionCount: permissions.length,
      rolePolicies: undefined,
    };
  }

  async update(id: string, updateDto: UpdateSystemRoleInput) {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'System role not found',
      });
    }

    const { permissions, ...roleData } = updateDto;

    return this.db.getPrisma().$transaction(async (tx) => {
      // 1. Update Role basic info
      const role = await tx.role.update({
        where: { id },
        data: roleData,
      });

      // 2. Update Permissions if provided
      if (permissions) {
        // Delete existing
        await tx.rolePolicy.deleteMany({
          where: { roleId: id },
        });

        // Assign new
        if (permissions.length > 0) {
          await this.assignPermissions(tx, id, permissions);
        }
      }

      return role;
    });
  }

  async remove(id: string) {
    // Check if role is in use
    const role = await this.db.getPrisma().role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { userRoles: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'System role not found',
      });
    }

    if (role && role._count.userRoles > 0) {
      throw new BadRequestException('Cannot delete role that is assigned to users');
    }

    return this.db.getPrisma().role.delete({
      where: { id },
    });
  }

  /**
   * Helper to resolve policies and create RolePolicy relations
   * Now supports three-state permissions: grant, deny, unset
   */
  private async assignPermissions(
    tx: Prisma.TransactionClient,
    roleId: string,
    permissions: RolePermissionInput[],
  ) {
    const normalizedPermissions = permissions.map((permission) => {
      const resolved = resolveRbacPermission(permission.resource, permission.action);

      return {
        ...permission,
        resource: resolved.resourceCode,
        action: resolved.checkedAction,
      };
    });

    // Find all matching policies (policy table no longer has effect field)
    const policies = await tx.policy.findMany({
      where: {
        OR: normalizedPermissions.map((permission) => ({
          action: permission.action,
          resource: {
            code: permission.resource,
          },
        })),
      },
      include: {
        resource: { select: { code: true } },
      },
    });

    if (policies.length !== normalizedPermissions.length) {
      const availablePolicyKeys = new Set(
        policies.map((policy: { action: string; resource: { code: string } }) =>
          `${policy.resource.code}:${policy.action}`),
      );

      const missingPermission = normalizedPermissions.find(
        (permission) => !availablePolicyKeys.has(`${permission.resource}:${permission.action}`),
      );

      if (missingPermission) {
        throw new BadRequestException(
          `RBAC policy ${missingPermission.resource}:${missingPermission.action} is missing from the database contract`,
        );
      }
    }

    // Create a map for quick lookup of policy by resource:action
    const policyMap = new Map<string, string>();
    for (const policy of policies) {
      const key = `${policy.resource.code}:${policy.action}`;
      policyMap.set(key, policy.id);
    }

    // Create RolePolicy entries with effect
    const rolePolicyData: Array<{
      roleId: string;
      policyId: string;
      effect: RbacRolePolicyEffect;
    }> = [];
    for (const permission of normalizedPermissions) {
      const key = `${permission.resource}:${permission.action}`;
      const policyId = policyMap.get(key);
      if (policyId) {
        rolePolicyData.push({
          roleId,
          policyId,
          effect: permission.effect ?? 'grant',
        });
      }
    }

    if (rolePolicyData.length > 0) {
      await tx.rolePolicy.createMany({
        data: rolePolicyData,
      });
    }
  }
}
