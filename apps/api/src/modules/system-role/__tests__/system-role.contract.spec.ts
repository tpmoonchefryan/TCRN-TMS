// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { CreateSystemRoleSchema, UpdateSystemRoleSchema } from '@tcrn/shared';
import { describe, expect, it } from 'vitest';

const roleName = {
  en: 'Export Deny',
  zh_HANS: '导出拒绝',
  zh_HANT: '匯出拒絕',
  ja: 'エクスポート拒否',
  ko: '내보내기 거부',
  fr: "Refus d'exportation",
};

describe('SystemRole contract schemas', () => {
  it('accepts optional permission effects in create payloads', () => {
    const result = CreateSystemRoleSchema.parse({
      code: 'EXPORT_DENY',
      name: roleName,
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

  it('treats update payloads as compatibility-only and strips mutation fields', () => {
    const result = UpdateSystemRoleSchema.parse({
      compatibilityOnly: true,
      name: { en: 'Updated Role' },
      permissions: [{ resource: 'customer.export', action: 'read', effect: 'grant' }],
    });

    expect(result).toEqual({ compatibilityOnly: true });
  });

  it('rejects resource codes outside the shared RBAC catalog', () => {
    const result = CreateSystemRoleSchema.safeParse({
      code: 'INVALID_RESOURCE_ROLE',
      name: roleName,
      permissions: [{ resource: 'config.unknown', action: 'read' }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects non-canonical permission actions in role payloads', () => {
    const result = CreateSystemRoleSchema.safeParse({
      code: 'INVALID_ACTION_ROLE',
      name: roleName,
      permissions: [{ resource: 'customer.export', action: 'create' }],
    });

    expect(result.success).toBe(false);
  });
});
