// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { PrismaClient } from '@prisma/client';
import {
  RBAC_POLICY_DEFINITIONS,
  RBAC_RESOURCES,
  RBAC_ROLE_TEMPLATES,
  type PermissionAction,
  type RbacRolePolicyEffect,
} from '../../../shared/src/rbac/catalog';

export {
  RBAC_POLICY_DEFINITIONS,
  RBAC_RESOURCES,
  RBAC_ROLE_TEMPLATES,
};

export interface RbacRolePermissionEntry {
  roleCode: string;
  resourceCode: string;
  action: PermissionAction;
  effect: RbacRolePolicyEffect;
}

export const RBAC_ROLE_PERMISSION_ENTRIES: readonly RbacRolePermissionEntry[] =
  RBAC_ROLE_TEMPLATES.flatMap((role) =>
    role.permissions.flatMap((permission) =>
      permission.actions.map((action) => ({
        roleCode: role.code,
        resourceCode: permission.resourceCode,
        action,
        effect: permission.effect ?? 'grant',
      })),
    ),
  );

export async function seedRbacContract(prisma: PrismaClient): Promise<{
  resourceCount: number;
  policyCount: number;
  roleCount: number;
  rolePolicyCount: number;
}> {
  const resourceIds = new Map<string, string>();

  for (const resource of RBAC_RESOURCES) {
    const created = await prisma.resource.upsert({
      where: { code: resource.code },
      update: {
        code: resource.code,
        module: resource.module,
        nameEn: resource.nameEn,
        nameZh: resource.nameZh,
        nameJa: resource.nameJa,
        isActive: true,
        sortOrder: resource.sortOrder,
      },
      create: {
        code: resource.code,
        module: resource.module,
        nameEn: resource.nameEn,
        nameZh: resource.nameZh,
        nameJa: resource.nameJa,
        isActive: true,
        sortOrder: resource.sortOrder,
      },
    });

    resourceIds.set(resource.code, created.id);
  }

  for (const policy of RBAC_POLICY_DEFINITIONS) {
    const resourceId = resourceIds.get(policy.resourceCode);

    if (!resourceId) {
      throw new Error(`Missing resource for policy ${policy.resourceCode}:${policy.action}`);
    }

    await prisma.policy.upsert({
      where: {
        resourceId_action: {
          resourceId,
          action: policy.action,
        },
      },
      update: {
        isActive: true,
      },
      create: {
        resourceId,
        action: policy.action,
        isActive: true,
      },
    });
  }

  const roleIds = new Map<string, string>();

  for (const role of RBAC_ROLE_TEMPLATES) {
    const created = await prisma.role.upsert({
      where: { code: role.code },
      update: {
        code: role.code,
        nameEn: role.nameEn,
        nameZh: role.nameZh,
        nameJa: role.nameJa,
        description: role.description,
        isSystem: role.isSystem,
        isActive: true,
      },
      create: {
        code: role.code,
        nameEn: role.nameEn,
        nameZh: role.nameZh,
        nameJa: role.nameJa,
        description: role.description,
        isSystem: role.isSystem,
        isActive: true,
      },
    });

    roleIds.set(role.code, created.id);
  }

  const policies = await prisma.policy.findMany({
    include: { resource: true },
  });
  const policyIds = new Map(
    policies.map((policy) => [`${policy.resource.code}:${policy.action}`, policy.id]),
  );

  for (const entry of RBAC_ROLE_PERMISSION_ENTRIES) {
    const roleId = roleIds.get(entry.roleCode);
    const policyId = policyIds.get(`${entry.resourceCode}:${entry.action}`);

    if (!roleId || !policyId) {
      throw new Error(
        `Missing RBAC role-policy mapping for ${entry.roleCode} -> ${entry.resourceCode}:${entry.action}`,
      );
    }

    await prisma.rolePolicy.upsert({
      where: {
        roleId_policyId: {
          roleId,
          policyId,
        },
      },
      update: { effect: entry.effect },
      create: {
        roleId,
        policyId,
        effect: entry.effect,
      },
    });
  }

  return {
    resourceCount: RBAC_RESOURCES.length,
    policyCount: RBAC_POLICY_DEFINITIONS.length,
    roleCount: RBAC_ROLE_TEMPLATES.length,
    rolePolicyCount: RBAC_ROLE_PERMISSION_ENTRIES.length,
  };
}
