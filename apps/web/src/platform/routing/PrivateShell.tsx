'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  buildAcWorkspacePath,
  buildTalentWorkspacePath,
  buildTenantWorkspacePath,
  isAcTenantTier,
  resolveHierarchyBusinessRoute,
  resolveTalentWorkspaceRoute,
} from '@/platform/routing/workspace-paths';
import { useUiLocale } from '@/platform/runtime/locale/locale-provider';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useSession } from '@/platform/runtime/session/session-provider';
import { StateView } from '@/platform/ui';

import { HierarchyBusinessShell } from './HierarchyBusinessShell';
import {
  getTenantGovernancePathCapability,
  isSessionCapabilityEnabled,
  TALENT_SECTION_CAPABILITY,
  type RoutedCapabilityCode,
} from './module-capability-routing';
import { TalentBusinessShell } from './TalentBusinessShell';
import { TenantGovernanceShell } from './TenantGovernanceShell';

function getModuleUnavailableCopy(locale: string, capabilityCode: RoutedCapabilityCode) {
  const moduleName = pickLocaleText(locale, {
    en:
      capabilityCode === 'public_presence.homepage'
        ? 'Homepage Studio'
        : capabilityCode === 'marshmallow.mailbox'
          ? 'Marshmallow Mailbox'
          : capabilityCode === 'reports.mfr'
            ? 'MFR Reports'
            : capabilityCode === 'integration.webhooks'
              ? 'Tenant Webhooks'
              : 'Product Audit',
    zh_HANS:
      capabilityCode === 'public_presence.homepage'
        ? '主页 Studio'
        : capabilityCode === 'marshmallow.mailbox'
          ? '棉花糖信箱'
          : capabilityCode === 'reports.mfr'
            ? 'MFR 报表'
            : capabilityCode === 'integration.webhooks'
              ? '租户 Webhook'
              : '产品审计',
    zh_HANT:
      capabilityCode === 'public_presence.homepage'
        ? '主頁 Studio'
        : capabilityCode === 'marshmallow.mailbox'
          ? '棉花糖信箱'
          : capabilityCode === 'reports.mfr'
            ? 'MFR 報表'
            : capabilityCode === 'integration.webhooks'
              ? '租戶 Webhook'
              : '產品審計',
    ja:
      capabilityCode === 'public_presence.homepage'
        ? 'ホームページ Studio'
        : capabilityCode === 'marshmallow.mailbox'
          ? 'マシュマロ受信箱'
          : capabilityCode === 'reports.mfr'
            ? 'MFR レポート'
            : capabilityCode === 'integration.webhooks'
              ? 'テナント Webhook'
              : 'プロダクト監査',
    ko:
      capabilityCode === 'public_presence.homepage'
        ? '홈페이지 Studio'
        : capabilityCode === 'marshmallow.mailbox'
          ? '마시멜로 메일함'
          : capabilityCode === 'reports.mfr'
            ? 'MFR 보고서'
            : capabilityCode === 'integration.webhooks'
              ? '테넌트 Webhook'
              : '제품 감사',
    fr:
      capabilityCode === 'public_presence.homepage'
        ? 'Studio de page publique'
        : capabilityCode === 'marshmallow.mailbox'
          ? 'Boite Marshmallow'
          : capabilityCode === 'reports.mfr'
            ? 'Rapports MFR'
            : capabilityCode === 'integration.webhooks'
              ? 'Webhooks tenant'
              : 'Audit produit',
  });

  return {
    title: pickLocaleText(locale, {
      en: 'Module not enabled',
      zh_HANS: '模块未启用',
      zh_HANT: '模組未啟用',
      ja: 'モジュールが有効ではありません',
      ko: '모듈이 활성화되지 않았습니다',
      fr: 'Module non active',
    }),
    description: pickLocaleText(locale, {
      en: `${moduleName} is not enabled for this tenant. Ask an AC operator to update tenant capabilities.`,
      zh_HANS: `${moduleName} 未对当前租户启用。请联系 AC 运营人员更新租户能力。`,
      zh_HANT: `${moduleName} 未對目前租戶啟用。請聯絡 AC 營運人員更新租戶能力。`,
      ja: `${moduleName} はこのテナントで有効ではありません。AC オペレーターにテナント機能の更新を依頼してください。`,
      ko: `${moduleName}은 이 테넌트에서 활성화되어 있지 않습니다. AC 운영자에게 테넌트 기능 업데이트를 요청하세요.`,
      fr: `${moduleName} n'est pas active pour ce tenant. Demandez a un operateur AC de mettre a jour les capacites du tenant.`,
    }),
    backToTalentOverview: pickLocaleText(locale, {
      en: 'Back to talent overview',
      zh_HANS: '返回艺人概览',
      zh_HANT: '返回藝人概覽',
      ja: 'タレント概要へ戻る',
      ko: '탤런트 개요로 돌아가기',
      fr: "Retour a l'apercu du talent",
    }),
    backToTenantWorkspace: pickLocaleText(locale, {
      en: 'Back to tenant workspace',
      zh_HANS: '返回租户工作区',
      zh_HANT: '返回租戶工作區',
      ja: 'テナントワークスペースへ戻る',
      ko: '테넌트 워크스페이스로 돌아가기',
      fr: "Retour a l'espace tenant",
    }),
  };
}

