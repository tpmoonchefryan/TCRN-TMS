'use client';

import {
  Building2,
  FileSpreadsheet,
  Globe2,
  LayoutDashboard,
  Mailbox,
  Users2,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { readTalentDetail } from '@/domains/config-dictionary-settings/api/settings.api';
import { ApiRequestError } from '@/platform/http/api';
import {
  buildTalentWorkspacePath,
  buildTalentWorkspaceSectionPath,
  buildTenantProfilePath,
  buildTenantProfileSecurityPath,
  type TalentWorkspaceSection,
} from '@/platform/routing/workspace-paths';
import { useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { type BrowserSession, useSession } from '@/platform/runtime/session/session-provider';
import {
  AccountDropdownMenu,
  AppFrame,
  LocaleSwitcher,
  SidebarNav,
  TopCommandBar,
} from '@/platform/ui';

function getTalentBusinessTitle(
  section: TalentWorkspaceSection,
  titles: {
    customers: string;
    homepage: string;
    marshmallow: string;
    overview: string;
    reports: string;
    settings: string;
  },
) {
  switch (section) {
    case 'customers':
      return titles.customers;
    case 'homepage':
      return titles.homepage;
    case 'marshmallow':
      return titles.marshmallow;
    case 'reports':
      return titles.reports;
    case 'settings':
      return titles.settings;
    case 'overview':
    default:
      return titles.overview;
  }
}

interface TalentBusinessShellProps {
  tenantId: string;
  talentId: string;
  section: TalentWorkspaceSection;
  session: BrowserSession;
  children: React.ReactNode;
  onNavigate: (href: string) => void;
  onSignOut: () => Promise<void>;
  isSignOutPending?: boolean;
}

export function TalentBusinessShell({
  tenantId,
  talentId,
  section,
  session,
  children,
  onNavigate,
  onSignOut,
  isSignOutPending = false,
}: Readonly<TalentBusinessShellProps>) {
  const { copy, selectedLocale, localeOptions, setLocale } = useRuntimeLocale();
  const { request } = useSession();
  const [talentName, setTalentName] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTalentName() {
      try {
        const detail = await readTalentDetail(request, talentId);

        if (!cancelled) {
          setTalentName(detail.displayName);
        }
      } catch (error) {
        if (!cancelled && !(error instanceof ApiRequestError)) {
          setTalentName(null);
        }
      }
    }

    void loadTalentName();

    return () => {
      cancelled = true;
    };
  }, [request, talentId]);

  const navItems = [
    {
      key: 'overview',
      label: copy.talentBusiness.nav.overview,
      href: buildTalentWorkspacePath(tenantId, talentId),
      isActive: section === 'overview',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      key: 'customers',
      label: copy.talentBusiness.nav.customers,
      href: buildTalentWorkspaceSectionPath(tenantId, talentId, 'customers'),
      isActive: section === 'customers',
      icon: <Users2 className="h-4 w-4" />,
    },
    {
      key: 'homepage',
      label: copy.talentBusiness.nav.homepage,
      href: buildTalentWorkspaceSectionPath(tenantId, talentId, 'homepage'),
      isActive: section === 'homepage',
      icon: <Globe2 className="h-4 w-4" />,
    },
    {
      key: 'marshmallow',
      label: copy.talentBusiness.nav.marshmallow,
      href: buildTalentWorkspaceSectionPath(tenantId, talentId, 'marshmallow'),
      isActive: section === 'marshmallow',
      icon: <Mailbox className="h-4 w-4" />,
    },
    {
      key: 'reports',
      label: copy.talentBusiness.nav.reports,
      href: buildTalentWorkspaceSectionPath(tenantId, talentId, 'reports'),
      isActive: section === 'reports',
      icon: <FileSpreadsheet className="h-4 w-4" />,
    },
  ];

  const organizationHref = `/tenant/${tenantId}/organization-structure`;
  const userName = session.user.displayName || session.user.username || copy.common.authenticatedUser;
  const pageTitle = getTalentBusinessTitle(section, copy.talentBusiness.titles);
  const resolvedTalentName =
    talentName ||
    pickLocaleText(selectedLocale, {
      en: 'Talent workspace',
      zh_HANS: '艺人工作区',
      zh_HANT: '藝人工作區',
      ja: 'タレントワークスペース',
      ko: '탤런트 워크스페이스',
      fr: 'Espace de travail talent',
    });
  const shellA11y = {
    breadcrumb: pickLocaleText(selectedLocale, {
      en: 'Workspace breadcrumb',
      zh_HANS: '工作区面包屑',
      zh_HANT: '工作區麵包屑',
      ja: 'ワークスペースのパンくず',
      ko: '워크스페이스 이동 경로',
      fr: 'Fil d’Ariane de l’espace de travail',
    }),
    openNavigation: pickLocaleText(selectedLocale, {
      en: 'Open workspace navigation',
      zh_HANS: '打开工作区导航',
      zh_HANT: '開啟工作區導覽',
      ja: 'ワークスペースナビゲーションを開く',
      ko: '워크스페이스 탐색 열기',
      fr: 'Ouvrir la navigation de l’espace de travail',
    }),
    closeNavigation: pickLocaleText(selectedLocale, {
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
    { label: resolvedTalentName, href: buildTalentWorkspacePath(tenantId, talentId) },
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
                <p className="text-xs text-slate-500">{copy.talentBusiness.shellSubtitle}</p>
              </div>
            </div>
          }
          footer={
            <div className="space-y-2">
              <Link
                href={organizationHref}
                className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-medium text-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 hover:border-slate-300 hover:bg-white"
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
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                {copy.talentBusiness.shellLabel}
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {pageTitle}
              </p>
            </div>
          }
          rightArea={
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-white/70 bg-white/70 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {copy.common.talentScope}
                </p>
                <p className="text-sm font-semibold text-slate-900">{resolvedTalentName}</p>
              </div>

              <LocaleSwitcher
                currentLocale={selectedLocale}
                options={localeOptions}
                onChange={setLocale}
                ariaLabel={`${copy.common.languageSwitcherLabel}: ${
                  localeOptions.find((o) => o.code === selectedLocale)?.label || selectedLocale
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
