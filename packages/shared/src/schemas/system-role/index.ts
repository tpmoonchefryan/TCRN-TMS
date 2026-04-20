// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// System Role Module Zod Schemas

import { z } from 'zod';

import {
  RBAC_CANONICAL_ACTIONS,
  RBAC_RESOURCE_CODES,
  RBAC_ROLE_POLICY_EFFECTS,
} from '../../rbac/catalog';

// ============================================================================
// Schemas
// ============================================================================
export const RolePermissionSchema = z.object({
  resource: z.enum(RBAC_RESOURCE_CODES),
  action: z.enum(RBAC_CANONICAL_ACTIONS),
  effect: z.enum(RBAC_ROLE_POLICY_EFFECTS).optional(),
});

export const RoleTranslationsSchema = z.record(z.string(), z.string().max(128));

export const CreateSystemRoleSchema = z.object({
  code: z.string().min(1).max(32),
  nameEn: z.string().min(1).max(128),
  nameZh: z.string().max(128).optional(),
  nameJa: z.string().max(128).optional(),
  translations: RoleTranslationsSchema.optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  permissions: z.array(RolePermissionSchema).optional(),
});

export const UpdateSystemRoleSchema = z.object({
  nameEn: z.string().max(128).optional(),
  nameZh: z.string().max(128).optional(),
  nameJa: z.string().max(128).optional(),
  translations: RoleTranslationsSchema.optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  permissions: z.array(RolePermissionSchema).optional(),
});

export type RolePermissionInput = z.infer<typeof RolePermissionSchema>;
export type CreateSystemRoleInput = z.infer<typeof CreateSystemRoleSchema>;
export type UpdateSystemRoleInput = z.infer<typeof UpdateSystemRoleSchema>;
