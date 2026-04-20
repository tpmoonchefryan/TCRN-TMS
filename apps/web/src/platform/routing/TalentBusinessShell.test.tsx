import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TalentBusinessShell } from '@/platform/routing/TalentBusinessShell';
import { RuntimeLocaleProvider } from '@/platform/runtime/locale/locale-provider';
import type { BrowserSession } from '@/platform/runtime/session/session-provider';

const mockRequest = vi.fn();
const mockReadTalentDetail = vi.fn();

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
    request: mockRequest,
  }),
}));

vi.mock('@/domains/config-dictionary-settings/api/settings.api', () => ({
  readTalentDetail: (...args: unknown[]) => mockReadTalentDetail(...args),
}));

describe('TalentBusinessShell', () => {
  beforeEach(() => {
    mockRuntimeSession = baseSession;
    mockRequest.mockReset();
    mockReadTalentDetail.mockReset();
    mockReadTalentDetail.mockResolvedValue({
      displayName: 'Tokino Sora',
    });
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'en-US',
    });
  });

  it('updates talent workspace copy and keeps account actions wired to tenant profile utilities', async () => {
    const onNavigate = vi.fn();
    const onSignOut = vi.fn().mockResolvedValue(undefined);

    render(
      <RuntimeLocaleProvider>
        <TalentBusinessShell
          tenantId="tenant-1"
          talentId="talent-9"
          section="customers"
          session={baseSession}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
        >
          <div>Talent content</div>
        </TalentBusinessShell>
      </RuntimeLocaleProvider>,
    );

    expect(screen.getByText('Customer Management')).toBeInTheDocument();
    expect(screen.getByText('Talent Scope')).toBeInTheDocument();
    expect(await screen.findByText('Tokino Sora')).toBeInTheDocument();
    expect(screen.queryByText('talent-9')).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Change language/i }));
    fireEvent.click(screen.getByRole('option', { name: '日本語' }));

    expect(screen.getByText('顧客管理')).toBeInTheDocument();
    expect(screen.getByText('タレントスコープ')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '設定' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '組織構造' })).toHaveAttribute(
      'href',
      '/tenant/tenant-1/organization-structure',
    );
    expect(screen.getByRole('navigation', { name: 'メインナビゲーション' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'アカウントメニュー' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'パスワードとセキュリティ' }));
    expect(onNavigate).toHaveBeenCalledWith('/tenant/tenant-1/profile/security');

    fireEvent.click(screen.getByRole('button', { name: 'アカウントメニュー' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'サインアウト' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['homepage'],
    ['marshmallow'],
    ['reports'],
  ] as const)('keeps the organization footer entry mounted in the %s section', async (section) => {
    render(
      <RuntimeLocaleProvider>
        <TalentBusinessShell
          tenantId="tenant-1"
          talentId="talent-9"
          section={section}
          session={baseSession}
          onNavigate={vi.fn()}
          onSignOut={vi.fn().mockResolvedValue(undefined)}
        >
          <div>Talent content</div>
        </TalentBusinessShell>
      </RuntimeLocaleProvider>,
    );

    expect(await screen.findByText('Tokino Sora')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Organization Structure' })).toHaveAttribute(
      'href',
      '/tenant/tenant-1/organization-structure',
    );
  });
});
