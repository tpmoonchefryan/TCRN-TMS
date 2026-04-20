'use client';

import { Activity } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  type ChangeLogRecord,
  type IntegrationLogRecord,
  listChangeLogs,
  listIntegrationLogs,
  listTechEvents,
  type LogSearchEntry,
  type ObservabilityTab,
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
} from '@/platform/runtime/pagination/pagination';
import { useSession } from '@/platform/runtime/session/session-provider';
import { AsyncSubmitButton, FormSection, GlassSurface, StateView, TableShell } from '@/platform/ui';

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

type SearchPanelState = {
  data: LogSearchEntry[];
  loading: boolean;
  error: string | null;
};

interface SummaryCardProps {
  label: string;
  value: string;
  hint: string;
}

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

function summarizeDiff(diff: ChangeLogRecord['diff'], locale: 'en' | 'zh' | 'ja' | 'zh_HANS' | 'zh_HANT' | 'ko' | 'fr') {
  if (!diff) {
    return null;
  }

  const changedKeys = Object.keys(diff);

  if (changedKeys.length === 0) {
    return null;
  }

  if (changedKeys.length <= 3) {
    return changedKeys.join(', ');
  }

  const summary = changedKeys.slice(0, 3).join(', ');
  const extraCount = changedKeys.length - 3;

  return pickLocaleText(locale, {
    en: `${summary} +${extraCount} more`,
    zh_HANS: `${summary} 等另外 ${extraCount} 项`,
    zh_HANT: `${summary} 等另外 ${extraCount} 項`,
    ja: `${summary} ほか ${extraCount} 件`,
    ko: `${summary} 외 ${extraCount}건`,
    fr: `${summary} et ${extraCount} de plus`,
  });
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

function buildTabQuery(tab: ObservabilityTab) {
  const params = new URLSearchParams();
  params.set('tab', tab);
  return `?${params.toString()}`;
}

function SummaryCard({ label, value, hint }: Readonly<SummaryCardProps>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>
    </div>
  );
}

