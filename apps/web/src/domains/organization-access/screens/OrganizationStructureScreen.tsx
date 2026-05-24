'use client';

import {
  buildSharedHomepagePath,
  type SupportedUiLocale,
} from '@tcrn/shared';
import {
  ChevronRight,
  FolderTree,
  Languages,
  PenSquare,
  Plus,
  RefreshCcw,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, startTransition, useDeferredValue, useEffect, useState } from 'react';

import {
  listConfigEntities,
  listProfileStores,
  type ConfigEntityRecord,
  type ProfileStoreListResponse,
  readTalentDetail,
} from '@/domains/config-dictionary-settings/api/settings.api';
import {
  createOrganizationSubsidiary,
  createOrganizationTalent,
  disableOrganizationTalent,
  type OrganizationNode,
  type OrganizationTalent,
  type OrganizationTreeResponse,
  readOrganizationTree,
  reEnableOrganizationTalent,
} from '@/domains/organization-access/api/organization.api';
import { ApiRequestError } from '@/platform/http/api';
import {
  buildSubsidiaryBusinessPath,
  buildPublicPresenceStudioEditorPath,
  buildTalentSettingsPath,
  buildTalentWorkspaceSectionPath,
  buildTalentWorkspacePath,
  buildTenantBusinessPath,
} from '@/platform/routing/workspace-paths';
import {
  buildLocalizedTextPayload,
  extractSingleFieldTranslationPayload,
  loadTranslationLanguageOptions,
  pickLocaleText,
  type TranslationLanguageOption,
} from '@/platform/runtime/locale/locale-text';
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
  AsyncSubmitButton,
  ConfirmActionDialog,
  FormSection,
  GlassSurface,
  PaginationFooter,
  StateView,
  TranslationDrawer,
} from '@/platform/ui';

import {
  formatOrganizationDirectSubsidiaryCount,
  formatOrganizationSubsidiaryCount,
  formatOrganizationTalentCount,
  getOrganizationLifecycleLabel,
  getOrganizationTalentScopeLabel,
  pickLocalizedProfileStoreName,
  useOrganizationStructureCopy,
} from './organization-structure.copy';

interface FlattenedNode {
  node: OrganizationNode;
  depth: number;
  labels: string[];
}

interface AsyncPanelState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

interface NoticeState {
  tone: 'success' | 'error';
  message: string;
}

interface CreateTalentDraft {
  code: string;
  displayName: string;
  nameBase: string;
  nameLocaleValues: Record<string, string>;
  profileStoreId: string;
  artistStageId: string;
  timezone: string;
}

interface CreateSubsidiaryDraft {
  code: string;
  nameBase: string;
  nameLocaleValues: Record<string, string>;
  descriptionBase: string;
}

interface CreatedTalentResult {
  talentId: string;
  code: string;
  label: string;
  scopeLabel: string;
  scopeType: 'tenant' | 'subsidiary';
}

interface LifecycleDialogState {
  action: 'disable' | 're-enable';
  talentId: string;
  version: number;
  title: string;
  description: string;
  confirmText: string;
  pendingText: string;
  successMessage: string;
  errorFallback: string;
  intent: 'danger' | 'primary';
}

interface TranslationOptionsState {
  data: TranslationLanguageOption[];
  error: string | null;
  loading: boolean;
}

type TranslationDrawerTarget = 'talent-name' | 'subsidiary-name' | null;

type OrganizationValidationKey =
  | 'code'
  | 'displayName'
  | 'legalName'
  | 'profileStore'
  | 'artistStage'
  | 'subsidiaryCode'
  | 'subsidiaryName';

const EMPTY_CREATE_TALENT_DRAFT: CreateTalentDraft = {
  code: '',
  displayName: '',
  nameBase: '',
  nameLocaleValues: {},
  profileStoreId: '',
  artistStageId: '',
  timezone: 'Asia/Shanghai',
};

const EMPTY_CREATE_SUBSIDIARY_DRAFT: CreateSubsidiaryDraft = {
  code: '',
  nameBase: '',
  nameLocaleValues: {},
  descriptionBase: '',
};

const TALENT_CODE_PATTERN = /^[A-Z0-9_]{3,32}$/;
const SUBSIDIARY_CODE_PATTERN = /^[A-Z0-9_]{3,32}$/;
const HEADER_ACTION_BUTTON_BASE_CLASS =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition';
const HEADER_ACTION_SECONDARY_BUTTON_CLASS = `${HEADER_ACTION_BUTTON_BASE_CLASS} border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50`;
const HEADER_ACTION_PRIMARY_BUTTON_CLASS = `${HEADER_ACTION_BUTTON_BASE_CLASS} border border-slate-950 bg-slate-950 text-white hover:bg-slate-800`;

function flattenNodes(
  nodes: OrganizationNode[],
  depth = 0,
  labels: string[] = [],
): FlattenedNode[] {
  return nodes.flatMap((node) => {
    const nextLabels = [...labels, node.displayName];

    return [
      {
        node,
        depth,
        labels: nextLabels,
      },
      ...flattenNodes(node.children, depth + 1, nextLabels),
    ];
  });
}

function findNodeById(nodes: OrganizationNode[], id: string): OrganizationNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    const child = findNodeById(node.children, id);
    if (child) {
      return child;
    }
  }

  return null;
}

function collectTalents(nodes: OrganizationNode[]): OrganizationTalent[] {
  return nodes.flatMap((node) => [...node.talents, ...collectTalents(node.children)]);
}


