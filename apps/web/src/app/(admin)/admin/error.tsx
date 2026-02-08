// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { Button } from '@/components/ui';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Admin route error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">🔧</div>
        <h1 className="text-xl font-bold mb-2">Admin Panel Error</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          An error occurred in the admin panel. Please try again or contact support.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground mb-4">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} size="sm">
            Try Again
          </Button>
          <Link href="/admin">
            <Button variant="outline" size="sm">
              Back to Admin
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
