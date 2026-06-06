'use client';

import { Link2, Link2Off, MonitorSmartphone, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SUPPORTED_UI_LOCALES, type SupportedUiLocale } from '@tcrn/shared';

import {
  changeCurrentPassword,
  confirmEmailChange,
  type CurrentProfile,
  deleteCurrentAvatar,
  disableTotp,
  enableTotp,
  type ExternalToolSsoReadinessRecord,
  listSsoAccountLinkProviders,
  listExternalToolSsoReadiness,
  listUserSessions,
  listSsoAccountLinks,
  readCurrentProfile,
  regenerateRecoveryCodes,
  requestEmailChange,
  revokeSsoAccountLink,
  revokeUserSession,
  setupTotp,
  startSsoAccountLink,
  type SsoAccountLinkRecord,
  type SsoAccountLinkProviderRecord,
  type TotpSetupResponse,
  updateCurrentProfile,
  uploadCurrentAvatar,
  type UserSessionRecord,
} from '@/domains/profile/api/profile.api';
import { ApiRequestError } from '@/platform/http/api';
import { useUiLocale } from '@/platform/runtime/locale/locale-provider';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import {
  buildPaginationMeta,
  getPaginationRange,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
  parsePageParam,
  parsePageSizeParam,
} from '@/platform/runtime/pagination/pagination';
import { useSession } from '@/platform/runtime/session/session-provider';
import {
  ActionDrawer,
  ActionDrawerFooter,
  AsyncSubmitButton,
  ConfirmActionDialog,
  FormSection,
  GlassSurface,
  PaginationFooter,
  StateView,
  TableShell,
} from '@/platform/ui';

import { formatProfileDateTime, useProfileCopy } from './profile.copy';

interface ProfileDraft {
  displayName: string;
  phone: string;
  preferredLanguage: SupportedUiLocale;
}

interface PasswordDraft {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}

interface NoticeState {
  tone: 'success' | 'error';
  message: string;
}

interface DialogState {
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => Promise<void>;
}

type SecurityDrawer = 'password' | 'totp' | null;

interface SessionUserSnapshot {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  preferredLanguage: SupportedUiLocale;
  totpEnabled: boolean;
  forceReset: boolean;
  passwordExpiresAt: string | null;
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

const PROFILE_LANGUAGE_LABELS = {
  en: 'English',
  zh_HANS: '简体中文',
  zh_HANT: '繁體中文',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
} as const;

function buildProfileDraft(profile: CurrentProfile): ProfileDraft {
  return {
    displayName: profile.displayName || '',
    phone: profile.phone || '',
    preferredLanguage: profile.preferredLanguage,
  };
}

function buildSessionUserSnapshot(profile: CurrentProfile): SessionUserSnapshot {
  return {
    id: profile.id,
    username: profile.username,
    email: profile.email,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    preferredLanguage: profile.preferredLanguage,
    totpEnabled: profile.totpEnabled,
    forceReset: profile.forceReset,
    passwordExpiresAt: profile.passwordExpiresAt,
  };
}

function hasSessionUserDrift(
  currentUser: SessionUserSnapshot | null | undefined,
  nextUser: SessionUserSnapshot
) {
  if (!currentUser) {
    return true;
  }

  return (
    currentUser.id !== nextUser.id ||
    currentUser.username !== nextUser.username ||
    currentUser.email !== nextUser.email ||
    currentUser.displayName !== nextUser.displayName ||
    currentUser.avatarUrl !== nextUser.avatarUrl ||
    currentUser.preferredLanguage !== nextUser.preferredLanguage ||
    currentUser.totpEnabled !== nextUser.totpEnabled ||
    currentUser.forceReset !== nextUser.forceReset ||
    currentUser.passwordExpiresAt !== nextUser.passwordExpiresAt
  );
}

function buildProfileSessionsQueryState(
  searchParams: { toString(): string },
  {
    page,
    pageSize,
  }: {
    page: number;
    pageSize: PageSizeOption;
  }
) {
  const params = new URLSearchParams(searchParams.toString());

  params.delete('sessionsPage');
  params.delete('sessionsPageSize');

  if (page > 1) {
    params.set('sessionsPage', String(page));
  }

  if (pageSize !== PAGE_SIZE_OPTIONS[0]) {
    params.set('sessionsPageSize', String(pageSize));
  }

  return params.toString();
}

function SummaryCard({
  label,
  value,
  hint,
}: Readonly<{
  label: string;
  value: string;
  hint: string;
}>) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">{label}</p>
      <p className="mt-2 text-xl leading-8 font-semibold break-words text-slate-950 sm:text-2xl">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>
    </div>
  );
}

function SecurityActionCard({
  title,
  description,
  meta,
  actionLabel,
  onAction,
}: Readonly<{
  title: string;
  description: string;
  meta: string;
  actionLabel: string;
  onAction: () => void;
}>) {
  return (
    <div className="flex min-w-0 flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
        <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">{meta}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="inline-flex w-fit items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {actionLabel}
      </button>
    </div>
  );
}

const inputClassName =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40';

