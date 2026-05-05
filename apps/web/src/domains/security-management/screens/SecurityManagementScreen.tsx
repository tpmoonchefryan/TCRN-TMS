'use client';

import type { SupportedUiLocale } from '@tcrn/shared';
import { Activity, Fingerprint, Languages, ShieldCheck, ShieldEllipsis, Trash2 } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  type OrganizationNode,
  type OrganizationTalent,
  readOrganizationTree,
} from '@/domains/organization-access/api/organization.api';
import {
  batchToggleExternalBlocklistEntries,
  type BlocklistAction,
  type BlocklistEntryRecord,
  type BlocklistPatternType,
  type BlocklistSeverity,
  checkIpAccess,
  createBlocklistEntry,
  createExternalBlocklistEntry,
  createIpAccessRule,
  deleteBlocklistEntry,
  deleteExternalBlocklistEntry,
  deleteIpAccessRule,
  disableInheritedBlocklistEntry,
  disableInheritedExternalBlocklistEntry,
  enableInheritedBlocklistEntry,
  enableInheritedExternalBlocklistEntry,
  type ExternalBlocklistRecord,
  type ExternalPatternType,
  type FingerprintResponse,
  getBlocklistEntry,
  getExternalBlocklistEntry,
  getFingerprint,
  getRateLimitStats,
  type IpAccessRuleRecord,
  type IpRuleScope,
  type IpRuleType,
  listBlocklistEntries,
  listExternalBlocklistEntries,
  listIpAccessRules,
  listProfileStoreSummaries,
  type ProfileStoreSummaryRecord,
  type RateLimitStatsResponse,
  type SecurityScopeType,
  type SecurityTab,
  testBlocklistEntry,
  updateBlocklistEntry,
  updateExternalBlocklistEntry,
} from '@/domains/security-management/api/security-management.api';
import {
  formatSecurityBlocklistSaveSuccess,
  formatSecurityBlocklistTestResult,
  formatSecurityDateTime,
  formatSecurityDeleteSuccess,
  formatSecurityDisableSuccess,
  formatSecurityExternalSaveSuccess,
  formatSecurityHeaderDescription,
  formatSecurityIpCheckResult,
  formatSecurityIpRuleCreateSuccess,
  formatSecurityIpRuleDeleteSuccess,
  formatSecurityReEnableSuccess,
  formatSecurityResetIn,
  formatSecurityRuleHits,
  getSecurityBlocklistSaveError,
  getSecurityBlocklistTestError,
  getSecurityExternalSaveError,
  getSecurityIpCheckError,
  getSecurityIpRuleCreateError,
  getSecurityIpRuleScopeLabel,
  getSecurityIpRuleTypeLabel,
  getSecurityMutationError,
  getSecuritySeverityLabel,
  pickSecurityLocalizedName,
  useSecurityManagementCopy,
} from '@/domains/security-management/screens/security-management.copy';
import { type ApiPaginationMeta, ApiRequestError } from '@/platform/http/api';
import type { RuntimeLocale } from '@/platform/runtime/locale/locale-provider';
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
  buildManagedTranslations,
  extractManagedTranslations,
  extractSingleFieldTranslationPayload,
  loadTranslationLanguageOptions,
  pickLegacyLocaleValue,
  type TranslationLanguageOption,
} from '@/platform/runtime/translations/managed-translations';
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
  TranslationDrawer,
} from '@/platform/ui';

type EntryMode = 'create' | 'edit';

interface ListPanelState<T> {
  data: T[];
  pagination: ApiPaginationMeta;
  loading: boolean;
  error: string | null;
}

interface ValuePanelState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface NoticeState {
  tone: 'success' | 'error';
  message: string;
}

interface DialogState {
  intent: 'danger' | 'primary';
  title: string;
  description: string;
  confirmText: string;
  pendingText: string;
  onConfirm: () => Promise<void>;
}

interface DirtyGuardState {
  onDiscard: () => void;
}

interface TranslationOptionsState {
  data: TranslationLanguageOption[];
  error: string | null;
  loading: boolean;
}

interface BlocklistDraft {
  ownerType: SecurityScopeType;
  ownerId: string;
  pattern: string;
  patternType: BlocklistPatternType;
  nameEn: string;
  nameTranslations: Record<string, string>;
  nameZh: string;
  nameJa: string;
  description: string;
  category: string;
  severity: BlocklistSeverity;
  action: BlocklistAction;
  replacement: string;
  scopeCsv: string;
  inherit: boolean;
  isForceUse: boolean;
  sortOrder: string;
}

interface ExternalBlocklistDraft {
  ownerType: SecurityScopeType;
  ownerId: string;
  pattern: string;
  patternType: ExternalPatternType;
  nameEn: string;
  nameTranslations: Record<string, string>;
  nameZh: string;
  nameJa: string;
  description: string;
  category: string;
  severity: BlocklistSeverity;
  action: BlocklistAction;
  replacement: string;
  inherit: boolean;
  isForceUse: boolean;
  sortOrder: string;
}

interface IpRuleDraft {
  ruleType: IpRuleType;
  ipPattern: string;
  scope: IpRuleScope;
  reason: string;
  expiresAt: string;
}

type ScopedSecurityScopeType = Exclude<SecurityScopeType, 'tenant'>;

interface OrganizationScopeOption {
  id: string;
  type: ScopedSecurityScopeType;
  label: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiRequestError ? error.message : fallback;
}

function getInitialTab(tab: string | null): SecurityTab {
  if (
    tab === 'blocklist' ||
    tab === 'external-blocklist' ||
    tab === 'ip-access' ||
    tab === 'runtime-signals'
  ) {
    return tab;
  }

  return 'blocklist';
}

function getInitialScopeType(value: string | null): SecurityScopeType {
  if (value === 'subsidiary' || value === 'talent') {
    return value;
  }

  return 'tenant';
}

function isScopedSecurityScopeType(value: SecurityScopeType): value is ScopedSecurityScopeType {
  return value === 'subsidiary' || value === 'talent';
}

const SECURITY_QUERY_KEYS = new Set([
  'tab',
  'scopeType',
  'scopeId',
  'blocklistPage',
  'blocklistPageSize',
  'externalPage',
  'externalPageSize',
  'ipRulesPage',
  'ipRulesPageSize',
]);

function buildSecurityQueryState(
  searchParams: { toString(): string },
  {
    blocklistPage,
    blocklistPageSize,
    externalPage,
    externalPageSize,
    ipRulesPage,
    ipRulesPageSize,
    scopeId,
    scopeType,
    tab,
  }: {
    blocklistPage: number;
    blocklistPageSize: PageSizeOption;
    externalPage: number;
    externalPageSize: PageSizeOption;
    ipRulesPage: number;
    ipRulesPageSize: PageSizeOption;
    scopeId: string;
    scopeType: SecurityScopeType;
    tab: SecurityTab;
  },
) {
  const params = new URLSearchParams();
  params.set('tab', tab);
  params.set('scopeType', scopeType);

  if (scopeType !== 'tenant' && scopeId.trim()) {
    params.set('scopeId', scopeId.trim());
  }

  if (blocklistPage > 1) {
    params.set('blocklistPage', String(blocklistPage));
  }

  if (blocklistPageSize !== PAGE_SIZE_OPTIONS[0]) {
    params.set('blocklistPageSize', String(blocklistPageSize));
  }

  if (externalPage > 1) {
    params.set('externalPage', String(externalPage));
  }

  if (externalPageSize !== PAGE_SIZE_OPTIONS[0]) {
    params.set('externalPageSize', String(externalPageSize));
  }

  if (ipRulesPage > 1) {
    params.set('ipRulesPage', String(ipRulesPage));
  }

  if (ipRulesPageSize !== PAGE_SIZE_OPTIONS[0]) {
    params.set('ipRulesPageSize', String(ipRulesPageSize));
  }

  new URLSearchParams(searchParams.toString()).forEach((value, key) => {
    if (!SECURITY_QUERY_KEYS.has(key)) {
      params.append(key, value);
    }
  });

  return params.toString();
}

function emptyListPanel<T>(): ListPanelState<T> {
  return {
    data: [],
    pagination: buildPaginationMeta(0, 1, PAGE_SIZE_OPTIONS[0]),
    loading: true,
    error: null,
  };
}

function emptyValuePanel<T>(): ValuePanelState<T> {
  return {
    data: null,
    loading: true,
    error: null,
  };
}

function collectOrganizationScopeOptions(
  nodes: OrganizationNode[],
  labelBuilder: (type: ScopedSecurityScopeType, name: string) => string,
): OrganizationScopeOption[] {
  return nodes.flatMap((node) => [
    {
      id: node.id,
      type: 'subsidiary' as const,
      label: labelBuilder('subsidiary', node.displayName),
    },
    ...node.talents.map((talent) => ({
      id: talent.id,
      type: 'talent' as const,
      label: labelBuilder('talent', talent.displayName),
    })),
    ...collectOrganizationScopeOptions(node.children, labelBuilder),
  ]);
}

function createEmptyBlocklistDraft(scopeType: SecurityScopeType, scopeId: string): BlocklistDraft {
  return {
    ownerType: scopeType,
    ownerId: scopeType === 'tenant' ? '' : scopeId,
    pattern: '',
    patternType: 'keyword',
    nameEn: '',
    nameTranslations: {},
    nameZh: '',
    nameJa: '',
    description: '',
    category: '',
    severity: 'medium',
    action: 'reject',
    replacement: '***',
    scopeCsv: 'marshmallow',
    inherit: true,
    isForceUse: false,
    sortOrder: '0',
  };
}

function createEmptyExternalDraft(scopeType: SecurityScopeType, scopeId: string): ExternalBlocklistDraft {
  return {
    ownerType: scopeType,
    ownerId: scopeType === 'tenant' ? '' : scopeId,
    pattern: '',
    patternType: 'url_regex',
    nameEn: '',
    nameTranslations: {},
    nameZh: '',
    nameJa: '',
    description: '',
    category: '',
    severity: 'medium',
    action: 'reject',
    replacement: '[filtered]',
    inherit: true,
    isForceUse: false,
    sortOrder: '0',
  };
}

function createEmptyIpRuleDraft(): IpRuleDraft {
  return {
    ruleType: 'blacklist',
    ipPattern: '',
    scope: 'admin',
    reason: '',
    expiresAt: '',
  };
}

function hasDraftChanges<Draft>(draft: Draft, baseline: Draft) {
  return JSON.stringify(draft) !== JSON.stringify(baseline);
}

function mapBlocklistToDraft(entry: BlocklistEntryRecord): BlocklistDraft {
  return {
    ownerType: entry.ownerType,
    ownerId: entry.ownerId || '',
    pattern: entry.pattern,
    patternType: entry.patternType,
    nameEn: entry.nameEn,
    nameTranslations: extractManagedTranslations(entry.nameEn, entry.translations, {
      zh_HANS: entry.nameZh,
      ja: entry.nameJa,
    }),
    nameZh: entry.nameZh || '',
    nameJa: entry.nameJa || '',
    description: entry.description || '',
    category: entry.category || '',
    severity: entry.severity,
    action: entry.action,
    replacement: entry.replacement,
    scopeCsv: entry.scope.join(', '),
    inherit: entry.inherit,
    isForceUse: entry.isForceUse,
    sortOrder: String(entry.sortOrder),
  };
}

function mapExternalToDraft(entry: ExternalBlocklistRecord): ExternalBlocklistDraft {
  return {
    ownerType: entry.ownerType,
    ownerId: entry.ownerId || '',
    pattern: entry.pattern,
    patternType: entry.patternType,
    nameEn: entry.nameEn,
    nameTranslations: extractManagedTranslations(entry.nameEn, entry.translations, {
      zh_HANS: entry.nameZh,
      ja: entry.nameJa,
    }),
    nameZh: entry.nameZh || '',
    nameJa: entry.nameJa || '',
    description: entry.description || '',
    category: entry.category || '',
    severity: entry.severity,
    action: entry.action,
    replacement: entry.replacement || '[filtered]',
    inherit: entry.inherit,
    isForceUse: entry.isForceUse ?? false,
    sortOrder: String(entry.sortOrder),
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
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>
    </div>
  );
}

