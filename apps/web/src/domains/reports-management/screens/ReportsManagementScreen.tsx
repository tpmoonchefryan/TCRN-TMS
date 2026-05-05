'use client';

import {
  type MfrFilterCriteria,
  type PiiPlatformReportCreateResponse,
  type ReportFormat,
  type ReportJobStatus,
  resolveTrilingualLocaleFamily,
} from '@tcrn/shared';
import {
  Download,
  ExternalLink,
  FileSpreadsheet,
  RefreshCcw,
  Search,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, startTransition, useEffect, useState } from 'react';

import {
  cancelMfrJob,
  createMfrJob,
  downloadMfrJob,
  listMfrJobs,
  type MfrSearchResult,
  type ReportJobListItem,
  searchMfr,
} from '@/domains/reports-management/api/reports.api';
import {
  formatReportsDateTime,
  formatReportsNumber,
  getReportsJobStatusLabel,
  useReportsManagementCopy,
} from '@/domains/reports-management/screens/reports-management.copy';
import { ApiRequestError } from '@/platform/http/api';
import { buildTalentSettingsPath } from '@/platform/routing/workspace-paths';
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
  AsyncSubmitButton,
  ConfirmActionDialog,
  FormSection,
  GlassSurface,
  PaginationFooter,
  SectionTabs,
  StateView,
  TableShell,
} from '@/platform/ui';

type JobStatusFilter = 'all' | ReportJobStatus;
type ReportsView = 'directory' | 'history';

interface ReportFilterDraft {
  platformCodes: string;
  membershipClassCodes: string;
  membershipTypeCodes: string;
  membershipLevelCodes: string;
  statusCodes: string;
  validFromStart: string;
  validFromEnd: string;
  validToStart: string;
  validToEnd: string;
  includeExpired: boolean;
  includeInactive: boolean;
  format: ReportFormat;
}

interface JobsPanelState {
  data: ReportJobListItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
}

interface PreviewPanelState {
  data: MfrSearchResult | null;
  loading: boolean;
  error: string | null;
}

interface NoticeState {
  tone: 'success' | 'error';
  message: string;
}

interface DialogState {
  jobId: string;
  fileName: string | null;
  title: string;
  description: string;
  confirmText: string;
  successMessage: string;
  errorFallback: string;
}

const DEFAULT_FILTER_DRAFT: ReportFilterDraft = {
  platformCodes: '',
  membershipClassCodes: '',
  membershipTypeCodes: '',
  membershipLevelCodes: '',
  statusCodes: '',
  validFromStart: '',
  validFromEnd: '',
  validToStart: '',
  validToEnd: '',
  includeExpired: false,
  includeInactive: false,
  format: 'xlsx',
};

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function splitCodes(value: string) {
  const codes = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return codes.length > 0 ? codes : undefined;
}

function buildMfrFilters(draft: ReportFilterDraft): MfrFilterCriteria | undefined {
  const filters: MfrFilterCriteria = {
    platformCodes: splitCodes(draft.platformCodes),
    membershipClassCodes: splitCodes(draft.membershipClassCodes),
    membershipTypeCodes: splitCodes(draft.membershipTypeCodes),
    membershipLevelCodes: splitCodes(draft.membershipLevelCodes),
    statusCodes: splitCodes(draft.statusCodes),
    validFromStart: draft.validFromStart || undefined,
    validFromEnd: draft.validFromEnd || undefined,
    validToStart: draft.validToStart || undefined,
    validToEnd: draft.validToEnd || undefined,
    includeExpired: draft.includeExpired || undefined,
    includeInactive: draft.includeInactive || undefined,
  };

  const hasValues = Object.values(filters).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return value !== undefined;
  });

  return hasValues ? filters : undefined;
}

function parseReportsView(value: string | null): ReportsView {
  return value === 'history' ? 'history' : 'directory';
}

function parseJobStatusFilter(value: string | null): JobStatusFilter {
  return value === 'pending'
    || value === 'running'
    || value === 'retrying'
    || value === 'success'
    || value === 'consumed'
    || value === 'failed'
    || value === 'expired'
    || value === 'cancelled'
    ? value
    : 'all';
}

function buildReportsManagementQueryState({
  activeView,
  jobStatusFilter,
  page,
  pageSize,
}: {
  activeView: ReportsView;
  jobStatusFilter: JobStatusFilter;
  page: number;
  pageSize: PageSizeOption;
}) {
  const params = new URLSearchParams();

  if (activeView !== 'directory') {
    params.set('view', activeView);
  }

  if (jobStatusFilter !== 'all') {
    params.set('status', jobStatusFilter);
  }

  if (page > 1) {
    params.set('page', String(page));
  }

  if (pageSize !== PAGE_SIZE_OPTIONS[0]) {
    params.set('pageSize', String(pageSize));
  }

  return params.toString();
}

