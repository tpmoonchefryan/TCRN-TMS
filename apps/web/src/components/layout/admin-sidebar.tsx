// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
    Building,
    LayoutDashboard,
    Settings,
    ShieldAlert,
    Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';

import { STAGING_BANNER_HEIGHT } from '@/components/staging-banner';
import { cn, isStaging } from '@/lib/utils';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
}

function NavItem({ href, icon, label, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 mx-2',
        isActive
          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

interface NavGroupProps {
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'admin';
}

function NavGroup({ title, children, variant = 'default' }: NavGroupProps) {
  return (
    <div className="mb-6">
      <h3
        className={cn(
          'px-4 text-xs font-semibold uppercase tracking-wider mb-2',
          variant === 'admin' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'
        )}
      >
        {title}
      </h3>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const t = useTranslations('adminConsole.sidebar');

  // Calculate top offset for staging banner
  const topOffset = isStaging() ? STAGING_BANNER_HEIGHT : 0;

  return (
    <aside 
      className="fixed left-0 z-40 w-64 border-r bg-white/80 backdrop-blur-xl transition-transform dark:bg-slate-950/80 dark:border-slate-800 hidden md:block"
      style={{ 
        top: topOffset, 
        height: `calc(100vh - ${topOffset}px)` 
      }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-purple-100 dark:border-purple-900/30">
        <div className="flex items-center gap-2 font-bold text-xl text-purple-700 dark:text-purple-300">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white">
            AC
          </div>
          <span>{t('title')}</span>
        </div>
      </div>

      <div className="flex flex-col h-[calc(100%-4rem)] overflow-y-auto custom-scrollbar p-4">
        {/* Overview */}
        <NavGroup title={t('overview')}>
          <NavItem
            href="/admin"
            icon={<LayoutDashboard size={18} />}
            label={t('dashboard')}
            isActive={pathname === '/admin'}
          />
        </NavGroup>

        {/* Platform Management */}
        <NavGroup title={t('platformAdmin')} variant="admin">
          <NavItem
            href="/admin/tenants"
            icon={<Building size={18} />}
            label={t('tenants')}
            isActive={pathname?.includes('/admin/tenants')}
          />
          <NavItem
            href="/admin/consumers"
            icon={<ShieldAlert size={18} />}
            label={t('apiConsumers')}
            isActive={pathname?.includes('/admin/consumers')}
          />
          <NavItem
            href="/admin/customers"
            icon={<Users size={18} />}
            label={t('acCustomers')}
            isActive={pathname?.includes('/admin/customers')}
          />
          <NavItem
            href="/admin/users"
            icon={<Users size={18} />}
            label={t('userManagement')}
            isActive={pathname?.includes('/admin/users')}
          />
          <NavItem
            href="/admin/roles"
            icon={<ShieldAlert size={18} />}
            label={t('userRoles')}
            isActive={pathname?.includes('/admin/roles')}
          />
        </NavGroup>

        {/* System */}
        <div className="mt-auto">
          <NavGroup title={t('system')}>
            <NavItem
              href="/admin/settings"
              icon={<Settings size={18} />}
              label={t('platformSettings')}
              isActive={pathname?.includes('/admin/settings')}
            />
          </NavGroup>
        </div>
      </div>
    </aside>
  );
}
