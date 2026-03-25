import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import {
  PERMISSIONS_KEY,
  RequirePermissions,
} from './require-permissions.decorator';

describe('RequirePermissions', () => {
  it('accepts catalog-backed resources and alias actions', () => {
    class TestController {
      @RequirePermissions({ resource: 'customer.export', action: 'create' })
      handler() {}
    }

    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, TestController.prototype.handler),
    ).toEqual([{ resource: 'customer.export', action: 'create' }]);
  });

  it('rejects unknown RBAC resource codes at declaration time', () => {
    expect(() =>
      RequirePermissions({ resource: 'config.unknown' as any, action: 'read' }),
    ).toThrow('Unknown RBAC resource code: config.unknown');
  });

  it('rejects unsupported action/resource combinations at declaration time', () => {
    expect(() =>
      RequirePermissions({ resource: 'log.change_log', action: 'write' as any }),
    ).toThrow(
      'Unsupported RBAC permission log.change_log:write (checked as log.change_log:write). Supported actions: read',
    );
  });
});
