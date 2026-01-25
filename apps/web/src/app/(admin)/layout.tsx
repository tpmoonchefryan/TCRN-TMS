// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ReactNode } from 'react';

import { AuthGuard } from '@/components/auth/auth-guard';
import { AdminHeader } from '@/components/layout/admin-header';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { STAGING_BANNER_HEIGHT, StagingBanner } from '@/components/staging-banner';
import { isStaging } from '@/lib/utils';


interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const topOffset = isStaging() ? STAGING_BANNER_HEIGHT : 0;
  const headerHeight = 64; // h-16

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <StagingBanner />
        <AdminHeader />
        <AdminSidebar />
        <main 
          className="md:ml-64 min-h-screen"
          style={{ paddingTop: topOffset + headerHeight }}
        >
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
