// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { Activity, Building, Loader2, Settings, ShieldAlert, TrendingUp, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { integrationApi, systemUserApi, tenantApi } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';

interface DashboardStats {
  activeTenants: number;
  totalUsers: number;
  apiConsumers: number;
  platformHealth: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isAcTenant, isAuthenticated, _hasHydrated } = useAuthStore();
  const t = useTranslations('adminConsole');
  const tStats = useTranslations('adminConsole.stats');
  const tQuickActions = useTranslations('adminConsole.quickActions');

  const [stats, setStats] = useState<DashboardStats>({
    activeTenants: 0,
    totalUsers: 0,
    apiConsumers: 0,
    platformHealth: '-',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Redirect non-AC tenants
  useEffect(() => {
    if (_hasHydrated && isAuthenticated && !isAcTenant) {
      router.replace('/');
    }
  }, [_hasHydrated, isAuthenticated, isAcTenant, router]);

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    if (!isAcTenant) return;
    
    setIsLoading(true);
    try {
      const [tenantsRes, usersRes, adaptersRes] = await Promise.all([
        tenantApi.list(),
        systemUserApi.list({ pageSize: 1 }), // Just to get meta.total
        integrationApi.listAdapters(),
      ]);

      const activeTenants = tenantsRes.success && tenantsRes.data
        ? tenantsRes.data.filter((t: { isActive?: boolean }) => t.isActive !== false).length
        : 0;

      const totalUsers = usersRes.success && usersRes.meta?.pagination?.totalCount
        ? usersRes.meta.pagination.totalCount
        : (usersRes.success && usersRes.data ? usersRes.data.length : 0);

      const apiConsumers = adaptersRes.success && adaptersRes.data
        ? adaptersRes.data.filter((a: { isActive?: boolean }) => a.isActive !== false).length
        : 0;

      // Platform health: if all API calls succeeded, show 100%
      const allSucceeded = tenantsRes.success && usersRes.success && adaptersRes.success;

      setStats({
        activeTenants,
        totalUsers,
        apiConsumers,
        platformHealth: allSucceeded ? '100%' : '-',
      });
    } catch {
      // On error, keep default values
    } finally {
      setIsLoading(false);
    }
  }, [isAcTenant]);

  useEffect(() => {
    if (_hasHydrated && isAuthenticated && isAcTenant) {
      fetchStats();
    }
  }, [_hasHydrated, isAuthenticated, isAcTenant, fetchStats]);

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
    { titleKey: 'acCustomers', descKey: 'acCustomersDesc', href: '/admin/customers', icon: Users },
    { titleKey: 'platformSettings', descKey: 'platformSettingsDesc', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-purple-100 dark:border-purple-900/30 pb-6">
        <h1 className="text-3xl font-bold text-purple-700 dark:text-purple-300">
          {t('title')}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          {t('description')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsConfig.map((stat) => (
          <Card key={stat.titleKey} className="border-white/50 bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{tStats(stat.titleKey)}</p>
                  <p className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {isLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    ) : (
                      stat.value
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <TrendingUp size={12} className="text-green-500" />
                    {tStats(stat.changeKey)}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
          {tQuickActions('title')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Card 
              key={action.titleKey} 
              className="border-white/50 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => router.push(action.href)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-200 transition-colors">
                    <action.icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
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