export function ProfileScreen({
  tenantId: _tenantId,
  workspaceKind = 'tenant',
  mode = 'profile',
}: Readonly<{
  tenantId: string;
  workspaceKind?: 'tenant' | 'ac';
  mode?: 'profile' | 'security';
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSessionsPage = parsePageParam(searchParams.get('sessionsPage'));
  const urlSessionsPageSize = parsePageSizeParam(searchParams.get('sessionsPageSize'));
  const { request, session, updateSessionUser } = useSession();
  const { copy, locale } = useProfileCopy();
  const workspaceDisplayLabel =
    workspaceKind === 'ac'
      ? pickLocaleText(locale, {
          en: 'Platform',
          zh_HANS: '平台',
          zh_HANT: '平台',
          ja: 'プラットフォーム',
          ko: '플랫폼',
          fr: 'Plateforme',
        })
      : pickLocaleText(locale, {
          en: 'Tenant',
          zh_HANS: '租户',
          zh_HANT: '租戶',
          ja: 'テナント',
          ko: '테넌트',
          fr: 'Tenant',
        });
  const isSecurityMode = mode === 'security';
  const shouldLoadExternalToolReadiness = isSecurityMode && workspaceKind === 'ac';
  const headerTitle = isSecurityMode ? copy.header.securityTitle : copy.header.title;
  const headerDescription = isSecurityMode
    ? copy.header.securityDescription
    : copy.header.description;
  const sessionUserRef = useRef<SessionUserSnapshot | null>(
    session?.user ? { ...session.user } : null
  );

  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft | null>(null);
  const [sessions, setSessions] = useState<UserSessionRecord[]>([]);
  const [ssoAccountLinks, setSsoAccountLinks] = useState<SsoAccountLinkRecord[]>([]);
  const [ssoLinkProviders, setSsoLinkProviders] = useState<SsoAccountLinkProviderRecord[]>([]);
  const [externalToolReadiness, setExternalToolReadiness] = useState<
    ExternalToolSsoReadinessRecord[]
  >([]);
  const [sessionsPage, setSessionsPage] = useState(urlSessionsPage);
  const [sessionsPageSize, setSessionsPageSize] = useState<PageSizeOption>(urlSessionsPageSize);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState<PasswordDraft>({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirm: '',
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [totpSetup, setTotpSetupState] = useState<TotpSetupResponse | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpDisablePassword, setTotpDisablePassword] = useState('');
  const [recoveryCodePassword, setRecoveryCodePassword] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isPreparingTotp, setIsPreparingTotp] = useState(false);
  const [isEnablingTotp, setIsEnablingTotp] = useState(false);
  const [isDisablingTotp, setIsDisablingTotp] = useState(false);
  const [isRegeneratingRecoveryCodes, setIsRegeneratingRecoveryCodes] = useState(false);
  const [isStartingSsoLink, setIsStartingSsoLink] = useState(false);
  const [securityDrawer, setSecurityDrawer] = useState<SecurityDrawer>(null);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailConfirmToken, setEmailConfirmToken] = useState('');
  const [isRequestingEmailChange, setIsRequestingEmailChange] = useState(false);
  const [isConfirmingEmailChange, setIsConfirmingEmailChange] = useState(false);

  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const [dialogPending, setDialogPending] = useState(false);

  useEffect(() => {
    sessionUserRef.current = session?.user ? { ...session.user } : null;
  }, [session?.user]);

  const sessionsPagination = useMemo(
    () => buildPaginationMeta(sessions.length, sessionsPage, sessionsPageSize),
    [sessions.length, sessionsPage, sessionsPageSize]
  );

  const paginatedSessions = useMemo(() => {
    const startIndex = (sessionsPagination.page - 1) * sessionsPagination.pageSize;

    return sessions.slice(startIndex, startIndex + sessionsPagination.pageSize);
  }, [sessions, sessionsPagination.page, sessionsPagination.pageSize]);

  useEffect(() => {
    setSessionsPage((current) => (current === urlSessionsPage ? current : urlSessionsPage));
    setSessionsPageSize((current) =>
      current === urlSessionsPageSize ? current : urlSessionsPageSize
    );
  }, [urlSessionsPage, urlSessionsPageSize]);

  function applySessionsQueryState(
    nextState: Partial<{
      page: number;
      pageSize: PageSizeOption;
    }>
  ) {
    const nextPage = nextState.page ?? sessionsPage;
    const nextPageSize = nextState.pageSize ?? sessionsPageSize;

    if (nextState.page !== undefined) {
      setSessionsPage(nextPage);
    }

    if (nextState.pageSize !== undefined) {
      setSessionsPageSize(nextPageSize);
    }

    const nextQueryString = buildProfileSessionsQueryState(searchParams, {
      page: nextPage,
      pageSize: nextPageSize,
    });
    const currentQueryString = buildProfileSessionsQueryState(searchParams, {
      page: sessionsPage,
      pageSize: sessionsPageSize,
    });

    if (nextQueryString === currentQueryString) {
      return;
    }

    const nextHref = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
    startTransition(() => {
      router.replace(nextHref);
    });
  }

  useEffect(() => {
    if (!loading && sessionsPage > sessionsPagination.totalPages) {
      const nextPage = sessionsPagination.totalPages;
      setSessionsPage(nextPage);

      const nextQueryString = buildProfileSessionsQueryState(searchParams, {
        page: nextPage,
        pageSize: sessionsPageSize,
      });
      const currentQueryString = buildProfileSessionsQueryState(searchParams, {
        page: sessionsPage,
        pageSize: sessionsPageSize,
      });

      if (nextQueryString !== currentQueryString) {
        const nextHref = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
        startTransition(() => {
          router.replace(nextHref);
        });
      }
    }
  }, [
    loading,
    pathname,
    router,
    searchParams,
    sessionsPage,
    sessionsPageSize,
    sessionsPagination.totalPages,
  ]);

  const applyProfileState = useCallback(
    (nextProfile: CurrentProfile) => {
      setProfile(nextProfile);
      setProfileDraft(buildProfileDraft(nextProfile));
      const nextSessionUser = buildSessionUserSnapshot(nextProfile);

      if (hasSessionUserDrift(sessionUserRef.current, nextSessionUser)) {
        sessionUserRef.current = nextSessionUser;
        updateSessionUser(nextSessionUser);
      }
    },
    [updateSessionUser]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const [
          profileResult,
          sessionsResult,
          ssoLinksResult,
          ssoLinkProvidersResult,
          externalToolReadinessResult,
        ] = await Promise.all([
          readCurrentProfile(request),
          listUserSessions(request),
          isSecurityMode ? listSsoAccountLinks(request) : Promise.resolve([]),
          isSecurityMode ? listSsoAccountLinkProviders(request) : Promise.resolve([]),
          shouldLoadExternalToolReadiness
            ? listExternalToolSsoReadiness(request)
            : Promise.resolve([]),
        ]);

        if (cancelled) {
          return;
        }

        applyProfileState(profileResult);
        setSessions(sessionsResult);
        setSsoAccountLinks(ssoLinksResult);
        setSsoLinkProviders(ssoLinkProvidersResult);
        setExternalToolReadiness(externalToolReadinessResult);
      } catch (reason) {
        if (!cancelled) {
          setLoadError(getErrorMessage(reason, copy.state.loadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [applyProfileState, isSecurityMode, request, shouldLoadExternalToolReadiness]);

  const hasDirtyProfile = useMemo(() => {
    if (!profile || !profileDraft) {
      return false;
    }

    return (
      (profile.displayName || '') !== profileDraft.displayName ||
      (profile.phone || '') !== profileDraft.phone ||
      profile.preferredLanguage !== profileDraft.preferredLanguage
    );
  }, [profile, profileDraft]);

  if (loading) {
    return (
      <GlassSurface className="p-8">
        <p className="text-sm font-medium text-slate-500">{copy.state.loading}</p>
      </GlassSurface>
    );
  }

  if (loadError || !profile || !profileDraft) {
    return (
      <StateView
        status="error"
        title={copy.state.unavailableTitle}
        description={loadError || undefined}
      />
    );
  }

  const sessionsPageRange = getPaginationRange(sessionsPagination, paginatedSessions.length);
  const sessionsPaginationCopy = {
    page: pickLocaleText(locale, {
      en: `Page ${sessionsPagination.page} of ${sessionsPagination.totalPages}`,
      zh_HANS: `第 ${sessionsPagination.page} / ${sessionsPagination.totalPages} 页`,
      zh_HANT: `第 ${sessionsPagination.page} / ${sessionsPagination.totalPages} 頁`,
      ja: `${sessionsPagination.totalPages} ページ中 ${sessionsPagination.page} ページ`,
      ko: `${sessionsPagination.totalPages}페이지 중 ${sessionsPagination.page}페이지`,
      fr: `Page ${sessionsPagination.page} sur ${sessionsPagination.totalPages}`,
    }),
    range:
      sessionsPagination.totalCount === 0
        ? pickLocaleText(locale, {
            en: 'No sign-in sessions available.',
            zh_HANS: '当前没有登录会话。',
            zh_HANT: '目前沒有登入工作階段。',
            ja: 'サインインセッションはありません。',
            ko: '로그인 세션이 없습니다.',
            fr: 'Aucune session de connexion disponible.',
          })
        : pickLocaleText(locale, {
            en: `Showing ${sessionsPageRange.start}-${sessionsPageRange.end} of ${sessionsPagination.totalCount}`,
            zh_HANS: `显示第 ${sessionsPageRange.start}-${sessionsPageRange.end} 条，共 ${sessionsPagination.totalCount} 条`,
            zh_HANT: `顯示第 ${sessionsPageRange.start}-${sessionsPageRange.end} 筆，共 ${sessionsPagination.totalCount} 筆`,
            ja: `${sessionsPagination.totalCount} 件中 ${sessionsPageRange.start}-${sessionsPageRange.end} 件を表示`,
            ko: `${sessionsPagination.totalCount}개 중 ${sessionsPageRange.start}-${sessionsPageRange.end}개 표시`,
            fr: `Affichage de ${sessionsPageRange.start} à ${sessionsPageRange.end} sur ${sessionsPagination.totalCount}`,
          }),
    pageSize: pickLocaleText(locale, {
      en: 'Rows per page',
      zh_HANS: '每页条数',
      zh_HANT: '每頁筆數',
      ja: '表示件数',
      ko: '페이지당 행 수',
      fr: 'Lignes par page',
    }),
    previous: pickLocaleText(locale, {
      en: 'Previous',
      zh_HANS: '上一页',
      zh_HANT: '上一頁',
      ja: '前へ',
      ko: '이전',
      fr: 'Précédent',
    }),
    next: pickLocaleText(locale, {
      en: 'Next',
      zh_HANS: '下一页',
      zh_HANT: '下一頁',
      ja: '次へ',
      ko: '다음',
      fr: 'Suivant',
    }),
  };
  const ssoCopy = {
    title: pickLocaleText(locale, {
      en: 'Single sign-on connections',
      zh_HANS: '单点登录连接',
      zh_HANT: '單點登入連線',
      ja: 'シングルサインオン接続',
      ko: '싱글 사인온 연결',
      fr: 'Connexions SSO',
    }),
    description: pickLocaleText(locale, {
      en: 'Review external identity providers linked to this TCRN account.',
      zh_HANS: '查看已链接到此 TCRN 账号的外部身份提供方。',
      zh_HANT: '檢視已連結到此 TCRN 帳號的外部身分提供者。',
      ja: 'この TCRN アカウントにリンクされた外部 IdP を確認します。',
      ko: '이 TCRN 계정에 연결된 외부 ID 공급자를 검토합니다.',
      fr: 'Consultez les fournisseurs d’identite externes lies a ce compte TCRN.',
    }),
    emptyTitle: pickLocaleText(locale, {
      en: 'No SSO connection linked',
      zh_HANS: '尚未链接 SSO 连接',
      zh_HANT: '尚未連結 SSO 連線',
      ja: 'SSO 接続はまだリンクされていません',
      ko: '연결된 SSO가 없습니다',
      fr: 'Aucune connexion SSO liee',
    }),
    emptyDescription: pickLocaleText(locale, {
      en: 'Linked providers will appear here after an approved SSO linking flow.',
      zh_HANS: '经过批准的 SSO 链接流程完成后，提供方会显示在这里。',
      zh_HANT: '核准的 SSO 連結流程完成後，提供者會顯示於此。',
      ja: '承認された SSO リンクフローの完了後、プロバイダーがここに表示されます。',
      ko: '승인된 SSO 연결 흐름이 완료되면 공급자가 여기에 표시됩니다.',
      fr: 'Les fournisseurs lies apparaitront ici apres un flux de liaison SSO approuve.',
    }),
    linkProvider: pickLocaleText(locale, {
      en: 'Link provider',
      zh_HANS: '链接提供方',
      zh_HANT: '連結提供者',
      ja: 'プロバイダーをリンク',
      ko: '공급자 연결',
      fr: 'Lier le fournisseur',
    }),
    noLinkProviders: pickLocaleText(locale, {
      en: 'No SSO provider is currently available for self-linking.',
      zh_HANS: '当前没有可用于自助链接的 SSO 提供方。',
      zh_HANT: '目前沒有可用於自助連結的 SSO 提供者。',
      ja: '現在セルフリンクに使用できる SSO プロバイダーはありません。',
      ko: '현재 셀프 연결에 사용할 수 있는 SSO 공급자가 없습니다.',
      fr: 'Aucun fournisseur SSO n’est disponible pour la liaison en libre-service.',
    }),
    linkStartedError: pickLocaleText(locale, {
      en: 'SSO account linking could not be started.',
      zh_HANS: '无法启动 SSO 账号链接。',
      zh_HANT: '無法啟動 SSO 帳號連結。',
      ja: 'SSO アカウントリンクを開始できませんでした。',
      ko: 'SSO 계정 연결을 시작할 수 없습니다.',
      fr: 'La liaison du compte SSO n’a pas pu demarrer.',
    }),
    revoked: pickLocaleText(locale, {
      en: 'Revoked',
      zh_HANS: '已撤销',
      zh_HANT: '已撤銷',
      ja: '取り消し済み',
      ko: '해지됨',
      fr: 'Revoquee',
    }),
    active: pickLocaleText(locale, {
      en: 'Linked',
      zh_HANS: '已链接',
      zh_HANT: '已連結',
      ja: 'リンク済み',
      ko: '연결됨',
      fr: 'Liee',
    }),
    lastLogin: pickLocaleText(locale, {
      en: 'Last SSO login',
      zh_HANS: '最近 SSO 登录',
      zh_HANT: '最近 SSO 登入',
      ja: '最終 SSO ログイン',
      ko: '마지막 SSO 로그인',
      fr: 'Derniere connexion SSO',
    }),
    linkedAt: pickLocaleText(locale, {
      en: 'Linked at',
      zh_HANS: '链接时间',
      zh_HANT: '連結時間',
      ja: 'リンク日時',
      ko: '연결 시각',
      fr: 'Liee le',
    }),
    revoke: pickLocaleText(locale, {
      en: 'Revoke connection',
      zh_HANS: '撤销连接',
      zh_HANT: '撤銷連線',
      ja: '接続を取り消す',
      ko: '연결 해지',
      fr: 'Revoquer la connexion',
    }),
    revokeTitle: (provider: string) =>
      pickLocaleText(locale, {
        en: `Revoke ${provider} SSO connection?`,
        zh_HANS: `撤销 ${provider} SSO 连接？`,
        zh_HANT: `撤銷 ${provider} SSO 連線？`,
        ja: `${provider} の SSO 接続を取り消しますか？`,
        ko: `${provider} SSO 연결을 해지할까요?`,
        fr: `Revoquer la connexion SSO ${provider} ?`,
      }),
    revokeDescription: pickLocaleText(locale, {
      en: 'This prevents this external subject from signing in until it is linked again through an approved flow.',
      zh_HANS: '这会阻止该外部主体继续登录，直到通过批准流程重新链接。',
      zh_HANT: '這會阻止此外部主體繼續登入，直到透過核准流程重新連結。',
      ja: '承認されたフローで再リンクされるまで、この外部サブジェクトはサインインできません。',
      ko: '승인된 흐름으로 다시 연결될 때까지 이 외부 주체는 로그인할 수 없습니다.',
      fr: 'Ce sujet externe ne pourra plus se connecter tant qu’il ne sera pas relie a nouveau par un flux approuve.',
    }),
    revokedSuccess: pickLocaleText(locale, {
      en: 'SSO connection revoked.',
      zh_HANS: 'SSO 连接已撤销。',
      zh_HANT: 'SSO 連線已撤銷。',
      ja: 'SSO 接続を取り消しました。',
      ko: 'SSO 연결이 해지되었습니다.',
      fr: 'Connexion SSO revoquee.',
    }),
    unavailable: pickLocaleText(locale, {
      en: 'Not recorded',
      zh_HANS: '未记录',
      zh_HANT: '未記錄',
      ja: '記録なし',
      ko: '기록 없음',
      fr: 'Non enregistre',
    }),
  };
  const externalToolSsoCopy = {
    title: pickLocaleText(locale, {
      en: 'External-tool SSO readiness',
      zh_HANS: '外部工具 SSO 就绪',
      zh_HANT: '外部工具 SSO 就緒',
      ja: '外部ツール SSO 準備状況',
      ko: '외부 도구 SSO 준비 상태',
      fr: 'Préparation SSO des outils externes',
    }),
    description: pickLocaleText(locale, {
      en: 'AC-only projection for future human-facing tool entrypoints. Links fail closed until SSO is accepted.',
      zh_HANS: '面向未来人工工具入口的 AC-only 投影。SSO 未验收前入口保持 fail-closed。',
      zh_HANT: '面向未來人工工具入口的 AC-only 投影。SSO 未驗收前入口保持 fail-closed。',
      ja: '将来の人間向けツール入口のための AC 専用投影です。SSO が承認されるまでリンクは fail-closed です。',
      ko: '향후 사용자용 도구 진입점을 위한 AC 전용 투영입니다. SSO가 승인될 때까지 링크는 fail-closed 상태입니다.',
      fr: 'Projection AC-only pour les futurs points d’entrée humains. Les liens restent fail-closed tant que le SSO n’est pas accepté.',
    }),
    emptyTitle: pickLocaleText(locale, {
      en: 'No external-tool readiness records',
      zh_HANS: '暂无外部工具就绪记录',
      zh_HANT: '暫無外部工具就緒記錄',
      ja: '外部ツール準備状況レコードはありません',
      ko: '외부 도구 준비 상태 기록이 없습니다',
      fr: 'Aucun état de préparation outil externe',
    }),
    emptyDescription: pickLocaleText(locale, {
      en: 'The default posture is blocked and fail-closed until an AC operator records accepted SSO readiness.',
      zh_HANS: '默认姿态为 blocked 且 fail-closed，直到 AC operator 记录已验收的 SSO 就绪状态。',
      zh_HANT: '預設姿態為 blocked 且 fail-closed，直到 AC operator 記錄已驗收的 SSO 就緒狀態。',
      ja: 'AC オペレーターが承認済み SSO 準備状況を記録するまで、既定姿勢は blocked かつ fail-closed です。',
      ko: 'AC 운영자가 승인된 SSO 준비 상태를 기록할 때까지 기본 상태는 blocked 및 fail-closed입니다.',
      fr: 'La posture par défaut est blocked et fail-closed jusqu’à ce qu’un opérateur AC enregistre une préparation SSO acceptée.',
    }),
    failClosed: pickLocaleText(locale, {
      en: 'Fail closed',
      zh_HANS: 'Fail closed',
      zh_HANT: 'Fail closed',
      ja: 'Fail closed',
      ko: 'Fail closed',
      fr: 'Fail closed',
    }),
    notFailClosed: pickLocaleText(locale, {
      en: 'Not fail-closed',
      zh_HANS: '未 fail-closed',
      zh_HANT: '未 fail-closed',
      ja: 'Fail closed ではありません',
      ko: 'Fail-closed 아님',
      fr: 'Non fail-closed',
    }),
    statusLabel: pickLocaleText(locale, {
      en: 'Status',
      zh_HANS: '状态',
      zh_HANT: '狀態',
      ja: 'ステータス',
      ko: '상태',
      fr: 'Statut',
    }),
    phaseLabel: pickLocaleText(locale, {
      en: 'Required By',
      zh_HANS: '要求阶段',
      zh_HANT: '要求階段',
      ja: '必要フェーズ',
      ko: '필요 단계',
      fr: 'Requis par',
    }),
    providerLabel: pickLocaleText(locale, {
      en: 'Provider',
      zh_HANS: '提供方',
      zh_HANT: '提供者',
      ja: 'プロバイダー',
      ko: '공급자',
      fr: 'Fournisseur',
    }),
  };

  async function refreshProfile() {
    const nextProfile = await readCurrentProfile(request);
    applyProfileState(nextProfile);
  }

  async function refreshSessions() {
    const nextSessions = await listUserSessions(request);
    setSessions(nextSessions);
  }

  async function refreshSsoAccountLinks() {
    if (!isSecurityMode) {
      return;
    }

    const nextLinks = await listSsoAccountLinks(request);
    setSsoAccountLinks(nextLinks);
  }

  async function handleStartSsoAccountLink(providerCode: string) {
    setIsStartingSsoLink(true);
    setNotice(null);

    try {
      const nextPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const result = await startSsoAccountLink(request, {
        providerCode,
        next: nextPath,
      });

      window.location.assign(result.authorizationUrl);
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, ssoCopy.linkStartedError),
      });
      setIsStartingSsoLink(false);
    }
  }

  function resetSecurityDrawerDraft(drawer: Exclude<SecurityDrawer, null>) {
    if (drawer === 'password') {
      setPasswordDraft({
        currentPassword: '',
        newPassword: '',
        newPasswordConfirm: '',
      });
      return;
    }

    setTotpSetupState(null);
    setTotpCode('');
    setTotpDisablePassword('');
    setRecoveryCodePassword('');
    setRecoveryCodes([]);
  }

  function closeSecurityDrawer() {
    if (securityDrawer) {
      resetSecurityDrawerDraft(securityDrawer);
    }

    setSecurityDrawer(null);
  }

  async function handleSaveProfile() {
    if (!hasDirtyProfile || isSavingProfile || !profileDraft) {
      return;
    }

    setIsSavingProfile(true);
    setNotice(null);

    try {
      const nextProfile = await updateCurrentProfile(request, {
        displayName: profileDraft.displayName || null,
        phone: profileDraft.phone || null,
        preferredLanguage: profileDraft.preferredLanguage,
      });
      applyProfileState(nextProfile);
      setNotice({
        tone: 'success',
        message: copy.details.saved,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.details.saveError),
      });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (isSavingPassword) {
      return;
    }

    setIsSavingPassword(true);
    setNotice(null);

    try {
      const result = await changeCurrentPassword(request, passwordDraft);
      await refreshProfile();
      setPasswordDraft({
        currentPassword: '',
        newPassword: '',
        newPasswordConfirm: '',
      });
      setNotice({
        tone: 'success',
        message: result.message,
      });
      closeSecurityDrawer();
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.password.error),
      });
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handlePrepareTotp() {
    if (isPreparingTotp) {
      return;
    }

    setIsPreparingTotp(true);
    setNotice(null);

    try {
      const response = await setupTotp(request);
      setTotpSetupState(response);
      setNotice({
        tone: 'success',
        message: copy.totp.prepared,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.totp.prepareError),
      });
    } finally {
      setIsPreparingTotp(false);
    }
  }

  async function handleEnableTotp() {
    if (isEnablingTotp) {
      return;
    }

    setIsEnablingTotp(true);
    setNotice(null);

    try {
      const response = await enableTotp(request, totpCode);
      await refreshProfile();
      setTotpSetupState(null);
      setTotpCode('');
      setRecoveryCodes(response.recoveryCodes);
      setNotice({
        tone: 'success',
        message: copy.totp.enabled,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.totp.enableError),
      });
    } finally {
      setIsEnablingTotp(false);
    }
  }

  async function handleDisableTotp() {
    if (isDisablingTotp) {
      return;
    }

    setIsDisablingTotp(true);
    setNotice(null);

    try {
      await disableTotp(request, totpDisablePassword);
      await refreshProfile();
      setTotpDisablePassword('');
      setRecoveryCodes([]);
      setNotice({
        tone: 'success',
        message: copy.totp.disabled,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.totp.disableError),
      });
    } finally {
      setIsDisablingTotp(false);
    }
  }

  async function handleRegenerateRecoveryCodes() {
    if (isRegeneratingRecoveryCodes) {
      return;
    }

    setIsRegeneratingRecoveryCodes(true);
    setNotice(null);

    try {
      const response = await regenerateRecoveryCodes(request, recoveryCodePassword);
      setRecoveryCodes(response.recoveryCodes);
      setRecoveryCodePassword('');
      setNotice({
        tone: 'success',
        message: copy.totp.regenerated,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.totp.regenerateError),
      });
    } finally {
      setIsRegeneratingRecoveryCodes(false);
    }
  }

  async function handleUploadAvatar() {
    if (!avatarFile || isUploadingAvatar) {
      return;
    }

    setIsUploadingAvatar(true);
    setNotice(null);

    try {
      await uploadCurrentAvatar(request, avatarFile);
      await refreshProfile();
      setAvatarFile(null);
      setNotice({
        tone: 'success',
        message: copy.avatarEmail.uploadSuccess,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.avatarEmail.uploadError),
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleDeleteAvatar() {
    if (isDeletingAvatar) {
      return;
    }

    setIsDeletingAvatar(true);
    setNotice(null);

    try {
      await deleteCurrentAvatar(request);
      await refreshProfile();
      setNotice({
        tone: 'success',
        message: copy.avatarEmail.deleteSuccess,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.avatarEmail.deleteError),
      });
    } finally {
      setIsDeletingAvatar(false);
    }
  }

  async function handleRequestEmailChange() {
    if (isRequestingEmailChange) {
      return;
    }

    setIsRequestingEmailChange(true);
    setNotice(null);

    try {
      const response = await requestEmailChange(request, newEmail);
      setNewEmail('');
      setNotice({
        tone: 'success',
        message: response.message,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.avatarEmail.requestError),
      });
    } finally {
      setIsRequestingEmailChange(false);
    }
  }

  async function handleConfirmEmailChange() {
    if (isConfirmingEmailChange) {
      return;
    }

    setIsConfirmingEmailChange(true);
    setNotice(null);

    try {
      const response = await confirmEmailChange(request, emailConfirmToken);
      await refreshProfile();
      setEmailConfirmToken('');
      setNotice({
        tone: 'success',
        message: response.message,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.avatarEmail.confirmError),
      });
    } finally {
      setIsConfirmingEmailChange(false);
    }
  }

  async function handleConfirmDialog() {
    if (!dialogState) {
      return;
    }

    setDialogPending(true);

    try {
      await dialogState.onConfirm();
      setDialogState(null);
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.state.actionFailed),
      });
    } finally {
      setDialogPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <GlassSurface className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-slate-600 uppercase">
              <UserRound className="h-3.5 w-3.5" />
              {`${copy.header.chipPrefix} / ${workspaceDisplayLabel} / ${headerTitle}`}
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-slate-950">{headerTitle}</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">{headerDescription}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label={copy.header.summaryUserLabel}
              value={profile.displayName || profile.username}
              hint={copy.header.summaryUserHint}
            />
            <SummaryCard
              label={copy.header.summaryEmailLabel}
              value={profile.email}
              hint={copy.header.summaryEmailHint}
            />
            <SummaryCard
              label={copy.header.summaryTotpLabel}
              value={
                profile.totpEnabled
                  ? copy.header.summaryTotpEnabled
                  : copy.header.summaryTotpDisabled
              }
              hint={copy.header.summaryTotpHint}
            />
            <SummaryCard
              label={copy.header.summarySessionsLabel}
              value={String(sessions.length)}
              hint={copy.header.summarySessionsHint}
            />
          </div>
        </div>
      </GlassSurface>

      {notice ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            notice.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      {!isSecurityMode ? (
        <>
          <GlassSurface className="p-6">
            <FormSection
              title={copy.details.title}
              description={copy.details.description}
              actions={
                <>
                  <button
                    type="button"
                    onClick={() => setProfileDraft(buildProfileDraft(profile))}
                    disabled={!hasDirtyProfile || isSavingProfile}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {copy.details.reset}
                  </button>
                  <AsyncSubmitButton
                    onClick={() => void handleSaveProfile()}
                    isPending={isSavingProfile}
                    pendingText={copy.details.savePending}
                  >
                    {copy.details.save}
                  </AsyncSubmitButton>
                </>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {copy.details.displayNameLabel}
                  </span>
                  <input
                    aria-label={copy.details.displayNameLabel}
                    value={profileDraft.displayName}
                    onChange={(event) =>
                      setProfileDraft((current) =>
                        current
                          ? {
                              ...current,
                              displayName: event.target.value,
                            }
                          : current
                      )
                    }
                    className={inputClassName}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {copy.details.phoneLabel}
                  </span>
                  <input
                    aria-label={copy.details.phoneLabel}
                    value={profileDraft.phone}
                    onChange={(event) =>
                      setProfileDraft((current) =>
                        current
                          ? {
                              ...current,
                              phone: event.target.value,
                            }
                          : current
                      )
                    }
                    className={inputClassName}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {copy.details.preferredLanguageLabel}
                  </span>
                  <select
                    aria-label={copy.details.preferredLanguageLabel}
                    value={profileDraft.preferredLanguage}
                    onChange={(event) =>
                      setProfileDraft((current) =>
                        current
                          ? {
                              ...current,
                              preferredLanguage: event.target.value as SupportedUiLocale,
                            }
                          : current
                      )
                    }
                    className={inputClassName}
                  >
                    {SUPPORTED_UI_LOCALES.map((localeCode) => (
                      <option key={localeCode} value={localeCode}>
                        {PROFILE_LANGUAGE_LABELS[localeCode]}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SummaryCard
                    label={copy.details.lastLoginLabel}
                    value={formatProfileDateTime(profile.lastLoginAt, locale, copy.details.never)}
                    hint={copy.details.lastLoginHint}
                  />
                  <SummaryCard
                    label={copy.details.passwordExpiresLabel}
                    value={formatProfileDateTime(
                      profile.passwordExpiresAt,
                      locale,
                      copy.details.notScheduled
                    )}
                    hint={copy.details.passwordExpiresHint}
                  />
                </div>
              </div>
            </FormSection>
          </GlassSurface>

          <GlassSurface className="p-6">
            <FormSection title={copy.avatarEmail.title} description={copy.avatarEmail.description}>
              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-950">
                        {copy.avatarEmail.avatarTitle}
                      </p>
                      <p className="text-sm leading-6 text-slate-600">
                        {copy.avatarEmail.avatarDescription}
                      </p>
                    </div>
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={copy.avatarEmail.currentAvatarAlt}
                        className="h-20 w-20 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
                        {copy.avatarEmail.noAvatar}
                      </div>
                    )}
                    <input
                      aria-label={copy.avatarEmail.avatarFileLabel}
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/webp"
                      onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
                    />
                    <div className="flex flex-wrap gap-3">
                      <AsyncSubmitButton
                        onClick={() => void handleUploadAvatar()}
                        isPending={isUploadingAvatar}
                        pendingText={copy.avatarEmail.uploadPending}
                      >
                        {copy.avatarEmail.uploadAction}
                      </AsyncSubmitButton>
                      <button
                        type="button"
                        onClick={() => void handleDeleteAvatar()}
                        disabled={!profile.avatarUrl || isDeletingAvatar}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeletingAvatar
                          ? copy.avatarEmail.deletePending
                          : copy.avatarEmail.deleteAction}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-950">
                        {copy.avatarEmail.emailTitle}
                      </p>
                      <p className="text-sm leading-6 text-slate-600">
                        {copy.avatarEmail.emailDescription}
                      </p>
                    </div>
                    <input
                      aria-label={copy.avatarEmail.newEmailLabel}
                      value={newEmail}
                      onChange={(event) => setNewEmail(event.target.value)}
                      placeholder={copy.avatarEmail.newEmailPlaceholder}
                      className={inputClassName}
                    />
                    <AsyncSubmitButton
                      onClick={() => void handleRequestEmailChange()}
                      isPending={isRequestingEmailChange}
                      pendingText={copy.avatarEmail.requestPending}
                    >
                      {copy.avatarEmail.requestAction}
                    </AsyncSubmitButton>

                    <div className="border-t border-slate-200 pt-4">
                      <input
                        aria-label={copy.avatarEmail.confirmTokenLabel}
                        value={emailConfirmToken}
                        onChange={(event) => setEmailConfirmToken(event.target.value)}
                        placeholder={copy.avatarEmail.confirmTokenPlaceholder}
                        className={inputClassName}
                      />
                      <div className="mt-3">
                        <AsyncSubmitButton
                          onClick={() => void handleConfirmEmailChange()}
                          isPending={isConfirmingEmailChange}
                          pendingText={copy.avatarEmail.confirmPending}
                        >
                          {copy.avatarEmail.confirmAction}
                        </AsyncSubmitButton>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </FormSection>
          </GlassSurface>
        </>
      ) : null}

      {isSecurityMode ? (
        <section
          id="security-controls"
          aria-labelledby="security-controls-heading"
          className="scroll-mt-24 space-y-6"
        >
          <h2 id="security-controls-heading" className="sr-only">
            {copy.cards.securityTitle}
          </h2>

          <GlassSurface className="p-6">
            <FormSection
              title={copy.cards.securityTitle}
              description={copy.cards.securityDescription}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <SecurityActionCard
                  title={copy.password.title}
                  description={copy.password.description}
                  meta={formatProfileDateTime(
                    profile.passwordExpiresAt,
                    locale,
                    copy.details.notScheduled
                  )}
                  actionLabel={copy.password.openAction}
                  onAction={() => setSecurityDrawer('password')}
                />
                <SecurityActionCard
                  title={copy.totp.title}
                  description={
                    profile.totpEnabled ? copy.totp.description : copy.totp.disabledDescription
                  }
                  meta={
                    profile.totpEnabled
                      ? copy.header.summaryTotpEnabled
                      : copy.header.summaryTotpDisabled
                  }
                  actionLabel={copy.totp.manageAction}
                  onAction={() => setSecurityDrawer('totp')}
                />
              </div>
            </FormSection>
          </GlassSurface>

          <GlassSurface className="p-6">
            <FormSection title={ssoCopy.title} description={ssoCopy.description}>
              <div className="mb-5 flex flex-wrap items-center gap-3">
                {ssoLinkProviders.length > 0 ? (
                  ssoLinkProviders.map((provider) => {
                    const providerLabel =
                      provider.displayName[locale] || provider.displayName.en || provider.code;
                    const hasActiveLink = ssoAccountLinks.some(
                      (link) => link.providerId === provider.id && !link.revokedAt
                    );

                    return (
                      <button
                        key={provider.id}
                        type="button"
                        disabled={isStartingSsoLink || hasActiveLink}
                        onClick={() => void handleStartSsoAccountLink(provider.code)}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Link2 className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {ssoCopy.linkProvider}: {providerLabel}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500">{ssoCopy.noLinkProviders}</p>
                )}
              </div>

              {ssoAccountLinks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-5">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 text-slate-500" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{ssoCopy.emptyTitle}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {ssoCopy.emptyDescription}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {ssoAccountLinks.map((link) => {
                    const providerLabel = link.providerCode;
                    const identityLabel = [link.displayName, link.email].filter(Boolean).join(' / ');
                    const revokeTargetLabel = identityLabel
                      ? `${providerLabel} (${identityLabel})`
                      : providerLabel;
                    const isRevoked = Boolean(link.revokedAt);

                    return (
                      <div
                        key={link.id}
                        className="flex min-w-0 flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm"
                      >
                        <div className="min-w-0 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold break-words text-slate-950">
                              {providerLabel}
                            </p>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                isRevoked
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {isRevoked ? ssoCopy.revoked : ssoCopy.active}
                            </span>
                          </div>
                          <dl className="grid gap-2 text-sm text-slate-600">
                            <div>
                              <dt className="font-medium text-slate-800">{ssoCopy.linkedAt}</dt>
                              <dd>
                                {formatProfileDateTime(link.linkedAt, locale, ssoCopy.unavailable)}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-medium text-slate-800">{ssoCopy.lastLogin}</dt>
                              <dd>
                                {formatProfileDateTime(
                                  link.lastLoginAt,
                                  locale,
                                  ssoCopy.unavailable
                                )}
                              </dd>
                            </div>
                            {link.email || link.displayName ? (
                              <div>
                                <dt className="sr-only">SSO identity snapshot</dt>
                                <dd className="break-words">
                                  {[link.displayName, link.email].filter(Boolean).join(' / ')}
                                </dd>
                              </div>
                            ) : null}
                          </dl>
                        </div>
                        <button
                          type="button"
                          disabled={isRevoked}
                          aria-label={ssoCopy.revokeTitle(revokeTargetLabel)}
                          onClick={() =>
                            setDialogState({
                              title: ssoCopy.revokeTitle(revokeTargetLabel),
                              description: ssoCopy.revokeDescription,
                              confirmText: ssoCopy.revoke,
                              onConfirm: async () => {
                                await revokeSsoAccountLink(request, link.id);
                                await refreshSsoAccountLinks();
                                setNotice({
                                  tone: 'success',
                                  message: ssoCopy.revokedSuccess,
                                });
                              },
                            })
                          }
                          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Link2Off className="h-4 w-4" aria-hidden="true" />
                          {ssoCopy.revoke}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </FormSection>
          </GlassSurface>

          {shouldLoadExternalToolReadiness ? (
            <GlassSurface className="p-6">
              <FormSection
                title={externalToolSsoCopy.title}
                description={externalToolSsoCopy.description}
              >
                {externalToolReadiness.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-5">
                    <p className="text-sm font-semibold text-slate-950">
                      {externalToolSsoCopy.emptyTitle}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {externalToolSsoCopy.emptyDescription}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {externalToolReadiness.map((item) => (
                      <div
                        key={item.toolCode}
                        className="min-w-0 rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-semibold break-words text-slate-950">
                            {item.toolCode}
                          </p>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              item.failClosed
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {item.failClosed
                              ? externalToolSsoCopy.failClosed
                              : externalToolSsoCopy.notFailClosed}
                          </span>
                        </div>
                        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div>
                            <dt className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                              {externalToolSsoCopy.statusLabel}
                            </dt>
                            <dd className="mt-1 text-sm font-medium text-slate-900">
                              {item.status}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                              {externalToolSsoCopy.phaseLabel}
                            </dt>
                            <dd className="mt-1 text-sm font-medium text-slate-900">
                              {item.requiredByPhase || ssoCopy.unavailable}
                            </dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                              {externalToolSsoCopy.providerLabel}
                            </dt>
                            <dd className="mt-1 text-sm font-medium break-words text-slate-900">
                              {item.providerId || ssoCopy.unavailable}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    ))}
                  </div>
                )}
              </FormSection>
            </GlassSurface>
          ) : null}

          <GlassSurface className="p-6">
            <FormSection title={copy.sessions.title} description={copy.sessions.description}>
              <TableShell
                ariaLabel={copy.sessions.title}
                columns={copy.sessions.columns}
                dataLength={paginatedSessions.length}
                isLoading={false}
                isEmpty={paginatedSessions.length === 0}
                emptyTitle={copy.sessions.emptyTitle}
                emptyDescription={copy.sessions.emptyDescription}
              >
                {paginatedSessions.map((entry) => (
                  <tr key={entry.id} className="align-top">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <MonitorSmartphone className="mt-0.5 h-4 w-4 text-slate-500" />
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {entry.deviceInfo || copy.sessions.unknownDevice}
                          </p>
                          <p className="text-xs text-slate-500">{entry.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {entry.ipAddress || copy.sessions.unavailable}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {entry.isCurrent ? copy.sessions.currentSession : copy.sessions.revocable}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {formatProfileDateTime(entry.createdAt, locale, copy.sessions.unavailable)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {formatProfileDateTime(entry.lastActiveAt, locale, copy.sessions.unavailable)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        disabled={entry.isCurrent}
                        aria-label={copy.sessions.revokeDialogTitle(entry.deviceInfo || entry.id)}
                        onClick={() =>
                          setDialogState({
                            title: copy.sessions.revokeDialogTitle(entry.deviceInfo || entry.id),
                            description: copy.sessions.revokeDialogDescription,
                            confirmText: copy.sessions.revokeDialogConfirm,
                            onConfirm: async () => {
                              await revokeUserSession(request, entry.id);
                              await refreshSessions();
                              setNotice({
                                tone: 'success',
                                message: copy.sessions.revokeSuccess,
                              });
                            },
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {copy.sessions.revokeAction}
                      </button>
                    </td>
                  </tr>
                ))}
              </TableShell>
              {sessions.length > 0 ? (
                <PaginationFooter
                  pagination={sessionsPagination}
                  itemCount={paginatedSessions.length}
                  labels={{
                    pageLabel: sessionsPaginationCopy.page,
                    rangeLabel: sessionsPaginationCopy.range,
                    rowsPerPageLabel: sessionsPaginationCopy.pageSize,
                    pageSizeAriaLabel: sessionsPaginationCopy.pageSize,
                    previousLabel: sessionsPaginationCopy.previous,
                    nextLabel: sessionsPaginationCopy.next,
                  }}
                  onPageChange={(nextPage) => applySessionsQueryState({ page: nextPage })}
                  onPageSizeChange={(nextPageSize) => {
                    applySessionsQueryState({
                      page: 1,
                      pageSize: nextPageSize as PageSizeOption,
                    });
                  }}
                  className="mt-5 rounded-2xl border border-slate-200 bg-white/80"
                />
              ) : null}
            </FormSection>
          </GlassSurface>
        </section>
      ) : null}

      <ActionDrawer
        open={securityDrawer === 'password'}
        onOpenChange={(open) => (open ? setSecurityDrawer('password') : closeSecurityDrawer())}
        title={copy.password.title}
        description={copy.password.description}
        closeButtonAriaLabel={copy.password.closeDrawerLabel}
        size="lg"
        footer={
          <ActionDrawerFooter
            secondary={
              <button
                type="button"
                onClick={closeSecurityDrawer}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                {copy.dialog.cancelAction}
              </button>
            }
            primary={
              <AsyncSubmitButton
                onClick={() => void handleChangePassword()}
                isPending={isSavingPassword}
                pendingText={copy.password.pending}
              >
                {copy.password.action}
              </AsyncSubmitButton>
            }
          />
        }
      >
        <div className="grid gap-4">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-900">
              {copy.password.currentLabel}
            </span>
            <input
              aria-label={copy.password.currentLabel}
              type="password"
              value={passwordDraft.currentPassword}
              onChange={(event) =>
                setPasswordDraft((current) => ({
                  ...current,
                  currentPassword: event.target.value,
                }))
              }
              className={inputClassName}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-900">{copy.password.newLabel}</span>
            <input
              aria-label={copy.password.newLabel}
              type="password"
              value={passwordDraft.newPassword}
              onChange={(event) =>
                setPasswordDraft((current) => ({
                  ...current,
                  newPassword: event.target.value,
                }))
              }
              className={inputClassName}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-900">
              {copy.password.confirmLabel}
            </span>
            <input
              aria-label={copy.password.confirmLabel}
              type="password"
              value={passwordDraft.newPasswordConfirm}
              onChange={(event) =>
                setPasswordDraft((current) => ({
                  ...current,
                  newPasswordConfirm: event.target.value,
                }))
              }
              className={inputClassName}
            />
          </label>
        </div>
      </ActionDrawer>

      <ActionDrawer
        open={securityDrawer === 'totp'}
        onOpenChange={(open) => (open ? setSecurityDrawer('totp') : closeSecurityDrawer())}
        title={copy.totp.title}
        description={copy.totp.description}
        closeButtonAriaLabel={copy.totp.closeDrawerLabel}
        size="xl"
      >
        <div className="space-y-5">
          {!profile.totpEnabled ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-950">
                      {copy.totp.disabledTitle}
                    </p>
                    <p className="text-sm leading-6 text-slate-600">
                      {copy.totp.disabledDescription}
                    </p>
                  </div>
                  <AsyncSubmitButton
                    onClick={() => void handlePrepareTotp()}
                    isPending={isPreparingTotp}
                    pendingText={copy.totp.preparePending}
                  >
                    {copy.totp.prepareAction}
                  </AsyncSubmitButton>
                </div>
              </div>

              {totpSetup ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-950">
                      {copy.totp.setupMaterialTitle}
                    </p>
                    <div className="mt-3 space-y-4">
                      {totpSetup.qrCode ? (
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-slate-900">
                            {copy.totp.qrCodeLabel}
                          </p>
                          <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                            <img
                              src={totpSetup.qrCode}
                              alt={copy.totp.qrCodeAlt}
                              className="h-44 w-44 rounded-xl object-contain"
                            />
                          </div>
                          <p className="text-sm leading-6 text-slate-600">{copy.totp.qrCodeHint}</p>
                        </div>
                      ) : null}
                      <div className="space-y-2 text-sm text-slate-700">
                        <p>
                          <span className="font-semibold text-slate-900">
                            {copy.totp.accountLabel}:
                          </span>{' '}
                          {totpSetup.account}
                        </p>
                        <p className="break-all">
                          <span className="font-semibold text-slate-900">
                            {copy.totp.secretLabel}:
                          </span>{' '}
                          {totpSetup.secret}
                        </p>
                        <p className="break-all">
                          <span className="font-semibold text-slate-900">
                            {copy.totp.otpAuthUrlLabel}:
                          </span>{' '}
                          {totpSetup.otpauthUrl}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-950">
                          {copy.totp.enableTitle}
                        </p>
                        <p className="text-sm leading-6 text-slate-600">
                          {copy.totp.enableDescription}
                        </p>
                      </div>
                      <input
                        aria-label={copy.totp.codeLabel}
                        value={totpCode}
                        onChange={(event) => setTotpCode(event.target.value)}
                        placeholder={copy.totp.codePlaceholder}
                        className={inputClassName}
                      />
                      <AsyncSubmitButton
                        onClick={() => void handleEnableTotp()}
                        isPending={isEnablingTotp}
                        pendingText={copy.totp.enablePending}
                      >
                        {copy.totp.enableAction}
                      </AsyncSubmitButton>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-950">{copy.totp.disableTitle}</p>
                    <p className="text-sm leading-6 text-slate-600">
                      {copy.totp.disableDescription}
                    </p>
                  </div>
                  <input
                    aria-label={copy.totp.disablePasswordLabel}
                    type="password"
                    value={totpDisablePassword}
                    onChange={(event) => setTotpDisablePassword(event.target.value)}
                    className={inputClassName}
                  />
                  <AsyncSubmitButton
                    onClick={() => void handleDisableTotp()}
                    isPending={isDisablingTotp}
                    pendingText={copy.totp.disablePending}
                  >
                    {copy.totp.disableAction}
                  </AsyncSubmitButton>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-950">
                      {copy.totp.regenerateTitle}
                    </p>
                    <p className="text-sm leading-6 text-slate-600">
                      {copy.totp.regenerateDescription}
                    </p>
                  </div>
                  <input
                    aria-label={copy.totp.regeneratePasswordLabel}
                    type="password"
                    value={recoveryCodePassword}
                    onChange={(event) => setRecoveryCodePassword(event.target.value)}
                    className={inputClassName}
                  />
                  <AsyncSubmitButton
                    onClick={() => void handleRegenerateRecoveryCodes()}
                    isPending={isRegeneratingRecoveryCodes}
                    pendingText={copy.totp.regeneratePending}
                  >
                    {copy.totp.regenerateAction}
                  </AsyncSubmitButton>
                </div>
              </div>
            </div>
          )}

          {recoveryCodes.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-5">
              <p className="text-sm font-semibold text-amber-900">{copy.totp.recoveryCodesTitle}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {recoveryCodes.map((code) => (
                  <div
                    key={code}
                    className="rounded-xl border border-amber-200 bg-white/80 px-3 py-2 text-sm font-medium text-slate-900"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </ActionDrawer>

      <ConfirmActionDialog
        open={dialogState !== null}
        title={dialogState?.title || copy.dialog.confirmAction}
        description={dialogState?.description || ''}
        confirmText={dialogState?.confirmText || copy.dialog.confirmAction}
        cancelText={copy.dialog.cancelAction}
        intent="danger"
        isPending={dialogPending}
        onConfirm={() => void handleConfirmDialog()}
        onCancel={() => {
          if (!dialogPending) {
            setDialogState(null);
          }
        }}
      />
    </div>
  );
}
