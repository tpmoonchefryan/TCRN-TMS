// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { AlertTriangle, Clock, Globe, RefreshCw, Server, Shield, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Rate limit stats data types
interface RateLimitEndpoint {
  endpoint: string;
  method: string;
  current: number;
  limit: number;
  resetIn: number; // seconds
}

interface RateLimitIP {
  ip: string;
  requests: number;
  blocked: boolean;
  lastSeen: string;
}

interface RateLimitStatsData {
  summary: {
    totalRequests24h: number;
    blockedRequests24h: number;
    uniqueIPs24h: number;
    currentlyBlocked: number;
  };
  topEndpoints: RateLimitEndpoint[];
  topIPs: RateLimitIP[];
  lastUpdated: string;
}

interface RateLimitStatsProps {
  onFetch?: () => Promise<RateLimitStatsData>;
  refreshInterval?: number; // milliseconds
  className?: string;
}

import { securityApi } from '@/lib/api/client';

export function RateLimitStats({ onFetch, refreshInterval = 30000, className }: RateLimitStatsProps) {
  const t = useTranslations('security');
  const tCommon = useTranslations('common');
  
  const [stats, setStats] = useState<RateLimitStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      if (onFetch) {
        const data = await onFetch();
        setStats(data);
      } else {
        // Use real API
        const response = await securityApi.getRateLimitStats();
        // API client returns response directly or wrapped in data property
        const data = 'data' in response ? (response as { data: RateLimitStatsData }).data : response;
        setStats(data as RateLimitStatsData);
      }
    } catch {
      // Keep existing stats on error
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [onFetch]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(true), refreshInterval);
    return () => clearInterval(interval);
  }, [fetchStats, refreshInterval]);

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[300px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const blockRate = stats.summary.totalRequests24h > 0 
    ? ((stats.summary.blockedRequests24h / stats.summary.totalRequests24h) * 100).toFixed(2)
    : 0;

  return (
    <div className={cn('space-y-6 animate-fade-in', className)}>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('rateLimits.totalRequests')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.totalRequests24h.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{t('rateLimits.last24h')}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('rateLimits.blockedRequests')}</CardTitle>
            <Shield className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.summary.blockedRequests24h.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">{blockRate}% {t('rateLimits.blockRate')}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('rateLimits.uniqueIPs')}</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.uniqueIPs24h.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{t('rateLimits.last24h')}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('rateLimits.currentlyBlocked')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{stats.summary.currentlyBlocked}</div>
            <p className="text-xs text-muted-foreground">{t('rateLimits.activeBlocks')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Endpoints */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">{t('rateLimits.topEndpoints')}</CardTitle>
              <CardDescription>{t('rateLimits.endpointsDesc')}</CardDescription>
            </div>
            <Server className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.topEndpoints.map((endpoint, index) => {
              const percentage = (endpoint.current / endpoint.limit) * 100;
              const isHigh = percentage > 80;
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{endpoint.method}</Badge>
                      <span className="font-mono text-xs truncate max-w-[180px]">{endpoint.endpoint}</span>
                    </div>
                    <span className={cn('font-medium', isHigh && 'text-destructive')}>
                      {endpoint.current}/{endpoint.limit}
                    </span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className={cn('h-2', isHigh && '[&>div]:bg-destructive')} 
                  />
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {t('rateLimits.resetsIn', { seconds: endpoint.resetIn })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Top IPs */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">{t('rateLimits.topIPs')}</CardTitle>
              <CardDescription>{t('rateLimits.ipsDesc')}</CardDescription>
            </div>
            <Globe className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topIPs.map((ip, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">{ip.ip}</span>
                    {ip.blocked && (
                      <Badge variant="destructive" className="text-xs">
                        {t('rateLimits.blocked')}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{ip.requests.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{ip.lastSeen}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer with refresh */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {t('rateLimits.lastUpdated')}: {new Date(stats.lastUpdated).toLocaleTimeString()}
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => fetchStats(true)}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
          {tCommon('refresh')}
        </Button>
      </div>
    </div>
  );
}
