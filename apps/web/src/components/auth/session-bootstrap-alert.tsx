// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuthStore } from '@/stores/auth-store';

const getBootstrapIssues = (errors: { talents?: string; permissions?: string } | null): string[] => {
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
  const { sessionBootstrapStatus, sessionBootstrapErrors } = useAuthStore();

  if (sessionBootstrapStatus !== 'degraded') {
    return null;
  }

  const issues = getBootstrapIssues(sessionBootstrapErrors);

  return (
    <Alert
      variant="warning"
      className="mb-4 border-amber-300/70 bg-amber-50/80 text-amber-900 dark:border-amber-500/50 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Session restored with limited context</AlertTitle>
      <AlertDescription>
        <p>
          Some authenticated data could not be refreshed. You can keep working, but navigation or
          permission checks may be incomplete until the next successful refresh.
        </p>
        {issues.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
}
