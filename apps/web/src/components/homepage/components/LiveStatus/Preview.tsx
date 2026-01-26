// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { ExternalLink, Twitch, Twitter, Youtube } from 'lucide-react';
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

const PLATFORM_ICONS = {
  youtube: Youtube,
  twitch: Twitch,
  twitter: Twitter,
  bilibili: ExternalLink, // No icon for bilibili yet
  other: ExternalLink,
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
  const Icon = PLATFORM_ICONS[platform] || ExternalLink;
  const colorClass = PLATFORM_COLORS[platform] || PLATFORM_COLORS.other;

  const [isFetching, setIsFetching] = React.useState(false);
  const [fetchedData, setFetchedData] = React.useState<{ isLive: boolean; title?: string; viewers?: string; coverUrl?: string; } | null>(null);

  // Determine if we should use manual props or fetched data
  // Implementation Note: User can toggle "isLive" switch in editor. 
  // If user *manually* toggles it to TRUE, we respect that (Override).
  // But usually we want: if override is FALSE (default?), we auto-fetch.
  // Actually, the Schema prop is `isLive`. The editor calls it "Is Live (Manual Override)".
  // Let's assume if `channelId` is present, we try to fetch on mount.
  // If the fetch is successful, we display the fetched status.
  // If the user has explicitly set `isLive: true` in props, maybe that takes precedence?
  // Let's adopt a policy: 
  // 1. If `channelId` exists, fetch.
  // 2. If fetch returns `isLive: true`, use it.
  // 3. IF fetch returns false or fails, AND `isLiveProp` (manual override) is true, use manual.
  // Wait, usually "Override" implies it beats everything. 
  // Let's say: If Manual Override is OFF (which we can't strictly know unless we add a prop `useAutoFetch` or similar, or assume `isLive` acts as the override state).
  // Current Editor UI: "Is Live (Manual Override)". This suggests `isLive` PROP is the override.
  // So: Default `isLive` is false (or true). 
  // Let's try: Always fetch if `channelId` exists. Display fetched data if available. Fallback to props if fetch fails or if user wants to force-show live state manually?
  // User request: "support fetching... don't auto-poll, just on fresh page".
  
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
  const coverUrl = fetchedData?.coverUrl; // TODO: allow manual cover override? Schema doesn't have it yet.
  
  // Auto-fill channel name if fetched, or fallback to prop
  const displayChannelName = (fetchedData as any)?.channelName || channelName || (channelId ? `Channel ${channelId}` : '');

  // Auto-construct URL if missing in Auto Mode
  let finalStreamUrl = streamUrl;
  if (!finalStreamUrl && channelId) {
      if (platform === 'bilibili') finalStreamUrl = `https://live.bilibili.com/${channelId}`;
      if (platform === 'youtube') finalStreamUrl = `https://www.youtube.com/channel/${channelId}/live`; 
  }

  return (
    <div className="w-full h-full relative group rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border bg-card">
      {/* Background Cover Image */}
      {coverUrl && isLive && (
        <div className="absolute inset-0">
          <img 
            src={coverUrl} 
            alt="Live Cover" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
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
                <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse text-muted-foreground">Checking...</span>
             ) : isLive ? (
               <span className="flex items-center gap-2 text-white font-bold px-2 py-0.5 bg-red-500 rounded-full text-xs shadow-sm">
                 <span className="relative flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                 </span>
                 LIVE
               </span>
             ) : (
                <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-muted-foreground">OFFLINE</span>
             )}
        </div>
        
        <div className="space-y-3">
             <h3 className={cn("font-bold text-lg leading-tight line-clamp-2", coverUrl && isLive ? "text-white" : "")}>
               {title || (isLive ? 'Live Stream' : 'Offline')}
             </h3>
             
             <div className="flex items-center justify-between">
                 <div className={cn("text-sm", coverUrl && isLive ? "text-white/80" : "text-muted-foreground")}>
                    {isLive && (
                    <span>
                        {viewers} {platform === 'bilibili' ? 'Popularity' : 'watching'}
                    </span>
                    )}
                 </div>

                <Button 
                    variant={coverUrl && isLive ? "secondary" : (isLive ? "default" : "outline")} 
                    size="sm"
                    className={cn("shrink-0", !coverUrl && isLive && "bg-red-600 hover:bg-red-700 text-white")}
                    onClick={() => finalStreamUrl && window.open(finalStreamUrl, '_blank')}
                >
                    {isLive ? "Watch Now" : "Visit Channel"}
                </Button>
             </div>
        </div>
      </div>
    </div>
  );
}
