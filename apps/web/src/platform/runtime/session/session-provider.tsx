'use client';

import { normalizeSupportedUiLocale, type SupportedUiLocale } from '@tcrn/shared';
import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  type AuthenticatedSessionResult,
  type CurrentUserProfile,
  getCurrentUser,
  logout,
  refreshAccessToken,
} from '@/domains/auth-identity/api/auth.api';
import {
  ApiRequestError,
  type ApiSuccessEnvelope,
  readApiEnvelope,
  withBrowserPublicConsumerHeaders,
} from '@/platform/http/api';
import { resolveRecoveryTenantId } from '@/platform/routing/workspace-paths';

const SESSION_STORAGE_KEY = 'tcrn.web.session';

export interface BrowserSession {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  authenticatedAt: string;
  tenantId: string;
  tenantName: string;
  tenantTier: string;
  tenantCode: string;
  user: {
    id: string;
    username: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    preferredLanguage: SupportedUiLocale;
    totpEnabled: boolean;
    forceReset: boolean;
    passwordExpiresAt: string | null;
  };
}

type BrowserSessionUser = BrowserSession['user'];

type SessionStatus = 'booting' | 'anonymous' | 'authenticated';

interface SessionRecoveryHint {
  tenantId?: string;
  tenantName?: string | null;
  tenantTier?: string | null;
  tenantCode?: string | null;
}

interface SessionContextValue {
  status: SessionStatus;
  session: BrowserSession | null;
  authenticate: (result: AuthenticatedSessionResult, tenantCode: string) => void;
  recoverSession: (hint?: SessionRecoveryHint) => Promise<boolean>;
  clearSession: () => void;
  logoutCurrentSession: () => Promise<void>;
  updateSessionUser: (patch: Partial<BrowserSessionUser>) => void;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  requestEnvelope: <T>(path: string, init?: RequestInit) => Promise<ApiSuccessEnvelope<T>>;
}

const sessionContext = createContext<SessionContextValue | null>(null);

function normalizeSessionUser(user: BrowserSessionUser): BrowserSessionUser {
  return {
    ...user,
    preferredLanguage: normalizeSupportedUiLocale(user.preferredLanguage) ?? 'en',
  };
}

function buildSessionUserFromProfile(profile: CurrentUserProfile): BrowserSessionUser {
  return normalizeSessionUser({
    id: profile.id,
    username: profile.username,
    email: profile.email,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    preferredLanguage: profile.preferredLanguage,
    totpEnabled: profile.totpEnabled,
    forceReset: profile.forceReset,
    passwordExpiresAt: profile.passwordExpiresAt,
  });
}

function buildSession(result: AuthenticatedSessionResult, tenantCode: string): BrowserSession {
  return {
    accessToken: result.accessToken,
    tokenType: result.tokenType,
    expiresIn: result.expiresIn,
    authenticatedAt: new Date().toISOString(),
    tenantId: result.user.tenant.id,
    tenantName: result.user.tenant.name,
    tenantTier: result.user.tenant.tier,
    tenantCode,
    user: normalizeSessionUser({
      id: result.user.id,
      username: result.user.username,
      email: result.user.email,
      displayName: result.user.displayName,
      avatarUrl: result.user.avatarUrl,
      preferredLanguage: result.user.preferredLanguage,
      totpEnabled: result.user.totpEnabled,
      forceReset: result.user.forceReset,
      passwordExpiresAt: result.user.passwordExpiresAt,
    }),
  };
}

