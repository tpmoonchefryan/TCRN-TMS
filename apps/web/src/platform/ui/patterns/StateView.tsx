// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

 'use client';

import { AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { cn } from '@/platform/ui/foundations';

type StateViewState = 'loading' | 'error' | 'empty' | 'ready';

type StateCopy = {
  title: ReactNode;
  description?: ReactNode;
};

type StateViewProps = {
  state: StateViewState;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
  loading?: StateCopy;
  error?: StateCopy;
  empty?: StateCopy;
  loadingIcon?: ReactNode;
  errorIcon?: ReactNode;
  emptyIcon?: ReactNode;
};

export function StateView({
  state,
  children,
  action,
  className,
  contentClassName,
  loading,
  error,
  empty,
  loadingIcon,
  errorIcon,
  emptyIcon,
}: StateViewProps) {
  const t = useTranslations('runtimeMessages.stateView');

  if (state === 'ready') {
    return <>{children}</>;
  }

  const defaultCopy: Record<Exclude<StateViewState, 'ready'>, StateCopy> = {
    loading: {
      title: t('loadingTitle'),
    },
    error: {
      title: t('errorTitle'),
    },
    empty: {
      title: t('emptyTitle'),
    },
  };

  const config = {
    loading: {
      ...defaultCopy.loading,
      ...loading,
      icon: loadingIcon ?? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />,
    },
    error: {
      ...defaultCopy.error,
      ...error,
      icon: errorIcon ?? <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />,
    },
    empty: {
      ...defaultCopy.empty,
      ...empty,
      icon: emptyIcon ?? <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
    },
  }[state];

  return (
    <div className={cn('flex min-h-[240px] items-center justify-center rounded-lg border border-dashed bg-muted/15 px-6 py-10', className)}>
      <div className={cn('flex max-w-md flex-col items-center gap-3 text-center', contentClassName)}>
        {config.icon}
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">{config.title}</h3>
          {config.description ? (
            <p className="text-sm text-muted-foreground">{config.description}</p>
          ) : null}
        </div>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}
