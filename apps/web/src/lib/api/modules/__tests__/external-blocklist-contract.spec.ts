// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { describe, expect, it } from 'vitest';

import {
  toExternalBlocklistListQuery,
  toExternalBlocklistOwnerScope,
  toExternalBlocklistScopePayload,
} from '@/lib/api/modules/external-blocklist-contract';

describe('externalBlocklistContract', () => {
  it('maps tenant owner scope without ownerId', () => {
    expect(toExternalBlocklistOwnerScope('tenant')).toEqual({
      ownerType: 'tenant',
    });
  });

  it('requires ownerId for subsidiary and talent owner scopes', () => {
    expect(toExternalBlocklistOwnerScope('subsidiary')).toBeNull();
    expect(toExternalBlocklistOwnerScope('talent')).toBeNull();
    expect(toExternalBlocklistOwnerScope('subsidiary', 'sub-1')).toEqual({
      ownerType: 'subsidiary',
      ownerId: 'sub-1',
    });
    expect(toExternalBlocklistOwnerScope('talent', 'talent-1')).toEqual({
      ownerType: 'talent',
      ownerId: 'talent-1',
    });
  });

  it('maps tenant scope payload without scopeId', () => {
    expect(toExternalBlocklistScopePayload('tenant')).toEqual({
      scopeType: 'tenant',
    });
  });

  it('requires scopeId for subsidiary and talent scope payloads', () => {
    expect(toExternalBlocklistScopePayload('subsidiary')).toBeNull();
    expect(toExternalBlocklistScopePayload('talent')).toBeNull();
    expect(toExternalBlocklistScopePayload('subsidiary', 'sub-1')).toEqual({
      scopeType: 'subsidiary',
      scopeId: 'sub-1',
    });
    expect(toExternalBlocklistScopePayload('talent', 'talent-1')).toEqual({
      scopeType: 'talent',
      scopeId: 'talent-1',
    });
  });

  it('builds list queries with normalized scope rules', () => {
    expect(
      toExternalBlocklistListQuery('tenant', 'tenant-ignored', {
        includeInherited: true,
        includeDisabled: false,
      }),
    ).toEqual({
      scopeType: 'tenant',
      includeInherited: true,
      includeDisabled: false,
    });

    expect(
      toExternalBlocklistListQuery('subsidiary', 'sub-1', {
        includeInherited: true,
        category: 'social',
      }),
    ).toEqual({
      scopeType: 'subsidiary',
      scopeId: 'sub-1',
      includeInherited: true,
      category: 'social',
    });
  });
});
