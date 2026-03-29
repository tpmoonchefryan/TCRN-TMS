// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { notFound } from 'next/navigation';
import React from 'react';

import { PublicFooter } from '@/components/marshmallow/public/PublicFooter';
import { PublicHeader } from '@/components/marshmallow/public/PublicHeader';
import { fetchPublicMarshmallowConfig } from '@/lib/api/modules/public-marshmallow-fetch';
import { cn } from '@/lib/utils';

export default async function MarshmallowPublicLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  const config = await fetchPublicMarshmallowConfig(path, { revalidate: 300 });

  if (!config) {
    notFound();
  }

  const primaryColor =
    (typeof config.theme.primaryColor === 'string' && config.theme.primaryColor) ||
    (typeof config.theme.primary_color === 'string' && config.theme.primary_color) ||
    '#ec4899';
  const themeStyles = {
    '--mm-primary': primaryColor,
  } as React.CSSProperties;

  return (
    <div 
      className={cn(
        "min-h-screen bg-slate-50 font-sans selection:bg-pink-100 selection:text-pink-900"
      )}
      style={themeStyles}
    >
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-50">
         <div className="absolute inset-0 bg-gradient-to-br from-pink-50 via-white to-purple-50" />
         <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-white/80 to-transparent" />
      </div>

      {/* Header with language switcher */}
      <PublicHeader />

      <main className="relative z-10 max-w-2xl mx-auto min-h-screen flex flex-col">
        {children}
        
        <PublicFooter path={path} />
      </main>
    </div>
  );
}
