import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrivateShell } from '@/platform/routing/PrivateShell';
import { RuntimeLocaleProvider } from '@/platform/runtime/locale/locale-provider';
import type { BrowserSession } from '@/platform/runtime/session/session-provider';

const push = vi.fn();
const replace = vi.fn();
const recoverSession = vi.fn();
const logoutCurrentSession = vi.fn().mockResolvedValue(undefined);

const acSession: BrowserSession = {
  accessToken: 'token',
  tokenType: 'Bearer',
  expiresIn: 3600,
  authenticatedAt: '2026-04-17T10:00:00.000Z',
  tenantId: 'tenant-ac',
  tenantName: 'AC Tenant',
  tenantTier: 'ac',
  tenantCode: 'AC',
  user: {
    id: 'user-ac',
    username: 'operator',
    email: 'operator@example.com',
    displayName: 'Platform Operator',
    avatarUrl: null,
    preferredLanguage: 'en',
    totpEnabled: false,
    forceReset: false,
    passwordExpiresAt: null,
  },
};

const standardSession: BrowserSession = {
  accessToken: 'token',
  tokenType: 'Bearer',
  expiresIn: 3600,
  authenticatedAt: '2026-04-17T10:00:00.000Z',
  tenantId: 'tenant-1',
  tenantName: 'Moonshot Tenant',
  tenantTier: 'standard',
  tenantCode: 'MOON',
  user: {
    id: 'user-1',
    username: 'alice',
    email: 'alice@example.com',
    displayName: 'Alice',
    avatarUrl: null,
    preferredLanguage: 'en',
    totpEnabled: false,
    forceReset: false,
    passwordExpiresAt: null,
  },
};

let pathname = '/tenant/tenant-1/organization-structure';
let mockSession: BrowserSession | null = standardSession;
let mockStatus: 'booting' | 'anonymous' | 'authenticated' = 'authenticated';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    push,
    replace,
  }),
}));

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    status: mockStatus,
    session: mockSession,
    recoverSession,
    logoutCurrentSession,
  }),
}));

describe('PrivateShell', () => {
  beforeEach(() => {
    pathname = '/tenant/tenant-1/organization-structure';
    mockSession = standardSession;
    mockStatus = 'authenticated';
    push.mockReset();
    replace.mockReset();
    recoverSession.mockReset();
    logoutCurrentSession.mockReset();
    logoutCurrentSession.mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'en-US',
    });
  });

  it('redirects AC sessions back to the AC workspace instead of rendering a tenant private shell', async () => {
    pathname = '/tenant/tenant-ac/organization-structure';
    mockSession = acSession;

    render(
      <RuntimeLocaleProvider>
        <PrivateShell tenantId="tenant-ac">
          <div>Private content</div>
        </PrivateShell>
      </RuntimeLocaleProvider>,
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/ac/tenant-ac/tenants');
    });
  });

  it('still routes to login when tenant-shell logout rejects after clearing the local session', async () => {
    logoutCurrentSession.mockRejectedValueOnce(new Error('logout failed'));

    render(
      <RuntimeLocaleProvider>
        <PrivateShell tenantId="tenant-1">
          <div>Private content</div>
        </PrivateShell>
      </RuntimeLocaleProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign Out' }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/login');
    });
  });

  it('passes the tenant recovery hint when restoring a private workspace from cookies only', async () => {
    mockStatus = 'anonymous';
    mockSession = null;
    recoverSession.mockResolvedValueOnce(true);

    render(
      <RuntimeLocaleProvider>
        <PrivateShell tenantId="tenant-1">
          <div>Private content</div>
        </PrivateShell>
      </RuntimeLocaleProvider>,
    );

    await waitFor(() => {
      expect(recoverSession).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        tenantTier: 'standard',
      });
    });
  });
});
