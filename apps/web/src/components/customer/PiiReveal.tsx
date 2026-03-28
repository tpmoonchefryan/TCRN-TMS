// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Clock, Eye, Lock, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PiiServiceError, piiTokenManager } from '@/lib/pii';
import { cn } from '@/lib/utils';
import { useTalentStore } from '@/stores/talent-store';

import {
  getInitialPiiData,
  getPiiAddresses,
  getPiiBirthDate,
  getPiiEmails,
  getPiiFullName,
  getPiiPhones,
  getSearchHintName,
  getSearchHintPhoneLast4,
  type PiiRevealCustomer,
  type PiiRevealData,
} from './pii-reveal-normalizers';

// Enable mock mode via environment variable
const ENABLE_MOCK = process.env.NEXT_PUBLIC_ENABLE_MOCK === 'true';

// PII auto-lock timeout (5 minutes)
const PII_TIMEOUT_MS = 5 * 60 * 1000;

// Auto-refresh threshold (60 seconds before expiry)
const AUTO_REFRESH_THRESHOLD_SECONDS = 60;

interface PiiRevealProps {
  customer: PiiRevealCustomer;
  onReveal?: (piiData: PiiRevealData) => void;
}

export function PiiReveal({ customer, onReveal }: PiiRevealProps) {
  const t = useTranslations('piiDisplay');
  const { currentTalent } = useTalentStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [piiData, setPiiData] = useState<PiiRevealData | null>(getInitialPiiData(customer));
  const [accessReason, setAccessReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [_retryState, setRetryState] = useState<{ count: number; delay: number | null }>({
    count: 0,
    delay: null,
  });
  const [_error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const refreshAttemptedRef = useRef(false);

  const talentId = currentTalent?.id || '';

  // Auto-refresh token when time is running low
  const handleAutoRefresh = useCallback(async () => {
    if (refreshAttemptedRef.current || isRefreshing || !talentId) return;

    refreshAttemptedRef.current = true;
    setIsRefreshing(true);

    try {
      if (ENABLE_MOCK) {
        // Mock refresh - just reset the timer
        await new Promise((resolve) => setTimeout(resolve, 500));
        resetTimer();
        toast.success(t('status.accessExtended'));
      } else {
        // Use PiiTokenManager for token refresh
        const profile = await piiTokenManager.getPiiProfile(customer.id, talentId, {
          onRetry: (attempt, delayMs) => {
            setRetryState({ count: attempt, delay: Math.round(delayMs / 1000) });
          },
        });
        
        setPiiData(profile);
        resetTimer();
        setError(null);
        toast.success(t('status.accessExtended'));
      }
    } catch {
      toast.warning(t('errors.extendFailed'));
    } finally {
      setIsRefreshing(false);
      setRetryState({ count: 0, delay: null });
    }
  }, [customer.id, talentId, isRefreshing, t]);

  // Reset timer for auto-lock
  const resetTimer = () => {
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Reset refresh attempt flag
    refreshAttemptedRef.current = false;

    // Set new countdown
    setTimeRemaining(PII_TIMEOUT_MS / 1000);

    // Start new countdown
    countdownRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        // Trigger auto-refresh when threshold reached
        if (prev === AUTO_REFRESH_THRESHOLD_SECONDS && !refreshAttemptedRef.current) {
          handleAutoRefresh();
        }
        if (prev <= 1) {
          handleLock();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Set new auto-lock timeout
    timeoutRef.current = setTimeout(() => {
      handleLock();
    }, PII_TIMEOUT_MS);
  };

  // Auto-lock PII after timeout
  useEffect(() => {
    if (isRevealed) {
      resetTimer();
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isRevealed]);

  const handleLock = () => {
    setIsRevealed(false);
    setPiiData(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    toast.info('PII data locked for security');
  };

  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleReveal = async () => {
    if (!accessReason.trim()) {
      setShowReasonInput(true);
      return;
    }

    if (!talentId) {
      toast.error(t('errors.noTalent'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (ENABLE_MOCK) {
        // Mock API call delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const initialPiiData = getInitialPiiData(customer);
        if (initialPiiData) {
          setPiiData(initialPiiData);
          onReveal?.(initialPiiData);
          setIsRevealed(true);
          setShowReasonInput(false);
          toast.success(t('status.accessGranted'));
        } else {
          toast.error(t('errors.retrieveFailed'));
        }
      } else {
        // Use PiiTokenManager for real API call
        const profile = await piiTokenManager.getPiiProfile(customer.id, talentId, {
          onRetry: (attempt, delayMs) => {
            setRetryState({ count: attempt, delay: Math.round(delayMs / 1000) });
          },
          onError: (err) => {
            if (err instanceof PiiServiceError) {
              setError(t('errors.serviceError', { code: err.statusCode }));
            } else {
              setError(t('errors.networkError'));
            }
          },
        });
        
        setPiiData(profile);
        onReveal?.(profile);
        setIsRevealed(true);
        setShowReasonInput(false);
        toast.success(t('status.accessGranted'));
      }
    } catch (error: unknown) {
      if (error instanceof PiiServiceError) {
        toast.error(t('errors.serviceError', { code: error.statusCode }));
      } else {
        toast.error(error instanceof Error ? error.message : t('errors.retrieveFailed'));
      }
    } finally {
      setIsLoading(false);
      setRetryState({ count: 0, delay: null });
    }
  };

  if (isRevealed && piiData) {
    const isLowTime = timeRemaining <= AUTO_REFRESH_THRESHOLD_SECONDS;
    
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-semibold flex items-center gap-2 text-green-600">
            <Lock className="h-4 w-4" /> 
            PII Unlocked
            {isRefreshing && (
              <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
            )}
          </h3>
          <div className="flex items-center gap-2">
            <Clock className={cn("h-4 w-4", isLowTime ? "text-orange-500" : "text-muted-foreground")} />
            <span className={cn("text-xs", isLowTime ? "text-orange-500 font-medium" : "text-muted-foreground")}>
              {isRefreshing ? 'Extending...' : `Auto-lock in ${formatTimeRemaining(timeRemaining)}`}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { refreshAttemptedRef.current = false; handleAutoRefresh(); }} 
              disabled={isRefreshing}
              className="h-6 px-2 text-xs"
            >
              Extend
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLock} className="h-6 px-2 text-xs">
              Lock Now
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Full Name</span>
            <div className="font-medium text-lg">{getPiiFullName(piiData)}</div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Gender / Birth</span>
            <div className="font-medium capitalize">
              {piiData.gender} • {getPiiBirthDate(piiData)}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Phone</span>
            {getPiiPhones(piiData).map((phone, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Badge variant="secondary" className="text-[10px] h-5">
                  {phone.typeCode}
                </Badge>
                <span className="font-mono">{phone.number}</span>
                {phone.isPrimary && (
                  <Badge variant="outline" className="text-[9px] h-4">
                    Primary
                  </Badge>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Email</span>
            {getPiiEmails(piiData).map((email, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Badge variant="secondary" className="text-[10px] h-5">
                  {email.typeCode}
                </Badge>
                <span className="font-mono truncate max-w-[200px]" title={email.address}>
                  {email.address}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-1 md:col-span-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Address</span>
            {getPiiAddresses(piiData).map((address, index) => (
              <div key={index} className="flex gap-2 items-start">
                <Badge variant="secondary" className="text-[10px] h-5 mt-0.5">
                  {address.typeCode}
                </Badge>
                <div>
                  <div>
                    {address.street}
                    {address.district ? `, ${address.district}` : ''}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {address.city}
                    {address.province ? `, ${address.province}` : ''}{' '}
                    {address.postalCode}, {address.countryCode}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const searchHintName = getSearchHintName(customer);
  const searchHintPhoneLast4 = getSearchHintPhoneLast4(customer);

  return (
    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50 dark:bg-slate-900/50">
      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
        <Lock size={24} />
      </div>
      <h3 className="font-medium text-slate-900 dark:text-slate-200 mb-1">Sensitive Data Protected</h3>
      <p className="text-sm text-slate-500 mb-4 text-center max-w-sm">
        Personal Identifiable Information (PII) is encrypted.
        Access will be logged for audit purposes.
      </p>

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        {searchHintName && (
          <div className="text-sm text-slate-400 font-mono mb-2">
            Hint: {searchHintName} ••• {searchHintPhoneLast4}
          </div>
        )}

        {showReasonInput && (
          <div className="w-full space-y-2 animate-in fade-in slide-in-from-top-2">
            <Label htmlFor="access-reason" className="text-xs text-muted-foreground">
              Access Reason (Required)
            </Label>
            <Input
              id="access-reason"
              placeholder="e.g., Customer support ticket #12345"
              value={accessReason}
              onChange={(e) => setAccessReason(e.target.value)}
              className="text-sm"
            />
          </div>
        )}

        <Button
          onClick={handleReveal}
          disabled={isLoading || (showReasonInput && !accessReason.trim())}
          className="w-full gap-2"
        >
          {isLoading ? <RefreshCw className="animate-spin h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {isLoading ? 'Requesting Access...' : showReasonInput ? 'Confirm Access' : 'View Sensitive Data'}
        </Button>
      </div>
    </div>
  );
}
