// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { describe, expect, it, vi } from 'vitest';

import {
  createAuthenticatedSessionTransition,
  createPendingTenantAuthState,
} from '../auth-session-transitions';
import type { AuthUser } from '../auth-store.types';

const createUser = (tenantId: string): AuthUser => ({
  id: 'user-1',
  username: 'admin',
  email: 'user@example.com',
  tenant: {
    id: tenantId,
    code: 'TENANT_A',
    name: 'Tenant A',
  },
});

describe('auth-session-transitions', () => {
  it('creates pending tenant auth state for AC login gates', () => {
    expect(createPendingTenantAuthState('ac')).toEqual({
      tenantCode: 'ac',
      isAcTenant: true,
      isLoading: false,
    });
  });

  it('creates an authenticated session transition and stores the access token', () => {
    const setAccessToken = vi.fn();

    expect(
      createAuthenticatedSessionTransition({
        accessToken: 'fresh-token',
        user: createUser('tenant-live'),
        tenantCode: 'TENANT_A',
        tenantId: 'tenant-live',
        setAccessToken,
      })
    ).toEqual({
      tenantCode: 'TENANT_A',
      user: createUser('tenant-live'),
      tenantId: 'tenant-live',
      isAuthenticated: true,
      isAcTenant: false,
      sessionBootstrapStatus: 'idle',
      sessionBootstrapErrors: null,
      isLoading: false,
    });

    expect(setAccessToken).toHaveBeenCalledWith('fresh-token');
  });
});
