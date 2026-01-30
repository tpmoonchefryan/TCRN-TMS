/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { notFound } from 'next/navigation';
import React from 'react';

import { PublicFooter } from '@/components/marshmallow/public/PublicFooter';
import { PublicHeader } from '@/components/marshmallow/public/PublicHeader';
import { cn } from '@/lib/utils';

// Self-hosted fonts imported in root layout

// Marshmallow config type matching backend API response
interface MarshmallowConfig {
  talent: {
    displayName: string;
    avatarUrl: string | null;
  };
  title: string | null;
  welcomeText: string | null;
  placeholderText: string | null;
  allowAnonymous: boolean;
  maxMessageLength: number;
  minMessageLength: number;
  reactionsEnabled: boolean;
  allowedReactions: string[];
  theme: Record<string, unknown>;
}

// Fetch marshmallow config from API
const getConfigByPath = async (path: string): Promise<MarshmallowConfig | null> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  try {
    const res = await fetch(`${apiUrl}/api/v1/public/marshmallow/${path}/config`, {
      next: { revalidate: 300 } // Cache for 5 minutes
    });
    
    if (!res.ok) {
      if (res.status === 404) return null;
      console.error('Failed to fetch marshmallow config:', res.statusText);
      return null;
    }
    
    const response = await res.json();
    // Backend wraps response in { success: true, data: {...} }
    return response.data || response;
  } catch (error) {
    console.error('Error fetching marshmallow config:', error);
    return null;
  }
};

export default async function MarshmallowPublicLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  const config = await getConfigByPath(path);

  if (!config) {
    notFound();
  }

  // Dynamic Theme Styles - theme may have primaryColor or primary_color
  const primaryColor = (config.theme as any)?.primaryColor || (config.theme as any)?.primary_color || '#ec4899';
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
