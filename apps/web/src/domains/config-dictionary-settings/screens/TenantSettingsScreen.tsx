'use client';

import {
  SUPPORTED_UI_LOCALES,
  type SupportedUiLocale,
} from '@tcrn/shared';
import { Building2, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useDeferredValue, useEffect, useState } from 'react';

import {
  buildTenantSettingsDraft,
  buildTenantSettingsUpdatePayload,
  createProfileStore,
  type CreateProfileStoreInput,
  isTenantSettingsDraftDirty,
  listProfileStores,
  type ProfileStoreDetailResponse,
  type ProfileStoreListItem,
  type ProfileStoreListResponse,
  readProfileStoreDetail,
  readTenantSettings,
  type ScopeSettingsResponse,
  type TenantSettingsDraft,
  updateProfileStore,
  updateTenantSettings,
} from '@/domains/config-dictionary-settings/api/settings.api';
import {
  type DictionaryTypeSummary,
  listDictionaryTypes,
} from '@/domains/config-dictionary-settings/api/system-dictionary.api';
import { DictionaryExplorerPanel } from '@/domains/config-dictionary-settings/components/DictionaryExplorerPanel';
import { ScopedConfigEntityWorkspace } from '@/domains/config-dictionary-settings/components/ScopedConfigEntityWorkspace';
import {
  buildManagedTranslations,
  countManagedLocaleValues,
  extractManagedTranslations,
  pickLegacyLocaleValue,
  TranslationManagementDrawer,
  TranslationManagementTrigger,
} from '@/domains/config-dictionary-settings/components/TranslationManagement';
import { useSettingsFamilyCopy } from '@/domains/config-dictionary-settings/screens/settings-family.copy';
import { ApiRequestError } from '@/platform/http/api';
import { buildTenantBusinessPath } from '@/platform/routing/workspace-paths';
import type { RuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import { useFadeSwapState } from '@/platform/runtime/motion/use-fade-swap-state';
import {
  getPaginationRange,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
} from '@/platform/runtime/pagination/pagination';
import { useSession } from '@/platform/runtime/session/session-provider';
import { resolveLocalizedLabel } from '@/platform/runtime/translations/managed-translations';
import {
  AsyncSubmitButton,
  ConfirmActionDialog,
  FormSection,
  GlassSurface,
  SettingsLayout,
  StateView,
  TableShell,
} from '@/platform/ui';

interface AsyncPanelState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

interface NoticeState {
  tone: 'success' | 'error';
  message: string;
}

interface ProfileStoreDraft {
  code: string;
  nameEn: string;
  nameTranslations: Record<string, string>;
  descriptionEn: string;
  descriptionTranslations: Record<string, string>;
  isDefault: boolean;
  isActive: boolean;
}

type ProfileStoreActivityFilter = 'all' | 'active' | 'inactive';

type ProfileStoreEditorState =
  | { mode: 'create' }
  | { mode: 'edit'; id: string; version: number };

interface ProfileStoreDialogState {
  id: string;
  version: number;
  nextActive: boolean;
  title: string;
  description: string;
  confirmText: string;
  successMessage: string;
  errorFallback: string;
  intent: 'danger' | 'primary';
}

const LANGUAGE_LABELS = {
  en: 'English',
  zh_HANS: '简体中文',
  zh_HANT: '繁體中文',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
} as const;

const LANGUAGE_OPTIONS = SUPPORTED_UI_LOCALES.map((value) => ({
  value,
  label: LANGUAGE_LABELS[value],
}));

const TIMEZONE_OPTIONS = [
  'Asia/Shanghai',
  'Asia/Tokyo',
  'UTC',
  'America/Los_Angeles',
];

const EMPTY_PROFILE_STORE_DRAFT: ProfileStoreDraft = {
  code: '',
  nameEn: '',
  nameTranslations: {},
  descriptionEn: '',
  descriptionTranslations: {},
  isDefault: false,
  isActive: true,
};

const PROFILE_STORE_CODE_PATTERN = /^[A-Z0-9_]{3,32}$/;

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function resolveProfileStoreName(
  profileStore: {
    name?: string;
    nameEn?: string;
    nameZh?: string | null;
    nameJa?: string | null;
    translations?: Record<string, string> | null;
    code: string;
  },
  locale: RuntimeLocale | SupportedUiLocale,
) {
  const fallback = profileStore.nameEn || profileStore.name || profileStore.nameZh || profileStore.nameJa || profileStore.code;

  if (profileStore.translations && Object.keys(profileStore.translations).length > 0) {
    return resolveLocalizedLabel(profileStore.translations, locale, fallback);
  }

  return fallback;
}

function buildProfileStoreDraft(detail: ProfileStoreDetailResponse): ProfileStoreDraft {
  return {
    code: detail.code,
    nameEn: detail.name,
    nameTranslations: extractManagedTranslations(detail.name, detail.translations, {
      zh_HANS: detail.nameZh,
      ja: detail.nameJa,
    }),
    descriptionEn: detail.description ?? '',
    descriptionTranslations: extractManagedTranslations(detail.description, detail.descriptionTranslations, {
      zh_HANS: detail.descriptionZh,
      ja: detail.descriptionJa,
    }),
    isDefault: detail.isDefault,
    isActive: detail.isActive,
  };
}

function normalizeOptionalString(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function validateProfileStoreDraft(
  mode: 'create' | 'edit',
  draft: ProfileStoreDraft,
  text: (en: string, zh: string, ja: string) => string,
) {
  if (mode === 'create' && !PROFILE_STORE_CODE_PATTERN.test(draft.code.trim().toUpperCase())) {
    return text(
      'Profile store code must be 3-32 characters using only A-Z, 0-9, and _.',
      '档案库代码必须为 3-32 位，且只能使用 A-Z、0-9 与 _。',
      'プロフィールストアコードは 3〜32 文字で、A-Z、0-9、_ のみ使用できます。',
    );
  }

  if (draft.nameEn.trim().length === 0) {
    return text('Profile store name is required.', '档案库名称不能为空。', 'プロフィールストア名は必須です。');
  }

  return null;
}

function buildCreateProfileStoreInput(draft: ProfileStoreDraft): CreateProfileStoreInput {
  const translations = buildManagedTranslations(draft.nameEn, draft.nameTranslations);
  const descriptionTranslations = buildManagedTranslations(draft.descriptionEn, draft.descriptionTranslations);

  return {
    code: draft.code.trim().toUpperCase(),
    nameEn: draft.nameEn.trim(),
    nameZh: pickLegacyLocaleValue(translations, 'zh_HANS'),
    nameJa: pickLegacyLocaleValue(translations, 'ja'),
    translations,
    descriptionEn: normalizeOptionalString(draft.descriptionEn),
    descriptionZh: pickLegacyLocaleValue(descriptionTranslations, 'zh_HANS'),
    descriptionJa: pickLegacyLocaleValue(descriptionTranslations, 'ja'),
    descriptionTranslations,
    isDefault: draft.isDefault,
  };
}

function FieldRow({
  label,
  value,
  hint,
}: Readonly<{
  label: string;
  value: string;
  hint?: string;
}>) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 min-w-0 whitespace-normal break-all text-base font-semibold text-slate-950">{value}</p>
      {hint ? <p className="mt-2 min-w-0 whitespace-normal break-all text-sm leading-6 text-slate-600">{hint}</p> : null}
    </div>
  );
}