function buildOrganizationStructureQueryState({
  scopeId,
  search,
  showInactive,
  page,
  pageSize,
}: {
  scopeId: string | null;
  search: string;
  showInactive: boolean;
  page: number;
  pageSize: PageSizeOption;
}) {
  const params = new URLSearchParams();
  const normalizedSearch = search.trim();

  if (scopeId) {
    params.set('scopeId', scopeId);
  }

  if (normalizedSearch) {
    params.set('search', normalizedSearch);
  }

  if (showInactive) {
    params.set('inactive', 'true');
  }

  if (page > 1) {
    params.set('page', String(page));
  }

  if (pageSize !== PAGE_SIZE_OPTIONS[0]) {
    params.set('pageSize', String(pageSize));
  }

  return params.toString();
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function pickFirstNonEmptyString(values: Array<string | null | undefined>) {
  for (const value of values) {
    const trimmed = value?.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function getInventoryPaginationCopy(
  locale: SupportedUiLocale ,
  page: number,
  totalPages: number,
  start: number,
  end: number,
  totalCount: number,
) {
  const localeCode = locale;

  if ((localeCode === 'zh_HANS' || localeCode === 'zh_HANT')) {
    return {
      page: `第 ${page} / ${totalPages} 页`,
      range:
        totalCount === 0
          ? '当前范围没有艺人。'
          : `显示第 ${start}-${end} 条，共 ${totalCount} 条`,
      pageSize: '每页条目',
      previous: '上一页',
      next: '下一页',
    };
  }

  if (localeCode === 'ja') {
    return {
      page: `${totalPages} ページ中 ${page} ページ`,
      range:
        totalCount === 0
          ? 'この範囲にタレントはありません。'
          : `${totalCount} 件中 ${start}-${end} 件を表示`,
      pageSize: '表示件数',
      previous: '前へ',
      next: '次へ',
    };
  }

  return {
    page: `Page ${page} of ${totalPages}`,
    range:
      totalCount === 0
        ? 'No talents in the current range.'
        : `Showing ${start}-${end} of ${totalCount}`,
    pageSize: 'Rows per page',
    previous: 'Previous',
    next: 'Next',
  };
}

function resolveDefaultProfileStoreId(profileStores: ProfileStoreListResponse | null) {
  return profileStores?.items.find((item) => item.isDefault)?.id ?? profileStores?.items[0]?.id ?? '';
}

function resolveDefaultArtistStageId(artistStages: ConfigEntityRecord[] | null) {
  return artistStages?.[0]?.id ?? '';
}

function buildCreateDraft(
  profileStores: ProfileStoreListResponse | null,
  artistStages: ConfigEntityRecord[] | null = null,
): CreateTalentDraft {
  return {
    ...EMPTY_CREATE_TALENT_DRAFT,
    profileStoreId: resolveDefaultProfileStoreId(profileStores),
    artistStageId: resolveDefaultArtistStageId(artistStages),
  };
}

function validateCreateTalentDraft(draft: CreateTalentDraft): OrganizationValidationKey | null {
  const code = draft.code.trim().toUpperCase();
  const displayName = draft.displayName.trim();
  const nameBase = draft.nameBase.trim();

  if (!TALENT_CODE_PATTERN.test(code)) {
    return 'code';
  }

  if (displayName.length === 0) {
    return 'displayName';
  }

  if (nameBase.length === 0) {
    return 'legalName';
  }

  if (!draft.artistStageId) {
    return 'artistStage';
  }

  if (!draft.profileStoreId) {
    return 'profileStore';
  }

  return null;
}

function validateCreateSubsidiaryDraft(draft: CreateSubsidiaryDraft): OrganizationValidationKey | null {
  const code = draft.code.trim().toUpperCase();
  const nameBase = draft.nameBase.trim();

  if (!SUBSIDIARY_CODE_PATTERN.test(code)) {
    return 'subsidiaryCode';
  }

  if (nameBase.length === 0) {
    return 'subsidiaryName';
  }

  return null;
}

function ScopeBreadcrumb({
  labels,
}: Readonly<{
  labels: string[];
}>) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
      {labels.map((label, index) => (
        <div key={`${label}-${index}`} className="flex items-center gap-2">
          {index > 0 ? <ChevronRight className="h-3.5 w-3.5 text-slate-400" /> : null}
          <span>{label}</span>
        </div>
      ))}
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

  return (
    <div aria-live="polite" className={`rounded-2xl border px-4 py-3 text-sm font-medium ${toneClasses}`}>
      {message}
    </div>
  );
}

function ScopeTreeRow({
  label,
  hint,
  depth,
  isActive,
  onSelect,
  settingsHref,
  settingsLabel,
}: Readonly<{
  label: string;
  hint: string;
  depth: number;
  isActive: boolean;
  onSelect: () => void;
  settingsHref: string;
  settingsLabel: string;
}>) {
  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${
        isActive ? 'border-slate-950 bg-slate-950/95 text-white' : 'border-slate-200 bg-white/90 text-slate-900'
      }`}
      style={{ paddingLeft: `${depth * 1.25 + 0.75}rem` }}
    >
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-semibold">{label}</p>
        <p className={`truncate text-xs ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>{hint}</p>
      </button>
      <Link
        href={settingsHref}
        aria-label={settingsLabel}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
          isActive
            ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <PenSquare className="h-4 w-4" />
      </Link>
    </div>
  );
}

function TalentListRow({
  locale,
  editTalentSettingsLabel,
  openWorkspaceLabel,
  tenantId,
  talent,
  isHighlighted,
  isLifecyclePending,
  onLifecycleAction,
}: Readonly<{
  locale: SupportedUiLocale ;
  editTalentSettingsLabel: string;
  openWorkspaceLabel: string;
  tenantId: string;
  talent: OrganizationTalent;
  isHighlighted: boolean;
  isLifecyclePending: boolean;
  onLifecycleAction: (talent: OrganizationTalent) => void;
}>) {
  const { copy } = useOrganizationStructureCopy();
  const canManageLifecycleMaintenance = talent.lifecycleMaintenance.canManage;
  const lifecycleActionLabel =
    talent.lifecycleStatus === 'disabled' ? copy.actions.reEnableWorkspace : copy.actions.disableWorkspace;
  const lifecycleToneClasses =
    talent.lifecycleStatus === 'disabled'
      ? 'border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50'
      : 'border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50';
  const lifecycleLabel = getOrganizationLifecycleLabel(talent.lifecycleStatus, locale);
  const scopeLabel = getOrganizationTalentScopeLabel(talent, locale);
  const rowClasses = isHighlighted
    ? 'border-emerald-300 bg-emerald-50/80 shadow-[0_0_0_1px_rgba(16,185,129,0.18)]'
    : 'border-slate-200/80 bg-white/90 shadow-sm';

  return (
    <div className={`rounded-2xl border px-4 py-4 ${rowClasses}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-950">{talent.name}</p>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {talent.code}
            </span>
            <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-medium text-white">
              {lifecycleLabel}
            </span>
          </div>
          {talent.displayName && talent.displayName !== talent.name ? (
            <p className="text-xs text-slate-500">{talent.displayName}</p>
          ) : null}
          <p className="text-xs text-slate-600">{scopeLabel}</p>
          <p className="truncate text-xs text-slate-400">{talent.path}</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href={buildTalentWorkspacePath(tenantId, talent.id)}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {openWorkspaceLabel}
          </Link>
          <Link
            href={buildTalentSettingsPath(tenantId, talent.id)}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {editTalentSettingsLabel}
          </Link>
          {canManageLifecycleMaintenance ? (
            <button
              type="button"
              disabled={isLifecyclePending}
              onClick={() => onLifecycleAction(talent)}
              className={`inline-flex items-center rounded-full border bg-white px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${lifecycleToneClasses}`}
            >
              {lifecycleActionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function OrganizationStructureScreen({
  tenantId,
}: Readonly<{
  tenantId: string;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSelectedSubsidiaryId = searchParams.get('scopeId') || null;
  const urlSearch = searchParams.get('search') ?? '';
  const urlShowInactive = searchParams.get('inactive') === 'true';
  const urlInventoryPage = parsePageParam(searchParams.get('page'));
  const urlInventoryPageSize = parsePageSizeParam(searchParams.get('pageSize'));
  const { locale, copy } = useOrganizationStructureCopy();
  const { request, requestEnvelope, session } = useSession();
  const [data, setData] = useState<OrganizationTreeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [selectedSubsidiaryId, setSelectedSubsidiaryId] = useState<string | null>(urlSelectedSubsidiaryId);
  const [search, setSearch] = useState(urlSearch);
  const deferredSearch = useDeferredValue(search);
  const [showInactive, setShowInactive] = useState(urlShowInactive);
  const [profileStoresPanel, setProfileStoresPanel] = useState<AsyncPanelState<ProfileStoreListResponse>>({
    data: null,
    error: null,
    loading: true,
  });
  const [artistStagesPanel, setArtistStagesPanel] = useState<AsyncPanelState<ConfigEntityRecord[]>>({
    data: null,
    error: null,
    loading: false,
  });
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateTalentDraft>(() => buildCreateDraft(null, null));
  const [createPending, setCreatePending] = useState(false);
  const [isCreateSubsidiaryDrawerOpen, setIsCreateSubsidiaryDrawerOpen] = useState(false);
  const [createSubsidiaryDraft, setCreateSubsidiaryDraft] = useState<CreateSubsidiaryDraft>(
    EMPTY_CREATE_SUBSIDIARY_DRAFT,
  );
  const [createSubsidiaryPending, setCreateSubsidiaryPending] = useState(false);
  const [createdTalentResult, setCreatedTalentResult] = useState<CreatedTalentResult | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [lifecycleDialogState, setLifecycleDialogState] = useState<LifecycleDialogState | null>(null);
  const [lifecycleDialogPending, setLifecycleDialogPending] = useState(false);
  const [preparingTalentId, setPreparingTalentId] = useState<string | null>(null);
  const [inventoryPage, setInventoryPage] = useState(urlInventoryPage);
  const [inventoryPageSize, setInventoryPageSize] = useState<PageSizeOption>(urlInventoryPageSize);
  const [translationOptionsState, setTranslationOptionsState] = useState<TranslationOptionsState>({
    data: [],
    error: null,
    loading: false,
  });
  const [translationDrawerTarget, setTranslationDrawerTarget] = useState<TranslationDrawerTarget>(null);

  useEffect(() => {
    setSelectedSubsidiaryId((current) => (
      current === urlSelectedSubsidiaryId ? current : urlSelectedSubsidiaryId
    ));
    setSearch((current) => (current === urlSearch ? current : urlSearch));
    setShowInactive((current) => (current === urlShowInactive ? current : urlShowInactive));
    setInventoryPage((current) => (current === urlInventoryPage ? current : urlInventoryPage));
    setInventoryPageSize((current) => (
      current === urlInventoryPageSize ? current : urlInventoryPageSize
    ));
  }, [
    urlInventoryPage,
    urlInventoryPageSize,
    urlSearch,
    urlSelectedSubsidiaryId,
    urlShowInactive,
  ]);

  function applyQueryState(
    nextState: Partial<{
      selectedSubsidiaryId: string | null;
      search: string;
      showInactive: boolean;
      page: number;
      pageSize: PageSizeOption;
    }>,
  ) {
    const nextSelectedSubsidiaryId = nextState.selectedSubsidiaryId ?? selectedSubsidiaryId;
    const nextSearch = nextState.search ?? search;
    const nextShowInactive = nextState.showInactive ?? showInactive;
    const nextPage = nextState.page ?? inventoryPage;
    const nextPageSize = nextState.pageSize ?? inventoryPageSize;

    if (nextState.selectedSubsidiaryId !== undefined) {
      setSelectedSubsidiaryId(nextSelectedSubsidiaryId);
    }

    if (nextState.search !== undefined) {
      setSearch(nextSearch);
    }

    if (nextState.showInactive !== undefined) {
      setShowInactive(nextShowInactive);
    }

    if (nextState.page !== undefined) {
      setInventoryPage(nextPage);
    }

    if (nextState.pageSize !== undefined) {
      setInventoryPageSize(nextPageSize);
    }

    const nextQueryString = buildOrganizationStructureQueryState({
      scopeId: nextSelectedSubsidiaryId,
      search: nextSearch,
      showInactive: nextShowInactive,
      page: nextPage,
      pageSize: nextPageSize,
    });
    const currentQueryString = buildOrganizationStructureQueryState({
      scopeId: selectedSubsidiaryId,
      search,
      showInactive,
      page: inventoryPage,
      pageSize: inventoryPageSize,
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
    if (!translationDrawerTarget) {
      return;
    }

    let cancelled = false;

    async function loadTranslationOptions() {
      setTranslationOptionsState((current) => ({
        data: current.data,
        error: null,
        loading: true,
      }));

      const result = await loadTranslationLanguageOptions(
        request,
        requestEnvelope,
        locale,
        copy.translationManagement.languageLoadError,
      );

      if (cancelled) {
        return;
      }

      setTranslationOptionsState({
        data: result.options,
        error: result.error,
        loading: false,
      });
    }

    void loadTranslationOptions();

    return () => {
      cancelled = true;
    };
  }, [
    copy.translationManagement.languageLoadError,
    request,
    requestEnvelope,
    locale,
    translationDrawerTarget,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const next = await readOrganizationTree(request, {
          includeInactive: showInactive,
          search: deferredSearch.trim() || undefined,
        });

        if (!cancelled) {
          setData(next);
        }
      } catch (reason) {
        if (!cancelled) {
          setError(getErrorMessage(reason, copy.state.loadTreeError));
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
  }, [copy.state.loadTreeError, deferredSearch, reloadVersion, request, showInactive]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfileStores() {
      setProfileStoresPanel((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      try {
        const next = await listProfileStores(request);

        if (!cancelled) {
          setProfileStoresPanel({
            data: next,
            error: null,
            loading: false,
          });
        }
      } catch (reason) {
        if (!cancelled) {
          setProfileStoresPanel({
            data: null,
            error: getErrorMessage(reason, copy.state.loadProfileStoresError),
            loading: false,
          });
        }
      }
    }

    void loadProfileStores();

    return () => {
      cancelled = true;
    };
  }, [copy.state.loadProfileStoresError, request]);

  useEffect(() => {
    if (!isCreateDrawerOpen) {
      return;
    }

    let cancelled = false;

    async function loadArtistStages() {
      setArtistStagesPanel((current) => ({
        data: current.data,
        error: null,
        loading: true,
      }));

      try {
        const records = await listConfigEntities(
          request,
          'artist-stage',
          {
            scopeType: 'tenant',
            includeInherited: true,
            includeDisabled: false,
            includeInactive: false,
            ownerOnly: false,
            page: 1,
            pageSize: 100,
            sort: 'sortOrder',
          },
          locale,
        );

        if (!cancelled) {
          setArtistStagesPanel({
            data: records.filter((record) => record.isActive),
            error: null,
            loading: false,
          });
        }
      } catch (reason) {
        if (!cancelled) {
          setArtistStagesPanel({
            data: null,
            error: getErrorMessage(reason, copy.state.loadArtistStagesError),
            loading: false,
          });
        }
      }
    }

    void loadArtistStages();

    return () => {
      cancelled = true;
    };
  }, [
    copy.state.loadArtistStagesError,
    isCreateDrawerOpen,
    locale,
    request,
  ]);

  useEffect(() => {
    if (!data || !selectedSubsidiaryId) {
      return;
    }

    if (!findNodeById(data.subsidiaries, selectedSubsidiaryId)) {
      const nextPage = 1;
      setSelectedSubsidiaryId(null);
      setInventoryPage(nextPage);

      const nextQueryString = buildOrganizationStructureQueryState({
        scopeId: null,
        search,
        showInactive,
        page: nextPage,
        pageSize: inventoryPageSize,
      });
      const currentQueryString = buildOrganizationStructureQueryState({
        scopeId: selectedSubsidiaryId,
        search,
        showInactive,
        page: inventoryPage,
        pageSize: inventoryPageSize,
      });

      if (nextQueryString !== currentQueryString) {
        const nextHref = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
        startTransition(() => {
          router.replace(nextHref);
        });
      }
    }
  }, [
    data,
    data,
    inventoryPage,
    inventoryPageSize,
    loading,
    pathname,
    router,
    search,
    selectedSubsidiaryId,
    showInactive,
  ]);

  useEffect(() => {
    const defaultProfileStoreId = resolveDefaultProfileStoreId(profileStoresPanel.data);

    if (!defaultProfileStoreId) {
      return;
    }

    setCreateDraft((current) => {
      if (current.profileStoreId) {
        return current;
      }

      return {
        ...current,
        profileStoreId: defaultProfileStoreId,
      };
    });
  }, [profileStoresPanel.data]);

  useEffect(() => {
    const defaultArtistStageId = resolveDefaultArtistStageId(artistStagesPanel.data);

    if (!defaultArtistStageId) {
      return;
    }

    setCreateDraft((current) => {
      if (current.artistStageId) {
        return current;
      }

      return {
        ...current,
        artistStageId: defaultArtistStageId,
      };
    });
  }, [artistStagesPanel.data]);

  async function handleCreateTalentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateCreateTalentDraft(createDraft);
    if (validationError) {
      setNotice({
        tone: 'error',
        message: copy.validation[validationError],
      });
      return;
    }

    setCreatePending(true);
    setNotice(null);

    try {
      const submittedCode = createDraft.code.trim().toUpperCase();
      const submittedDisplayName = createDraft.displayName.trim();
      const submittedNameBase = createDraft.nameBase.trim();
      const selectedScope = selectedNode;
      const created = await createOrganizationTalent(request, {
        subsidiaryId: selectedSubsidiaryId,
        profileStoreId: createDraft.profileStoreId,
        artistStageId: createDraft.artistStageId,
        code: submittedCode,
        displayName: submittedDisplayName,
        name: buildLocalizedTextPayload(submittedNameBase, createDraft.nameLocaleValues),
        timezone: createDraft.timezone.trim() || undefined,
      });
      const createdTalentLabel =
        pickFirstNonEmptyString([
          created.displayName,
          created.localizedName,
          submittedDisplayName,
          created.code,
          submittedCode,
        ]) ?? submittedCode;

      applyQueryState({
        page: 1,
        selectedSubsidiaryId: created.subsidiaryId ?? null,
      });
      setReloadVersion((current) => current + 1);
      setCreateDraft(buildCreateDraft(profileStoresPanel.data, artistStagesPanel.data));
      setIsCreateDrawerOpen(false);
      setCreatedTalentResult({
        talentId: created.id,
        code: pickFirstNonEmptyString([created.code, submittedCode]) ?? submittedCode,
        label: createdTalentLabel,
        scopeLabel: selectedScope?.displayName ?? copy.tree.tenantRootLabel,
        scopeType: selectedScope ? 'subsidiary' : 'tenant',
      });
      setNotice({
        tone: 'success',
        message: selectedScope
          ? `${createdTalentLabel} ${copy.notices.createdInScopePrefix} ${selectedScope.displayName}.`
          : `${createdTalentLabel} ${copy.notices.createdInTenantRoot}`,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.state.createError),
      });
    } finally {
      setCreatePending(false);
    }
  }

  async function handleCreateSubsidiarySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateCreateSubsidiaryDraft(createSubsidiaryDraft);
    if (validationError) {
      setNotice({
        tone: 'error',
        message: copy.validation[validationError],
      });
      return;
    }

    setCreateSubsidiaryPending(true);
    setNotice(null);

    try {
      const created = await createOrganizationSubsidiary(request, {
        parentId: selectedSubsidiaryId,
        code: createSubsidiaryDraft.code.trim().toUpperCase(),
        name: buildLocalizedTextPayload(createSubsidiaryDraft.nameBase, createSubsidiaryDraft.nameLocaleValues),
        description: buildLocalizedTextPayload(createSubsidiaryDraft.descriptionBase, {}),
      });

      setReloadVersion((current) => current + 1);
      setCreateSubsidiaryDraft(EMPTY_CREATE_SUBSIDIARY_DRAFT);
      setIsCreateSubsidiaryDrawerOpen(false);
      setNotice({
        tone: 'success',
        message: selectedNode
          ? `${created.localizedName} ${copy.notices.subsidiaryCreatedInScopePrefix} ${selectedNode.displayName}.`
          : `${created.localizedName} ${copy.notices.subsidiaryCreatedInTenantRoot}`,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.state.createSubsidiaryError),
      });
    } finally {
      setCreateSubsidiaryPending(false);
    }
  }

  async function prepareLifecycleAction(talent: OrganizationTalent) {
    setPreparingTalentId(talent.id);
    setNotice(null);

    try {
      const detail = await readTalentDetail(request, talent.id);

      if (talent.lifecycleStatus === 'disabled') {
        setLifecycleDialogState({
          action: 're-enable',
          talentId: detail.id,
          version: detail.version,
          title: `${copy.lifecycle.reEnableTitlePrefix} ${detail.displayName}?`,
          description: copy.lifecycle.reEnableDescription,
          confirmText: copy.lifecycle.reEnableConfirm,
          pendingText: copy.lifecycle.reEnablePending,
          successMessage: `${detail.displayName} ${copy.lifecycle.reEnableSuccessSuffix}`,
          errorFallback: copy.lifecycle.reEnableError,
          intent: 'primary',
        });
      } else {
        setLifecycleDialogState({
          action: 'disable',
          talentId: detail.id,
          version: detail.version,
          title: `${copy.lifecycle.disableTitlePrefix} ${detail.displayName}?`,
          description: copy.lifecycle.disableDescription,
          confirmText: copy.lifecycle.disableConfirm,
          pendingText: copy.lifecycle.disablePending,
          successMessage: `${detail.displayName} ${copy.lifecycle.disableSuccessSuffix}`,
          errorFallback: copy.lifecycle.disableError,
          intent: 'danger',
        });
      }
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.state.loadTalentDetailError),
      });
    } finally {
      setPreparingTalentId(null);
    }
  }

  async function handleConfirmLifecycleAction() {
    if (!lifecycleDialogState) {
      return;
    }

    const currentDialog = lifecycleDialogState;
    setLifecycleDialogPending(true);
    setNotice(null);

    try {
      if (currentDialog.action === 'disable') {
        await disableOrganizationTalent(request, currentDialog.talentId, {
          version: currentDialog.version,
        });
      } else {
        await reEnableOrganizationTalent(request, currentDialog.talentId, {
          version: currentDialog.version,
        });
      }

      setReloadVersion((current) => current + 1);
      setLifecycleDialogState(null);
      setNotice({
        tone: 'success',
        message: currentDialog.successMessage,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, currentDialog.errorFallback),
      });
    } finally {
      setLifecycleDialogPending(false);
    }
  }

  const flattenedNodes = data ? flattenNodes(data.subsidiaries) : [];
  const selectedNode = data && selectedSubsidiaryId ? findNodeById(data.subsidiaries, selectedSubsidiaryId) : null;
  const selectedNodeMeta = selectedSubsidiaryId
    ? flattenedNodes.find((entry) => entry.node.id === selectedSubsidiaryId) ?? null
    : null;
  const scopeLabels = selectedNodeMeta
    ? [copy.header.tenantBadge, ...selectedNodeMeta.labels]
    : [copy.header.tenantBadge];
  const allTenantTalents = data ? [...data.directTalents, ...collectTalents(data.subsidiaries)] : [];
  const scopedTalents = selectedNode ? collectTalents([selectedNode]) : allTenantTalents;
  const orderedScopedTalents =
    createdTalentResult && scopedTalents.some((talent) => talent.id === createdTalentResult.talentId)
      ? [
          scopedTalents.find((talent) => talent.id === createdTalentResult.talentId)!,
          ...scopedTalents.filter((talent) => talent.id !== createdTalentResult.talentId),
        ]
      : scopedTalents;
  const inventoryPagination = buildPaginationMeta(orderedScopedTalents.length, inventoryPage, inventoryPageSize);
  const paginatedScopedTalents = orderedScopedTalents.slice(
    (inventoryPagination.page - 1) * inventoryPagination.pageSize,
    inventoryPagination.page * inventoryPagination.pageSize,
  );
  const inventoryPageRange = getPaginationRange(inventoryPagination, paginatedScopedTalents.length);
  const inventoryPaginationCopy = getInventoryPaginationCopy(
    locale,
    inventoryPagination.page,
    inventoryPagination.totalPages,
    inventoryPageRange.start,
    inventoryPageRange.end,
    inventoryPagination.totalCount,
  );
  const createdTalentHomepageHref = createdTalentResult
    ? buildTalentWorkspaceSectionPath(tenantId, createdTalentResult.talentId, 'homepage')
    : null;
  const createdTalentStudioHref = createdTalentResult
    ? buildPublicPresenceStudioEditorPath(tenantId, createdTalentResult.talentId)
    : null;

  useEffect(() => {
    if (!loading && data && inventoryPage > inventoryPagination.totalPages) {
      const nextPage = inventoryPagination.totalPages;
      setInventoryPage(nextPage);

      const nextQueryString = buildOrganizationStructureQueryState({
        scopeId: selectedSubsidiaryId,
        search,
        showInactive,
        page: nextPage,
        pageSize: inventoryPageSize,
      });
      const currentQueryString = buildOrganizationStructureQueryState({
        scopeId: selectedSubsidiaryId,
        search,
        showInactive,
        page: inventoryPage,
        pageSize: inventoryPageSize,
      });

      if (nextQueryString !== currentQueryString) {
        const nextHref = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
        startTransition(() => {
          router.replace(nextHref);
        });
      }
    }
  }, [
    data,
    inventoryPage,
    inventoryPageSize,
    inventoryPagination.totalPages,
    loading,
    pathname,
    router,
    search,
    selectedSubsidiaryId,
    showInactive,
  ]);

  useEffect(() => {
    if (!createdTalentResult) {
      return;
    }

    const element = document.querySelector<HTMLElement>('[data-created-talent-spotlight="true"]');

    if (!element) {
      return;
    }

    if (typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({
        block: 'nearest',
      });
    }

    element.focus();
  }, [createdTalentResult]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <GlassSurface className="p-8">
          <p className="text-sm font-medium text-slate-500">{copy.state.loading}</p>
        </GlassSurface>
      </div>
    );
  }

  if (error && !data) {
    return <StateView status="error" title={copy.state.unavailableTitle} description={error} />;
  }

  if (!data) {
    return (
      <StateView
        status="error"
        title={copy.state.unavailableTitle}
        description={copy.state.noPayload}
      />
    );
  }

  const scopeTitle = selectedNode ? selectedNode.displayName : session?.tenantName || copy.tree.tenantRootLabel;
  const scopePath = selectedNode?.path || copy.tree.tenantRootLabel;
  const hierarchyBusinessHref = selectedNode
    ? buildSubsidiaryBusinessPath(tenantId, selectedNode.id)
    : buildTenantBusinessPath(tenantId);
  const createTalentSharedRoute =
    session?.tenantCode && createDraft.code.trim().length > 0
      ? buildSharedHomepagePath(session.tenantCode, createDraft.code.trim())
      : null;
  const structureSummary = selectedNode
    ? `${formatOrganizationDirectSubsidiaryCount(locale, selectedNode.children.length)} · ${formatOrganizationTalentCount(locale, scopedTalents.length)}`
    : `${formatOrganizationSubsidiaryCount(locale, flattenedNodes.length)} · ${formatOrganizationTalentCount(locale, scopedTalents.length)}`;
  const inventoryDescription = selectedNode ? copy.inventory.scopedDescription : copy.inventory.tenantDescription;
  const configuredTalentTranslationCount = Object.values(createDraft.nameLocaleValues).filter(
    (value) => value.trim().length > 0,
  ).length;
  const configuredSubsidiaryTranslationCount = Object.values(createSubsidiaryDraft.nameLocaleValues).filter(
    (value) => value.trim().length > 0,
  ).length;
  const translationDrawerLabels = {
    addLanguageLabel: pickLocaleText(locale, {
      en: 'Add language',
      zh_HANS: '添加语言',
      zh_HANT: '新增語言',
      ja: '言語を追加',
      ko: '언어 추가',
      fr: 'Ajouter une langue',
    }),
    addOtherLanguageLabel: pickLocaleText(locale, {
      en: 'Add other language...',
      zh_HANS: '添加其它语言…',
      zh_HANT: '新增其它語言…',
      ja: '他の言語を追加…',
      ko: '다른 언어 추가…',
      fr: 'Ajouter une autre langue…',
    }),
    removeLanguageVisibleLabel: pickLocaleText(locale, {
      en: 'Remove',
      zh_HANS: '移除',
      zh_HANT: '移除',
      ja: '削除',
      ko: '제거',
      fr: 'Retirer',
    }),
    emptyTranslationsText: pickLocaleText(locale, {
      en: 'No translations added yet.',
      zh_HANS: '当前还没有添加翻译。',
      zh_HANT: '目前尚未新增翻譯。',
      ja: 'まだ翻訳は追加されていません。',
      ko: '아직 추가된 번역이 없습니다.',
      fr: 'Aucune traduction n’a encore été ajoutée.',
    }),
    baseValueSuffix: pickLocaleText(locale, {
      en: '(Base / English)',
      zh_HANS: '（英文主值）',
      zh_HANT: '（英文主值）',
      ja: '（英語の基準値）',
      ko: '(영문 기본값)',
      fr: '(Valeur de base / anglais)',
    }),
  };
  const translationDrawerConfig =
    translationDrawerTarget === 'talent-name'
      ? {
          title: copy.translationManagement.talentNameTitle,
          baseValue: createDraft.nameBase,
          translations: createDraft.nameLocaleValues,
          fieldLabel: copy.form.legalNameLabel,
          onSave: async (
            payload: Record<string, Record<string, string>> | Record<string, string>,
          ) => {
            const translations = extractSingleFieldTranslationPayload(payload);

            setCreateDraft((current) => ({
              ...current,
              nameLocaleValues: translations,
            }));
          },
        }
      : translationDrawerTarget === 'subsidiary-name'
        ? {
            title: copy.translationManagement.subsidiaryNameTitle,
            baseValue: createSubsidiaryDraft.nameBase,
            translations: createSubsidiaryDraft.nameLocaleValues,
            fieldLabel: copy.form.subsidiaryNameLabel,
            onSave: async (
              payload: Record<string, Record<string, string>> | Record<string, string>,
            ) => {
              const translations = extractSingleFieldTranslationPayload(payload);

              setCreateSubsidiaryDraft((current) => ({
                ...current,
                nameLocaleValues: translations,
              }));
            },
          }
        : null;

  return (
    <div className="space-y-6">
      {notice ? <NoticeBanner tone={notice.tone} message={notice.message} /> : null}
      {!notice && error ? <NoticeBanner tone="error" message={error} /> : null}

      <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <GlassSurface className="p-4 md:p-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-slate-500" />
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{copy.tree.title}</p>
              </div>
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => {
                    applyQueryState({
                      page: 1,
                      search: event.target.value,
                    });
                  }}
                  placeholder={copy.tree.searchPlaceholder}
                  className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>
            </div>

            <div className="space-y-2">
              <ScopeTreeRow
                label={session?.tenantName || copy.tree.tenantRootLabel}
                hint={`${session?.tenantCode || copy.tree.tenantRootLabel} · ${formatOrganizationTalentCount(
                  locale,
                  allTenantTalents.length,
                )}`}
                depth={0}
                isActive={!selectedNode}
                onSelect={() => {
                  applyQueryState({
                    page: 1,
                    selectedSubsidiaryId: null,
                  });
                }}
                settingsHref={`/tenant/${tenantId}/settings`}
                settingsLabel={copy.actions.editTenantSettings}
              />
              {flattenedNodes.map((entry) => (
                <ScopeTreeRow
                  key={entry.node.id}
                  label={entry.node.displayName}
                  hint={`${entry.node.code} · ${formatOrganizationTalentCount(locale, collectTalents([entry.node]).length)}`}
                  depth={entry.depth + 1}
                  isActive={selectedSubsidiaryId === entry.node.id}
                  onSelect={() => {
                    applyQueryState({
                      page: 1,
                      selectedSubsidiaryId: entry.node.id,
                    });
                  }}
                  settingsHref={`/tenant/${tenantId}/subsidiary/${entry.node.id}/settings`}
                  settingsLabel={`${copy.actions.editSubsidiarySettings}: ${entry.node.displayName}`}
                />
              ))}
            </div>

            {!loading && flattenedNodes.length === 0 && data.directTalents.length === 0 ? (
              <StateView
                status="empty"
                title={copy.tree.emptyTitle}
                description={copy.tree.emptyDescription}
              />
            ) : null}
          </div>
        </GlassSurface>

        <div className="space-y-6">
          <GlassSurface className="p-6 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {copy.header.eyebrow}
                </p>
                <ScopeBreadcrumb labels={scopeLabels} />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-medium text-white">
                    {selectedNode ? copy.header.subsidiaryBadge : copy.header.tenantBadge}
                  </span>
                  <span className="text-xs text-slate-500">{scopePath}</span>
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{scopeTitle}</h1>
                <p className="text-sm leading-6 text-slate-600">{structureSummary}</p>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    applyQueryState({
                      page: 1,
                      showInactive: !showInactive,
                    });
                  }}
                  className={`${HEADER_ACTION_BUTTON_BASE_CLASS} ${
                    showInactive
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-400'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {showInactive ? copy.actions.hideInactive : copy.actions.showInactive}
                </button>
                <AsyncSubmitButton
                  type="button"
                  isPending={loading}
                  pendingText={copy.actions.refreshing}
                  onClick={() => setReloadVersion((current) => current + 1)}
                  className="h-11 shrink-0 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold"
                >
                  <span className="inline-flex items-center gap-2 whitespace-nowrap">
                    <RefreshCcw className="h-4 w-4" />
                    <span>{copy.actions.refresh}</span>
                  </span>
                </AsyncSubmitButton>
                <Link
                  href={hierarchyBusinessHref}
                  className={HEADER_ACTION_SECONDARY_BUTTON_CLASS}
                >
                  <ChevronRight className="h-4 w-4" />
                  {copy.actions.openWorkspace}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setCreateSubsidiaryDraft(EMPTY_CREATE_SUBSIDIARY_DRAFT);
                    setIsCreateSubsidiaryDrawerOpen(true);
                    setNotice(null);
                  }}
                  className={HEADER_ACTION_SECONDARY_BUTTON_CLASS}
                >
                  <Plus className="h-4 w-4" />
                  {copy.actions.createSubsidiary}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreateDraft(buildCreateDraft(profileStoresPanel.data, artistStagesPanel.data));
                    setIsCreateDrawerOpen(true);
                    setNotice(null);
                  }}
                  className={HEADER_ACTION_PRIMARY_BUTTON_CLASS}
                >
                  <Plus className="h-4 w-4" />
                  {copy.actions.createTalent}
                </button>
              </div>
            </div>
          </GlassSurface>

          <GlassSurface className="p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">{copy.inventory.title}</h2>
                </div>
                <p className="text-sm leading-6 text-slate-600">{inventoryDescription}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {formatOrganizationTalentCount(locale, scopedTalents.length)}
              </span>
            </div>

            <div className="space-y-4">
              {createdTalentResult && createdTalentHomepageHref && createdTalentStudioHref ? (
                <div
                  role="region"
                  tabIndex={-1}
                  aria-label={`${copy.notices.createdTalentReadyTitle}: ${createdTalentResult.label}`}
                  data-created-talent-spotlight="true"
                  data-testid="organization-created-talent-spotlight"
                  className="rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-4 text-slate-900 shadow-sm outline-none"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                        {copy.notices.createdTalentReadyTitle}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-slate-950">{createdTalentResult.label}</p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                          {createdTalentResult.code}
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
                          {createdTalentResult.scopeType === 'subsidiary'
                            ? copy.header.subsidiaryBadge
                            : copy.header.tenantBadge}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{createdTalentResult.scopeLabel}</p>
                      <p className="text-sm text-slate-600">{copy.notices.createdTalentWorkflowHint}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link
                        href={createdTalentHomepageHref}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        {copy.actions.openHomepageManagement}
                      </Link>
                      <Link
                        href={createdTalentStudioHref}
                        className="inline-flex items-center rounded-full border border-slate-950 bg-slate-950 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
                      >
                        {copy.actions.openStudio}
                      </Link>
                    </div>
                  </div>
                </div>
              ) : null}
              {scopedTalents.length > 0 ? (
                <>
                  <div className="grid gap-3">
                    {paginatedScopedTalents.map((talent) => (
                      <TalentListRow
                        key={talent.id}
                        locale={locale}
                        editTalentSettingsLabel={copy.actions.editTalentSettings}
                        openWorkspaceLabel={copy.actions.openWorkspace}
                        tenantId={tenantId}
                        talent={talent}
                        isHighlighted={createdTalentResult?.talentId === talent.id}
                        isLifecyclePending={preparingTalentId === talent.id}
                        onLifecycleAction={prepareLifecycleAction}
                      />
                    ))}
                  </div>
                  <PaginationFooter
                    pagination={inventoryPagination}
                    itemCount={paginatedScopedTalents.length}
                    labels={{
                      pageLabel: inventoryPaginationCopy.page,
                      rangeLabel: inventoryPaginationCopy.range,
                      rowsPerPageLabel: inventoryPaginationCopy.pageSize,
                      pageSizeAriaLabel: inventoryPaginationCopy.pageSize,
                      previousLabel: inventoryPaginationCopy.previous,
                      nextLabel: inventoryPaginationCopy.next,
                    }}
                    onPageChange={(nextPage) => applyQueryState({ page: nextPage })}
                    onPageSizeChange={(nextPageSize) => {
                      applyQueryState({
                        page: 1,
                        pageSize: nextPageSize as PageSizeOption,
                      });
                    }}
                    className="rounded-2xl border border-slate-200 bg-white/85 shadow-sm"
                  />
                </>
              ) : (
                <StateView
                  status="empty"
                  title={copy.inventory.emptyTitle}
                  description={copy.inventory.emptyDescription}
                />
              )}
            </div>
          </GlassSurface>
        </div>
      </div>

      <ActionDrawer
        open={isCreateSubsidiaryDrawerOpen}
        onOpenChange={(nextOpen) => {
          if (!createSubsidiaryPending) {
            setIsCreateSubsidiaryDrawerOpen(nextOpen);
          }
        }}
        title={
          selectedNode
            ? `${copy.form.subsidiaryScopeTitlePrefix} ${selectedNode.displayName}`
            : copy.form.subsidiaryRootTitle
        }
        description={
          selectedNode
            ? `${copy.form.subsidiaryScopeDescriptionPrefix} ${selectedNode.displayName}.`
            : copy.form.subsidiaryRootDescription
        }
        size="lg"
        closeButtonAriaLabel={copy.form.closeCreateSubsidiaryDrawer}
        footer={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreateSubsidiaryDrawerOpen(false)}
              disabled={createSubsidiaryPending}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copy.actions.cancel}
            </button>
            <AsyncSubmitButton
              type="submit"
              form="organization-create-subsidiary-form"
              isPending={createSubsidiaryPending}
              pendingText={copy.form.subsidiaryCreatePending}
            >
              {copy.form.subsidiarySubmit}
            </AsyncSubmitButton>
          </div>
        }
      >
        <form id="organization-create-subsidiary-form" onSubmit={handleCreateSubsidiarySubmit}>
          <FormSection
            title={copy.form.subsidiarySectionTitle}
            description={
              selectedNode
                ? `${copy.form.subsidiarySectionDescriptionScopePrefix} ${selectedNode.displayName}.`
                : copy.form.subsidiarySectionDescriptionRoot
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">{copy.form.subsidiaryCodeLabel}</span>
                <input
                  aria-label={copy.form.subsidiaryCodeLabel}
                  value={createSubsidiaryDraft.code}
                  onChange={(event) =>
                    setCreateSubsidiaryDraft((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder={copy.form.subsidiaryCodePlaceholder}
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>
              <div className="space-y-3 md:col-span-2">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="min-w-0 flex-1 space-y-2">
                    <span className="text-sm font-medium text-slate-700">{copy.form.subsidiaryNameLabel}</span>
                    <input
                      aria-label={copy.form.subsidiaryNameLabel}
                      value={createSubsidiaryDraft.nameBase}
                      onChange={(event) =>
                        setCreateSubsidiaryDraft((current) => ({
                          ...current,
                          nameBase: event.target.value,
                        }))
                      }
                      placeholder={copy.form.subsidiaryNamePlaceholder}
                      className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setTranslationDrawerTarget('subsidiary-name')}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                    aria-label={copy.translationManagement.subsidiaryNameTrigger}
                  >
                    <Languages className="h-4 w-4" />
                    <span>{copy.translationManagement.subsidiaryNameTrigger}</span>
                    {configuredSubsidiaryTranslationCount > 0 ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {configuredSubsidiaryTranslationCount}
                      </span>
                    ) : null}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  {configuredSubsidiaryTranslationCount > 0
                    ? copy.translationManagement.subsidiaryNameSummary(configuredSubsidiaryTranslationCount)
                    : copy.translationManagement.subsidiaryNameEmpty}
                </p>
                {translationOptionsState.error && translationDrawerTarget === 'subsidiary-name' ? (
                  <p className="text-xs text-amber-700">{translationOptionsState.error}</p>
                ) : null}
              </div>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">{copy.form.subsidiaryDescriptionLabel}</span>
                <textarea
                  aria-label={copy.form.subsidiaryDescriptionLabel}
                  value={createSubsidiaryDraft.descriptionBase}
                  onChange={(event) =>
                    setCreateSubsidiaryDraft((current) => ({
                      ...current,
                      descriptionBase: event.target.value,
                    }))
                  }
                  placeholder={copy.form.subsidiaryDescriptionPlaceholder}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>
            </div>
          </FormSection>
        </form>
      </ActionDrawer>

      <ActionDrawer
        open={isCreateDrawerOpen}
        onOpenChange={(nextOpen) => {
          if (!createPending) {
            setIsCreateDrawerOpen(nextOpen);
          }
        }}
        title={selectedNode ? `${copy.form.scopeTitlePrefix} ${selectedNode.displayName}` : copy.form.rootTitle}
        description={
          selectedNode
            ? `${copy.form.scopeDescriptionPrefix} ${selectedNode.displayName}.`
            : copy.form.rootDescription
        }
        size="lg"
        closeButtonAriaLabel={copy.form.closeCreateTalentDrawer}
        footer={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreateDrawerOpen(false)}
              disabled={createPending}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {copy.actions.cancel}
            </button>
            <AsyncSubmitButton
              type="submit"
              form="organization-create-talent-form"
              isPending={createPending}
              pendingText={copy.form.createPending}
              disabled={
                profileStoresPanel.loading ||
                profileStoresPanel.data?.items.length === 0 ||
                artistStagesPanel.loading ||
                !artistStagesPanel.data ||
                artistStagesPanel.data.length === 0
              }
            >
              {copy.form.submit}
            </AsyncSubmitButton>
          </div>
        }
      >
        <form id="organization-create-talent-form" onSubmit={handleCreateTalentSubmit}>
          <FormSection
            title={copy.form.sectionTitle}
            description={
              selectedNode
                ? `${copy.form.sectionDescriptionScopePrefix} ${selectedNode.displayName}.`
                : copy.form.sectionDescriptionRoot
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">{copy.form.talentCodeLabel}</span>
                <input
                  aria-label={copy.form.talentCodeLabel}
                  value={createDraft.code}
                  onChange={(event) =>
                    setCreateDraft((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder={copy.form.talentCodePlaceholder}
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">{copy.form.displayNameLabel}</span>
                <input
                  aria-label={copy.form.displayNameLabel}
                  value={createDraft.displayName}
                  onChange={(event) =>
                    setCreateDraft((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                  placeholder={copy.form.displayNamePlaceholder}
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">{copy.form.legalNameLabel}</span>
                <input
                  aria-label={copy.form.legalNameLabel}
                  value={createDraft.nameBase}
                  onChange={(event) =>
                    setCreateDraft((current) => ({
                      ...current,
                      nameBase: event.target.value,
                    }))
                  }
                  placeholder={copy.form.legalNamePlaceholder}
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>
              <div className="space-y-3 md:col-span-2">
                <div className="flex flex-wrap items-end gap-3">
                  <button
                    type="button"
                    onClick={() => setTranslationDrawerTarget('talent-name')}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                    aria-label={copy.translationManagement.talentNameTrigger}
                  >
                    <Languages className="h-4 w-4" />
                    <span>{copy.translationManagement.talentNameTrigger}</span>
                    {configuredTalentTranslationCount > 0 ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {configuredTalentTranslationCount}
                      </span>
                    ) : null}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  {configuredTalentTranslationCount > 0
                    ? copy.translationManagement.talentNameSummary(configuredTalentTranslationCount)
                    : copy.translationManagement.talentNameEmpty}
                </p>
                {translationOptionsState.error && translationDrawerTarget === 'talent-name' ? (
                  <p className="text-xs text-amber-700">{translationOptionsState.error}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  {pickLocaleText(locale, {
                    en: 'Default shared-domain route',
                    zh_HANS: '默认共享域路径',
                    zh_HANT: '預設共享網域路徑',
                    ja: '既定共有ドメインルート',
                    ko: '기본 공유 도메인 경로',
                    fr: 'Route de domaine partagé par défaut',
                  })}
                </span>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {createTalentSharedRoute ||
                    (pickLocaleText(locale, {
                      en: 'Generated automatically after you enter the talent code.',
                      zh_HANS: '填写艺人代码后会自动生成。',
                      zh_HANT: '填寫藝人代碼後會自動產生。',
                      ja: 'タレントコードを入力すると自動生成されます。',
                      ko: '탤런트 코드를 입력하면 자동으로 생성됩니다.',
                      fr: 'Généré automatiquement après la saisie du code talent.',
                    }))}
                </div>
                <p className="text-xs leading-6 text-slate-500">
                  {pickLocaleText(locale, {
                    en: 'The shared-domain homepage route is fixed to {tenantCode}/{talentCode}/homepage. Use a custom domain later if you need a custom path.',
                    zh_HANS: '共享域名下的公开主页路径固定为 {tenantCode}/{talentCode}/homepage；如需自定义，请后续配置自定义域名。',
                    zh_HANT: '共享網域下的公開主頁路徑固定為 {tenantCode}/{talentCode}/homepage；如需自訂，請後續設定自訂網域。',
                    ja: '共有ドメインの公開ホームページは {tenantCode}/{talentCode}/homepage で固定されます。独自パスが必要な場合は後でカスタムドメインを設定してください。',
                    ko: '공유 도메인의 공개 홈페이지 경로는 {tenantCode}/{talentCode}/homepage 로 고정됩니다. 사용자 지정 경로가 필요하면 나중에 커스텀 도메인을 설정하세요.',
                    fr: "La route de la page publique sur domaine partagé est fixée à {tenantCode}/{talentCode}/homepage. Configurez un domaine personnalisé plus tard si vous avez besoin d'un chemin personnalisé.",
                  })}
                </p>
              </div>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">{copy.form.profileStoreLabel}</span>
                <select
                  aria-label={copy.form.profileStoreLabel}
                  value={createDraft.profileStoreId}
                  onChange={(event) =>
                    setCreateDraft((current) => ({
                      ...current,
                      profileStoreId: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  {profileStoresPanel.data?.items.map((profileStore) => (
                    <option key={profileStore.id} value={profileStore.id}>
                  {pickLocalizedProfileStoreName(profileStore, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">{copy.form.artistStageLabel}</span>
                <select
                  aria-label={copy.form.artistStageLabel}
                  value={createDraft.artistStageId}
                  onChange={(event) =>
                    setCreateDraft((current) => ({
                      ...current,
                      artistStageId: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  <option value="">{copy.form.artistStageLabel}</option>
                  {(artistStagesPanel.data ?? []).map((artistStage) => {
                    const artistStageName =
                      pickFirstNonEmptyString([artistStage.localizedName, artistStage.code]) ?? artistStage.code;
                    const lifecycleLabel = getOrganizationLifecycleLabel(
                      artistStage.lifecycleStatusMapping ?? 'draft',
                      locale,
                    );

                    return (
                      <option key={artistStage.id} value={artistStage.id}>
                        {`${artistStageName} · ${artistStage.code ?? ''} · ${lifecycleLabel}`}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">{copy.form.timezoneLabel}</span>
                <input
                  aria-label={copy.form.timezoneLabel}
                  value={createDraft.timezone}
                  onChange={(event) =>
                    setCreateDraft((current) => ({
                      ...current,
                      timezone: event.target.value,
                    }))
                  }
                  placeholder={copy.form.timezonePlaceholder}
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>
            </div>

            {profileStoresPanel.error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                {profileStoresPanel.error}
              </div>
            ) : null}

            {artistStagesPanel.error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                {artistStagesPanel.error}
              </div>
            ) : null}

            {!profileStoresPanel.loading && profileStoresPanel.data?.items.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                {copy.form.noProfileStores}
              </div>
            ) : null}

            {!artistStagesPanel.loading && artistStagesPanel.data?.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                {copy.form.noArtistStages}
              </div>
            ) : null}
          </FormSection>
        </form>
      </ActionDrawer>

      <ConfirmActionDialog
        open={lifecycleDialogState !== null}
        title={lifecycleDialogState?.title || copy.lifecycle.confirmFallback}
        description={lifecycleDialogState?.description || ''}
        confirmText={lifecycleDialogState?.confirmText ?? copy.lifecycle.disableConfirm}
        cancelText={copy.actions.cancel}
        pendingText={lifecycleDialogState?.pendingText}
        intent={lifecycleDialogState?.intent}
        isPending={lifecycleDialogPending}
        onCancel={() => {
          if (!lifecycleDialogPending) {
            setLifecycleDialogState(null);
          }
        }}
        onConfirm={() => {
          void handleConfirmLifecycleAction();
        }}
      />
      <TranslationDrawer
        open={translationDrawerConfig !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setTranslationDrawerTarget(null);
          }
        }}
        title={translationDrawerConfig?.title ?? copy.translationManagement.talentNameTitle}
        baseValue={translationDrawerConfig?.baseValue ?? ''}
        translations={translationDrawerConfig?.translations ?? {}}
        legacyFieldLabel={translationDrawerConfig?.fieldLabel ?? copy.form.legalNameLabel}
        availableLocales={translationOptionsState.data}
        onSave={translationDrawerConfig?.onSave ?? (async () => {})}
        saveButtonLabel={copy.translationManagement.save}
        cancelButtonLabel={copy.translationManagement.cancel}
        closeButtonAriaLabel={copy.translationManagement.closeDrawer}
        addLanguageLabel={translationDrawerLabels.addLanguageLabel}
        addOtherLanguageLabel={translationDrawerLabels.addOtherLanguageLabel}
        removeLanguageVisibleLabel={translationDrawerLabels.removeLanguageVisibleLabel}
        removeLanguageAriaLabel={(language) =>
          `${translationDrawerLabels.removeLanguageVisibleLabel} ${language}`
        }
        emptyTranslationsText={translationDrawerLabels.emptyTranslationsText}
        baseValueSuffix={translationDrawerLabels.baseValueSuffix}
      />
    </div>
  );
}
