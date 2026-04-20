'use client';

import {
  Download,
  Mailbox,
  RefreshCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
} from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

import {
  approveMarshmallowMessage,
  type CaptchaMode,
  createMarshmallowExport,
  downloadMarshmallowExport,
  listMarshmallowMessages,
  type MarshmallowConfigResponse,
  type MarshmallowExportFormat,
  type MarshmallowExportJobResponse,
  type MarshmallowMessageListItem,
  type MarshmallowMessageStatus,
  readMarshmallowConfig,
  readMarshmallowExportJob,
  rejectMarshmallowMessage,
  unrejectMarshmallowMessage,
  updateMarshmallowConfig,
  updateMarshmallowMessage,
} from '@/domains/marshmallow-management/api/marshmallow.api';
import {
  formatMarshmallowDateTime,
  formatMarshmallowNumber,
  getMarshmallowActionAriaLabel,
  getMarshmallowExportStatusLabel,
  getMarshmallowMessageStatusLabel,
  useMarshmallowManagementCopy,
} from '@/domains/marshmallow-management/screens/marshmallow-management.copy';
import {
  type ApiPaginationMeta,
  ApiRequestError,
  buildFallbackPagination,
} from '@/platform/http/api';
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

type MessageStatusFilter = 'all' | MarshmallowMessageStatus;
type ReplyFilter = 'all' | 'replied' | 'unreplied';

interface MarshmallowConfigDraft {
  title: string;
  welcomeText: string;
  placeholderText: string;
  thankYouText: string;
  allowAnonymous: boolean;
  captchaMode: CaptchaMode;
  moderationEnabled: boolean;
  autoApprove: boolean;
  profanityFilterEnabled: boolean;
  externalBlocklistEnabled: boolean;
  maxMessageLength: number;
  minMessageLength: number;
  rateLimitPerIp: number;
  rateLimitWindowHours: number;
  reactionsEnabled: boolean;
  allowedReactions: string;
}

interface MessagesPanelState {
  data: MarshmallowMessageListItem[];
  total: number;
  pagination: ApiPaginationMeta;
  stats: {
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    unreadCount: number;
  } | null;
  loading: boolean;
  error: string | null;
}

interface NoticeState {
  tone: 'success' | 'error';
  message: string;
}

