'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark';
        },
      ) => string | number;
      reset: (widgetId: string | number) => void;
      remove: (widgetId: string | number) => void;
    };
  }
}

export function TurnstileWidget({
  siteKey,
  resetSignal,
  theme = 'light',
  onTokenChange,
}: Readonly<{
  siteKey: string;
  resetSignal: number;
  theme?: 'light' | 'dark';
  onTokenChange: (token: string | null) => void;
}>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | number | null>(null);
  const [scriptReady, setScriptReady] = useState(Boolean(typeof window !== 'undefined' && window.turnstile));

  useEffect(() => {
    if (!siteKey || !scriptReady || !containerRef.current || widgetIdRef.current !== null || !window.turnstile) {
      return;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme,
      callback: (token) => {
        onTokenChange(token);
      },
      'expired-callback': () => {
        onTokenChange(null);
      },
      'error-callback': () => {
        onTokenChange(null);
      },
    });

    return () => {
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }

      widgetIdRef.current = null;
    };
  }, [onTokenChange, scriptReady, siteKey, theme]);

  useEffect(() => {
    if (widgetIdRef.current !== null && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      onTokenChange(null);
    }
  }, [onTokenChange, resetSignal]);

  if (!siteKey) {
    return null;
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => {
          setScriptReady(true);
        }}
      />
      <div ref={containerRef} />
    </>
  );
}
