// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Legacy /dashboard route redirect
 * Redirects to the home page which will then route appropriately based on user context
 */
export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page, which handles routing based on auth state
    router.replace('/');
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      <p className="mt-4 text-muted-foreground">Redirecting...</p>
    </div>
  );
}
