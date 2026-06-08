'use client';

import type { SupportedUiLocale } from '@tcrn/shared';
import { Activity, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  type ChangeLogRecord,
  type IntegrationLogRecord,
  listChangeLogs,
  listIntegrationLogs,
  listObservabilityAdapterSummary,
  listTechEvents,
  type LogSearchEntry,
  type ObservabilityAdapterSummary,
  type ObservabilityTab,
  readObservabilityAdapterDeepLink,
  searchLogs,
  type TechEventRecord,
} from '@/domains/observability/api/observability.api';
import {
  formatObservabilityDateTime,
  getObservabilityActionLabel,
  getObservabilityDirectionLabel,
  getObservabilitySeverityLabel,
  getObservabilityTabLabel,
  useObservabilityCopy,
} from '@/domains/observability/screens/observability.copy';
import { ApiRequestError } from '@/platform/http/api';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useFadeSwapState } from '@/platform/runtime/motion/use-fade-swap-state';
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
  GlassSurface,
  PaginationFooter,
  SectionTabs,
  StateView,
  TableShell,
} from '@/platform/ui';

type PagedPanelState<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  loading: boolean;
  error: string | null;
};

type ObservabilityLocale = SupportedUiLocale;

type SearchPanelState = {
  data: LogSearchEntry[];
  loading: boolean;
  error: string | null;
};

type AdapterSummaryState = {
  data: ObservabilityAdapterSummary[];
  loading: boolean;
  error: string | null;
};

const SHOW_AC_READINESS_HANDOFF = false;

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

interface ChangeFilters {
  objectType: string;
  action: string;
  requestId: string;
}

interface TechEventFilters {
  severity: string;
  eventType: string;
  scope: string;
  traceId: string;
}

interface IntegrationFilters {
  consumerCode: string;
  direction: string;
  responseStatus: string;
  traceId: string;
  failedOnly: boolean;
}

interface SearchFilters {
  keyword: string;
  stream: string;
  severity: string;
  timeRange: string;
}

function emptyPagedPanel<T>(): PagedPanelState<T> {
  return {
    data: [],
    pagination: buildPaginationMeta(0, 1, PAGE_SIZE_OPTIONS[0]),
    loading: false,
    error: null,
  };
}

