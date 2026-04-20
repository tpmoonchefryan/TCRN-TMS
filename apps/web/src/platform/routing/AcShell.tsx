'use client';

import { Activity, BookText, Building2, Cable, Users } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  buildAcProfilePath,
  buildAcProfileSecurityPath,
  buildAcWorkspacePath,
  buildTenantWorkspacePath,
  isAcTenantTier,
} from '@/platform/routing/workspace-paths';
import { useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useSession } from '@/platform/runtime/session/session-provider';
import {
  AccountDropdownMenu,
  AppFrame,
  LocaleSwitcher,
  SidebarNav,
  StateView,
  TopCommandBar,
} from '@/platform/ui';

function getAcPageTitle(
  pathname: string,
  titles: {
    integrationManagement: string;
    observability: string;
    profile: string;
    systemDictionary: string;
    tenantManagement: string;
    userManagement: string;
  },
) {
  if (pathname.includes('/user-management')) {
    return titles.userManagement;
  }

  if (pathname.includes('/integration-management')) {
    return titles.integrationManagement;
  }

  if (pathname.includes('/observability')) {
    return titles.observability;
  }

  if (pathname.includes('/system-dictionary')) {
    return titles.systemDictionary;
  }

  if (pathname.includes('/profile')) {
    return titles.profile;
  }

  return titles.tenantManagement;
}

export function AcShell({
  tenantId,
  children,
}: Readonly<{
  tenantId: string;
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { copy, selectedLocale, localeOptions, setLocale } = useRuntimeLocale();
  const { status, session, recoverSession, logoutCurrentSession } = useSession();
  const [isSignOutPending, setIsSignOutPending] = useState(false);
  const [isRecoverySuppressed, setIsRecoverySuppressed] = useState(false);
  const loadingCopy = {
    title: pickLocaleText(selectedLocale, {
      en: 'Checking platform account',
      zh_HANS: '正在确认平台账户',
      zh_HANT: '正在確認平台帳戶',
      ja: 'プラットフォームアカウントを確認しています',
      ko: '플랫폼 계정을 확인하고 있습니다',
      fr: 'Vérification du compte plateforme en cours',
    }),
    description: pickLocaleText(selectedLocale, {
      en: 'Verifying your current session.',
      zh_HANS: '正在验证当前会话。',
      zh_HANT: '正在驗證目前工作階段。',
      ja: '現在のセッションを確認しています。',
      ko: '현재 세션을 확인하고 있습니다.',
      fr: 'Vérification de votre session en cours.',
    }),
    unavailableTitle: pickLocaleText(selectedLocale, {
      en: 'Platform account unavailable',
      zh_HANS: '平台账户不可用',
      zh_HANT: '平台帳戶不可用',
      ja: 'プラットフォームアカウントを利用できません',
      ko: '플랫폼 계정을 사용할 수 없습니다',
      fr: 'Compte plateforme indisponible',
    }),
    unavailableDescription: pickLocaleText(selectedLocale, {
      en: 'This page is available to AC administrators only.',
      zh_HANS: '该页面仅对 AC 管理员开放。',
      zh_HANT: '此頁面僅對 AC 管理員開放。',
      ja: 'この画面は AC 管理者専用です。',
      ko: '이 페이지는 AC 관리자만 사용할 수 있습니다.',
      fr: 'Cette page est réservée aux administrateurs AC.',
    }),
  };

  useEffect(() => {
    if (status !== 'authenticated' || !session?.tenantId) {
      return;
    }

    if (!isAcTenantTier(session.tenantTier)) {
      router.replace(buildTenantWorkspacePath(session.tenantId));
      return;
    }

    if (session.tenantId !== tenantId) {
      router.replace(buildAcWorkspacePath(session.tenantId));
    }
  }, [router, session?.tenantId, session?.tenantTier, status, tenantId]);

  useEffect(() => {
    if (status !== 'anonymous' || isRecoverySuppressed) {
      return;
    }

    let cancelled = false;

    async function runRecovery() {
      const recovered = await recoverSession({
        tenantId,
        tenantTier: 'ac',
      });

      if (!recovered && !cancelled) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    }

    void runRecovery();

    return () => {
      cancelled = true;
    };
  }, [isRecoverySuppressed, pathname, recoverSession, router, status, tenantId]);

  useEffect(() => {
    if (status === 'anonymous' && isRecoverySuppressed) {
      router.replace('/login');
    }
  }, [isRecoverySuppressed, router, status]);

  async function handleSignOut() {
    if (isSignOutPending) {
      return;
    }

    setIsRecoverySuppressed(true);
    setIsSignOutPending(true);

    try {
      await logoutCurrentSession();
    } catch {
      // `logoutCurrentSession()` clears local session in its own finally block.
    } finally {
      setIsSignOutPending(false);
      router.replace('/login');
    }
  }

  if (status === 'booting' || (status === 'anonymous' && !session)) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-lg">
          <StateView
            status="unavailable"
            title={loadingCopy.title}
            description={loadingCopy.description}
          />
        </div>
      </div>
    );
  }

  if (!session || !isAcTenantTier(session.tenantTier)) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-lg">
          <StateView
            status="denied"
            title={loadingCopy.unavailableTitle}
            description={loadingCopy.unavailableDescription}
          />
        </div>
      </div>
    );
  }

  const navItems = [
    {
      key: 'tenants',
      label: copy.ac.nav.tenantManagement,
      href: `/ac/${tenantId}/tenants`,
      isActive: pathname.includes('/tenants'),
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      key: 'users',
      label: copy.ac.nav.userManagement,
      href: `/ac/${tenantId}/user-management`,
      isActive: pathname.includes('/user-management'),
      icon: <Users className="h-4 w-4" />,
    },
    {
      key: 'integration',
      label: copy.ac.nav.integrationManagement,
      href: `/ac/${tenantId}/integration-management`,
      isActive: pathname.includes('/integration-management'),
      icon: <Cable className="h-4 w-4" />,
    },
    {
      key: 'observability',
      label: copy.ac.nav.observability,
      href: `/ac/${tenantId}/observability`,
      isActive: pathname.includes('/observability'),
      icon: <Activity className="h-4 w-4" />,
    },
    {
      key: 'system-dictionary',
      label: copy.ac.nav.systemDictionary,
      href: `/ac/${tenantId}/system-dictionary`,
      isActive: pathname.includes('/system-dictionary'),
      icon: <BookText className="h-4 w-4" />,
    },
  ];

  const userName = session.user.displayName || session.user.username || copy.common.authenticatedUser;

  return (
    <AppFrame
      sidebar={
        <SidebarNav
          items={navItems}
          onNavigate={(href) => {
            router.push(href);
          }}
          ariaLabel={copy.common.mainNavigationLabel}
          header={
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">TCRN TMS</p>
              <div className="space-y-1">
                <p className="text-base font-semibold text-slate-900">{session.tenantName}</p>
                <p className="text-xs text-slate-500">{copy.ac.shellSubtitle}</p>
              </div>
            </div>
          }
        />
      }
      commandBar={
        <TopCommandBar
          leftArea={
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{copy.ac.shellLabel}</p>
              <p className="text-lg font-semibold text-slate-900">
                {getAcPageTitle(pathname, copy.ac.titles)}
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
                  router.push(buildAcProfilePath(tenantId));
                }}
                onNavigateSecurity={() => {
                  router.push(buildAcProfileSecurityPath(tenantId));
                }}
                onSignOut={() => {
                  void handleSignOut();
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
