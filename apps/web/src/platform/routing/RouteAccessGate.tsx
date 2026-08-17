'use client';

// SPDX-License-Identifier: Apache-2.0
// TCRN-TMS-INC-002 — the roster, applied.
//
// The roster classified sixty-six routes and nothing read it at request time, so
// every route it called `permission-required` was still reachable by typing the
// URL. A table only CI consults is documentation.
//
// This mounts over the route trees that had no `layout.tsx` above them at all —
// `/studio/*` and `/homepage-editor/*`, eight pages with no shell, no session
// check and no capability check. That is the sharper form of the incident: the
// public-presence editor did not slip past a gate that failed to match its new
// path, it moved into a subtree where no gate had ever been mounted.
//
// It is deliberately NOT a second session implementation. `PrivateShell` keeps
// owning tenant-workspace session recovery; this performs the same refusals for
// the trees that have no shell, and defers to the same `recoverSession` and the
// same capability resolver, so there is one behaviour rather than two that happen
// to agree today.

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useUiLocale } from '@/platform/runtime/locale/locale-provider';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useSession } from '@/platform/runtime/session/session-provider';
import { StateView } from '@/platform/ui';

import { isSessionCapabilityEnabled } from './module-capability-routing';
import { capabilityForPath, matchRouteRule } from './route-authorization';

/**
 * The gate's own copy, in the six locales the product supports.
 *
 * Kept in one table rather than inline at each refusal: a denial that renders
 * English on a localized route reads as a bug in the page rather than as a
 * deliberate refusal, and the reader then goes looking for the wrong problem.
 */
const COPY = {
  unclassifiedTitle: {
    en: 'Page unavailable',
    zh_HANS: '页面不可用',
    zh_HANT: '頁面不可用',
    ja: 'ページを利用できません',
    ko: '페이지를 사용할 수 없습니다',
    fr: 'Page indisponible',
  },
  unclassifiedBody: {
    en: 'This address is not a recognized page. If you reached it from a link inside the product, report it — that link points somewhere that no longer exists.',
    zh_HANS: '该地址不是已登记的页面。若你是从产品内的链接进来的，请反馈——那个链接指向的位置已经不存在。',
    zh_HANT: '該地址不是已登記的頁面。若你是從產品內的連結進來的，請回報——那個連結指向的位置已經不存在。',
    ja: 'このアドレスは登録されたページではありません。製品内のリンクから来た場合はご報告ください。リンク先はすでに存在しません。',
    ko: '이 주소는 등록된 페이지가 아닙니다. 제품 내 링크를 통해 들어오셨다면 알려 주세요. 해당 링크가 가리키는 위치는 더 이상 존재하지 않습니다.',
    fr: "Cette adresse ne correspond à aucune page enregistrée. Si vous y êtes arrivé depuis un lien interne au produit, signalez-le : ce lien pointe vers un emplacement qui n'existe plus.",
  },
  checkingTitle: {
    en: 'Checking your access',
    zh_HANS: '正在校验访问权限',
    zh_HANT: '正在校驗存取權限',
    ja: 'アクセス権を確認しています',
    ko: '접근 권한을 확인하는 중입니다',
    fr: 'Vérification de votre accès',
  },
  checkingBody: {
    en: 'One moment while the session is confirmed.',
    zh_HANS: '正在确认会话，请稍候。',
    zh_HANT: '正在確認工作階段，請稍候。',
    ja: 'セッションを確認しています。少々お待ちください。',
    ko: '세션을 확인하고 있습니다. 잠시만 기다려 주세요.',
    fr: 'Confirmation de la session en cours.',
  },
  signInTitle: {
    en: 'Sign in to continue',
    zh_HANS: '请登录后继续',
    zh_HANT: '請登入後繼續',
    ja: '続行するにはサインインしてください',
    ko: '계속하려면 로그인하세요',
    fr: 'Connectez-vous pour continuer',
  },
  signInBody: {
    en: 'This page requires a signed-in account.',
    zh_HANS: '该页面需要登录后访问。',
    zh_HANT: '該頁面需要登入後存取。',
    ja: 'このページの表示にはサインインが必要です。',
    ko: '이 페이지는 로그인이 필요합니다.',
    fr: 'Cette page nécessite un compte connecté.',
  },
  capabilityTitle: {
    en: 'Module not enabled',
    zh_HANS: '模块未启用',
    zh_HANT: '模組未啟用',
    ja: 'モジュールが有効ではありません',
    ko: '모듈이 활성화되지 않았습니다',
    fr: 'Module non activé',
  },
  capabilityBody: {
    en: 'This module is not switched on for your organization. An administrator can enable it.',
    zh_HANS: '该模块未对你的组织启用，可由管理员开启。',
    zh_HANT: '該模組未對你的組織啟用，可由管理員開啟。',
    ja: 'このモジュールはお客様の組織で有効化されていません。管理者が有効にできます。',
    ko: '이 모듈은 소속 조직에 활성화되어 있지 않습니다. 관리자가 활성화할 수 있습니다.',
    fr: "Ce module n'est pas activé pour votre organisation. Un administrateur peut l'activer.",
  },
} as const;

function CenteredState({
  status,
  title,
  description,
}: Readonly<{ status: 'denied' | 'unavailable'; title: string; description: string }>) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-lg">
        <StateView status={status} title={title} description={description} />
      </div>
    </div>
  );
}

export function RouteAccessGate({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useUiLocale();
  const { status, session, recoverSession } = useSession();

  const match = matchRouteRule(pathname);
  const needsSession = match !== null && match.rule.access !== 'public';
  const tenantHint = match?.params.tenantId;

  useEffect(() => {
    if (!needsSession || status !== 'anonymous') {
      return;
    }

    let cancelled = false;

    async function runRecovery() {
      // The tenant hint comes from the matched route's own params rather than from a
      // second parse of the path — the matcher already decided which segment is the
      // tenant, and re-deriving it here is how the two would come to disagree.
      const recovered = await recoverSession(
        tenantHint ? { tenantId: tenantHint, tenantTier: 'standard' } : undefined
      );

      if (!recovered && !cancelled) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    }

    void runRecovery();

    return () => {
      cancelled = true;
    };
  }, [needsSession, pathname, recoverSession, router, status, tenantHint]);

  // An unclassified route is refused, and this check runs before every other one.
  // Reaching the session check first would let a page nobody classified render for
  // anyone who happens to be signed in — which is the original defect exactly.
  if (!match) {
    return (
      <CenteredState
        status="denied"
        title={pickLocaleText(locale, COPY.unclassifiedTitle)}
        description={pickLocaleText(locale, COPY.unclassifiedBody)}
      />
    );
  }

  if (match.rule.access === 'public') {
    return <>{children}</>;
  }

  if (status === 'booting' || (status === 'anonymous' && !session)) {
    return (
      <CenteredState
        status="unavailable"
        title={pickLocaleText(locale, COPY.checkingTitle)}
        description={pickLocaleText(locale, COPY.checkingBody)}
      />
    );
  }

  if (!session) {
    return (
      <CenteredState
        status="denied"
        title={pickLocaleText(locale, COPY.signInTitle)}
        description={pickLocaleText(locale, COPY.signInBody)}
      />
    );
  }

  const capability = capabilityForPath(pathname);
  if (capability && !isSessionCapabilityEnabled(session, capability)) {
    return (
      <CenteredState
        status="unavailable"
        title={pickLocaleText(locale, COPY.capabilityTitle)}
        description={pickLocaleText(locale, COPY.capabilityBody)}
      />
    );
  }

  return <>{children}</>;
}
