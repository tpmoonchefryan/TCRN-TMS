// SPDX-License-Identifier: Apache-2.0
import { normalizePermissionAction, type PermissionActionInput, type RbacResourceCode } from './catalog';
import {
  ROLE_CAPABILITY_PACK_BY_CODE,
  type RoleCapabilityPackCode,
  type RoleCapabilityPackDefinition,
  type RoleCapabilityPackState,
  type RolePermissionState,
} from './role-capability-packs';

export interface RoleCapabilityPackStateInput {
  packCode: RoleCapabilityPackCode;
  state: RolePermissionState;
}

export interface RoleRawPermissionStateInput {
  resource: RbacResourceCode;
  action: PermissionActionInput;
  state: RolePermissionState;
}

export interface RoleMutationPermissionsInput {
  capabilityPackStates?: readonly RoleCapabilityPackStateInput[];
  rawPermissionStates?: readonly RoleRawPermissionStateInput[];
}

export function buildRolePermissionStateKey(
  resource: string,
  action: PermissionActionInput
): string {
  return `${resource}:${normalizePermissionAction(action)}`;
}

export function expandCapabilityPackState(
  pack: RoleCapabilityPackDefinition,
  state: RolePermissionState
): RoleRawPermissionStateInput[] {
  return pack.permissions.map((permission) => {
    const nextState =
      state === 'grant' && permission.mode === 'fixedDeny' ? ('deny' as const) : state;

    return {
      resource: permission.resource,
      action: permission.action,
      state: nextState,
    };
  });
}

export function expandRoleCapabilityPackStates(
  inputs: readonly RoleCapabilityPackStateInput[] = []
): RoleRawPermissionStateInput[] {
  return inputs.flatMap((input) => {
    const pack = ROLE_CAPABILITY_PACK_BY_CODE.get(input.packCode);

    if (!pack) {
      throw new Error(`Unknown role capability pack: ${input.packCode}`);
    }

    return expandCapabilityPackState(pack, input.state);
  });
}

export function mergeRolePermissionStateInputs(
  input: RoleMutationPermissionsInput
): RoleRawPermissionStateInput[] {
  const merged = new Map<string, RoleRawPermissionStateInput>();

  for (const entry of expandRoleCapabilityPackStates(input.capabilityPackStates)) {
    merged.set(buildRolePermissionStateKey(entry.resource, entry.action), entry);
  }

  for (const entry of input.rawPermissionStates ?? []) {
    merged.set(buildRolePermissionStateKey(entry.resource, entry.action), {
      ...entry,
      action: normalizePermissionAction(entry.action),
    });
  }

  return [...merged.values()];
}

export function deriveCapabilityPackState(
  pack: RoleCapabilityPackDefinition,
  rawStates: readonly RoleRawPermissionStateInput[]
): RoleCapabilityPackState {
  const stateByKey = new Map(
    rawStates.map((entry) => [
      buildRolePermissionStateKey(entry.resource, entry.action),
      entry.state,
    ])
  );

  const states = pack.permissions.map((permission) => {
    const state =
      stateByKey.get(buildRolePermissionStateKey(permission.resource, permission.action)) ??
      'unset';

    if (permission.mode === 'fixedDeny' && state === 'deny') {
      return 'grant';
    }

    return state;
  });

  const [firstState] = states;

  if (!firstState) {
    return 'unset';
  }

  return states.every((state) => state === firstState) ? firstState : 'mixed';
}

export function hasSensitiveRoleCapabilityState(
  pack: RoleCapabilityPackDefinition,
  state: RolePermissionState
): boolean {
  return state !== 'unset' && (pack.riskTier === 'sensitive' || pack.riskTier === 'critical');
}
