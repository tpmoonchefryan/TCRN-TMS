import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TenantGovernanceShell } from '@/platform/routing/TenantGovernanceShell';
import { RuntimeLocaleProvider } from '@/platform/runtime/locale/locale-provider';
import type { BrowserSession } from '@/platform/runtime/session/session-provider';

const baseSession: BrowserSession = {
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

let mockRuntimeSession = baseSession;

vi.mock('@/platform/runtime/session/session-provider', () => ({
  useSession: () => ({
    session: mockRuntimeSession,
  }),
}));

describe('TenantGovernanceShell', () => {
  beforeEach(() => {
    mockRuntimeSession = baseSession;
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'en-US',
    });
  });

  it('switches locale copy and routes account actions through the shell contract', () => {
    const onNavigate = vi.fn();
    const onSignOut = vi.fn().mockResolvedValue(undefined);

    render(
      <RuntimeLocaleProvider>
        <TenantGovernanceShell
          tenantId="tenant-1"
          pathname="/tenant/tenant-1/organization-structure"
          session={baseSession}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
        >
          <div>Tenant content</div>
        </TenantGovernanceShell>
      </RuntimeLocaleProvider>,
    );

    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });

    expect(within(navigation).getByRole('link', { name: 'Organization Structure' })).toBeInTheDocument();
    expect(within(navigation).queryByRole('link', { name: 'My Profile' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Tenant Settings' })).not.toBeInTheDocument();
    expect(screen.getByText('Tenant')).toBeInTheDocument();
    expect(navigation).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Change language/i }));
    fireEvent.click(screen.getByRole('option', { name: '简体中文' }));

    expect(screen.getByRole('link', { name: '组织架构' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: '主导航' })).queryByRole('link', { name: '我的资料' })).not.toBeInTheDocument();
    expect(screen.getByText('租户')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '账户菜单' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '我的资料' }));
    expect(onNavigate).toHaveBeenCalledWith('/tenant/tenant-1/profile');

    fireEvent.click(screen.getByRole('button', { name: '账户菜单' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '密码与安全' }));
    expect(onNavigate).toHaveBeenCalledWith('/tenant/tenant-1/profile/security');

    fireEvent.click(screen.getByRole('button', { name: '账户菜单' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '退出登录' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('does not highlight tenant sidebar navigation for account security routes', () => {
    render(
      <RuntimeLocaleProvider>
        <TenantGovernanceShell
          tenantId="tenant-1"
          pathname="/tenant/tenant-1/profile/security"
          session={baseSession}
          onNavigate={vi.fn()}
          onSignOut={vi.fn().mockResolvedValue(undefined)}
        >
          <div>Tenant profile security</div>
        </TenantGovernanceShell>
      </RuntimeLocaleProvider>,
    );

    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });

    expect(within(navigation).queryByRole('link', { name: 'My Profile' })).not.toBeInTheDocument();
    expect(within(navigation).getByRole('link', { name: 'Security' })).not.toHaveAttribute('aria-current');
    expect(within(navigation).queryByRole('link', { current: 'page' })).not.toBeInTheDocument();
  });
});
