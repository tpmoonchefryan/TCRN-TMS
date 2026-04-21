'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  buildAcWorkspacePath,
  buildTenantWorkspacePath,
  isAcTenantTier,
  resolveHierarchyBusinessRoute,
  resolveTalentWorkspaceRoute,
} from '@/platform/routing/workspace-paths';
import { useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useSession } from '@/platform/runtime/session/session-provider';
import { StateView } from '@/platform/ui';

import { HierarchyBusinessShell } from './HierarchyBusinessShell';
import { TalentBusinessShell } from './TalentBusinessShell';
import { TenantGovernanceShell } from './TenantGovernanceShell';

export function PrivateShell({
  tenantId,
  children,
}: Readonly<{
  tenantId: string;
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { selectedLocale } = useRuntimeLocale();
  const { status, session, recoverSession, logoutCurrentSession } = useSession();
  const [isSignOutPending, setIsSignOutPending] = useState(false);
  const [isRecoverySuppressed, setIsRecoverySuppressed] = useState(false);
  const loadingCopy = {
    title: pickLocaleText(selectedLocale, {
      en: 'Checking account',
      zh_HANS: '正在确认账户',
      zh_HANT: '正在確認帳戶',
      ja: 'アカウントを確認しています',
      ko: '계정을 확인하고 있습니다',
      fr: 'Vérification du compte en cours',
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
      en: 'Account unavailable',
      zh_HANS: '账户不可用',
      zh_HANT: '帳戶不可用',
      ja: 'アカウントを利用できません',
      ko: '계정을 사용할 수 없습니다',
      fr: 'Compte indisponible',
    }),
    unavailableDescription: pickLocaleText(selectedLocale, {
      en: 'Session information is unavailable.',
      zh_HANS: '当前会话信息不可用。',
      zh_HANT: '目前工作階段資訊不可用。',
      ja: '現在のセッション情報を確認できません。',
      ko: '현재 세션 정보를 사용할 수 없습니다.',
      fr: 'Les informations de session sont indisponibles.',
    }),
  };

  useEffect(() => {
    if (status !== 'authenticated' || !session?.tenantId) {
      return;
    }

    if (isAcTenantTier(session.tenantTier)) {
      router.replace(buildAcWorkspacePath(session.tenantId));
      return;
    }

    if (session.tenantId !== tenantId) {
      router.replace(buildTenantWorkspacePath(session.tenantId));
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
        tenantTier: 'standard',
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

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-lg">
          <StateView
            status="unavailable"
            title={loadingCopy.unavailableTitle}
            description={loadingCopy.unavailableDescription}
          />
        </div>
      </div>
    );
  }

  const activeTalentRoute = resolveTalentWorkspaceRoute(pathname);
  const activeHierarchyBusinessRoute = resolveHierarchyBusinessRoute(pathname);

  if (activeTalentRoute && activeTalentRoute.tenantId === tenantId) {
    return (
      <TalentBusinessShell
        tenantId={tenantId}
        talentId={activeTalentRoute.talentId}
        section={activeTalentRoute.section}
        session={session}
        onNavigate={(href) => {
          router.push(href);
        }}
        onSignOut={handleSignOut}
        isSignOutPending={isSignOutPending}
      >
        {children}
      </TalentBusinessShell>
    );
  }

  if (activeHierarchyBusinessRoute && activeHierarchyBusinessRoute.tenantId === tenantId) {
    return (
      <HierarchyBusinessShell
        tenantId={tenantId}
        scopeType={activeHierarchyBusinessRoute.scopeType}
        subsidiaryId={activeHierarchyBusinessRoute.subsidiaryId ?? undefined}
        session={session}
        onNavigate={(href) => {
          router.push(href);
        }}
        onSignOut={handleSignOut}
        isSignOutPending={isSignOutPending}
      >
        {children}
      </HierarchyBusinessShell>
    );
  }

  return (
    <TenantGovernanceShell
      tenantId={tenantId}
      pathname={pathname}
      session={session}
      onNavigate={(href) => {
        router.push(href);
      }}
      onSignOut={handleSignOut}
      isSignOutPending={isSignOutPending}
    >
      {children}
    </TenantGovernanceShell>
  );
}
