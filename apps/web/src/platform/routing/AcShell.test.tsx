import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AcShell } from '@/platform/routing/AcShell';
import { RuntimeLocaleProvider } from '@/platform/runtime/locale/locale-provider';
import type { BrowserSession } from '@/platform/runtime/session/session-provider';

const push = vi.fn();
const replace = vi.fn();
const logoutCurrentSession = vi.fn().mockResolvedValue(undefined);
const recoverSession = vi.fn();

const baseSession: BrowserSession = {
  accessToken: 'token',
  tokenType: 'Bearer',
  expiresIn: 3600,
  authenticatedAt: '2026-04-17T10:00:00.000Z',
  tenantId: 'tenant-ac',
  tenantName: 'AC Tenant',
  tenantTier: 'ac',
  tenantCode: 'AC',
  user: {
    id: 'user-1',
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

let mockSession: BrowserSession | null = baseSession;
let mockStatus: 'booting' | 'anonymous' | 'authenticated' = 'authenticated';
let mockPathname = '/ac/tenant-ac/user-management';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
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

describe('AcShell', () => {
  beforeEach(() => {
    mockSession = baseSession;
    mockStatus = 'authenticated';
    mockPathname = '/ac/tenant-ac/user-management';
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

  it('uses runtime locale copy and routes account menu actions for ac users', async () => {
    render(
      <RuntimeLocaleProvider>
        <AcShell tenantId="tenant-ac">
          <div>AC content</div>
        </AcShell>
      </RuntimeLocaleProvider>,
    );

    expect(
      within(screen.getByRole('navigation', { name: 'Main navigation' })).getByText('User Management'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Main navigation' })).queryByText('My Profile'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Change language/i }));
    fireEvent.click(screen.getByRole('option', { name: '日本語' }));

    expect(
      within(screen.getByRole('navigation', { name: 'メインナビゲーション' })).getByText('ユーザー管理'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'メインナビゲーション' })).queryByText('マイプロフィール'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'メインナビゲーション' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'アカウントメニュー' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'マイプロフィール' }));
    expect(push).toHaveBeenCalledWith('/ac/tenant-ac/profile');

    fireEvent.click(screen.getByRole('button', { name: 'アカウントメニュー' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'パスワードとセキュリティ' }));
    expect(push).toHaveBeenCalledWith('/ac/tenant-ac/profile/security');

    fireEvent.click(screen.getByRole('button', { name: 'アカウントメニュー' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'サインアウト' }));
    expect(logoutCurrentSession).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/login');
    });
  });

  it('still routes to login when the logout request rejects after clearing the local session', async () => {
    logoutCurrentSession.mockRejectedValueOnce(new Error('logout failed'));

    render(
      <RuntimeLocaleProvider>
        <AcShell tenantId="tenant-ac">
          <div>AC content</div>
        </AcShell>
      </RuntimeLocaleProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign Out' }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/login');
    });
  });

  it('passes the AC recovery hint when only cookie-backed recovery is available', async () => {
    mockStatus = 'anonymous';
    mockSession = null;
    recoverSession.mockResolvedValueOnce(true);

    render(
      <RuntimeLocaleProvider>
        <AcShell tenantId="tenant-ac">
          <div>AC content</div>
        </AcShell>
      </RuntimeLocaleProvider>,
    );

    await waitFor(() => {
      expect(recoverSession).toHaveBeenCalledWith({
        tenantId: 'tenant-ac',
        tenantTier: 'ac',
      });
    });
  });

  it('does not highlight AC sidebar navigation for account security routes', () => {
    mockPathname = '/ac/tenant-ac/profile/security';

    render(
      <RuntimeLocaleProvider>
        <AcShell tenantId="tenant-ac">
          <div>AC profile security</div>
        </AcShell>
      </RuntimeLocaleProvider>,
    );

    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });

    expect(within(navigation).queryByText('My Profile')).not.toBeInTheDocument();
    expect(within(navigation).queryByRole('link', { current: 'page' })).not.toBeInTheDocument();
  });
});