function ModuleUnavailableState({
  capabilityCode,
  returnHref,
  returnTarget,
}: Readonly<{
  capabilityCode: RoutedCapabilityCode;
  returnHref: string;
  returnTarget: 'talent' | 'tenant';
}>) {
  const { locale } = useUiLocale();
  const copy = getModuleUnavailableCopy(locale, capabilityCode);
  const returnLabel =
    returnTarget === 'talent' ? copy.backToTalentOverview : copy.backToTenantWorkspace;

  return (
    <div className="p-6">
      <StateView
        status="denied"
        title={copy.title}
        description={copy.description}
        action={
          <Link
            href={returnHref}
            className="inline-flex items-center justify-center rounded-full border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
            style={{ color: '#fff' }}
          >
            {returnLabel}
          </Link>
        }
      />
    </div>
  );
}

export function PrivateShell({
  tenantId,
  children,
}: Readonly<{
  tenantId: string;
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useUiLocale();
  const { status, session, recoverSession, logoutCurrentSession } = useSession();
  const [isSignOutPending, setIsSignOutPending] = useState(false);
  const [isRecoverySuppressed, setIsRecoverySuppressed] = useState(false);
  const loadingCopy = {
    title: pickLocaleText(locale, {
      en: 'Checking account',
      zh_HANS: '正在确认账户',
      zh_HANT: '正在確認帳戶',
      ja: 'アカウントを確認しています',
      ko: '계정을 확인하고 있습니다',
      fr: 'Vérification du compte en cours',
    }),
    description: pickLocaleText(locale, {
      en: 'Verifying your current session.',
      zh_HANS: '正在验证当前会话。',
      zh_HANT: '正在驗證目前工作階段。',
      ja: '現在のセッションを確認しています。',
      ko: '현재 세션을 확인하고 있습니다.',
      fr: 'Vérification de votre session en cours.',
    }),
    unavailableTitle: pickLocaleText(locale, {
      en: 'Account unavailable',
      zh_HANS: '账户不可用',
      zh_HANT: '帳戶不可用',
      ja: 'アカウントを利用できません',
      ko: '계정을 사용할 수 없습니다',
      fr: 'Compte indisponible',
    }),
    unavailableDescription: pickLocaleText(locale, {
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
  const enabledCapabilityCodes = session.capabilities?.enabledCapabilityCodes ?? null;

  if (activeTalentRoute && activeTalentRoute.tenantId === tenantId) {
    const capabilityCode = TALENT_SECTION_CAPABILITY[activeTalentRoute.section];
    const routeChildren =
      capabilityCode && !isSessionCapabilityEnabled(session, capabilityCode) ? (
        <ModuleUnavailableState
          capabilityCode={capabilityCode}
          returnHref={buildTalentWorkspacePath(tenantId, activeTalentRoute.talentId)}
          returnTarget="talent"
        />
      ) : (
        children
      );

    return (
      <TalentBusinessShell
        tenantId={tenantId}
        talentId={activeTalentRoute.talentId}
        section={activeTalentRoute.section}
        session={session}
        enabledCapabilityCodes={enabledCapabilityCodes}
        onNavigate={(href) => {
          router.push(href);
        }}
        onSignOut={handleSignOut}
        isSignOutPending={isSignOutPending}
      >
        {routeChildren}
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

  const tenantGovernanceCapabilityCode = getTenantGovernancePathCapability(pathname);
  const tenantGovernanceChildren =
    tenantGovernanceCapabilityCode &&
    !isSessionCapabilityEnabled(session, tenantGovernanceCapabilityCode) ? (
      <ModuleUnavailableState
        capabilityCode={tenantGovernanceCapabilityCode}
        returnHref={buildTenantWorkspacePath(tenantId)}
        returnTarget="tenant"
      />
    ) : (
      children
    );

  return (
    <TenantGovernanceShell
      tenantId={tenantId}
      pathname={pathname}
      session={session}
      enabledCapabilityCodes={enabledCapabilityCodes}
      onNavigate={(href) => {
        router.push(href);
      }}
      onSignOut={handleSignOut}
      isSignOutPending={isSignOutPending}
    >
      {tenantGovernanceChildren}
    </TenantGovernanceShell>
  );
}
