'use client';

import { BriefcaseBusiness,Building2 } from 'lucide-react';
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

function getScopeLabel(
  locale: string,
  scopeType: 'tenant' | 'subsidiary',
) {
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
    fr: 'Métier de la filiale',
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
  const { copy, selectedLocale, localeOptions, setLocale } = useRuntimeLocale();
  const { request } = useSession();
  const [scopeName, setScopeName] = useState<string | null>(scopeType === 'tenant' ? session.tenantName : null);

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
          setScopeName(detail.name);
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

  const scopeLabel = getScopeLabel(selectedLocale, scopeType);
  const navItems = [
    {
      key: 'overview',
      label: pickLocaleText(selectedLocale, {
        en: 'Business overview',
        zh_HANS: '业务总览',
        zh_HANT: '業務總覽',
        ja: '業務概要',
        ko: '비즈니스 개요',
        fr: 'Vue métier',
      }),
      href: scopeType === 'tenant'
        ? buildTenantBusinessPath(tenantId)
        : buildSubsidiaryBusinessPath(tenantId, subsidiaryId ?? ''),
      isActive: true,
      icon: <BriefcaseBusiness className="h-4 w-4" />,
    },
  ];
  const organizationHref = `/tenant/${tenantId}/organization-structure`;
  const userName = session.user.displayName || session.user.username || copy.common.authenticatedUser;
  const resolvedScopeName =
    scopeName ||
    (scopeType === 'tenant'
      ? session.tenantName
      : pickLocaleText(selectedLocale, {
          en: 'Selected subsidiary',
          zh_HANS: '当前分目录',
          zh_HANT: '目前分目錄',
          ja: '選択中の配下スコープ',
          ko: '선택한 하위 조직',
          fr: 'Filiale sélectionnée',
        }));

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
                <p className="text-xs text-slate-500">{scopeLabel}</p>
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
          leftArea={
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                {scopeLabel}
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {pickLocaleText(selectedLocale, {
                  en: 'Business workspace',
                  zh_HANS: '业务工作区',
                  zh_HANT: '業務工作區',
                  ja: '業務ワークスペース',
                  ko: '비즈니스 워크스페이스',
                  fr: 'Espace métier',
                })}
              </p>
            </div>
          }
          rightArea={
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-white/70 bg-white/70 px-4 py-2 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {scopeLabel}
                </p>
                <p className="text-sm font-semibold text-slate-900">{resolvedScopeName}</p>
              </div>

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
