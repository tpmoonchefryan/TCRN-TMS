// SPDX-License-Identifier: Apache-2.0
import { z } from 'zod';

import {
  RBAC_ACTION_INPUTS,
  RBAC_RESOURCE_CODES,
} from '../../rbac/catalog';
import {
  ROLE_CAPABILITY_PACK_CODES,
  ROLE_PERMISSION_STATES,
} from '../../rbac/role-capability-packs';

export const RolePermissionStateSchema = z.enum(ROLE_PERMISSION_STATES);

export const RoleCapabilityPackStateInputSchema = z.object({
  packCode: z.enum(ROLE_CAPABILITY_PACK_CODES),
  state: RolePermissionStateSchema,
});

export const RoleRawPermissionStateInputSchema = z.object({
  resource: z.enum(RBAC_RESOURCE_CODES),
  action: z.enum(RBAC_ACTION_INPUTS),
  state: RolePermissionStateSchema,
});

export const RoleMutationPermissionsInputSchema = z.object({
  capabilityPackStates: z.array(RoleCapabilityPackStateInputSchema).optional(),
  rawPermissionStates: z.array(RoleRawPermissionStateInputSchema).optional(),
});

export type RolePermissionStateSchemaInput = z.infer<typeof RolePermissionStateSchema>;
export type RoleCapabilityPackStateSchemaInput = z.infer<
  typeof RoleCapabilityPackStateInputSchema
>;
export type RoleRawPermissionStateSchemaInput = z.infer<
  typeof RoleRawPermissionStateInputSchema
>;
export type RoleMutationPermissionsSchemaInput = z.infer<
  typeof RoleMutationPermissionsInputSchema
>;
