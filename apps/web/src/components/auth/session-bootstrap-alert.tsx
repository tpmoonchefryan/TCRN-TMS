// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';

const getBootstrapIssues = (
  errors: { talents?: string; permissions?: string } | null
): string[] => {
  const issues: string[] = [];

  if (errors?.talents) {
    issues.push('Accessible talent data could not be refreshed.');
  }

  if (errors?.permissions) {
    issues.push('Permission snapshot could not be refreshed.');
  }

  return issues;
};

export function SessionBootstrapAlert() {
  const [isRetrying, setIsRetrying] = useState(false);
  const { sessionBootstrapStatus, sessionBootstrapErrors, bootstrapAuthenticatedSession } =
    useAuthStore();

  if (sessionBootstrapStatus !== 'degraded' && !isRetrying) {
    return null;
  }

  const issues = getBootstrapIssues(sessionBootstrapErrors);
  const isManualRetryInFlight = isRetrying && sessionBootstrapStatus === 'loading';

  const handleRetry = async () => {
    setIsRetrying(true);

    try {
      await bootstrapAuthenticatedSession();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Alert
      variant="warning"
      className="mb-4 border-amber-300/70 bg-amber-50/80 text-amber-900 dark:border-amber-500/50 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {isManualRetryInFlight
          ? 'Refreshing authenticated context'
          : 'Session restored with limited context'}
      </AlertTitle>
      <AlertDescription>
        <p>
          {isManualRetryInFlight
            ? 'Retrying organization and permission refresh in the background. This warning will disappear once the session context is complete again.'
            : 'Some authenticated data could not be refreshed. You can keep working, but navigation or permission checks may be incomplete until the next successful refresh.'}
        </p>
        {issues.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void handleRetry()}
            loading={isManualRetryInFlight}
          >
            {isManualRetryInFlight ? 'Retrying refresh...' : 'Retry refresh'}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
