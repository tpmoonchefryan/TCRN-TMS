'use client';

import { Activity, Building2, Cable, ShieldCheck, Users, Webhook } from 'lucide-react';
import { useState } from 'react';

import {
  buildTenantProfilePath,
  buildTenantProfileSecurityPath,
} from '@/platform/routing/workspace-paths';
import { useUiLocale } from '@/platform/runtime/locale/locale-provider';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import type { BrowserSession } from '@/platform/runtime/session/session-provider';
import {
  AccountDropdownMenu,
  AppFrame,
  LocaleSwitcher,
  SidebarNav,
  TopCommandBar,
} from '@/platform/ui';

function getTenantGovernancePageTitle(
  tenantId: string,
  pathname: string,
  titles: {
    integrationManagement: string;
    interfaceManagement: string;
    observability: string;
    organizationStructure: string;
    profile: string;
    security: string;
    subsidiarySettings: string;
    tenantSettings: string;
    userManagement: string;
    webhookManagement: string;
    workspaceLanding: string;
  },
) {
  if (pathname === `/tenant/${tenantId}`) {
    return titles.workspaceLanding;
  }

  if (pathname.includes('/user-management')) {
    return titles.userManagement;
  }

  if (pathname.includes('/integration-management')) {
    return titles.integrationManagement;
  }

  if (pathname.includes('/interface-management')) {
    return titles.interfaceManagement;
  }

  if (pathname.includes('/webhook-management')) {
    return titles.webhookManagement;
  }

  if (pathname === `/tenant/${tenantId}/security`) {
    return titles.security;
  }

  if (pathname.includes('/observability')) {
    return titles.observability;
  }

  if (pathname.includes('/profile')) {
    return titles.profile;
  }

  if (pathname.includes('/subsidiary/') && pathname.includes('/settings')) {
    return titles.subsidiarySettings;
  }

  if (pathname.includes('/settings')) {
    return titles.tenantSettings;
  }

  return titles.organizationStructure;
}

interface TenantGovernanceShellProps {
  tenantId: string;
  pathname: string;
  session: BrowserSession;
  children: React.ReactNode;
  onNavigate: (href: string) => void;
  onSignOut: () => Promise<void>;
  isSignOutPending?: boolean;
}

