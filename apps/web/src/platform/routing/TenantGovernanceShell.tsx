'use client';

import { Activity, Building2, Cable, ShieldCheck, Users } from 'lucide-react';

import {
  buildTenantProfilePath,
  buildTenantProfileSecurityPath,
} from '@/platform/routing/workspace-paths';
import { useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
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
    observability: string;
    organizationStructure: string;
    profile: string;
    security: string;
    subsidiarySettings: string;
    tenantSettings: string;
    userManagement: string;
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
  const { copy, selectedLocale, localeOptions, setLocale } = useRuntimeLocale();

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
      key: 'integration-management',
      label: copy.tenantGovernance.nav.integrationManagement,
      href: `/tenant/${tenantId}/integration-management`,
      isActive: pathname.includes('/integration-management'),
      icon: <Cable className="h-4 w-4" />,
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

  return (
    <AppFrame
      sidebar={
        <SidebarNav
          items={navItems}
          onNavigate={onNavigate}
          ariaLabel={copy.common.mainNavigationLabel}
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
          leftArea={
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                {copy.tenantGovernance.shellLabel}
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {getTenantGovernancePageTitle(tenantId, pathname, copy.tenantGovernance.titles)}
              </p>
            </div>
          }
          rightArea={
            <div className="flex items-center gap-3">
              <LocaleSwitcher
                currentLocale={selectedLocale}
                options={localeOptions}
                onChange={setLocale}
                ariaLabelPrefix={copy.common.languageSwitcherLabel}
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
