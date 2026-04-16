// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useTranslations } from 'next-intl';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { publicApi, type PublicMarshmallowSsoUser } from '@/lib/api/modules/content';

// Streamer mode context value
interface StreamerModeContextValue {
  isStreamerMode: boolean;
  user: PublicMarshmallowSsoUser | null;
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
  const t = useTranslations('publicMarshmallow');
  const [user, setUser] = useState<PublicMarshmallowSsoUser | null>(null);
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
          setError(t('streamerTokenInvalidOrExpired'));
        }
      } catch {
        setUser(null);
        setError(t('streamerTokenValidationFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, [ssoToken, t]);

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