function NoticeBanner({
  tone,
  message,
}: Readonly<{
  tone: 'success' | 'error';
  message: string;
}>) {
  const toneClasses =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-rose-200 bg-rose-50 text-rose-800';

  return <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${toneClasses}`}>{message}</div>;
}

function SectionPlaceholder({
  title,
  description,
}: Readonly<{
  title: string;
  description: string;
}>) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-4">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function SectionEntryLink({
  title,
  description,
  href,
  cta,
}: Readonly<{
  title: string;
  description: string;
  href: string;
  cta: string;
}>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <Link
          href={href}
          className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

export function TenantSettingsScreen({
  tenantId,
}: Readonly<{
  tenantId: string;
}>) {
  const [activeSectionId, setActiveSectionId] = useState<'details' | 'config-entities' | 'settings' | 'dictionary'>(
    'details',
  );
  const {
    displayedValue: displayedSectionId,
    transitionClassName: sectionTransitionClassName,
  } = useFadeSwapState(activeSectionId);
  const { request, requestEnvelope, session } = useSession();
  const {
    common,
    selectedLocale,
    dictionaryExplorerCopy,
    formatDateTime,
    localizedConfigEntityCatalog,
    scopedConfigCopy,
    text,
  } = useSettingsFamilyCopy();
  const [settings, setSettings] = useState<ScopeSettingsResponse | null>(null);
  const [profileStoresPanel, setProfileStoresPanel] = useState<AsyncPanelState<ProfileStoreListResponse>>({
    data: null,
    error: null,
    loading: true,
  });
  const [dictionaryPanel, setDictionaryPanel] = useState<AsyncPanelState<DictionaryTypeSummary[]>>({
    data: null,
    error: null,
    loading: true,
  });
  const [initialDraft, setInitialDraft] = useState<TenantSettingsDraft>(() => buildTenantSettingsDraft({}));
  const [draft, setDraft] = useState<TenantSettingsDraft>(() => buildTenantSettingsDraft({}));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [profileStoreNotice, setProfileStoreNotice] = useState<NoticeState | null>(null);
  const [profileStoreSearch, setProfileStoreSearch] = useState('');
  const deferredProfileStoreSearch = useDeferredValue(profileStoreSearch);
  const [profileStoreActivityFilter, setProfileStoreActivityFilter] = useState<ProfileStoreActivityFilter>('all');
  const [profileStorePage, setProfileStorePage] = useState(1);
  const [profileStorePageSize, setProfileStorePageSize] = useState<PageSizeOption>(PAGE_SIZE_OPTIONS[0]);
  const [profileStoreEditorState, setProfileStoreEditorState] = useState<ProfileStoreEditorState>({ mode: 'create' });
  const [profileStoreDraft, setProfileStoreDraft] = useState<ProfileStoreDraft>(EMPTY_PROFILE_STORE_DRAFT);
  const [profileStoreTranslationsOpen, setProfileStoreTranslationsOpen] = useState(false);
  const [profileStoreEditorLoading, setProfileStoreEditorLoading] = useState(false);
  const [profileStoreSavePending, setProfileStoreSavePending] = useState(false);
  const [profileStoreDialogState, setProfileStoreDialogState] = useState<ProfileStoreDialogState | null>(null);
  const [profileStoreDialogPending, setProfileStoreDialogPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const nextSettings = await readTenantSettings(request);
        const dictionaryResult = await Promise.allSettled([listDictionaryTypes(request)]);

        if (cancelled) {
          return;
        }

        const nextDraft = buildTenantSettingsDraft(nextSettings.settings);
        setSettings(nextSettings);
        setInitialDraft(nextDraft);
        setDraft(nextDraft);
        setDictionaryPanel({
          data: dictionaryResult[0]?.status === 'fulfilled' ? dictionaryResult[0].value : null,
          error:
            dictionaryResult[0]?.status === 'rejected'
              ? getErrorMessage(
                  dictionaryResult[0].reason,
                  text('System dictionary is unavailable.', '系统词典暂不可用。', 'システム辞書を読み込めません。'),
                )
              : null,
          loading: false,
        });
      } catch (reason) {
        if (!cancelled) {
          setLoadError(getErrorMessage(reason, text('Failed to load tenant settings.', '加载租户设置失败。', 'テナント設定の読み込みに失敗しました。')));
          setDictionaryPanel((current) => ({ ...current, loading: false }));
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
  }, [request]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfileStores() {
      setProfileStoresPanel((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      try {
        const next = await listProfileStores(request, {
          page: profileStorePage,
          pageSize: profileStorePageSize,
          includeInactive: true,
          search: deferredProfileStoreSearch.trim() || undefined,
        });

        if (cancelled) {
          return;
        }

        setProfileStoresPanel({
          data: next,
          error: null,
          loading: false,
        });
      } catch (reason) {
        if (!cancelled) {
          setProfileStoresPanel((current) => ({
            data: current.data,
            error: getErrorMessage(
              reason,
              text('Profile stores are unavailable.', '档案库暂不可用。', 'プロフィールストアを読み込めません。'),
            ),
            loading: false,
          }));
        }
      }
    }

    void loadProfileStores();

    return () => {
      cancelled = true;
    };
  }, [deferredProfileStoreSearch, profileStorePage, profileStorePageSize, request, text]);

  async function refreshProfileStoresPanel() {
    setProfileStoresPanel((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const next = await listProfileStores(request, {
        page: profileStorePage,
        pageSize: profileStorePageSize,
        includeInactive: true,
        search: deferredProfileStoreSearch.trim() || undefined,
      });

      setProfileStoresPanel({
        data: next,
        error: null,
        loading: false,
      });
    } catch (reason) {
      setProfileStoresPanel((current) => ({
        data: current.data,
        error: getErrorMessage(
          reason,
          text({
            en: 'Failed to refresh profile stores.',
            zh_HANS: '刷新档案库失败。',
            zh_HANT: '重新整理檔案庫失敗。',
            ja: 'プロフィールストアの更新に失敗しました。',
            ko: '프로필 스토어를 새로 고치지 못했습니다.',
            fr: 'Impossible d’actualiser les profils de stockage.',
          }),
        ),
        loading: false,
      }));
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <GlassSurface className="p-8">
          <p className="text-sm font-medium text-slate-500">
            {text({
              en: 'Loading tenant settings…',
              zh_HANS: '正在加载租户设置…',
              zh_HANT: '正在載入租戶設定…',
              ja: 'テナント設定を読み込み中…',
              ko: '테넌트 설정을 불러오는 중…',
              fr: 'Chargement des paramètres du tenant…',
            })}
          </p>
        </GlassSurface>
      </div>
    );
  }

  if (loadError || !settings) {
    return (
      <StateView
        status="error"
        title={text({
          en: 'Tenant settings unavailable',
          zh_HANS: '租户设置不可用',
          zh_HANT: '租戶設定不可用',
          ja: 'テナント設定を読み込めません',
          ko: '테넌트 설정을 사용할 수 없습니다.',
          fr: 'Les paramètres du tenant sont indisponibles.',
        })}
        description={loadError || undefined}
      />
    );
  }

  const hasDirtyDraft = isTenantSettingsDraftDirty(initialDraft, draft);
  const currentSettings = settings;
  const overrideSet = new Set(settings.overrides);
  const dictionaryCount = dictionaryPanel.data?.length ?? 0;
  const allProfileStores = profileStoresPanel.data?.items ?? [];
  const profileStoreCount = profileStoresPanel.data?.meta.pagination.totalCount ?? allProfileStores.length;
  const profileStoreTranslationSections = [
    {
      id: 'name',
      baseValue: profileStoreDraft.nameEn,
      label: text('Store name', '档案库名称', 'プロフィールストア名'),
      values: profileStoreDraft.nameTranslations,
    },
    {
      baseValue: profileStoreDraft.descriptionEn,
      id: 'description',
      label: text('Store description', '档案库描述', 'プロフィールストア説明'),
      kind: 'textarea' as const,
      values: profileStoreDraft.descriptionTranslations,
    },
  ];
  const tenantOverrideLabel = text('Tenant override', '租户覆盖', 'テナント上書き');

  function formatScopeSource(source: string | null | undefined) {
    if (!source) {
      return tenantOverrideLabel;
    }

    if (source === 'tenant') {
      return text('Tenant default', '租户默认值', 'テナント既定値');
    }

    if (source === 'subsidiary') {
      return text('Subsidiary default', '分目录默认值', '配下スコープ既定値');
    }

    if (source === 'talent') {
      return text('Talent scope', '艺人范围', 'タレントスコープ');
    }

    return source;
  }

  function formatSourceHint(source: string | null | undefined, isOverridden: boolean) {
    return `${common.source}: ${formatScopeSource(source)}${isOverridden ? ` / ${common.overriddenHere}` : ''}`;
  }

  const filteredProfileStores = allProfileStores.filter((profileStore) => {
    const matchesActivity =
      profileStoreActivityFilter === 'all'
        ? true
        : profileStoreActivityFilter === 'active'
          ? profileStore.isActive
          : !profileStore.isActive;

    return matchesActivity;
  });
  const profileStorePagination = profileStoresPanel.data?.meta.pagination;
  const profileStorePageRange = profileStorePagination
    ? getPaginationRange(profileStorePagination, allProfileStores.length)
    : { start: 0, end: 0 };
  const profileStorePaginationLabel = profileStorePagination
    ? text({
        en: `Page ${profileStorePagination.page} of ${profileStorePagination.totalPages}`,
        zh_HANS: `第 ${profileStorePagination.page} / ${profileStorePagination.totalPages} 页`,
        zh_HANT: `第 ${profileStorePagination.page} / ${profileStorePagination.totalPages} 頁`,
        ja: `${profileStorePagination.totalPages} ページ中 ${profileStorePagination.page} ページ`,
        ko: `${profileStorePagination.totalPages}페이지 중 ${profileStorePagination.page}페이지`,
        fr: `Page ${profileStorePagination.page} sur ${profileStorePagination.totalPages}`,
      })
    : '';
  const profileStorePaginationRangeLabel = profileStorePagination
    ? profileStorePagination.totalCount === 0
      ? text({
          en: 'No profile stores are currently visible.',
          zh_HANS: '当前没有可见的档案库记录。',
          zh_HANT: '目前沒有可見的檔案庫記錄。',
          ja: '現在表示できるプロフィールストアはありません。',
          ko: '현재 표시할 수 있는 프로필 스토어가 없습니다.',
          fr: 'Aucun profil de stockage n’est actuellement visible.',
        })
      : text({
          en: `Showing ${profileStorePageRange.start}-${profileStorePageRange.end} of ${profileStorePagination.totalCount}`,
          zh_HANS: `显示第 ${profileStorePageRange.start}-${profileStorePageRange.end} 条，共 ${profileStorePagination.totalCount} 条`,
          zh_HANT: `顯示第 ${profileStorePageRange.start}-${profileStorePageRange.end} 筆，共 ${profileStorePagination.totalCount} 筆`,
          ja: `${profileStorePagination.totalCount} 件中 ${profileStorePageRange.start}-${profileStorePageRange.end} 件を表示`,
          ko: `${profileStorePagination.totalCount}개 중 ${profileStorePageRange.start}-${profileStorePageRange.end}개 표시`,
          fr: `Affichage de ${profileStorePageRange.start} à ${profileStorePageRange.end} sur ${profileStorePagination.totalCount}`,
        })
    : '';
  const profileStorePageSizeLabel = text({
    en: 'Rows per page',
    zh_HANS: '每页条数',
    zh_HANT: '每頁筆數',
    ja: '1 ページの件数',
    ko: '페이지당 행 수',
    fr: 'Lignes par page',
  });
  const profileStorePreviousLabel = text({
    en: 'Previous',
    zh_HANS: '上一页',
    zh_HANT: '上一頁',
    ja: '前へ',
    ko: '이전',
    fr: 'Précédent',
  });
  const profileStoreNextLabel = text({
    en: 'Next',
    zh_HANS: '下一页',
    zh_HANT: '下一頁',
    ja: '次へ',
    ko: '다음',
    fr: 'Suivant',
  });

  async function handleSave() {
    if (!hasDirtyDraft || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const nextSettings = await updateTenantSettings(request, {
        settings: buildTenantSettingsUpdatePayload(draft),
        version: currentSettings.version,
      });
      const nextDraft = buildTenantSettingsDraft(nextSettings.settings);
      setSettings(nextSettings);
      setInitialDraft(nextDraft);
      setDraft(nextDraft);
      setSaveSuccess(
        text({
          en: 'Tenant defaults saved.',
          zh_HANS: '租户默认值已保存。',
          zh_HANT: '租戶預設值已儲存。',
          ja: 'テナント既定値を保存しました。',
          ko: '테넌트 기본값을 저장했습니다.',
          fr: 'Les valeurs par défaut du tenant ont été enregistrées.',
        }),
      );
    } catch (reason) {
      setSaveError(
        getErrorMessage(
          reason,
          text({
            en: 'Failed to save tenant settings.',
            zh_HANS: '保存租户设置失败。',
            zh_HANT: '儲存租戶設定失敗。',
            ja: 'テナント設定の保存に失敗しました。',
            ko: '테넌트 설정을 저장하지 못했습니다.',
            fr: 'Impossible d’enregistrer les paramètres du tenant.',
          }),
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    setDraft(initialDraft);
    setSaveError(null);
    setSaveSuccess(null);
  }

  function resetProfileStoreEditor() {
    setProfileStoreEditorState({ mode: 'create' });
    setProfileStoreDraft(EMPTY_PROFILE_STORE_DRAFT);
    setProfileStoreTranslationsOpen(false);
    setProfileStoreNotice(null);
  }

  async function handleStartEditProfileStore(profileStoreId: string) {
    setProfileStoreEditorLoading(true);
    setProfileStoreNotice(null);

    try {
      const detail = await readProfileStoreDetail(request, profileStoreId);
      setProfileStoreEditorState({
        mode: 'edit',
        id: detail.id,
        version: detail.version,
      });
      setProfileStoreDraft(buildProfileStoreDraft(detail));
      setProfileStoreTranslationsOpen(false);
    } catch (reason) {
      setProfileStoreNotice({
        tone: 'error',
        message: getErrorMessage(
          reason,
          text(
            'Failed to load profile store details.',
            '加载档案库详情失败。',
            'プロフィールストア詳細の読み込みに失敗しました。',
          ),
        ),
      });
    } finally {
      setProfileStoreEditorLoading(false);
    }
  }

  async function handleSaveProfileStore() {
    const validationError = validateProfileStoreDraft(profileStoreEditorState.mode, profileStoreDraft, text);
    if (validationError) {
      setProfileStoreNotice({
        tone: 'error',
        message: validationError,
      });
      return;
    }

    setProfileStoreSavePending(true);
    setProfileStoreNotice(null);

    try {
      if (profileStoreEditorState.mode === 'create') {
        await createProfileStore(request, buildCreateProfileStoreInput(profileStoreDraft));
        await refreshProfileStoresPanel();
        resetProfileStoreEditor();
        setProfileStoreNotice({
          tone: 'success',
          message: text({
            en: 'Profile store created.',
            zh_HANS: '档案库已创建。',
            zh_HANT: '檔案庫已建立。',
            ja: 'プロフィールストアを作成しました。',
            ko: '프로필 스토어를 생성했습니다.',
            fr: 'Le profil de stockage a été créé.',
          }),
        });
      } else {
        const translations = buildManagedTranslations(profileStoreDraft.nameEn, profileStoreDraft.nameTranslations);
        const descriptionTranslations = buildManagedTranslations(
          profileStoreDraft.descriptionEn,
          profileStoreDraft.descriptionTranslations,
        );
        const updated = await updateProfileStore(request, profileStoreEditorState.id, {
          nameEn: profileStoreDraft.nameEn.trim(),
          nameZh: pickLegacyLocaleValue(translations, 'zh_HANS'),
          nameJa: pickLegacyLocaleValue(translations, 'ja'),
          translations,
          descriptionEn: normalizeOptionalString(profileStoreDraft.descriptionEn),
          descriptionZh: pickLegacyLocaleValue(descriptionTranslations, 'zh_HANS'),
          descriptionJa: pickLegacyLocaleValue(descriptionTranslations, 'ja'),
          descriptionTranslations,
          isDefault: profileStoreDraft.isDefault,
          isActive: profileStoreDraft.isActive,
          version: profileStoreEditorState.version,
        });
        await refreshProfileStoresPanel();
        setProfileStoreEditorState({
          mode: 'edit',
          id: profileStoreEditorState.id,
          version: updated.version,
        });
        setProfileStoreNotice({
          tone: 'success',
          message: text({
            en: 'Profile store updated.',
            zh_HANS: '档案库已更新。',
            zh_HANT: '檔案庫已更新。',
            ja: 'プロフィールストアを更新しました。',
            ko: '프로필 스토어를 업데이트했습니다.',
            fr: 'Le profil de stockage a été mis à jour.',
          }),
        });
      }
    } catch (reason) {
      setProfileStoreNotice({
        tone: 'error',
        message: getErrorMessage(
          reason,
          profileStoreEditorState.mode === 'create'
            ? text({
                en: 'Failed to create profile store.',
                zh_HANS: '创建档案库失败。',
                zh_HANT: '建立檔案庫失敗。',
                ja: 'プロフィールストアの作成に失敗しました。',
                ko: '프로필 스토어를 생성하지 못했습니다.',
                fr: 'Impossible de créer le profil de stockage.',
              })
            : text({
                en: 'Failed to update profile store.',
                zh_HANS: '更新档案库失败。',
                zh_HANT: '更新檔案庫失敗。',
                ja: 'プロフィールストアの更新に失敗しました。',
                ko: '프로필 스토어를 업데이트하지 못했습니다.',
                fr: 'Impossible de mettre à jour le profil de stockage.',
              }),
        ),
      });
    } finally {
      setProfileStoreSavePending(false);
    }
  }

  function handleOpenProfileStoreDialog(profileStore: ProfileStoreListItem) {
    const localizedName = resolveProfileStoreName(profileStore, selectedLocale);

    setProfileStoreDialogState({
      id: profileStore.id,
      version: profileStore.version,
      nextActive: !profileStore.isActive,
      title: profileStore.isActive
        ? text({
            en: `Deactivate ${localizedName}?`,
            zh_HANS: `停用 ${localizedName}？`,
            zh_HANT: `停用 ${localizedName}？`,
            ja: `${localizedName} を無効化しますか？`,
            ko: `${localizedName} 스토어를 비활성화할까요?`,
            fr: `Désactiver ${localizedName} ?`,
          })
        : text({
            en: `Reactivate ${localizedName}?`,
            zh_HANS: `重新启用 ${localizedName}？`,
            zh_HANT: `重新啟用 ${localizedName}？`,
            ja: `${localizedName} を再有効化しますか？`,
            ko: `${localizedName} 스토어를 다시 활성화할까요?`,
            fr: `Réactiver ${localizedName} ?`,
          }),
      description: profileStore.isActive
        ? text({
            en: 'This store will no longer appear in active store selections.',
            zh_HANS: '该档案库将不再出现在可选的启用档案库列表中。',
            zh_HANT: '此檔案庫將不再出現在可選的啟用檔案庫清單中。',
            ja: 'このストアは有効な選択一覧から外れます。',
            ko: '이 스토어는 더 이상 활성 스토어 선택 목록에 표시되지 않습니다.',
            fr: 'Ce profil n’apparaîtra plus dans les sélections de profils actifs.',
          })
        : text({
            en: 'This store will become available again in store selections.',
            zh_HANS: '该档案库将重新出现在可选列表中。',
            zh_HANT: '此檔案庫將重新出現在可選清單中。',
            ja: 'このストアを再び選択できるようにします。',
            ko: '이 스토어를 다시 선택 목록에서 사용할 수 있습니다.',
            fr: 'Ce profil redeviendra disponible dans les listes de sélection.',
          }),
      confirmText: profileStore.isActive
        ? text({
            en: 'Deactivate store',
            zh_HANS: '停用档案库',
            zh_HANT: '停用檔案庫',
            ja: 'プロフィールストアを無効化',
            ko: '스토어 비활성화',
            fr: 'Désactiver le profil',
          })
        : text({
            en: 'Reactivate store',
            zh_HANS: '重新启用档案库',
            zh_HANT: '重新啟用檔案庫',
            ja: 'プロフィールストアを再有効化',
            ko: '스토어 다시 활성화',
            fr: 'Réactiver le profil',
          }),
      successMessage: profileStore.isActive
        ? text({
            en: `${localizedName} was deactivated.`,
            zh_HANS: `${localizedName} 已停用。`,
            zh_HANT: `${localizedName} 已停用。`,
            ja: `${localizedName} を無効化しました。`,
            ko: `${localizedName} 스토어를 비활성화했습니다.`,
            fr: `${localizedName} a été désactivé.`,
          })
        : text({
            en: `${localizedName} was reactivated.`,
            zh_HANS: `${localizedName} 已重新启用。`,
            zh_HANT: `${localizedName} 已重新啟用。`,
            ja: `${localizedName} を再有効化しました。`,
            ko: `${localizedName} 스토어를 다시 활성화했습니다.`,
            fr: `${localizedName} a été réactivé.`,
          }),
      errorFallback: profileStore.isActive
        ? text({
            en: 'Failed to deactivate the profile store.',
            zh_HANS: '停用档案库失败。',
            zh_HANT: '停用檔案庫失敗。',
            ja: 'プロフィールストアの無効化に失敗しました。',
            ko: '프로필 스토어를 비활성화하지 못했습니다.',
            fr: 'Impossible de désactiver le profil de stockage.',
          })
        : text({
            en: 'Failed to reactivate the profile store.',
            zh_HANS: '重新启用档案库失败。',
            zh_HANT: '重新啟用檔案庫失敗。',
            ja: 'プロフィールストアの再有効化に失敗しました。',
            ko: '프로필 스토어를 다시 활성화하지 못했습니다.',
            fr: 'Impossible de réactiver le profil de stockage.',
          }),
      intent: profileStore.isActive ? 'danger' : 'primary',
    });
  }

  async function handleConfirmProfileStoreDialog() {
    if (!profileStoreDialogState) {
      return;
    }

    const currentDialog = profileStoreDialogState;
    setProfileStoreDialogPending(true);
    setProfileStoreNotice(null);

    try {
      const updated = await updateProfileStore(request, currentDialog.id, {
        isActive: currentDialog.nextActive,
        version: currentDialog.version,
      });

      await refreshProfileStoresPanel();

      if (profileStoreEditorState.mode === 'edit' && profileStoreEditorState.id === currentDialog.id) {
        setProfileStoreEditorState({
          mode: 'edit',
          id: currentDialog.id,
          version: updated.version,
        });
        setProfileStoreDraft((current) => ({
          ...current,
          isActive: currentDialog.nextActive,
        }));
      }

      setProfileStoreDialogState(null);
      setProfileStoreNotice({
        tone: 'success',
        message: currentDialog.successMessage,
      });
    } catch (reason) {
      setProfileStoreNotice({
        tone: 'error',
        message: getErrorMessage(reason, currentDialog.errorFallback),
      });
    } finally {
      setProfileStoreDialogPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <SettingsLayout
        title={text({
          en: 'Tenant Settings',
          zh_HANS: '租户设置',
          zh_HANT: '租戶設定',
          ja: 'テナント設定',
          ko: '테넌트 설정',
          fr: 'Paramètres du tenant',
        })}
        description={text({
          en: 'Manage tenant defaults, profile stores, and dictionary visibility.',
          zh_HANS: '集中管理租户默认值、档案库与词典可见性。',
          zh_HANT: '集中管理租戶預設值、檔案庫與詞典可見性。',
          ja: 'テナント既定値、プロフィールストア、辞書表示をまとめて管理します。',
          ko: '테넌트 기본값, 프로필 스토어, 사전 표시 범위를 관리합니다.',
          fr: 'Gérez les valeurs par défaut du tenant, les profils de stockage et la visibilité du dictionnaire.',
        })}
        sections={[
          { id: 'details', label: common.details },
          { id: 'config-entities', label: common.configEntities },
          { id: 'settings', label: common.settings },
          { id: 'dictionary', label: common.dictionary },
        ]}
        activeSectionId={activeSectionId}
        ariaLabel={common.settingsSectionsAriaLabel}
        onSectionChange={(sectionId) => {
          setActiveSectionId(sectionId as 'details' | 'config-entities' | 'settings' | 'dictionary');
        }}
      >
        <div className={sectionTransitionClassName}>
        {displayedSectionId === 'details' ? (
          <div className="space-y-6">
            <GlassSurface className="p-8">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  <Building2 className="h-3.5 w-3.5" />
                  {text({
                    en: 'Tenant settings',
                    zh_HANS: '租户设置',
                    zh_HANT: '租戶設定',
                    ja: 'テナント設定',
                    ko: '테넌트 설정',
                    fr: 'Paramètres du tenant',
                  })}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <FieldRow label={text('Tenant', '租户', 'テナント')} value={session?.tenantName || common.currentTenant} />
                  <FieldRow
                    label={text('Default language', '默认语言', '既定言語')}
                    value={draft.defaultLanguage || common.inheritedUnset}
                  />
                  <FieldRow label={text('Profile Stores', '档案库', 'プロフィールストア')} value={String(profileStoreCount)} />
                  <FieldRow label={text('Dictionary Types', '词典类型', '辞書タイプ')} value={String(dictionaryCount)} />
                </div>
              </div>
            </GlassSurface>

            <GlassSurface className="p-6">
              <FormSection
                title={common.details}
                description={text(
                  'Review tenant identity and quick links to related management pages.',
                  '查看租户身份信息及相关管理入口。',
                  'テナント識別情報と関連管理ページへの入口を確認します。',
                )}
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <FieldRow
                    label={text('Tenant Tier', '租户层级', 'テナント階層')}
                    value={session?.tenantTier || common.unknown}
                    hint={text(
                      'Available management features vary by tenant tier.',
                      '不同租户层级可用的管理能力不同。',
                      'テナント階層によって利用できる管理機能が異なります。',
                    )}
                  />
                  <FieldRow
                    label={text('Tenant Code', '租户代码', 'テナントコード')}
                    value={session?.tenantCode || common.unassigned}
                    hint={text(
                      'Tenant code is the stable identifier for this tenant.',
                      '租户代码是当前租户的稳定标识。',
                      'テナントコードはこのテナントの安定した識別子です。',
                    )}
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <SectionEntryLink
                    title={text('Business Workspace', '业务工作区', '業務ワークスペース')}
                    description={text(
                      'Open the tenant-level business workspace for cross-talent operations and future reporting modules.',
                      '打开租户级业务工作区，用于跨艺人运营与后续报表模块。',
                      '複数タレント横断の運用や今後のレポート機能向けに、テナント業務ワークスペースを開きます。',
                    )}
                    href={buildTenantBusinessPath(tenantId)}
                    cta={text('Open business workspace', '打开业务工作区', '業務ワークスペースを開く')}
                  />
                  <SectionEntryLink
                    title={text('Integration', '集成管理', '統合管理')}
                    description={text(
                      'Open adapters, webhooks, and tenant email settings.',
                      '打开适配器、Webhook 和租户邮件设置。',
                      'アダプター、Webhook、テナントのメール設定を開きます。',
                    )}
                    href={`/tenant/${tenantId}/integration-management`}
                    cta={text('Open integration', '打开集成管理', '統合管理を開く')}
                  />
                  <SectionEntryLink
                    title={text('Security', '安全管理', 'セキュリティ管理')}
                    description={text(
                      'Open security, compliance, and blocklist settings.',
                      '打开安全、合规和封禁设置。',
                      'セキュリティ、コンプライアンス、ブロックリスト設定を開きます。',
                    )}
                    href={`/tenant/${tenantId}/security`}
                    cta={text('Open security', '打开安全管理', 'セキュリティ管理を開く')}
                  />
                </div>
              </FormSection>
            </GlassSurface>
          </div>
        ) : null}

        {displayedSectionId === 'config-entities' ? (
          <div className="space-y-6">
            <GlassSurface className="p-6">
              <FormSection
                title={common.configEntities}
                description={text(
                  'Manage profile stores, status, and localized names.',
                  '管理档案库、状态和本地化名称。',
                  'プロフィールストア、状態、ローカライズ名を管理します。',
                )}
                actions={(
                  <button
                    type="button"
                    onClick={resetProfileStoreEditor}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4" />
                    {text('New profile store', '新建档案库', 'プロフィールストアを作成')}
                  </button>
                )}
              >
                {profileStoreNotice ? <NoticeBanner tone={profileStoreNotice.tone} message={profileStoreNotice.message} /> : null}
                <div className="grid gap-4 lg:grid-cols-3">
                  <FieldRow label={text('Active Stores', '启用档案库', '有効なストア')} value={String(allProfileStores.filter((item) => item.isActive).length)} />
                  <FieldRow label={text('Inactive Stores', '停用档案库', '無効なストア')} value={String(allProfileStores.filter((item) => !item.isActive).length)} />
                  <FieldRow label={text('Default Stores', '默认档案库', '既定ストア')} value={String(allProfileStores.filter((item) => item.isDefault).length)} />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="relative block min-w-[18rem] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={profileStoreSearch}
                      onChange={(event) => {
                        setProfileStoreSearch(event.target.value);
                        setProfileStorePage(1);
                      }}
                      placeholder={text('Search code or localized name', '按代码或本地化名称搜索', 'コードまたはローカライズ名で検索')}
                      className="w-full rounded-2xl border border-slate-200 bg-white/85 py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {(['all', 'active', 'inactive'] as const).map((candidate) => {
                      const isActive = profileStoreActivityFilter === candidate;

                      return (
                        <button
                          key={candidate}
                          type="button"
                          onClick={() => {
                            setProfileStoreActivityFilter(candidate);
                            setProfileStorePage(1);
                          }}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition ${
                            isActive
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white/85 text-slate-700 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          {candidate === 'all'
                            ? text('All', '全部', 'すべて')
                            : candidate === 'active'
                              ? common.active
                              : common.inactive}
                        </button>
                      );
                    })}
                  </div>
                  <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm text-slate-700">
                    {profileStorePageSizeLabel}
                    <select
                      value={profileStorePageSize}
                      onChange={(event) => {
                        setProfileStorePageSize(Number(event.target.value) as PageSizeOption);
                        setProfileStorePage(1);
                      }}
                      className="bg-transparent text-sm outline-none"
                    >
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {profileStoresPanel.error ? (
                  <SectionPlaceholder title={text('Profile stores unavailable', '档案库不可用', 'プロフィールストアを読み込めません')} description={profileStoresPanel.error} />
                ) : (
                  <TableShell
                    columns={[
                      text('Store', '档案库', 'ストア'),
                      text('Status', '状态', '状態'),
                      text('Usage', '使用情况', '使用状況'),
                      text('Created', '创建时间', '作成日時'),
                      text('Actions', '操作', '操作'),
                    ]}
                    dataLength={filteredProfileStores.length}
                    isLoading={profileStoresPanel.loading}
                    isEmpty={!profileStoresPanel.loading && filteredProfileStores.length === 0}
                    emptyTitle={text('No profile stores match this filter', '没有匹配当前筛选条件的档案库', '現在の条件に一致するプロフィールストアはありません')}
                    emptyDescription={text(
                      'Try a different search or status filter.',
                      '请调整搜索条件或状态筛选。',
                      '検索条件または状態フィルターを変更してください。',
                    )}
                  >
                    {filteredProfileStores.map((profileStore) => (
                      <tr key={profileStore.id} className="align-top">
                        <td className="px-6 py-4 text-sm text-slate-700">
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-900">{resolveProfileStoreName(profileStore, selectedLocale)}</p>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{profileStore.code}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                profileStore.isActive
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {profileStore.isActive ? common.active : common.inactive}
                            </span>
                            {profileStore.isDefault ? (
                              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
                                {text('Default', '默认', '既定')}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          <div className="space-y-1">
                            <p>{text(`${profileStore.talentCount} talents`, `${profileStore.talentCount} 个艺人`, `${profileStore.talentCount} 人のタレント`)}</p>
                            <p className="text-xs text-slate-500">
                              {text(
                                `${profileStore.customerCount} customers`,
                                `${profileStore.customerCount} 个客户`,
                                `${profileStore.customerCount} 件の顧客`,
                              )}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{formatDateTime(profileStore.createdAt)}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                            onClick={() => void handleStartEditProfileStore(profileStore.id)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                              {text('Edit', '编辑', '編集')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenProfileStoreDialog(profileStore)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                profileStore.isActive
                                  ? 'border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50'
                                  : 'border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50'
                              }`}
                            >
                              {profileStore.isActive ? text('Deactivate', '停用', '無効化') : text('Reactivate', '重新启用', '再有効化')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </TableShell>
                )}
                {profileStorePagination ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-700">{profileStorePaginationLabel}</p>
                      <p className="text-xs text-slate-500">{profileStorePaginationRangeLabel}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setProfileStorePage((current) => Math.max(1, current - 1))}
                        disabled={!profileStorePagination.hasPrev || profileStoresPanel.loading}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {profileStorePreviousLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfileStorePage((current) => current + 1)}
                        disabled={!profileStorePagination.hasNext || profileStoresPanel.loading}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {profileStoreNextLabel}
                      </button>
                    </div>
                  </div>
                ) : null}
              </FormSection>
            </GlassSurface>

            <GlassSurface className="p-6">
              <FormSection
                title={profileStoreEditorState.mode === 'create'
                  ? text({
                      en: 'Create Profile Store',
                      zh_HANS: '新建档案库',
                      zh_HANT: '新增檔案庫',
                      ja: 'プロフィールストアを作成',
                      ko: '프로필 스토어 생성',
                      fr: 'Créer un profil de stockage',
                    })
                  : text({
                      en: 'Edit Profile Store',
                      zh_HANS: '编辑档案库',
                      zh_HANT: '編輯檔案庫',
                      ja: 'プロフィールストアを編集',
                      ko: '프로필 스토어 편집',
                      fr: 'Modifier le profil de stockage',
                    })}
                description={profileStoreEditorState.mode === 'create'
                  ? text(
                      'Create a tenant-owned profile store and complete its localized fields.',
                      '创建租户档案库并填写本地化字段。',
                      'テナント所有のプロフィールストアを作成し、ローカライズ項目を設定します。',
                    )
                  : text(
                      'Update localized names, descriptions, default status, and active status.',
                      '更新本地化名称、描述、默认状态和启用状态。',
                      'ローカライズ名、説明、既定状態、有効状態を更新します。',
                    )}
                actions={(
                  <>
                    {profileStoreEditorState.mode === 'edit' ? (
                      <button
                        type="button"
                        onClick={resetProfileStoreEditor}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        {text({
                          en: 'Switch to create',
                          zh_HANS: '切换到新建',
                          zh_HANT: '切換為新增',
                          ja: '新規作成に切り替え',
                          ko: '새로 만들기로 전환',
                          fr: 'Passer en création',
                        })}
                      </button>
                    ) : null}
                    <AsyncSubmitButton
                      type="button"
                      isPending={profileStoreSavePending}
                      pendingText={profileStoreEditorState.mode === 'create'
                        ? text({ en: 'Creating…', zh_HANS: '创建中…', zh_HANT: '建立中…', ja: '作成中…', ko: '생성 중…', fr: 'Création…' })
                        : text({ en: 'Saving…', zh_HANS: '保存中…', zh_HANT: '儲存中…', ja: '保存中…', ko: '저장 중…', fr: 'Enregistrement…' })}
                      onClick={() => void handleSaveProfileStore()}
                      disabled={profileStoreEditorLoading}
                    >
                      {profileStoreEditorState.mode === 'create'
                        ? text({
                            en: 'Create profile store',
                            zh_HANS: '创建档案库',
                            zh_HANT: '建立檔案庫',
                            ja: 'プロフィールストアを作成',
                            ko: '프로필 스토어 생성',
                            fr: 'Créer le profil de stockage',
                          })
                        : text({
                            en: 'Save profile store',
                            zh_HANS: '保存档案库',
                            zh_HANT: '儲存檔案庫',
                            ja: 'プロフィールストアを保存',
                            ko: '프로필 스토어 저장',
                            fr: 'Enregistrer le profil de stockage',
                          })}
                    </AsyncSubmitButton>
                  </>
                )}
              >
                {profileStoreEditorLoading ? (
                  <SectionPlaceholder
                    title={text('Loading profile store detail', '正在加载档案库详情', 'プロフィールストア詳細を読み込み中')}
                    description={text(
                      'The selected profile store is loading.',
                      '正在加载所选档案库。',
                      '選択したプロフィールストアを読み込み中です。',
                    )}
                  />
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-900">{text('Store code', '档案库代码', 'ストアコード')}</span>
                        <input
                          aria-label={text('Store code', '档案库代码', 'ストアコード')}
                          value={profileStoreDraft.code}
                          onChange={(event) =>
                            setProfileStoreDraft((current) => ({
                              ...current,
                              code: event.target.value.toUpperCase(),
                            }))
                          }
                          disabled={profileStoreEditorState.mode === 'edit'}
                          placeholder="DEFAULT_STORE"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                        {profileStoreEditorState.mode === 'edit' ? (
                          <p className="text-xs text-slate-500">{text('Code cannot be changed after creation.', '创建后代码不可更改。', '作成後にコードは変更できません。')}</p>
                        ) : null}
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-900">{text('Name (English)', '名称（英文）', '名称（英語）')}</span>
                        <input
                          aria-label={text('Name English', '英文名称', '英語名')}
                          value={profileStoreDraft.nameEn}
                          onChange={(event) =>
                            setProfileStoreDraft((current) => ({
                              ...current,
                              nameEn: event.target.value,
                            }))
                          }
                          placeholder={text('Default Profile Store', '默认档案库', 'デフォルトプロフィールストア')}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
                        />
                      </label>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {text('Translation management', '翻译管理', '翻訳管理')}
                          </p>
                          <p className="text-sm leading-6 text-slate-600">
                            {text(
                              'Keep English in the main fields. Add translated values only when you need extra locales.',
                              '主字段保留英文；只有在需要额外语种时再补充翻译值。',
                              '主フィールドは英語のままにし、追加言語が必要なときだけ翻訳値を補います。',
                            )}
                          </p>
                        </div>
                        <TranslationManagementTrigger
                          count={countManagedLocaleValues(profileStoreTranslationSections)}
                          onClick={() => setProfileStoreTranslationsOpen(true)}
                        />
                      </div>
                    </div>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-900">{text('Description (English)', '描述（英文）', '説明（英語）')}</span>
                      <textarea
                        aria-label={text('Description English', '英文描述', '英語説明')}
                        value={profileStoreDraft.descriptionEn}
                        onChange={(event) =>
                          setProfileStoreDraft((current) => ({
                            ...current,
                            descriptionEn: event.target.value,
                          }))
                        }
                        rows={4}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
                      />
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <input
                          aria-label={text('Default profile store', '默认档案库', '既定プロフィールストア')}
                          type="checkbox"
                          checked={profileStoreDraft.isDefault}
                          onChange={(event) =>
                            setProfileStoreDraft((current) => ({
                              ...current,
                              isDefault: event.target.checked,
                            }))
                          }
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                        />
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-950">{text('Default profile store', '默认档案库', '既定プロフィールストア')}</p>
                          <p className="text-sm leading-6 text-slate-600">
                            {text(
                              'Setting this store as default will replace the current default store.',
                              '设为默认后，会替换当前的默认档案库。',
                              '既定に設定すると、現在の既定ストアと入れ替わります。',
                            )}
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <input
                          aria-label={text('Profile store active', '档案库启用', 'プロフィールストアを有効化')}
                          type="checkbox"
                          checked={profileStoreDraft.isActive}
                          onChange={(event) =>
                            setProfileStoreDraft((current) => ({
                              ...current,
                              isActive: event.target.checked,
                            }))
                          }
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                        />
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-950">{text('Profile store active', '档案库启用', 'プロフィールストアを有効化')}</p>
                          <p className="text-sm leading-6 text-slate-600">
                            {text(
                              'Turn this off when the store should no longer be selectable.',
                              '当该档案库不应再被选择时，请关闭此项。',
                              'このストアを選択できないようにする場合はオフにしてください。',
                            )}
                          </p>
                        </div>
                      </label>
                    </div>
                  </>
                )}
              </FormSection>
            </GlassSurface>

            <GlassSurface className="p-6">
              <FormSection
                title={text({
                  en: 'Scoped configuration entities',
                  zh_HANS: '范围配置实体',
                  zh_HANT: '範圍配置實體',
                  ja: 'スコープ設定エンティティ',
                  ko: '범위 구성 엔티티',
                  fr: 'Entités de configuration par portée',
                })}
                description={text({
                  en: 'Maintain tenant-owned configuration families that flow downstream into subsidiary and talent scopes.',
                  zh_HANS: '维护租户层直接拥有的配置实体，并向下游分目录与艺人范围继承。',
                  zh_HANT: '維護租戶層直接擁有的配置實體，並向下游分目錄與藝人範圍繼承。',
                  ja: 'テナントが直接保有する設定エンティティを管理し、配下スコープとタレントスコープへ継承します。',
                  ko: '테넌트가 직접 보유하는 구성 엔티티를 관리하고 하위 조직 및 탤런트 범위로 상속합니다.',
                  fr: 'Gérez les entités de configuration détenues par le tenant et héritées par les portées filiales et talent.',
                })}
              >
                <ScopedConfigEntityWorkspace
                  request={request}
                  requestEnvelope={requestEnvelope}
                  scopeType="tenant"
                  locale={selectedLocale}
                  copy={scopedConfigCopy}
                  catalog={localizedConfigEntityCatalog}
                />
              </FormSection>
            </GlassSurface>
          </div>
        ) : null}

        {displayedSectionId === 'settings' ? (
          <GlassSurface className="p-6">
              <FormSection
                title={common.settings}
                description={text(
                  'Adjust tenant defaults for language and timezone.',
                  '调整租户的语言和时区默认值。',
                  'テナントの言語とタイムゾーン既定値を調整します。',
                )}
              actions={(
                <>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isSaving || !hasDirtyDraft}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {common.reset}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={isSaving || !hasDirtyDraft}
                    className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? common.saving : text('Save tenant defaults', '保存租户默认值', 'テナント既定値を保存')}
                  </button>
                </>
              )}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">{text('Default language', '默认语言', '既定言語')}</span>
                  <select
                    aria-label={text('Default language', '默认语言', '既定言語')}
                    value={draft.defaultLanguage}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        defaultLanguage: event.target.value as SupportedUiLocale,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
                  >
                    {LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">
                    {formatSourceHint(settings.inheritedFrom.defaultLanguage, overrideSet.has('defaultLanguage'))}
                  </p>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">{text('Default timezone', '默认时区', '既定タイムゾーン')}</span>
                  <select
                    aria-label={text('Default timezone', '默认时区', '既定タイムゾーン')}
                    value={draft.timezone}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        timezone: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
                  >
                    {TIMEZONE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">
                    {formatSourceHint(settings.inheritedFrom.timezone, overrideSet.has('timezone'))}
                  </p>
                </label>
              </div>

              {saveError ? <p className="text-sm font-medium text-red-600">{saveError}</p> : null}
              {saveSuccess ? <p className="text-sm font-medium text-emerald-700">{saveSuccess}</p> : null}
            </FormSection>
          </GlassSurface>
        ) : null}

        {displayedSectionId === 'dictionary' ? (
          <GlassSurface className="p-6">
              <FormSection
              title={common.dictionary}
              description={text(
                'Review dictionary items available in this tenant.',
                '查看当前租户可用的词典内容。',
                'このテナントで利用できる辞書項目を確認します。',
              )}
            >
              {dictionaryPanel.error ? (
                <SectionPlaceholder title={text('Dictionary unavailable', '词典不可用', '辞書を読み込めません')} description={dictionaryPanel.error} />
              ) : dictionaryPanel.data ? (
                <>
                  <div className="grid gap-4 xl:grid-cols-3">
                    <FieldRow label={text('Visible Dictionary Types', '可见词典类型', '表示中の辞書タイプ')} value={String(dictionaryCount)} />
                    <FieldRow label={text('Profile Stores', '档案库', 'プロフィールストア')} value={String(profileStoreCount)} />
                    <FieldRow label={text('Tenant Overrides', '租户覆盖项', 'テナント上書き数')} value={String(settings.overrides.length)} />
                  </div>
                <DictionaryExplorerPanel
                  request={request}
                  requestEnvelope={requestEnvelope}
                  types={dictionaryPanel.data}
                  locale={selectedLocale}
                  copy={dictionaryExplorerCopy}
                  allowIncludeInactiveToggle
                    intro={(
                      <>
                        <p>{text('Review the dictionary items available in this tenant.', '查看当前租户可用的词典项。', 'このテナントで利用できる辞書項目を確認します。')}</p>
                        <p className="mt-2">
                          {text(
                            'Open System Dictionary if you need to change the vocabulary itself.',
                            '如需调整词典内容，请前往系统词典。',
                            '辞書項目自体を変更する場合はシステム辞書を開いてください。',
                          )}
                        </p>
                      </>
                    )}
                    emptyDescription={text(
                      'No dictionary types are currently available for this tenant.',
                      '当前租户下没有可用的词典类型。',
                      'このテナントで利用できる辞書タイプはありません。',
                    )}
                  />
                </>
              ) : (
                <SectionPlaceholder
                  title={text('No dictionary types returned', '未返回词典类型', '辞書タイプが返されませんでした')}
                  description={text(
                    'No dictionary types are currently available for this tenant.',
                    '当前租户下没有可用的词典类型。',
                    'このテナントで利用できる辞書タイプはありません。',
                  )}
                />
              )}
            </FormSection>
          </GlassSurface>
        ) : null}
        </div>
      </SettingsLayout>

      <TranslationManagementDrawer
        open={profileStoreTranslationsOpen}
        onOpenChange={setProfileStoreTranslationsOpen}
        title={text('Profile store translations', '档案库翻译', 'プロフィールストア翻訳')}
        description={text(
          'Add optional localized labels and descriptions for this profile store.',
          '为该档案库添加可选的本地化名称与描述。',
          'このプロフィールストアに任意のローカライズ名と説明を追加します。',
        )}
        closeButtonAriaLabel={text(
          'Close profile store translations drawer',
          '关闭档案库翻译抽屉',
          'プロフィールストア翻訳ドロワーを閉じる',
        )}
        request={request}
        requestEnvelope={requestEnvelope}
        sections={profileStoreTranslationSections}
        onChange={(sectionId, localeCode, value) => {
          setProfileStoreDraft((current) => {
            if (sectionId === 'description') {
              return {
                ...current,
                descriptionTranslations: {
                  ...current.descriptionTranslations,
                  [localeCode]: value,
                },
              };
            }

            return {
              ...current,
              nameTranslations: {
                ...current.nameTranslations,
                [localeCode]: value,
              },
            };
          });
        }}
      />

      <ConfirmActionDialog
        open={profileStoreDialogState !== null}
        title={profileStoreDialogState?.title || text('Confirm store action', '确认档案库操作', 'ストア操作を確認')}
        description={profileStoreDialogState?.description || ''}
        confirmText={profileStoreDialogState?.confirmText}
        intent={profileStoreDialogState?.intent}
        isPending={profileStoreDialogPending}
        onCancel={() => {
          if (!profileStoreDialogPending) {
            setProfileStoreDialogState(null);
          }
        }}
        onConfirm={() => {
          void handleConfirmProfileStoreDialog();
        }}
      />
    </div>
  );
}
