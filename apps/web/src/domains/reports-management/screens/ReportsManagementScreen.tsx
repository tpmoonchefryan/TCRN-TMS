'use client';

import {
  type MfrFilterCriteria,
  type PiiPlatformReportCreateResponse,
  type ReportCatalogItem,
  type ReportFilterField,
  type ReportFormat,
  type ReportJobStatus,
  resolveTrilingualLocaleFamily,
} from '@tcrn/shared';
import {
  Download,
  ExternalLink,
  Eye,
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
  listReportCatalog,
  listReportConfigFilterOptions,
  listReportDictionaryFilterOptions,
  type MfrSearchResult,
  readMfrJob,
  type ReportFilterOption,
  type ReportJobListItem,
  type ReportJobResponse,
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

interface CatalogPanelState {
  data: ReportCatalogItem[];
  loading: boolean;
  error: string | null;
}

interface PreviewPanelState {
  data: MfrSearchResult | null;
  loading: boolean;
  error: string | null;
}

interface JobDetailPanelState {
  data: ReportJobResponse | null;
  loading: boolean;
  error: string | null;
}

interface FilterOptionsPanelState {
  data: Record<string, ReportFilterOption[]>;
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

interface OptionPickerState {
  fieldId: string;
  page: number;
  search: string;
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

const OPTION_PICKER_PAGE_SIZE = 20;

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

function joinCodes(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').join(', ')
    : '';
}

function readSelectedCodes(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }

  return splitCodes(value) ?? [];
}

function toggleSelectedCode(value: unknown, code: string) {
  const current = readSelectedCodes(value);
  const next = current.includes(code)
    ? current.filter((item) => item !== code)
    : [...current, code];

  return next.join(', ');
}

function removeSelectedCode(value: unknown, code: string) {
  return readSelectedCodes(value).filter((item) => item !== code).join(', ');
}

function readBooleanFilter(value: unknown) {
  return typeof value === 'boolean' ? value : false;
}

function readStringFilter(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function buildDraftFromFilters(
  filters: Record<string, unknown>,
  format: ReportFormat = 'xlsx',
): ReportFilterDraft {
  return {
    platformCodes: joinCodes(filters.platformCodes),
    membershipClassCodes: joinCodes(filters.membershipClassCodes),
    membershipTypeCodes: joinCodes(filters.membershipTypeCodes),
    membershipLevelCodes: joinCodes(filters.membershipLevelCodes),
    statusCodes: joinCodes(filters.statusCodes),
    validFromStart: readStringFilter(filters.validFromStart),
    validFromEnd: readStringFilter(filters.validFromEnd),
    validToStart: readStringFilter(filters.validToStart),
    validToEnd: readStringFilter(filters.validToEnd),
    includeExpired: readBooleanFilter(filters.includeExpired),
    includeInactive: readBooleanFilter(filters.includeInactive),
    format,
  };
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

function updateDraftField(
  draft: ReportFilterDraft,
  key: string,
  value: string | boolean,
): ReportFilterDraft {
  if (key === 'platformCodes') {
    return { ...draft, platformCodes: String(value) };
  }

  if (key === 'membershipClassCodes') {
    return { ...draft, membershipClassCodes: String(value) };
  }

  if (key === 'membershipTypeCodes') {
    return { ...draft, membershipTypeCodes: String(value) };
  }

  if (key === 'membershipLevelCodes') {
    return { ...draft, membershipLevelCodes: String(value) };
  }

  if (key === 'statusCodes') {
    return { ...draft, statusCodes: String(value) };
  }

  if (key === 'validFromStart') {
    return { ...draft, validFromStart: String(value) };
  }

  if (key === 'validFromEnd') {
    return { ...draft, validFromEnd: String(value) };
  }

  if (key === 'validToStart') {
    return { ...draft, validToStart: String(value) };
  }

  if (key === 'validToEnd') {
    return { ...draft, validToEnd: String(value) };
  }

  if (key === 'includeExpired') {
    return { ...draft, includeExpired: Boolean(value) };
  }

  if (key === 'includeInactive') {
    return { ...draft, includeInactive: Boolean(value) };
  }

  return draft;
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

function MetricChip({
  label,
  value,
  hint,
}: Readonly<{
  label: string;
  value: string;
  hint?: string;
}>) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white/80 px-3 py-2">
      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</p>
      {hint ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{hint}</p> : null}
    </div>
  );
}

function DrawerStep({
  number,
  title,
  description,
  children,
}: Readonly<{
  number: string;
  title: string;
  description: string;
  children: ReactNode;
}>) {
  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white/75 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
          {number}
        </span>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          <p className="text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
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

function getFilterFieldValue(draft: ReportFilterDraft, key: string) {
  if (key === 'platformCodes') {
    return draft.platformCodes;
  }

  if (key === 'membershipClassCodes') {
    return draft.membershipClassCodes;
  }

  if (key === 'membershipTypeCodes') {
    return draft.membershipTypeCodes;
  }

  if (key === 'membershipLevelCodes') {
    return draft.membershipLevelCodes;
  }

  if (key === 'statusCodes') {
    return draft.statusCodes;
  }

  if (key === 'validFromStart') {
    return draft.validFromStart;
  }

  if (key === 'validFromEnd') {
    return draft.validFromEnd;
  }

  if (key === 'validToStart') {
    return draft.validToStart;
  }

  if (key === 'validToEnd') {
    return draft.validToEnd;
  }

  if (key === 'includeExpired') {
    return draft.includeExpired;
  }

  if (key === 'includeInactive') {
    return draft.includeInactive;
  }

  return '';
}

function describeFilterFieldSource(field: ReportFilterField) {
  if ('source' in field) {
    if (field.source.kind === 'config-entity') {
      return field.source.entityType;
    }

    return field.source.dictionaryCode;
  }

  return null;
}

function filterOptionsBySearch(options: ReportFilterOption[], search: string) {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return options;
  }

  return options.filter((option) =>
    `${option.label} ${option.value}`.toLowerCase().includes(normalizedSearch),
  );
}

function resolveSelectedOptionLabels(options: ReportFilterOption[], selectedCodes: string[]) {
  return selectedCodes.map((code) => {
    const option = options.find((item) => item.value === code);
    return option?.label ?? code;
  });
}

function SchemaFilterField({
  field,
  draft,
  locale,
  options,
  optionsLoading = false,
  optionsError = null,
  advanced = false,
  disabled = false,
  onChange,
  onOpenPicker,
}: Readonly<{
  field: ReportFilterField;
  draft: ReportFilterDraft;
  locale: string;
  options?: ReportFilterOption[];
  optionsLoading?: boolean;
  optionsError?: string | null;
  advanced?: boolean;
  disabled?: boolean;
  onChange: (key: string, value: string | boolean) => void;
  onOpenPicker: (fieldId: string) => void;
}>) {
  const label = pickLocaleText(locale, field.label);
  const description = field.description ? pickLocaleText(locale, field.description) : null;
  const source = describeFilterFieldSource(field);

  if (field.type === 'date-range') {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          {description ? <p className="text-xs leading-5 text-slate-500">{description}</p> : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <DateField
            label={pickLocaleText(locale, {
              en: `${label} start`,
              zh_HANS: `${label}（起）`,
              zh_HANT: `${label}（起）`,
              ja: `${label} 開始`,
              ko: `${label} 시작`,
              fr: `${label} debut`,
            })}
            value={String(getFilterFieldValue(draft, field.fromField))}
            onChange={(value) => onChange(field.fromField, value)}
          />
          <DateField
            label={pickLocaleText(locale, {
              en: `${label} end`,
              zh_HANS: `${label}（止）`,
              zh_HANT: `${label}（止）`,
              ja: `${label} 終了`,
              ko: `${label} 종료`,
              fr: `${label} fin`,
            })}
            value={String(getFilterFieldValue(draft, field.toField))}
            onChange={(value) => onChange(field.toField, value)}
          />
        </div>
      </div>
    );
  }

  if (field.type === 'boolean') {
    return (
      <CheckboxField
        label={label}
        checked={Boolean(getFilterFieldValue(draft, field.targetField))}
        onChange={(next) => onChange(field.targetField, next)}
      />
    );
  }

  if (field.type === 'enum-select') {
    return (
      <SelectField
        label={label}
        value={String(getFilterFieldValue(draft, field.targetField))}
        options={[
          { value: '', label: pickLocaleText(locale, {
            en: 'Any',
            zh_HANS: '不限',
            zh_HANT: '不限',
            ja: '指定なし',
            ko: '전체',
            fr: 'Tous',
          }) },
          ...field.options.map((option) => ({
            value: option.value,
            label: pickLocaleText(locale, option.label),
          })),
        ]}
        onChange={(value) => onChange(field.targetField, value)}
      />
    );
  }

  if (field.type === 'config-multi-select' || field.type === 'dictionary-multi-select') {
    const selectedCodes = readSelectedCodes(getFilterFieldValue(draft, field.targetField));
    const visibleOptions = options ?? [];
    const selectedLabels = resolveSelectedOptionLabels(visibleOptions, selectedCodes);
    const selectedCountLabel = pickLocaleText(locale, {
      en: `${selectedCodes.length} selected`,
      zh_HANS: `已选择 ${selectedCodes.length} 项`,
      zh_HANT: `已選擇 ${selectedCodes.length} 項`,
      ja: `${selectedCodes.length} 件選択済み`,
      ko: `${selectedCodes.length}개 선택됨`,
      fr: `${selectedCodes.length} sélectionné(s)`,
    });

    return (
      <section
        role="group"
        aria-label={label}
        className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-slate-800">{label}</p>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {selectedCountLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenPicker(field.id)}
            disabled={disabled || optionsLoading}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={pickLocaleText(locale, {
              en: `Select ${label}`,
              zh_HANS: `选择${label}`,
              zh_HANT: `選擇${label}`,
              ja: `${label}を選択`,
              ko: `${label} 선택`,
              fr: `Sélectionner ${label}`,
            })}
          >
            {pickLocaleText(locale, {
              en: 'Select',
              zh_HANS: '选择',
              zh_HANT: '選擇',
              ja: '選択',
              ko: '선택',
              fr: 'Sélectionner',
            })}
          </button>
        </div>
        {description || source ? (
          <p className="text-xs leading-5 text-slate-500">
            {[description, source].filter(Boolean).join(' ')}
          </p>
        ) : null}
        {optionsError ? (
          <p className="text-xs font-medium text-rose-700">{optionsError}</p>
        ) : null}
        {optionsLoading && visibleOptions.length === 0 ? (
          <p className="text-xs text-slate-500">
            {pickLocaleText(locale, {
              en: 'Loading options...',
              zh_HANS: '正在加载选项...',
              zh_HANT: '正在載入選項...',
              ja: '選択肢を読み込み中...',
              ko: '옵션을 불러오는 중...',
              fr: 'Chargement des options...',
            })}
          </p>
        ) : selectedLabels.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedLabels.slice(0, 4).map((selectedLabel, index) => (
              <span
                key={`${selectedCodes[index]}-${selectedLabel}`}
                className="max-w-full truncate rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800"
                title={selectedLabel}
              >
                {selectedLabel}
              </span>
            ))}
            {selectedLabels.length > 4 ? (
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                +{selectedLabels.length - 4}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {pickLocaleText(locale, {
              en: visibleOptions.length > 0 ? 'No options selected.' : 'No configured options are available.',
              zh_HANS: visibleOptions.length > 0 ? '未选择选项。' : '当前没有已配置选项。',
              zh_HANT: visibleOptions.length > 0 ? '未選擇選項。' : '目前沒有已設定選項。',
              ja: visibleOptions.length > 0 ? '選択されていません。' : '利用できる設定済み選択肢がありません。',
              ko: visibleOptions.length > 0 ? '선택된 옵션이 없습니다.' : '사용 가능한 구성 옵션이 없습니다.',
              fr: visibleOptions.length > 0 ? 'Aucune option sélectionnée.' : 'Aucune option configuree disponible.',
            })}
          </p>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-2">
      <TextField
        label={label}
        value={String(getFilterFieldValue(draft, field.targetField))}
        placeholder={source ? `${source}: code-a, code-b` : 'code-a, code-b'}
        onChange={(value) => onChange(field.targetField, value)}
      />
      {description || source || advanced ? (
        <p className="text-xs leading-5 text-slate-500">
          {[
            description,
            source
              ? pickLocaleText(locale, {
                  en: `Source: ${source}`,
                  zh_HANS: `来源：${source}`,
                  zh_HANT: `來源：${source}`,
                  ja: `ソース: ${source}`,
                  ko: `소스: ${source}`,
                  fr: `Source : ${source}`,
                })
              : null,
            advanced
              ? pickLocaleText(locale, {
                  en: 'Advanced raw-code fallback.',
                  zh_HANS: '高级原始代码兜底。',
                  zh_HANT: '進階原始代碼備援。',
                  ja: '高度な生コードのフォールバックです。',
                  ko: '고급 원시 코드 대체 입력입니다.',
                  fr: 'Fallback avance par codes bruts.',
                })
              : null,
          ].filter(Boolean).join(' ')}
        </p>
      ) : null}
    </div>
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
  const [catalogPanel, setCatalogPanel] = useState<CatalogPanelState>({
    data: [],
    loading: true,
    error: null,
  });
  const [filterOptionsPanel, setFilterOptionsPanel] = useState<FilterOptionsPanelState>({
    data: {},
    loading: false,
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
  const [selectedReportId, setSelectedReportId] = useState<string>('mfr');
  const [detailJobId, setDetailJobId] = useState<string | null>(null);
  const [detailPanel, setDetailPanel] = useState<JobDetailPanelState>({
    data: null,
    loading: false,
    error: null,
  });
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [portalHandoff, setPortalHandoff] = useState<PiiPlatformReportCreateResponse | null>(null);
  const [activeView, setActiveView] = useState<ReportsView>(urlActiveView);
  const [optionPicker, setOptionPicker] = useState<OptionPickerState | null>(null);

  useEffect(() => {
    setActiveView((current) => (current === urlActiveView ? current : urlActiveView));
    setJobStatusFilter((current) => (current === urlJobStatusFilter ? current : urlJobStatusFilter));
    setPage((current) => (current === urlPage ? current : urlPage));
    setPageSize((current) => (current === urlPageSize ? current : urlPageSize));
  }, [urlActiveView, urlJobStatusFilter, urlPage, urlPageSize]);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setCatalogPanel((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      try {
        const response = await listReportCatalog(request);

        if (!cancelled) {
          setCatalogPanel({
            data: response.items,
            loading: false,
            error: null,
          });
          setSelectedReportId((current) => response.items.some((item) => item.id === current)
            ? current
            : response.items[0]?.id ?? 'mfr');
        }
      } catch (reason) {
        if (!cancelled) {
          setCatalogPanel({
            data: [],
            loading: false,
            error: getErrorMessage(reason, copy.state.loadCatalogError),
          });
        }
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [copy.state.loadCatalogError, request]);

  useEffect(() => {
    const selectedReport = catalogPanel.data.find((report) => report.id === selectedReportId);
    const fields = selectedReport?.filterSchema.fields.filter((field) =>
      field.type === 'config-multi-select' || field.type === 'dictionary-multi-select',
    ) ?? [];
    let cancelled = false;

    async function loadFilterOptions() {
      if (!isDraftDrawerOpen) {
        return;
      }

      if (fields.length === 0) {
        setFilterOptionsPanel({
          data: {},
          loading: false,
          error: null,
        });
        return;
      }

      setFilterOptionsPanel((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      try {
        const entries = await Promise.all(fields.map(async (field) => {
          const response = field.type === 'config-multi-select'
            ? await listReportConfigFilterOptions(request, field.source, talentId)
            : await listReportDictionaryFilterOptions(request, field.source);

          return [field.id, response.options] as const;
        }));

        if (!cancelled) {
          setFilterOptionsPanel({
            data: Object.fromEntries(entries),
            loading: false,
            error: null,
          });
        }
      } catch (reason) {
        if (!cancelled) {
          setFilterOptionsPanel((current) => ({
            ...current,
            loading: false,
            error: getErrorMessage(reason, copy.state.loadCatalogError),
          }));
        }
      }
    }

    void loadFilterOptions();

    return () => {
      cancelled = true;
    };
  }, [catalogPanel.data, copy.state.loadCatalogError, isDraftDrawerOpen, request, selectedReportId, talentId]);

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
    setOptionPicker(null);
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
    setOptionPicker(null);

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

  async function openJobDetail(job: ReportJobListItem) {
    if (detailPanel.loading) {
      return;
    }

    setDetailJobId(job.id);
    setDetailPanel({
      data: null,
      loading: true,
      error: null,
    });

    try {
      const detail = await readMfrJob(request, talentId, job.id);
      setDetailPanel({
        data: detail,
        loading: false,
        error: null,
      });
    } catch (reason) {
      setDetailPanel({
        data: null,
        loading: false,
        error: getErrorMessage(reason, copy.state.loadJobDetailError),
      });
    }
  }

  function retryFromDetail() {
    if (!detailPanel.data) {
      return;
    }

    setDraft(buildDraftFromFilters(
      detailPanel.data.parameterSnapshot.filters,
      detailPanel.data.parameterSnapshot.format,
    ));
    setPreviewPanel({
      data: null,
      loading: false,
      error: null,
    });
    setDetailJobId(null);
    setIsDraftDrawerOpen(true);
    applyReportsQueryState({ activeView: 'directory' });
  }

  function openDraftReport() {
    if (!selectedReportIsAvailable) {
      return;
    }

    setNotice(null);
    setPreviewPanel({
      data: null,
      loading: false,
      error: null,
    });
    setIsDraftDrawerOpen(true);
  }

  function openOptionPicker(fieldId: string) {
    if (previewPending || createPending) {
      return;
    }

    setOptionPicker({
      fieldId,
      page: 1,
      search: '',
    });
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
  const selectedReport = catalogPanel.data.find((report) => report.id === selectedReportId)
    ?? catalogPanel.data[0]
    ?? null;
  const primaryFilterFields = selectedReport?.filterSchema.fields.filter((field) => !field.advanced) ?? [];
  const advancedFilterFields = selectedReport?.filterSchema.fields.filter((field) => field.advanced) ?? [];
  const selectedReportName = selectedReport ? pickLocaleText(selectedLocale, selectedReport.name) : copy.summary.reportName;
  const selectedReportDescription = selectedReport
    ? pickLocaleText(selectedLocale, selectedReport.description)
    : copy.summary.reportDescription;
  const selectedReportIsAvailable = selectedReport?.availability.status === 'available';
  const reportDirectoryCountLabel = jobsPanel.loading ? copy.summary.jobsLoading : String(jobsPanel.total);
  const reportCatalogCount = catalogPanel.loading ? copy.summary.jobsLoading : String(catalogPanel.data.length);
  const optionPickerField = optionPicker
    ? [...primaryFilterFields, ...advancedFilterFields].find((field) => field.id === optionPicker.fieldId)
    : null;
  const optionPickerFieldLabel = optionPickerField ? pickLocaleText(selectedLocale, optionPickerField.label) : '';
  const optionPickerFieldDescription = optionPickerField?.description
    ? pickLocaleText(selectedLocale, optionPickerField.description)
    : null;
  const optionPickerOptions =
    optionPickerField?.type === 'config-multi-select' || optionPickerField?.type === 'dictionary-multi-select'
      ? filterOptionsPanel.data[optionPickerField.id] ?? []
      : [];
  const optionPickerTargetField =
    optionPickerField?.type === 'config-multi-select' || optionPickerField?.type === 'dictionary-multi-select'
      ? optionPickerField.targetField
      : null;
  const optionPickerSelectedCodes = optionPickerTargetField
    ? readSelectedCodes(getFilterFieldValue(draft, optionPickerTargetField))
    : [];
  const optionPickerFilteredOptions = optionPicker
    ? filterOptionsBySearch(optionPickerOptions, optionPicker.search)
    : optionPickerOptions;
  const optionPickerPagination = buildPaginationMeta(
    optionPickerFilteredOptions.length,
    optionPicker?.page ?? 1,
    OPTION_PICKER_PAGE_SIZE,
  );
  const optionPickerVisibleOptions = optionPickerFilteredOptions.slice(
    (optionPickerPagination.page - 1) * optionPickerPagination.pageSize,
    optionPickerPagination.page * optionPickerPagination.pageSize,
  );
  const optionPickerRange = getPaginationRange(optionPickerPagination, optionPickerVisibleOptions.length);
  const optionPickerSource = optionPickerField ? describeFilterFieldSource(optionPickerField) : null;
  const optionPickerPageLabel = pickLocaleText(selectedLocale, {
    en: `Page ${optionPickerPagination.page} of ${optionPickerPagination.totalPages}`,
    zh_HANS: `第 ${optionPickerPagination.page} / ${optionPickerPagination.totalPages} 页`,
    zh_HANT: `第 ${optionPickerPagination.page} / ${optionPickerPagination.totalPages} 頁`,
    ja: `${optionPickerPagination.totalPages} ページ中 ${optionPickerPagination.page} ページ`,
    ko: `${optionPickerPagination.totalPages}페이지 중 ${optionPickerPagination.page}페이지`,
    fr: `Page ${optionPickerPagination.page} sur ${optionPickerPagination.totalPages}`,
  });
  const optionPickerRangeLabel =
    optionPickerPagination.totalCount === 0
      ? pickLocaleText(selectedLocale, {
          en: 'No options match this picker.',
          zh_HANS: '没有匹配的选项。',
          zh_HANT: '沒有符合的選項。',
          ja: '一致する選択肢はありません。',
          ko: '일치하는 옵션이 없습니다.',
          fr: 'Aucune option ne correspond.',
        })
      : pickLocaleText(selectedLocale, {
          en: `Showing ${optionPickerRange.start}-${optionPickerRange.end} of ${optionPickerPagination.totalCount}`,
          zh_HANS: `显示第 ${optionPickerRange.start}-${optionPickerRange.end} 项，共 ${optionPickerPagination.totalCount} 项`,
          zh_HANT: `顯示第 ${optionPickerRange.start}-${optionPickerRange.end} 項，共 ${optionPickerPagination.totalCount} 項`,
          ja: `${optionPickerPagination.totalCount} 件中 ${optionPickerRange.start}-${optionPickerRange.end} 件を表示`,
          ko: `${optionPickerPagination.totalCount}개 중 ${optionPickerRange.start}-${optionPickerRange.end}개 표시`,
          fr: `Affichage de ${optionPickerRange.start} à ${optionPickerRange.end} sur ${optionPickerPagination.totalCount}`,
        });
  const optionPickerRowsPerPageLabel = pickLocaleText(selectedLocale, {
    en: 'Rows per page',
    zh_HANS: '每页显示',
    zh_HANT: '每頁顯示',
    ja: '1ページあたり',
    ko: '페이지당 행 수',
    fr: 'Lignes par page',
  });
  const optionPickerSelectedCountLabel = pickLocaleText(selectedLocale, {
    en: `${optionPickerSelectedCodes.length} selected`,
    zh_HANS: `已选择 ${optionPickerSelectedCodes.length} 项`,
    zh_HANT: `已選擇 ${optionPickerSelectedCodes.length} 項`,
    ja: `${optionPickerSelectedCodes.length} 件選択済み`,
    ko: `${optionPickerSelectedCodes.length}개 선택됨`,
    fr: `${optionPickerSelectedCodes.length} sélectionné(s)`,
  });

  return (
    <div className="space-y-6">
      <GlassSurface className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
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
              onClick={openDraftReport}
              disabled={!selectedReportIsAvailable}
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

          <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricChip
              label={copy.summary.tenantLabel}
              value={session?.tenantName || copy.summary.tenantFallback}
              hint={copy.summary.tenantHint}
            />
            <MetricChip
              label={copy.summary.catalogLabel}
              value={reportCatalogCount}
              hint={copy.summary.catalogHint}
            />
            <MetricChip
              label={copy.summary.jobsLabel}
              value={jobsPanel.loading ? copy.summary.jobsLoading : String(jobsPanel.total)}
              hint={copy.summary.jobsHint}
            />
            <MetricChip
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
        <GlassSurface className="p-6">
          <FormSection title={reportsViewCopy.directoryTitle} description={reportsViewCopy.directoryDescription}>
            <div className="space-y-5">
              {catalogPanel.error ? (
                <StateView status="error" title={copy.drawer.unavailableReport} description={catalogPanel.error} />
              ) : null}

              {catalogPanel.loading && catalogPanel.data.length === 0 ? (
                <StateView
                  status="empty"
                  title={copy.summary.catalogLabel}
                  description={copy.summary.catalogHint}
                />
              ) : selectedReport ? (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-3">
                        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                          {selectedReportIsAvailable ? reportsViewCopy.cardBadge : copy.drawer.unavailableReport}
                        </p>
                        <div className="space-y-2">
                          <h2 className="text-xl font-semibold text-slate-950">{selectedReportName}</h2>
                          <p className="max-w-2xl text-sm leading-6 text-slate-600">{selectedReportDescription}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={openDraftReport}
                          disabled={!selectedReportIsAvailable}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                          {selectedReportIsAvailable ? reportsViewCopy.cardAction : copy.drawer.unavailableReport}
                        </button>
                        <SecondaryButton
                          onClick={() => applyReportsQueryState({ activeView: 'history' })}
                          ariaLabel={reportsViewCopy.cardHistory}
                        >
                          <RefreshCcw className="h-3.5 w-3.5" />
                          {reportsViewCopy.cardHistory}
                        </SecondaryButton>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <MetricChip
                        label={copy.summary.reportLabel}
                        value={selectedReportName}
                        hint={selectedReport.id.toUpperCase()}
                      />
                      <MetricChip
                        label={copy.summary.jobsLabel}
                        value={reportDirectoryCountLabel}
                        hint={copy.summary.jobsHint}
                      />
                      <MetricChip
                        label={copy.summary.activeDownloadableLabel}
                        value={`${activeJobs} / ${downloadableJobs}`}
                        hint={copy.summary.activeDownloadableHint}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white/75 p-4">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-950">{copy.notes.title}</p>
                        <p className="text-xs leading-5 text-slate-500">{copy.notes.description}</p>
                      </div>
                      <MetricChip
                        label={copy.notes.sensitiveDeliveryLabel}
                        value={copy.notes.sensitiveDeliveryValue}
                        hint={copy.notes.sensitiveDeliveryHint}
                      />
                      <MetricChip
                        label={copy.notes.workflowLabel}
                        value={copy.notes.workflowValue}
                        hint={copy.notes.workflowHint}
                      />
                      <p className="text-sm leading-6 text-slate-500">{reportsViewCopy.cardEmpty}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <StateView
                  status="empty"
                  title={copy.summary.reportName}
                  description={copy.summary.reportDescription}
                />
              )}
            </div>
          </FormSection>
        </GlassSurface>
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
                              onClick={() => void openJobDetail(job)}
                              disabled={detailPanel.loading}
                              ariaLabel={copy.ledger.detailsAriaLabel(job.fileName || job.id)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {copy.ledger.details}
                            </SecondaryButton>
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

      <ActionDrawer
        open={detailJobId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !detailPanel.loading) {
            setDetailJobId(null);
            setDetailPanel({
              data: null,
              loading: false,
              error: null,
            });
          }
        }}
        title={copy.detail.title}
        description={copy.detail.description}
        size="xl"
        closeButtonAriaLabel={copy.detail.closeLabel}
        footer={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                if (!detailPanel.loading) {
                  setDetailJobId(null);
                  setDetailPanel({
                    data: null,
                    loading: false,
                    error: null,
                  });
                }
              }}
              disabled={detailPanel.loading}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {copy.drawer.cancel}
            </button>
            <AsyncSubmitButton
              isPending={detailPanel.loading}
              pendingText={copy.detail.loading}
              disabled={!detailPanel.data}
              onClick={() => retryFromDetail()}
            >
              {copy.detail.retryFromFilters}
            </AsyncSubmitButton>
          </div>
        }
      >
        {detailPanel.loading ? (
          <StateView status="empty" title={copy.detail.loading} />
        ) : detailPanel.error ? (
          <StateView status="error" title={copy.detail.unavailableTitle} description={detailPanel.error} />
        ) : detailPanel.data ? (
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label={copy.detail.requestedAt}
                value={formatReportsDateTime(selectedLocale, detailPanel.data.parameterSnapshot.requestedAt, copy.common.never)}
                hint={copy.detail.format}
              />
              <SummaryCard
                label={copy.detail.format}
                value={detailPanel.data.parameterSnapshot.format}
                hint={selectedReportName}
              />
              <SummaryCard
                label={copy.detail.failureTitle}
                value={detailPanel.data.failureReason || copy.detail.noFailureReason}
                hint={getReportsJobStatusLabel(selectedLocale, detailPanel.data.status)}
              />
              <SummaryCard
                label={copy.detail.downloadState}
                value={copy.detail.downloadStates[detailPanel.data.artifacts[0]?.downloadState ?? 'unavailable']}
                hint={detailPanel.data.artifacts[0]?.fileName || copy.ledger.pendingFileAssignment}
              />
            </div>

            <GlassSurface className="p-4">
              <FormSection title={copy.detail.snapshotTitle} description={copy.detail.description}>
                <div className="space-y-3 text-sm text-slate-700">
                  <p><span className="font-semibold">{copy.detail.requestedAt}:</span> {formatReportsDateTime(selectedLocale, detailPanel.data.parameterSnapshot.requestedAt, copy.common.never)}</p>
                  <p><span className="font-semibold">{copy.detail.format}:</span> {detailPanel.data.parameterSnapshot.format}</p>
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-900">{copy.detail.filters}</p>
                    {Object.keys(detailPanel.data.parameterSnapshot.filters).length > 0 ? (
                      <pre className="overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
                        {JSON.stringify(detailPanel.data.parameterSnapshot.filters, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-slate-500">{copy.detail.noFilters}</p>
                    )}
                  </div>
                </div>
              </FormSection>
            </GlassSurface>

            <GlassSurface className="p-4">
              <FormSection title={copy.detail.timelineTitle} description={copy.detail.description}>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {detailPanel.data.timeline.map((step) => (
                    <SummaryCard
                      key={step.phase}
                      label={copy.detail.timelinePhases[step.phase]}
                      value={formatReportsDateTime(selectedLocale, step.at, copy.common.never)}
                      hint={step.phase}
                    />
                  ))}
                </div>
              </FormSection>
            </GlassSurface>

            <GlassSurface className="p-4">
              <FormSection title={copy.detail.artifactsTitle} description={copy.detail.description}>
                {detailPanel.data.artifacts.length > 0 ? (
                  <div className="space-y-3">
                    {detailPanel.data.artifacts.map((artifact) => (
                      <div key={`${artifact.kind}-${artifact.fileName || 'artifact'}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-900">{artifact.fileName || copy.ledger.pendingFileAssignment}</p>
                            <p>{copy.detail.downloadState}: {copy.detail.downloadStates[artifact.downloadState]}</p>
                            <p>{copy.detail.fileSize}: {formatReportsNumber(selectedLocale, artifact.fileSizeBytes, copy.ledger.pendingRows)}</p>
                          </div>
                          <div className="space-y-1 text-right">
                            <p>{copy.detail.expiresAt}: {formatReportsDateTime(selectedLocale, artifact.expiresAt, copy.common.never)}</p>
                            <p>{copy.detail.downloadedAt}: {formatReportsDateTime(selectedLocale, artifact.downloadedAt, copy.common.never)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <StateView status="empty" title={copy.detail.artifactsTitle} description={copy.detail.noArtifacts} />
                )}
              </FormSection>
            </GlassSurface>

            <GlassSurface className="p-4">
              <FormSection title={copy.detail.failureTitle} description={copy.detail.description}>
                <p className="text-sm leading-6 text-slate-700">
                  {detailPanel.data.failureReason || copy.detail.noFailureReason}
                </p>
              </FormSection>
            </GlassSurface>
          </div>
        ) : (
          <StateView status="empty" title={copy.detail.unavailableTitle} description={copy.detail.noArtifacts} />
        )}
      </ActionDrawer>

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
            setOptionPicker(null);
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
        <div className="space-y-5">
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-950">
            <p className="font-semibold">{copy.drawer.draftGuideTitle}</p>
            <p className="mt-1 leading-6 text-indigo-900">{copy.drawer.draftGuideDescription}</p>
          </div>

          <DrawerStep number="1" title={selectedReportName} description={selectedReportDescription}>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricChip
                label={copy.summary.reportLabel}
                value={selectedReportName}
                hint={selectedReport?.id.toUpperCase() ?? copy.summary.reportDescription}
              />
              <MetricChip
                label={copy.notes.workflowLabel}
                value={copy.notes.workflowValue}
                hint={copy.notes.workflowHint}
              />
            </div>
          </DrawerStep>

          <fieldset disabled={previewPending || createPending} className="space-y-5 disabled:opacity-70">
            <DrawerStep number="2" title={copy.drawer.codeFiltersTitle} description={copy.drawer.codeFiltersDescription}>
              <div className="grid gap-4 xl:grid-cols-2">
                {primaryFilterFields.length > 0 ? (
                  primaryFilterFields.map((field) => (
                    <SchemaFilterField
                      key={field.id}
                      field={field}
                      draft={draft}
                      locale={selectedLocale}
                      options={filterOptionsPanel.data[field.id]}
                      optionsLoading={filterOptionsPanel.loading}
                      optionsError={filterOptionsPanel.error}
                      disabled={previewPending || createPending}
                      onOpenPicker={openOptionPicker}
                      onChange={(key, value) => {
                        setDraft((current) => updateDraftField(current, key, value));
                      }}
                    />
                  ))
                ) : (
                  <StateView status="unavailable" title={copy.drawer.unavailableReport} description={copy.drawer.codeFiltersDescription} />
                )}
              </div>
            </DrawerStep>

            <DrawerStep number="3" title={copy.drawer.outputTitle} description={copy.drawer.outputDescription}>
              <div className="space-y-5">
                <SelectField
                  label={copy.drawer.fields.downloadFormat}
                  value={draft.format}
                  options={reportFormatOptions}
                  onChange={(value) => setDraft((current) => ({ ...current, format: value as ReportFormat }))}
                />

                {advancedFilterFields.length > 0 ? (
                  <div className="space-y-4 border-t border-slate-200 pt-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{copy.drawer.advancedTitle}</p>
                      <p className="text-xs leading-5 text-slate-500">{copy.drawer.advancedDescription}</p>
                    </div>
                    <div className="grid gap-4 xl:grid-cols-2">
                      {advancedFilterFields.map((field) => (
                        <SchemaFilterField
                          key={field.id}
                          field={field}
                          draft={draft}
                          locale={selectedLocale}
                          options={filterOptionsPanel.data[field.id]}
                          optionsLoading={filterOptionsPanel.loading}
                          optionsError={filterOptionsPanel.error}
                          advanced
                          disabled={previewPending || createPending}
                          onOpenPicker={openOptionPicker}
                          onChange={(key, value) => {
                            setDraft((current) => updateDraftField(current, key, value));
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </DrawerStep>
          </fieldset>

          <DrawerStep number="4" title={copy.preview.title} description={copy.preview.description}>
            {previewPanel.loading ? (
              <StateView status="empty" title={copy.drawer.previewRows} description={copy.preview.description} />
            ) : previewPanel.error ? (
              <StateView status="error" title={copy.preview.unavailableTitle} description={previewPanel.error} />
            ) : previewPanel.data ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricChip
                    label={copy.preview.matchedRowsLabel}
                    value={formatReportsNumber(selectedLocale, previewPanel.data.totalCount, copy.ledger.pendingRows)}
                    hint={copy.preview.matchedRowsHint}
                  />
                  <MetricChip
                    label={copy.preview.platformsLabel}
                    value={
                      previewPanel.data.filterSummary.platforms.length > 0
                        ? previewPanel.data.filterSummary.platforms.join(', ')
                        : copy.preview.allPlatforms
                    }
                    hint={copy.preview.platformsHint}
                  />
                  <MetricChip
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
                  isEmpty={previewPanel.data.preview.length === 0}
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
          </DrawerStep>
        </div>
      </ActionDrawer>

      <ActionDrawer
        open={optionPicker !== null && isDraftDrawerOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setOptionPicker(null);
          }
        }}
        title={pickLocaleText(selectedLocale, {
          en: optionPickerFieldLabel ? `Select ${optionPickerFieldLabel}` : 'Select options',
          zh_HANS: optionPickerFieldLabel ? `选择${optionPickerFieldLabel}` : '选择选项',
          zh_HANT: optionPickerFieldLabel ? `選擇${optionPickerFieldLabel}` : '選擇選項',
          ja: optionPickerFieldLabel ? `${optionPickerFieldLabel}を選択` : '選択肢を選ぶ',
          ko: optionPickerFieldLabel ? `${optionPickerFieldLabel} 선택` : '옵션 선택',
          fr: optionPickerFieldLabel ? `Sélectionner ${optionPickerFieldLabel}` : 'Sélectionner des options',
        })}
        description={pickLocaleText(selectedLocale, {
          en: 'Search and page through catalog options without expanding the report drawer.',
          zh_HANS: '在不展开报表抽屉的情况下搜索并分页选择目录选项。',
          zh_HANT: '在不展開報表抽屜的情況下搜尋並分頁選擇目錄選項。',
          ja: 'レポートドロワーを広げずに、カタログ選択肢を検索してページ単位で選択します。',
          ko: '보고서 드로어를 확장하지 않고 카탈로그 옵션을 검색하고 페이지 단위로 선택합니다.',
          fr: 'Recherchez et parcourez les options du catalogue sans étendre le tiroir du rapport.',
        })}
        size="lg"
        closeButtonAriaLabel={pickLocaleText(selectedLocale, {
          en: 'Close report option picker',
          zh_HANS: '关闭报表选项选择器',
          zh_HANT: '關閉報表選項選擇器',
          ja: 'レポート選択肢ピッカーを閉じる',
          ko: '보고서 옵션 선택기 닫기',
          fr: 'Fermer le sélecteur d’options du rapport',
        })}
        footer={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                if (optionPickerTargetField) {
                  setDraft((current) => updateDraftField(current, optionPickerTargetField, ''));
                }
              }}
              disabled={!optionPickerTargetField || optionPickerSelectedCodes.length === 0 || previewPending || createPending}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pickLocaleText(selectedLocale, {
                en: 'Clear selected',
                zh_HANS: '清空已选',
                zh_HANT: '清空已選',
                ja: '選択を解除',
                ko: '선택 지우기',
                fr: 'Effacer la sélection',
              })}
            </button>
            <button
              type="button"
              onClick={() => setOptionPicker(null)}
              className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              {pickLocaleText(selectedLocale, {
                en: 'Done',
                zh_HANS: '完成',
                zh_HANT: '完成',
                ja: '完了',
                ko: '완료',
                fr: 'Terminé',
              })}
            </button>
          </div>
        }
      >
        {optionPickerField && optionPickerTargetField ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-slate-200 bg-white/80 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-950">{optionPickerSelectedCountLabel}</p>
                  {optionPickerFieldDescription || optionPickerSource ? (
                    <p className="text-xs leading-5 text-slate-500">
                      {[optionPickerFieldDescription, optionPickerSource].filter(Boolean).join(' ')}
                    </p>
                  ) : null}
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                  {optionPickerFilteredOptions.length}
                </span>
              </div>
            </div>

            <label className="relative block">
              <span className="sr-only">
                {pickLocaleText(selectedLocale, {
                  en: `Search ${optionPickerFieldLabel}`,
                  zh_HANS: `搜索${optionPickerFieldLabel}`,
                  zh_HANT: `搜尋${optionPickerFieldLabel}`,
                  ja: `${optionPickerFieldLabel}を検索`,
                  ko: `${optionPickerFieldLabel} 검색`,
                  fr: `Rechercher ${optionPickerFieldLabel}`,
                })}
              </span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={optionPicker?.search ?? ''}
                onChange={(event) =>
                  setOptionPicker((current) => current
                    ? { ...current, page: 1, search: event.target.value }
                    : current)
                }
                placeholder={pickLocaleText(selectedLocale, {
                  en: 'Search label or code',
                  zh_HANS: '搜索标签或代码',
                  zh_HANT: '搜尋標籤或代碼',
                  ja: 'ラベルまたはコードを検索',
                  ko: '라벨 또는 코드 검색',
                  fr: 'Rechercher libellé ou code',
                })}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </label>

            {filterOptionsPanel.error ? (
              <StateView status="error" title={copy.preview.unavailableTitle} description={filterOptionsPanel.error} />
            ) : filterOptionsPanel.loading && optionPickerOptions.length === 0 ? (
              <StateView status="empty" title={copy.drawer.previewRows} description={copy.drawer.codeFiltersDescription} />
            ) : optionPickerVisibleOptions.length > 0 ? (
              <div className="space-y-2" role="group" aria-label={optionPickerFieldLabel}>
                {optionPickerVisibleOptions.map((option) => {
                  const checked = optionPickerSelectedCodes.includes(option.value);

                  return (
                    <label
                      key={option.value}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={previewPending || createPending}
                        onChange={() => {
                          setDraft((current) =>
                            updateDraftField(
                              current,
                              optionPickerTargetField,
                              checked
                                ? removeSelectedCode(getFilterFieldValue(current, optionPickerTargetField), option.value)
                                : toggleSelectedCode(getFilterFieldValue(current, optionPickerTargetField), option.value),
                            ),
                          );
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block break-words font-medium text-slate-900">{option.label}</span>
                        <span className="block break-all text-xs text-slate-500">{option.value}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <StateView
                status="empty"
                title={pickLocaleText(selectedLocale, {
                  en: 'No options found',
                  zh_HANS: '未找到选项',
                  zh_HANT: '未找到選項',
                  ja: '選択肢が見つかりません',
                  ko: '옵션을 찾을 수 없습니다',
                  fr: 'Aucune option trouvée',
                })}
                description={pickLocaleText(selectedLocale, {
                  en: 'Adjust the search or check the underlying catalog configuration.',
                  zh_HANS: '调整搜索条件，或检查底层目录配置。',
                  zh_HANT: '調整搜尋條件，或檢查底層目錄設定。',
                  ja: '検索条件を変更するか、基盤のカタログ設定を確認してください。',
                  ko: '검색 조건을 조정하거나 기본 카탈로그 구성을 확인하세요.',
                  fr: 'Ajustez la recherche ou vérifiez la configuration du catalogue source.',
                })}
              />
            )}

            <PaginationFooter
              pagination={optionPickerPagination}
              itemCount={optionPickerVisibleOptions.length}
              labels={{
                pageLabel: optionPickerPageLabel,
                rangeLabel: optionPickerRangeLabel,
                rowsPerPageLabel: optionPickerRowsPerPageLabel,
                previousLabel: previousPageLabel,
                nextLabel: nextPageLabel,
              }}
              onPageChange={(nextPage) =>
                setOptionPicker((current) => current ? { ...current, page: nextPage } : current)
              }
              isLoading={filterOptionsPanel.loading}
              className="rounded-2xl"
            />
          </div>
        ) : (
          <StateView
            status="empty"
            title={pickLocaleText(selectedLocale, {
              en: 'No option field selected',
              zh_HANS: '未选择选项字段',
              zh_HANT: '未選擇選項欄位',
              ja: '選択肢フィールドが選ばれていません',
              ko: '선택된 옵션 필드가 없습니다',
              fr: 'Aucun champ d’options sélectionné',
            })}
          />
        )}
      </ActionDrawer>
    </div>
  );
}
