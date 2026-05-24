// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// System Role Module Zod Schemas
import { z } from 'zod';

import {
  RBAC_CANONICAL_ACTIONS,
  RBAC_RESOURCE_CODES,
  RBAC_ROLE_POLICY_EFFECTS,
} from '../../rbac/catalog';
import { LocalizedTextSchema, PartialLocalizedTextSchema } from '../common.schema';

// ============================================================================
// Schemas
// ============================================================================
export const RolePermissionSchema = z.object({
  resource: z.enum(RBAC_RESOURCE_CODES),
  action: z.enum(RBAC_CANONICAL_ACTIONS),
  effect: z.enum(RBAC_ROLE_POLICY_EFFECTS).optional(),
});

export const CreateSystemRoleSchema = z.object({
  code: z.string().min(1).max(32),
  name: LocalizedTextSchema,
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  permissions: z.array(RolePermissionSchema).optional(),
});

export const UpdateSystemRoleSchema = z.object({
  name: PartialLocalizedTextSchema.optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  permissions: z.array(RolePermissionSchema).optional(),
});

export type RolePermissionInput = z.infer<typeof RolePermissionSchema>;
export type CreateSystemRoleInput = z.infer<typeof CreateSystemRoleSchema>;
export type UpdateSystemRoleInput = z.infer<typeof UpdateSystemRoleSchema>;
