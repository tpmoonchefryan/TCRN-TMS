// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';

import {
  INITIAL_ADMIN_ROLE_CODE,
  RBAC_POLICY_DEFINITIONS,
  RBAC_RESOURCES,
  RBAC_ROLE_TEMPLATES,
} from '../catalog';
import { ROLE_CAPABILITY_PACKS } from '../role-capability-packs';
import {
  buildRolePermissionStateKey,
  deriveCapabilityPackState,
  expandCapabilityPackState,
  expandRoleCapabilityPackStates,
  mergeRolePermissionStateInputs,
} from '../role-capability-utils';

function requireCapabilityPack(code: string) {
  const pack = ROLE_CAPABILITY_PACKS.find((entry) => entry.code === code);

  expect(pack).toBeDefined();

  if (!pack) {
    throw new Error(`Capability pack ${code} was not defined`);
  }

  return pack;
}

describe('role capability pack contract', () => {
  it('defines exactly one built-in Initial Admin role with every current RBAC policy', () => {
    const systemRoles = RBAC_ROLE_TEMPLATES.filter((role) => role.isSystem);
    const initialAdmin = systemRoles[0];

    expect(systemRoles.map((role) => role.code)).toEqual([INITIAL_ADMIN_ROLE_CODE]);
    expect(
      new Set(
        initialAdmin.permissions.flatMap((permission) =>
          permission.actions.map((action) => `${permission.resourceCode}:${action}`)
        )
      )
    ).toEqual(
      new Set(
        RBAC_POLICY_DEFINITIONS.map(
          (policyDefinition) => `${policyDefinition.resourceCode}:${policyDefinition.action}`
        )
      )
    );
  });

  it('covers every RBAC resource through at least one capability pack', () => {
    const coveredResources = new Set(
      ROLE_CAPABILITY_PACKS.flatMap((pack) =>
        pack.permissions.map((permission) => permission.resource)
      )
    );

    expect([...coveredResources].sort()).toEqual(
      RBAC_RESOURCES.map((resource) => resource.code).sort()
    );
  });

  it('defines complete metadata for each capability pack', () => {
    for (const pack of ROLE_CAPABILITY_PACKS) {
      expect(pack.label.en).toBeTruthy();
      expect(pack.label.zh_HANS).toBeTruthy();
      expect(pack.description.en).toBeTruthy();
      expect(pack.rowDescription.en).toBeTruthy();
      expect(pack.category).toBeTruthy();
      expect(pack.riskTier).toMatch(/^(normal|sensitive|critical)$/);
      expect(pack.scopeTypes.length).toBeGreaterThan(0);
      expect(typeof pack.advancedOnly).toBe('boolean');
      expect(pack.bindingSource).toMatch(/^(explicit|derived|none)$/);

      if (pack.bindingSource === 'none') {
        expect(pack.apiBindings).toEqual([]);
        expect(pack.uiBindings).toEqual([]);
      }

      if (pack.riskTier !== 'normal') {
        expect(pack.sensitiveReason?.en).toBeTruthy();
      }
    }
  });

  it('expands fixed-deny entries when a capability pack is granted', () => {
    const roleDefinitionPack = requireCapabilityPack('role.role_definition.manage');
    const expanded = expandCapabilityPackState(roleDefinitionPack, 'grant');

    expect(expanded).toEqual(
      expect.arrayContaining([
        { resource: 'role', action: 'read', state: 'grant' },
        { resource: 'role', action: 'write', state: 'grant' },
        { resource: 'role', action: 'admin', state: 'grant' },
        { resource: 'role', action: 'delete', state: 'deny' },
      ])
    );
  });

  it('keeps deny and unset as first-class submitted states', () => {
    const expandedDeny = expandRoleCapabilityPackStates([
      { packCode: 'role.customer.pii.manage', state: 'deny' },
    ]);
    const expandedUnset = expandRoleCapabilityPackStates([
      { packCode: 'role.customer.pii.manage', state: 'unset' },
    ]);

    expect(new Set(expandedDeny.map((entry) => entry.state))).toEqual(new Set(['deny']));
    expect(new Set(expandedUnset.map((entry) => entry.state))).toEqual(new Set(['unset']));
  });

  it('derives mixed pack state for partially overridden raw permissions', () => {
    const customerPack = requireCapabilityPack('role.customer.profile.manage');

    expect(
      deriveCapabilityPackState(customerPack, [
        { resource: 'customer.profile', action: 'read', state: 'grant' },
        { resource: 'customer.profile', action: 'write', state: 'deny' },
      ])
    ).toBe('mixed');
  });

  it('lets raw permission states override capability pack expansion', () => {
    const merged = mergeRolePermissionStateInputs({
      capabilityPackStates: [{ packCode: 'role.customer.pii.manage', state: 'grant' }],
      rawPermissionStates: [{ resource: 'customer.pii', action: 'read', state: 'deny' }],
    });
    const stateByKey = new Map(
      merged.map((entry) => [buildRolePermissionStateKey(entry.resource, entry.action), entry.state])
    );

    expect(stateByKey.get('customer.pii:read')).toBe('deny');
    expect(stateByKey.get('customer.pii:write')).toBe('grant');
  });
});
