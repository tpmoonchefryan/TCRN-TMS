import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HierarchyBusinessShell } from '@/platform/routing/HierarchyBusinessShell';
import { RuntimeLocaleProvider } from '@/platform/runtime/locale/locale-provider';
import type { BrowserSession } from '@/platform/runtime/session/session-provider';

const mockRequest = vi.fn();
const mockReadSubsidiaryDetail = vi.fn();

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
  readSubsidiaryDetail: (...args: unknown[]) => mockReadSubsidiaryDetail(...args),
}));

describe('HierarchyBusinessShell', () => {
  beforeEach(() => {
    mockRuntimeSession = baseSession;
    mockRequest.mockReset();
    mockReadSubsidiaryDetail.mockReset();
    mockReadSubsidiaryDetail.mockResolvedValue({
      id: 'sub-7',
      code: 'TOKYO',
      name: 'Tokyo Branch',
    });
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'en-US',
    });
  });

  it.each([
    ['tenant', undefined, 'Moonshot Tenant'],
    ['subsidiary', 'sub-7', 'Tokyo Branch'],
  ] as const)(
    'keeps the organization footer entry mounted for %s business scope',
    async (scopeType, subsidiaryId, scopeName) => {
      const onNavigate = vi.fn();

      render(
        <RuntimeLocaleProvider>
          <HierarchyBusinessShell
            tenantId="tenant-1"
            scopeType={scopeType}
            subsidiaryId={subsidiaryId}
            session={baseSession}
            onNavigate={onNavigate}
            onSignOut={vi.fn().mockResolvedValue(undefined)}
          >
            <div>Hierarchy content</div>
          </HierarchyBusinessShell>
        </RuntimeLocaleProvider>,
      );

      if (scopeType === 'subsidiary') {
        expect(await screen.findByText(scopeName)).toBeInTheDocument();
      } else {
        expect(screen.getAllByText(scopeName).length).toBeGreaterThan(0);
      }
      expect(screen.getByRole('link', { name: 'Organization Structure' })).toHaveAttribute(
        'href',
        '/tenant/tenant-1/organization-structure',
      );

      fireEvent.click(screen.getByRole('link', { name: /Business overview/i }));
      expect(onNavigate).toHaveBeenCalledTimes(1);
    },
  );
});
