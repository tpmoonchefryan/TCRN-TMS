 
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
    ChevronRight,
    FileSpreadsheet,
    Globe,
    History,
    MessageSquareHeart,
    Settings,
    UserCog,
    Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';

import { STAGING_BANNER_HEIGHT } from '@/components/staging-banner';
import { TalentSwitcher } from '@/components/talent/talent-switcher';
import { useCurrentTalent } from '@/hooks/use-current-talent';
import { useFeatureToggle } from '@/hooks/use-feature-toggle';
import { useUIMode } from '@/hooks/use-ui-mode';
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
          ? 'bg-primary text-white shadow-md shadow-primary/30'
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
}

function NavGroup({ title: _title, children }: NavGroupProps) {
  return (
    <div className="mb-4">
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

export function BusinessSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('navigation');
  const { switchToManagementUI, currentTenantId } = useUIMode();
  const { currentTalent } = useCurrentTalent();
  const { marshmallowEnabled, homepageEnabled } = useFeatureToggle();

  // Calculate top offset for staging banner
  const topOffset = isStaging() ? STAGING_BANNER_HEIGHT : 0;

  // Build talent settings URL based on talent's position in organization
  const getTalentSettingsUrl = () => {
    if (!currentTenantId || !currentTalent) return null;
    
    if (currentTalent.subsidiaryId) {
      return `/tenant/${currentTenantId}/subsidiary/${currentTalent.subsidiaryId}/talent/${currentTalent.id}/settings`;
    }
    return `/tenant/${currentTenantId}/talent/${currentTalent.id}/settings`;
  };

  const handleTalentSettingsClick = () => {
    const url = getTalentSettingsUrl();
    if (url) {
      switchToManagementUI();
      router.push(url);
    }
  };

  const handleConfigClick = () => {
    switchToManagementUI();
    if (currentTenantId) {
      router.push(`/tenant/${currentTenantId}/organization-structure`);
    }
  };

  return (
    <aside 
      className="fixed left-0 z-40 w-64 border-r bg-white/80 backdrop-blur-xl transition-transform dark:bg-slate-950/80 dark:border-slate-800 hidden md:block"
      style={{ 
        top: topOffset, 
        height: `calc(100vh - ${topOffset}px)` 
      }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-pink-400 rounded-lg flex items-center justify-center text-white">
            T
          </div>
          <span>TCRN TMS</span>
        </div>
      </div>

      <div className="flex flex-col h-[calc(100%-4rem)] overflow-y-auto custom-scrollbar">
        {/* Talent Switcher */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <TalentSwitcher />
        </div>

        <div className="flex-1 p-4">
          {/* Business Menu */}
          <NavGroup title={t('customers')}>
            <NavItem
              href="/customers"
              icon={<Users size={18} />}
              label={t('customers')}
              isActive={pathname === '/customers' || pathname?.startsWith('/customers/')}
            />
          </NavGroup>

          {/* Page Management - only show if at least one feature is enabled */}
          {(homepageEnabled || marshmallowEnabled) && (
            <NavGroup title={t('homepage')}>
              {homepageEnabled && (
                <NavItem
                  href="/homepage"
                  icon={<Globe size={18} />}
                  label={t('homepage')}
                  isActive={pathname === '/homepage' || pathname?.startsWith('/homepage/')}
                />
              )}
              {marshmallowEnabled && (
                <NavItem
                  href="/marshmallow"
                  icon={<MessageSquareHeart size={18} />}
                  label={t('marshmallow')}
                  isActive={pathname === '/marshmallow' || pathname?.startsWith('/marshmallow/')}
                />
              )}
            </NavGroup>
          )}

          {/* Reports */}
          <NavGroup title={t('reports')}>
            <NavItem
              href="/reports"
              icon={<FileSpreadsheet size={18} />}
              label={t('reports')}
              isActive={pathname === '/reports' || pathname?.startsWith('/reports/')}
            />
          </NavGroup>

          {/* Logs */}
          <NavGroup title={t('logs')}>
            <NavItem
              href="/logs"
              icon={<History size={18} />}
              label={t('logs')}
              isActive={pathname === '/logs' || pathname?.startsWith('/logs/')}
            />
          </NavGroup>
        </div>

        {/* Talent Settings & Configuration Buttons */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
          {/* Talent Settings Button */}
          {currentTalent && (
            <button
              onClick={handleTalentSettingsClick}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200',
                'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              )}
            >
              <div className="flex items-center gap-3">
                <UserCog size={18} />
                {t('talentSettings')}
              </div>
              <ChevronRight size={16} className="opacity-50" />
            </button>
          )}

          {/* Configuration Button */}
          <button
            onClick={handleConfigClick}
            className={cn(
              'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200',
              'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            )}
          >
            <div className="flex items-center gap-3">
              <Settings size={18} />
              {t('configuration')}
            </div>
            <ChevronRight size={16} className="opacity-50" />
          </button>
        </div>
      </div>
    </aside>
  );
}
