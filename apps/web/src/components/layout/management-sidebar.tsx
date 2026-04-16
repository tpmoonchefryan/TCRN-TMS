/* eslint-disable @typescript-eslint/no-unused-vars */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import {
    Building2,
    ChevronRight,
    Home,
    Plug,
    Settings,
    Users,
    Webhook,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import { STAGING_BANNER_HEIGHT } from '@/components/staging-banner';
import { NoTalentMessage, TalentSelectModal } from '@/components/talent/talent-select-modal';
import { getBusinessSelectableTalents } from '@/lib/talent-lifecycle-routing';
import { cn, isStaging } from '@/lib/utils';
import { TalentInfo, useTalentStore } from '@/stores/talent-store';

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
          ? 'bg-primary/10 text-primary'
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

function NavGroup({ title, children }: NavGroupProps) {
  return (
    <div className="mb-4">
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

export function ManagementSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('navigation');
  const tc = useTranslations('common');
  const { currentTenantId, hasTalentAccess, currentTalent, accessibleTalents, setCurrentTalent, setUIMode } = useTalentStore();
  const businessSelectableTalents = useMemo(
    () => getBusinessSelectableTalents(accessibleTalents),
    [accessibleTalents]
  );
  
  // State for talent selection modal
  const [showTalentModal, setShowTalentModal] = useState(false);

  // Get tenantId from params or store
  const tenantId = (params?.tenantId as string) || currentTenantId || '';

  const baseUrl = `/tenant/${tenantId}`;

  // Calculate top offset for staging banner
  const topOffset = isStaging() ? STAGING_BANNER_HEIGHT : 0;

  const handleHomeClick = () => {
    if (!hasTalentAccess()) {
      return;
    }

    if (currentTalent) {
      setUIMode('business');
      router.push('/customers');
      return;
    }

    if (businessSelectableTalents.length === 1) {
      setCurrentTalent(businessSelectableTalents[0]);
      setUIMode('business');
      router.push('/customers');
      return;
    }

    if (businessSelectableTalents.length > 1) {
      setShowTalentModal(true);
    }
  };

  const handleTalentSelect = (talent: TalentInfo) => {
    setCurrentTalent(talent);
    setUIMode('business');
    setShowTalentModal(false);
    router.push('/customers');
  };

  // Button is enabled only when the user has at least one published talent that can enter the
  // business workspace.
  const isButtonEnabled = hasTalentAccess();

  return (
    <>
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
            <span>{tc('appName')}</span>
          </div>
        </div>

        <div className="flex flex-col h-[calc(100%-4rem)] overflow-y-auto custom-scrollbar">
          {/* Home Button */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            {hasTalentAccess() ? (
              <button
                onClick={handleHomeClick}
                disabled={!isButtonEnabled}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200',
                  isButtonEnabled
                    ? 'bg-primary text-white shadow-md shadow-primary/30 hover:bg-primary/90'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                )}
              >
                <Home size={18} />
                {t('backToBusiness')}
            </button>
          ) : (
            <NoTalentMessage />
          )}
        </div>

        <div className="flex-1 p-4">
          {/* Organization */}
          <NavGroup title={t('organization')}>
            <NavItem
              href={`${baseUrl}/organization-structure`}
              icon={<Building2 size={18} />}
              label={t('organizationStructure')}
              isActive={pathname?.includes('/organization-structure')}
            />
          </NavGroup>

          {/* User Management */}
          <NavGroup title={t('users')}>
            <NavItem
              href={`${baseUrl}/user-management`}
              icon={<Users size={18} />}
              label={t('userList')}
              isActive={pathname?.includes('/user-management')}
            />
          </NavGroup>

          {/* Integration */}
          <NavGroup title={t('integration')}>
            <NavItem
              href={`${baseUrl}/interface-manager`}
              icon={<Plug size={18} />}
              label={t('interfaceAdapter')}
              isActive={pathname?.includes('/interface-manager')}
            />
            <NavItem
              href={`${baseUrl}/webhooks`}
              icon={<Webhook size={18} />}
              label={t('webhooks')}
              isActive={pathname?.includes('/webhooks')}
            />
          </NavGroup>
        </div>

        {/* Tenant Settings */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <Link
            href={`${baseUrl}/settings`}
            className={cn(
              'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200',
              pathname?.includes(`${baseUrl}/settings`)
                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            )}
          >
            <div className="flex items-center gap-3">
              <Settings size={18} />
              {t('tenantSettings')}
            </div>
            <ChevronRight size={16} className="opacity-50" />
          </Link>
        </div>
      </div>
    </aside>
    
    {/* Talent Selection Modal */}
    <TalentSelectModal
      open={showTalentModal}
      talents={businessSelectableTalents}
      onSelect={handleTalentSelect}
    />
  </>
  );
}