function emptySearchPanel(): SearchPanelState {
  return {
    data: [],
    loading: false,
    error: null,
  };
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

interface DiffEntry {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

const TOP_LEVEL_DIFF_KEYS = ['old', 'new', 'oldValue', 'newValue'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readDiffPair(value: Record<string, unknown>) {
  const hasOld =
    Object.prototype.hasOwnProperty.call(value, 'old') ||
    Object.prototype.hasOwnProperty.call(value, 'oldValue');
  const hasNew =
    Object.prototype.hasOwnProperty.call(value, 'new') ||
    Object.prototype.hasOwnProperty.call(value, 'newValue');

  if (!hasOld && !hasNew) {
    return null;
  }

  return {
    oldValue: Object.prototype.hasOwnProperty.call(value, 'old') ? value.old : value.oldValue,
    newValue: Object.prototype.hasOwnProperty.call(value, 'new') ? value.new : value.newValue,
  };
}

function buildSnapshotDiffEntries(oldValue: unknown, newValue: unknown): DiffEntry[] {
  if (isRecord(oldValue) || isRecord(newValue)) {
    const oldRecord = isRecord(oldValue) ? oldValue : {};
    const newRecord = isRecord(newValue) ? newValue : {};
    const fields = Array.from(new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]));

    return fields.map((field) => ({
      field,
      oldValue: oldRecord[field],
      newValue: newRecord[field],
    }));
  }

  return [
    {
      field: 'value',
      oldValue,
      newValue,
    },
  ];
}

function buildDiffEntries(diff: ChangeLogRecord['diff']): DiffEntry[] {
  if (!diff) {
    return [];
  }

  const changedKeys = Object.keys(diff);

  if (changedKeys.length === 0) {
    return [];
  }

  const topLevelPair = changedKeys.every((key) => TOP_LEVEL_DIFF_KEYS.includes(key))
    ? readDiffPair(diff)
    : null;

  if (topLevelPair) {
    return buildSnapshotDiffEntries(topLevelPair.oldValue, topLevelPair.newValue);
  }

  return Object.entries(diff).map(([field, value]) => {
    if (isRecord(value)) {
      const pair = readDiffPair(value);

      if (pair) {
        return {
          field,
          oldValue: pair.oldValue,
          newValue: pair.newValue,
        };
      }
    }

    return {
      field,
      oldValue: undefined,
      newValue: value,
    };
  });
}

function formatEmptyDiffValue(locale: ObservabilityLocale) {
  return pickLocaleText(locale, {
    en: 'empty',
    zh_HANS: '空',
    zh_HANT: '空',
    ja: '空',
    ko: '비어 있음',
    fr: 'vide',
  });
}

function formatDiffValue(value: unknown, locale: ObservabilityLocale) {
  if (value === null || value === undefined || value === '') {
    return formatEmptyDiffValue(locale);
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function truncateDiffValue(value: string) {
  return value.length > 80 ? `${value.slice(0, 77)}...` : value;
}

function formatDiffEntry(entry: DiffEntry, locale: ObservabilityLocale) {
  const oldValue = truncateDiffValue(formatDiffValue(entry.oldValue, locale));
  const newValue = truncateDiffValue(formatDiffValue(entry.newValue, locale));

  return `${entry.field}: ${oldValue} -> ${newValue}`;
}

function summarizeDiff(diff: ChangeLogRecord['diff'], locale: ObservabilityLocale) {
  const entries = buildDiffEntries(diff);

  if (entries.length === 0) {
    return null;
  }

  const summary = entries
    .slice(0, 3)
    .map((entry) => formatDiffEntry(entry, locale))
    .join('; ');

  if (entries.length <= 3) {
    return summary;
  }

  const extraCount = entries.length - 3;

  return pickLocaleText(locale, {
    en: `${summary} +${extraCount} more`,
    zh_HANS: `${summary} 等另外 ${extraCount} 项`,
    zh_HANT: `${summary} 等另外 ${extraCount} 項`,
    ja: `${summary} ほか ${extraCount} 件`,
    ko: `${summary} 외 ${extraCount}건`,
    fr: `${summary} et ${extraCount} de plus`,
  });
}

function formatDiffDetails(diff: ChangeLogRecord['diff'], locale: ObservabilityLocale) {
  const entries = buildDiffEntries(diff);

  return entries.length === 0
    ? null
    : entries.map((entry) => formatDiffEntry(entry, locale)).join('\n');
}

function formatJsonBlock(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function readPayloadText(payload: unknown, keys: string[]) {
  if (!isRecord(payload)) {
    return null;
  }

  for (const key of keys) {
    const value = payload[key];

    if (typeof value === 'string' && value.trim()) {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
  }

  return null;
}

function buildTechEventContext(entry: TechEventRecord) {
  const payload = entry.payloadJson;

  return {
    actor:
      readPayloadText(payload, [
        'operatorName',
        'actorName',
        'username',
        'userName',
        'displayName',
        'userId',
        'actorId',
        'operatorId',
      ]) ?? null,
    tenant: readPayloadText(payload, ['tenantName', 'tenantCode', 'tenantId']) ?? null,
    request: readPayloadText(payload, ['requestId', 'correlationId']) ?? null,
    ip: readPayloadText(payload, ['ipAddress', 'ip', 'clientIp']) ?? null,
    session: readPayloadText(payload, ['sessionId', 'session', 'deviceId']) ?? null,
    fingerprint:
      readPayloadText(payload, ['fingerprint', 'fingerprintHash', 'deviceFingerprint']) ?? null,
    raw: payload,
  };
}

function resolveInitialTab(value: string | null): ObservabilityTab {
  if (
    value === 'change-logs' ||
    value === 'tech-events' ||
    value === 'integration-logs' ||
    value === 'log-search'
  ) {
    return value;
  }

  return 'change-logs';
}

function buildObservabilityQuery({
  tab,
  page,
  pageSize,
  limit,
  includeDefaultLimit = false,
}: {
  tab: ObservabilityTab;
  page: number;
  pageSize: PageSizeOption;
  limit: PageSizeOption;
  includeDefaultLimit?: boolean;
}) {
  const params = new URLSearchParams();
  params.set('tab', tab);

  if (tab === 'log-search') {
    if (includeDefaultLimit || limit !== PAGE_SIZE_OPTIONS[0]) {
      params.set('limit', String(limit));
    }

    return `?${params.toString()}`;
  }

  if (page > 1) {
    params.set('page', String(page));
  }

  if (pageSize !== PAGE_SIZE_OPTIONS[0]) {
    params.set('pageSize', String(pageSize));
  }

  return `?${params.toString()}`;
}

function Field({ label, hint, children }: Readonly<FieldProps>) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      {children}
      {hint ? <span className="block text-xs leading-5 text-slate-500">{hint}</span> : null}
    </label>
  );
}

const inputClassName =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40';

function formatCodeLabel(value: string) {
  return value.replace(/_/g, ' ');
}

function readinessClass(value: string) {
  if (['accepted', 'ready', 'healthy', 'external_provided', 'repository_readback'].includes(value)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (['configured', 'degraded', 'sso_required', 'missing_config', 'compose_opt_in_not_running'].includes(value)) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (['blocked', 'unhealthy', 'unsafe_url', 'forbidden'].includes(value)) {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function ReadinessBadge({ value }: Readonly<{ value: string }>) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${readinessClass(value)}`}
    >
      <span className="truncate">{formatCodeLabel(value)}</span>
    </span>
  );
}

export function ObservabilityScreen({
  tenantId: _tenantId,
  workspaceKind = 'tenant',
}: Readonly<{
  tenantId: string;
  workspaceKind?: 'tenant' | 'ac';
}>) {
  const { request, session } = useSession();
  const { locale, copy, changeActionOptions, severityOptions, directionOptions } =
    useObservabilityCopy();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAcWorkspace = workspaceKind === 'ac';
  const workspaceLabel = isAcWorkspace
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
        fr: 'Locataire',
      });
  const workspaceName = session?.tenantName || workspaceLabel;

  const currentTab = resolveInitialTab(searchParams.get('tab'));
  const urlPage = parsePageParam(searchParams.get('page'));
  const urlPageSize = parsePageSizeParam(searchParams.get('pageSize'));
  const urlSearchLimit = parsePageSizeParam(searchParams.get('limit'));
  const hasExplicitSearchLimitParam = currentTab === 'log-search' && searchParams.has('limit');

  const [activeTab, setActiveTab] = useState<ObservabilityTab>(currentTab);
  const { displayedValue: displayedTab, transitionClassName: tabTransitionClassName } =
    useFadeSwapState(activeTab);
  const [changeFilters, setChangeFilters] = useState<ChangeFilters>({
    objectType: '',
    action: '',
    requestId: '',
  });
  const [techFilters, setTechFilters] = useState<TechEventFilters>({
    severity: '',
    eventType: '',
    scope: '',
    traceId: '',
  });
  const [integrationFilters, setIntegrationFilters] = useState<IntegrationFilters>({
    consumerCode: '',
    direction: '',
    responseStatus: '',
    traceId: '',
    failedOnly: false,
  });
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    keyword: '',
    stream: '',
    severity: '',
    timeRange: '24h',
  });
  const [changePage, setChangePage] = useState(currentTab === 'change-logs' ? urlPage : 1);
  const [changePageSize, setChangePageSize] = useState<PageSizeOption>(
    currentTab === 'change-logs' ? urlPageSize : PAGE_SIZE_OPTIONS[0]
  );
  const [techPage, setTechPage] = useState(currentTab === 'tech-events' ? urlPage : 1);
  const [techPageSize, setTechPageSize] = useState<PageSizeOption>(
    currentTab === 'tech-events' ? urlPageSize : PAGE_SIZE_OPTIONS[0]
  );
  const [integrationPage, setIntegrationPage] = useState(
    currentTab === 'integration-logs' ? urlPage : 1
  );
  const [integrationPageSize, setIntegrationPageSize] = useState<PageSizeOption>(
    currentTab === 'integration-logs' ? urlPageSize : PAGE_SIZE_OPTIONS[0]
  );
  const [searchLimit, setSearchLimit] = useState<PageSizeOption>(
    currentTab === 'log-search' ? urlSearchLimit : PAGE_SIZE_OPTIONS[0]
  );

  const [changePanel, setChangePanel] = useState<PagedPanelState<ChangeLogRecord>>(emptyPagedPanel);
  const [techPanel, setTechPanel] = useState<PagedPanelState<TechEventRecord>>(emptyPagedPanel);
  const [integrationPanel, setIntegrationPanel] =
    useState<PagedPanelState<IntegrationLogRecord>>(emptyPagedPanel);
  const [searchPanel, setSearchPanel] = useState<SearchPanelState>(emptySearchPanel);
  const [adapterSummary, setAdapterSummary] = useState<AdapterSummaryState>({
    data: [],
    loading: false,
    error: null,
  });
  const [adapterNotice, setAdapterNotice] = useState<string | null>(null);
  const [openingAdapterCode, setOpeningAdapterCode] = useState<string | null>(null);
  const [selectedChangeLog, setSelectedChangeLog] = useState<ChangeLogRecord | null>(null);
  const [selectedTechEvent, setSelectedTechEvent] = useState<TechEventRecord | null>(null);
  const previousChangeFilters = useRef(changeFilters);
  const previousTechFilters = useRef(techFilters);
  const previousIntegrationFilters = useRef(integrationFilters);

  useEffect(() => {
    setActiveTab(currentTab);

    if (currentTab === 'change-logs') {
      setChangePage(urlPage);
      setChangePageSize(urlPageSize);
    }

    if (currentTab === 'tech-events') {
      setTechPage(urlPage);
      setTechPageSize(urlPageSize);
    }

    if (currentTab === 'integration-logs') {
      setIntegrationPage(urlPage);
      setIntegrationPageSize(urlPageSize);
    }

    if (currentTab === 'log-search') {
      setSearchLimit(urlSearchLimit);
    }
  }, [currentTab, urlPage, urlPageSize, urlSearchLimit]);

  useEffect(() => {
    const activePage =
      activeTab === 'change-logs'
        ? changePage
        : activeTab === 'tech-events'
          ? techPage
          : activeTab === 'integration-logs'
            ? integrationPage
            : 1;
    const activePageSize =
      activeTab === 'change-logs'
        ? changePageSize
        : activeTab === 'tech-events'
          ? techPageSize
          : activeTab === 'integration-logs'
            ? integrationPageSize
            : PAGE_SIZE_OPTIONS[0];

    router.replace(
      `${pathname}${buildObservabilityQuery({
        tab: activeTab,
        page: activePage,
        pageSize: activePageSize,
        limit: searchLimit,
        includeDefaultLimit: hasExplicitSearchLimitParam,
      })}`
    );
  }, [
    activeTab,
    changePage,
    changePageSize,
    integrationPage,
    integrationPageSize,
    pathname,
    router,
    hasExplicitSearchLimitParam,
    searchLimit,
    techPage,
    techPageSize,
  ]);

  async function loadChangeLogs() {
    setChangePanel((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const response = await listChangeLogs(request, {
        ...changeFilters,
        page: changePage,
        pageSize: changePageSize,
      });

      setChangePanel({
        data: response.items,
        pagination: buildPaginationMeta(response.total, response.page, response.pageSize),
        loading: false,
        error: null,
      });
    } catch (reason) {
      setChangePanel({
        data: [],
        pagination: buildPaginationMeta(0, changePage, changePageSize),
        loading: false,
        error: getErrorMessage(reason, copy.state.loadChangeLogsError),
      });
    }
  }

  async function loadTechEvents() {
    setTechPanel((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const response = await listTechEvents(request, {
        ...techFilters,
        page: techPage,
        pageSize: techPageSize,
      });

      setTechPanel({
        data: response.items,
        pagination: buildPaginationMeta(response.total, response.page, response.pageSize),
        loading: false,
        error: null,
      });
    } catch (reason) {
      setTechPanel({
        data: [],
        pagination: buildPaginationMeta(0, techPage, techPageSize),
        loading: false,
        error: getErrorMessage(reason, copy.state.loadTechEventsError),
      });
    }
  }

  async function loadIntegrationLogs() {
    setIntegrationPanel((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const response = await listIntegrationLogs(request, {
        consumerCode: integrationFilters.consumerCode,
        direction: integrationFilters.direction,
        responseStatus: integrationFilters.responseStatus
          ? Number(integrationFilters.responseStatus)
          : undefined,
        traceId: integrationFilters.traceId,
        failedOnly: integrationFilters.failedOnly,
        page: integrationPage,
        pageSize: integrationPageSize,
      });

      setIntegrationPanel({
        data: response.items,
        pagination: buildPaginationMeta(response.total, response.page, response.pageSize),
        loading: false,
        error: null,
      });
    } catch (reason) {
      setIntegrationPanel({
        data: [],
        pagination: buildPaginationMeta(0, integrationPage, integrationPageSize),
        loading: false,
        error: getErrorMessage(reason, copy.state.loadIntegrationLogsError),
      });
    }
  }

  async function loadLogSearch() {
    setSearchPanel((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const response = await searchLogs(request, {
        keyword: searchFilters.keyword || undefined,
        stream: searchFilters.stream || undefined,
        severity: searchFilters.severity || undefined,
        timeRange: searchFilters.timeRange,
        limit: searchLimit,
      });

      setSearchPanel({
        data: response.entries,
        loading: false,
        error: null,
      });
    } catch (reason) {
      setSearchPanel({
        data: [],
        loading: false,
        error: getErrorMessage(reason, copy.state.loadLogSearchError),
      });
    }
  }

  async function loadAdapterSummary() {
    if (!isAcWorkspace) {
      return;
    }

    setAdapterSummary((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const response = await listObservabilityAdapterSummary(request, { environment: 'local' });

      setAdapterSummary({
        data: response,
        loading: false,
        error: null,
      });
    } catch (reason) {
      setAdapterSummary({
        data: [],
        loading: false,
        error: getErrorMessage(
          reason,
          pickLocaleText(locale, {
            en: 'External observability readiness could not load.',
            zh_HANS: '外部可观测性就绪状态加载失败。',
            zh_HANT: '外部可觀測性就緒狀態載入失敗。',
            ja: '外部可観測性の準備状況を読み込めませんでした。',
            ko: '외부 관측 준비 상태를 로드하지 못했습니다.',
            fr: 'Impossible de charger la préparation observabilité externe.',
          })
        ),
      });
    }
  }

  async function handleOpenAdapter(adapterCode: string) {
    setAdapterNotice(null);
    setOpeningAdapterCode(adapterCode);

    try {
      const readiness = await readObservabilityAdapterDeepLink(request, adapterCode, {
        environment: 'local',
      });

      if (readiness.state === 'accepted' && readiness.url) {
        window.open(readiness.url, '_blank', 'noopener,noreferrer');
        return;
      }

      setAdapterNotice(
        `${pickLocaleText(locale, {
          en: 'Deep link unavailable',
          zh_HANS: '深链不可用',
          zh_HANT: '深層連結不可用',
          ja: '深リンクは利用できません',
          ko: '딥링크를 사용할 수 없습니다',
          fr: 'Lien profond indisponible',
        })}: ${formatCodeLabel(readiness.state)}`
      );
    } catch (reason) {
      setAdapterNotice(
        getErrorMessage(
          reason,
          pickLocaleText(locale, {
            en: 'Deep link check failed.',
            zh_HANS: '深链检查失败。',
            zh_HANT: '深層連結檢查失敗。',
            ja: '深リンクの確認に失敗しました。',
            ko: '딥링크 확인에 실패했습니다.',
            fr: 'La vérification du lien profond a échoué.',
          })
        )
      );
    } finally {
      setOpeningAdapterCode(null);
    }
  }

  useEffect(() => {
    if (previousChangeFilters.current === changeFilters) {
      return;
    }

    previousChangeFilters.current = changeFilters;
    setChangePage(1);
  }, [changeFilters]);

  useEffect(() => {
    if (previousTechFilters.current === techFilters) {
      return;
    }

    previousTechFilters.current = techFilters;
    setTechPage(1);
  }, [techFilters]);

  useEffect(() => {
    if (previousIntegrationFilters.current === integrationFilters) {
      return;
    }

    previousIntegrationFilters.current = integrationFilters;
    setIntegrationPage(1);
  }, [integrationFilters]);

  useEffect(() => {
    if (activeTab === 'change-logs') {
      void loadChangeLogs();
    }

    if (activeTab === 'tech-events') {
      void loadTechEvents();
    }

    if (activeTab === 'integration-logs') {
      void loadIntegrationLogs();
    }

    if (activeTab === 'log-search') {
      void loadLogSearch();
    }
  }, [
    activeTab,
    changeFilters,
    changePage,
    changePageSize,
    copy.state.loadChangeLogsError,
    copy.state.loadIntegrationLogsError,
    copy.state.loadLogSearchError,
    copy.state.loadTechEventsError,
    integrationFilters,
    integrationPage,
    integrationPageSize,
    searchFilters,
    searchLimit,
    techFilters,
    techPage,
    techPageSize,
  ]);

  useEffect(() => {
    if (isAcWorkspace) {
      void loadAdapterSummary();
    } else {
      setAdapterSummary({ data: [], loading: false, error: null });
    }
  }, [isAcWorkspace, request]);

  const activeCount = useMemo(() => {
    if (activeTab === 'change-logs') {
      return changePanel.pagination.totalCount;
    }

    if (activeTab === 'tech-events') {
      return techPanel.pagination.totalCount;
    }

    if (activeTab === 'integration-logs') {
      return integrationPanel.pagination.totalCount;
    }

    return searchPanel.data.length;
  }, [
    activeTab,
    changePanel.pagination.totalCount,
    integrationPanel.pagination.totalCount,
    searchPanel.data.length,
    techPanel.pagination.totalCount,
  ]);

  const pageSizeLabel = pickLocaleText(locale, {
    en: 'Rows per page',
    zh_HANS: '每页条数',
    zh_HANT: '每頁筆數',
    ja: '1 ページの件数',
    ko: '페이지당 행 수',
    fr: 'Lignes par page',
  });
  const previousPageLabel = pickLocaleText(locale, {
    en: 'Previous',
    zh_HANS: '上一页',
    zh_HANT: '上一頁',
    ja: '前へ',
    ko: '이전',
    fr: 'Précédent',
  });
  const nextPageLabel = pickLocaleText(locale, {
    en: 'Next',
    zh_HANS: '下一页',
    zh_HANT: '下一頁',
    ja: '次へ',
    ko: '다음',
    fr: 'Suivant',
  });
  const viewDetailsLabel = pickLocaleText(locale, {
    en: 'View details',
    zh_HANS: '查看详情',
    zh_HANT: '查看詳情',
    ja: '詳細を表示',
    ko: '상세 보기',
    fr: 'Voir les détails',
  });
  const closeDetailsLabel = pickLocaleText(locale, {
    en: 'Close details drawer',
    zh_HANS: '关闭详情抽屉',
    zh_HANT: '關閉詳情抽屜',
    ja: '詳細ドロワーを閉じる',
    ko: '상세 서랍 닫기',
    fr: 'Fermer le panneau de détails',
  });
  const detailsLabel = pickLocaleText(locale, {
    en: 'Details',
    zh_HANS: '详情',
    zh_HANT: '詳情',
    ja: '詳細',
    ko: '상세',
    fr: 'Détails',
  });
  const actorLabel = pickLocaleText(locale, {
    en: 'Actor',
    zh_HANS: '操作人',
    zh_HANT: '操作者',
    ja: '実行者',
    ko: '행위자',
    fr: 'Acteur',
  });
  const requestLabel = pickLocaleText(locale, {
    en: 'Request',
    zh_HANS: '请求',
    zh_HANT: '請求',
    ja: 'リクエスト',
    ko: '요청',
    fr: 'Requête',
  });
  const networkLabel = pickLocaleText(locale, {
    en: 'Network',
    zh_HANS: '网络',
    zh_HANT: '網路',
    ja: 'ネットワーク',
    ko: '네트워크',
    fr: 'Réseau',
  });
  const ipLabel = pickLocaleText(locale, {
    en: 'IP',
    zh_HANS: 'IP',
    zh_HANT: 'IP',
    ja: 'IP',
    ko: 'IP',
    fr: 'IP',
  });
  const sessionLabel = pickLocaleText(locale, {
    en: 'Session',
    zh_HANS: '会话',
    zh_HANT: '工作階段',
    ja: 'セッション',
    ko: '세션',
    fr: 'Session',
  });
  const fingerprintLabel = pickLocaleText(locale, {
    en: 'Fingerprint',
    zh_HANS: '指纹',
    zh_HANT: '指紋',
    ja: 'フィンガープリント',
    ko: '핑거프린트',
    fr: 'Empreinte',
  });
  const traceLabel = pickLocaleText(locale, {
    en: 'Trace',
    zh_HANS: '追踪',
    zh_HANT: '追蹤',
    ja: 'トレース',
    ko: '추적',
    fr: 'Trace',
  });
  const spanLabel = pickLocaleText(locale, {
    en: 'Span',
    zh_HANS: 'Span',
    zh_HANT: 'Span',
    ja: 'Span',
    ko: 'Span',
    fr: 'Span',
  });
  const sourceLabel = pickLocaleText(locale, {
    en: 'Source',
    zh_HANS: '来源',
    zh_HANT: '來源',
    ja: 'ソース',
    ko: '소스',
    fr: 'Source',
  });
  const errorLabel = pickLocaleText(locale, {
    en: 'Error',
    zh_HANS: '错误',
    zh_HANT: '錯誤',
    ja: 'エラー',
    ko: '오류',
    fr: 'Erreur',
  });
  const payloadLabel = pickLocaleText(locale, {
    en: 'Payload',
    zh_HANS: 'Payload',
    zh_HANT: 'Payload',
    ja: 'Payload',
    ko: 'Payload',
    fr: 'Payload',
  });
  const changePageRange = getPaginationRange(changePanel.pagination, changePanel.data.length);
  const changePaginationLabel = pickLocaleText(locale, {
    en: `Page ${changePanel.pagination.page} of ${changePanel.pagination.totalPages}`,
    zh_HANS: `第 ${changePanel.pagination.page} / ${changePanel.pagination.totalPages} 页`,
    zh_HANT: `第 ${changePanel.pagination.page} / ${changePanel.pagination.totalPages} 頁`,
    ja: `${changePanel.pagination.totalPages} ページ中 ${changePanel.pagination.page} ページ`,
    ko: `${changePanel.pagination.totalPages}페이지 중 ${changePanel.pagination.page}페이지`,
    fr: `Page ${changePanel.pagination.page} sur ${changePanel.pagination.totalPages}`,
  });
  const changePaginationRangeLabel =
    changePanel.pagination.totalCount === 0
      ? pickLocaleText(locale, {
          en: 'No change logs are currently visible.',
          zh_HANS: '当前没有变更日志。',
          zh_HANT: '目前沒有變更日誌。',
          ja: '現在表示できる変更ログはありません。',
          ko: '현재 표시할 변경 로그가 없습니다.',
          fr: 'Aucun journal des modifications visible actuellement.',
        })
      : pickLocaleText(locale, {
          en: `Showing ${changePageRange.start}-${changePageRange.end} of ${changePanel.pagination.totalCount}`,
          zh_HANS: `显示第 ${changePageRange.start}-${changePageRange.end} 条，共 ${changePanel.pagination.totalCount} 条`,
          zh_HANT: `顯示第 ${changePageRange.start}-${changePageRange.end} 筆，共 ${changePanel.pagination.totalCount} 筆`,
          ja: `${changePanel.pagination.totalCount} 件中 ${changePageRange.start}-${changePageRange.end} 件を表示`,
          ko: `${changePanel.pagination.totalCount}개 중 ${changePageRange.start}-${changePageRange.end}개 표시`,
          fr: `Affichage de ${changePageRange.start} à ${changePageRange.end} sur ${changePanel.pagination.totalCount}`,
        });
  const techPageRange = getPaginationRange(techPanel.pagination, techPanel.data.length);
  const techPaginationLabel = pickLocaleText(locale, {
    en: `Page ${techPanel.pagination.page} of ${techPanel.pagination.totalPages}`,
    zh_HANS: `第 ${techPanel.pagination.page} / ${techPanel.pagination.totalPages} 页`,
    zh_HANT: `第 ${techPanel.pagination.page} / ${techPanel.pagination.totalPages} 頁`,
    ja: `${techPanel.pagination.totalPages} ページ中 ${techPanel.pagination.page} ページ`,
    ko: `${techPanel.pagination.totalPages}페이지 중 ${techPanel.pagination.page}페이지`,
    fr: `Page ${techPanel.pagination.page} sur ${techPanel.pagination.totalPages}`,
  });
  const techPaginationRangeLabel =
    techPanel.pagination.totalCount === 0
      ? pickLocaleText(locale, {
          en: 'No technical events are currently visible.',
          zh_HANS: '当前没有技术事件。',
          zh_HANT: '目前沒有技術事件。',
          ja: '現在表示できる技術イベントはありません。',
          ko: '현재 표시할 기술 이벤트가 없습니다.',
          fr: 'Aucun événement technique visible actuellement.',
        })
      : pickLocaleText(locale, {
          en: `Showing ${techPageRange.start}-${techPageRange.end} of ${techPanel.pagination.totalCount}`,
          zh_HANS: `显示第 ${techPageRange.start}-${techPageRange.end} 条，共 ${techPanel.pagination.totalCount} 条`,
          zh_HANT: `顯示第 ${techPageRange.start}-${techPageRange.end} 筆，共 ${techPanel.pagination.totalCount} 筆`,
          ja: `${techPanel.pagination.totalCount} 件中 ${techPageRange.start}-${techPageRange.end} 件を表示`,
          ko: `${techPanel.pagination.totalCount}개 중 ${techPageRange.start}-${techPageRange.end}개 표시`,
          fr: `Affichage de ${techPageRange.start} à ${techPageRange.end} sur ${techPanel.pagination.totalCount}`,
        });
  const integrationPageRange = getPaginationRange(
    integrationPanel.pagination,
    integrationPanel.data.length
  );
  const integrationPaginationLabel = pickLocaleText(locale, {
    en: `Page ${integrationPanel.pagination.page} of ${integrationPanel.pagination.totalPages}`,
    zh_HANS: `第 ${integrationPanel.pagination.page} / ${integrationPanel.pagination.totalPages} 页`,
    zh_HANT: `第 ${integrationPanel.pagination.page} / ${integrationPanel.pagination.totalPages} 頁`,
    ja: `${integrationPanel.pagination.totalPages} ページ中 ${integrationPanel.pagination.page} ページ`,
    ko: `${integrationPanel.pagination.totalPages}페이지 중 ${integrationPanel.pagination.page}페이지`,
    fr: `Page ${integrationPanel.pagination.page} sur ${integrationPanel.pagination.totalPages}`,
  });
  const integrationPaginationRangeLabel =
    integrationPanel.pagination.totalCount === 0
      ? pickLocaleText(locale, {
          en: 'No integration logs are currently visible.',
          zh_HANS: '当前没有集成日志。',
          zh_HANT: '目前沒有整合日誌。',
          ja: '現在表示できる統合ログはありません。',
          ko: '현재 표시할 통합 로그가 없습니다.',
          fr: 'Aucun journal d’intégration visible actuellement.',
        })
      : pickLocaleText(locale, {
          en: `Showing ${integrationPageRange.start}-${integrationPageRange.end} of ${integrationPanel.pagination.totalCount}`,
          zh_HANS: `显示第 ${integrationPageRange.start}-${integrationPageRange.end} 条，共 ${integrationPanel.pagination.totalCount} 条`,
          zh_HANT: `顯示第 ${integrationPageRange.start}-${integrationPageRange.end} 筆，共 ${integrationPanel.pagination.totalCount} 筆`,
          ja: `${integrationPanel.pagination.totalCount} 件中 ${integrationPageRange.start}-${integrationPageRange.end} 件を表示`,
          ko: `${integrationPanel.pagination.totalCount}개 중 ${integrationPageRange.start}-${integrationPageRange.end}개 표시`,
          fr: `Affichage de ${integrationPageRange.start} à ${integrationPageRange.end} sur ${integrationPanel.pagination.totalCount}`,
        });

  return (
    <div
      className="space-y-4"
      data-observability-workspace={workspaceKind}
      data-external-observability-absent={isAcWorkspace ? 'false' : 'true'}
    >
      <GlassSurface className="p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-slate-600 uppercase">
              <Activity className="h-3.5 w-3.5" />
              {`${copy.header.eyebrowPrefix} / ${workspaceLabel} / ${copy.header.title}`}
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-slate-950">{copy.header.title}</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                {copy.header.description}
              </p>
            </div>
          </div>

          <dl className="flex flex-wrap gap-2 text-xs">
            {[
              [copy.summary.tenantLabel, workspaceName],
              [copy.summary.activeTabLabel, getObservabilityTabLabel(locale, activeTab)],
              [copy.summary.visibleRowsLabel, String(activeCount)],
              [copy.summary.scopeLabel, workspaceLabel],
            ].map(([label, value]) => (
              <div
                key={label}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white/80 px-3 py-2"
              >
                <dt className="font-semibold tracking-[0.12em] text-slate-500 uppercase">
                  {label}
                </dt>
                <dd className="font-semibold text-slate-950">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </GlassSurface>

      {SHOW_AC_READINESS_HANDOFF && isAcWorkspace ? (
        <GlassSurface
          className="space-y-4 p-4"
          data-observability-adapter-summary="ac-readiness-handoff"
        >
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                {pickLocaleText(locale, {
                  en: 'AC only',
                  zh_HANS: '仅 AC',
                  zh_HANT: '僅 AC',
                  ja: 'AC のみ',
                  ko: 'AC 전용',
                  fr: 'AC uniquement',
                })}
              </div>
              <h2 className="text-base font-semibold text-slate-950">
                {pickLocaleText(locale, {
                  en: 'External observability readiness',
                  zh_HANS: '外部可观测性就绪状态',
                  zh_HANT: '外部可觀測性就緒狀態',
                  ja: '外部可観測性の準備状況',
                  ko: '외부 관측 준비 상태',
                  fr: 'Préparation observabilité externe',
                })}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                {pickLocaleText(locale, {
                  en: 'This secondary strip reads Phase 5 adapter status and SSO-gated handoff state. Product audit logs remain the primary workbench below.',
                  zh_HANS:
                    '此辅助区域读取 Phase 5 适配器状态与 SSO 门控跳转状态。下方产品审计日志仍是主要工作台。',
                  zh_HANT:
                    '此輔助區域讀取 Phase 5 轉接器狀態與 SSO 門控跳轉狀態。下方產品稽核日誌仍是主要工作台。',
                  ja: 'この補助領域は Phase 5 アダプター状態と SSO ゲート付き受け渡し状態を読みます。下の製品監査ログが主な作業台です。',
                  ko: '이 보조 영역은 Phase 5 어댑터 상태와 SSO 게이트 핸드오프 상태를 읽습니다. 아래 제품 감사 로그가 기본 작업대입니다.',
                  fr: 'Cette zone secondaire lit l’état des adaptateurs Phase 5 et des liens protégés par SSO. Les journaux d’audit produit restent l’espace principal ci-dessous.',
                })}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              onClick={() => void loadAdapterSummary()}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {pickLocaleText(locale, {
                en: 'Refresh',
                zh_HANS: '刷新',
                zh_HANT: '重新整理',
                ja: '更新',
                ko: '새로고침',
                fr: 'Actualiser',
              })}
            </button>
          </div>

          {adapterNotice ? (
            <div
              className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800"
              role="status"
              aria-live="polite"
            >
              {adapterNotice}
            </div>
          ) : null}

          {adapterSummary.error ? (
            <StateView
              status="error"
              title={pickLocaleText(locale, {
                en: 'Adapter summary unavailable',
                zh_HANS: '适配器摘要不可用',
                zh_HANT: '轉接器摘要不可用',
                ja: 'アダプター概要を利用できません',
                ko: '어댑터 요약을 사용할 수 없습니다',
                fr: 'Résumé adaptateur indisponible',
              })}
              description={adapterSummary.error ?? undefined}
              action={
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  onClick={() => void loadAdapterSummary()}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  {pickLocaleText(locale, {
                    en: 'Retry',
                    zh_HANS: '重试',
                    zh_HANT: '重試',
                    ja: '再試行',
                    ko: '다시 시도',
                    fr: 'Réessayer',
                  })}
                </button>
              }
            />
          ) : null}

          {!adapterSummary.error ? (
            <div
              className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
              data-observability-adapter-cards="safe-summary-no-iframe"
            >
              {adapterSummary.loading ? (
                <StateView
                  status="unavailable"
                  title={pickLocaleText(locale, {
                    en: 'Loading adapter readiness',
                    zh_HANS: '正在加载适配器就绪状态',
                    zh_HANT: '正在載入轉接器就緒狀態',
                    ja: 'アダプター準備状況を読み込み中',
                    ko: '어댑터 준비 상태 로드 중',
                    fr: 'Chargement de la préparation adaptateur',
                  })}
                  description={copy.header.description}
                />
              ) : null}
              {!adapterSummary.loading && adapterSummary.data.length === 0 ? (
                <StateView
                  status="empty"
                  title={pickLocaleText(locale, {
                    en: 'No adapters returned',
                    zh_HANS: '未返回适配器',
                    zh_HANT: '未傳回轉接器',
                    ja: 'アダプターが返されませんでした',
                    ko: '반환된 어댑터가 없습니다',
                    fr: 'Aucun adaptateur retourné',
                  })}
                  description={copy.header.description}
                />
              ) : null}
              {!adapterSummary.loading
                ? adapterSummary.data.map((item) => (
                    <article
                      key={item.definition.code}
                      className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
                      data-observability-adapter-code={item.definition.code}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <h3 className="truncate text-sm font-semibold text-slate-950">
                            {pickLocaleText(locale, item.definition.localizedLabel)}
                          </h3>
                          <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                            {formatCodeLabel(item.definition.signalFamily)}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`${pickLocaleText(locale, {
                            en: 'Open external observability handoff',
                            zh_HANS: '打开外部可观测性交接',
                            zh_HANT: '開啟外部可觀測性交接',
                            ja: '外部可観測性への受け渡しを開く',
                            ko: '외부 관측 핸드오프 열기',
                            fr: 'Ouvrir le relais observabilité externe',
                          })}: ${item.definition.label}`}
                          disabled={!item.definition.deepLink || openingAdapterCode === item.definition.code}
                          onClick={() => void handleOpenAdapter(item.definition.code)}
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-xs font-semibold uppercase text-slate-500">
                            {pickLocaleText(locale, {
                              en: 'Readiness',
                              zh_HANS: '就绪性',
                              zh_HANT: '就緒性',
                              ja: '準備状況',
                              ko: '준비 상태',
                              fr: 'Préparation',
                            })}
                          </dt>
                          <dd className="min-w-0">
                            <ReadinessBadge value={item.profile.readinessState} />
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-xs font-semibold uppercase text-slate-500">
                            {pickLocaleText(locale, {
                              en: 'Backend',
                              zh_HANS: '后端',
                              zh_HANT: '後端',
                              ja: 'バックエンド',
                              ko: '백엔드',
                              fr: 'Backend',
                            })}
                          </dt>
                          <dd className="min-w-0">
                            <ReadinessBadge value={item.profile.backendMode} />
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-xs font-semibold uppercase text-slate-500">SSO</dt>
                          <dd className="min-w-0">
                            <ReadinessBadge value={item.profile.ssoState} />
                          </dd>
                        </div>
                      </dl>
                    </article>
                  ))
                : null}
            </div>
          ) : null}
        </GlassSurface>
      ) : null}

      <GlassSurface className="p-2">
        <SectionTabs
          items={[
            { id: 'change-logs', label: copy.tabs.changeLogs },
            { id: 'tech-events', label: copy.tabs.techEvents },
            { id: 'integration-logs', label: copy.tabs.integrationLogs },
            { id: 'log-search', label: copy.tabs.logSearch },
          ]}
          activeId={activeTab}
          onChange={(nextTab) => setActiveTab(nextTab as ObservabilityTab)}
          ariaLabel={copy.header.title}
        />
      </GlassSurface>

      <div className={tabTransitionClassName}>
        {displayedTab === 'change-logs' ? (
          <>
            <GlassSurface className="space-y-4 p-4">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="space-y-1 xl:max-w-sm">
                  <h2 className="text-base font-semibold text-slate-950">
                    {copy.changeTable.title}
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    {copy.changeFilters.description}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[42rem]">
                  <Field label={copy.changeFilters.objectType}>
                    <input
                      value={changeFilters.objectType}
                      onChange={(event) =>
                        setChangeFilters((current) => ({
                          ...current,
                          objectType: event.target.value,
                        }))
                      }
                      placeholder={copy.changeFilters.objectTypePlaceholder}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label={copy.changeFilters.action}>
                    <select
                      value={changeFilters.action}
                      onChange={(event) =>
                        setChangeFilters((current) => ({
                          ...current,
                          action: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    >
                      {changeActionOptions.map((option) => (
                        <option key={option.value || 'all'} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={copy.changeFilters.requestId}>
                    <input
                      value={changeFilters.requestId}
                      onChange={(event) =>
                        setChangeFilters((current) => ({
                          ...current,
                          requestId: event.target.value,
                        }))
                      }
                      placeholder={copy.changeFilters.requestIdPlaceholder}
                      className={inputClassName}
                    />
                  </Field>
                </div>
                <AsyncSubmitButton
                  onClick={() => void loadChangeLogs()}
                  isPending={changePanel.loading}
                  pendingText={copy.changeFilters.pending}
                  aria-label={copy.changeFilters.refresh}
                  className="h-10 shrink-0"
                >
                  {copy.changeFilters.refresh}
                </AsyncSubmitButton>
              </div>
              {changePanel.error ? (
                <StateView
                  status="denied"
                  title={copy.changeTable.unavailableTitle}
                  description={changePanel.error}
                />
              ) : (
                <TableShell
                  ariaLabel={copy.changeTable.title}
                  caption={copy.changeTable.description}
                  columns={[...copy.changeTable.columns]}
                  dataLength={changePanel.data.length}
                  isLoading={changePanel.loading}
                  isEmpty={!changePanel.loading && changePanel.data.length === 0}
                  emptyTitle={copy.changeTable.emptyTitle}
                  emptyDescription={copy.changeTable.emptyDescription}
                >
                  {changePanel.data.map((entry) => {
                    const diffSummary = summarizeDiff(entry.diff, locale);

                    return (
                      <tr key={entry.id} className="align-top">
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-900">
                              {entry.objectName || entry.objectType}
                            </p>
                            <p className="text-xs text-slate-500">
                              {entry.objectType} / {entry.objectId}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {getObservabilityActionLabel(locale, entry.action)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {entry.operatorName || copy.common.system}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          <p className="max-w-[28rem] break-words">
                            {diffSummary || copy.common.noMessage}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          <div className="space-y-2">
                            <p>{entry.requestId || copy.common.noRequest}</p>
                            <button
                              type="button"
                              className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                              onClick={() => setSelectedChangeLog(entry)}
                            >
                              {viewDetailsLabel}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {formatObservabilityDateTime(
                            locale,
                            entry.occurredAt,
                            copy.common.timeNever
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </TableShell>
              )}
              <PaginationFooter
                pagination={changePanel.pagination}
                itemCount={changePanel.data.length}
                labels={{
                  pageLabel: changePaginationLabel,
                  rangeLabel: changePaginationRangeLabel,
                  rowsPerPageLabel: pageSizeLabel,
                  pageSizeAriaLabel: pageSizeLabel,
                  previousLabel: previousPageLabel,
                  nextLabel: nextPageLabel,
                }}
                onPageChange={setChangePage}
                onPageSizeChange={(nextPageSize) => {
                  setChangePageSize(nextPageSize as PageSizeOption);
                  setChangePage(1);
                }}
                isLoading={changePanel.loading}
                className="mt-4"
              />
            </GlassSurface>
          </>
        ) : null}

        {displayedTab === 'tech-events' ? (
          <>
            <GlassSurface className="space-y-4 p-4">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="space-y-1 xl:max-w-sm">
                  <h2 className="text-base font-semibold text-slate-950">{copy.techTable.title}</h2>
                  <p className="text-sm leading-6 text-slate-600">{copy.techFilters.description}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[48rem] xl:grid-cols-4">
                  <Field label={copy.techFilters.severity}>
                    <select
                      value={techFilters.severity}
                      onChange={(event) =>
                        setTechFilters((current) => ({
                          ...current,
                          severity: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    >
                      {severityOptions.map((option) => (
                        <option key={option.value || 'all'} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={copy.techFilters.eventType}>
                    <input
                      value={techFilters.eventType}
                      onChange={(event) =>
                        setTechFilters((current) => ({
                          ...current,
                          eventType: event.target.value,
                        }))
                      }
                      placeholder={copy.techFilters.eventTypePlaceholder}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label={copy.techFilters.scope}>
                    <input
                      value={techFilters.scope}
                      onChange={(event) =>
                        setTechFilters((current) => ({
                          ...current,
                          scope: event.target.value,
                        }))
                      }
                      placeholder={copy.techFilters.scopePlaceholder}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label={copy.techFilters.traceId}>
                    <input
                      value={techFilters.traceId}
                      onChange={(event) =>
                        setTechFilters((current) => ({
                          ...current,
                          traceId: event.target.value,
                        }))
                      }
                      placeholder={copy.techFilters.traceIdPlaceholder}
                      className={inputClassName}
                    />
                  </Field>
                </div>
                <AsyncSubmitButton
                  onClick={() => void loadTechEvents()}
                  isPending={techPanel.loading}
                  pendingText={copy.techFilters.pending}
                  aria-label={copy.techFilters.refresh}
                  className="h-10 shrink-0"
                >
                  {copy.techFilters.refresh}
                </AsyncSubmitButton>
              </div>
              {techPanel.error ? (
                <StateView
                  status="denied"
                  title={copy.techTable.unavailableTitle}
                  description={techPanel.error}
                />
              ) : (
                <TableShell
                  ariaLabel={copy.techTable.title}
                  caption={copy.techTable.description}
                  columns={[...copy.techTable.columns]}
                  dataLength={techPanel.data.length}
                  isLoading={techPanel.loading}
                  isEmpty={!techPanel.loading && techPanel.data.length === 0}
                  emptyTitle={copy.techTable.emptyTitle}
                  emptyDescription={copy.techTable.emptyDescription}
                >
                  {techPanel.data.map((entry) => {
                    const context = buildTechEventContext(entry);
                    const networkSummary = [
                      context.ip ? `${ipLabel} ${context.ip}` : null,
                      context.session ? `${sessionLabel} ${context.session}` : null,
                      context.fingerprint ? `${fingerprintLabel} ${context.fingerprint}` : null,
                    ]
                      .filter(Boolean)
                      .join(' / ');

                    return (
                      <tr key={entry.id} className="align-top">
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-900">
                              {entry.eventType}
                            </p>
                            <p className="text-xs text-slate-500">
                              {actorLabel}: {context.actor || copy.common.unattributed}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {getObservabilitySeverityLabel(locale, entry.severity)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 text-sm text-slate-700">
                            <p>{entry.scope}</p>
                            <p className="text-xs text-slate-500">
                              {context.tenant || workspaceName}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-[24rem] space-y-1 text-sm text-slate-700">
                            <p className="break-words">{entry.message || copy.common.noMessage}</p>
                            <p className="text-xs break-words text-slate-500">
                              {networkSummary || `${networkLabel}: ${copy.common.noRequest}`}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          <div className="space-y-2">
                            <p>{entry.traceId || copy.common.noRequest}</p>
                            <p className="text-xs text-slate-500">
                              {requestLabel}: {context.request || copy.common.noRequest}
                            </p>
                            <button
                              type="button"
                              className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                              onClick={() => setSelectedTechEvent(entry)}
                            >
                              {viewDetailsLabel}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {formatObservabilityDateTime(
                            locale,
                            entry.occurredAt,
                            copy.common.timeNever
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </TableShell>
              )}
              <PaginationFooter
                pagination={techPanel.pagination}
                itemCount={techPanel.data.length}
                labels={{
                  pageLabel: techPaginationLabel,
                  rangeLabel: techPaginationRangeLabel,
                  rowsPerPageLabel: pageSizeLabel,
                  pageSizeAriaLabel: pageSizeLabel,
                  previousLabel: previousPageLabel,
                  nextLabel: nextPageLabel,
                }}
                onPageChange={setTechPage}
                onPageSizeChange={(nextPageSize) => {
                  setTechPageSize(nextPageSize as PageSizeOption);
                  setTechPage(1);
                }}
                isLoading={techPanel.loading}
                className="mt-4"
              />
            </GlassSurface>
          </>
        ) : null}

        {displayedTab === 'integration-logs' ? (
          <>
            <GlassSurface className="space-y-4 p-4">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="space-y-1 xl:max-w-sm">
                  <h2 className="text-base font-semibold text-slate-950">
                    {copy.integrationTable.title}
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    {copy.integrationFilters.description}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[48rem] xl:grid-cols-4">
                  <Field label={copy.integrationFilters.consumerCode}>
                    <input
                      value={integrationFilters.consumerCode}
                      onChange={(event) =>
                        setIntegrationFilters((current) => ({
                          ...current,
                          consumerCode: event.target.value,
                        }))
                      }
                      placeholder={copy.integrationFilters.consumerCodePlaceholder}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label={copy.integrationFilters.direction}>
                    <select
                      value={integrationFilters.direction}
                      onChange={(event) =>
                        setIntegrationFilters((current) => ({
                          ...current,
                          direction: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    >
                      {directionOptions.map((option) => (
                        <option key={option.value || 'all'} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={copy.integrationFilters.responseStatus}>
                    <input
                      value={integrationFilters.responseStatus}
                      onChange={(event) =>
                        setIntegrationFilters((current) => ({
                          ...current,
                          responseStatus: event.target.value,
                        }))
                      }
                      placeholder={copy.integrationFilters.responseStatusPlaceholder}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label={copy.integrationFilters.traceId}>
                    <input
                      value={integrationFilters.traceId}
                      onChange={(event) =>
                        setIntegrationFilters((current) => ({
                          ...current,
                          traceId: event.target.value,
                        }))
                      }
                      placeholder={copy.integrationFilters.traceIdPlaceholder}
                      className={inputClassName}
                    />
                  </Field>
                </div>

                <label className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={integrationFilters.failedOnly}
                    onChange={(event) =>
                      setIntegrationFilters((current) => ({
                        ...current,
                        failedOnly: event.target.checked,
                      }))
                    }
                  />
                  {copy.integrationFilters.failedOnly}
                </label>
                <AsyncSubmitButton
                  onClick={() => void loadIntegrationLogs()}
                  isPending={integrationPanel.loading}
                  pendingText={copy.integrationFilters.pending}
                  aria-label={copy.integrationFilters.refresh}
                  className="h-10 shrink-0"
                >
                  {copy.integrationFilters.refresh}
                </AsyncSubmitButton>
              </div>
              {integrationPanel.error ? (
                <StateView
                  status="denied"
                  title={copy.integrationTable.unavailableTitle}
                  description={integrationPanel.error}
                />
              ) : (
                <TableShell
                  ariaLabel={copy.integrationTable.title}
                  caption={copy.integrationTable.description}
                  columns={[...copy.integrationTable.columns]}
                  dataLength={integrationPanel.data.length}
                  isLoading={integrationPanel.loading}
                  isEmpty={!integrationPanel.loading && integrationPanel.data.length === 0}
                  emptyTitle={copy.integrationTable.emptyTitle}
                  emptyDescription={copy.integrationTable.emptyDescription}
                >
                  {integrationPanel.data.map((entry) => (
                    <tr key={entry.id} className="align-top">
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {entry.consumerCode || copy.common.unattributed}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {getObservabilityDirectionLabel(locale, entry.direction)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">{entry.endpoint}</p>
                          <p className="text-xs text-slate-500">{entry.method}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {entry.responseStatus ?? copy.common.noRequest}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {entry.latencyMs !== null
                          ? `${entry.latencyMs} ms`
                          : copy.common.latencyUnknown}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {entry.traceId || copy.common.noRequest}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {formatObservabilityDateTime(
                          locale,
                          entry.occurredAt,
                          copy.common.timeNever
                        )}
                      </td>
                    </tr>
                  ))}
                </TableShell>
              )}
              <PaginationFooter
                pagination={integrationPanel.pagination}
                itemCount={integrationPanel.data.length}
                labels={{
                  pageLabel: integrationPaginationLabel,
                  rangeLabel: integrationPaginationRangeLabel,
                  rowsPerPageLabel: pageSizeLabel,
                  pageSizeAriaLabel: pageSizeLabel,
                  previousLabel: previousPageLabel,
                  nextLabel: nextPageLabel,
                }}
                onPageChange={setIntegrationPage}
                onPageSizeChange={(nextPageSize) => {
                  setIntegrationPageSize(nextPageSize as PageSizeOption);
                  setIntegrationPage(1);
                }}
                isLoading={integrationPanel.loading}
                className="mt-4"
              />
            </GlassSurface>
          </>
        ) : null}

        {displayedTab === 'log-search' ? (
          <>
            <GlassSurface className="space-y-4 p-4">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="space-y-1 xl:max-w-sm">
                  <h2 className="text-base font-semibold text-slate-950">
                    {copy.searchTable.title}
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    {copy.searchFilters.description}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[48rem] xl:grid-cols-4">
                  <Field label={copy.searchFilters.keyword}>
                    <input
                      aria-label={copy.searchFilters.keywordAriaLabel}
                      value={searchFilters.keyword}
                      onChange={(event) =>
                        setSearchFilters((current) => ({
                          ...current,
                          keyword: event.target.value,
                        }))
                      }
                      placeholder={copy.searchFilters.keywordPlaceholder}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label={copy.searchFilters.stream}>
                    <input
                      value={searchFilters.stream}
                      onChange={(event) =>
                        setSearchFilters((current) => ({
                          ...current,
                          stream: event.target.value,
                        }))
                      }
                      placeholder={copy.searchFilters.streamPlaceholder}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label={copy.searchFilters.severity}>
                    <select
                      value={searchFilters.severity}
                      onChange={(event) =>
                        setSearchFilters((current) => ({
                          ...current,
                          severity: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    >
                      {severityOptions.map((option) => (
                        <option key={option.value || 'all'} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={copy.searchFilters.timeRange}>
                    <select
                      value={searchFilters.timeRange}
                      onChange={(event) =>
                        setSearchFilters((current) => ({
                          ...current,
                          timeRange: event.target.value,
                        }))
                      }
                      className={inputClassName}
                    >
                      <option value="15m">15m</option>
                      <option value="1h">1h</option>
                      <option value="6h">6h</option>
                      <option value="24h">24h</option>
                    </select>
                  </Field>
                </div>
                <div className="flex justify-end">
                  <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
                    {pageSizeLabel}
                    <select
                      value={searchLimit}
                      onChange={(event) =>
                        setSearchLimit(Number(event.target.value) as PageSizeOption)
                      }
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
                <AsyncSubmitButton
                  onClick={() => void loadLogSearch()}
                  isPending={searchPanel.loading}
                  pendingText={copy.searchFilters.pending}
                  aria-label={copy.searchFilters.search}
                  className="h-10 shrink-0"
                >
                  {copy.searchFilters.search}
                </AsyncSubmitButton>
              </div>
              {searchPanel.error ? (
                <StateView
                  status="denied"
                  title={copy.searchTable.unavailableTitle}
                  description={searchPanel.error}
                />
              ) : (
                <TableShell
                  ariaLabel={copy.searchTable.title}
                  caption={copy.searchTable.description}
                  columns={[...copy.searchTable.columns]}
                  dataLength={searchPanel.data.length}
                  isLoading={searchPanel.loading}
                  isEmpty={!searchPanel.loading && searchPanel.data.length === 0}
                  emptyTitle={copy.searchTable.emptyTitle}
                  emptyDescription={copy.searchTable.emptyDescription}
                >
                  {searchPanel.data.map((entry, index) => (
                    <tr key={`${entry.timestamp}-${index}`} className="align-top">
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {formatObservabilityDateTime(
                          locale,
                          entry.timestamp,
                          copy.common.timeNever
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {entry.labels.stream || copy.common.unknown}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {entry.labels.severity
                          ? getObservabilitySeverityLabel(locale, entry.labels.severity)
                          : copy.common.noRequest}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {String(
                              entry.data.message ||
                                entry.data.eventType ||
                                copy.common.structuredLogEntry
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            {entry.labels.app || 'tcrn-tms'} /{' '}
                            {entry.labels.stream || copy.common.unknown}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </TableShell>
              )}
            </GlassSurface>
          </>
        ) : null}
      </div>

      {isAcWorkspace ? (
        <GlassSurface
          className="space-y-4 p-4"
          data-observability-adapter-summary="ac-readiness-handoff"
          data-observability-secondary-region="true"
        >
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                {pickLocaleText(locale, {
                  en: 'AC only',
                  zh_HANS: '仅 AC',
                  zh_HANT: '僅 AC',
                  ja: 'AC のみ',
                  ko: 'AC 전용',
                  fr: 'AC uniquement',
                })}
              </div>
              <h2 className="text-base font-semibold text-slate-950">
                {pickLocaleText(locale, {
                  en: 'External observability readiness',
                  zh_HANS: '外部可观测性就绪状态',
                  zh_HANT: '外部可觀測性就緒狀態',
                  ja: '外部可観測性の準備状況',
                  ko: '외부 관측 준비 상태',
                  fr: 'Préparation observabilité externe',
                })}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                {pickLocaleText(locale, {
                  en: 'This secondary region reads Phase 5 adapter status and SSO-gated handoff state. Product audit logs stay above as the primary workbench.',
                  zh_HANS:
                    '此辅助区域读取 Phase 5 适配器状态与 SSO 门控跳转状态。上方产品审计日志仍是主要工作台。',
                  zh_HANT:
                    '此輔助區域讀取 Phase 5 轉接器狀態與 SSO 門控跳轉狀態。上方產品稽核日誌仍是主要工作台。',
                  ja: 'この補助領域は Phase 5 アダプター状態と SSO ゲート付き受け渡し状態を読みます。上の製品監査ログが主な作業台です。',
                  ko: '이 보조 영역은 Phase 5 어댑터 상태와 SSO 게이트 핸드오프 상태를 읽습니다. 위의 제품 감사 로그가 기본 작업대입니다.',
                  fr: 'Cette zone secondaire lit l’état des adaptateurs Phase 5 et des liens protégés par SSO. Les journaux d’audit produit restent au-dessus comme espace principal.',
                })}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              onClick={() => void loadAdapterSummary()}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {pickLocaleText(locale, {
                en: 'Refresh',
                zh_HANS: '刷新',
                zh_HANT: '重新整理',
                ja: '更新',
                ko: '새로고침',
                fr: 'Actualiser',
              })}
            </button>
          </div>

          {adapterNotice ? (
            <div
              className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800"
              role="status"
              aria-live="polite"
            >
              {adapterNotice}
            </div>
          ) : null}

          {adapterSummary.error ? (
            <StateView
              status="error"
              title={pickLocaleText(locale, {
                en: 'Adapter summary unavailable',
                zh_HANS: '适配器摘要不可用',
                zh_HANT: '轉接器摘要不可用',
                ja: 'アダプター概要を利用できません',
                ko: '어댑터 요약을 사용할 수 없습니다',
                fr: 'Résumé adaptateur indisponible',
              })}
              description={adapterSummary.error ?? undefined}
              action={
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  onClick={() => void loadAdapterSummary()}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  {pickLocaleText(locale, {
                    en: 'Retry',
                    zh_HANS: '重试',
                    zh_HANT: '重試',
                    ja: '再試行',
                    ko: '다시 시도',
                    fr: 'Réessayer',
                  })}
                </button>
              }
            />
          ) : null}

          {!adapterSummary.error ? (
            <div
              className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
              data-observability-adapter-cards="safe-summary-no-iframe"
            >
              {adapterSummary.loading ? (
                <StateView
                  status="unavailable"
                  title={pickLocaleText(locale, {
                    en: 'Loading adapter readiness',
                    zh_HANS: '正在加载适配器就绪状态',
                    zh_HANT: '正在載入轉接器就緒狀態',
                    ja: 'アダプター準備状況を読み込み中',
                    ko: '어댑터 준비 상태 로드 중',
                    fr: 'Chargement de la préparation adaptateur',
                  })}
                  description={copy.header.description}
                />
              ) : null}
              {!adapterSummary.loading && adapterSummary.data.length === 0 ? (
                <StateView
                  status="empty"
                  title={pickLocaleText(locale, {
                    en: 'No adapters returned',
                    zh_HANS: '未返回适配器',
                    zh_HANT: '未傳回轉接器',
                    ja: 'アダプターが返されませんでした',
                    ko: '반환된 어댑터가 없습니다',
                    fr: 'Aucun adaptateur retourné',
                  })}
                  description={copy.header.description}
                />
              ) : null}
              {!adapterSummary.loading
                ? adapterSummary.data.map((item) => (
                    <article
                      key={item.definition.code}
                      className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
                      data-observability-adapter-code={item.definition.code}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <h3 className="truncate text-sm font-semibold text-slate-950">
                            {pickLocaleText(locale, item.definition.localizedLabel)}
                          </h3>
                          <p className="text-xs font-medium tracking-[0.12em] text-slate-500 uppercase">
                            {formatCodeLabel(item.definition.signalFamily)}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`${pickLocaleText(locale, {
                            en: 'Open external observability handoff',
                            zh_HANS: '打开外部可观测性交接',
                            zh_HANT: '開啟外部可觀測性交接',
                            ja: '外部可観測性への受け渡しを開く',
                            ko: '외부 관측 핸드오프 열기',
                            fr: 'Ouvrir le relais observabilité externe',
                          })}: ${item.definition.label}`}
                          disabled={!item.definition.deepLink || openingAdapterCode === item.definition.code}
                          onClick={() => void handleOpenAdapter(item.definition.code)}
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      <dl className="mt-4 grid gap-3 text-sm">
                        {[
                          [
                            pickLocaleText(locale, {
                              en: 'Readiness',
                              zh_HANS: '就绪性',
                              zh_HANT: '就緒性',
                              ja: '準備状況',
                              ko: '준비 상태',
                              fr: 'Préparation',
                            }),
                            item.profile.readinessState,
                          ],
                          [
                            pickLocaleText(locale, {
                              en: 'Backend',
                              zh_HANS: '后端',
                              zh_HANT: '後端',
                              ja: 'バックエンド',
                              ko: '백엔드',
                              fr: 'Backend',
                            }),
                            item.profile.backendMode,
                          ],
                          ['SSO', item.profile.ssoState],
                        ].map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between gap-3">
                            <dt className="text-xs font-semibold text-slate-500 uppercase">
                              {label}
                            </dt>
                            <dd className="min-w-0">
                              <ReadinessBadge value={value} />
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </article>
                  ))
                : null}
            </div>
          ) : null}
        </GlassSurface>
      ) : null}

      <ActionDrawer
        open={selectedChangeLog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedChangeLog(null);
          }
        }}
        title={pickLocaleText(locale, {
          en: 'Change Log Detail',
          zh_HANS: '变更日志详情',
          zh_HANT: '變更日誌詳情',
          ja: '変更ログ詳細',
          ko: '변경 로그 상세',
          fr: 'Détail du journal des modifications',
        })}
        description={pickLocaleText(locale, {
          en: 'Review the changed object, actor, request, and complete diff.',
          zh_HANS: '查看变更对象、操作人、请求与完整差异。',
          zh_HANT: '檢視變更物件、操作者、請求與完整差異。',
          ja: '変更対象、実行者、リクエスト、完全な差分を確認します。',
          ko: '변경된 객체, 행위자, 요청 및 전체 diff를 확인합니다.',
          fr: 'Consultez l’objet modifié, l’acteur, la requête et le diff complet.',
        })}
        size="lg"
        closeButtonAriaLabel={closeDetailsLabel}
      >
        {selectedChangeLog ? (
          <div className="space-y-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              {[
                [
                  copy.changeTable.columns[0],
                  selectedChangeLog.objectName || selectedChangeLog.objectType,
                ],
                [
                  copy.changeTable.columns[1],
                  getObservabilityActionLabel(locale, selectedChangeLog.action),
                ],
                [copy.changeTable.columns[2], selectedChangeLog.operatorName || copy.common.system],
                [requestLabel, selectedChangeLog.requestId || copy.common.noRequest],
                [ipLabel, selectedChangeLog.ipAddress || copy.common.noRequest],
                [
                  copy.changeTable.columns[5],
                  formatObservabilityDateTime(
                    locale,
                    selectedChangeLog.occurredAt,
                    copy.common.timeNever
                  ),
                ],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-white/80 p-4">
                  <dt className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                    {label}
                  </dt>
                  <dd className="mt-2 text-sm font-semibold break-words text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-950">{detailsLabel}</h3>
              <pre className="max-h-[28rem] overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-xs leading-5 whitespace-pre-wrap text-slate-50">
                {formatDiffDetails(selectedChangeLog.diff, locale) ||
                  formatJsonBlock(selectedChangeLog.diff) ||
                  copy.common.noMessage}
              </pre>
            </div>
          </div>
        ) : null}
      </ActionDrawer>

      <ActionDrawer
        open={selectedTechEvent !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTechEvent(null);
          }
        }}
        title={pickLocaleText(locale, {
          en: 'Technical Event Detail',
          zh_HANS: '技术事件详情',
          zh_HANT: '技術事件詳情',
          ja: '技術イベント詳細',
          ko: '기술 이벤트 상세',
          fr: 'Détail de l’événement technique',
        })}
        description={pickLocaleText(locale, {
          en: 'Review actor, tenant, request, network, trace, and raw payload context.',
          zh_HANS: '查看操作人、租户、请求、网络、追踪与原始 payload 上下文。',
          zh_HANT: '檢視操作者、租戶、請求、網路、追蹤與原始 payload 脈絡。',
          ja: '実行者、テナント、リクエスト、ネットワーク、トレース、生ペイロードを確認します。',
          ko: '행위자, 테넌트, 요청, 네트워크, 추적 및 원시 payload 컨텍스트를 확인합니다.',
          fr: 'Consultez acteur, locataire, requête, réseau, trace et payload brut.',
        })}
        size="lg"
        closeButtonAriaLabel={closeDetailsLabel}
      >
        {selectedTechEvent ? (
          <div className="space-y-6">
            {(() => {
              const context = buildTechEventContext(selectedTechEvent);
              const metadata = [
                [copy.techTable.columns[0], selectedTechEvent.eventType],
                [
                  copy.techTable.columns[1],
                  getObservabilitySeverityLabel(locale, selectedTechEvent.severity),
                ],
                [actorLabel, context.actor || copy.common.unattributed],
                [copy.summary.tenantLabel, context.tenant || workspaceName],
                [requestLabel, context.request || copy.common.noRequest],
                [ipLabel, context.ip || copy.common.noRequest],
                [sessionLabel, context.session || copy.common.noRequest],
                [fingerprintLabel, context.fingerprint || copy.common.noRequest],
                [traceLabel, selectedTechEvent.traceId || copy.common.noRequest],
                [spanLabel, selectedTechEvent.spanId || copy.common.noRequest],
                [sourceLabel, selectedTechEvent.source || copy.common.noRequest],
                [
                  copy.techTable.columns[5],
                  formatObservabilityDateTime(
                    locale,
                    selectedTechEvent.occurredAt,
                    copy.common.timeNever
                  ),
                ],
              ];

              return (
                <>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    {metadata.map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-lg border border-slate-200 bg-white/80 p-4"
                      >
                        <dt className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                          {label}
                        </dt>
                        <dd className="mt-2 text-sm font-semibold break-words text-slate-900">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {selectedTechEvent.errorCode || selectedTechEvent.errorStack ? (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-slate-950">{errorLabel}</h3>
                      <pre className="max-h-40 overflow-auto rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs leading-5 whitespace-pre-wrap text-rose-950">
                        {[selectedTechEvent.errorCode, selectedTechEvent.errorStack]
                          .filter(Boolean)
                          .join('\n\n')}
                      </pre>
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-950">{payloadLabel}</h3>
                    <pre className="max-h-[28rem] overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-xs leading-5 whitespace-pre-wrap text-slate-50">
                      {formatJsonBlock(context.raw) || copy.common.noMessage}
                    </pre>
                  </div>
                </>
              );
            })()}
          </div>
        ) : null}
      </ActionDrawer>
    </div>
  );
}
