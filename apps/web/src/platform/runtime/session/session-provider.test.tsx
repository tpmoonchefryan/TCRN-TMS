import { BROWSER_PUBLIC_CONSUMER_CODE, BROWSER_PUBLIC_CONSUMER_HEADER } from '@tcrn/shared';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  AuthenticatedSessionResult,
  CurrentUserProfile,
} from '@/domains/auth-identity/api/auth.api';
import { ApiRequestError } from '@/platform/http/api';
import { SessionProvider, useSession } from '@/platform/runtime/session/session-provider';

const mocks = vi.hoisted(() => ({
  refreshAccessToken: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock('@/domains/auth-identity/api/auth.api', () => ({
  refreshAccessToken: mocks.refreshAccessToken,
  getCurrentUser: mocks.getCurrentUser,
  logout: mocks.logout,
}));

let sessionApi: ReturnType<typeof useSession> | null = null;

function buildAuthenticatedResult(
  overrides: Partial<AuthenticatedSessionResult> = {},
): AuthenticatedSessionResult {
  return {
    accessToken: 'access-token',
    tokenType: 'Bearer',
    expiresIn: 900,
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
      tenant: {
        id: 'tenant-1',
        name: 'Moonshot Tenant',
        tier: 'standard',
        schemaName: 'tenant_moonshot',
      },
    },
    ...overrides,
  };
}

function buildCurrentUserProfile(overrides: Partial<CurrentUserProfile> = {}): CurrentUserProfile {
  return {
    id: 'user-1',
    username: 'alice',
    email: 'alice@example.com',
    phone: null,
    displayName: 'Alice',
    avatarUrl: null,
    preferredLanguage: 'en',
    totpEnabled: false,
    forceReset: false,
    lastLoginAt: '2026-04-17T10:00:00.000Z',
    passwordChangedAt: '2026-04-16T10:00:00.000Z',
    passwordExpiresAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildApiResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

function SessionProbe() {
  sessionApi = useSession();

  return (
    <div>
      <span data-testid="status">{sessionApi.status}</span>
      <span data-testid="token">{sessionApi.session?.accessToken ?? 'none'}</span>
      <span data-testid="tenant-tier">{sessionApi.session?.tenantTier ?? 'none'}</span>
      <span data-testid="tenant-id">{sessionApi.session?.tenantId ?? 'none'}</span>
    </div>
  );
}

async function authenticateIntoSession() {
  await act(async () => {
    sessionApi?.authenticate(buildAuthenticatedResult(), 'MOON');
  });

  await waitFor(() => {
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
  });
}

describe('SessionProvider', () => {
  beforeEach(() => {
    sessionApi = null;
    window.sessionStorage.clear();
    mocks.refreshAccessToken.mockReset();
    mocks.getCurrentUser.mockReset();
    mocks.logout.mockReset();
    mocks.fetch.mockReset();
    vi.stubGlobal('fetch', mocks.fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses recovery hints to rebuild an AC session when only refresh-cookie state remains', async () => {
    mocks.refreshAccessToken.mockResolvedValueOnce({
      accessToken: 'recovered-token',
      tokenType: 'Bearer',
      expiresIn: 900,
    });
    mocks.getCurrentUser.mockResolvedValueOnce(
      buildCurrentUserProfile({
        displayName: 'Recovered Operator',
      }),
    );

    render(
      <SessionProvider>
        <SessionProbe />
      </SessionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
    });

    let recovered = false;

    await act(async () => {
      recovered = (await sessionApi?.recoverSession({
        tenantId: 'tenant-ac',
        tenantTier: 'ac',
      })) ?? false;
    });

    expect(recovered).toBe(true);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('token')).toHaveTextContent('recovered-token');
      expect(screen.getByTestId('tenant-id')).toHaveTextContent('tenant-ac');
      expect(screen.getByTestId('tenant-tier')).toHaveTextContent('ac');
    });
  });

  it('refreshes the access token and retries a request once after a 401 response', async () => {
    mocks.refreshAccessToken.mockResolvedValueOnce({
      accessToken: 'refreshed-token',
      tokenType: 'Bearer',
      expiresIn: 900,
    });
    mocks.fetch
      .mockResolvedValueOnce(
        buildApiResponse(401, {
          success: false,
          error: {
            code: 'AUTH_ACCESS_TOKEN_INVALID',
            message: 'Expired access token',
          },
        }),
      )
      .mockResolvedValueOnce(
        buildApiResponse(200, {
          success: true,
          data: {
            ok: true,
          },
        }),
      );

    render(
      <SessionProvider>
        <SessionProbe />
      </SessionProvider>,
    );

    await authenticateIntoSession();

    let payload: { ok: boolean } | undefined;

    await act(async () => {
      payload = await sessionApi?.request<{ ok: boolean }>('/api/v1/protected');
    });

    expect(payload).toEqual({ ok: true });
    expect(mocks.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(new Headers(mocks.fetch.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe('Bearer access-token');
    expect(new Headers(mocks.fetch.mock.calls[1]?.[1]?.headers).get('Authorization')).toBe('Bearer refreshed-token');
    expect(new Headers(mocks.fetch.mock.calls[0]?.[1]?.headers).get(BROWSER_PUBLIC_CONSUMER_HEADER)).toBe(BROWSER_PUBLIC_CONSUMER_CODE);
    expect(new Headers(mocks.fetch.mock.calls[1]?.[1]?.headers).get(BROWSER_PUBLIC_CONSUMER_HEADER)).toBe(BROWSER_PUBLIC_CONSUMER_CODE);

    await waitFor(() => {
      expect(screen.getByTestId('token')).toHaveTextContent('refreshed-token');
    });
  });

  it('fails closed when token refresh cannot recover a protected request', async () => {
    mocks.refreshAccessToken.mockRejectedValueOnce(new Error('refresh failed'));
    mocks.fetch.mockResolvedValueOnce(
      buildApiResponse(401, {
        success: false,
        error: {
          code: 'AUTH_ACCESS_TOKEN_INVALID',
          message: 'Expired access token',
        },
      }),
    );

    render(
      <SessionProvider>
        <SessionProbe />
      </SessionProvider>,
    );

    await authenticateIntoSession();

    await act(async () => {
      const requestPromise = sessionApi?.request('/api/v1/protected');

      await expect(requestPromise).rejects.toBeInstanceOf(ApiRequestError);
      await expect(requestPromise).rejects.toMatchObject({
        code: 'AUTH_REFRESH_TOKEN_INVALID',
        status: 401,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
      expect(screen.getByTestId('token')).toHaveTextContent('none');
    });
  });

  it('keeps action references stable when session user fields are updated', async () => {
    render(
      <SessionProvider>
        <SessionProbe />
      </SessionProvider>,
    );

    await authenticateIntoSession();

    const initialUpdateSessionUser = sessionApi?.updateSessionUser;
    const initialRequest = sessionApi?.request;

    await act(async () => {
      sessionApi?.updateSessionUser({
        displayName: 'Operator Alice',
      });
    });

    await waitFor(() => {
      expect(sessionApi?.session?.user.displayName).toBe('Operator Alice');
    });

    expect(sessionApi?.updateSessionUser).toBe(initialUpdateSessionUser);
    expect(sessionApi?.request).toBe(initialRequest);
  });
});
