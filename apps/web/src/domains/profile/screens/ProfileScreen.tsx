'use client';

import { SUPPORTED_UI_LOCALES, type SupportedUiLocale } from '@tcrn/shared';
import { MonitorSmartphone, Trash2, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  changeCurrentPassword,
  confirmEmailChange,
  type CurrentProfile,
  deleteCurrentAvatar,
  disableTotp,
  enableTotp,
  listUserSessions,
  readCurrentProfile,
  regenerateRecoveryCodes,
  requestEmailChange,
  revokeUserSession,
  setupTotp,
  type TotpSetupResponse,
  updateCurrentProfile,
  uploadCurrentAvatar,
  type UserSessionRecord,
} from '@/domains/profile/api/profile.api';
import { ApiRequestError } from '@/platform/http/api';
import { useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import {
  buildPaginationMeta,
  getPaginationRange,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
} from '@/platform/runtime/pagination/pagination';
import { useSession } from '@/platform/runtime/session/session-provider';
import {
  AsyncSubmitButton,
  ConfirmActionDialog,
  FormSection,
  GlassSurface,
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
  nextUser: SessionUserSnapshot,
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
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-xl font-semibold leading-8 text-slate-950 sm:text-2xl">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>
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
  const { request, session, updateSessionUser } = useSession();
  const { copy, currentLocale } = useProfileCopy();
  const { selectedLocale } = useRuntimeLocale();
  const workspaceDisplayLabel =
    workspaceKind === 'ac'
      ? pickLocaleText(selectedLocale, {
          en: 'Platform',
          zh_HANS: '平台',
          zh_HANT: '平台',
          ja: 'プラットフォーム',
          ko: '플랫폼',
          fr: 'Plateforme',
        })
      : pickLocaleText(selectedLocale, {
          en: 'Tenant',
          zh_HANS: '租户',
          zh_HANT: '租戶',
          ja: 'テナント',
          ko: '테넌트',
          fr: 'Tenant',
        });
  const isSecurityMode = mode === 'security';
  const headerTitle = isSecurityMode ? copy.header.securityTitle : copy.header.title;
  const headerDescription = isSecurityMode
    ? copy.header.securityDescription
    : copy.header.description;
  const sessionUserRef = useRef<SessionUserSnapshot | null>(
    session?.user ? { ...session.user } : null,
  );

  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft | null>(null);
  const [sessions, setSessions] = useState<UserSessionRecord[]>([]);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsPageSize, setSessionsPageSize] = useState<PageSizeOption>(PAGE_SIZE_OPTIONS[0]);
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
    [sessions.length, sessionsPage, sessionsPageSize],
  );

  const paginatedSessions = useMemo(() => {
    const startIndex = (sessionsPagination.page - 1) * sessionsPagination.pageSize;

    return sessions.slice(startIndex, startIndex + sessionsPagination.pageSize);
  }, [sessions, sessionsPagination.page, sessionsPagination.pageSize]);

  useEffect(() => {
    if (sessionsPage !== sessionsPagination.page) {
      setSessionsPage(sessionsPagination.page);
    }
  }, [sessionsPage, sessionsPagination.page]);

  const applyProfileState = useCallback((nextProfile: CurrentProfile) => {
    setProfile(nextProfile);
    setProfileDraft(buildProfileDraft(nextProfile));
    const nextSessionUser = buildSessionUserSnapshot(nextProfile);

    if (hasSessionUserDrift(sessionUserRef.current, nextSessionUser)) {
      sessionUserRef.current = nextSessionUser;
      updateSessionUser(nextSessionUser);
    }
  }, [updateSessionUser]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const [profileResult, sessionsResult] = await Promise.all([
          readCurrentProfile(request),
          listUserSessions(request),
        ]);

        if (cancelled) {
          return;
        }

        applyProfileState(profileResult);
        setSessions(sessionsResult);
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
  }, [applyProfileState, request]);

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
    return <StateView status="error" title={copy.state.unavailableTitle} description={loadError || undefined} />;
  }

  const sessionsPageRange = getPaginationRange(sessionsPagination, paginatedSessions.length);
  const sessionsPaginationCopy = {
    page: pickLocaleText(selectedLocale, {
      en: `Page ${sessionsPagination.page} of ${sessionsPagination.totalPages}`,
      zh_HANS: `第 ${sessionsPagination.page} / ${sessionsPagination.totalPages} 页`,
      zh_HANT: `第 ${sessionsPagination.page} / ${sessionsPagination.totalPages} 頁`,
      ja: `${sessionsPagination.totalPages} ページ中 ${sessionsPagination.page} ページ`,
      ko: `${sessionsPagination.totalPages}페이지 중 ${sessionsPagination.page}페이지`,
      fr: `Page ${sessionsPagination.page} sur ${sessionsPagination.totalPages}`,
    }),
    range:
      sessionsPagination.totalCount === 0
        ? pickLocaleText(selectedLocale, {
            en: 'No sign-in sessions available.',
            zh_HANS: '当前没有登录会话。',
            zh_HANT: '目前沒有登入工作階段。',
            ja: 'サインインセッションはありません。',
            ko: '로그인 세션이 없습니다.',
            fr: 'Aucune session de connexion disponible.',
          })
        : pickLocaleText(selectedLocale, {
            en: `Showing ${sessionsPageRange.start}-${sessionsPageRange.end} of ${sessionsPagination.totalCount}`,
            zh_HANS: `显示第 ${sessionsPageRange.start}-${sessionsPageRange.end} 条，共 ${sessionsPagination.totalCount} 条`,
            zh_HANT: `顯示第 ${sessionsPageRange.start}-${sessionsPageRange.end} 筆，共 ${sessionsPagination.totalCount} 筆`,
            ja: `${sessionsPagination.totalCount} 件中 ${sessionsPageRange.start}-${sessionsPageRange.end} 件を表示`,
            ko: `${sessionsPagination.totalCount}개 중 ${sessionsPageRange.start}-${sessionsPageRange.end}개 표시`,
            fr: `Affichage de ${sessionsPageRange.start} à ${sessionsPageRange.end} sur ${sessionsPagination.totalCount}`,
          }),
    pageSize: pickLocaleText(selectedLocale, {
      en: 'Rows per page',
      zh_HANS: '每页条数',
      zh_HANT: '每頁筆數',
      ja: '表示件数',
      ko: '페이지당 행 수',
      fr: 'Lignes par page',
    }),
    previous: pickLocaleText(selectedLocale, {
      en: 'Previous',
      zh_HANS: '上一页',
      zh_HANT: '上一頁',
      ja: '前へ',
      ko: '이전',
      fr: 'Précédent',
    }),
    next: pickLocaleText(selectedLocale, {
      en: 'Next',
      zh_HANS: '下一页',
      zh_HANT: '下一頁',
      ja: '次へ',
      ko: '다음',
      fr: 'Suivant',
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
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
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
            <SummaryCard label={copy.header.summaryEmailLabel} value={profile.email} hint={copy.header.summaryEmailHint} />
            <SummaryCard
              label={copy.header.summaryTotpLabel}
              value={profile.totpEnabled ? copy.header.summaryTotpEnabled : copy.header.summaryTotpDisabled}
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
                  <AsyncSubmitButton onClick={() => void handleSaveProfile()} isPending={isSavingProfile} pendingText={copy.details.savePending}>
                    {copy.details.save}
                  </AsyncSubmitButton>
                </>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">{copy.details.displayNameLabel}</span>
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
                          : current,
                      )
                    }
                    className={inputClassName}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">{copy.details.phoneLabel}</span>
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
                          : current,
                      )
                    }
                    className={inputClassName}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">{copy.details.preferredLanguageLabel}</span>
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
                          : current,
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
                    value={formatProfileDateTime(profile.lastLoginAt, currentLocale, copy.details.never)}
                    hint={copy.details.lastLoginHint}
                  />
                  <SummaryCard
                    label={copy.details.passwordExpiresLabel}
                    value={formatProfileDateTime(profile.passwordExpiresAt, currentLocale, copy.details.notScheduled)}
                    hint={copy.details.passwordExpiresHint}
                  />
                </div>
              </div>
            </FormSection>
          </GlassSurface>

          <GlassSurface className="p-6">
            <FormSection
              title={copy.avatarEmail.title}
              description={copy.avatarEmail.description}
            >
              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-950">{copy.avatarEmail.avatarTitle}</p>
                      <p className="text-sm leading-6 text-slate-600">{copy.avatarEmail.avatarDescription}</p>
                    </div>
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={copy.avatarEmail.currentAvatarAlt} className="h-20 w-20 rounded-2xl object-cover" />
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
                      <AsyncSubmitButton onClick={() => void handleUploadAvatar()} isPending={isUploadingAvatar} pendingText={copy.avatarEmail.uploadPending}>
                        {copy.avatarEmail.uploadAction}
                      </AsyncSubmitButton>
                      <button
                        type="button"
                        onClick={() => void handleDeleteAvatar()}
                        disabled={!profile.avatarUrl || isDeletingAvatar}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeletingAvatar ? copy.avatarEmail.deletePending : copy.avatarEmail.deleteAction}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-950">{copy.avatarEmail.emailTitle}</p>
                      <p className="text-sm leading-6 text-slate-600">{copy.avatarEmail.emailDescription}</p>
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
        <section id="security-controls" aria-labelledby="security-controls-heading" className="scroll-mt-24 space-y-6">
          <h2 id="security-controls-heading" className="sr-only">
            Security controls
          </h2>

          <GlassSurface className="p-6">
            <FormSection
              title={copy.password.title}
              description={copy.password.description}
              actions={
                <AsyncSubmitButton onClick={() => void handleChangePassword()} isPending={isSavingPassword} pendingText={copy.password.pending}>
                  {copy.password.action}
                </AsyncSubmitButton>
              }
            >
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">{copy.password.currentLabel}</span>
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
                  <span className="text-sm font-semibold text-slate-900">{copy.password.confirmLabel}</span>
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
            </FormSection>
          </GlassSurface>

          <GlassSurface className="p-6">
            <FormSection title={copy.totp.title} description={copy.totp.description}>
              {!profile.totpEnabled ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-950">{copy.totp.disabledTitle}</p>
                        <p className="text-sm leading-6 text-slate-600">{copy.totp.disabledDescription}</p>
                      </div>
                      <AsyncSubmitButton onClick={() => void handlePrepareTotp()} isPending={isPreparingTotp} pendingText={copy.totp.preparePending}>
                        {copy.totp.prepareAction}
                      </AsyncSubmitButton>
                    </div>
                  </div>

                  {totpSetup ? (
                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
                        <p className="text-sm font-semibold text-slate-950">{copy.totp.setupMaterialTitle}</p>
                        <div className="mt-3 space-y-2 text-sm text-slate-700">
                          <p>
                            <span className="font-semibold text-slate-900">{copy.totp.accountLabel}:</span> {totpSetup.account}
                          </p>
                          <p className="break-all">
                            <span className="font-semibold text-slate-900">{copy.totp.secretLabel}:</span> {totpSetup.secret}
                          </p>
                          <p className="break-all">
                            <span className="font-semibold text-slate-900">{copy.totp.otpAuthUrlLabel}:</span> {totpSetup.otpauthUrl}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-slate-950">{copy.totp.enableTitle}</p>
                            <p className="text-sm leading-6 text-slate-600">{copy.totp.enableDescription}</p>
                          </div>
                          <input
                            aria-label={copy.totp.codeLabel}
                            value={totpCode}
                            onChange={(event) => setTotpCode(event.target.value)}
                            placeholder={copy.totp.codePlaceholder}
                            className={inputClassName}
                          />
                          <AsyncSubmitButton onClick={() => void handleEnableTotp()} isPending={isEnablingTotp} pendingText={copy.totp.enablePending}>
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
                        <p className="text-sm leading-6 text-slate-600">{copy.totp.disableDescription}</p>
                      </div>
                      <input
                        aria-label={copy.totp.disablePasswordLabel}
                        type="password"
                        value={totpDisablePassword}
                        onChange={(event) => setTotpDisablePassword(event.target.value)}
                        className={inputClassName}
                      />
                      <AsyncSubmitButton onClick={() => void handleDisableTotp()} isPending={isDisablingTotp} pendingText={copy.totp.disablePending}>
                        {copy.totp.disableAction}
                      </AsyncSubmitButton>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-5 shadow-sm">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-950">{copy.totp.regenerateTitle}</p>
                        <p className="text-sm leading-6 text-slate-600">{copy.totp.regenerateDescription}</p>
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
            </FormSection>
          </GlassSurface>

          <GlassSurface className="p-6">
            <FormSection title={copy.sessions.title} description={copy.sessions.description}>
              <TableShell
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
                          <p className="text-sm font-semibold text-slate-900">{entry.deviceInfo || copy.sessions.unknownDevice}</p>
                          <p className="text-xs text-slate-500">{entry.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{entry.ipAddress || copy.sessions.unavailable}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{entry.isCurrent ? copy.sessions.currentSession : copy.sessions.revocable}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{formatProfileDateTime(entry.createdAt, currentLocale, copy.sessions.unavailable)}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{formatProfileDateTime(entry.lastActiveAt, currentLocale, copy.sessions.unavailable)}</td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        disabled={entry.isCurrent}
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
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-700">{sessionsPaginationCopy.page}</p>
                    <p className="text-xs text-slate-500">{sessionsPaginationCopy.range}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="font-medium text-slate-700">{sessionsPaginationCopy.pageSize}</span>
                      <select
                        aria-label={sessionsPaginationCopy.pageSize}
                        value={sessionsPageSize}
                        onChange={(event) => {
                          setSessionsPageSize(Number(event.target.value) as PageSizeOption);
                          setSessionsPage(1);
                        }}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      >
                        {PAGE_SIZE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={() => setSessionsPage((current) => Math.max(1, current - 1))}
                      disabled={!sessionsPagination.hasPrev}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sessionsPaginationCopy.previous}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSessionsPage((current) => Math.min(sessionsPagination.totalPages, current + 1))
                      }
                      disabled={!sessionsPagination.hasNext}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sessionsPaginationCopy.next}
                    </button>
                  </div>
                </div>
              ) : null}
            </FormSection>
          </GlassSurface>
        </section>
      ) : null}

      <ConfirmActionDialog
        open={dialogState !== null}
        title={dialogState?.title || copy.dialog.confirmAction}
        description={dialogState?.description || ''}
        confirmText={dialogState?.confirmText || copy.dialog.confirmAction}
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