function ToneBadge({
  tone,
  label,
}: Readonly<{
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  label: string;
}>) {
  const toneClasses =
    tone === 'success'
      ? 'bg-emerald-100 text-emerald-800'
      : tone === 'warning'
        ? 'bg-amber-100 text-amber-800'
        : tone === 'danger'
          ? 'bg-rose-100 text-rose-800'
          : tone === 'info'
            ? 'bg-indigo-100 text-indigo-800'
            : 'bg-slate-100 text-slate-700';

  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${toneClasses}`}>{label}</span>;
}

function InlineActionButton({
  children,
  tone = 'neutral',
  disabled = false,
  onClick,
}: Readonly<{
  children: React.ReactNode;
  tone?: 'neutral' | 'danger' | 'primary';
  disabled?: boolean;
  onClick?: () => void;
}>) {
  const toneClasses =
    tone === 'danger'
      ? 'border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50'
      : tone === 'primary'
        ? 'border-indigo-200 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50'
        : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex flex-nowrap items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition ${toneClasses} disabled:cursor-not-allowed disabled:opacity-50`}
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

  return <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${toneClasses}`}>{message}</div>;
}

function Field({
  label,
  hint,
  children,
}: Readonly<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}>) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      {children}
      {hint ? <span className="block text-xs leading-5 text-slate-500">{hint}</span> : null}
    </label>
  );
}

function getSecurityPaginationLabels(
  locale: SupportedUiLocale | RuntimeLocale,
  pagination: ApiPaginationMeta,
  itemCount: number,
) {
  const pageRange = getPaginationRange(pagination, itemCount);
  const pageSizeLabel = pickLocaleText(locale, {
    en: 'Rows per page',
    zh: '每页条数',
    ja: '1 ページの件数',
  });
  const paginationLabel = pickLocaleText(locale, {
    en: `Page ${pagination.page} of ${pagination.totalPages}`,
    zh: `第 ${pagination.page} / ${pagination.totalPages} 页`,
    ja: `${pagination.totalPages} ページ中 ${pagination.page} ページ`,
  });
  const paginationRangeLabel =
    pagination.totalCount === 0
      ? pickLocaleText(locale, {
          en: 'No records are currently visible.',
          zh: '当前没有可显示的记录。',
          ja: '現在表示できるレコードはありません。',
        })
      : pickLocaleText(locale, {
          en: `Showing ${pageRange.start}-${pageRange.end} of ${pagination.totalCount}`,
          zh: `显示第 ${pageRange.start}-${pageRange.end} 条，共 ${pagination.totalCount} 条`,
          ja: `${pagination.totalCount} 件中 ${pageRange.start}-${pageRange.end} 件を表示`,
        });

  return {
    pageLabel: paginationLabel,
    rangeLabel: paginationRangeLabel,
    rowsPerPageLabel: pageSizeLabel,
    pageSizeAriaLabel: pageSizeLabel,
    previousLabel: pickLocaleText(locale, { en: 'Previous', zh: '上一页', ja: '前へ' }),
    nextLabel: pickLocaleText(locale, { en: 'Next', zh: '下一页', ja: '次へ' }),
  };
}

const inputClassName =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40';

export function SecurityManagementScreen({
  tenantId: _tenantId,
}: Readonly<{
  tenantId: string;
}>) {
  const { request, requestEnvelope, session } = useSession();
  const { selectedLocale, copy } = useSecurityManagementCopy();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentTab = getInitialTab(searchParams.get('tab'));
  const currentScopeType = getInitialScopeType(searchParams.get('scopeType'));
  const currentScopeId = searchParams.get('scopeId') || '';
  const urlBlocklistPage = parsePageParam(searchParams.get('blocklistPage'));
  const urlBlocklistPageSize = parsePageSizeParam(searchParams.get('blocklistPageSize'));
  const urlExternalPage = parsePageParam(searchParams.get('externalPage'));
  const urlExternalPageSize = parsePageSizeParam(searchParams.get('externalPageSize'));
  const urlIpRulesPage = parsePageParam(searchParams.get('ipRulesPage'));
  const urlIpRulesPageSize = parsePageSizeParam(searchParams.get('ipRulesPageSize'));

  const [activeTab, setActiveTab] = useState<SecurityTab>(currentTab);
  const {
    displayedValue: displayedTab,
    transitionClassName: tabTransitionClassName,
  } = useFadeSwapState(activeTab);
  const [scopeType, setScopeType] = useState<SecurityScopeType>(currentScopeType);
  const [scopeId, setScopeId] = useState(currentScopeId);
  const lastPaginationScopeKeyRef = useRef(`${currentScopeType}:${currentScopeId}`);
  const [organizationScopesPanel, setOrganizationScopesPanel] =
    useState<ValuePanelState<OrganizationScopeOption[]>>(emptyValuePanel);

  const [blocklistPanel, setBlocklistPanel] = useState<ListPanelState<BlocklistEntryRecord>>(emptyListPanel);
  const [externalPanel, setExternalPanel] = useState<ListPanelState<ExternalBlocklistRecord>>(emptyListPanel);
  const [ipRulesPanel, setIpRulesPanel] = useState<ListPanelState<IpAccessRuleRecord>>(emptyListPanel);
  const [blocklistPage, setBlocklistPage] = useState(urlBlocklistPage);
  const [blocklistPageSize, setBlocklistPageSize] = useState<PageSizeOption>(urlBlocklistPageSize);
  const [externalPage, setExternalPage] = useState(urlExternalPage);
  const [externalPageSize, setExternalPageSize] = useState<PageSizeOption>(urlExternalPageSize);
  const [ipRulesPage, setIpRulesPage] = useState(urlIpRulesPage);
  const [ipRulesPageSize, setIpRulesPageSize] = useState<PageSizeOption>(urlIpRulesPageSize);
  const [fingerprintPanel, setFingerprintPanel] = useState<ValuePanelState<FingerprintResponse>>(emptyValuePanel);
  const [rateLimitPanel, setRateLimitPanel] = useState<ValuePanelState<RateLimitStatsResponse>>(emptyValuePanel);
  const [profileStorePanel, setProfileStorePanel] = useState<ValuePanelState<ProfileStoreSummaryRecord[]>>(emptyValuePanel);

  const [blocklistMode, setBlocklistMode] = useState<EntryMode>('create');
  const [selectedBlocklistId, setSelectedBlocklistId] = useState<string | null>(null);
  const [blocklistDrawerOpen, setBlocklistDrawerOpen] = useState(false);
  const [blocklistDetailLoading, setBlocklistDetailLoading] = useState(false);
  const [blocklistTranslationDrawerOpen, setBlocklistTranslationDrawerOpen] = useState(false);
  const [blocklistAdvancedOpen, setBlocklistAdvancedOpen] = useState(false);
  const [blocklistDraft, setBlocklistDraft] = useState<BlocklistDraft>(() =>
    createEmptyBlocklistDraft(currentScopeType, currentScopeId),
  );
  const [blocklistDraftBaseline, setBlocklistDraftBaseline] = useState<BlocklistDraft>(() =>
    createEmptyBlocklistDraft(currentScopeType, currentScopeId),
  );
  const [blocklistSavePending, setBlocklistSavePending] = useState(false);
  const [blocklistTestText, setBlocklistTestText] = useState('');
  const [blocklistTestPending, setBlocklistTestPending] = useState(false);
  const [blocklistTestResult, setBlocklistTestResult] = useState<string | null>(null);
  const [blocklistTestError, setBlocklistTestError] = useState<string | null>(null);

  const [externalMode, setExternalMode] = useState<EntryMode>('create');
  const [selectedExternalId, setSelectedExternalId] = useState<string | null>(null);
  const [externalDrawerOpen, setExternalDrawerOpen] = useState(false);
  const [externalDetailLoading, setExternalDetailLoading] = useState(false);
  const [externalTranslationDrawerOpen, setExternalTranslationDrawerOpen] = useState(false);
  const [externalDraft, setExternalDraft] = useState<ExternalBlocklistDraft>(() =>
    createEmptyExternalDraft(currentScopeType, currentScopeId),
  );
  const [externalDraftBaseline, setExternalDraftBaseline] = useState<ExternalBlocklistDraft>(() =>
    createEmptyExternalDraft(currentScopeType, currentScopeId),
  );
  const [externalSavePending, setExternalSavePending] = useState(false);
  const [translationOptionsState, setTranslationOptionsState] = useState<TranslationOptionsState>({
    data: [],
    error: null,
    loading: false,
  });

  const [ipRuleDraft, setIpRuleDraft] = useState<IpRuleDraft>(createEmptyIpRuleDraft);
  const [ipRuleDraftBaseline, setIpRuleDraftBaseline] = useState<IpRuleDraft>(createEmptyIpRuleDraft);
  const [ipRuleDrawerOpen, setIpRuleDrawerOpen] = useState(false);
  const [ipRuleSavePending, setIpRuleSavePending] = useState(false);
  const [ipCheckIp, setIpCheckIp] = useState('');
  const [ipCheckScope, setIpCheckScope] = useState<IpRuleScope>('admin');
  const [ipCheckPending, setIpCheckPending] = useState(false);
  const [ipCheckResult, setIpCheckResult] = useState<string | null>(null);
  const [ipCheckError, setIpCheckError] = useState<string | null>(null);

  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [dirtyGuardState, setDirtyGuardState] = useState<DirtyGuardState | null>(null);
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const [dialogPending, setDialogPending] = useState(false);

  useEffect(() => {
    if (!blocklistTranslationDrawerOpen && !externalTranslationDrawerOpen) {
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
        selectedLocale,
        externalTranslationDrawerOpen
          ? copy.sections.externalEditor.translationManagement.languageLoadError
          : copy.sections.blocklistEditor.translationManagement.languageLoadError,
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
    blocklistTranslationDrawerOpen,
    copy.sections.blocklistEditor.translationManagement.languageLoadError,
    copy.sections.externalEditor.translationManagement.languageLoadError,
    externalTranslationDrawerOpen,
    request,
    requestEnvelope,
    selectedLocale,
  ]);

  useEffect(() => {
    setActiveTab(currentTab);
    setScopeType(currentScopeType);
    setScopeId(currentScopeId);
    setBlocklistPage((current) => (current === urlBlocklistPage ? current : urlBlocklistPage));
    setBlocklistPageSize((current) => (current === urlBlocklistPageSize ? current : urlBlocklistPageSize));
    setExternalPage((current) => (current === urlExternalPage ? current : urlExternalPage));
    setExternalPageSize((current) => (current === urlExternalPageSize ? current : urlExternalPageSize));
    setIpRulesPage((current) => (current === urlIpRulesPage ? current : urlIpRulesPage));
    setIpRulesPageSize((current) => (current === urlIpRulesPageSize ? current : urlIpRulesPageSize));
  }, [
    currentScopeId,
    currentScopeType,
    currentTab,
    urlBlocklistPage,
    urlBlocklistPageSize,
    urlExternalPage,
    urlExternalPageSize,
    urlIpRulesPage,
    urlIpRulesPageSize,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadOrganizationScopes() {
      setOrganizationScopesPanel(emptyValuePanel);

      try {
        const response = await readOrganizationTree(request, {
          includeInactive: true,
        });
        const buildLabel = (type: ScopedSecurityScopeType, name: string) =>
          `${copy.options.scopeType[type]} · ${name}`;
        const options = [
          ...response.directTalents.map((talent: OrganizationTalent) => ({
            id: talent.id,
            type: 'talent' as const,
            label: buildLabel('talent', talent.displayName),
          })),
          ...collectOrganizationScopeOptions(response.subsidiaries, buildLabel),
        ];

        if (!cancelled) {
          setOrganizationScopesPanel({
            data: options,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setOrganizationScopesPanel({
            data: [],
            loading: false,
            error: getErrorMessage(error, copy.scopeLens.emptyOptions),
          });
        }
      }
    }

    void loadOrganizationScopes();

    return () => {
      cancelled = true;
    };
  }, [copy.options.scopeType, copy.scopeLens.emptyOptions, request]);

  useEffect(() => {
    const nextQueryString = buildSecurityQueryState(searchParams, {
      blocklistPage,
      blocklistPageSize,
      externalPage,
      externalPageSize,
      ipRulesPage,
      ipRulesPageSize,
      scopeId,
      scopeType,
      tab: activeTab,
    });
    const currentQueryString = buildSecurityQueryState(searchParams, {
      blocklistPage: urlBlocklistPage,
      blocklistPageSize: urlBlocklistPageSize,
      externalPage: urlExternalPage,
      externalPageSize: urlExternalPageSize,
      ipRulesPage: urlIpRulesPage,
      ipRulesPageSize: urlIpRulesPageSize,
      scopeId: currentScopeId,
      scopeType: currentScopeType,
      tab: currentTab,
    });

    if (nextQueryString === currentQueryString) {
      return;
    }

    const nextHref = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
    router.replace(nextHref);
  }, [
    activeTab,
    blocklistPage,
    blocklistPageSize,
    currentScopeId,
    currentScopeType,
    currentTab,
    externalPage,
    externalPageSize,
    ipRulesPage,
    ipRulesPageSize,
    pathname,
    router,
    scopeId,
    scopeType,
    searchParams,
    urlBlocklistPage,
    urlBlocklistPageSize,
    urlExternalPage,
    urlExternalPageSize,
    urlIpRulesPage,
    urlIpRulesPageSize,
  ]);

  const organizationScopeOptions = useMemo(() => {
    const options = organizationScopesPanel.data ?? [];

    return {
      subsidiary: options.filter((option) => option.type === 'subsidiary'),
      talent: options.filter((option) => option.type === 'talent'),
    };
  }, [organizationScopesPanel.data]);

  const workspaceName = session?.tenantName || copy.options.scopeType.tenant;

  function getScopeOptions(type: ScopedSecurityScopeType, currentId = '') {
    const options = organizationScopeOptions[type];

    if (currentId && !options.some((option) => option.id === currentId)) {
      return [
        {
          id: currentId,
          type,
          label: `${copy.options.scopeType[type]} · ${copy.scopeLens.unresolvedSelection}`,
        },
        ...options,
      ];
    }

    return options;
  }

  useEffect(() => {
    if (!isScopedSecurityScopeType(scopeType) || scopeId) {
      return;
    }

    const nextScopeId = organizationScopeOptions[scopeType][0]?.id;
    if (nextScopeId) {
      setScopeId(nextScopeId);
    }
  }, [organizationScopeOptions, scopeId, scopeType]);
  const activeScopeOptions = isScopedSecurityScopeType(scopeType)
    ? getScopeOptions(scopeType, scopeId)
    : [];
  const activeScopeLabel = !isScopedSecurityScopeType(scopeType)
    ? workspaceName
    : activeScopeOptions.find((option) => option.id === scopeId)?.label
      || `${copy.options.scopeType[scopeType]} · ${copy.scopeLens.unresolvedSelection}`;
  const scopeLockTitle = pickLocaleText(selectedLocale, {
    en: 'Scope lock',
    zh_HANS: '范围锁定',
    zh_HANT: '範圍鎖定',
    ja: 'スコープロック',
    ko: '범위 잠금',
    fr: 'Verrou de périmètre',
  });
  const scopeLockDescription = pickLocaleText(selectedLocale, {
    en: `Policy edits below are locked to ${activeScopeLabel}. Change the level before opening or creating rules.`,
    zh_HANS: `下方策略编辑已锁定到 ${activeScopeLabel}。请先切换层级，再打开或创建规则。`,
    zh_HANT: `下方策略編輯已鎖定到 ${activeScopeLabel}。請先切換層級，再開啟或建立規則。`,
    ja: `以下のポリシー編集は ${activeScopeLabel} にロックされています。ルールを開く・作成する前に階層を切り替えてください。`,
    ko: `아래 정책 편집은 ${activeScopeLabel} 범위에 고정됩니다. 규칙을 열거나 만들기 전에 레벨을 변경하세요.`,
    fr: `Les modifications de règles ci-dessous sont verrouillées sur ${activeScopeLabel}. Changez de niveau avant d’ouvrir ou de créer des règles.`,
  });
  const advancedScopeTitle = pickLocaleText(selectedLocale, {
    en: 'Advanced usage scopes',
    zh_HANS: '高级使用范围',
    zh_HANT: '進階使用範圍',
    ja: '高度な利用スコープ',
    ko: '고급 사용 범위',
    fr: 'Périmètres d’usage avancés',
  });
  const advancedScopeToggle = blocklistAdvancedOpen
    ? pickLocaleText(selectedLocale, {
        en: 'Hide advanced scopes',
        zh_HANS: '收起高级范围',
        zh_HANT: '收合進階範圍',
        ja: '高度なスコープを隠す',
        ko: '고급 범위 숨기기',
        fr: 'Masquer les périmètres avancés',
      })
    : pickLocaleText(selectedLocale, {
        en: 'Edit advanced scopes',
        zh_HANS: '编辑高级范围',
        zh_HANT: '編輯進階範圍',
        ja: '高度なスコープを編集',
        ko: '고급 범위 편집',
        fr: 'Modifier les périmètres avancés',
      });
  const blocklistDraftDirty = blocklistDrawerOpen
    && !blocklistDetailLoading
    && hasDraftChanges(blocklistDraft, blocklistDraftBaseline);
  const externalDraftDirty = externalDrawerOpen
    && !externalDetailLoading
    && hasDraftChanges(externalDraft, externalDraftBaseline);
  const ipRuleDraftDirty = ipRuleDrawerOpen
    && hasDraftChanges(ipRuleDraft, ipRuleDraftBaseline);
  const hasDirtyEditor = blocklistDraftDirty || externalDraftDirty || ipRuleDraftDirty;

  useEffect(() => {
    if (!hasDirtyEditor) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasDirtyEditor]);

  const scopeLabelMap = useMemo(() => {
    const map = new Map<string, string>();

    for (const type of ['subsidiary', 'talent'] as const) {
      for (const option of organizationScopeOptions[type]) {
        map.set(`${type}:${option.id}`, option.label);
      }
    }

    return map;
  }, [organizationScopeOptions]);

  function resolveScopeLabel(ownerType: SecurityScopeType, ownerId?: string | null) {
    if (ownerType === 'tenant') {
      return workspaceName;
    }

    if (!ownerId) {
      return copy.options.scopeType[ownerType];
    }

    return (
      scopeLabelMap.get(`${ownerType}:${ownerId}`)
      || `${copy.options.scopeType[ownerType]} · ${copy.scopeLens.unresolvedSelection}`
    );
  }

  async function refreshBlocklist() {
    if (scopeType !== 'tenant' && !scopeId) {
      setBlocklistPanel({
        data: [],
        pagination: buildPaginationMeta(0, blocklistPage, blocklistPageSize),
        loading: false,
        error: null,
      });
      return;
    }

    setBlocklistPanel((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const response = await listBlocklistEntries(request, {
        scopeType,
        scopeId: scopeType === 'tenant' ? undefined : scopeId || undefined,
        page: blocklistPage,
        pageSize: blocklistPageSize,
      });

      setBlocklistPanel({
        data: response.items,
        pagination: buildPaginationMeta(response.meta.total, blocklistPage, blocklistPageSize),
        loading: false,
        error: null,
      });
    } catch (error) {
      setBlocklistPanel({
        data: [],
        pagination: buildPaginationMeta(0, blocklistPage, blocklistPageSize),
        loading: false,
        error: getErrorMessage(error, copy.sections.blocklistList.unavailable),
      });
    }
  }

  async function refreshExternalBlocklist() {
    if (scopeType !== 'tenant' && !scopeId) {
      setExternalPanel({
        data: [],
        pagination: buildPaginationMeta(0, externalPage, externalPageSize),
        loading: false,
        error: null,
      });
      return;
    }

    setExternalPanel((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const response = await listExternalBlocklistEntries(requestEnvelope, {
        scopeType,
        scopeId: scopeType === 'tenant' ? undefined : scopeId || undefined,
        page: externalPage,
        pageSize: externalPageSize,
      });

      setExternalPanel({
        data: response.items,
        pagination:
          response.pagination
          ?? buildPaginationMeta(response.items.length, externalPage, externalPageSize),
        loading: false,
        error: null,
      });
    } catch (error) {
      setExternalPanel({
        data: [],
        pagination: buildPaginationMeta(0, externalPage, externalPageSize),
        loading: false,
        error: getErrorMessage(error, copy.sections.externalList.unavailable),
      });
    }
  }

  async function refreshIpRules() {
    setIpRulesPanel((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const response = await listIpAccessRules(request, {
        page: ipRulesPage,
        pageSize: ipRulesPageSize,
      });
      setIpRulesPanel({
        data: response.items,
        pagination: buildPaginationMeta(response.meta.total, ipRulesPage, ipRulesPageSize),
        loading: false,
        error: null,
      });
    } catch (error) {
      setIpRulesPanel({
        data: [],
        pagination: buildPaginationMeta(0, ipRulesPage, ipRulesPageSize),
        loading: false,
        error: getErrorMessage(error, copy.sections.ipRules.unavailable),
      });
    }
  }

  async function refreshRuntimeSignals() {
    setFingerprintPanel(emptyValuePanel);
    setRateLimitPanel(emptyValuePanel);
    setProfileStorePanel(emptyValuePanel);

    const [fingerprintResult, rateLimitResult, profileStoreResult] = await Promise.allSettled([
      getFingerprint(request),
      getRateLimitStats(request),
      listProfileStoreSummaries(request),
    ]);

    setFingerprintPanel({
      data: fingerprintResult.status === 'fulfilled' ? fingerprintResult.value : null,
      loading: false,
      error:
        fingerprintResult.status === 'rejected'
          ? getErrorMessage(fingerprintResult.reason, copy.sections.runtimeSignals.fingerprintTitle)
          : null,
    });

    setRateLimitPanel({
      data: rateLimitResult.status === 'fulfilled' ? rateLimitResult.value : null,
      loading: false,
      error:
        rateLimitResult.status === 'rejected'
          ? getErrorMessage(rateLimitResult.reason, copy.sections.runtimeSignals.endpointsUnavailable)
          : null,
    });

    setProfileStorePanel({
      data: profileStoreResult.status === 'fulfilled' ? profileStoreResult.value.items : null,
      loading: false,
      error:
        profileStoreResult.status === 'rejected'
          ? getErrorMessage(profileStoreResult.reason, copy.sections.runtimeSignals.profileStoresUnavailable)
          : null,
    });
  }

  useEffect(() => {
    void refreshBlocklist();
    void refreshExternalBlocklist();
  }, [
    blocklistPage,
    blocklistPageSize,
    externalPage,
    externalPageSize,
    request,
    requestEnvelope,
    scopeId,
    scopeType,
  ]);

  useEffect(() => {
    void refreshIpRules();
    void refreshRuntimeSignals();
  }, [ipRulesPage, ipRulesPageSize, request]);

  useEffect(() => {
    const nextScopeKey = `${scopeType}:${scopeId}`;

    if (lastPaginationScopeKeyRef.current === nextScopeKey) {
      return;
    }

    lastPaginationScopeKeyRef.current = nextScopeKey;
    setBlocklistPage(1);
    setExternalPage(1);
  }, [scopeId, scopeType]);

  function resetBlocklistEditor() {
    const nextDraft = createEmptyBlocklistDraft(scopeType, scopeId);
    setBlocklistMode('create');
    setSelectedBlocklistId(null);
    setBlocklistAdvancedOpen(false);
    setBlocklistDetailLoading(false);
    setBlocklistTranslationDrawerOpen(false);
    setBlocklistDrawerOpen(false);
    setBlocklistDraft(nextDraft);
    setBlocklistDraftBaseline(nextDraft);
  }

  function openBlocklistCreateDrawer() {
    resetBlocklistEditor();
    setBlocklistDrawerOpen(true);
  }

  function setBlocklistDrawerOpenSafely(open: boolean) {
    if (!open && blocklistSavePending) {
      return;
    }

    if (!open && blocklistDraftDirty) {
      requestDiscardDirtyEditor(() => {
        setBlocklistTranslationDrawerOpen(false);
        setBlocklistDrawerOpen(false);
      });
      return;
    }

    if (!open) {
      setBlocklistTranslationDrawerOpen(false);
    }

    setBlocklistDrawerOpen(open);
  }

  function resetExternalEditor() {
    const nextDraft = createEmptyExternalDraft(scopeType, scopeId);
    setExternalMode('create');
    setSelectedExternalId(null);
    setExternalDetailLoading(false);
    setExternalTranslationDrawerOpen(false);
    setExternalDrawerOpen(false);
    setExternalDraft(nextDraft);
    setExternalDraftBaseline(nextDraft);
  }

  function openExternalCreateDrawer() {
    resetExternalEditor();
    setExternalDrawerOpen(true);
  }

  function setExternalDrawerOpenSafely(open: boolean) {
    if (!open && externalSavePending) {
      return;
    }

    if (!open && externalDraftDirty) {
      requestDiscardDirtyEditor(() => {
        setExternalTranslationDrawerOpen(false);
        setExternalDrawerOpen(false);
      });
      return;
    }

    if (!open) {
      setExternalTranslationDrawerOpen(false);
    }

    setExternalDrawerOpen(open);
  }

  function openIpRuleCreateDrawer() {
    const nextDraft = createEmptyIpRuleDraft();
    setIpRuleDraft(nextDraft);
    setIpRuleDraftBaseline(nextDraft);
    setIpRuleDrawerOpen(true);
  }

  function setIpRuleDrawerOpenSafely(open: boolean) {
    if (!open && ipRuleSavePending) {
      return;
    }

    if (!open && ipRuleDraftDirty) {
      requestDiscardDirtyEditor(() => {
        setIpRuleDrawerOpen(false);
      });
      return;
    }

    setIpRuleDrawerOpen(open);
  }

  function closeSecurityEditors() {
    setBlocklistTranslationDrawerOpen(false);
    setBlocklistDrawerOpen(false);
    setExternalTranslationDrawerOpen(false);
    setExternalDrawerOpen(false);
    setIpRuleDrawerOpen(false);
  }

  function requestDiscardDirtyEditor(onDiscard: () => void) {
    if (!hasDirtyEditor) {
      onDiscard();
      return;
    }

    setDirtyGuardState({ onDiscard });
  }

  async function openBlocklistEditor(entryId: string) {
    setBlocklistDrawerOpen(true);
    setBlocklistDetailLoading(true);
    setBlocklistTestError(null);
    setBlocklistTestResult(null);

    try {
      const detail = await getBlocklistEntry(request, entryId);
      const nextDraft = mapBlocklistToDraft(detail);
      setBlocklistMode('edit');
      setSelectedBlocklistId(entryId);
      setBlocklistAdvancedOpen(false);
      setBlocklistDraft(nextDraft);
      setBlocklistDraftBaseline(nextDraft);
    } catch (error) {
      setBlocklistDrawerOpen(false);
      setNotice({
        tone: 'error',
        message: getErrorMessage(error, copy.sections.blocklistEditor.loadingTitle),
      });
    } finally {
      setBlocklistDetailLoading(false);
    }
  }

  async function openExternalEditor(entryId: string) {
    setExternalDrawerOpen(true);
    setExternalDetailLoading(true);

    try {
      const detail = await getExternalBlocklistEntry(request, entryId);
      const nextDraft = mapExternalToDraft(detail);
      setExternalMode('edit');
      setSelectedExternalId(entryId);
      setExternalDraft(nextDraft);
      setExternalDraftBaseline(nextDraft);
    } catch (error) {
      setExternalDrawerOpen(false);
      setNotice({
        tone: 'error',
        message: getErrorMessage(error, copy.sections.externalEditor.loadingTitle),
      });
    } finally {
      setExternalDetailLoading(false);
    }
  }

  async function submitBlocklist() {
    setBlocklistSavePending(true);
    setNotice(null);

    try {
      const translations = buildManagedTranslations(blocklistDraft.nameEn, blocklistDraft.nameTranslations);
      const nameZh = pickLegacyLocaleValue(translations, 'zh_HANS');
      const nameJa = pickLegacyLocaleValue(translations, 'ja');
      const payload = {
        ownerType: blocklistDraft.ownerType,
        ownerId: blocklistDraft.ownerType === 'tenant' ? undefined : blocklistDraft.ownerId || undefined,
        pattern: blocklistDraft.pattern,
        patternType: blocklistDraft.patternType,
        nameEn: blocklistDraft.nameEn,
        nameZh,
        nameJa,
        translations,
        description: blocklistDraft.description || undefined,
        category: blocklistDraft.category || undefined,
        severity: blocklistDraft.severity,
        action: blocklistDraft.action,
        replacement: blocklistDraft.replacement || undefined,
        scope: blocklistDraft.scopeCsv
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        inherit: blocklistDraft.inherit,
        sortOrder: Number(blocklistDraft.sortOrder || 0),
        isForceUse: blocklistDraft.isForceUse,
      };

      let saved: BlocklistEntryRecord;

      if (blocklistMode === 'create') {
        saved = await createBlocklistEntry(request, payload);
      } else if (selectedBlocklistId) {
        saved = await updateBlocklistEntry(request, selectedBlocklistId, {
          ...payload,
          version:
            blocklistPanel.data.find((entry) => entry.id === selectedBlocklistId)?.version || 1,
        });
      } else {
        throw new Error('Missing blocklist identifier');
      }

      await refreshBlocklist();
      setNotice({
        tone: 'success',
        message: formatSecurityBlocklistSaveSuccess(selectedLocale, blocklistMode),
      });
      const savedDraft = mapBlocklistToDraft(saved);
      setBlocklistMode('edit');
      setSelectedBlocklistId(saved.id);
      setBlocklistDraft(savedDraft);
      setBlocklistDraftBaseline(savedDraft);
      setBlocklistDrawerOpen(false);
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(error, getSecurityBlocklistSaveError(selectedLocale)),
      });
    } finally {
      setBlocklistSavePending(false);
    }
  }

  async function runBlocklistTest() {
    setBlocklistTestPending(true);
    setBlocklistTestError(null);
    setBlocklistTestResult(null);

    try {
      const result = await testBlocklistEntry(request, {
        text: blocklistTestText,
      });

      setBlocklistTestResult(formatSecurityBlocklistTestResult(selectedLocale, result));
    } catch (error) {
      setBlocklistTestError(getErrorMessage(error, getSecurityBlocklistTestError(selectedLocale)));
    } finally {
      setBlocklistTestPending(false);
    }
  }

  async function submitExternalBlocklist() {
    setExternalSavePending(true);
    setNotice(null);

    try {
      const translations = buildManagedTranslations(externalDraft.nameEn, externalDraft.nameTranslations);
      const nameZh = pickLegacyLocaleValue(translations, 'zh_HANS');
      const nameJa = pickLegacyLocaleValue(translations, 'ja');
      const payload = {
        ownerType: externalDraft.ownerType,
        ownerId: externalDraft.ownerType === 'tenant' ? undefined : externalDraft.ownerId || undefined,
        pattern: externalDraft.pattern,
        patternType: externalDraft.patternType,
        nameEn: externalDraft.nameEn,
        nameZh,
        nameJa,
        translations,
        description: externalDraft.description || undefined,
        category: externalDraft.category || undefined,
        severity: externalDraft.severity,
        action: externalDraft.action,
        replacement: externalDraft.replacement || undefined,
        inherit: externalDraft.inherit,
        sortOrder: Number(externalDraft.sortOrder || 0),
        isForceUse: externalDraft.isForceUse,
      };

      let saved: ExternalBlocklistRecord;

      if (externalMode === 'create') {
        saved = await createExternalBlocklistEntry(request, payload);
      } else if (selectedExternalId) {
        saved = await updateExternalBlocklistEntry(request, selectedExternalId, {
          ...payload,
          version:
            externalPanel.data.find((entry) => entry.id === selectedExternalId)?.version || 1,
        });
      } else {
        throw new Error('Missing external blocklist identifier');
      }

      await refreshExternalBlocklist();
      setNotice({
        tone: 'success',
        message: formatSecurityExternalSaveSuccess(selectedLocale, externalMode),
      });
      const savedDraft = mapExternalToDraft(saved);
      setExternalMode('edit');
      setSelectedExternalId(saved.id);
      setExternalDraft(savedDraft);
      setExternalDraftBaseline(savedDraft);
      setExternalDrawerOpen(false);
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(error, getSecurityExternalSaveError(selectedLocale)),
      });
    } finally {
      setExternalSavePending(false);
    }
  }

  const configuredBlocklistTranslationCount = Object.values(blocklistDraft.nameTranslations).filter(
    (value) => value.trim().length > 0,
  ).length;
  const configuredExternalTranslationCount = Object.values(externalDraft.nameTranslations).filter(
    (value) => value.trim().length > 0,
  ).length;
  const translationDrawerLabels = {
    addLanguageLabel: pickLocaleText(selectedLocale, {
      en: 'Add language',
      zh_HANS: '添加语言',
      zh_HANT: '新增語言',
      ja: '言語を追加',
      ko: '언어 추가',
      fr: 'Ajouter une langue',
    }),
    addOtherLanguageLabel: pickLocaleText(selectedLocale, {
      en: 'Add other language...',
      zh_HANS: '添加其它语言…',
      zh_HANT: '新增其它語言…',
      ja: '他の言語を追加…',
      ko: '다른 언어 추가…',
      fr: 'Ajouter une autre langue…',
    }),
    removeLanguageVisibleLabel: pickLocaleText(selectedLocale, {
      en: 'Remove',
      zh_HANS: '移除',
      zh_HANT: '移除',
      ja: '削除',
      ko: '제거',
      fr: 'Retirer',
    }),
    emptyTranslationsText: pickLocaleText(selectedLocale, {
      en: 'No translations added yet.',
      zh_HANS: '当前还没有添加翻译。',
      zh_HANT: '目前尚未新增翻譯。',
      ja: 'まだ翻訳は追加されていません。',
      ko: '아직 추가된 번역이 없습니다.',
      fr: 'Aucune traduction n’a encore été ajoutée.',
    }),
    baseValueSuffix: pickLocaleText(selectedLocale, {
      en: '(Base / English)',
      zh_HANS: '（英文主值）',
      zh_HANT: '（英文主值）',
      ja: '（英語の基準値）',
      ko: '(영문 기본값)',
      fr: '(Valeur de base / anglais)',
    }),
  };

  async function submitIpRule() {
    setIpRuleSavePending(true);
    setNotice(null);

    try {
      await createIpAccessRule(request, {
        ruleType: ipRuleDraft.ruleType,
        ipPattern: ipRuleDraft.ipPattern,
        scope: ipRuleDraft.scope,
        reason: ipRuleDraft.reason || undefined,
        expiresAt: ipRuleDraft.expiresAt || undefined,
      });
      await refreshIpRules();
      setNotice({
        tone: 'success',
        message: formatSecurityIpRuleCreateSuccess(selectedLocale),
      });
      const nextDraft = createEmptyIpRuleDraft();
      setIpRuleDraft(nextDraft);
      setIpRuleDraftBaseline(nextDraft);
      setIpRuleDrawerOpen(false);
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(error, getSecurityIpRuleCreateError(selectedLocale)),
      });
    } finally {
      setIpRuleSavePending(false);
    }
  }

  async function runIpCheck() {
    setIpCheckPending(true);
    setIpCheckError(null);
    setIpCheckResult(null);

    try {
      const result = await checkIpAccess(request, {
        ip: ipCheckIp,
        scope: ipCheckScope,
      });
      setIpCheckResult(formatSecurityIpCheckResult(selectedLocale, result));
    } catch (error) {
      setIpCheckError(getErrorMessage(error, getSecurityIpCheckError(selectedLocale)));
    } finally {
      setIpCheckPending(false);
    }
  }

  function openDialog(state: DialogState) {
    setDialogState(state);
  }

  async function confirmDialog() {
    if (!dialogState) {
      return;
    }

    setDialogPending(true);

    try {
      await dialogState.onConfirm();
      setDialogState(null);
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(error, getSecurityMutationError(selectedLocale)),
      });
    } finally {
      setDialogPending(false);
    }
  }

  const blocklistCount = blocklistPanel.pagination.totalCount;
  const externalCount = externalPanel.pagination.totalCount;
  const blockedIpCount = rateLimitPanel.data?.summary.currentlyBlocked ?? 0;

  return (
    <div className="space-y-6">
      <GlassSurface className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              {workspaceName}
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-slate-950">{copy.header.title}</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">{formatSecurityHeaderDescription(selectedLocale, workspaceName)}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label={copy.summary.scopeLensLabel} value={activeScopeLabel} hint={copy.summary.scopeLensHint} />
            <SummaryCard label={copy.summary.blocklistLabel} value={String(blocklistCount)} hint={copy.summary.blocklistHint} />
            <SummaryCard label={copy.summary.externalLabel} value={String(externalCount)} hint={copy.summary.externalHint} />
            <SummaryCard label={copy.summary.blockedIpsLabel} value={String(blockedIpCount)} hint={copy.summary.blockedIpsHint} />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-950">
          <div className="flex flex-wrap items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-none" />
            <div className="min-w-0 space-y-1">
              <p className="font-semibold">{scopeLockTitle}</p>
              <p className="leading-6">{scopeLockDescription}</p>
              <p className="text-xs text-indigo-800/80">
                {copy.options.scopeType[scopeType]} · {activeScopeLabel}
              </p>
            </div>
          </div>
        </div>
      </GlassSurface>

      <GlassSurface className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionTabs
            items={[
              { id: 'blocklist', label: copy.tabs.blocklist },
              { id: 'external-blocklist', label: copy.tabs.externalBlocklist },
              { id: 'ip-access', label: copy.tabs.ipAccess },
              { id: 'runtime-signals', label: copy.tabs.runtimeSignals },
            ]}
            activeId={activeTab}
            onChange={(nextTab) => {
              requestDiscardDirtyEditor(() => {
                closeSecurityEditors();
                setActiveTab(nextTab as SecurityTab);
              });
            }}
            ariaLabel={copy.header.title}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={copy.scopeLens.scopeType}>
              <select
                aria-label={copy.scopeLens.scopeTypeAriaLabel}
                value={scopeType}
                onChange={(event) => {
                  const nextScope = event.target.value as SecurityScopeType;
                  requestDiscardDirtyEditor(() => {
                    closeSecurityEditors();
                    setScopeType(nextScope);
                    if (nextScope === 'tenant') {
                      setScopeId('');
                    }
                    resetBlocklistEditor();
                    resetExternalEditor();
                  });
                }}
                className={inputClassName}
              >
                <option value="tenant">{copy.options.scopeType.tenant}</option>
                <option value="subsidiary">{copy.options.scopeType.subsidiary}</option>
                <option value="talent">{copy.options.scopeType.talent}</option>
              </select>
            </Field>
            <Field
              label={copy.scopeLens.scopeId}
              hint={
                scopeType === 'tenant'
                  ? copy.scopeLens.tenantHint
                  : organizationScopesPanel.error || copy.scopeLens.scopedHint
              }
            >
              {scopeType === 'tenant' ? (
                <input
                  aria-label={copy.scopeLens.scopeIdAriaLabel}
                  value={copy.scopeLens.tenantPlaceholder}
                  disabled
                  className={inputClassName}
                />
              ) : (
                <select
                  aria-label={copy.scopeLens.scopeIdAriaLabel}
                  value={scopeId}
                  onChange={(event) => {
                    const nextScopeId = event.target.value;
                    requestDiscardDirtyEditor(() => {
                      closeSecurityEditors();
                      setScopeId(nextScopeId);
                      resetBlocklistEditor();
                      resetExternalEditor();
                    });
                  }}
                  disabled={
                    organizationScopesPanel.loading
                    || getScopeOptions(scopeType, scopeId).length === 0
                  }
                  className={inputClassName}
                >
                  {!scopeId ? <option value="">{copy.scopeLens.chooseOption}</option> : null}
                  {organizationScopesPanel.loading ? (
                    <option value="" disabled>
                      {copy.scopeLens.loadingOptions}
                    </option>
                  ) : null}
                  {!organizationScopesPanel.loading && getScopeOptions(scopeType, scopeId).length === 0 ? (
                    <option value="" disabled>
                      {copy.scopeLens.emptyOptions}
                    </option>
                  ) : null}
                  {getScopeOptions(scopeType, scopeId).map((option) => (
                    <option key={`${option.type}-${option.id}`} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
        </div>
      </GlassSurface>

      {notice ? <NoticeBanner tone={notice.tone} message={notice.message} /> : null}

      <div className={tabTransitionClassName}>
      {displayedTab === 'blocklist' ? (
        <>
          <GlassSurface className="p-6">
            <FormSection
              title={copy.sections.blocklistList.title}
              description={copy.sections.blocklistList.description}
            >
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={openBlocklistCreateDrawer}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {copy.sections.blocklistEditor.newRule}
                </button>
              </div>
              {blocklistPanel.error ? (
                <StateView status="denied" title={copy.sections.blocklistList.unavailable} description={blocklistPanel.error} />
              ) : (
                <>
                  <TableShell
                    ariaLabel={copy.sections.blocklistList.title}
                    columns={[...copy.sections.blocklistList.columns]}
                    dataLength={blocklistPanel.data.length}
                    isLoading={blocklistPanel.loading}
                    isEmpty={!blocklistPanel.loading && blocklistPanel.data.length === 0}
                    emptyTitle={copy.sections.blocklistList.emptyTitle}
                    emptyDescription={copy.sections.blocklistList.emptyDescription}
                  >
                    {blocklistPanel.data.map((entry) => {
                      const entryName = pickSecurityLocalizedName(selectedLocale, entry, entry.pattern);

                      return (
                      <tr key={entry.id} className="align-top">
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-900">{entryName}</p>
                            <p className="text-xs text-slate-500">{entry.pattern}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {resolveScopeLabel(entry.ownerType, entry.ownerId)}
                        </td>
                        <td className="px-6 py-4">
                          <ToneBadge
                            tone={entry.severity === 'high' ? 'danger' : entry.severity === 'medium' ? 'warning' : 'info'}
                            label={getSecuritySeverityLabel(selectedLocale, entry.severity)}
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{entry.scope.join(', ') || copy.common.all}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-nowrap gap-2 whitespace-nowrap">
                            <ToneBadge tone={entry.isActive ? 'success' : 'neutral'} label={entry.isActive ? copy.common.active : copy.common.inactive} />
                            {entry.isInherited ? <ToneBadge tone="info" label={copy.common.inherited} /> : null}
                            {entry.isDisabledHere ? <ToneBadge tone="warning" label={copy.common.disabledHere} /> : null}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-nowrap gap-2 whitespace-nowrap">
                            <InlineActionButton onClick={() => void openBlocklistEditor(entry.id)}>{copy.actions.edit}</InlineActionButton>
                            {entry.canDisable ? (
                              <InlineActionButton
                                tone="danger"
                                onClick={() =>
                                  openDialog({
                                    intent: 'danger',
                                    title: `${copy.dialogs.disableInheritedTitlePrefix} ${entryName}?`,
                                    description: copy.dialogs.disableInheritedDescription,
                                    confirmText: copy.actions.disableHere,
                                    pendingText: copy.dialogs.disabling,
                                    onConfirm: async () => {
                                      await disableInheritedBlocklistEntry(request, entry.id, {
                                        scopeType,
                                        scopeId: scopeType === 'tenant' ? undefined : scopeId || undefined,
                                      });
                                      await refreshBlocklist();
                                      setNotice({
                                        tone: 'success',
                                        message: formatSecurityDisableSuccess(selectedLocale, entryName),
                                      });
                                    },
                                  })
                                }
                              >
                                {copy.actions.disableHere}
                              </InlineActionButton>
                            ) : null}
                            {entry.isDisabledHere ? (
                              <InlineActionButton
                                tone="primary"
                                onClick={() =>
                                  openDialog({
                                    intent: 'primary',
                                    title: `${copy.dialogs.reEnableTitlePrefix} ${entryName}?`,
                                    description: copy.dialogs.reEnableDescription,
                                    confirmText: copy.actions.reEnable,
                                    pendingText: copy.dialogs.reEnabling,
                                    onConfirm: async () => {
                                      await enableInheritedBlocklistEntry(request, entry.id, {
                                        scopeType,
                                        scopeId: scopeType === 'tenant' ? undefined : scopeId || undefined,
                                      });
                                      await refreshBlocklist();
                                      setNotice({
                                        tone: 'success',
                                        message: formatSecurityReEnableSuccess(selectedLocale, entryName),
                                      });
                                    },
                                  })
                                }
                              >
                                {copy.actions.reEnable}
                              </InlineActionButton>
                            ) : null}
                            {!entry.isInherited ? (
                              <InlineActionButton
                                tone="danger"
                                onClick={() =>
                                  openDialog({
                                    intent: 'danger',
                                    title: `${copy.dialogs.deleteTitlePrefix} ${entryName}?`,
                                    description: copy.dialogs.deleteRuleDescription,
                                    confirmText: copy.actions.deleteRule,
                                    pendingText: copy.dialogs.deleting,
                                    onConfirm: async () => {
                                      await deleteBlocklistEntry(request, entry.id);
                                      await refreshBlocklist();
                                      if (selectedBlocklistId === entry.id) {
                                        resetBlocklistEditor();
                                      }
                                      setNotice({
                                        tone: 'success',
                                        message: formatSecurityDeleteSuccess(selectedLocale, entryName),
                                      });
                                    },
                                  })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {copy.actions.delete}
                              </InlineActionButton>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )})}
                  </TableShell>
                  <PaginationFooter
                    pagination={blocklistPanel.pagination}
                    itemCount={blocklistPanel.data.length}
                    labels={getSecurityPaginationLabels(selectedLocale, blocklistPanel.pagination, blocklistPanel.data.length)}
                    onPageChange={setBlocklistPage}
                    onPageSizeChange={(nextPageSize) => {
                      setBlocklistPageSize(nextPageSize as PageSizeOption);
                      setBlocklistPage(1);
                    }}
                    isLoading={blocklistPanel.loading}
                    className="mt-4 rounded-2xl border border-slate-200"
                  />
                </>
              )}
            </FormSection>
          </GlassSurface>

          <ActionDrawer
            open={blocklistDrawerOpen}
            onOpenChange={setBlocklistDrawerOpenSafely}
            title={blocklistMode === 'create' ? copy.sections.blocklistEditor.createTitle : copy.sections.blocklistEditor.updateTitle}
            description={copy.sections.blocklistEditor.description}
            size="xl"
            closeButtonAriaLabel={copy.sections.blocklistEditor.closeButtonAriaLabel}
            closeOnBackdropClick={!blocklistSavePending}
            closeOnEscape={!blocklistSavePending}
            footer={
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBlocklistDrawerOpenSafely(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  {copy.common.cancel}
                </button>
                <AsyncSubmitButton
                  onClick={() => void submitBlocklist()}
                  isPending={blocklistSavePending}
                  pendingText={blocklistMode === 'create' ? copy.sections.blocklistEditor.creating : copy.sections.blocklistEditor.saving}
                >
                  {blocklistMode === 'create' ? copy.sections.blocklistEditor.createRule : copy.sections.blocklistEditor.saveChanges}
                </AsyncSubmitButton>
              </div>
            }
          >
            <div className="mb-5 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-950">
              <div className="flex flex-wrap items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-none" />
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold">{scopeLockTitle}</p>
                  <p className="leading-6">{scopeLockDescription}</p>
                  <p className="text-xs text-indigo-800/80">
                    {copy.options.scopeType[scopeType]} · {activeScopeLabel}
                  </p>
                </div>
              </div>
            </div>
            {blocklistDetailLoading ? (
              <StateView
                status="unavailable"
                title={copy.sections.blocklistEditor.loadingTitle}
                description={copy.sections.blocklistEditor.loadingDescription}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={copy.fields.ownerType}>
                  <select
                    aria-label={copy.fields.ownerType}
                    value={blocklistDraft.ownerType}
                    onChange={(event) =>
                      setBlocklistDraft((current) => {
                        const nextType = event.target.value as SecurityScopeType;
                        const nextOwnerId = isScopedSecurityScopeType(nextType)
                          ? getScopeOptions(nextType)[0]?.id ?? ''
                          : '';

                        return {
                          ...current,
                          ownerType: nextType,
                          ownerId: nextOwnerId,
                        };
                      })
                    }
                    className={inputClassName}
                  >
                    <option value="tenant">{copy.options.scopeType.tenant}</option>
                    <option value="subsidiary">{copy.options.scopeType.subsidiary}</option>
                    <option value="talent">{copy.options.scopeType.talent}</option>
                  </select>
                </Field>
                <Field label={copy.fields.ownerId}>
                  {blocklistDraft.ownerType === 'tenant' ? (
                    <input
                      aria-label={copy.fields.ownerId}
                      value={copy.scopeLens.tenantPlaceholder}
                      disabled
                      className={inputClassName}
                    />
                  ) : (
                    <select
                      aria-label={copy.fields.ownerId}
                      value={blocklistDraft.ownerId}
                      onChange={(event) =>
                        setBlocklistDraft((current) => ({
                          ...current,
                          ownerId: event.target.value,
                        }))
                      }
                      disabled={
                        organizationScopesPanel.loading
                        || getScopeOptions(blocklistDraft.ownerType, blocklistDraft.ownerId).length === 0
                      }
                      className={inputClassName}
                    >
                      {getScopeOptions(blocklistDraft.ownerType, blocklistDraft.ownerId).length === 0 ? (
                        <option value="">{copy.scopeLens.emptyOptions}</option>
                      ) : null}
                      {getScopeOptions(blocklistDraft.ownerType, blocklistDraft.ownerId).map((option) => (
                        <option key={`${option.type}-${option.id}`} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <div className="space-y-3 md:col-span-2">
                  <div className="flex flex-wrap items-end gap-3">
                    <Field label={copy.fields.ruleName}>
                      <input
                        aria-label={copy.fields.ruleName}
                        value={blocklistDraft.nameEn}
                        onChange={(event) =>
                          setBlocklistDraft((current) => ({
                            ...current,
                            nameEn: event.target.value,
                          }))
                        }
                        placeholder={copy.placeholders.ruleName}
                        className={inputClassName}
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={() => setBlocklistTranslationDrawerOpen(true)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      aria-label={copy.sections.blocklistEditor.translationManagement.trigger}
                    >
                      <Languages className="h-4 w-4" />
                      <span>{copy.sections.blocklistEditor.translationManagement.trigger}</span>
                      {configuredBlocklistTranslationCount > 0 ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {configuredBlocklistTranslationCount}
                        </span>
                      ) : null}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    {configuredBlocklistTranslationCount > 0
                      ? copy.sections.blocklistEditor.translationManagement.summary(configuredBlocklistTranslationCount)
                      : copy.sections.blocklistEditor.translationManagement.empty}
                  </p>
                  {translationOptionsState.error ? (
                    <p className="text-xs text-amber-700">{translationOptionsState.error}</p>
                  ) : null}
                </div>
                <Field label={copy.fields.category}>
                  <input
                    aria-label={copy.fields.category}
                    value={blocklistDraft.category}
                    onChange={(event) =>
                      setBlocklistDraft((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    placeholder={copy.placeholders.category}
                    className={inputClassName}
                  />
                </Field>
                <Field label={copy.fields.pattern}>
                  <input
                    aria-label={copy.fields.pattern}
                    value={blocklistDraft.pattern}
                    onChange={(event) =>
                      setBlocklistDraft((current) => ({
                        ...current,
                        pattern: event.target.value,
                      }))
                    }
                    placeholder={copy.placeholders.pattern}
                    className={inputClassName}
                  />
                </Field>
                <Field label={copy.fields.patternType}>
                  <select
                    aria-label={copy.fields.patternType}
                    value={blocklistDraft.patternType}
                    onChange={(event) =>
                      setBlocklistDraft((current) => ({
                        ...current,
                        patternType: event.target.value as BlocklistPatternType,
                      }))
                    }
                    className={inputClassName}
                  >
                    <option value="keyword">{copy.options.blocklistPatternType.keyword}</option>
                    <option value="regex">{copy.options.blocklistPatternType.regex}</option>
                    <option value="wildcard">{copy.options.blocklistPatternType.wildcard}</option>
                  </select>
                </Field>
                <Field label={copy.fields.severity}>
                  <select
                    aria-label={copy.fields.severity}
                    value={blocklistDraft.severity}
                    onChange={(event) =>
                      setBlocklistDraft((current) => ({
                        ...current,
                        severity: event.target.value as BlocklistSeverity,
                      }))
                    }
                    className={inputClassName}
                  >
                    <option value="low">{copy.options.severity.low}</option>
                    <option value="medium">{copy.options.severity.medium}</option>
                    <option value="high">{copy.options.severity.high}</option>
                  </select>
                </Field>
                <Field label={copy.fields.action}>
                  <select
                    aria-label={copy.fields.action}
                    value={blocklistDraft.action}
                    onChange={(event) =>
                      setBlocklistDraft((current) => ({
                        ...current,
                        action: event.target.value as BlocklistAction,
                      }))
                    }
                    className={inputClassName}
                  >
                    <option value="reject">{copy.options.action.reject}</option>
                    <option value="flag">{copy.options.action.flag}</option>
                    <option value="replace">{copy.options.action.replace}</option>
                  </select>
                </Field>
                <Field label={copy.fields.replacement}>
                  <input
                    aria-label={copy.fields.replacement}
                    value={blocklistDraft.replacement}
                    onChange={(event) =>
                      setBlocklistDraft((current) => ({
                        ...current,
                        replacement: event.target.value,
                      }))
                    }
                    placeholder={copy.placeholders.replacement}
                    className={inputClassName}
                  />
                </Field>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-4 md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{advancedScopeTitle}</p>
                      <p className="text-xs leading-5 text-slate-500">{copy.fields.scopesHint}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBlocklistAdvancedOpen((current) => !current)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                    >
                      {advancedScopeToggle}
                    </button>
                  </div>
                  {blocklistAdvancedOpen ? (
                    <Field label={copy.fields.scopes} hint={copy.fields.scopesHint}>
                      <input
                        aria-label={copy.fields.scopes}
                        value={blocklistDraft.scopeCsv}
                        onChange={(event) =>
                          setBlocklistDraft((current) => ({
                            ...current,
                            scopeCsv: event.target.value,
                          }))
                        }
                        placeholder={copy.placeholders.scopes}
                        className={inputClassName}
                      />
                    </Field>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      {blocklistDraft.scopeCsv || copy.common.all}
                    </div>
                  )}
                </div>
                <Field label={copy.fields.sortOrder}>
                  <input
                    aria-label={copy.fields.sortOrder}
                    type="number"
                    value={blocklistDraft.sortOrder}
                    onChange={(event) =>
                      setBlocklistDraft((current) => ({
                        ...current,
                        sortOrder: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label={copy.fields.description}>
                  <textarea
                    aria-label={copy.fields.description}
                    value={blocklistDraft.description}
                    onChange={(event) =>
                      setBlocklistDraft((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={4}
                    className={`${inputClassName} resize-y`}
                  />
                </Field>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={blocklistDraft.inherit}
                      onChange={(event) =>
                        setBlocklistDraft((current) => ({
                          ...current,
                          inherit: event.target.checked,
                        }))
                      }
                    />
                    {copy.fields.inherit}
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={blocklistDraft.isForceUse}
                      onChange={(event) =>
                        setBlocklistDraft((current) => ({
                          ...current,
                          isForceUse: event.target.checked,
                        }))
                      }
                    />
                    {copy.fields.forceUse}
                  </label>
                </div>
              </div>
            )}
          </ActionDrawer>

          <GlassSurface className="p-6">
            <FormSection
              title={copy.sections.blocklistTest.title}
              description={copy.sections.blocklistTest.description}
              actions={
                <AsyncSubmitButton onClick={() => void runBlocklistTest()} isPending={blocklistTestPending} pendingText={copy.sections.blocklistTest.pending}>
                  {copy.sections.blocklistTest.run}
                </AsyncSubmitButton>
              }
            >
              <Field label={copy.sections.blocklistTest.sampleText}>
                <textarea
                  aria-label={copy.sections.blocklistTest.sampleText}
                  value={blocklistTestText}
                  onChange={(event) => setBlocklistTestText(event.target.value)}
                  rows={5}
                  placeholder={copy.sections.blocklistTest.placeholder}
                  className={`${inputClassName} resize-y`}
                />
              </Field>

              {blocklistTestResult ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-4 text-sm text-emerald-800">
                  {blocklistTestResult}
                </div>
              ) : null}
              {blocklistTestError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-4 text-sm text-rose-800">
                  {blocklistTestError}
                </div>
              ) : null}
            </FormSection>
          </GlassSurface>
        </>
      ) : null}

      {displayedTab === 'external-blocklist' ? (
        <>
          <GlassSurface className="p-6">
            <FormSection
              title={copy.sections.externalList.title}
              description={copy.sections.externalList.description}
              actions={
                externalPanel.data.length > 0 ? (
                  <InlineActionButton
                    tone="danger"
                    onClick={() =>
                      openDialog({
                        intent: 'danger',
                        title: copy.sections.externalList.batchDeactivateTitle,
                        description: copy.sections.externalList.batchDeactivateDescription,
                        confirmText: copy.sections.externalList.batchDeactivateConfirm,
                        pendingText: copy.sections.externalList.batchDeactivatePending,
                        onConfirm: async () => {
                          await batchToggleExternalBlocklistEntries(request, {
                            ids: externalPanel.data.map((entry) => entry.id),
                            isActive: false,
                          });
                          await refreshExternalBlocklist();
                          setNotice({
                            tone: 'success',
                            message: copy.sections.externalList.batchDeactivateSuccess,
                          });
                        },
                      })
                    }
                  >
                    {copy.sections.externalList.batchDeactivate}
                  </InlineActionButton>
                ) : null
              }
            >
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={openExternalCreateDrawer}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {copy.sections.externalEditor.newPattern}
                </button>
              </div>
              {externalPanel.error ? (
                <StateView status="denied" title={copy.sections.externalList.unavailable} description={externalPanel.error} />
              ) : (
                <>
                  <TableShell
                    ariaLabel={copy.sections.externalList.title}
                    columns={[...copy.sections.externalList.columns]}
                    dataLength={externalPanel.data.length}
                    isLoading={externalPanel.loading}
                    isEmpty={!externalPanel.loading && externalPanel.data.length === 0}
                    emptyTitle={copy.sections.externalList.emptyTitle}
                    emptyDescription={copy.sections.externalList.emptyDescription}
                  >
                    {externalPanel.data.map((entry) => {
                      const entryName = pickSecurityLocalizedName(selectedLocale, entry, entry.pattern);

                      return (
                      <tr key={entry.id} className="align-top">
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">{entryName}</p>
                          <p className="text-xs text-slate-500">{entry.pattern}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {resolveScopeLabel(entry.ownerType, entry.ownerId)}
                      </td>
                      <td className="px-6 py-4">
                        <ToneBadge
                          tone={entry.severity === 'high' ? 'danger' : entry.severity === 'medium' ? 'warning' : 'info'}
                          label={getSecuritySeverityLabel(selectedLocale, entry.severity)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-nowrap gap-2 whitespace-nowrap">
                          <ToneBadge tone={entry.isActive ? 'success' : 'neutral'} label={entry.isActive ? copy.common.active : copy.common.inactive} />
                          {entry.isInherited ? <ToneBadge tone="info" label={copy.common.inherited} /> : null}
                          {entry.isDisabledHere ? <ToneBadge tone="warning" label={copy.common.disabledHere} /> : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-nowrap gap-2 whitespace-nowrap">
                          <InlineActionButton onClick={() => void openExternalEditor(entry.id)}>{copy.actions.edit}</InlineActionButton>
                          {entry.canDisable ? (
                            <InlineActionButton
                              tone="danger"
                              onClick={() =>
                                openDialog({
                                  intent: 'danger',
                                  title: `${copy.dialogs.disableInheritedTitlePrefix} ${entryName}?`,
                                  description: copy.dialogs.disableInheritedDescription,
                                  confirmText: copy.actions.disableHere,
                                  pendingText: copy.dialogs.disabling,
                                  onConfirm: async () => {
                                    await disableInheritedExternalBlocklistEntry(request, entry.id, {
                                      scopeType,
                                      scopeId: scopeType === 'tenant' ? undefined : scopeId || undefined,
                                    });
                                    await refreshExternalBlocklist();
                                    setNotice({
                                      tone: 'success',
                                      message: formatSecurityDisableSuccess(selectedLocale, entryName),
                                    });
                                  },
                                })
                              }
                            >
                              {copy.actions.disableHere}
                            </InlineActionButton>
                          ) : null}
                          {entry.isDisabledHere ? (
                            <InlineActionButton
                              tone="primary"
                              onClick={() =>
                                openDialog({
                                  intent: 'primary',
                                  title: `${copy.dialogs.reEnableTitlePrefix} ${entryName}?`,
                                  description: copy.dialogs.reEnableDescription,
                                  confirmText: copy.actions.reEnable,
                                  pendingText: copy.dialogs.reEnabling,
                                  onConfirm: async () => {
                                    await enableInheritedExternalBlocklistEntry(request, entry.id, {
                                      scopeType,
                                      scopeId: scopeType === 'tenant' ? undefined : scopeId || undefined,
                                    });
                                    await refreshExternalBlocklist();
                                    setNotice({
                                      tone: 'success',
                                      message: formatSecurityReEnableSuccess(selectedLocale, entryName),
                                    });
                                  },
                                })
                              }
                            >
                              {copy.actions.reEnable}
                            </InlineActionButton>
                          ) : null}
                          {!entry.isInherited ? (
                            <InlineActionButton
                              tone="danger"
                              onClick={() =>
                                openDialog({
                                  intent: 'danger',
                                  title: `${copy.dialogs.deleteTitlePrefix} ${entryName}?`,
                                  description: copy.dialogs.deletePatternDescription,
                                  confirmText: copy.actions.deletePattern,
                                  pendingText: copy.dialogs.deleting,
                                  onConfirm: async () => {
                                    await deleteExternalBlocklistEntry(request, entry.id);
                                    await refreshExternalBlocklist();
                                    if (selectedExternalId === entry.id) {
                                      resetExternalEditor();
                                    }
                                    setNotice({
                                      tone: 'success',
                                      message: formatSecurityDeleteSuccess(selectedLocale, entryName),
                                    });
                                  },
                                })
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {copy.actions.delete}
                            </InlineActionButton>
                          ) : null}
                        </div>
                      </td>
                      </tr>
                    )})}
                  </TableShell>
                  <PaginationFooter
                    pagination={externalPanel.pagination}
                    itemCount={externalPanel.data.length}
                    labels={getSecurityPaginationLabels(selectedLocale, externalPanel.pagination, externalPanel.data.length)}
                    onPageChange={setExternalPage}
                    onPageSizeChange={(nextPageSize) => {
                      setExternalPageSize(nextPageSize as PageSizeOption);
                      setExternalPage(1);
                    }}
                    isLoading={externalPanel.loading}
                    className="mt-4 rounded-2xl border border-slate-200"
                  />
                </>
              )}
            </FormSection>
          </GlassSurface>

          <ActionDrawer
            open={externalDrawerOpen}
            onOpenChange={setExternalDrawerOpenSafely}
            title={externalMode === 'create' ? copy.sections.externalEditor.createTitle : copy.sections.externalEditor.updateTitle}
            description={copy.sections.externalEditor.description}
            size="xl"
            closeButtonAriaLabel={copy.sections.externalEditor.closeButtonAriaLabel}
            closeOnBackdropClick={!externalSavePending}
            closeOnEscape={!externalSavePending}
            footer={
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setExternalDrawerOpenSafely(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  {copy.common.cancel}
                </button>
                <AsyncSubmitButton
                  onClick={() => void submitExternalBlocklist()}
                  isPending={externalSavePending}
                  pendingText={externalMode === 'create' ? copy.sections.externalEditor.creating : copy.sections.externalEditor.saving}
                >
                  {externalMode === 'create' ? copy.sections.externalEditor.create : copy.sections.externalEditor.update}
                </AsyncSubmitButton>
              </div>
            }
          >
            <div className="mb-5 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-950">
              <div className="flex flex-wrap items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-none" />
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold">{scopeLockTitle}</p>
                  <p className="leading-6">{scopeLockDescription}</p>
                  <p className="text-xs text-indigo-800/80">
                    {copy.options.scopeType[scopeType]} · {activeScopeLabel}
                  </p>
                </div>
              </div>
            </div>
            {externalDetailLoading ? (
              <StateView
                status="unavailable"
                title={copy.sections.externalEditor.loadingTitle}
                description={copy.sections.externalEditor.loadingDescription}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={copy.fields.ownerType}>
                  <select
                    aria-label={copy.fields.ownerType}
                    value={externalDraft.ownerType}
                    onChange={(event) =>
                      setExternalDraft((current) => {
                        const nextType = event.target.value as SecurityScopeType;
                        const nextOwnerId = isScopedSecurityScopeType(nextType)
                          ? getScopeOptions(nextType)[0]?.id ?? ''
                          : '';

                        return {
                          ...current,
                          ownerType: nextType,
                          ownerId: nextOwnerId,
                        };
                      })
                    }
                    className={inputClassName}
                  >
                    <option value="tenant">{copy.options.scopeType.tenant}</option>
                    <option value="subsidiary">{copy.options.scopeType.subsidiary}</option>
                    <option value="talent">{copy.options.scopeType.talent}</option>
                  </select>
                </Field>
                <Field label={copy.fields.ownerId}>
                  {externalDraft.ownerType === 'tenant' ? (
                    <input
                      aria-label={copy.fields.ownerId}
                      value={copy.scopeLens.tenantPlaceholder}
                      disabled
                      className={inputClassName}
                    />
                  ) : (
                    <select
                      aria-label={copy.fields.ownerId}
                      value={externalDraft.ownerId}
                      onChange={(event) =>
                        setExternalDraft((current) => ({
                          ...current,
                          ownerId: event.target.value,
                        }))
                      }
                      disabled={
                        organizationScopesPanel.loading
                        || getScopeOptions(externalDraft.ownerType, externalDraft.ownerId).length === 0
                      }
                      className={inputClassName}
                    >
                      {getScopeOptions(externalDraft.ownerType, externalDraft.ownerId).length === 0 ? (
                        <option value="">{copy.scopeLens.emptyOptions}</option>
                      ) : null}
                      {getScopeOptions(externalDraft.ownerType, externalDraft.ownerId).map((option) => (
                        <option key={`${option.type}-${option.id}`} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <div className="space-y-3 md:col-span-2">
                  <div className="flex flex-wrap items-end gap-3">
                    <Field label={copy.fields.ruleName}>
                      <input
                        aria-label={copy.fields.ruleName}
                        value={externalDraft.nameEn}
                        onChange={(event) =>
                          setExternalDraft((current) => ({
                            ...current,
                            nameEn: event.target.value,
                          }))
                        }
                        placeholder={copy.placeholders.externalRuleName}
                        className={inputClassName}
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={() => setExternalTranslationDrawerOpen(true)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      aria-label={copy.sections.externalEditor.translationManagement.trigger}
                    >
                      <Languages className="h-4 w-4" />
                      <span>{copy.sections.externalEditor.translationManagement.trigger}</span>
                      {configuredExternalTranslationCount > 0 ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {configuredExternalTranslationCount}
                        </span>
                      ) : null}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    {configuredExternalTranslationCount > 0
                      ? copy.sections.externalEditor.translationManagement.summary(configuredExternalTranslationCount)
                      : copy.sections.externalEditor.translationManagement.empty}
                  </p>
                  {translationOptionsState.error ? (
                    <p className="text-xs text-amber-700">{translationOptionsState.error}</p>
                  ) : null}
                </div>
                <Field label={copy.fields.category}>
                  <input
                    aria-label={copy.fields.category}
                    value={externalDraft.category}
                    onChange={(event) =>
                      setExternalDraft((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    placeholder={copy.placeholders.externalCategory}
                    className={inputClassName}
                  />
                </Field>
                <Field label={copy.fields.pattern}>
                  <input
                    aria-label={copy.fields.pattern}
                    value={externalDraft.pattern}
                    onChange={(event) =>
                      setExternalDraft((current) => ({
                        ...current,
                        pattern: event.target.value,
                      }))
                    }
                    placeholder={copy.placeholders.externalPattern}
                    className={inputClassName}
                  />
                </Field>
                <Field label={copy.fields.patternType}>
                  <select
                    aria-label={copy.fields.patternType}
                    value={externalDraft.patternType}
                    onChange={(event) =>
                      setExternalDraft((current) => ({
                        ...current,
                        patternType: event.target.value as ExternalPatternType,
                      }))
                    }
                    className={inputClassName}
                  >
                    <option value="domain">{copy.options.externalPatternType.domain}</option>
                    <option value="url_regex">{copy.options.externalPatternType.url_regex}</option>
                    <option value="keyword">{copy.options.externalPatternType.keyword}</option>
                  </select>
                </Field>
                <Field label={copy.fields.severity}>
                  <select
                    aria-label={copy.fields.severity}
                    value={externalDraft.severity}
                    onChange={(event) =>
                      setExternalDraft((current) => ({
                        ...current,
                        severity: event.target.value as BlocklistSeverity,
                      }))
                    }
                    className={inputClassName}
                  >
                    <option value="low">{copy.options.severity.low}</option>
                    <option value="medium">{copy.options.severity.medium}</option>
                    <option value="high">{copy.options.severity.high}</option>
                  </select>
                </Field>
                <Field label={copy.fields.action}>
                  <select
                    aria-label={copy.fields.action}
                    value={externalDraft.action}
                    onChange={(event) =>
                      setExternalDraft((current) => ({
                        ...current,
                        action: event.target.value as BlocklistAction,
                      }))
                    }
                    className={inputClassName}
                  >
                    <option value="reject">{copy.options.action.reject}</option>
                    <option value="flag">{copy.options.action.flag}</option>
                    <option value="replace">{copy.options.action.replace}</option>
                  </select>
                </Field>
                <Field label={copy.fields.replacement}>
                  <input
                    aria-label={copy.fields.replacement}
                    value={externalDraft.replacement}
                    onChange={(event) =>
                      setExternalDraft((current) => ({
                        ...current,
                        replacement: event.target.value,
                      }))
                    }
                    placeholder={copy.placeholders.externalReplacement}
                    className={inputClassName}
                  />
                </Field>
                <Field label={copy.fields.sortOrder}>
                  <input
                    aria-label={copy.fields.sortOrder}
                    type="number"
                    value={externalDraft.sortOrder}
                    onChange={(event) =>
                      setExternalDraft((current) => ({
                        ...current,
                        sortOrder: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
                <Field label={copy.fields.description}>
                  <textarea
                    aria-label={copy.fields.description}
                    value={externalDraft.description}
                    onChange={(event) =>
                      setExternalDraft((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={4}
                    className={`${inputClassName} resize-y`}
                  />
                </Field>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={externalDraft.inherit}
                      onChange={(event) =>
                        setExternalDraft((current) => ({
                          ...current,
                          inherit: event.target.checked,
                        }))
                      }
                    />
                    {copy.fields.inherit}
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={externalDraft.isForceUse}
                      onChange={(event) =>
                        setExternalDraft((current) => ({
                          ...current,
                          isForceUse: event.target.checked,
                        }))
                      }
                    />
                    {copy.fields.forceUse}
                  </label>
                </div>
              </div>
            )}
          </ActionDrawer>
        </>
      ) : null}

      {displayedTab === 'ip-access' ? (
        <>
          <GlassSurface className="p-6">
            <FormSection
              title={copy.sections.ipRules.listTitle}
              description={copy.sections.ipRules.listDescription}
            >
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={openIpRuleCreateDrawer}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {copy.sections.ipRules.newRule}
                </button>
              </div>
              {ipRulesPanel.error ? (
                <StateView status="denied" title={copy.sections.ipRules.unavailable} description={ipRulesPanel.error} />
              ) : (
                <>
                  <TableShell
                    ariaLabel={copy.sections.ipRules.listTitle}
                    columns={[...copy.sections.ipRules.columns]}
                    dataLength={ipRulesPanel.data.length}
                    isLoading={ipRulesPanel.loading}
                    isEmpty={!ipRulesPanel.loading && ipRulesPanel.data.length === 0}
                    emptyTitle={copy.sections.ipRules.emptyTitle}
                    emptyDescription={copy.sections.ipRules.emptyDescription}
                  >
                    {ipRulesPanel.data.map((rule) => (
                      <tr key={rule.id}>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-900">{rule.ipPattern}</p>
                            <p className="text-xs text-slate-500">{rule.reason || copy.common.noReason}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <ToneBadge tone={rule.ruleType === 'blacklist' ? 'danger' : 'success'} label={getSecurityIpRuleTypeLabel(selectedLocale, rule.ruleType)} />
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{getSecurityIpRuleScopeLabel(selectedLocale, rule.scope)}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {formatSecurityRuleHits(selectedLocale, rule.hitCount, rule.lastHitAt)}
                        </td>
                        <td className="px-6 py-4">
                          <ToneBadge tone={rule.isActive ? 'success' : 'neutral'} label={rule.isActive ? copy.common.active : copy.common.inactive} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <InlineActionButton
                            tone="danger"
                            onClick={() =>
                              openDialog({
                                intent: 'danger',
                                title: pickLocaleText(selectedLocale, {
                                  en: `Delete ${rule.ipPattern}?`,
                                  zh_HANS: `删除 ${rule.ipPattern}？`,
                                  zh_HANT: `刪除 ${rule.ipPattern}？`,
                                  ja: `${rule.ipPattern} を削除しますか？`,
                                  ko: `${rule.ipPattern} 규칙을 삭제할까요?`,
                                  fr: `Supprimer ${rule.ipPattern} ?`,
                                }),
                                description: copy.dialogs.deleteIpDescription,
                                confirmText: copy.actions.deleteRule,
                                pendingText: copy.dialogs.deleting,
                                onConfirm: async () => {
                                  await deleteIpAccessRule(request, rule.id);
                                  await refreshIpRules();
                                  setNotice({
                                    tone: 'success',
                                    message: formatSecurityIpRuleDeleteSuccess(selectedLocale, rule.ipPattern),
                                  });
                                },
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {copy.actions.delete}
                          </InlineActionButton>
                        </td>
                      </tr>
                    ))}
                  </TableShell>
                  <PaginationFooter
                    pagination={ipRulesPanel.pagination}
                    itemCount={ipRulesPanel.data.length}
                    labels={getSecurityPaginationLabels(selectedLocale, ipRulesPanel.pagination, ipRulesPanel.data.length)}
                    onPageChange={setIpRulesPage}
                    onPageSizeChange={(nextPageSize) => {
                      setIpRulesPageSize(nextPageSize as PageSizeOption);
                      setIpRulesPage(1);
                    }}
                    isLoading={ipRulesPanel.loading}
                    className="mt-4 rounded-2xl border border-slate-200"
                  />
                </>
              )}
            </FormSection>
          </GlassSurface>

          <ActionDrawer
            open={ipRuleDrawerOpen}
            onOpenChange={setIpRuleDrawerOpenSafely}
            title={copy.sections.ipRules.createTitle}
            description={copy.sections.ipRules.createDescription}
            size="lg"
            closeButtonAriaLabel={copy.sections.ipRules.closeButtonAriaLabel}
            closeOnBackdropClick={!ipRuleSavePending}
            closeOnEscape={!ipRuleSavePending}
            footer={
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIpRuleDrawerOpenSafely(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  {copy.common.cancel}
                </button>
                <AsyncSubmitButton onClick={() => void submitIpRule()} isPending={ipRuleSavePending} pendingText={copy.sections.ipRules.creating}>
                  {copy.sections.ipRules.create}
                </AsyncSubmitButton>
              </div>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={copy.fields.ipRuleType}>
                <select
                  aria-label={copy.fields.ipRuleType}
                  value={ipRuleDraft.ruleType}
                  onChange={(event) =>
                    setIpRuleDraft((current) => ({
                      ...current,
                      ruleType: event.target.value as IpRuleType,
                    }))
                  }
                  className={inputClassName}
                >
                  <option value="blacklist">{copy.options.ipRuleType.blacklist}</option>
                  <option value="whitelist">{copy.options.ipRuleType.whitelist}</option>
                </select>
              </Field>
              <Field label={copy.fields.ipRuleScope}>
                <select
                  aria-label={copy.fields.ipRuleScope}
                  value={ipRuleDraft.scope}
                  onChange={(event) =>
                    setIpRuleDraft((current) => ({
                      ...current,
                      scope: event.target.value as IpRuleScope,
                    }))
                  }
                  className={inputClassName}
                >
                  <option value="admin">{copy.options.ipRuleScope.admin}</option>
                  <option value="api">{copy.options.ipRuleScope.api}</option>
                  <option value="public">{copy.options.ipRuleScope.public}</option>
                  <option value="global">{copy.options.ipRuleScope.global}</option>
                </select>
              </Field>
              <Field label={copy.fields.ipPattern}>
                <input
                  aria-label={copy.fields.ipPattern}
                  value={ipRuleDraft.ipPattern}
                  onChange={(event) =>
                    setIpRuleDraft((current) => ({
                      ...current,
                      ipPattern: event.target.value,
                    }))
                  }
                  placeholder={copy.placeholders.ipPattern}
                  className={inputClassName}
                />
              </Field>
              <Field label={copy.fields.expiresAt}>
                <input
                  aria-label={copy.fields.expiresAt}
                  type="datetime-local"
                  value={ipRuleDraft.expiresAt}
                  onChange={(event) =>
                    setIpRuleDraft((current) => ({
                      ...current,
                      expiresAt: event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </Field>
              <Field label={copy.fields.reason}>
                <textarea
                  aria-label={copy.fields.reason}
                  value={ipRuleDraft.reason}
                  onChange={(event) =>
                    setIpRuleDraft((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder={copy.placeholders.ipReason}
                  className={`${inputClassName} resize-y`}
                />
              </Field>
            </div>
          </ActionDrawer>

          <GlassSurface className="p-6">
            <FormSection
              title={copy.sections.ipRules.probeTitle}
              description={copy.sections.ipRules.probeDescription}
              actions={
                <AsyncSubmitButton onClick={() => void runIpCheck()} isPending={ipCheckPending} pendingText={copy.sections.ipRules.probing}>
                  {copy.sections.ipRules.probe}
                </AsyncSubmitButton>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={copy.fields.probeIp}>
                  <input
                    aria-label={copy.fields.probeIp}
                    value={ipCheckIp}
                    onChange={(event) => setIpCheckIp(event.target.value)}
                    placeholder={copy.placeholders.probeIp}
                    className={inputClassName}
                  />
                </Field>
                <Field label={copy.fields.probeScope}>
                  <select
                    aria-label={copy.fields.probeScope}
                    value={ipCheckScope}
                    onChange={(event) => setIpCheckScope(event.target.value as IpRuleScope)}
                    className={inputClassName}
                  >
                    <option value="admin">{copy.options.ipRuleScope.admin}</option>
                    <option value="api">{copy.options.ipRuleScope.api}</option>
                    <option value="public">{copy.options.ipRuleScope.public}</option>
                    <option value="global">{copy.options.ipRuleScope.global}</option>
                  </select>
                </Field>
              </div>
              {ipCheckResult ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-4 text-sm text-emerald-800">
                  {ipCheckResult}
                </div>
              ) : null}
              {ipCheckError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-4 text-sm text-rose-800">
                  {ipCheckError}
                </div>
              ) : null}
            </FormSection>
          </GlassSurface>
        </>
      ) : null}

      {displayedTab === 'runtime-signals' ? (
        <>
          <GlassSurface className="p-6">
            <FormSection
              title={copy.sections.runtimeSignals.title}
              description={copy.sections.runtimeSignals.description}
            >
              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-700">
                      <Fingerprint className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{copy.sections.runtimeSignals.fingerprintTitle}</p>
                      <p className="text-xs text-slate-500">{copy.sections.runtimeSignals.fingerprintHint}</p>
                    </div>
                  </div>
                  {fingerprintPanel.loading ? (
                    <p className="mt-4 text-sm text-slate-500">{copy.sections.runtimeSignals.fingerprintLoading}</p>
                  ) : fingerprintPanel.error ? (
                    <p className="mt-4 text-sm text-rose-700">{fingerprintPanel.error}</p>
                  ) : fingerprintPanel.data ? (
                    <div className="mt-4 space-y-3 text-sm text-slate-700">
                      <p>
                        <span className="font-semibold text-slate-900">{copy.sections.runtimeSignals.fingerprintShort}:</span>{' '}
                        {fingerprintPanel.data.shortFingerprint}
                      </p>
                      <p className="break-all">
                        <span className="font-semibold text-slate-900">{copy.sections.runtimeSignals.fingerprintFull}:</span>{' '}
                        {fingerprintPanel.data.fingerprint}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">{copy.sections.runtimeSignals.fingerprintGenerated}:</span>{' '}
                        {formatSecurityDateTime(selectedLocale, fingerprintPanel.data.generatedAt, copy.common.never)}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{copy.sections.runtimeSignals.rateLimitTitle}</p>
                      <p className="text-xs text-slate-500">{copy.sections.runtimeSignals.rateLimitHint}</p>
                    </div>
                  </div>
                  {rateLimitPanel.loading ? (
                    <p className="mt-4 text-sm text-slate-500">{copy.sections.runtimeSignals.rateLimitLoading}</p>
                  ) : rateLimitPanel.error ? (
                    <p className="mt-4 text-sm text-rose-700">{rateLimitPanel.error}</p>
                  ) : rateLimitPanel.data ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <SummaryCard
                        label={copy.sections.runtimeSignals.requests24h}
                        value={String(rateLimitPanel.data.summary.totalRequests24h)}
                        hint={copy.sections.runtimeSignals.requests24hHint}
                      />
                      <SummaryCard
                        label={copy.sections.runtimeSignals.blocked24h}
                        value={String(rateLimitPanel.data.summary.blockedRequests24h)}
                        hint={copy.sections.runtimeSignals.blocked24hHint}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                      <ShieldEllipsis className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{copy.sections.runtimeSignals.complianceTitle}</p>
                      <p className="text-xs text-slate-500">{copy.sections.runtimeSignals.complianceHint}</p>
                    </div>
                  </div>
                  {profileStorePanel.loading ? (
                    <p className="mt-4 text-sm text-slate-500">{copy.sections.runtimeSignals.complianceLoading}</p>
                  ) : profileStorePanel.error ? (
                    <p className="mt-4 text-sm text-rose-700">{profileStorePanel.error}</p>
                  ) : (
                    <div className="mt-4 space-y-3 text-sm text-slate-700">
                      <p>
                        <span className="font-semibold text-slate-900">{copy.sections.runtimeSignals.visibleStores}:</span>{' '}
                        {profileStorePanel.data?.length || 0}
                      </p>
                      <p className="text-xs leading-5 text-slate-500">
                        {copy.sections.runtimeSignals.visibleStoresHint}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </FormSection>
          </GlassSurface>

          <GlassSurface className="p-6">
            <FormSection
              title={copy.sections.runtimeSignals.endpointsTitle}
              description={copy.sections.runtimeSignals.endpointsDescription}
            >
              {rateLimitPanel.error ? (
                <StateView status="unavailable" title={copy.sections.runtimeSignals.endpointsUnavailable} description={rateLimitPanel.error} />
              ) : (
                <TableShell
                  ariaLabel={copy.sections.runtimeSignals.endpointsTitle}
                  columns={[...copy.sections.runtimeSignals.endpointsColumns]}
                  dataLength={rateLimitPanel.data?.topEndpoints.length || 0}
                  isLoading={rateLimitPanel.loading}
                  isEmpty={!rateLimitPanel.loading && (rateLimitPanel.data?.topEndpoints.length || 0) === 0}
                  emptyTitle={copy.sections.runtimeSignals.endpointsEmptyTitle}
                  emptyDescription={copy.sections.runtimeSignals.endpointsEmptyDescription}
                >
                  {rateLimitPanel.data?.topEndpoints.map((item) => (
                    <tr key={`${item.method}-${item.endpoint}`}>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{item.endpoint}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{item.method}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{item.current}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{item.limit}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{formatSecurityResetIn(selectedLocale, item.resetIn)}</td>
                    </tr>
                  ))}
                </TableShell>
              )}
            </FormSection>
          </GlassSurface>

          <GlassSurface className="p-6">
            <FormSection
              title={copy.sections.runtimeSignals.topIpsTitle}
              description={copy.sections.runtimeSignals.topIpsDescription}
            >
              <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                <TableShell
                  ariaLabel={copy.sections.runtimeSignals.topIpsTitle}
                  columns={[...copy.sections.runtimeSignals.topIpsColumns]}
                  dataLength={rateLimitPanel.data?.topIPs.length || 0}
                  isLoading={rateLimitPanel.loading}
                  isEmpty={!rateLimitPanel.loading && (rateLimitPanel.data?.topIPs.length || 0) === 0}
                  emptyTitle={copy.sections.runtimeSignals.topIpsEmptyTitle}
                  emptyDescription={copy.sections.runtimeSignals.topIpsEmptyDescription}
                >
                  {rateLimitPanel.data?.topIPs.map((item) => (
                    <tr key={item.ip}>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{item.ip}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{item.requests}</td>
                      <td className="px-6 py-4">
                        <ToneBadge tone={item.blocked ? 'danger' : 'success'} label={item.blocked ? copy.common.blocked : copy.common.allowed} />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{item.lastSeen}</td>
                    </tr>
                  ))}
                </TableShell>

                <div className="space-y-3">
                  {profileStorePanel.error ? (
                    <StateView
                      status="denied"
                      title={copy.sections.runtimeSignals.profileStoresUnavailable}
                      description={profileStorePanel.error}
                    />
                  ) : profileStorePanel.data && profileStorePanel.data.length > 0 ? (
                    profileStorePanel.data.map((store) => (
                      <div key={store.id} className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-900">
                              {pickSecurityLocalizedName(selectedLocale, store, store.code)}
                            </p>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{store.code}</p>
                          </div>
                          <ToneBadge tone={store.isActive ? 'success' : 'neutral'} label={store.isActive ? copy.common.active : copy.common.inactive} />
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <SummaryCard
                            label={copy.sections.runtimeSignals.profileStoresTalents}
                            value={String(store.talentCount)}
                            hint={copy.sections.runtimeSignals.profileStoresTalentsHint}
                          />
                          <SummaryCard
                            label={copy.sections.runtimeSignals.profileStoresCustomers}
                            value={String(store.customerCount)}
                            hint={copy.sections.runtimeSignals.profileStoresCustomersHint}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <StateView
                      status="empty"
                      title={copy.sections.runtimeSignals.profileStoresEmptyTitle}
                      description={copy.sections.runtimeSignals.profileStoresEmptyDescription}
                    />
                  )}
                </div>
              </div>
            </FormSection>
          </GlassSurface>
        </>
      ) : null}
      </div>

      <ConfirmActionDialog
        open={dirtyGuardState !== null}
        title={copy.dialogs.discardChangesTitle}
        description={copy.dialogs.discardChangesDescription}
        confirmText={copy.dialogs.discardChangesConfirm}
        cancelText={copy.common.cancel}
        intent="danger"
        onCancel={() => {
          setDirtyGuardState(null);
        }}
        onConfirm={() => {
          const nextAction = dirtyGuardState?.onDiscard;
          setDirtyGuardState(null);
          nextAction?.();
        }}
      />
      <ConfirmActionDialog
        open={dialogState !== null}
        title={dialogState?.title || copy.common.confirmAction}
        description={dialogState?.description || ''}
        confirmText={dialogState?.confirmText || copy.common.confirm}
        cancelText={copy.common.cancel}
        pendingText={dialogState?.pendingText}
        intent={dialogState?.intent || 'danger'}
        isPending={dialogPending}
        onConfirm={() => void confirmDialog()}
        onCancel={() => {
          if (!dialogPending) {
            setDialogState(null);
          }
        }}
      />
      <TranslationDrawer
        open={blocklistTranslationDrawerOpen}
        onOpenChange={setBlocklistTranslationDrawerOpen}
        title={copy.sections.blocklistEditor.translationManagement.title}
        baseValue={blocklistDraft.nameEn}
        translations={blocklistDraft.nameTranslations}
        legacyFieldLabel={copy.fields.ruleName}
        availableLocales={translationOptionsState.data}
        onSave={async (payload) => {
          const translations = extractSingleFieldTranslationPayload(payload);

          setBlocklistDraft((current) => ({
            ...current,
            nameTranslations: translations,
          }));
        }}
        saveButtonLabel={copy.sections.blocklistEditor.translationManagement.save}
        cancelButtonLabel={copy.sections.blocklistEditor.translationManagement.cancel}
        closeButtonAriaLabel={copy.sections.blocklistEditor.translationManagement.closeButtonAriaLabel}
        addLanguageLabel={translationDrawerLabels.addLanguageLabel}
        addOtherLanguageLabel={translationDrawerLabels.addOtherLanguageLabel}
        removeLanguageVisibleLabel={translationDrawerLabels.removeLanguageVisibleLabel}
        removeLanguageAriaLabel={(language) =>
          `${translationDrawerLabels.removeLanguageVisibleLabel} ${language}`
        }
        emptyTranslationsText={translationDrawerLabels.emptyTranslationsText}
        baseValueSuffix={translationDrawerLabels.baseValueSuffix}
      />
      <TranslationDrawer
        open={externalTranslationDrawerOpen}
        onOpenChange={setExternalTranslationDrawerOpen}
        title={copy.sections.externalEditor.translationManagement.title}
        baseValue={externalDraft.nameEn}
        translations={externalDraft.nameTranslations}
        legacyFieldLabel={copy.fields.ruleName}
        availableLocales={translationOptionsState.data}
        onSave={async (payload) => {
          const translations = extractSingleFieldTranslationPayload(payload);

          setExternalDraft((current) => ({
            ...current,
            nameTranslations: translations,
          }));
        }}
        saveButtonLabel={copy.sections.externalEditor.translationManagement.save}
        cancelButtonLabel={copy.sections.externalEditor.translationManagement.cancel}
        closeButtonAriaLabel={copy.sections.externalEditor.translationManagement.closeButtonAriaLabel}
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
