// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// System Role Module Zod Schemas

import { z } from 'zod';

// ============================================================================
// Schemas
// ============================================================================
export const RolePermissionSchema = z.object({
  resource: z.string().min(1, 'Resource is required'),
  action: z.string().min(1, 'Action is required'),
});

export const CreateSystemRoleSchema = z.object({
  code: z.string().min(1).max(32),
  nameEn: z.string().min(1).max(128),
  nameZh: z.string().max(128).optional(),
  nameJa: z.string().max(128).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  permissions: z.array(RolePermissionSchema).optional(),
});

export const UpdateSystemRoleSchema = z.object({
  nameEn: z.string().max(128).optional(),
  nameZh: z.string().max(128).optional(),
  nameJa: z.string().max(128).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  permissions: z.array(RolePermissionSchema).optional(),
  version: z.number().int(),
});

export type RolePermissionInput = z.infer<typeof RolePermissionSchema>;
export type CreateSystemRoleInput = z.infer<typeof CreateSystemRoleSchema>;
export type UpdateSystemRoleInput = z.infer<typeof UpdateSystemRoleSchema>;