function readStoredSession(): BrowserSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as BrowserSession;

    return {
      ...parsed,
      user: normalizeSessionUser(parsed.user),
    };
  } catch {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function storeSession(session: BrowserSession | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function SessionProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [status, setStatus] = useState<SessionStatus>('booting');
  const [session, setSession] = useState<BrowserSession | null>(null);
  const sessionRef = useRef<BrowserSession | null>(null);

  useEffect(() => {
    const stored = readStoredSession();
    sessionRef.current = stored;
    setSession(stored);
    setStatus(stored ? 'authenticated' : 'anonymous');
  }, []);

  const applySession = useCallback((nextSession: BrowserSession | null) => {
    sessionRef.current = nextSession;
    storeSession(nextSession);
    startTransition(() => {
      setSession(nextSession);
      setStatus(nextSession ? 'authenticated' : 'anonymous');
    });
  }, []);

  const authenticate = useCallback((result: AuthenticatedSessionResult, tenantCode: string) => {
    applySession(buildSession(result, tenantCode));
  }, [applySession]);

  const clearSession = useCallback(() => {
    applySession(null);
  }, [applySession]);

  const updateSessionUser = useCallback((patch: Partial<BrowserSessionUser>) => {
    if (!sessionRef.current) {
      return;
    }

    applySession({
      ...sessionRef.current,
      user: {
        ...sessionRef.current.user,
        ...patch,
      },
    });
  }, [applySession]);

  const recoverSession = useCallback(async (hint?: SessionRecoveryHint) => {
    const previous = sessionRef.current;
    const recoveryTenantId = resolveRecoveryTenantId(previous?.tenantId, hint?.tenantId);

    if (!recoveryTenantId) {
      clearSession();
      return false;
    }

    try {
      const refreshed = await refreshAccessToken();
      const profile = await getCurrentUser(refreshed.accessToken);

      applySession({
        accessToken: refreshed.accessToken,
        tokenType: refreshed.tokenType,
        expiresIn: refreshed.expiresIn,
        authenticatedAt: new Date().toISOString(),
        tenantId: recoveryTenantId,
        tenantName: previous?.tenantName || hint?.tenantName || '',
        tenantTier: previous?.tenantTier || hint?.tenantTier || 'unknown',
        tenantCode: previous?.tenantCode || hint?.tenantCode || '',
        user: buildSessionUserFromProfile(profile),
      });

      return true;
    } catch {
      clearSession();
      return false;
    }
  }, [applySession, clearSession]);

  const logoutCurrentSession = useCallback(async () => {
    const current = sessionRef.current;

    try {
      if (current?.accessToken) {
        await logout(current.accessToken);
      }
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const requestEnvelope = useCallback(async <T,>(path: string, init?: RequestInit) => {
    const perform = async (token: string | null) => {
      const headers = withBrowserPublicConsumerHeaders(init?.headers);

      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      return fetch(path, {
        ...init,
        headers,
        credentials: 'include',
      });
    };

    let response = await perform(sessionRef.current?.accessToken || null);

    if (response.status === 401 && sessionRef.current) {
      try {
        const refreshed = await refreshAccessToken();
        const nextSession = sessionRef.current
          ? {
              ...sessionRef.current,
              accessToken: refreshed.accessToken,
              tokenType: refreshed.tokenType,
              expiresIn: refreshed.expiresIn,
              authenticatedAt: new Date().toISOString(),
            }
          : null;

        if (nextSession) {
          applySession(nextSession);
          response = await perform(nextSession.accessToken);
        }
      } catch {
        clearSession();
        throw new ApiRequestError('Session expired', 'AUTH_REFRESH_TOKEN_INVALID', 401);
      }
    }

    return readApiEnvelope<T>(response);
  }, [applySession, clearSession]);

  const request = useCallback(async <T,>(path: string, init?: RequestInit) => {
    const payload = await requestEnvelope<T>(path, init);
    return payload.data;
  }, [requestEnvelope]);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      session,
      authenticate,
      recoverSession,
      clearSession,
      logoutCurrentSession,
      updateSessionUser,
      request,
      requestEnvelope,
    }),
    [
      authenticate,
      clearSession,
      logoutCurrentSession,
      recoverSession,
      request,
      requestEnvelope,
      session,
      status,
      updateSessionUser,
    ],
  );

  return <sessionContext.Provider value={value}>{children}</sessionContext.Provider>;
}

export function useSession() {
  const value = useContext(sessionContext);

  if (!value) {
    throw new Error('useSession must be used inside SessionProvider');
  }

  return value;
}
