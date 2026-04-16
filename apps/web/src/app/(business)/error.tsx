// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { Button } from '@/components/ui';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BusinessError({ error, reset }: ErrorProps) {
  const t = useTranslations('runtimeMessages.businessError');
  const tCommon = useTranslations('common');

  useEffect(() => {
    console.error('Business route error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">😕</div>
        <h1 className="text-xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          {t('description')}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground mb-4">
            {t('errorIdLabel')} {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} size="sm">
            {tCommon('retry')}
          </Button>
          <Link href="/">
            <Button variant="outline" size="sm">
              {t('backToHome')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