interface DialogState {
  messageId: string;
  title: string;
  description: string;
  confirmText: string;
  intent: 'primary' | 'danger';
  successMessage: string;
  errorFallback: string;
  kind: 'approve' | 'reject' | 'unreject';
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function buildConfigDraft(config: MarshmallowConfigResponse): MarshmallowConfigDraft {
  return {
    title: config.title || '',
    welcomeText: config.welcomeText || '',
    placeholderText: config.placeholderText || '',
    thankYouText: config.thankYouText || '',
    allowAnonymous: config.allowAnonymous,
    captchaMode: config.captchaMode,
    moderationEnabled: config.moderationEnabled,
    autoApprove: config.autoApprove,
    profanityFilterEnabled: config.profanityFilterEnabled,
    externalBlocklistEnabled: config.externalBlocklistEnabled,
    maxMessageLength: config.maxMessageLength,
    minMessageLength: config.minMessageLength,
    rateLimitPerIp: config.rateLimitPerIp,
    rateLimitWindowHours: config.rateLimitWindowHours,
    reactionsEnabled: config.reactionsEnabled,
    allowedReactions: config.allowedReactions.join(', '),
  };
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
  status: MarshmallowMessageStatus;
  label: string;
}>) {
  const toneClasses =
    status === 'approved'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'pending'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-rose-100 text-rose-800';

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${toneClasses}`}>
      {label}
    </span>
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

function TextField({
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
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  min = 0,
  onChange,
}: Readonly<{
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}>) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}

function TextareaField({
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
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
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

export function MarshmallowManagementScreen({
  tenantId: _tenantId,
  talentId,
}: Readonly<{
  tenantId: string;
  talentId: string;
}>) {
  const { request, session } = useSession();
  const {
    selectedLocale,
    copy,
    captchaOptions,
    messageStatusOptions,
    replyFilterOptions,
    exportFormatOptions,
  } = useMarshmallowManagementCopy();
  const [config, setConfig] = useState<MarshmallowConfigResponse | null>(null);
  const [draft, setDraft] = useState<MarshmallowConfigDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [messagesPanel, setMessagesPanel] = useState<MessagesPanelState>({
    data: [],
    total: 0,
    pagination: buildFallbackPagination(0, 1, PAGE_SIZE_OPTIONS[0]),
    stats: null,
    loading: true,
    error: null,
  });
  const [messageStatusFilter, setMessageStatusFilter] = useState<MessageStatusFilter>('all');
  const [replyFilter, setReplyFilter] = useState<ReplyFilter>('all');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(PAGE_SIZE_OPTIONS[0]);
  const [savePending, setSavePending] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [dialogPending, setDialogPending] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const [exportFormat, setExportFormat] = useState<MarshmallowExportFormat>('xlsx');
  const [includeRejected, setIncludeRejected] = useState(false);
  const [exportPending, setExportPending] = useState(false);
  const [exportJob, setExportJob] = useState<MarshmallowExportJobResponse | null>(null);
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [downloadPending, setDownloadPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      setLoading(true);
      setLoadError(null);

      try {
        const nextConfig = await readMarshmallowConfig(request, talentId);

        if (cancelled) {
          return;
        }

        setConfig(nextConfig);
        setDraft(buildConfigDraft(nextConfig));
      } catch (reason) {
        if (!cancelled) {
          setLoadError(getErrorMessage(reason, copy.state.loadConfigError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitial();

    return () => {
      cancelled = true;
    };
  }, [copy.state.loadConfigError, request, talentId]);

  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      setMessagesPanel((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      try {
        const nextMessages = await listMarshmallowMessages(request, talentId, {
          page,
          pageSize,
          status: messageStatusFilter === 'all' ? undefined : messageStatusFilter,
          keyword: keyword.trim() || undefined,
          hasReply:
            replyFilter === 'all'
              ? undefined
              : replyFilter === 'replied',
        });

        if (!cancelled) {
          setMessagesPanel({
            data: nextMessages.items,
            total: nextMessages.meta.total,
            pagination: buildPaginationMeta(nextMessages.meta.total, page, pageSize),
            stats: nextMessages.meta.stats,
            loading: false,
            error: null,
          });
        }
      } catch (reason) {
        if (!cancelled) {
          setMessagesPanel({
            data: [],
            total: 0,
            pagination: buildFallbackPagination(0, page, pageSize),
            stats: null,
            loading: false,
            error: getErrorMessage(reason, copy.state.loadMessagesError),
          });
        }
      }
    }

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [copy.state.loadMessagesError, keyword, messageStatusFilter, page, pageSize, replyFilter, request, talentId]);

  async function refreshConfig() {
    const nextConfig = await readMarshmallowConfig(request, talentId);
    setConfig(nextConfig);
    setDraft(buildConfigDraft(nextConfig));
  }

  async function refreshMessages() {
    const nextMessages = await listMarshmallowMessages(request, talentId, {
      page,
      pageSize,
      status: messageStatusFilter === 'all' ? undefined : messageStatusFilter,
      keyword: keyword.trim() || undefined,
      hasReply:
        replyFilter === 'all'
          ? undefined
          : replyFilter === 'replied',
    });

    setMessagesPanel({
      data: nextMessages.items,
      total: nextMessages.meta.total,
      pagination: buildPaginationMeta(nextMessages.meta.total, page, pageSize),
      stats: nextMessages.meta.stats,
      loading: false,
      error: null,
    });
  }

  async function handleRefreshWorkspace() {
    setNotice(null);

    try {
      await Promise.all([refreshConfig(), refreshMessages()]);
      if (exportJobId) {
        const nextExportJob = await readMarshmallowExportJob(request, talentId, exportJobId);
        setExportJob(nextExportJob);
      }
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.state.refreshError),
      });
    }
  }

  async function handleSaveConfig() {
    if (!config || !draft) {
      return;
    }

    setSavePending(true);
    setSaveSuccess(null);
    setNotice(null);

    try {
      const nextConfig = await updateMarshmallowConfig(request, talentId, {
        isEnabled: config.isEnabled,
        title: draft.title || undefined,
        welcomeText: draft.welcomeText || undefined,
        placeholderText: draft.placeholderText || undefined,
        thankYouText: draft.thankYouText || undefined,
        allowAnonymous: draft.allowAnonymous,
        captchaMode: draft.captchaMode,
        moderationEnabled: draft.moderationEnabled,
        autoApprove: draft.autoApprove,
        profanityFilterEnabled: draft.profanityFilterEnabled,
        externalBlocklistEnabled: draft.externalBlocklistEnabled,
        maxMessageLength: draft.maxMessageLength,
        minMessageLength: draft.minMessageLength,
        rateLimitPerIp: draft.rateLimitPerIp,
        rateLimitWindowHours: draft.rateLimitWindowHours,
        reactionsEnabled: draft.reactionsEnabled,
        allowedReactions: draft.allowedReactions
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        version: config.version,
      });

      setConfig(nextConfig);
      setDraft(buildConfigDraft(nextConfig));
      setSaveSuccess(copy.state.saveSuccess);
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.state.saveError),
      });
    } finally {
      setSavePending(false);
    }
  }

  async function handleConfirmModeration() {
    if (!dialogState) {
      return;
    }

    setDialogPending(true);
    setNotice(null);

    try {
      if (dialogState.kind === 'approve') {
        await approveMarshmallowMessage(request, talentId, dialogState.messageId);
      } else if (dialogState.kind === 'reject') {
        await rejectMarshmallowMessage(request, talentId, dialogState.messageId);
      } else {
        await unrejectMarshmallowMessage(request, talentId, dialogState.messageId);
      }

      await Promise.all([refreshConfig(), refreshMessages()]);
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

  async function handleToggleFlags(message: MarshmallowMessageListItem, input: { isRead?: boolean; isStarred?: boolean }) {
    setNotice(null);

    try {
      await updateMarshmallowMessage(request, talentId, message.id, input);
      await refreshMessages();
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.state.toggleMessageError),
      });
    }
  }

  async function handleCreateExport() {
    setExportPending(true);
    setNotice(null);

    try {
      const response = await createMarshmallowExport(request, talentId, {
        format: exportFormat,
        status: messageStatusFilter === 'all' ? undefined : [messageStatusFilter],
        includeRejected,
      });
      const nextJob = await readMarshmallowExportJob(request, talentId, response.jobId);
      setExportJobId(response.jobId);
      setExportJob(nextJob);
      setNotice({
        tone: 'success',
        message: `${copy.actions.createExportJob}: ${response.jobId}`,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.state.createExportError),
      });
    } finally {
      setExportPending(false);
    }
  }

  async function handleRefreshExport() {
    if (!exportJobId) {
      return;
    }

    setNotice(null);

    try {
      const nextJob = await readMarshmallowExportJob(request, talentId, exportJobId);
      setExportJob(nextJob);
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.state.refreshExportError),
      });
    }
  }

  async function handleDownloadExport() {
    if (!exportJobId) {
      return;
    }

    setDownloadPending(true);
    setNotice(null);

    try {
      const result = await downloadMarshmallowExport(request, talentId, exportJobId);
      window.open(result.url, '_blank', 'noopener,noreferrer');
      setNotice({
        tone: 'success',
        message: copy.state.downloadSuccess,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.state.downloadError),
      });
    } finally {
      setDownloadPending(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <GlassSurface className="p-8">
          <p className="text-sm font-medium text-slate-500">{copy.state.loading}</p>
        </GlassSurface>
      </div>
    );
  }

  if (loadError || !config || !draft) {
    return <StateView status="error" title={copy.state.unavailableTitle} description={loadError || undefined} />;
  }

  const pageRange = getPaginationRange(messagesPanel.pagination, messagesPanel.data.length);
  const paginationLabel = pickLocaleText(selectedLocale, {
    en: `Page ${messagesPanel.pagination.page} of ${messagesPanel.pagination.totalPages}`,
    zh_HANS: `第 ${messagesPanel.pagination.page} / ${messagesPanel.pagination.totalPages} 页`,
    zh_HANT: `第 ${messagesPanel.pagination.page} / ${messagesPanel.pagination.totalPages} 頁`,
    ja: `${messagesPanel.pagination.totalPages} ページ中 ${messagesPanel.pagination.page} ページ`,
    ko: `${messagesPanel.pagination.totalPages}페이지 중 ${messagesPanel.pagination.page}페이지`,
    fr: `Page ${messagesPanel.pagination.page} sur ${messagesPanel.pagination.totalPages}`,
  });
  const paginationRangeLabel =
    messagesPanel.pagination.totalCount === 0
      ? pickLocaleText(selectedLocale, {
          en: 'No messages are currently available.',
          zh_HANS: '当前没有消息记录。',
          zh_HANT: '目前沒有訊息紀錄。',
          ja: '現在表示できるメッセージはありません。',
          ko: '표시할 메시지가 없습니다.',
          fr: "Aucun message n'est disponible pour le moment.",
        })
      : pickLocaleText(selectedLocale, {
          en: `Showing ${pageRange.start}-${pageRange.end} of ${messagesPanel.pagination.totalCount}`,
          zh_HANS: `显示第 ${pageRange.start}-${pageRange.end} 条，共 ${messagesPanel.pagination.totalCount} 条`,
          zh_HANT: `顯示第 ${pageRange.start}-${pageRange.end} 筆，共 ${messagesPanel.pagination.totalCount} 筆`,
          ja: `${messagesPanel.pagination.totalCount} 件中 ${pageRange.start}-${pageRange.end} 件を表示`,
          ko: `${messagesPanel.pagination.totalCount}개 중 ${pageRange.start}-${pageRange.end}개 표시`,
          fr: `Affichage de ${pageRange.start} à ${pageRange.end} sur ${messagesPanel.pagination.totalCount}`,
        });
  const pageSizeLabel = pickLocaleText(selectedLocale, {
    en: 'Rows per page',
    zh_HANS: '每页显示',
    zh_HANT: '每頁顯示',
    ja: '1ページあたり',
    ko: '페이지당 행 수',
    fr: 'Lignes par page',
  });

  return (
    <div className="space-y-6">
      <GlassSurface className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              <Mailbox className="h-3.5 w-3.5" />
              {copy.header.eyebrow}
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-slate-950">{copy.header.title}</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">{copy.header.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SecondaryButton onClick={() => void handleRefreshWorkspace()} disabled={messagesPanel.loading}>
              <RefreshCcw className="h-3.5 w-3.5" />
              {copy.actions.refreshWorkspace}
            </SecondaryButton>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label={copy.summary.tenantLabel}
              value={session?.tenantName || copy.summary.tenantFallback}
              hint={copy.summary.tenantHint}
            />
            <SummaryCard
              label={copy.summary.messageVolumeLabel}
              value={formatMarshmallowNumber(selectedLocale, config.stats.totalMessages)}
              hint={copy.summary.messageVolumeHint}
            />
            <SummaryCard
              label={copy.summary.unreadPendingLabel}
              value={`${formatMarshmallowNumber(selectedLocale, config.stats.unreadCount)} / ${formatMarshmallowNumber(selectedLocale, config.stats.pendingCount)}`}
              hint={copy.summary.unreadPendingHint}
            />
            <SummaryCard
              label={copy.summary.publicRouteLabel}
              value={config.isEnabled ? copy.summary.routeEnabled : copy.summary.routeDisabled}
              hint={config.marshmallowUrl}
            />
          </div>
        </div>
      </GlassSurface>

      {notice ? <NoticeBanner tone={notice.tone} message={notice.message} /> : null}
      {saveSuccess ? <NoticeBanner tone="success" message={saveSuccess} /> : null}

      <GlassSurface className="p-6">
        <FormSection
          title={copy.config.title}
          description={copy.config.description}
          actions={
            <AsyncSubmitButton
              onClick={() => void handleSaveConfig()}
              isPending={savePending}
              pendingText={copy.actions.savePending}
            >
              {copy.actions.saveConfig}
            </AsyncSubmitButton>
          }
        >
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-4 shadow-sm">
            <p className="text-sm font-semibold text-indigo-950">{copy.config.publicRouteTitle}</p>
            <p className="mt-2 text-sm leading-6 text-indigo-900">{copy.config.publicRouteDescription}</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <TextField
              label={copy.config.fields.title}
              value={draft.title}
              onChange={(value) => setDraft((current) => (current ? { ...current, title: value } : current))}
            />
            <TextField
              label={copy.config.fields.allowedReactions}
              value={draft.allowedReactions}
              onChange={(value) => setDraft((current) => (current ? { ...current, allowedReactions: value } : current))}
            />
            <TextareaField
              label={copy.config.fields.welcomeText}
              value={draft.welcomeText}
              onChange={(value) => setDraft((current) => (current ? { ...current, welcomeText: value } : current))}
            />
            <TextareaField
              label={copy.config.fields.thankYouText}
              value={draft.thankYouText}
              onChange={(value) => setDraft((current) => (current ? { ...current, thankYouText: value } : current))}
            />
            <TextField
              label={copy.config.fields.placeholderText}
              value={draft.placeholderText}
              onChange={(value) => setDraft((current) => (current ? { ...current, placeholderText: value } : current))}
            />
            <SelectField
              label={copy.config.fields.captchaMode}
              value={draft.captchaMode}
              options={captchaOptions}
              onChange={(value) => setDraft((current) => (current ? { ...current, captchaMode: value as MarshmallowConfigDraft['captchaMode'] } : current))}
            />
            <NumberField
              label={copy.config.fields.minMessageLength}
              value={draft.minMessageLength}
              min={1}
              onChange={(value) => setDraft((current) => (current ? { ...current, minMessageLength: value } : current))}
            />
            <NumberField
              label={copy.config.fields.maxMessageLength}
              value={draft.maxMessageLength}
              min={1}
              onChange={(value) => setDraft((current) => (current ? { ...current, maxMessageLength: value } : current))}
            />
            <NumberField
              label={copy.config.fields.rateLimitPerIp}
              value={draft.rateLimitPerIp}
              min={1}
              onChange={(value) => setDraft((current) => (current ? { ...current, rateLimitPerIp: value } : current))}
            />
            <NumberField
              label={copy.config.fields.rateLimitWindowHours}
              value={draft.rateLimitWindowHours}
              min={1}
              onChange={(value) => setDraft((current) => (current ? { ...current, rateLimitWindowHours: value } : current))}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <CheckboxField
              label={copy.config.fields.allowAnonymous}
              checked={draft.allowAnonymous}
              onChange={(next) => setDraft((current) => (current ? { ...current, allowAnonymous: next } : current))}
            />
            <CheckboxField
              label={copy.config.fields.requireModeration}
              checked={draft.moderationEnabled}
              onChange={(next) => setDraft((current) => (current ? { ...current, moderationEnabled: next } : current))}
            />
            <CheckboxField
              label={copy.config.fields.autoApprove}
              checked={draft.autoApprove}
              onChange={(next) => setDraft((current) => (current ? { ...current, autoApprove: next } : current))}
            />
            <CheckboxField
              label={copy.config.fields.profanityFilter}
              checked={draft.profanityFilterEnabled}
              onChange={(next) => setDraft((current) => (current ? { ...current, profanityFilterEnabled: next } : current))}
            />
            <CheckboxField
              label={copy.config.fields.externalBlocklist}
              checked={draft.externalBlocklistEnabled}
              onChange={(next) => setDraft((current) => (current ? { ...current, externalBlocklistEnabled: next } : current))}
            />
            <CheckboxField
              label={copy.config.fields.enablePublicReactions}
              checked={draft.reactionsEnabled}
              onChange={(next) => setDraft((current) => (current ? { ...current, reactionsEnabled: next } : current))}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <SummaryCard label={copy.config.stats.versionLabel} value={String(config.version)} hint={copy.config.stats.versionHint} />
            <SummaryCard
              label={copy.config.stats.updatedAtLabel}
              value={formatMarshmallowDateTime(selectedLocale, config.updatedAt, copy.common.never)}
              hint={copy.config.stats.updatedAtHint}
            />
            <SummaryCard
              label={copy.config.stats.mailboxUrlLabel}
              value={config.isEnabled ? copy.config.stats.mailboxUrlLive : copy.config.stats.mailboxUrlDisabled}
              hint={config.marshmallowUrl}
            />
          </div>
        </FormSection>
      </GlassSurface>

      <GlassSurface className="p-6">
        <FormSection
          title={copy.moderation.title}
          description={copy.moderation.description}
        >
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-3">
              <TextField
                label={copy.moderation.filters.keywordSearch}
                value={keyword}
                onChange={(value) => {
                  setKeyword(value);
                  setPage(1);
                }}
              />
              <SelectField
                label={copy.moderation.filters.messageStatus}
                value={messageStatusFilter}
                options={messageStatusOptions}
                onChange={(value) => {
                  setMessageStatusFilter(value as MessageStatusFilter);
                  setPage(1);
                }}
              />
              <SelectField
                label={copy.moderation.filters.replyState}
                value={replyFilter}
                options={replyFilterOptions}
                onChange={(value) => {
                  setReplyFilter(value as ReplyFilter);
                  setPage(1);
                }}
              />
            </div>

            {messagesPanel.error && messagesPanel.data.length === 0 ? (
              <StateView status="error" title={copy.moderation.table.errorTitle} description={messagesPanel.error} />
            ) : (
              <TableShell
                columns={[...copy.moderation.table.columns]}
                dataLength={messagesPanel.data.length}
                isLoading={messagesPanel.loading}
                isEmpty={!messagesPanel.loading && messagesPanel.data.length === 0}
                emptyTitle={copy.moderation.table.emptyTitle}
                emptyDescription={copy.moderation.table.emptyDescription}
              >
                {messagesPanel.data.map((message) => (
                  <tr key={message.id} className="align-top">
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-900">{message.senderName || copy.moderation.table.anonymousSender}</p>
                        <p className="max-w-md text-sm leading-6 text-slate-700">{message.content}</p>
                        {message.replyContent ? (
                          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            {copy.moderation.table.replyPrefix} {message.replyContent}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <StatusBadge status={message.status} label={getMarshmallowMessageStatusLabel(selectedLocale, message.status)} />
                        {message.rejectionReason ? (
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{message.rejectionReason}</p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm text-slate-700">
                        <p>{message.isRead ? copy.moderation.table.read : copy.moderation.table.unread}</p>
                        <p>{message.isStarred ? copy.moderation.table.starred : copy.moderation.table.notStarred}</p>
                        <p>{message.replyContent ? copy.moderation.table.hasReply : copy.moderation.table.awaitingReply}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {Object.entries(message.reactionCounts).length > 0
                        ? Object.entries(message.reactionCounts)
                            .map(([reaction, count]) => `${reaction} ${count}`)
                            .join(', ')
                        : copy.moderation.table.noReactions}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {formatMarshmallowDateTime(selectedLocale, message.createdAt, copy.common.never)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <SecondaryButton
                          onClick={() =>
                            setDialogState({
                              messageId: message.id,
                              title: copy.moderation.dialogs.approveTitle,
                              description: copy.moderation.dialogs.approveDescription,
                              confirmText: copy.moderation.dialogs.approveConfirm,
                              intent: 'primary',
                              successMessage: copy.moderation.dialogs.approveSuccess,
                              errorFallback: copy.moderation.dialogs.approveError,
                              kind: 'approve',
                            })
                          }
                          disabled={message.status === 'approved'}
                          ariaLabel={getMarshmallowActionAriaLabel(selectedLocale, 'approve', message.id)}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {copy.actions.approve}
                        </SecondaryButton>
                        <SecondaryButton
                          onClick={() =>
                            setDialogState(
                              message.status === 'rejected'
                                ? {
                                    messageId: message.id,
                                    title: copy.moderation.dialogs.restoreTitle,
                                    description: copy.moderation.dialogs.restoreDescription,
                                    confirmText: copy.moderation.dialogs.restoreConfirm,
                                    intent: 'primary',
                                    successMessage: copy.moderation.dialogs.restoreSuccess,
                                    errorFallback: copy.moderation.dialogs.restoreError,
                                    kind: 'unreject',
                                  }
                                : {
                                    messageId: message.id,
                                    title: copy.moderation.dialogs.rejectTitle,
                                    description: copy.moderation.dialogs.rejectDescription,
                                    confirmText: copy.moderation.dialogs.rejectConfirm,
                                    intent: 'danger',
                                    successMessage: copy.moderation.dialogs.rejectSuccess,
                                    errorFallback: copy.moderation.dialogs.rejectError,
                                    kind: 'reject',
                                  },
                            )
                          }
                          ariaLabel={
                            message.status === 'rejected'
                              ? getMarshmallowActionAriaLabel(selectedLocale, 'restore', message.id)
                              : getMarshmallowActionAriaLabel(selectedLocale, 'reject', message.id)
                          }
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          {message.status === 'rejected' ? copy.actions.restore : copy.actions.reject}
                        </SecondaryButton>
                        <SecondaryButton
                          onClick={() => void handleToggleFlags(message, { isRead: !message.isRead })}
                          ariaLabel={
                            message.isRead
                              ? getMarshmallowActionAriaLabel(selectedLocale, 'markUnread', message.id)
                              : getMarshmallowActionAriaLabel(selectedLocale, 'markRead', message.id)
                          }
                        >
                          <Search className="h-3.5 w-3.5" />
                          {message.isRead ? copy.actions.markUnread : copy.actions.markRead}
                        </SecondaryButton>
                        <SecondaryButton
                          onClick={() => void handleToggleFlags(message, { isStarred: !message.isStarred })}
                          ariaLabel={
                            message.isStarred
                              ? getMarshmallowActionAriaLabel(selectedLocale, 'unstar', message.id)
                              : getMarshmallowActionAriaLabel(selectedLocale, 'star', message.id)
                          }
                        >
                          <Star className="h-3.5 w-3.5" />
                          {message.isStarred ? copy.actions.unstar : copy.actions.star}
                        </SecondaryButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </TableShell>
            )}

            {!messagesPanel.error ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-700">{paginationLabel}</p>
                  <p className="text-xs text-slate-500">{paginationRangeLabel}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <span className="font-medium text-slate-700">{pageSizeLabel}</span>
                    <select
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value) as PageSizeOption);
                        setPage(1);
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                    >
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center gap-2">
                    <SecondaryButton
                      disabled={!messagesPanel.pagination.hasPrev || messagesPanel.loading}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      {pickLocaleText(selectedLocale, {
                        en: 'Previous',
                        zh_HANS: '上一页',
                        zh_HANT: '上一頁',
                        ja: '前へ',
                        ko: '이전',
                        fr: 'Précédent',
                      })}
                    </SecondaryButton>
                    <SecondaryButton
                      disabled={!messagesPanel.pagination.hasNext || messagesPanel.loading}
                      onClick={() =>
                        setPage((current) =>
                          Math.min(messagesPanel.pagination.totalPages, current + 1),
                        )
                      }
                    >
                      {pickLocaleText(selectedLocale, {
                        en: 'Next',
                        zh_HANS: '下一页',
                        zh_HANT: '下一頁',
                        ja: '次へ',
                        ko: '다음',
                        fr: 'Suivant',
                      })}
                    </SecondaryButton>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </FormSection>
      </GlassSurface>

      <GlassSurface className="p-6">
        <FormSection
          title={copy.export.title}
          description={copy.export.description}
          actions={
            <AsyncSubmitButton
              onClick={() => void handleCreateExport()}
              isPending={exportPending}
              pendingText={copy.actions.queueExportPending}
            >
              {copy.actions.createExportJob}
            </AsyncSubmitButton>
          }
        >
          <div className="grid gap-4 xl:grid-cols-3">
            <SelectField
              label={copy.export.formatLabel}
              value={exportFormat}
              options={exportFormatOptions}
              onChange={(value) => setExportFormat(value as typeof exportFormat)}
            />
            <CheckboxField
              label={copy.export.includeRejected}
              checked={includeRejected}
              onChange={setIncludeRejected}
            />
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
              <p className="text-sm font-semibold text-slate-900">{copy.export.currentScopeTitle}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {copy.export.currentScopeStatusPrefix}{' '}
                {messageStatusFilter === 'all' ? copy.export.allVisibleStatuses : getMarshmallowMessageStatusLabel(selectedLocale, messageStatusFilter)}
              </p>
            </div>
          </div>

          {exportJob ? (
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.export.latestJobTitle}</p>
                  <p className="text-base font-semibold text-slate-950">{exportJob.fileName || exportJob.id}</p>
                  <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <p>{copy.export.fields.status}: {getMarshmallowExportStatusLabel(selectedLocale, exportJob.status)}</p>
                    <p>{copy.export.fields.format}: {exportJob.format.toUpperCase()}</p>
                    <p>
                      {copy.export.fields.processed}: {formatMarshmallowNumber(selectedLocale, exportJob.processedRecords)} /{' '}
                      {formatMarshmallowNumber(selectedLocale, exportJob.totalRecords)}
                    </p>
                    <p>{copy.export.fields.created}: {formatMarshmallowDateTime(selectedLocale, exportJob.createdAt, copy.common.never)}</p>
                    <p>{copy.export.fields.completed}: {formatMarshmallowDateTime(selectedLocale, exportJob.completedAt, copy.common.never)}</p>
                    <p>{copy.export.fields.expires}: {formatMarshmallowDateTime(selectedLocale, exportJob.expiresAt, copy.common.never)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <SecondaryButton onClick={() => void handleRefreshExport()}>
                    <RefreshCcw className="h-3.5 w-3.5" />
                    {copy.actions.refreshExport}
                  </SecondaryButton>
                  <SecondaryButton
                    onClick={() => void handleDownloadExport()}
                    disabled={!exportJob.downloadUrl || downloadPending}
                    ariaLabel={copy.actions.downloadExportAria}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {copy.actions.downloadExport}
                  </SecondaryButton>
                </div>
              </div>
            </div>
          ) : (
            <StateView
              status="empty"
              title={copy.export.noJobTitle}
              description={copy.export.noJobDescription}
            />
          )}
        </FormSection>
      </GlassSurface>

      <ConfirmActionDialog
        open={dialogState !== null}
        title={dialogState?.title || ''}
        description={dialogState?.description || ''}
        confirmText={dialogState?.confirmText}
        intent={dialogState?.intent}
        isPending={dialogPending}
        onCancel={() => {
          if (!dialogPending) {
            setDialogState(null);
          }
        }}
        onConfirm={() => void handleConfirmModeration()}
      />
    </div>
  );
}
