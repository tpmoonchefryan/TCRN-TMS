// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

import { publicApi } from '@/lib/api/client';

// SSO User info from validated token
interface SsoUser {
  id: string;
  displayName: string;
  email: string;
  talentId: string;
}

// Streamer mode context value
interface StreamerModeContextValue {
  isStreamerMode: boolean;
  user: SsoUser | null;
  ssoToken: string | null;
  isLoading: boolean;
  error: string | null;
}

const StreamerModeContext = createContext<StreamerModeContextValue>({
  isStreamerMode: false,
  user: null,
  ssoToken: null,
  isLoading: false,
  error: null,
});

export function useStreamerMode() {
  return useContext(StreamerModeContext);
}

interface StreamerModeProviderProps {
  children: ReactNode;
  ssoToken?: string | null;
}

export function StreamerModeProvider({ children, ssoToken }: StreamerModeProviderProps) {
  const [user, setUser] = useState<SsoUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ssoToken) {
      setUser(null);
      return;
    }

    const validateToken = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await publicApi.validateSsoToken(ssoToken);
        if (response.success && response.data?.valid && response.data.user) {
          setUser(response.data.user);
        } else {
          setUser(null);
          setError('SSO token is invalid or expired');
        }
      } catch (err) {
        setUser(null);
        setError('Failed to validate SSO token');
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, [ssoToken]);

  const value: StreamerModeContextValue = {
    isStreamerMode: !!user,
    user,
    ssoToken: user ? ssoToken ?? null : null,
    isLoading,
    error,
  };

  return (
    <StreamerModeContext.Provider value={value}>
      {children}
    </StreamerModeContext.Provider>
  );
}
