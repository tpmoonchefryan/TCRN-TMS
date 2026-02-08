'use client';

// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { AlertCircle, Eye, EyeOff, Lock,RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { type PiiProfile, PiiServiceError,piiTokenManager } from '@/lib/pii';
import { cn } from '@/lib/utils';

/**
 * PII Data Display State
 */
type PiiState = 'idle' | 'loading' | 'success' | 'error' | 'retrying';

/**
 * PII Field Configuration
 */
interface PiiFieldConfig {
  key: keyof PiiProfile | 'fullName';
  label: string;
  formatter?: (value: unknown, profile: PiiProfile) => string | null;
}

/**
 * PiiDataDisplay Props
 */
interface PiiDataDisplayProps {
  customerId: string;
  talentId: string;
  className?: string;
  /** Show compact view with fewer fields */
  compact?: boolean;
  /** Auto-load PII data on mount */
  autoLoad?: boolean;
  /** Callback when PII data is loaded */
  onLoad?: (profile: PiiProfile) => void;
  /** Callback when PII load fails */
  onError?: (error: Error) => void;
}

/**
 * Default PII field formatters
 */
const formatFullName = (profile: PiiProfile): string | null => {
  const { familyName, givenName } = profile;
  if (!familyName && !givenName) return null;
  // Chinese/Japanese name order: family name first
  return [familyName, givenName].filter(Boolean).join('');
};

const formatPhoneNumber = (profile: PiiProfile): string | null => {
  const primary = profile.phoneNumbers?.find(p => p.isPrimary) || profile.phoneNumbers?.[0];
  return primary?.number || null;
};

const formatEmail = (profile: PiiProfile): string | null => {
  const primary = profile.emails?.find(e => e.isPrimary) || profile.emails?.[0];
  return primary?.address || null;
};

const formatAddress = (profile: PiiProfile): string | null => {
  const primary = profile.addresses?.find(a => a.isPrimary) || profile.addresses?.[0];
  if (!primary) return null;
  return [primary.province, primary.city, primary.district, primary.street]
    .filter(Boolean)
    .join(' ');
};

/**
 * PiiDataDisplay Component
 * 
 * Displays PII data with automatic token management, retry logic, and fallback UI.
 * Follows PRD §11.4 PII data acquisition failure interaction.
 */
