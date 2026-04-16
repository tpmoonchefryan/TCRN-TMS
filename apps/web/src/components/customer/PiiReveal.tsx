'use client';

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { ExternalLink, Loader2,Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { customerApi, type CustomerProfileType } from '@/lib/api/modules/customer';
import { cn } from '@/lib/utils';

interface PiiRevealProps {
  customerId: string;
  talentId: string;
  profileType?: CustomerProfileType;
  className?: string;
}

export function PiiReveal({
  customerId,
  talentId,
  profileType = 'individual',
  className,
}: PiiRevealProps) {
  const t = useTranslations('piiDisplay');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpenPortal = async () => {
    setIsRedirecting(true);
    setErrorMessage(null);

    try {
      const response = await customerApi.createPiiPortalSession(
        customerId,
        talentId,
        profileType,
      );

      if (!response.success || !response.data?.redirectUrl) {
        throw response.error || new Error(t('errors.retrieveFailed'));
      }

      window.location.assign(response.data.redirectUrl);
    } catch {
      setErrorMessage(t('errors.retrieveFailed'));
      setIsRedirecting(false);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/50',
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Lock size={24} />
      </div>
      <h3 className="mb-1 font-medium text-slate-900 dark:text-slate-200">
        {t('labels.sensitiveDataProtected')}
      </h3>
      <p className="mb-4 max-w-sm text-sm text-slate-500">
        {t('labels.piiManagedExternally')}
      </p>

      {errorMessage ? (
        <p className="mb-3 text-sm text-red-600">{errorMessage}</p>
      ) : null}

      <Button
        className="gap-2"
        disabled={isRedirecting}
        onClick={() => void handleOpenPortal()}
      >
        {isRedirecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('actions.redirecting')}
          </>
        ) : (
          <>
            <ExternalLink className="h-4 w-4" />
            {t('actions.openPortal')}
          </>
        )}
      </Button>
    </div>
  );
}
