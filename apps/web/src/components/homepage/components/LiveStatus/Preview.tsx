/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ExternalLink, Twitch, Twitter, Youtube } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface LiveStatusProps {
  platform?: 'youtube' | 'twitch' | 'twitter' | 'bilibili' | 'other';
  channelName?: string;
  channelId?: string;
  streamUrl?: string;
  coverUrl?: string;
  isLive?: boolean;
  viewers?: string;
  title?: string;
}

export const defaultProps: LiveStatusProps = {
  platform: 'youtube',
  channelName: 'Moon Chef Ryan Ch.',
  streamUrl: 'https://youtube.com',
  isLive: true,
  viewers: '1,234',
  title: '🔴 [KAROKE] Singing untill I drop! come join!',
};

const BilibiliIcon = ({ size = 24, className }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect x="3" y="6" width="18" height="14" rx="2" />
    <path d="M8 3L11 6" />
    <path d="M16 3L13 6" />
    <circle cx="9" cy="13" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="13" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
);

const PLATFORM_ICONS = {
  youtube: Youtube,
  twitch: Twitch,
  twitter: Twitter,
  bilibili: BilibiliIcon,
  other: ExternalLink,
  // weibo? 
};

const PLATFORM_COLORS = {
  youtube: 'text-red-600 bg-red-100 dark:bg-red-900/20',
  twitch: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20',
  twitter: 'text-blue-500 bg-blue-100 dark:bg-blue-900/20',
  bilibili: 'text-pink-500 bg-pink-100 dark:bg-pink-900/20',
  other: 'text-gray-600 bg-gray-100 dark:bg-gray-800',
};

export function LiveStatus({ 
  platform = 'youtube', 
  channelName, 
  channelId,
  streamUrl, 
  isLive: isLiveProp, 
  viewers: viewersProp, 
  title: titleProp 
}: LiveStatusProps) {
  const t = useTranslations('homepageComponentEditor.liveStatus');
  const Icon = PLATFORM_ICONS[platform] || ExternalLink;
  const colorClass = PLATFORM_COLORS[platform] || PLATFORM_COLORS.other;

  const [isFetching, setIsFetching] = React.useState(false);
  const [fetchedData, setFetchedData] = React.useState<{ isLive: boolean; title?: string; viewers?: string; coverUrl?: string; } | null>(null);

  React.useEffect(() => {
    if (!channelId || !['bilibili', 'youtube'].includes(platform)) return;

    const fetchStatus = async () => {
      setIsFetching(true);
      try {
        const res = await fetch(`/api/live-status?platform=${platform}&channelId=${channelId}`);
        if (res.ok) {
          const data = await res.json();
          setFetchedData(data);
        }
      } catch (err) {
        console.error('Failed to fetch live status', err);
      } finally {
        setIsFetching(false);
      }
    };

    fetchStatus();
  }, [platform, channelId]);

  // Derived state
  const isLive = fetchedData ? fetchedData.isLive : isLiveProp;
  const title = (fetchedData?.title) || titleProp;
  const viewers = (fetchedData?.viewers) || viewersProp;
  const coverUrl = fetchedData?.coverUrl; 
  
  const displayChannelName = (fetchedData as any)?.channelName || channelName || (channelId ? `Channel ${channelId}` : '');

  let finalStreamUrl = streamUrl;
  if (!finalStreamUrl && channelId) {
      if (platform === 'bilibili') finalStreamUrl = `https://live.bilibili.com/${channelId}`;
      if (platform === 'youtube') finalStreamUrl = `https://www.youtube.com/channel/${channelId}/live`; 
  }

  return (
    <div className="w-full h-full relative group rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border bg-card">
      {/* Background Cover Image (Live) */}
      {coverUrl && isLive ? (
        <div className="absolute inset-0">
          <img 
            src={coverUrl} 
            alt="Live Cover" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
        </div>
      ) : (
        /* Offline / No Cover Background Design */
        <div className="absolute inset-0 overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
           {/* 1. Subtle Gradient */}
           <div className="absolute inset-0 bg-gradient-to-br from-slate-200/50 to-slate-300/50 dark:from-slate-700/50 dark:to-slate-800/50" />
           
           {/* 2. Geometric Pattern (Dots) */}
           <div className="absolute inset-0 opacity-[0.4]" 
                style={{ 
                    backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', 
                    backgroundSize: '20px 20px',
                    color: 'var(--border)' 
                }} 
           />

           {/* 3. Watermark Icon */}
           <div className="absolute -right-6 -bottom-6 opacity-[0.07] dark:opacity-[0.05] transform -rotate-12 transition-transform duration-500 group-hover:rotate-0 group-hover:scale-110">
               <Icon size={140} />
           </div>
           
           {/* 4. Ambient Glow */}
           <div className="absolute top-0 center w-full h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none dark:from-white/5" />
        </div>
      )}

      {/* Content */}
      <div className={cn("relative h-full p-4 flex flex-col justify-between gap-2", coverUrl && isLive && "text-white")}>
        <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
                <span className={cn("p-1.5 rounded-lg backdrop-blur-md", 
                  coverUrl && isLive ? "bg-white/20 text-white" : colorClass
                )}>
                <Icon size={16} />
                </span>
                <span className={cn("font-semibold text-sm truncate", coverUrl && isLive && "text-white/90")}>{displayChannelName}</span>
            </div>
             {isFetching ? (
                <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse text-muted-foreground">{t('checking')}</span>
             ) : isLive ? (
               <span className="flex items-center gap-2 text-white font-bold px-2 py-0.5 bg-red-500 rounded-full text-xs shadow-sm">
                 <span className="relative flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                 </span>
                 {t('live')}
               </span>
             ) : (
                <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-muted-foreground">{t('offline')}</span>
             )}
        </div>
        
        <div className="space-y-3">
             <h3 className={cn("font-bold text-lg leading-tight line-clamp-2", coverUrl && isLive ? "text-white" : "")}>
               {title || (isLive ? t('defaultTitleLive') : t('defaultTitleOffline'))}
             </h3>
             
             <div className="flex items-center justify-between">
                 <div className={cn("text-sm", coverUrl && isLive ? "text-white/80" : "text-muted-foreground")}>
                    {isLive && (
                    <span>
                        {viewers} {platform === 'bilibili' ? t('popularity') : t('watching')}
                    </span>
                    )}
                 </div>

                <Button 
                    variant={coverUrl && isLive ? "secondary" : (isLive ? "default" : "outline")} 
                    size="sm"
                    className={cn("shrink-0", !coverUrl && isLive && "bg-red-600 hover:bg-red-700 text-white")}
                    onClick={() => finalStreamUrl && window.open(finalStreamUrl, '_blank')}
                >
                    {isLive ? t('watchNow') : t('visitChannel')}
                </Button>
             </div>
        </div>
      </div>
    </div>
  );
}
