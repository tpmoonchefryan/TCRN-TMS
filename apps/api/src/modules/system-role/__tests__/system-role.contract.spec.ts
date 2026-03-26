// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { CreateSystemRoleSchema, UpdateSystemRoleSchema } from '@tcrn/shared';
import { describe, expect, it } from 'vitest';

describe('SystemRole contract schemas', () => {
  it('accepts optional permission effects in create payloads', () => {
    const result = CreateSystemRoleSchema.parse({
      code: 'EXPORT_DENY',
      nameEn: 'Export Deny',
      permissions: [
        { resource: 'customer.export', action: 'read', effect: 'deny' },
        { resource: 'customer.export', action: 'write' },
      ],
    });

    expect(result.permissions).toEqual([
      { resource: 'customer.export', action: 'read', effect: 'deny' },
      { resource: 'customer.export', action: 'write' },
    ]);
  });

  it('does not require version in update payloads', () => {
    const result = UpdateSystemRoleSchema.parse({
      nameEn: 'Updated Role',
      permissions: [{ resource: 'customer.export', action: 'read', effect: 'grant' }],
    });

    expect(result).toEqual({
      nameEn: 'Updated Role',
      permissions: [{ resource: 'customer.export', action: 'read', effect: 'grant' }],
    });
  });
});
