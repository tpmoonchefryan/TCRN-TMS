// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { Button } from '@/components/ui';
import { useAuthStore } from '@/stores/auth-store';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  const { isAuthenticated } = useAuthStore();
  const t = useTranslations('runtimeMessages.globalError');
  const tCommon = useTranslations('common');
  const href = isAuthenticated ? '/' : '/login';

  useEffect(() => {
    // Log error to monitoring service
    console.error('Global error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="text-center px-4 max-w-md">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground mb-6">
          {t('description')}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground mb-4">
            {t('errorIdLabel')} {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="default">
            {tCommon('retry')}
          </Button>
          <Link href={href}>
            <Button variant="outline">
              {isAuthenticated ? t('goToHomepage') : t('goToLogin')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
