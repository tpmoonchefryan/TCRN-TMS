// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ActionType } from '@tcrn/shared';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAuthStore = vi.fn();

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

import { usePermission } from '@/hooks/use-permission';

describe('usePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('grants access from backend effective permissions', () => {
    mockUseAuthStore.mockReturnValue({
      user: { roles: [{ code: 'TENANT_ADMIN' }] },
      isAuthenticated: true,
      effectivePermissions: {
        'customer.profile:read': 'grant',
      },
    });

    const { result } = renderHook(() => usePermission());

    expect(result.current.hasPermission('customer.profile', ActionType.READ)).toBe(true);
  });

  it('applies explicit deny before resource admin grant', () => {
    mockUseAuthStore.mockReturnValue({
      user: { roles: [{ code: 'TENANT_ADMIN' }] },
      isAuthenticated: true,
      effectivePermissions: {
        'customer.profile:write': 'deny',
        'customer.profile:admin': 'grant',
      },
    });

    const { result } = renderHook(() => usePermission());

    expect(result.current.hasPermission('customer.profile', ActionType.WRITE)).toBe(false);
  });

  it('fails closed when backend permissions are missing instead of trusting hardcoded role fallbacks', () => {
    mockUseAuthStore.mockReturnValue({
      user: { roles: [{ code: 'TENANT_ADMIN' }] },
      isAuthenticated: true,
      effectivePermissions: null,
    });

    const { result } = renderHook(() => usePermission());

    expect(result.current.hasPermission('customer.profile', ActionType.READ)).toBe(false);
  });

  it('still supports explicit legacy permission lists from the auth payload', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        roles: [{ code: 'TENANT_ADMIN' }],
        permissions: ['customer.profile:read'],
      },
      isAuthenticated: true,
      effectivePermissions: null,
    });

    const { result } = renderHook(() => usePermission());

    expect(result.current.hasPermission('customer.profile', ActionType.READ)).toBe(true);
    expect(result.current.getPermittedActions('customer.profile')).toEqual([ActionType.READ]);
  });
});