function buildStatusTone(status: ReportJobStatus) {
  if (status === 'success' || status === 'consumed') {
    return 'success';
  }

  if (status === 'failed' || status === 'expired' || status === 'cancelled') {
    return 'danger';
  }

  if (status === 'running' || status === 'retrying') {
    return 'primary';
  }

  return 'warning';
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
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>
    </div>
  );
}

function StatusBadge({
  status,
  label,
}: Readonly<{
  status: ReportJobStatus;
  label: string;
}>) {
  const toneClasses =
    buildStatusTone(status) === 'success'
      ? 'bg-emerald-100 text-emerald-800'
      : buildStatusTone(status) === 'danger'
        ? 'bg-rose-100 text-rose-800'
        : buildStatusTone(status) === 'primary'
          ? 'bg-indigo-100 text-indigo-800'
          : 'bg-amber-100 text-amber-800';

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${toneClasses}`}>
      {label}
    </span>
  );
}

function SecondaryButton({
  children,
  disabled = false,
  onClick,
  ariaLabel,
}: Readonly<{
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
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
    <div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-medium ${toneClasses}`}>
      {message}
    </div>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}>) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}>) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: Readonly<{
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}>) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      <span className="text-sm font-medium text-slate-800">{label}</span>
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}>) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ReportsManagementScreen({
  tenantId,
  talentId,
}: Readonly<{
  tenantId: string;
  talentId: string;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlActiveView = parseReportsView(searchParams.get('view'));
  const urlJobStatusFilter = parseJobStatusFilter(searchParams.get('status'));
  const urlPage = parsePageParam(searchParams.get('page'));
  const urlPageSize = parsePageSizeParam(searchParams.get('pageSize'));
  const { request, session } = useSession();
  const { selectedLocale, copy, jobStatusOptions, reportFormatOptions } = useReportsManagementCopy();
  const [draft, setDraft] = useState<ReportFilterDraft>(DEFAULT_FILTER_DRAFT);
  const [previewPanel, setPreviewPanel] = useState<PreviewPanelState>({
    data: null,
    loading: false,
    error: null,
  });
  const [jobsPanel, setJobsPanel] = useState<JobsPanelState>({
    data: [],
    total: 0,
    page: 1,
    pageSize: PAGE_SIZE_OPTIONS[0],
    loading: true,
    error: null,
  });
  const [jobStatusFilter, setJobStatusFilter] = useState<JobStatusFilter>(urlJobStatusFilter);
  const [page, setPage] = useState(urlPage);
  const [pageSize, setPageSize] = useState<PageSizeOption>(urlPageSize);
  const [previewPending, setPreviewPending] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [downloadJobId, setDownloadJobId] = useState<string | null>(null);
  const [dialogPending, setDialogPending] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const [isDraftDrawerOpen, setIsDraftDrawerOpen] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [portalHandoff, setPortalHandoff] = useState<PiiPlatformReportCreateResponse | null>(null);
  const [activeView, setActiveView] = useState<ReportsView>(urlActiveView);

  useEffect(() => {
    setActiveView((current) => (current === urlActiveView ? current : urlActiveView));
    setJobStatusFilter((current) => (current === urlJobStatusFilter ? current : urlJobStatusFilter));
    setPage((current) => (current === urlPage ? current : urlPage));
    setPageSize((current) => (current === urlPageSize ? current : urlPageSize));
  }, [urlActiveView, urlJobStatusFilter, urlPage, urlPageSize]);

  function applyReportsQueryState(
    nextState: Partial<{
      activeView: ReportsView;
      jobStatusFilter: JobStatusFilter;
      page: number;
      pageSize: PageSizeOption;
    }>,
  ) {
    const nextActiveView = nextState.activeView ?? activeView;
    const nextJobStatusFilter = nextState.jobStatusFilter ?? jobStatusFilter;
    const nextPage = nextState.page ?? page;
    const nextPageSize = nextState.pageSize ?? pageSize;

    if (nextState.activeView !== undefined) {
      setActiveView(nextActiveView);
    }

    if (nextState.jobStatusFilter !== undefined) {
      setJobStatusFilter(nextJobStatusFilter);
    }

    if (nextState.page !== undefined) {
      setPage(nextPage);
    }

    if (nextState.pageSize !== undefined) {
      setPageSize(nextPageSize);
    }

    const nextQueryString = buildReportsManagementQueryState({
      activeView: nextActiveView,
      jobStatusFilter: nextJobStatusFilter,
      page: nextPage,
      pageSize: nextPageSize,
    });
    const currentQueryString = buildReportsManagementQueryState({
      activeView,
      jobStatusFilter,
      page,
      pageSize,
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
    let cancelled = false;

    async function loadJobs() {
      setJobsPanel((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      try {
        const nextJobs = await listMfrJobs(request, talentId, {
          page,
          pageSize,
          status: jobStatusFilter === 'all' ? undefined : jobStatusFilter,
        });

        if (!cancelled) {
          setJobsPanel({
            data: nextJobs.items,
            total: nextJobs.meta.total,
            page,
            pageSize,
            loading: false,
            error: null,
          });
        }
      } catch (reason) {
        if (!cancelled) {
          setJobsPanel({
            data: [],
            total: 0,
            page,
            pageSize,
            loading: false,
            error: getErrorMessage(reason, copy.state.loadJobsError),
          });
        }
      }
    }

    void loadJobs();

    return () => {
      cancelled = true;
    };
  }, [copy.state.loadJobsError, jobStatusFilter, page, pageSize, request, talentId]);

  async function refreshJobs() {
    const nextJobs = await listMfrJobs(request, talentId, {
      page,
      pageSize,
      status: jobStatusFilter === 'all' ? undefined : jobStatusFilter,
    });

    setJobsPanel({
      data: nextJobs.items,
      total: nextJobs.meta.total,
      page,
      pageSize,
      loading: false,
      error: null,
    });
  }

  async function handleRefreshJobs() {
    setNotice(null);

    try {
      await refreshJobs();
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.state.refreshJobsError),
      });
    }
  }

  async function handlePreview() {
    setPreviewPending(true);
    setNotice(null);
    setPortalHandoff(null);
    setPreviewPanel((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const nextPreview = await searchMfr(request, talentId, {
        filters: buildMfrFilters(draft),
        previewLimit: 8,
      });
      setPreviewPanel({
        data: nextPreview,
        loading: false,
        error: null,
      });
    } catch (reason) {
      setPreviewPanel({
        data: null,
        loading: false,
        error: getErrorMessage(reason, copy.state.previewError),
      });
    } finally {
      setPreviewPending(false);
    }
  }

  async function handleCreateJob() {
    setCreatePending(true);
    setNotice(null);
    setPortalHandoff(null);

    try {
      const result = await createMfrJob(request, talentId, {
        filters: buildMfrFilters(draft),
        format: draft.format,
      });

      if (result.deliveryMode === 'pii_platform_portal') {
        setPortalHandoff(result);
        setNotice({
          tone: 'success',
          message: `${copy.state.piiPortalHandoffPrefix} ${formatReportsNumber(
            selectedLocale,
            result.customerCount,
            copy.ledger.pendingRows,
          )} ${copy.state.piiPortalHandoffSuffix}`,
        });
        setIsDraftDrawerOpen(false);
        return;
      }

      await refreshJobs();
      setNotice({
        tone: 'success',
        message: `${copy.state.createLocalJobPrefix} ${result.jobId} ${copy.state.createLocalJobSuffix} ${formatReportsNumber(
          selectedLocale,
          result.estimatedRows,
          copy.ledger.pendingRows,
        )} ${copy.state.createLocalJobRowsSuffix}`,
      });
      setIsDraftDrawerOpen(false);
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.state.createJobError),
      });
    } finally {
      setCreatePending(false);
    }
  }

  async function handleDownload(job: ReportJobListItem) {
    setDownloadJobId(job.id);
    setNotice(null);

    try {
      const result = await downloadMfrJob(request, talentId, job.id);
      window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
      setNotice({
        tone: 'success',
        message: `${copy.state.downloadOpenedPrefix} ${result.fileName || copy.state.downloadOpenedFallback}.`,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.state.downloadError),
      });
    } finally {
      setDownloadJobId(null);
    }
  }

  async function handleConfirmCancel() {
    if (!dialogState) {
      return;
    }

    setDialogPending(true);
    setNotice(null);

    try {
      await cancelMfrJob(request, talentId, dialogState.jobId);
      await refreshJobs();
      setNotice({
        tone: 'success',
        message: dialogState.successMessage,
      });
      setDialogState(null);
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, dialogState.errorFallback),
      });
    } finally {
      setDialogPending(false);
    }
  }

  const activeJobs = jobsPanel.data.filter((job) =>
    job.status === 'pending' || job.status === 'running' || job.status === 'retrying',
  ).length;
  const downloadableJobs = jobsPanel.data.filter((job) =>
    job.status === 'success' || job.status === 'consumed',
  ).length;
  const jobsPagination = buildPaginationMeta(jobsPanel.total, jobsPanel.page, jobsPanel.pageSize);
  const jobsRange = getPaginationRange(jobsPagination, jobsPanel.data.length);
  const paginationLabel = pickLocaleText(selectedLocale, {
    en: `Page ${jobsPagination.page} of ${jobsPagination.totalPages}`,
    zh_HANS: `第 ${jobsPagination.page} / ${jobsPagination.totalPages} 页`,
    zh_HANT: `第 ${jobsPagination.page} / ${jobsPagination.totalPages} 頁`,
    ja: `${jobsPagination.totalPages} ページ中 ${jobsPagination.page} ページ`,
    ko: `${jobsPagination.totalPages}페이지 중 ${jobsPagination.page}페이지`,
    fr: `Page ${jobsPagination.page} sur ${jobsPagination.totalPages}`,
  });
  const paginationRangeLabel =
    jobsPagination.totalCount === 0
      ? pickLocaleText(selectedLocale, {
          en: 'No jobs are currently available.',
          zh_HANS: '当前没有任务记录。',
          zh_HANT: '目前沒有任務記錄。',
          ja: '現在表示できるジョブはありません。',
          ko: '현재 표시할 작업이 없습니다.',
          fr: 'Aucune tâche n’est actuellement disponible.',
        })
      : pickLocaleText(selectedLocale, {
          en: `Showing ${jobsRange.start}-${jobsRange.end} of ${jobsPagination.totalCount}`,
          zh_HANS: `显示第 ${jobsRange.start}-${jobsRange.end} 条，共 ${jobsPagination.totalCount} 条`,
          zh_HANT: `顯示第 ${jobsRange.start}-${jobsRange.end} 筆，共 ${jobsPagination.totalCount} 筆`,
          ja: `${jobsPagination.totalCount} 件中 ${jobsRange.start}-${jobsRange.end} 件を表示`,
          ko: `${jobsPagination.totalCount}개 중 ${jobsRange.start}-${jobsRange.end}개 표시`,
          fr: `Affichage de ${jobsRange.start} à ${jobsRange.end} sur ${jobsPagination.totalCount}`,
        });
  const pageSizeLabel = pickLocaleText(selectedLocale, {
    en: 'Rows per page',
    zh_HANS: '每页显示',
    zh_HANT: '每頁顯示',
    ja: '1ページあたり',
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
  const reportsViewCopy =
    resolveTrilingualLocaleFamily(selectedLocale) === 'zh'
      ? selectedLocale === 'zh_HANT'
        ? {
            directory: '報表目錄',
            history: '執行紀錄',
            directoryTitle: '報表中心',
            directoryDescription: '在這裡瀏覽並執行可用報表。',
            cardBadge: '可用',
            cardAction: '建立報表',
            cardHistory: '查看執行紀錄',
            cardEmpty: '沒有可用的報表',
            historyDescription: '查看報表執行紀錄。',
          }
        : {
            directory: '报表目录',
            history: '运行历史',
            directoryTitle: '报表中心',
            directoryDescription: '在这里浏览和运行可用报表。',
            cardBadge: '已上线',
            cardAction: '起草报表',
            cardHistory: '查看运行历史',
            cardEmpty: '更多报表可用后会显示在此目录。',
            historyDescription: '查看报表运行记录。',
          }
      : selectedLocale === 'ko'
        ? {
            directory: '보고서 디렉터리',
            history: '실행 기록',
            directoryTitle: '보고서 센터',
            directoryDescription: '여기에서 사용 가능한 보고서를 찾아 실행하세요.',
            cardBadge: '사용 가능',
            cardAction: '보고서 작성',
            cardHistory: '실행 기록 보기',
            cardEmpty: '사용 가능한 보고서 없음',
            historyDescription: '보고서 실행 기록을 검토하세요.',
          }
        : selectedLocale === 'fr'
          ? {
              directory: 'Répertoire des rapports',
              history: "Historique d'exécution",
              directoryTitle: 'Centre de rapports',
              directoryDescription: 'Parcourez et lancez les rapports disponibles ici.',
              cardBadge: 'Disponible',
              cardAction: 'Préparer un rapport',
              cardHistory: "Voir l'historique",
              cardEmpty: 'Aucun rapport disponible',
              historyDescription: "Consultez l'historique d'exécution des rapports.",
            }
          : resolveTrilingualLocaleFamily(selectedLocale) === 'ja'
        ? {
            directory: 'レポートディレクトリ',
            history: '実行履歴',
            directoryTitle: 'レポートセンター',
            directoryDescription: '利用できるレポートをここから確認して実行します。',
            cardBadge: '利用可能',
            cardAction: 'レポートを起票',
            cardHistory: '実行履歴を見る',
            cardEmpty: '今後のレポートはこのディレクトリに追加されます。',
            historyDescription: 'レポートの実行履歴を確認します。',
          }
        : {
            directory: 'Report Directory',
            history: 'Run History',
            directoryTitle: 'Report Center',
            directoryDescription: 'Browse and run available reports here.',
            cardBadge: 'Available now',
            cardAction: 'Draft report',
            cardHistory: 'Open run history',
            cardEmpty: 'Additional report types will appear here when they are enabled.',
            historyDescription: 'Review report execution history.',
          };
  const reportDirectoryCountLabel = jobsPanel.loading ? copy.summary.jobsLoading : String(jobsPanel.total);

  return (
    <div className="space-y-6">
      <GlassSurface className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              {copy.header.eyebrow}
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-slate-950">{copy.header.title}</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">{copy.header.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={buildTalentSettingsPath(tenantId, talentId)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
            >
              <ExternalLink className="h-4 w-4" />
              {copy.header.workspaceSettings}
            </Link>
            <button
              type="button"
              onClick={() => {
                setNotice(null);
                setIsDraftDrawerOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {copy.header.draftJob}
            </button>
            <SecondaryButton onClick={() => void handleRefreshJobs()} disabled={jobsPanel.loading}>
              <RefreshCcw className="h-3.5 w-3.5" />
              {copy.header.refreshJobs}
            </SecondaryButton>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label={copy.summary.tenantLabel}
              value={session?.tenantName || copy.summary.tenantFallback}
              hint={copy.summary.tenantHint}
            />
            <SummaryCard
              label={copy.summary.catalogLabel}
              value={copy.summary.catalogValue}
              hint={copy.summary.catalogHint}
            />
            <SummaryCard
              label={copy.summary.jobsLabel}
              value={jobsPanel.loading ? copy.summary.jobsLoading : String(jobsPanel.total)}
              hint={copy.summary.jobsHint}
            />
            <SummaryCard
              label={copy.summary.activeDownloadableLabel}
              value={`${activeJobs} / ${downloadableJobs}`}
              hint={copy.summary.activeDownloadableHint}
            />
          </div>
        </div>
      </GlassSurface>

      {notice ? <NoticeBanner tone={notice.tone} message={notice.message} /> : null}

      {portalHandoff ? (
        <GlassSurface className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{copy.portal.badge}</p>
              <h2 className="text-lg font-semibold text-slate-950">{copy.portal.title}</h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">{copy.portal.description}</p>
              <p className="text-sm text-slate-600">
                {copy.portal.expiresPrefix} {formatReportsDateTime(selectedLocale, portalHandoff.expiresAt, copy.common.never)};{' '}
                {copy.portal.estimatedPrefix} {formatReportsNumber(selectedLocale, portalHandoff.estimatedRows, copy.ledger.pendingRows)}{' '}
                {copy.portal.estimatedSuffix}
              </p>
              <div className="grid gap-3 pt-2 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white/75 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{copy.portal.draftStepLabel}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{copy.portal.draftStepHint}</p>
                </div>
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/75 px-4 py-3">
                  <p className="text-sm font-semibold text-indigo-950">{copy.portal.platformStepLabel}</p>
                  <p className="mt-1 text-xs leading-5 text-indigo-800">{copy.portal.platformStepHint}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/75 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{copy.portal.historyStepLabel}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{copy.portal.historyStepHint}</p>
                </div>
              </div>
            </div>
            <a
              href={portalHandoff.redirectUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
            >
              <ExternalLink className="h-4 w-4" />
              {copy.portal.openPlatform}
            </a>
          </div>
        </GlassSurface>
      ) : null}

      <GlassSurface className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTabs
            items={[
              { id: 'directory', label: reportsViewCopy.directory },
              { id: 'history', label: reportsViewCopy.history },
            ]}
            activeId={activeView}
            onChange={(nextView) => {
              applyReportsQueryState({ activeView: nextView as ReportsView });
            }}
            ariaLabel={copy.header.title}
          />

          <p className="text-sm text-slate-500">
            {activeView === 'directory' ? reportsViewCopy.directoryDescription : reportsViewCopy.historyDescription}
          </p>
        </div>
      </GlassSurface>

      {activeView === 'directory' ? (
        <>
          <GlassSurface className="p-6">
            <FormSection title={reportsViewCopy.directoryTitle} description={reportsViewCopy.directoryDescription}>
              <div className="space-y-5">
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
                  <p className="font-semibold">{copy.summary.catalogValue}</p>
                  <p className="mt-1 leading-6">{copy.summary.catalogHint}</p>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(20rem,1fr)]">
                  <GlassSurface variant="solid" className="p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-3">
                        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                          {reportsViewCopy.cardBadge}
                        </p>
                        <div className="space-y-2">
                          <h2 className="text-xl font-semibold text-slate-950">{copy.summary.reportName}</h2>
                          <p className="max-w-2xl text-sm leading-6 text-slate-600">{copy.summary.reportDescription}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setNotice(null);
                            setIsDraftDrawerOpen(true);
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                          {reportsViewCopy.cardAction}
                        </button>
                        <SecondaryButton
                          onClick={() => setActiveView('history')}
                          ariaLabel={reportsViewCopy.cardHistory}
                        >
                          <RefreshCcw className="h-3.5 w-3.5" />
                          {reportsViewCopy.cardHistory}
                        </SecondaryButton>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 md:grid-cols-3">
                      <SummaryCard
                        label={copy.summary.jobsLabel}
                        value={reportDirectoryCountLabel}
                        hint={copy.summary.jobsHint}
                      />
                      <SummaryCard
                        label={copy.summary.activeDownloadableLabel}
                        value={`${activeJobs} / ${downloadableJobs}`}
                        hint={copy.summary.activeDownloadableHint}
                      />
                      <SummaryCard
                        label={copy.notes.scopeLabel}
                        value={copy.notes.scopeValue}
                        hint={copy.notes.scopeHint}
                      />
                    </div>
                  </GlassSurface>

                  <GlassSurface className="p-6">
                    <FormSection title={copy.notes.title} description={copy.notes.description}>
                      <div className="space-y-4">
                        <SummaryCard
                          label={copy.notes.sensitiveDeliveryLabel}
                          value={copy.notes.sensitiveDeliveryValue}
                          hint={copy.notes.sensitiveDeliveryHint}
                        />
                        <SummaryCard
                          label={copy.notes.workflowLabel}
                          value={copy.notes.workflowValue}
                          hint={copy.notes.workflowHint}
                        />
                        <p className="text-sm leading-6 text-slate-500">{reportsViewCopy.cardEmpty}</p>
                      </div>
                    </FormSection>
                  </GlassSurface>
                </div>
              </div>
            </FormSection>
          </GlassSurface>

          <GlassSurface className="p-6">
            <FormSection title={copy.preview.title} description={copy.preview.description}>
              {previewPanel.error ? (
                <StateView status="error" title={copy.preview.unavailableTitle} description={previewPanel.error} />
              ) : previewPanel.data ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <SummaryCard
                      label={copy.preview.matchedRowsLabel}
                      value={formatReportsNumber(selectedLocale, previewPanel.data.totalCount, copy.ledger.pendingRows)}
                      hint={copy.preview.matchedRowsHint}
                    />
                    <SummaryCard
                      label={copy.preview.platformsLabel}
                      value={
                        previewPanel.data.filterSummary.platforms.length > 0
                          ? previewPanel.data.filterSummary.platforms.join(', ')
                          : copy.preview.allPlatforms
                      }
                      hint={copy.preview.platformsHint}
                    />
                    <SummaryCard
                      label={copy.preview.dateRangeLabel}
                      value={previewPanel.data.filterSummary.dateRange || copy.preview.dateRangeUnbounded}
                      hint={previewPanel.data.filterSummary.includeExpired ? copy.preview.includeExpiredHint : copy.preview.excludeExpiredHint}
                    />
                  </div>

                  <TableShell
                    ariaLabel={copy.preview.title}
                    columns={[...copy.preview.tableColumns]}
                    dataLength={previewPanel.data.preview.length}
                    isLoading={previewPanel.loading}
                    isEmpty={previewPanel.data.totalCount === 0}
                    emptyTitle={copy.preview.emptyTitle}
                    emptyDescription={copy.preview.emptyDescription}
                  >
                    {previewPanel.data.preview.map((row, index) => (
                      <tr key={`${row.nickname || 'row'}-${row.platformName}-${index}`} className="align-top">
                        <td className="px-6 py-4 text-sm text-slate-700">{row.nickname || copy.preview.unnamedCustomer}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{row.platformName}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{row.membershipLevelName}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {row.validFrom} {row.validTo ? `→ ${row.validTo}` : `→ ${copy.preview.openEnded}`}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{row.statusName}</td>
                      </tr>
                    ))}
                  </TableShell>
                </div>
              ) : (
                <StateView status="empty" title={copy.preview.noPreviewTitle} description={copy.preview.noPreviewDescription} />
              )}
            </FormSection>
          </GlassSurface>
        </>
      ) : (
        <GlassSurface className="p-6">
          <FormSection title={copy.ledger.title} description={copy.ledger.description}>
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <SelectField
                  label={copy.ledger.filterLabel}
                  value={jobStatusFilter}
                  options={jobStatusOptions}
                  onChange={(value) => {
                    applyReportsQueryState({
                      jobStatusFilter: value as JobStatusFilter,
                      page: 1,
                    });
                  }}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-slate-500">
                    {copy.ledger.showingPrefix} {jobsPanel.data.length} {copy.ledger.showingJobsSuffix} {jobsPanel.total} {copy.ledger.showingTotalSuffix}
                  </p>
                  <SecondaryButton onClick={() => void handleRefreshJobs()} disabled={jobsPanel.loading}>
                    <RefreshCcw className="h-3.5 w-3.5" />
                    {copy.header.refreshJobs}
                  </SecondaryButton>
                </div>
              </div>

              {jobsPanel.error && jobsPanel.data.length === 0 ? (
                <StateView status="error" title={copy.ledger.unavailableTitle} description={jobsPanel.error} />
              ) : (
                <TableShell
                  ariaLabel={copy.ledger.title}
                  columns={[...copy.ledger.tableColumns]}
                  dataLength={jobsPanel.data.length}
                  isLoading={jobsPanel.loading}
                  isEmpty={!jobsPanel.loading && jobsPanel.data.length === 0}
                  emptyTitle={copy.ledger.emptyTitle}
                  emptyDescription={copy.ledger.emptyDescription}
                >
                  {jobsPanel.data.map((job) => {
                    const canDownload = job.status === 'success' || job.status === 'consumed';
                    const canCancel = job.status === 'pending' || job.status === 'failed';

                    return (
                      <tr key={job.id} className="align-top">
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-900">{job.fileName || copy.ledger.pendingFileAssignment}</p>
                            <p className="text-xs text-slate-500">{job.id}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={job.status} label={getReportsJobStatusLabel(selectedLocale, job.status)} />
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {formatReportsNumber(selectedLocale, job.totalRows, copy.ledger.pendingRows)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {formatReportsDateTime(selectedLocale, job.createdAt, copy.common.never)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {formatReportsDateTime(selectedLocale, job.completedAt, copy.common.never)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <SecondaryButton
                              onClick={() => void handleDownload(job)}
                              disabled={!canDownload || downloadJobId === job.id}
                              ariaLabel={copy.ledger.downloadAriaLabel(job.fileName || job.id)}
                            >
                              <Download className="h-3.5 w-3.5" />
                              {copy.ledger.download}
                            </SecondaryButton>
                            <SecondaryButton
                              onClick={() =>
                                setDialogState({
                                  jobId: job.id,
                                  fileName: job.fileName,
                                  title: copy.ledger.cancelDialogTitle,
                                  description: copy.ledger.cancelDialogDescription,
                                  confirmText: copy.ledger.cancelDialogConfirm,
                                  successMessage: `${job.fileName || copy.state.cancelSuccessFallback} ${copy.state.cancelSuccessSuffix}`,
                                  errorFallback: copy.state.cancelError,
                                })
                              }
                              disabled={!canCancel}
                              ariaLabel={copy.ledger.cancelAriaLabel(job.fileName || job.id)}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              {copy.ledger.cancel}
                            </SecondaryButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </TableShell>
              )}

              {!jobsPanel.error ? (
                <PaginationFooter
                  pagination={jobsPagination}
                  itemCount={jobsPanel.data.length}
                  labels={{
                    pageLabel: paginationLabel,
                    rangeLabel: paginationRangeLabel,
                    rowsPerPageLabel: pageSizeLabel,
                    previousLabel: previousPageLabel,
                    nextLabel: nextPageLabel,
                  }}
                  onPageChange={(nextPage) => {
                    applyReportsQueryState({ page: nextPage });
                  }}
                  onPageSizeChange={(nextPageSize) => {
                    applyReportsQueryState({
                      page: 1,
                      pageSize: nextPageSize as PageSizeOption,
                    });
                  }}
                  isLoading={jobsPanel.loading}
                  className="rounded-2xl"
                />
              ) : null}
            </div>
          </FormSection>
        </GlassSurface>
      )}

      <ConfirmActionDialog
        open={dialogState !== null}
        title={dialogState?.title || ''}
        description={dialogState?.description || ''}
        confirmText={dialogState?.confirmText ?? copy.ledger.cancelDialogConfirm}
        cancelText={copy.drawer.cancel}
        intent="danger"
        isPending={dialogPending}
        onCancel={() => {
          if (!dialogPending) {
            setDialogState(null);
          }
        }}
        onConfirm={() => void handleConfirmCancel()}
      />

      <ActionDrawer
        open={isDraftDrawerOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !previewPending && !createPending) {
            setIsDraftDrawerOpen(false);
          }
        }}
        title={copy.drawer.title}
        description={copy.drawer.description}
        size="lg"
        closeButtonAriaLabel={copy.drawer.closeLabel}
        footer={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsDraftDrawerOpen(false)}
              disabled={previewPending || createPending}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {copy.drawer.cancel}
            </button>
            <SecondaryButton onClick={() => void handlePreview()} disabled={previewPending || createPending}>
              <Search className="h-3.5 w-3.5" />
              {copy.drawer.previewRows}
            </SecondaryButton>
            <AsyncSubmitButton
              onClick={() => void handleCreateJob()}
              isPending={createPending}
              pendingText={copy.drawer.createPending}
            >
              {copy.drawer.create}
            </AsyncSubmitButton>
          </div>
        }
      >
        <fieldset disabled={previewPending || createPending} className="space-y-5 disabled:opacity-70">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-950">
            <p className="font-semibold">{copy.drawer.draftGuideTitle}</p>
            <p className="mt-1 leading-6 text-indigo-900">{copy.drawer.draftGuideDescription}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
            <div className="mb-4 space-y-1">
              <p className="text-sm font-semibold text-slate-900">{copy.drawer.codeFiltersTitle}</p>
              <p className="text-xs leading-5 text-slate-500">{copy.drawer.codeFiltersDescription}</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <TextField
                label={copy.drawer.fields.platformCodes}
                value={draft.platformCodes}
                placeholder={copy.drawer.fields.platformCodesPlaceholder}
                onChange={(value) => setDraft((current) => ({ ...current, platformCodes: value }))}
              />
              <TextField
                label={copy.drawer.fields.membershipClassCodes}
                value={draft.membershipClassCodes}
                placeholder={copy.drawer.fields.membershipClassCodesPlaceholder}
                onChange={(value) => setDraft((current) => ({ ...current, membershipClassCodes: value }))}
              />
              <TextField
                label={copy.drawer.fields.membershipTypeCodes}
                value={draft.membershipTypeCodes}
                placeholder={copy.drawer.fields.membershipTypeCodesPlaceholder}
                onChange={(value) => setDraft((current) => ({ ...current, membershipTypeCodes: value }))}
              />
              <TextField
                label={copy.drawer.fields.membershipLevelCodes}
                value={draft.membershipLevelCodes}
                placeholder={copy.drawer.fields.membershipLevelCodesPlaceholder}
                onChange={(value) => setDraft((current) => ({ ...current, membershipLevelCodes: value }))}
              />
              <TextField
                label={copy.drawer.fields.customerStatusCodes}
                value={draft.statusCodes}
                placeholder={copy.drawer.fields.customerStatusCodesPlaceholder}
                onChange={(value) => setDraft((current) => ({ ...current, statusCodes: value }))}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
            <div className="mb-4 space-y-1">
              <p className="text-sm font-semibold text-slate-900">{copy.drawer.validityTitle}</p>
              <p className="text-xs leading-5 text-slate-500">{copy.drawer.validityDescription}</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <DateField
                label={copy.drawer.fields.validFromStart}
                value={draft.validFromStart}
                onChange={(value) => setDraft((current) => ({ ...current, validFromStart: value }))}
              />
              <DateField
                label={copy.drawer.fields.validFromEnd}
                value={draft.validFromEnd}
                onChange={(value) => setDraft((current) => ({ ...current, validFromEnd: value }))}
              />
              <DateField
                label={copy.drawer.fields.validToStart}
                value={draft.validToStart}
                onChange={(value) => setDraft((current) => ({ ...current, validToStart: value }))}
              />
              <DateField
                label={copy.drawer.fields.validToEnd}
                value={draft.validToEnd}
                onChange={(value) => setDraft((current) => ({ ...current, validToEnd: value }))}
              />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <CheckboxField
                label={copy.drawer.fields.includeExpired}
                checked={draft.includeExpired}
                onChange={(next) => setDraft((current) => ({ ...current, includeExpired: next }))}
              />
              <CheckboxField
                label={copy.drawer.fields.includeInactive}
                checked={draft.includeInactive}
                onChange={(next) => setDraft((current) => ({ ...current, includeInactive: next }))}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
            <div className="mb-4 space-y-1">
              <p className="text-sm font-semibold text-slate-900">{copy.drawer.outputTitle}</p>
              <p className="text-xs leading-5 text-slate-500">{copy.drawer.outputDescription}</p>
            </div>
            <SelectField
              label={copy.drawer.fields.downloadFormat}
              value={draft.format}
              options={reportFormatOptions}
              onChange={(value) => setDraft((current) => ({ ...current, format: value as ReportFormat }))}
            />
          </div>
        </fieldset>
      </ActionDrawer>
    </div>
  );
}
