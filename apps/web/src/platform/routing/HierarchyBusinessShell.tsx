'use client';

import { BriefcaseBusiness, Building2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { readSubsidiaryDetail } from '@/domains/config-dictionary-settings/api/settings.api';
import { ApiRequestError } from '@/platform/http/api';
import {
  buildSubsidiaryBusinessPath,
  buildTenantBusinessPath,
  buildTenantProfilePath,
  buildTenantProfileSecurityPath,
} from '@/platform/routing/workspace-paths';
import { useUiLocale } from '@/platform/runtime/locale/locale-provider';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { type BrowserSession, useSession } from '@/platform/runtime/session/session-provider';
import {
  AccountDropdownMenu,
  AppFrame,
  LocaleSwitcher,
  SidebarNav,
  TopCommandBar,
} from '@/platform/ui';

interface HierarchyBusinessShellProps {
  tenantId: string;
  scopeType: 'tenant' | 'subsidiary';
  subsidiaryId?: string;
  session: BrowserSession;
  children: React.ReactNode;
  onNavigate: (href: string) => void;
  onSignOut: () => Promise<void>;
  isSignOutPending?: boolean;
}

function getScopeLabel(locale: string, scopeType: 'tenant' | 'subsidiary') {
  if (scopeType === 'tenant') {
    return pickLocaleText(locale, {
      en: 'Tenant business',
      zh_HANS: '租户业务',
      zh_HANT: '租戶業務',
      ja: 'テナント業務',
      ko: '테넌트 비즈니스',
      fr: 'Métier du tenant',
    });
  }

  return pickLocaleText(locale, {
    en: 'Subsidiary business',
    zh_HANS: '分目录业务',
    zh_HANT: '分目錄業務',
    ja: '配下スコープ業務',
    ko: '하위 조직 비즈니스',
    fr: 'Métier du périmètre',
  });
}

export function HierarchyBusinessShell({
  tenantId,
  scopeType,
  subsidiaryId,
  session,
  children,
  onNavigate,
  onSignOut,
  isSignOutPending = false,
}: Readonly<HierarchyBusinessShellProps>) {
  const { copy, locale, localeOptions, setLocale } = useUiLocale();
  const { request } = useSession();
  const [scopeName, setScopeName] = useState<string | null>(
    scopeType === 'tenant' ? session.tenantName : null
  );
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadScopeName() {
      if (scopeType === 'tenant') {
        setScopeName(session.tenantName);
        return;
      }

      if (!subsidiaryId) {
        setScopeName(null);
        return;
      }

      try {
        const detail = await readSubsidiaryDetail(request, subsidiaryId);

        if (!cancelled) {
          setScopeName(detail.localizedName);
        }
      } catch (error) {
        if (!cancelled && !(error instanceof ApiRequestError)) {
          setScopeName(null);
        }
      }
    }

    void loadScopeName();

    return () => {
      cancelled = true;
    };
  }, [request, scopeType, session.tenantName, subsidiaryId]);

  const navItems = [
    {
      key: 'overview',
      label: pickLocaleText(locale, {
        en: 'Business overview',
        zh_HANS: '业务总览',
        zh_HANT: '業務總覽',
        ja: '業務概要',
        ko: '비즈니스 개요',
        fr: 'Vue métier',
      }),
      href:
        scopeType === 'tenant'
          ? buildTenantBusinessPath(tenantId)
          : buildSubsidiaryBusinessPath(tenantId, subsidiaryId ?? ''),
      isActive: true,
      icon: <BriefcaseBusiness className="h-4 w-4" />,
    },
  ];
  const organizationHref = `/tenant/${tenantId}/organization-structure`;
  const userName =
    session.user.displayName || session.user.username || copy.common.authenticatedUser;
  const scopeLabel = getScopeLabel(locale, scopeType);
  const resolvedScopeName = scopeName || session.tenantName || copy.common.currentTenant;
  const pageTitle = pickLocaleText(locale, {
    en: 'Business workspace',
    zh_HANS: '业务工作区',
    zh_HANT: '業務工作區',
    ja: '業務ワークスペース',
    ko: '비즈니스 워크스페이스',
    fr: 'Espace métier',
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
  const breadcrumbItems =
    scopeType === 'subsidiary' && subsidiaryId
      ? [
          {
            label: session.tenantName || copy.common.currentTenant,
            href: buildTenantBusinessPath(tenantId),
          },
          { label: resolvedScopeName, href: buildSubsidiaryBusinessPath(tenantId, subsidiaryId) },
          { label: pageTitle, isCurrent: true },
        ]
      : [
          {
            label: session.tenantName || copy.common.currentTenant,
            href: buildTenantBusinessPath(tenantId),
          },
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
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                TCRN TMS
              </p>
              <div className="space-y-1">
                <p className="text-base font-semibold text-slate-900">
                  {session.tenantName || copy.common.currentTenant}
                </p>
                <p className="text-xs text-slate-500">{scopeLabel}</p>
              </div>
            </div>
          }
          footer={
            <div className="space-y-2">
              <Link
                href={organizationHref}
                className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Building2 className="h-4 w-4" />
                {copy.tenantGovernance.nav.organizationStructure}
              </Link>
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
                {scopeLabel}
              </p>
              <p className="text-lg font-semibold text-slate-900">{pageTitle}</p>
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