export function TenantGovernanceShell({
  tenantId,
  pathname,
  session,
  children,
  onNavigate,
  onSignOut,
  isSignOutPending = false,
}: Readonly<TenantGovernanceShellProps>) {
  const { copy, locale, localeOptions, setLocale } = useUiLocale();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const integrationLabels = {
    interfaceManagement: pickLocaleText(locale, {
      en: 'Interface Management',
      zh_HANS: '接口管理',
      zh_HANT: '介面管理',
      ja: 'インターフェース管理',
      ko: '인터페이스 관리',
      fr: 'Gestion des interfaces',
    }),
    webhookManagement: pickLocaleText(locale, {
      en: 'Webhook Management',
      zh_HANS: 'Webhook 管理',
      zh_HANT: 'Webhook 管理',
      ja: 'Webhook 管理',
      ko: '웹훅 관리',
      fr: 'Gestion des webhooks',
    }),
  };

  const navItems = [
    {
      key: 'organization',
      label: copy.tenantGovernance.nav.organizationStructure,
      href: `/tenant/${tenantId}/organization-structure`,
      isActive: pathname.includes('/organization-structure'),
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      key: 'users',
      label: copy.tenantGovernance.nav.userManagement,
      href: `/tenant/${tenantId}/user-management`,
      isActive: pathname.includes('/user-management'),
      icon: <Users className="h-4 w-4" />,
    },
    {
      key: 'interface-management',
      label: integrationLabels.interfaceManagement,
      href: `/tenant/${tenantId}/interface-management`,
      isActive: pathname.includes('/interface-management'),
      icon: <Cable className="h-4 w-4" />,
    },
    {
      key: 'webhook-management',
      label: integrationLabels.webhookManagement,
      href: `/tenant/${tenantId}/webhook-management`,
      isActive: pathname.includes('/webhook-management'),
      icon: <Webhook className="h-4 w-4" />,
    },
    {
      key: 'security',
      label: copy.tenantGovernance.nav.security,
      href: `/tenant/${tenantId}/security`,
      isActive: pathname === `/tenant/${tenantId}/security`,
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
      key: 'observability',
      label: copy.tenantGovernance.nav.observability,
      href: `/tenant/${tenantId}/observability`,
      isActive: pathname.includes('/observability'),
      icon: <Activity className="h-4 w-4" />,
    },
  ];

  const userName = session.user.displayName || session.user.username || copy.common.authenticatedUser;
  const pageTitle = getTenantGovernancePageTitle(tenantId, pathname, {
    ...copy.tenantGovernance.titles,
    interfaceManagement: integrationLabels.interfaceManagement,
    webhookManagement: integrationLabels.webhookManagement,
  });
  const shellA11y = {
    breadcrumb: pickLocaleText(locale, {
      en: 'Workspace breadcrumb',
      zh_HANS: '工作区面包屑',
      zh_HANT: '工作區麵包屑',
      ja: 'ワークスペースのパンくず',
      ko: '워크스페이스 이동 경로',
      fr: 'Fil d’Ariane de l’espace de travail',
    }),
    openNavigation: pickLocaleText(locale, {
      en: 'Open workspace navigation',
      zh_HANS: '打开工作区导航',
      zh_HANT: '開啟工作區導覽',
      ja: 'ワークスペースナビゲーションを開く',
      ko: '워크스페이스 탐색 열기',
      fr: 'Ouvrir la navigation de l’espace de travail',
    }),
    closeNavigation: pickLocaleText(locale, {
      en: 'Close workspace navigation',
      zh_HANS: '关闭工作区导航',
      zh_HANT: '關閉工作區導覽',
      ja: 'ワークスペースナビゲーションを閉じる',
      ko: '워크스페이스 탐색 닫기',
      fr: 'Fermer la navigation de l’espace de travail',
    }),
  };
  const breadcrumbItems = [
    { label: session.tenantName || copy.common.currentTenant, href: `/tenant/${tenantId}` },
    { label: copy.tenantGovernance.shellLabel },
    { label: pageTitle, isCurrent: true },
  ];

  return (
    <AppFrame
      isMobileSidebarOpen={isMobileNavOpen}
      onMobileSidebarOpenChange={setIsMobileNavOpen}
      mobileSidebarLabel={copy.common.mainNavigationLabel}
      mobileSidebarCloseLabel={shellA11y.closeNavigation}
      sidebar={
        <SidebarNav
          items={navItems}
          onNavigate={onNavigate}
          ariaLabel={copy.common.mainNavigationLabel}
          isMobileOpen={isMobileNavOpen}
          onOpenChange={setIsMobileNavOpen}
          header={
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">TCRN TMS</p>
              <div className="space-y-1">
                <p className="text-base font-semibold text-slate-900">
                  {session.tenantName || copy.common.currentTenant}
                </p>
                <p className="text-xs text-slate-500">{copy.tenantGovernance.shellSubtitle}</p>
              </div>
            </div>
          }
        />
      }
      commandBar={
        <TopCommandBar
          breadcrumbItems={breadcrumbItems}
          breadcrumbAriaLabel={shellA11y.breadcrumb}
          onBreadcrumbNavigate={onNavigate}
          onMobileMenuOpen={() => setIsMobileNavOpen(true)}
          mobileMenuButtonLabel={shellA11y.openNavigation}
          leftArea={
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 sm:hidden">
                {copy.tenantGovernance.shellLabel}
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {pageTitle}
              </p>
            </div>
          }
          rightArea={
            <div className="flex items-center gap-3">
              <LocaleSwitcher
                locale={locale}
                options={localeOptions}
                onChange={setLocale}
                ariaLabel={`${copy.common.languageSwitcherLabel}: ${
                  localeOptions.find((o) => o.code === locale)?.label || locale
                }`}
              />
              <AccountDropdownMenu
                user={{
                  name: userName,
                  avatarUrl: session.user.avatarUrl,
                  email: session.user.email,
                }}
                labels={{
                  trigger: copy.common.accountMenuLabel,
                  profile: copy.common.myProfile,
                  security: copy.common.securitySessions,
                  signOut: copy.common.signOut,
                  signingOut: copy.common.signingOut,
                }}
                onNavigateProfile={() => {
                  onNavigate(buildTenantProfilePath(tenantId));
                }}
                onNavigateSecurity={() => {
                  onNavigate(buildTenantProfileSecurityPath(tenantId));
                }}
                onSignOut={() => {
                  void onSignOut();
                }}
                isSignOutPending={isSignOutPending}
              />
            </div>
          }
        />
      }
    >
      {children}
    </AppFrame>
  );
}
