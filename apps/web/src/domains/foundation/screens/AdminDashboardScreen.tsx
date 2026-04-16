// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Activity, Building, Loader2, Settings, ShieldAlert, TrendingUp, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import {
  adminDashboardDomainApi,
  type AdminDashboardStats,
} from '@/domains/foundation/api/admin-dashboard.api';
import { useAuthStore } from '@/platform/state/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/platform/ui';

export function AdminDashboardScreen() {
  const router = useRouter();
  const { isAcTenant, isAuthenticated, _hasHydrated } = useAuthStore();
  const t = useTranslations('adminConsole');
  const tStats = useTranslations('adminConsole.stats');
  const tQuickActions = useTranslations('adminConsole.quickActions');

  const [stats, setStats] = useState<AdminDashboardStats>({
    activeTenants: 0,
    totalUsers: 0,
    apiConsumers: 0,
    platformHealth: '-',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (_hasHydrated && isAuthenticated && !isAcTenant) {
      router.replace('/');
    }
  }, [_hasHydrated, isAuthenticated, isAcTenant, router]);

  const fetchStats = useCallback(async () => {
    if (!isAcTenant) {
      return;
    }

    setIsLoading(true);

    try {
      const nextStats = await adminDashboardDomainApi.loadStats();
      setStats(nextStats);
    } catch {
      setStats({
        activeTenants: 0,
        totalUsers: 0,
        apiConsumers: 0,
        platformHealth: '-',
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAcTenant]);

  useEffect(() => {
    if (_hasHydrated && isAuthenticated && isAcTenant) {
      void fetchStats();
    }
  }, [_hasHydrated, fetchStats, isAcTenant, isAuthenticated]);

  const statsConfig = [
    {
      titleKey: 'activeTenants',
      value: stats.activeTenants.toString(),
      changeKey: 'thisMonth',
      icon: Building,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      titleKey: 'totalUsers',
      value: stats.totalUsers.toString(),
      changeKey: 'thisMonth',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      titleKey: 'apiConsumers',
      value: stats.apiConsumers.toString(),
      changeKey: 'thisMonth',
      icon: ShieldAlert,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      titleKey: 'platformHealth',
      value: stats.platformHealth,
      changeKey: 'uptime',
      icon: Activity,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
    },
  ];

  const quickActions = [
    { titleKey: 'manageTenants', descKey: 'manageTenantsDesc', href: '/admin/tenants', icon: Building },
    { titleKey: 'apiConsumers', descKey: 'apiConsumersDesc', href: '/admin/consumers', icon: ShieldAlert },
    { titleKey: 'platformSettings', descKey: 'platformSettingsDesc', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="space-y-8">
      <div className="border-b border-primary/10 pb-6">
        <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {statsConfig.map((stat) => (
          <Card key={stat.titleKey} className="border-border/70 bg-background/95">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{tStats(stat.titleKey)}</p>
                  <p className="text-3xl font-bold text-foreground">
                    {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : stat.value}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    {tStats(stat.changeKey)}
                  </p>
                </div>
                <div className={`rounded-xl p-3 ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">{tQuickActions('title')}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action) => (
            <Card
              key={action.titleKey}
              className="cursor-pointer border-border/70 bg-background/95 transition hover:shadow-md"
              onClick={() => router.push(action.href)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <action.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{tQuickActions(action.titleKey)}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{tQuickActions(action.descKey)}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