function TabButton({
  label,
  isActive,
  onClick,
}: Readonly<{
  label: string;
  isActive: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        isActive
          ? 'bg-slate-950 text-white shadow-sm'
          : 'border border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white'
      }`}
    >
      {label}
    </button>
  );
}

function Field({ label, hint, children }: Readonly<FieldProps>) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      {children}
      {hint ? <span className="block text-xs leading-5 text-slate-500">{hint}</span> : null}
    </label>
  );
}

function PaginationFooter({
  label,
  rangeLabel,
  pageSizeLabel,
  previousLabel,
  nextLabel,
  pageSize,
  onPageSizeChange,
  onPrevious,
  onNext,
  hasPrev,
  hasNext,
  isLoading,
}: Readonly<{
  label: string;
  rangeLabel: string;
  pageSizeLabel: string;
  previousLabel: string;
  nextLabel: string;
  pageSize: PageSizeOption;
  onPageSizeChange: (pageSize: PageSizeOption) => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  isLoading: boolean;
}>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-500">{rangeLabel}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
          {pageSizeLabel}
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value) as PageSizeOption)}
            className="bg-transparent text-sm outline-none"
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
          onClick={onPrevious}
          disabled={!hasPrev || isLoading}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {previousLabel}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext || isLoading}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

const inputClassName =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40';

export function ObservabilityScreen({
  tenantId: _tenantId,
  workspaceKind = 'tenant',
}: Readonly<{
  tenantId: string;
  workspaceKind?: 'tenant' | 'ac';
}>) {
  const { request, session } = useSession();
  const { selectedLocale, copy, changeActionOptions, severityOptions, directionOptions } = useObservabilityCopy();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAcWorkspace = workspaceKind === 'ac';
  const workspaceLabel = isAcWorkspace
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
        fr: 'Locataire',
      });
  const workspaceName = session?.tenantName || workspaceLabel;

  const currentTab = resolveInitialTab(searchParams.get('tab'));

  const [activeTab, setActiveTab] = useState<ObservabilityTab>(currentTab);
  const {
    displayedValue: displayedTab,
    transitionClassName: tabTransitionClassName,
  } = useFadeSwapState(activeTab);
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
  const [changePage, setChangePage] = useState(1);
  const [changePageSize, setChangePageSize] = useState<PageSizeOption>(PAGE_SIZE_OPTIONS[0]);
  const [techPage, setTechPage] = useState(1);
  const [techPageSize, setTechPageSize] = useState<PageSizeOption>(PAGE_SIZE_OPTIONS[0]);
  const [integrationPage, setIntegrationPage] = useState(1);
  const [integrationPageSize, setIntegrationPageSize] = useState<PageSizeOption>(PAGE_SIZE_OPTIONS[0]);
  const [searchLimit, setSearchLimit] = useState<PageSizeOption>(PAGE_SIZE_OPTIONS[0]);

  const [changePanel, setChangePanel] = useState<PagedPanelState<ChangeLogRecord>>(emptyPagedPanel);
  const [techPanel, setTechPanel] = useState<PagedPanelState<TechEventRecord>>(emptyPagedPanel);
  const [integrationPanel, setIntegrationPanel] = useState<PagedPanelState<IntegrationLogRecord>>(emptyPagedPanel);
  const [searchPanel, setSearchPanel] = useState<SearchPanelState>(emptySearchPanel);

  useEffect(() => {
    setActiveTab(currentTab);
  }, [currentTab]);

  useEffect(() => {
    router.replace(`${pathname}${buildTabQuery(activeTab)}`);
  }, [activeTab, pathname, router]);

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
        responseStatus: integrationFilters.responseStatus ? Number(integrationFilters.responseStatus) : undefined,
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

  useEffect(() => {
    setChangePage(1);
  }, [changeFilters]);

  useEffect(() => {
    setTechPage(1);
  }, [techFilters]);

  useEffect(() => {
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
  }, [activeTab, changePanel.pagination.totalCount, integrationPanel.pagination.totalCount, searchPanel.data.length, techPanel.pagination.totalCount]);

  const pageSizeLabel = pickLocaleText(selectedLocale, {
    en: 'Rows per page',
    zh_HANS: '每页条数',
    zh_HANT: '每頁筆數',
    ja: '1 ページの件数',
    ko: '페이지당 행 수',
    fr: 'Lignes par page',
  });
  const previousPageLabel = pickLocaleText(selectedLocale, {
    en: 'Previous',
    zh_HANS: '上一页',
    zh_HANT: '上一頁',
    ja: '前へ',
    ko: '이전',
    fr: 'Précédent',
  });
  const nextPageLabel = pickLocaleText(selectedLocale, {
    en: 'Next',
    zh_HANS: '下一页',
    zh_HANT: '下一頁',
    ja: '次へ',
    ko: '다음',
    fr: 'Suivant',
  });
  const changePageRange = getPaginationRange(changePanel.pagination, changePanel.data.length);
  const changePaginationLabel = pickLocaleText(selectedLocale, {
    en: `Page ${changePanel.pagination.page} of ${changePanel.pagination.totalPages}`,
    zh_HANS: `第 ${changePanel.pagination.page} / ${changePanel.pagination.totalPages} 页`,
    zh_HANT: `第 ${changePanel.pagination.page} / ${changePanel.pagination.totalPages} 頁`,
    ja: `${changePanel.pagination.totalPages} ページ中 ${changePanel.pagination.page} ページ`,
    ko: `${changePanel.pagination.totalPages}페이지 중 ${changePanel.pagination.page}페이지`,
    fr: `Page ${changePanel.pagination.page} sur ${changePanel.pagination.totalPages}`,
  });
  const changePaginationRangeLabel =
    changePanel.pagination.totalCount === 0
      ? pickLocaleText(selectedLocale, {
          en: 'No change logs are currently visible.',
          zh_HANS: '当前没有变更日志。',
          zh_HANT: '目前沒有變更日誌。',
          ja: '現在表示できる変更ログはありません。',
          ko: '현재 표시할 변경 로그가 없습니다.',
          fr: 'Aucun journal des modifications visible actuellement.',
        })
      : pickLocaleText(selectedLocale, {
          en: `Showing ${changePageRange.start}-${changePageRange.end} of ${changePanel.pagination.totalCount}`,
          zh_HANS: `显示第 ${changePageRange.start}-${changePageRange.end} 条，共 ${changePanel.pagination.totalCount} 条`,
          zh_HANT: `顯示第 ${changePageRange.start}-${changePageRange.end} 筆，共 ${changePanel.pagination.totalCount} 筆`,
          ja: `${changePanel.pagination.totalCount} 件中 ${changePageRange.start}-${changePageRange.end} 件を表示`,
          ko: `${changePanel.pagination.totalCount}개 중 ${changePageRange.start}-${changePageRange.end}개 표시`,
          fr: `Affichage de ${changePageRange.start} à ${changePageRange.end} sur ${changePanel.pagination.totalCount}`,
        });
  const techPageRange = getPaginationRange(techPanel.pagination, techPanel.data.length);
  const techPaginationLabel = pickLocaleText(selectedLocale, {
    en: `Page ${techPanel.pagination.page} of ${techPanel.pagination.totalPages}`,
    zh_HANS: `第 ${techPanel.pagination.page} / ${techPanel.pagination.totalPages} 页`,
    zh_HANT: `第 ${techPanel.pagination.page} / ${techPanel.pagination.totalPages} 頁`,
    ja: `${techPanel.pagination.totalPages} ページ中 ${techPanel.pagination.page} ページ`,
    ko: `${techPanel.pagination.totalPages}페이지 중 ${techPanel.pagination.page}페이지`,
    fr: `Page ${techPanel.pagination.page} sur ${techPanel.pagination.totalPages}`,
  });
  const techPaginationRangeLabel =
    techPanel.pagination.totalCount === 0
      ? pickLocaleText(selectedLocale, {
          en: 'No technical events are currently visible.',
          zh_HANS: '当前没有技术事件。',
          zh_HANT: '目前沒有技術事件。',
          ja: '現在表示できる技術イベントはありません。',
          ko: '현재 표시할 기술 이벤트가 없습니다.',
          fr: 'Aucun événement technique visible actuellement.',
        })
      : pickLocaleText(selectedLocale, {
          en: `Showing ${techPageRange.start}-${techPageRange.end} of ${techPanel.pagination.totalCount}`,
          zh_HANS: `显示第 ${techPageRange.start}-${techPageRange.end} 条，共 ${techPanel.pagination.totalCount} 条`,
          zh_HANT: `顯示第 ${techPageRange.start}-${techPageRange.end} 筆，共 ${techPanel.pagination.totalCount} 筆`,
          ja: `${techPanel.pagination.totalCount} 件中 ${techPageRange.start}-${techPageRange.end} 件を表示`,
          ko: `${techPanel.pagination.totalCount}개 중 ${techPageRange.start}-${techPageRange.end}개 표시`,
          fr: `Affichage de ${techPageRange.start} à ${techPageRange.end} sur ${techPanel.pagination.totalCount}`,
        });
  const integrationPageRange = getPaginationRange(integrationPanel.pagination, integrationPanel.data.length);
  const integrationPaginationLabel = pickLocaleText(selectedLocale, {
    en: `Page ${integrationPanel.pagination.page} of ${integrationPanel.pagination.totalPages}`,
    zh_HANS: `第 ${integrationPanel.pagination.page} / ${integrationPanel.pagination.totalPages} 页`,
    zh_HANT: `第 ${integrationPanel.pagination.page} / ${integrationPanel.pagination.totalPages} 頁`,
    ja: `${integrationPanel.pagination.totalPages} ページ中 ${integrationPanel.pagination.page} ページ`,
    ko: `${integrationPanel.pagination.totalPages}페이지 중 ${integrationPanel.pagination.page}페이지`,
    fr: `Page ${integrationPanel.pagination.page} sur ${integrationPanel.pagination.totalPages}`,
  });
  const integrationPaginationRangeLabel =
    integrationPanel.pagination.totalCount === 0
      ? pickLocaleText(selectedLocale, {
          en: 'No integration logs are currently visible.',
          zh_HANS: '当前没有集成日志。',
          zh_HANT: '目前沒有整合日誌。',
          ja: '現在表示できる統合ログはありません。',
          ko: '현재 표시할 통합 로그가 없습니다.',
          fr: 'Aucun journal d’intégration visible actuellement.',
        })
      : pickLocaleText(selectedLocale, {
          en: `Showing ${integrationPageRange.start}-${integrationPageRange.end} of ${integrationPanel.pagination.totalCount}`,
          zh_HANS: `显示第 ${integrationPageRange.start}-${integrationPageRange.end} 条，共 ${integrationPanel.pagination.totalCount} 条`,
          zh_HANT: `顯示第 ${integrationPageRange.start}-${integrationPageRange.end} 筆，共 ${integrationPanel.pagination.totalCount} 筆`,
          ja: `${integrationPanel.pagination.totalCount} 件中 ${integrationPageRange.start}-${integrationPageRange.end} 件を表示`,
          ko: `${integrationPanel.pagination.totalCount}개 중 ${integrationPageRange.start}-${integrationPageRange.end}개 표시`,
          fr: `Affichage de ${integrationPageRange.start} à ${integrationPageRange.end} sur ${integrationPanel.pagination.totalCount}`,
        });

  return (
    <div className="space-y-6">
      <GlassSurface className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              <Activity className="h-3.5 w-3.5" />
              {`${copy.header.eyebrowPrefix} / ${workspaceLabel} / ${copy.header.title}`}
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-slate-950">{copy.header.title}</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">{copy.header.description}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label={copy.summary.tenantLabel} value={workspaceName} hint={copy.summary.tenantHint} />
            <SummaryCard
              label={copy.summary.activeTabLabel}
              value={getObservabilityTabLabel(selectedLocale, activeTab)}
              hint={copy.summary.activeTabHint}
            />
            <SummaryCard label={copy.summary.visibleRowsLabel} value={String(activeCount)} hint={copy.summary.visibleRowsHint} />
            <SummaryCard
              label={copy.summary.scopeLabel}
              value={workspaceLabel}
              hint={isAcWorkspace ? copy.summary.platformScopeHint : copy.summary.tenantScopeHint}
            />
          </div>
        </div>
      </GlassSurface>

      <GlassSurface className="p-6">
        <div className="flex flex-wrap gap-2">
          <TabButton label={copy.tabs.changeLogs} isActive={activeTab === 'change-logs'} onClick={() => setActiveTab('change-logs')} />
          <TabButton label={copy.tabs.techEvents} isActive={activeTab === 'tech-events'} onClick={() => setActiveTab('tech-events')} />
          <TabButton
            label={copy.tabs.integrationLogs}
            isActive={activeTab === 'integration-logs'}
            onClick={() => setActiveTab('integration-logs')}
          />
          <TabButton label={copy.tabs.logSearch} isActive={activeTab === 'log-search'} onClick={() => setActiveTab('log-search')} />
        </div>
      </GlassSurface>

      <div className={tabTransitionClassName}>
      {displayedTab === 'change-logs' ? (
        <>
          <GlassSurface className="p-6">
            <FormSection
              title={copy.changeFilters.title}
              description={copy.changeFilters.description}
              actions={
                <AsyncSubmitButton
                  onClick={() => void loadChangeLogs()}
                  isPending={changePanel.loading}
                  pendingText={copy.changeFilters.pending}
                  aria-label={copy.changeFilters.refresh}
                >
                  {copy.changeFilters.refresh}
                </AsyncSubmitButton>
              }
            >
              <div className="grid gap-4 md:grid-cols-3">
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
            </FormSection>
          </GlassSurface>

          <GlassSurface className="p-6">
            <FormSection
              title={copy.changeTable.title}
              description={copy.changeTable.description}
            >
              {changePanel.error ? (
                <StateView status="denied" title={copy.changeTable.unavailableTitle} description={changePanel.error} />
              ) : (
                <TableShell
                  columns={[...copy.changeTable.columns]}
                  dataLength={changePanel.data.length}
                  isLoading={changePanel.loading}
                  isEmpty={!changePanel.loading && changePanel.data.length === 0}
                  emptyTitle={copy.changeTable.emptyTitle}
                  emptyDescription={copy.changeTable.emptyDescription}
                >
                  {changePanel.data.map((entry) => (
                    <tr key={entry.id} className="align-top">
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">{entry.objectName || entry.objectType}</p>
                          <p className="text-xs text-slate-500">
                            {entry.objectType} / {entry.objectId}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{getObservabilityActionLabel(selectedLocale, entry.action)}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{entry.operatorName || copy.common.system}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {summarizeDiff(entry.diff, selectedLocale) || copy.common.noMessage}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{entry.requestId || copy.common.noRequest}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {formatObservabilityDateTime(selectedLocale, entry.occurredAt, copy.common.timeNever)}
                      </td>
                    </tr>
                  ))}
                </TableShell>
              )}
            </FormSection>
            <PaginationFooter
              label={changePaginationLabel}
              rangeLabel={changePaginationRangeLabel}
              pageSizeLabel={pageSizeLabel}
              previousLabel={previousPageLabel}
              nextLabel={nextPageLabel}
              pageSize={changePageSize}
              onPageSizeChange={(nextPageSize) => {
                setChangePageSize(nextPageSize);
                setChangePage(1);
              }}
              onPrevious={() => setChangePage((current) => Math.max(1, current - 1))}
              onNext={() => setChangePage((current) => current + 1)}
              hasPrev={changePanel.pagination.hasPrev}
              hasNext={changePanel.pagination.hasNext}
              isLoading={changePanel.loading}
            />
          </GlassSurface>
        </>
      ) : null}

      {displayedTab === 'tech-events' ? (
        <>
          <GlassSurface className="p-6">
            <FormSection
              title={copy.techFilters.title}
              description={copy.techFilters.description}
              actions={
                <AsyncSubmitButton
                  onClick={() => void loadTechEvents()}
                  isPending={techPanel.loading}
                  pendingText={copy.techFilters.pending}
                  aria-label={copy.techFilters.refresh}
                >
                  {copy.techFilters.refresh}
                </AsyncSubmitButton>
              }
            >
              <div className="grid gap-4 md:grid-cols-4">
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
            </FormSection>
          </GlassSurface>

          <GlassSurface className="p-6">
            <FormSection
              title={copy.techTable.title}
              description={copy.techTable.description}
            >
              {techPanel.error ? (
                <StateView status="denied" title={copy.techTable.unavailableTitle} description={techPanel.error} />
              ) : (
                <TableShell
                  columns={[...copy.techTable.columns]}
                  dataLength={techPanel.data.length}
                  isLoading={techPanel.loading}
                  isEmpty={!techPanel.loading && techPanel.data.length === 0}
                  emptyTitle={copy.techTable.emptyTitle}
                  emptyDescription={copy.techTable.emptyDescription}
                >
                  {techPanel.data.map((entry) => (
                    <tr key={entry.id} className="align-top">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{entry.eventType}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{getObservabilitySeverityLabel(selectedLocale, entry.severity)}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{entry.scope}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{entry.message || copy.common.noMessage}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{entry.traceId || copy.common.noRequest}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {formatObservabilityDateTime(selectedLocale, entry.occurredAt, copy.common.timeNever)}
                      </td>
                    </tr>
                  ))}
                </TableShell>
              )}
            </FormSection>
            <PaginationFooter
              label={techPaginationLabel}
              rangeLabel={techPaginationRangeLabel}
              pageSizeLabel={pageSizeLabel}
              previousLabel={previousPageLabel}
              nextLabel={nextPageLabel}
              pageSize={techPageSize}
              onPageSizeChange={(nextPageSize) => {
                setTechPageSize(nextPageSize);
                setTechPage(1);
              }}
              onPrevious={() => setTechPage((current) => Math.max(1, current - 1))}
              onNext={() => setTechPage((current) => current + 1)}
              hasPrev={techPanel.pagination.hasPrev}
              hasNext={techPanel.pagination.hasNext}
              isLoading={techPanel.loading}
            />
          </GlassSurface>
        </>
      ) : null}

      {displayedTab === 'integration-logs' ? (
        <>
          <GlassSurface className="p-6">
            <FormSection
              title={copy.integrationFilters.title}
              description={copy.integrationFilters.description}
              actions={
                <AsyncSubmitButton
                  onClick={() => void loadIntegrationLogs()}
                  isPending={integrationPanel.loading}
                  pendingText={copy.integrationFilters.pending}
                  aria-label={copy.integrationFilters.refresh}
                >
                  {copy.integrationFilters.refresh}
                </AsyncSubmitButton>
              }
            >
              <div className="grid gap-4 md:grid-cols-4">
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

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
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
            </FormSection>
          </GlassSurface>

          <GlassSurface className="p-6">
            <FormSection
              title={copy.integrationTable.title}
              description={copy.integrationTable.description}
            >
              {integrationPanel.error ? (
                <StateView status="denied" title={copy.integrationTable.unavailableTitle} description={integrationPanel.error} />
              ) : (
                <TableShell
                  columns={[...copy.integrationTable.columns]}
                  dataLength={integrationPanel.data.length}
                  isLoading={integrationPanel.loading}
                  isEmpty={!integrationPanel.loading && integrationPanel.data.length === 0}
                  emptyTitle={copy.integrationTable.emptyTitle}
                  emptyDescription={copy.integrationTable.emptyDescription}
                >
                  {integrationPanel.data.map((entry) => (
                    <tr key={entry.id} className="align-top">
                      <td className="px-6 py-4 text-sm text-slate-700">{entry.consumerCode || copy.common.unattributed}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{getObservabilityDirectionLabel(selectedLocale, entry.direction)}</td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">{entry.endpoint}</p>
                          <p className="text-xs text-slate-500">{entry.method}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{entry.responseStatus ?? copy.common.noRequest}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {entry.latencyMs !== null ? `${entry.latencyMs} ms` : copy.common.latencyUnknown}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{entry.traceId || copy.common.noRequest}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {formatObservabilityDateTime(selectedLocale, entry.occurredAt, copy.common.timeNever)}
                      </td>
                    </tr>
                  ))}
                </TableShell>
              )}
            </FormSection>
            <PaginationFooter
              label={integrationPaginationLabel}
              rangeLabel={integrationPaginationRangeLabel}
              pageSizeLabel={pageSizeLabel}
              previousLabel={previousPageLabel}
              nextLabel={nextPageLabel}
              pageSize={integrationPageSize}
              onPageSizeChange={(nextPageSize) => {
                setIntegrationPageSize(nextPageSize);
                setIntegrationPage(1);
              }}
              onPrevious={() => setIntegrationPage((current) => Math.max(1, current - 1))}
              onNext={() => setIntegrationPage((current) => current + 1)}
              hasPrev={integrationPanel.pagination.hasPrev}
              hasNext={integrationPanel.pagination.hasNext}
              isLoading={integrationPanel.loading}
            />
          </GlassSurface>
        </>
      ) : null}

      {displayedTab === 'log-search' ? (
        <>
          <GlassSurface className="p-6">
            <FormSection
              title={copy.searchFilters.title}
              description={copy.searchFilters.description}
              actions={
                <AsyncSubmitButton
                  onClick={() => void loadLogSearch()}
                  isPending={searchPanel.loading}
                  pendingText={copy.searchFilters.pending}
                  aria-label={copy.searchFilters.search}
                >
                  {copy.searchFilters.search}
                </AsyncSubmitButton>
              }
            >
              <div className="grid gap-4 md:grid-cols-4">
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
                    <option value="7d">7d</option>
                  </select>
                </Field>
              </div>
              <div className="flex justify-end">
                <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
                  {pageSizeLabel}
                  <select
                    value={searchLimit}
                    onChange={(event) => setSearchLimit(Number(event.target.value) as PageSizeOption)}
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
            </FormSection>
          </GlassSurface>

          <GlassSurface className="p-6">
        <FormSection
          title={copy.searchTable.title}
          description={copy.searchTable.description}
        >
              {searchPanel.error ? (
                <StateView status="denied" title={copy.searchTable.unavailableTitle} description={searchPanel.error} />
              ) : (
                <TableShell
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
                        {formatObservabilityDateTime(selectedLocale, entry.timestamp, copy.common.timeNever)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{entry.labels.stream || copy.common.unknown}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {entry.labels.severity ? getObservabilitySeverityLabel(selectedLocale, entry.labels.severity) : copy.common.noRequest}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {String(entry.data.message || entry.data.eventType || copy.common.structuredLogEntry)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {entry.labels.app || 'tcrn-tms'} / {entry.labels.stream || copy.common.unknown}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </TableShell>
              )}
            </FormSection>
          </GlassSurface>
        </>
      ) : null}
      </div>

    </div>
  );
}
