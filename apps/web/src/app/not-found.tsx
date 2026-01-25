// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import Link from 'next/link';

import { Button } from '@/components/ui';
import { useAuthStore } from '@/stores/auth-store';

export default function NotFound() {
  const { isAuthenticated } = useAuthStore();
  const href = isAuthenticated ? '/' : '/login';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="text-center px-4">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The page you're looking for doesn't exist.
        </p>
        <Link href={href}>
          <Button>Go to {isAuthenticated ? 'Homepage' : 'Login'}</Button>
        </Link>
      </div>
    </div>
  );
}
