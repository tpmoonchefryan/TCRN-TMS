// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useAuthStore } from '@/stores/auth-store';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated, checkAuth } = useAuthStore();
  const [isVerified, setIsVerified] = useState(false);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Only proceed once store is hydrated
    if (!_hasHydrated) return;
    
    // Prevent duplicate checks
    if (hasCheckedRef.current) return;

    const verifySession = async () => {
      // If store says not authenticated, redirect immediately
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      // Mark as checked to prevent re-running
      hasCheckedRef.current = true;

      // If store says authenticated, double check with API (restore token)
      const valid = await checkAuth();
      
      if (valid) {
        setIsVerified(true);
      } else {
        // If check failed (refresh failed), redirect
        hasCheckedRef.current = false; // Allow retry on next mount
        router.push('/login');
      }
    };

    verifySession();
  }, [_hasHydrated, isAuthenticated, checkAuth, router]);

  // Show loading while hydrating or verifying
  if (!_hasHydrated || !isVerified) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