export function PiiDataDisplay({
  customerId,
  talentId,
  className,
  compact = false,
  autoLoad = false,
  onLoad,
  onError,
}: PiiDataDisplayProps) {
  const t = useTranslations('piiDisplay');
  
  const [state, setState] = React.useState<PiiState>('idle');
  const [piiData, setPiiData] = React.useState<PiiProfile | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const [retryDelay, setRetryDelay] = React.useState<number | null>(null);
  const [isRevealed, setIsRevealed] = React.useState(false);

  // Field configurations
  const fields: PiiFieldConfig[] = React.useMemo(() => {
    const baseFields: PiiFieldConfig[] = [
      {
        key: 'fullName',
        label: t('fields.fullName'),
        formatter: (_, profile) => formatFullName(profile),
      },
      {
        key: 'phoneNumbers',
        label: t('fields.phone'),
        formatter: (_, profile) => formatPhoneNumber(profile),
      },
      {
        key: 'emails',
        label: t('fields.email'),
        formatter: (_, profile) => formatEmail(profile),
      },
    ];

    if (!compact) {
      baseFields.push(
        {
          key: 'birthDate',
          label: t('fields.birthDate'),
          formatter: (value) => value as string | null,
        },
        {
          key: 'gender',
          label: t('fields.gender'),
          formatter: (value) => {
            if (!value) return null;
            return t(`genderOptions.${value}`, { defaultValue: value as string });
          },
        },
        {
          key: 'addresses',
          label: t('fields.address'),
          formatter: (_, profile) => formatAddress(profile),
        }
      );
    }

    return baseFields;
  }, [compact, t]);

  /**
   * Fetch PII data
   */
  const fetchPii = React.useCallback(async () => {
    setState('loading');
    setError(null);
    setRetryDelay(null);

    try {
      const profile = await piiTokenManager.getPiiProfile(customerId, talentId, {
        onRetry: (attempt, delayMs) => {
          setState('retrying');
          setRetryCount(attempt);
          setRetryDelay(Math.round(delayMs / 1000));
        },
        onError: (err) => {
          onError?.(err);
        },
      });

      setPiiData(profile);
      setState('success');
      setRetryCount(0);
      onLoad?.(profile);
    } catch (err) {
      const error = err as Error;
      setState('error');
      
      if (error instanceof PiiServiceError) {
        setError(t('errors.serviceError', { code: error.statusCode }));
      } else {
        setError(t('errors.networkError'));
      }
      
      onError?.(error);
    }
  }, [customerId, talentId, onLoad, onError, t]);

  /**
   * Handle reveal button click
   */
  const handleReveal = React.useCallback(() => {
    if (state === 'idle' || state === 'error') {
      setIsRevealed(true);
      fetchPii();
    } else if (state === 'success') {
      setIsRevealed(!isRevealed);
    }
  }, [state, isRevealed, fetchPii]);

  /**
   * Handle manual retry
   */
  const handleRetry = React.useCallback(() => {
    setRetryCount(0);
    fetchPii();
  }, [fetchPii]);

  /**
   * Auto-load on mount if enabled
   */
  React.useEffect(() => {
    if (autoLoad && state === 'idle') {
      setIsRevealed(true);
      fetchPii();
    }
  }, [autoLoad, state, fetchPii]);

  /**
   * Clear cache on unmount
   */
  React.useEffect(() => {
    return () => {
      // Optionally clear cache on unmount
      // piiTokenManager.clearCache(customerId, talentId);
    };
  }, [customerId, talentId]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Error/Retry Alert */}
      {(state === 'error' || state === 'retrying') && (
        <Alert variant={state === 'error' ? 'destructive' : 'warning'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {state === 'retrying'
                ? t('status.retrying', { seconds: retryDelay ?? 0, attempt: retryCount })
                : error}
            </span>
            {state === 'error' && (
              <Button variant="ghost" size="sm" onClick={handleRetry}>
                <RefreshCw className="h-4 w-4 mr-1" />
                {t('actions.retry')}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* PII Fields Container */}
      <div className="rounded-lg border bg-card p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Lock className="h-4 w-4" />
            {t('title')}
          </div>
          
          {state !== 'loading' && state !== 'retrying' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReveal}
            >
              {isRevealed && state === 'success' ? (
                <>
                  <EyeOff className="h-4 w-4 mr-1" />
                  {t('actions.hide')}
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  {t('actions.reveal')}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Fields Grid */}
        <div className={cn(
          'grid gap-4',
          compact ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
        )}>
          {fields.map((field) => (
            <PiiField
              key={field.key}
              label={field.label}
              value={
                piiData && field.formatter
                  ? field.formatter(piiData[field.key as keyof PiiProfile], piiData)
                  : null
              }
              state={state}
              isRevealed={isRevealed}
              onReveal={handleReveal}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Single PII Field Component
 */
interface PiiFieldProps {
  label: string;
  value: string | null;
  state: PiiState;
  isRevealed: boolean;
  onReveal: () => void;
}

function PiiField({ label, value, state, isRevealed, onReveal }: PiiFieldProps) {
  const t = useTranslations('piiDisplay');

  // Idle state - show reveal prompt
  if (!isRevealed && state === 'idle') {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
        <button
          onClick={onReveal}
          className="text-sm text-primary hover:underline focus:outline-none"
        >
          {t('actions.clickToReveal')}
        </button>
      </div>
    );
  }

  // Loading state - show skeleton
  if (state === 'loading' || state === 'retrying') {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
        <Skeleton className="h-5 w-32" />
      </div>
    );
  }

  // Error state - show placeholder
  if (state === 'error') {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
        <span className="text-sm text-muted-foreground">[{t('status.failed')}]</span>
      </div>
    );
  }

  // Success state - show value or not available
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      {isRevealed ? (
        <span className="text-sm">
          {value || <span className="text-muted-foreground">{t('status.notProvided')}</span>}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">••••••</span>
      )}
    </div>
  );
}

export default PiiDataDisplay;
