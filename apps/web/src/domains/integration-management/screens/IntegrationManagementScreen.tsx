'use client';

import type { SupportedUiLocale } from '@tcrn/shared';
import {
  Cable,
  ChevronRight,
  KeyRound,
  Languages,
  Mail,
  Plus,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Unplug,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import {
  createConsumer,
  createEmailTemplate,
  createScopedAdapter,
  createTenantAdapter,
  createWebhook,
  deactivateConsumer,
  deactivateEmailTemplate,
  deactivateTenantAdapter,
  deactivateWebhook,
  deleteWebhook,
  disableInheritedScopedAdapter,
  type EmailActionResult,
  type EmailConfigResponse,
  type EmailLocale,
  type EmailProvider,
  type EmailSenderTenantTarget,
  type EmailTemplateCategory,
  type EmailTemplateRecord,
  enableInheritedScopedAdapter,
  generateConsumerKey,
  type IntegrationAdapterDetailRecord,
  type IntegrationAdapterListItemRecord,
  type IntegrationAdapterScope,
  type IntegrationConsumerRecord,
  type IntegrationTab,
  type IntegrationWebhookDetailRecord,
  type IntegrationWebhookListItemRecord,
  listConsumers,
  listEmailSenderTenants,
  listEmailTemplates,
  listScopedAdapters,
  listSocialPlatforms,
  listTenantAdapters,
  listWebhookEvents,
  listWebhooks,
  type OwnerType,
  previewEmailTemplate,
  reactivateConsumer,
  reactivateEmailTemplate,
  reactivateTenantAdapter,
  reactivateWebhook,
  readEmailConfig,
  readTenantAdapter,
  readWebhook,
  revealTenantAdapterConfig,
  revokeConsumerKey,
  rotateConsumerKey,
  saveEmailConfig,
  sendEmailTest,
  type SocialPlatformRecord,
  testEmailConnection,
  updateConsumer,
  updateEmailTemplate,
  updateTenantAdapter,
  updateTenantAdapterConfigs,
  updateWebhook,
  type WebhookEventDefinition,
} from '@/domains/integration-management/api/integration-management.api';
import {
  formatIntegrationManagementDateTime,
  pickIntegrationLocalizedName,
  useIntegrationManagementCopy,
} from '@/domains/integration-management/screens/integration-management.copy';
import {
  type OrganizationNode,
  type OrganizationTalent,
  type OrganizationTreeResponse,
  readOrganizationTree,
} from '@/domains/organization-access/api/organization.api';
import { type ApiPaginationMeta, ApiRequestError } from '@/platform/http/api';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useFadeSwapState } from '@/platform/runtime/motion/use-fade-swap-state';
import {
  buildPaginationMeta,
  getPaginationRange,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
} from '@/platform/runtime/pagination/pagination';
import { useSession } from '@/platform/runtime/session/session-provider';
import {
  buildManagedTranslations,
  extractManagedTranslations,
  extractSingleFieldTranslationPayload,
  loadTranslationLanguageOptions,
  pickLegacyLocaleValue,
  resolveLocalizedLabel,
  type TranslationLanguageOption,
} from '@/platform/runtime/translations/managed-translations';
import {
  AsyncSubmitButton,
  ConfirmActionDialog,
  FormSection,
  GlassSurface,
  StateView,
  TableShell,
  TranslationDrawer,
} from '@/platform/ui';

type PanelState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
  unavailableReason: string | null;
};

interface NoticeState {
  tone: 'success' | 'error' | 'info';
  message: string;
}

interface ConfirmDialogState {
  title: string;
  description: string;
  confirmText: string;
  pendingText: string;
  intent: 'danger' | 'primary';
  errorFallback: string;
  onConfirm: () => Promise<string>;
}

interface IntegrationScopeSelection {
  ownerType: OwnerType;
  ownerId: string | null;
  label: string;
  hint: string;
}

interface AdapterDraft {
  platformId: string;
  code: string;
  nameEn: string;
  nameTranslations: Record<string, string>;
  nameZh: string;
  nameJa: string;
  adapterType: 'oauth' | 'api_key' | 'webhook';
  inherit: boolean;
}

interface AdapterConfigDraftRow {
  rowKey: string;
  configKey: string;
  configValue: string;
  isSecret: boolean;
  isMasked: boolean;
  isNew: boolean;
}

interface WebhookDraft {
  code: string;
  nameEn: string;
  nameTranslations: Record<string, string>;
  nameZh: string;
  nameJa: string;
  url: string;
  secret: string;
  selectedEvents: string[];
  headersText: string;
  maxRetries: string;
  backoffMs: string;
}

interface ConsumerDraft {
  code: string;
  nameEn: string;
  nameTranslations: Record<string, string>;
  nameZh: string;
  nameJa: string;
  consumerCategory: 'internal' | 'external' | 'partner';
  contactName: string;
  contactEmail: string;
  allowedIpsText: string;
  rateLimit: string;
  notes: string;
}

interface EmailConfigDraft {
  provider: EmailProvider;
  sesSecretId: string;
  sesSecretKey: string;
  sesRegion: string;
  sesFromAddress: string;
  sesFromName: string;
  sesReplyTo: string;
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  smtpUsername: string;
  smtpPassword: string;
  smtpFromAddress: string;
  smtpFromName: string;
  testEmail: string;
  tenantSenderOverrides: Record<string, TenantSenderOverrideDraft>;
}

interface TenantSenderOverrideDraft {
  fromAddress: string;
  fromName: string;
  replyTo: string;
}

interface TranslationOptionsState {
  data: TranslationLanguageOption[];
  error: string | null;
  loading: boolean;
}

interface EmailTemplateDraft {
  code: string;
  nameEn: string;
  nameTranslations: Record<string, string>;
  nameZh: string;
  nameJa: string;
  subjectEn: string;
  subjectTranslations: Record<string, string>;
  subjectZh: string;
  subjectJa: string;
  bodyHtmlEn: string;
  bodyHtmlTranslations: Record<string, string>;
  bodyHtmlZh: string;
  bodyHtmlJa: string;
  bodyTextEn: string;
  bodyTextTranslations: Record<string, string>;
  bodyTextZh: string;
  bodyTextJa: string;
  variablesText: string;
  category: EmailTemplateCategory;
}

type TemplateTranslationSection = 'name' | 'subject' | 'bodyHtml' | 'bodyText';

interface EmailConfigPanelState {
  data: EmailConfigResponse | null;
  loading: boolean;
  error: string | null;
  unavailableReason: string | null;
}

interface GeneratedKeyState {
  consumerCode: string;
  apiKey: string;
  apiKeyPrefix?: string;
  message: string;
}

interface EmailPreviewState {
  subject: string;
  htmlBody: string;
  textBody: string | null;
}

const TAB_ORDER: IntegrationTab[] = ['adapters', 'webhooks', 'api-keys', 'email'];
const TENANT_TAB_ORDER: IntegrationTab[] = ['adapters', 'webhooks', 'email'];

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function getUnavailableReason(reason: unknown) {
  return reason instanceof ApiRequestError && reason.status === 403 ? reason.message : null;
}

function createPanelState<T>(data: T, loading = true): PanelState<T> {
  return {
    data,
    loading,
    error: null,
    unavailableReason: null,
  };
}

function buildScopeSelection(
  ownerType: OwnerType,
  ownerId: string | null,
  label: string,
  hint: string,
): IntegrationScopeSelection {
  return {
    ownerType,
    ownerId,
    label,
    hint,
  };
}

function scopeMatches(
  left: IntegrationScopeSelection | null,
  right: IntegrationScopeSelection | null,
) {
  return left?.ownerType === right?.ownerType && left?.ownerId === right?.ownerId;
}

function isScopedAdapterScope(
  scope: IntegrationAdapterScope,
): scope is Exclude<IntegrationAdapterScope, { ownerType: 'tenant' }> {
  return scope.ownerType !== 'tenant';
}

function hasSelectionInTree(
  tree: OrganizationTreeResponse,
  selection: IntegrationScopeSelection | null,
): boolean {
  if (!selection) {
    return false;
  }

  if (selection.ownerType === 'tenant') {
    return true;
  }

  const walkNodes = (nodes: OrganizationNode[]): boolean =>
    nodes.some((node) => {
      if (selection.ownerType === 'subsidiary' && node.id === selection.ownerId) {
        return true;
      }

      if (
        selection.ownerType === 'talent'
        && node.talents.some((talent) => talent.id === selection.ownerId)
      ) {
        return true;
      }

      return walkNodes(node.children);
    });

  if (
    selection.ownerType === 'talent'
    && tree.directTalents.some((talent) => talent.id === selection.ownerId)
  ) {
    return true;
  }

  return walkNodes(tree.subsidiaries);
}

function resolveInitialTab(value: string | null, availableTabs: readonly IntegrationTab[]): IntegrationTab {
  return availableTabs.includes(value as IntegrationTab) ? (value as IntegrationTab) : 'adapters';
}

function trimToUndefined(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function splitCommaList(value: string) {
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : undefined;
}

function buildAdapterDraft(record?: IntegrationAdapterDetailRecord): AdapterDraft {
  return {
    platformId: record?.platform.id || '',
    code: record?.code || '',
    nameEn: record?.nameEn || '',
    nameTranslations: extractManagedTranslations(record?.nameEn, record?.translations, {
      zh_HANS: record?.nameZh,
      ja: record?.nameJa,
    }),
    nameZh: record?.nameZh || '',
    nameJa: record?.nameJa || '',
    adapterType: record?.adapterType || 'api_key',
    inherit: record?.inherit ?? true,
  };
}

function buildAdapterConfigRows(record?: IntegrationAdapterDetailRecord): AdapterConfigDraftRow[] {
  if (!record) {
    return [
      {
        rowKey: 'new-config-0',
        configKey: '',
        configValue: '',
        isSecret: false,
        isMasked: false,
        isNew: true,
      },
    ];
  }

  return [
    ...record.configs.map((config) => ({
      rowKey: config.id,
      configKey: config.configKey,
      configValue: config.configValue,
      isSecret: config.isSecret,
      isMasked: config.isSecret && config.configValue === '******',
      isNew: false,
    })),
    {
      rowKey: `new-config-${record.id}`,
      configKey: '',
      configValue: '',
      isSecret: false,
      isMasked: false,
      isNew: true,
    },
  ];
}

function buildWebhookDraft(record?: IntegrationWebhookDetailRecord): WebhookDraft {
  return {
    code: record?.code || '',
    nameEn: record?.nameEn || '',
    nameTranslations: extractManagedTranslations(record?.nameEn, record?.translations, {
      zh_HANS: record?.nameZh,
      ja: record?.nameJa,
    }),
    nameZh: record?.nameZh || '',
    nameJa: record?.nameJa || '',
    url: record?.url || '',
    secret: '',
    selectedEvents: record?.events || [],
    headersText: record
      ? Object.entries(record.headers)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')
      : '',
    maxRetries: String(record?.retryPolicy.maxRetries ?? 3),
    backoffMs: String(record?.retryPolicy.backoffMs ?? 1000),
  };
}

function buildConsumerDraft(record?: IntegrationConsumerRecord): ConsumerDraft {
  return {
    code: record?.code || '',
    nameEn: record?.nameEn || '',
    nameTranslations: extractManagedTranslations(record?.nameEn, record?.translations, {
      zh_HANS: record?.nameZh,
      ja: record?.nameJa,
    }),
    nameZh: record?.nameZh || '',
    nameJa: record?.nameJa || '',
    consumerCategory: record?.consumerCategory || 'external',
    contactName: record?.contactName || '',
    contactEmail: record?.contactEmail || '',
    allowedIpsText: record?.allowedIps?.join(', ') || '',
    rateLimit: record?.rateLimit ? String(record.rateLimit) : '',
    notes: record?.notes || '',
  };
}

function buildEmailConfigDraft(record?: EmailConfigResponse): EmailConfigDraft {
  const tenantSenderOverrides = Object.fromEntries(
    Object.entries(record?.tenantSenderOverrides ?? {}).map(([tenantSchema, override]) => [
      tenantSchema,
      {
        fromAddress: override.fromAddress || '',
        fromName: override.fromName || '',
        replyTo: override.replyTo || '',
      },
    ]),
  );

  return {
    provider: record?.provider || 'smtp',
    sesSecretId: record?.tencentSes?.secretId || '',
    sesSecretKey: record?.tencentSes?.secretKey || '',
    sesRegion: record?.tencentSes?.region || 'ap-hongkong',
    sesFromAddress: record?.tencentSes?.fromAddress || '',
    sesFromName: record?.tencentSes?.fromName || '',
    sesReplyTo: record?.tencentSes?.replyTo || '',
    smtpHost: record?.smtp?.host || '',
    smtpPort: record?.smtp?.port ? String(record.smtp.port) : '465',
    smtpSecure: record?.smtp?.secure ?? true,
    smtpUsername: record?.smtp?.username || '',
    smtpPassword: record?.smtp?.password || '',
    smtpFromAddress: record?.smtp?.fromAddress || '',
    smtpFromName: record?.smtp?.fromName || '',
    testEmail: '',
    tenantSenderOverrides,
  };
}

function buildEmailTemplateDraft(record?: EmailTemplateRecord): EmailTemplateDraft {
  return {
    code: record?.code || '',
    nameEn: record?.nameEn || '',
    nameTranslations: extractManagedTranslations(record?.nameEn, record?.translations, {
      zh_HANS: record?.nameZh,
      ja: record?.nameJa,
    }),
    nameZh: record?.nameZh || '',
    nameJa: record?.nameJa || '',
    subjectEn: record?.subjectEn || '',
    subjectTranslations: extractManagedTranslations(record?.subjectEn, record?.subjectTranslations, {
      zh_HANS: record?.subjectZh,
      ja: record?.subjectJa,
    }),
    subjectZh: record?.subjectZh || '',
    subjectJa: record?.subjectJa || '',
    bodyHtmlEn: record?.bodyHtmlEn || '',
    bodyHtmlTranslations: extractManagedTranslations(record?.bodyHtmlEn, record?.bodyHtmlTranslations, {
      zh_HANS: record?.bodyHtmlZh,
      ja: record?.bodyHtmlJa,
    }),
    bodyHtmlZh: record?.bodyHtmlZh || '',
    bodyHtmlJa: record?.bodyHtmlJa || '',
    bodyTextEn: record?.bodyTextEn || '',
    bodyTextTranslations: extractManagedTranslations(record?.bodyTextEn, record?.bodyTextTranslations, {
      zh_HANS: record?.bodyTextZh,
      ja: record?.bodyTextJa,
    }),
    bodyTextZh: record?.bodyTextZh || '',
    bodyTextJa: record?.bodyTextJa || '',
    variablesText: record?.variables.join(', ') || '',
    category: record?.category || 'system',
  };
}

function countConfiguredTranslations(values: Record<string, string>) {
  return Object.values(values).filter((value) => value.trim().length > 0).length;
}

function parseHeaderLines(input: string, invalidEntryMessage: (line: string) => string) {
  const headers: Record<string, string> = {};

  for (const rawLine of input.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const separatorIndex = line.indexOf(':');

    if (separatorIndex <= 0) {
      throw new Error(invalidEntryMessage(line));
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!key || !value) {
      throw new Error(invalidEntryMessage(line));
    }

    headers[key] = value;
  }

  return headers;
}

function parseVariableLines(input: string, invalidEntryMessage: (line: string) => string) {
  const variables: Record<string, string> = {};

  for (const rawLine of input.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex <= 0) {
      throw new Error(invalidEntryMessage(line));
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!key) {
      throw new Error(invalidEntryMessage(line));
    }

    variables[key] = value;
  }

  return variables;
}

function StatusBadge({
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

function NoticeBanner({
  tone,
  message,
}: Readonly<{
  tone: 'success' | 'error' | 'info';
  message: string;
}>) {
  const toneClasses =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : tone === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-800'
        : 'border-indigo-200 bg-indigo-50 text-indigo-800';

  return (
    <div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-medium ${toneClasses}`}>
      {message}
    </div>
  );
}

function SecondaryButton({
  children,
  onClick,
  disabled = false,
  tone = 'neutral',
  type = 'button',
}: Readonly<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'neutral' | 'danger' | 'primary';
  type?: 'button' | 'submit';
}>) {
  const toneClasses =
    tone === 'danger'
      ? 'border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50'
      : tone === 'primary'
        ? 'border-indigo-200 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50'
        : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-full border bg-white/85 px-3 py-2 text-sm font-medium transition ${toneClasses} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
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
          ? 'bg-slate-900 text-white shadow-sm'
          : 'border border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white'
      }`}
    >
      {label}
    </button>
  );
}

function paginateItems<T>(items: T[], page: number, pageSize: PageSizeOption) {
  const pagination = buildPaginationMeta(items.length, page, pageSize);
  const startIndex = (pagination.page - 1) * pagination.pageSize;

  return {
    items: items.slice(startIndex, startIndex + pagination.pageSize),
    pagination,
  };
}

function resolvePageForIndex(index: number, pageSize: PageSizeOption) {
  return Math.floor(index / pageSize) + 1;
}

function PaginationFooter({
  locale,
  pagination,
  itemCount,
  pageSize,
  onPageSizeChange,
  onPrevious,
  onNext,
  isLoading,
}: Readonly<{
  locale: SupportedUiLocale | 'en' | 'zh' | 'ja';
  pagination: ApiPaginationMeta;
  itemCount: number;
  pageSize: PageSizeOption;
  onPageSizeChange: (pageSize: PageSizeOption) => void;
  onPrevious: () => void;
  onNext: () => void;
  isLoading: boolean;
}>) {
  const pageRange = getPaginationRange(pagination, itemCount);
  const pageSizeLabel = pickLocaleText(locale, {
    en: 'Rows per page',
    zh_HANS: '每页条数',
    zh_HANT: '每頁筆數',
    ja: '1 ページの件数',
    ko: '페이지당 행 수',
    fr: 'Lignes par page',
  });
  const paginationLabel = pickLocaleText(locale, {
    en: `Page ${pagination.page} of ${pagination.totalPages}`,
    zh_HANS: `第 ${pagination.page} / ${pagination.totalPages} 页`,
    zh_HANT: `第 ${pagination.page} / ${pagination.totalPages} 頁`,
    ja: `${pagination.totalPages} ページ中 ${pagination.page} ページ`,
    ko: `${pagination.totalPages}페이지 중 ${pagination.page}페이지`,
    fr: `Page ${pagination.page} sur ${pagination.totalPages}`,
  });
  const paginationRangeLabel =
    pagination.totalCount === 0
      ? pickLocaleText(locale, {
          en: 'No records are currently visible.',
          zh_HANS: '当前没有可显示的记录。',
          zh_HANT: '目前沒有可顯示的紀錄。',
          ja: '現在表示できるレコードはありません。',
          ko: '표시할 레코드가 없습니다.',
          fr: "Aucun enregistrement n'est visible actuellement.",
        })
      : pickLocaleText(locale, {
          en: `Showing ${pageRange.start}-${pageRange.end} of ${pagination.totalCount}`,
          zh_HANS: `显示第 ${pageRange.start}-${pageRange.end} 条，共 ${pagination.totalCount} 条`,
          zh_HANT: `顯示第 ${pageRange.start}-${pageRange.end} 筆，共 ${pagination.totalCount} 筆`,
          ja: `${pagination.totalCount} 件中 ${pageRange.start}-${pageRange.end} 件を表示`,
          ko: `${pagination.totalCount}개 중 ${pageRange.start}-${pageRange.end}개 표시`,
          fr: `Affichage de ${pageRange.start} à ${pageRange.end} sur ${pagination.totalCount}`,
        });
  const previousLabel = pickLocaleText(locale, {
    en: 'Previous',
    zh_HANS: '上一页',
    zh_HANT: '上一頁',
    ja: '前へ',
    ko: '이전',
    fr: 'Précédent',
  });
  const nextLabel = pickLocaleText(locale, {
    en: 'Next',
    zh_HANS: '下一页',
    zh_HANT: '下一頁',
    ja: '次へ',
    ko: '다음',
    fr: 'Suivant',
  });

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-700">{paginationLabel}</p>
        <p className="text-xs text-slate-500">{paginationRangeLabel}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span className="font-medium text-slate-700">{pageSizeLabel}</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value) as PageSizeOption)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!pagination.hasPrev || isLoading}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {previousLabel}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!pagination.hasNext || isLoading}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  type = 'text',
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  type?: string;
}>) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}>) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}>) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
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

function CheckboxField({
  label,
  checked,
  onChange,
}: Readonly<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}>) {
  return (
    <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      <span>{label}</span>
    </label>
  );
}

export function IntegrationManagementScreen({
  tenantId: _tenantId,
  workspaceKind = 'tenant',
}: Readonly<{
  tenantId: string;
  workspaceKind?: 'tenant' | 'ac';
}>) {
  const { request, requestEnvelope, session } = useSession();
  const {
    selectedLocale,
    text,
    tabLabel,
    adapterTypeLabel,
    consumerCategoryLabel,
    emailProviderLabel,
    templateCategoryLabel,
    statusLabel,
    ownerScopeLabel,
    workspaceLabel: resolveWorkspaceLabel,
    workspaceDescriptor: resolveWorkspaceDescriptor,
  } = useIntegrationManagementCopy();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAcWorkspace = workspaceKind === 'ac';
  const localizedWorkspaceLabel = resolveWorkspaceLabel(isAcWorkspace);
  const workspaceChipLabel = `${localizedWorkspaceLabel} / ${text({
    en: 'Integration',
    zh_HANS: '集成',
    zh_HANT: '整合',
    ja: '統合',
    ko: '통합',
    fr: 'Intégration',
  })}`;
  const workspaceDescriptor = resolveWorkspaceDescriptor(isAcWorkspace);
  const tenantRootLabel = text({
    en: 'Tenant root',
    zh_HANS: '租户根',
    zh_HANT: '租戶根',
    ja: 'テナントルート',
    ko: '테넌트 루트',
    fr: 'Racine du tenant',
  });
  const tenantRootHint = session?.tenantName || text({
    en: 'Current tenant',
    zh_HANS: '当前租户',
    zh_HANT: '目前租戶',
    ja: '現在のテナント',
    ko: '현재 테넌트',
    fr: 'Tenant actuel',
  });
  const tenantRootSelection = useMemo(
    () => buildScopeSelection('tenant', null, tenantRootLabel, tenantRootHint),
    [tenantRootHint, tenantRootLabel],
  );
  const translationDrawerLabels = {
    addLanguageLabel: text({
      en: 'Add language',
      zh_HANS: '添加语言',
      zh_HANT: '新增語言',
      ja: '言語を追加',
      ko: '언어 추가',
      fr: 'Ajouter une langue',
    }),
    removeLanguageVisibleLabel: text({
      en: 'Remove',
      zh_HANS: '移除',
      zh_HANT: '移除',
      ja: '削除',
      ko: '제거',
      fr: 'Retirer',
    }),
    searchPlaceholder: text({
      en: 'Search languages...',
      zh_HANS: '搜索语言…',
      zh_HANT: '搜尋語言…',
      ja: '言語を検索…',
      ko: '언어 검색…',
      fr: 'Rechercher une langue…',
    }),
    noSearchResultsText: text({
      en: 'No languages found.',
      zh_HANS: '未找到匹配的语言。',
      zh_HANT: '找不到符合的語言。',
      ja: '一致する言語が見つかりません。',
      ko: '일치하는 언어를 찾을 수 없습니다.',
      fr: 'Aucune langue correspondante.',
    }),
    emptyTranslationsText: text({
      en: 'No translations added yet.',
      zh_HANS: '当前还没有添加翻译。',
      zh_HANT: '目前尚未新增翻譯。',
      ja: 'まだ翻訳は追加されていません。',
      ko: '아직 추가된 번역이 없습니다.',
      fr: 'Aucune traduction n’a encore été ajoutée.',
    }),
    baseValueSuffix: text({
      en: '(Base / English)',
      zh_HANS: '（英文主值）',
      zh_HANT: '（英文主值）',
      ja: '（英語の基準値）',
      ko: '(영문 기본값)',
      fr: '(Valeur de base / anglais)',
    }),
  };
  const [organizationTreePanel, setOrganizationTreePanel] = useState<PanelState<OrganizationTreeResponse | null>>(
    createPanelState<OrganizationTreeResponse | null>(null, !isAcWorkspace),
  );
  const [selectedScope, setSelectedScope] = useState<IntegrationScopeSelection | null>(null);
  const selectedIntegrationScope = isAcWorkspace ? tenantRootSelection : selectedScope;
  const availableTabs: readonly IntegrationTab[] = isAcWorkspace
    ? TAB_ORDER
    : selectedIntegrationScope
      ? selectedIntegrationScope.ownerType === 'tenant'
        ? TENANT_TAB_ORDER
        : (['adapters'] as const)
      : [];
  const resolvedInitialTab = resolveInitialTab(
    searchParams.get('tab'),
    availableTabs.length > 0 ? availableTabs : (['adapters'] as const),
  );

  const [activeTab, setActiveTab] = useState<IntegrationTab>(resolvedInitialTab);
  const {
    displayedValue: displayedTab,
    transitionClassName: tabTransitionClassName,
  } = useFadeSwapState(activeTab);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmDialogState | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);

  const [platformsPanel, setPlatformsPanel] = useState<PanelState<SocialPlatformRecord[]>>(
    createPanelState<SocialPlatformRecord[]>([]),
  );
  const [adaptersPanel, setAdaptersPanel] = useState<PanelState<IntegrationAdapterListItemRecord[]>>(
    createPanelState<IntegrationAdapterListItemRecord[]>([]),
  );
  const [adapterDetailPanel, setAdapterDetailPanel] = useState<PanelState<IntegrationAdapterDetailRecord | null>>(
    createPanelState<IntegrationAdapterDetailRecord | null>(null, false),
  );
  const [adapterPage, setAdapterPage] = useState(1);
  const [adapterPageSize, setAdapterPageSize] = useState<PageSizeOption>(PAGE_SIZE_OPTIONS[0]);
  const [webhooksPanel, setWebhooksPanel] = useState<PanelState<IntegrationWebhookListItemRecord[]>>(
    createPanelState<IntegrationWebhookListItemRecord[]>([]),
  );
  const [webhookPage, setWebhookPage] = useState(1);
  const [webhookPageSize, setWebhookPageSize] = useState<PageSizeOption>(PAGE_SIZE_OPTIONS[0]);
  const [webhookEventsPanel, setWebhookEventsPanel] = useState<PanelState<WebhookEventDefinition[]>>(
    createPanelState<WebhookEventDefinition[]>([]),
  );
  const [webhookDetailPanel, setWebhookDetailPanel] = useState<PanelState<IntegrationWebhookDetailRecord | null>>(
    createPanelState<IntegrationWebhookDetailRecord | null>(null, false),
  );
  const [consumersPanel, setConsumersPanel] = useState<PanelState<IntegrationConsumerRecord[]>>(
    createPanelState<IntegrationConsumerRecord[]>([]),
  );
  const [consumerPage, setConsumerPage] = useState(1);
  const [consumerPageSize, setConsumerPageSize] = useState<PageSizeOption>(PAGE_SIZE_OPTIONS[0]);
  const [emailTemplatesPanel, setEmailTemplatesPanel] = useState<PanelState<EmailTemplateRecord[]>>(
    createPanelState<EmailTemplateRecord[]>([]),
  );
  const [emailTemplatePage, setEmailTemplatePage] = useState(1);
  const [emailTemplatePageSize, setEmailTemplatePageSize] = useState<PageSizeOption>(PAGE_SIZE_OPTIONS[0]);
  const [emailConfigPanel, setEmailConfigPanel] = useState<EmailConfigPanelState>({
    data: null,
    loading: true,
    error: null,
    unavailableReason: null,
  });
  const [emailSenderTenantsPanel, setEmailSenderTenantsPanel] = useState<PanelState<EmailSenderTenantTarget[]>>(
    createPanelState<EmailSenderTenantTarget[]>([], false),
  );

  const [adapterCreateMode, setAdapterCreateMode] = useState(false);
  const [selectedAdapterId, setSelectedAdapterId] = useState<string | null>(null);
  const [adapterDraft, setAdapterDraft] = useState<AdapterDraft>(() => buildAdapterDraft());
  const [adapterTranslationDrawerOpen, setAdapterTranslationDrawerOpen] = useState(false);
  const [adapterConfigRows, setAdapterConfigRows] = useState<AdapterConfigDraftRow[]>(() => buildAdapterConfigRows());
  const [adapterSubmitting, setAdapterSubmitting] = useState(false);
  const [adapterConfigSubmitting, setAdapterConfigSubmitting] = useState(false);

  const [webhookCreateMode, setWebhookCreateMode] = useState(false);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  const [webhookDraft, setWebhookDraft] = useState<WebhookDraft>(() => buildWebhookDraft());
  const [webhookTranslationDrawerOpen, setWebhookTranslationDrawerOpen] = useState(false);
  const [webhookSubmitting, setWebhookSubmitting] = useState(false);

  const [consumerCreateMode, setConsumerCreateMode] = useState(false);
  const [selectedConsumerId, setSelectedConsumerId] = useState<string | null>(null);
  const [consumerDraft, setConsumerDraft] = useState<ConsumerDraft>(() => buildConsumerDraft());
  const [consumerTranslationDrawerOpen, setConsumerTranslationDrawerOpen] = useState(false);
  const [consumerTranslationOptionsState, setConsumerTranslationOptionsState] = useState<TranslationOptionsState>({
    data: [],
    error: null,
    loading: false,
  });
  const [consumerSubmitting, setConsumerSubmitting] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<GeneratedKeyState | null>(null);

  const [templateCreateMode, setTemplateCreateMode] = useState(false);
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string | null>(null);
  const [templateDraft, setTemplateDraft] = useState<EmailTemplateDraft>(() => buildEmailTemplateDraft());
  const [templateTranslationSection, setTemplateTranslationSection] = useState<TemplateTranslationSection | null>(null);
  const [templateSubmitting, setTemplateSubmitting] = useState(false);
  const [templatePreviewVariables, setTemplatePreviewVariables] = useState('name=Tokino Sora');
  const [templatePreview, setTemplatePreview] = useState<EmailPreviewState | null>(null);
  const [templatePreviewLoading, setTemplatePreviewLoading] = useState(false);

  const [emailConfigDraft, setEmailConfigDraft] = useState<EmailConfigDraft>(() => buildEmailConfigDraft());
  const [emailConfigSubmitting, setEmailConfigSubmitting] = useState(false);
  const [emailActionPending, setEmailActionPending] = useState<'connection' | 'test-email' | null>(null);
  const [emailActionResult, setEmailActionResult] = useState<EmailActionResult | null>(null);
  const isAnyTranslationDrawerOpen = consumerTranslationDrawerOpen
    || adapterTranslationDrawerOpen
    || webhookTranslationDrawerOpen
    || templateTranslationSection !== null;

  useEffect(() => {
    setActiveTab(resolvedInitialTab);
  }, [resolvedInitialTab]);

  useEffect(() => {
    if (!isAnyTranslationDrawerOpen) {
      return;
    }

    let cancelled = false;

    async function loadConsumerTranslationOptions() {
      setConsumerTranslationOptionsState((current) => ({
        data: current.data,
        error: null,
        loading: true,
      }));

      const result = await loadTranslationLanguageOptions(
        request,
        requestEnvelope,
        selectedLocale,
        text(
          'Failed to load translation languages.',
          '加载翻译语言失败。',
          '翻訳言語の読み込みに失敗しました。',
        ),
      );

      if (cancelled) {
        return;
      }

      setConsumerTranslationOptionsState({
        data: result.options,
        error: result.error,
        loading: false,
      });
    }

    void loadConsumerTranslationOptions();

    return () => {
      cancelled = true;
    };
  }, [isAnyTranslationDrawerOpen, request, requestEnvelope, selectedLocale, text]);

  useEffect(() => {
    if (isAcWorkspace) {
      setOrganizationTreePanel(createPanelState<OrganizationTreeResponse | null>(null, false));
      return;
    }

    let cancelled = false;

    async function loadOrganizationTree() {
      setOrganizationTreePanel((current) => ({
        ...current,
        loading: true,
        error: null,
        unavailableReason: null,
      }));

      try {
        const data = await readOrganizationTree(request, {
          includeInactive: false,
        });

        if (cancelled) {
          return;
        }

        setOrganizationTreePanel({
          data,
          loading: false,
          error: null,
          unavailableReason: null,
        });
      } catch (reason) {
        if (cancelled) {
          return;
        }

        const unavailableReason = getUnavailableReason(reason);
        setOrganizationTreePanel((current) => ({
          data: current.data,
          loading: false,
          error: unavailableReason
            ? null
            : getErrorMessage(
                reason,
                text(
                  'Failed to load the integration scope tree.',
                  '加载集成范围树失败。',
                  '統合スコープツリーの読み込みに失敗しました。',
                ),
              ),
          unavailableReason,
        }));
      }
    }

    void loadOrganizationTree();

    return () => {
      cancelled = true;
    };
  }, [isAcWorkspace, request]);

  useEffect(() => {
    if (
      isAcWorkspace
      || !organizationTreePanel.data
      || !selectedScope
      || hasSelectionInTree(organizationTreePanel.data, selectedScope)
    ) {
      return;
    }

    setSelectedScope(null);
  }, [isAcWorkspace, organizationTreePanel.data, selectedScope]);

  useEffect(() => {
    if (isAcWorkspace) {
      return;
    }

    setAdapterCreateMode(false);
    setSelectedAdapterId(null);
    setAdapterDetailPanel(createPanelState<IntegrationAdapterDetailRecord | null>(null, false));
    setAdapterDraft(buildAdapterDraft());
    setAdapterConfigRows(buildAdapterConfigRows());
    setWebhookCreateMode(false);
    setSelectedWebhookId(null);
    setWebhookDetailPanel(createPanelState<IntegrationWebhookDetailRecord | null>(null, false));
    setWebhookDraft(buildWebhookDraft());
    setTemplateCreateMode(false);
    setSelectedTemplateCode(null);
    setTemplateDraft(buildEmailTemplateDraft());
    setTemplatePreview(null);
    setEmailActionResult(null);
    setGeneratedKey(null);
  }, [isAcWorkspace, selectedIntegrationScope]);

  function setTab(nextTab: IntegrationTab) {
    if (!availableTabs.includes(nextTab)) {
      return;
    }

    setActiveTab(nextTab);

    const params = new URLSearchParams(searchParams.toString());

    if (nextTab === 'adapters') {
      params.delete('tab');
    } else {
      params.set('tab', nextTab);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  async function refreshPlatforms() {
    setPlatformsPanel((current) => ({
      ...current,
      loading: true,
      error: null,
      unavailableReason: null,
    }));

    try {
      const data = await listSocialPlatforms(request);
      setPlatformsPanel({
        data,
        loading: false,
        error: null,
        unavailableReason: null,
      });
    } catch (reason) {
      const unavailableReason = getUnavailableReason(reason);
      setPlatformsPanel((current) => ({
        data: current.data,
        loading: false,
        error: unavailableReason ? null : getErrorMessage(reason, text('Failed to load integration platform registry.', '加载集成平台目录失败。', '統合プラットフォーム一覧の読み込みに失敗しました。')),
        unavailableReason,
      }));
    }
  }

  async function refreshAdapters(preferredId?: string | null) {
    if (!selectedIntegrationScope) {
      setAdaptersPanel(createPanelState<IntegrationAdapterListItemRecord[]>([], false));
      setSelectedAdapterId(null);
      setAdapterPage(1);
      return;
    }

    setAdaptersPanel((current) => ({
      ...current,
      loading: true,
      error: null,
      unavailableReason: null,
    }));

    try {
      const data =
        selectedIntegrationScope.ownerType === 'tenant'
          ? await listTenantAdapters(request)
          : await listScopedAdapters(request, selectedIntegrationScope);
      setAdaptersPanel({
        data,
        loading: false,
        error: null,
        unavailableReason: null,
      });

      if (data.length === 0) {
        setAdapterPage(1);
      }

      if (!adapterCreateMode) {
        const targetId =
          preferredId && data.some((item) => item.id === preferredId)
            ? preferredId
            : selectedAdapterId && data.some((item) => item.id === selectedAdapterId)
              ? selectedAdapterId
              : data[0]?.id || null;
        setSelectedAdapterId(targetId);
        const targetIndex = targetId ? data.findIndex((item) => item.id === targetId) : -1;
        setAdapterPage(targetIndex >= 0 ? resolvePageForIndex(targetIndex, adapterPageSize) : 1);
      }
    } catch (reason) {
      const unavailableReason = getUnavailableReason(reason);
      setAdaptersPanel((current) => ({
        data: current.data,
        loading: false,
        error: unavailableReason
          ? null
          : getErrorMessage(
              reason,
              text(
                'Failed to load adapters for the selected scope.',
                '加载所选范围的适配器失败。',
                '選択したスコープのアダプター読み込みに失敗しました。',
              ),
            ),
        unavailableReason,
      }));
    }
  }

  async function refreshWebhooks(preferredId?: string | null) {
    setWebhooksPanel((current) => ({
      ...current,
      loading: true,
      error: null,
      unavailableReason: null,
    }));

    try {
      const data = await listWebhooks(request);
      setWebhooksPanel({
        data,
        loading: false,
        error: null,
        unavailableReason: null,
      });

      if (data.length === 0) {
        setWebhookPage(1);
      }

      if (!webhookCreateMode) {
        const targetId =
          preferredId && data.some((item) => item.id === preferredId)
            ? preferredId
            : selectedWebhookId && data.some((item) => item.id === selectedWebhookId)
              ? selectedWebhookId
              : data[0]?.id || null;
        setSelectedWebhookId(targetId);
        const targetIndex = targetId ? data.findIndex((item) => item.id === targetId) : -1;
        setWebhookPage(targetIndex >= 0 ? resolvePageForIndex(targetIndex, webhookPageSize) : 1);
      }
    } catch (reason) {
      const unavailableReason = getUnavailableReason(reason);
      setWebhooksPanel((current) => ({
        data: current.data,
        loading: false,
        error: unavailableReason ? null : getErrorMessage(reason, text('Failed to load webhooks.', '加载 Webhook 失败。', 'Webhook の読み込みに失敗しました。')),
        unavailableReason,
      }));
    }
  }

  async function refreshConsumers(preferredId?: string | null) {
    setConsumersPanel((current) => ({
      ...current,
      loading: true,
      error: null,
      unavailableReason: null,
    }));

    try {
      const data = await listConsumers(request);
      setConsumersPanel({
        data,
        loading: false,
        error: null,
        unavailableReason: null,
      });

      if (data.length === 0) {
        setConsumerPage(1);
      }

      if (!consumerCreateMode) {
        const targetId =
          preferredId && data.some((item) => item.id === preferredId)
            ? preferredId
            : selectedConsumerId && data.some((item) => item.id === selectedConsumerId)
              ? selectedConsumerId
              : data[0]?.id || null;
        setSelectedConsumerId(targetId);
        const targetIndex = targetId ? data.findIndex((item) => item.id === targetId) : -1;
        setConsumerPage(targetIndex >= 0 ? resolvePageForIndex(targetIndex, consumerPageSize) : 1);
      }
    } catch (reason) {
      const unavailableReason = getUnavailableReason(reason);
      setConsumersPanel((current) => ({
        data: current.data,
        loading: false,
        error: unavailableReason ? null : getErrorMessage(reason, text('Failed to load API clients.', '加载 API 客户端失败。', 'API クライアントの読み込みに失敗しました。')),
        unavailableReason,
      }));
    }
  }

  async function refreshEmailTemplates(preferredCode?: string | null) {
    setEmailTemplatesPanel((current) => ({
      ...current,
      loading: true,
      error: null,
      unavailableReason: null,
    }));

    try {
      const data = await listEmailTemplates(request);
      setEmailTemplatesPanel({
        data,
        loading: false,
        error: null,
        unavailableReason: null,
      });

      if (data.length === 0) {
        setEmailTemplatePage(1);
      }

      if (!templateCreateMode) {
        const targetCode =
          preferredCode && data.some((item) => item.code === preferredCode)
            ? preferredCode
            : selectedTemplateCode && data.some((item) => item.code === selectedTemplateCode)
              ? selectedTemplateCode
              : data[0]?.code || null;
        setSelectedTemplateCode(targetCode);
        const targetIndex = targetCode ? data.findIndex((item) => item.code === targetCode) : -1;
        setEmailTemplatePage(targetIndex >= 0 ? resolvePageForIndex(targetIndex, emailTemplatePageSize) : 1);
      }
    } catch (reason) {
      const unavailableReason = getUnavailableReason(reason);
      setEmailTemplatesPanel((current) => ({
        data: current.data,
        loading: false,
        error: unavailableReason ? null : getErrorMessage(reason, text('Failed to load email templates.', '加载邮件模板失败。', 'メールテンプレートの読み込みに失敗しました。')),
        unavailableReason,
      }));
    }
  }

  async function refreshWebhookEvents() {
    setWebhookEventsPanel((current) => ({
      ...current,
      loading: true,
      error: null,
      unavailableReason: null,
    }));

    try {
      const data = await listWebhookEvents(request);
      setWebhookEventsPanel({
        data,
        loading: false,
        error: null,
        unavailableReason: null,
      });
    } catch (reason) {
      const unavailableReason = getUnavailableReason(reason);
      setWebhookEventsPanel((current) => ({
        data: current.data,
        loading: false,
        error: unavailableReason ? null : getErrorMessage(reason, text('Failed to load webhook event catalog.', '加载 Webhook 事件目录失败。', 'Webhook イベント一覧の読み込みに失敗しました。')),
        unavailableReason,
      }));
    }
  }

  async function refreshEmailConfig() {
    setEmailConfigPanel((current) => ({
      ...current,
      loading: true,
      error: null,
      unavailableReason: null,
    }));
    setEmailSenderTenantsPanel((current) => ({
      ...current,
      loading: true,
      error: null,
      unavailableReason: null,
    }));

    try {
      const [data, tenants] = await Promise.all([
        readEmailConfig(request),
        listEmailSenderTenants(request),
      ]);
      setEmailConfigPanel({
        data,
        loading: false,
        error: null,
        unavailableReason: null,
      });
      setEmailSenderTenantsPanel({
        data: tenants,
        loading: false,
        error: null,
        unavailableReason: null,
      });
    } catch (reason) {
      if (reason instanceof ApiRequestError && reason.status === 403) {
        setEmailConfigPanel({
          data: null,
          loading: false,
          error: null,
          unavailableReason: reason.message,
        });
        setEmailSenderTenantsPanel(createPanelState<EmailSenderTenantTarget[]>([], false));
        return;
      }

      setEmailConfigPanel((current) => ({
        data: current.data,
        loading: false,
        error: getErrorMessage(reason, text('Failed to load email configuration.', '加载邮件配置失败。', 'メール設定の読み込みに失敗しました。')),
        unavailableReason: null,
      }));
      setEmailSenderTenantsPanel((current) => ({
        data: current.data,
        loading: false,
        error: getErrorMessage(reason, text('Failed to load tenant sender targets.', '加载租户发信目标失败。', 'テナント送信者対象の読み込みに失敗しました。')),
        unavailableReason: null,
      }));
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      if (!selectedIntegrationScope) {
        setPlatformsPanel(createPanelState<SocialPlatformRecord[]>([], false));
        setAdaptersPanel(createPanelState<IntegrationAdapterListItemRecord[]>([], false));
        setWebhooksPanel(createPanelState<IntegrationWebhookListItemRecord[]>([], false));
        setWebhookEventsPanel(createPanelState<WebhookEventDefinition[]>([], false));
        setConsumersPanel(createPanelState<IntegrationConsumerRecord[]>([], false));
        setEmailTemplatesPanel(createPanelState<EmailTemplateRecord[]>([], false));
        setEmailConfigPanel({
          data: null,
          loading: false,
          error: null,
          unavailableReason: null,
        });
        setEmailSenderTenantsPanel(createPanelState<EmailSenderTenantTarget[]>([], false));
        return;
      }

      const tasks: Array<Promise<void>> = [];

      if (activeTab === 'adapters') {
        tasks.push(refreshPlatforms(), refreshAdapters());
      } else if (activeTab === 'webhooks' && selectedIntegrationScope.ownerType === 'tenant') {
        tasks.push(refreshWebhooks(), refreshWebhookEvents());
      } else if (activeTab === 'api-keys') {
        tasks.push(refreshConsumers());
      } else if (activeTab === 'email' && selectedIntegrationScope.ownerType === 'tenant') {
        tasks.push(refreshEmailTemplates());

        if (isAcWorkspace) {
          tasks.push(refreshEmailConfig());
        }
      }

      const results = await Promise.allSettled(tasks);

      if (cancelled) {
        return;
      }

      const firstRejected = results.find((result) => result.status === 'rejected');

      if (firstRejected && firstRejected.status === 'rejected') {
        setNotice({
          tone: 'error',
          message: getErrorMessage(
            firstRejected.reason,
            text('Part of the integration data failed to load.', '部分集成数据加载失败。', '統合データの一部読み込みに失敗しました。'),
          ),
        });
      }
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [activeTab, isAcWorkspace, request, selectedIntegrationScope]);

  useEffect(() => {
    if (activeTab !== 'adapters' || adapterCreateMode || !selectedAdapterId) {
      setAdapterDetailPanel({
        data: null,
        loading: false,
        error: null,
        unavailableReason: null,
      });
      return;
    }

    const currentAdapterId = selectedAdapterId;
    let cancelled = false;

    async function loadAdapterDetail() {
      setAdapterDetailPanel((current) => ({
        ...current,
        loading: true,
        error: null,
        unavailableReason: null,
      }));

      try {
        const data = await readTenantAdapter(request, currentAdapterId);

        if (cancelled) {
          return;
        }

        setAdapterDetailPanel({
          data,
          loading: false,
          error: null,
          unavailableReason: null,
        });
        setAdapterDraft(buildAdapterDraft(data));
        setAdapterConfigRows(buildAdapterConfigRows(data));
      } catch (reason) {
        if (!cancelled) {
          const unavailableReason = getUnavailableReason(reason);
          setAdapterDetailPanel({
            data: null,
            loading: false,
            error: unavailableReason ? null : getErrorMessage(reason, text('Failed to load adapter details.', '加载适配器详情失败。', 'アダプター詳細の読み込みに失敗しました。')),
            unavailableReason,
          });
        }
      }
    }

    void loadAdapterDetail();

    return () => {
      cancelled = true;
    };
  }, [activeTab, adapterCreateMode, request, selectedAdapterId]);

  useEffect(() => {
    if (activeTab !== 'webhooks' || webhookCreateMode || !selectedWebhookId) {
      setWebhookDetailPanel({
        data: null,
        loading: false,
        error: null,
        unavailableReason: null,
      });
      return;
    }

    const currentWebhookId = selectedWebhookId;
    let cancelled = false;

    async function loadWebhookDetail() {
      setWebhookDetailPanel((current) => ({
        ...current,
        loading: true,
        error: null,
        unavailableReason: null,
      }));

      try {
        const data = await readWebhook(request, currentWebhookId);

        if (cancelled) {
          return;
        }

        setWebhookDetailPanel({
          data,
          loading: false,
          error: null,
          unavailableReason: null,
        });
        setWebhookDraft(buildWebhookDraft(data));
      } catch (reason) {
        if (!cancelled) {
          const unavailableReason = getUnavailableReason(reason);
          setWebhookDetailPanel({
            data: null,
            loading: false,
            error: unavailableReason ? null : getErrorMessage(reason, text('Failed to load webhook details.', '加载 Webhook 详情失败。', 'Webhook 詳細の読み込みに失敗しました。')),
            unavailableReason,
          });
        }
      }
    }

    void loadWebhookDetail();

    return () => {
      cancelled = true;
    };
  }, [activeTab, request, selectedWebhookId, webhookCreateMode]);

  useEffect(() => {
    if (consumerCreateMode) {
      setConsumerDraft(buildConsumerDraft());
      return;
    }

    const currentConsumer = consumersPanel.data.find((item) => item.id === selectedConsumerId);

    if (currentConsumer) {
      setConsumerDraft(buildConsumerDraft(currentConsumer));
    }
  }, [consumerCreateMode, consumersPanel.data, selectedConsumerId]);

  useEffect(() => {
    if (templateCreateMode) {
      setTemplateDraft(buildEmailTemplateDraft());
      setTemplatePreview(null);
      return;
    }

    const currentTemplate = emailTemplatesPanel.data.find((item) => item.code === selectedTemplateCode);

    if (currentTemplate) {
      setTemplateDraft(buildEmailTemplateDraft(currentTemplate));
      setTemplatePreview(null);
    }
  }, [emailTemplatesPanel.data, selectedTemplateCode, templateCreateMode]);

  useEffect(() => {
    if (emailConfigPanel.data) {
      setEmailConfigDraft(buildEmailConfigDraft(emailConfigPanel.data));
    }
  }, [emailConfigPanel.data]);

  const paginatedAdapters = useMemo(
    () => paginateItems(adaptersPanel.data, adapterPage, adapterPageSize),
    [adapterPage, adapterPageSize, adaptersPanel.data],
  );
  const paginatedWebhooks = useMemo(
    () => paginateItems(webhooksPanel.data, webhookPage, webhookPageSize),
    [webhookPage, webhookPageSize, webhooksPanel.data],
  );
  const paginatedConsumers = useMemo(
    () => paginateItems(consumersPanel.data, consumerPage, consumerPageSize),
    [consumerPage, consumerPageSize, consumersPanel.data],
  );
  const paginatedEmailTemplates = useMemo(
    () => paginateItems(emailTemplatesPanel.data, emailTemplatePage, emailTemplatePageSize),
    [emailTemplatePage, emailTemplatePageSize, emailTemplatesPanel.data],
  );

  useEffect(() => {
    if (adapterPage !== paginatedAdapters.pagination.page) {
      setAdapterPage(paginatedAdapters.pagination.page);
    }
  }, [adapterPage, paginatedAdapters.pagination.page]);

  useEffect(() => {
    if (webhookPage !== paginatedWebhooks.pagination.page) {
      setWebhookPage(paginatedWebhooks.pagination.page);
    }
  }, [paginatedWebhooks.pagination.page, webhookPage]);

  useEffect(() => {
    if (consumerPage !== paginatedConsumers.pagination.page) {
      setConsumerPage(paginatedConsumers.pagination.page);
    }
  }, [consumerPage, paginatedConsumers.pagination.page]);

  useEffect(() => {
    if (emailTemplatePage !== paginatedEmailTemplates.pagination.page) {
      setEmailTemplatePage(paginatedEmailTemplates.pagination.page);
    }
  }, [emailTemplatePage, paginatedEmailTemplates.pagination.page]);

  const selectedConsumer = useMemo(
    () => consumersPanel.data.find((item) => item.id === selectedConsumerId) || null,
    [consumersPanel.data, selectedConsumerId],
  );
  const selectedTemplate = useMemo(
    () => emailTemplatesPanel.data.find((item) => item.code === selectedTemplateCode) || null,
    [emailTemplatesPanel.data, selectedTemplateCode],
  );
  const formatDateTime = (value: string | null | undefined, fallback = text('Never', '从未', 'なし')) =>
    formatIntegrationManagementDateTime(selectedLocale, value, fallback);
  const pickLocalizedName = (
    english: string | null | undefined,
    chinese: string | null | undefined,
    japanese: string | null | undefined,
    fallback: string,
  ) => pickIntegrationLocalizedName(selectedLocale, english, chinese, japanese, fallback);
  const pickManagedLocalizedLabel = (
    translations: Record<string, string> | null | undefined,
    english: string | null | undefined,
    chinese: string | null | undefined,
    japanese: string | null | undefined,
    fallback: string,
    ) =>
    resolveLocalizedLabel(
      translations ?? {},
      selectedLocale,
      pickLocalizedName(english, chinese, japanese, fallback),
    );
  const pickConsumerDisplayName = (consumer: IntegrationConsumerRecord) =>
    pickManagedLocalizedLabel(consumer.translations, consumer.nameEn, consumer.nameZh, consumer.nameJa, consumer.code);
  const pickTemplateName = (template: EmailTemplateRecord) =>
    pickManagedLocalizedLabel(template.translations, template.nameEn, template.nameZh, template.nameJa, template.code);
  const pickTemplateSubject = (template: EmailTemplateRecord) =>
    resolveLocalizedLabel(
      template.subjectTranslations ?? {},
      selectedLocale,
      pickLocalizedName(template.subjectEn, template.subjectZh, template.subjectJa, template.subjectEn),
    );
  const getInvalidHeaderMessage = (line: string) =>
    text(
      `Invalid header entry "${line}". Use "Header-Name: value".`,
      `无效的请求头条目“${line}”，请使用“Header-Name: value”格式。`,
      `無効なヘッダー項目「${line}」です。「Header-Name: value」を使用してください。`,
    );
  const getInvalidVariableMessage = (line: string) =>
    text(
      `Invalid variable entry "${line}". Use "key=value".`,
      `无效的变量条目“${line}”，请使用“key=value”格式。`,
      `無効な変数項目「${line}」です。「key=value」を使用してください。`,
    );

  async function handleConfirmAction() {
    if (!confirmState) {
      return;
    }

    setConfirmPending(true);

    try {
      const message = await confirmState.onConfirm();
      setNotice({
        tone: 'success',
        message,
      });
      setConfirmState(null);
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, confirmState.errorFallback),
      });
    } finally {
      setConfirmPending(false);
    }
  }

  async function handleAdapterSave() {
    if (!selectedIntegrationScope) {
      return;
    }

    setAdapterSubmitting(true);
    setNotice(null);

    try {
      const translations = buildManagedTranslations(adapterDraft.nameEn, adapterDraft.nameTranslations);
      if (adapterCreateMode) {
        const payload = {
          platformId: adapterDraft.platformId,
          code: adapterDraft.code.trim().toUpperCase(),
          nameEn: adapterDraft.nameEn.trim(),
          nameZh: pickLegacyLocaleValue(translations, 'zh_HANS'),
          nameJa: pickLegacyLocaleValue(translations, 'ja'),
          translations,
          adapterType: adapterDraft.adapterType,
          inherit: adapterDraft.inherit,
          configs: adapterConfigRows
            .filter((row) => row.configKey.trim() && row.configValue.trim())
            .map((row) => ({
              configKey: row.configKey.trim(),
              configValue: row.configValue,
            })),
        };
        const created =
          selectedIntegrationScope.ownerType === 'tenant'
            ? await createTenantAdapter(request, payload)
            : await createScopedAdapter(request, selectedIntegrationScope, payload);

        setAdapterCreateMode(false);
        await refreshAdapters(created.id);
        setSelectedAdapterId(created.id);
        setNotice({
          tone: 'success',
          message: text(
            `${created.code} adapter created.`,
            `已创建适配器 ${created.code}。`,
            `アダプター ${created.code} を作成しました。`,
          ),
        });
      } else if (selectedAdapterId && adapterDetailPanel.data) {
        const updated = await updateTenantAdapter(request, selectedAdapterId, {
          nameEn: trimToUndefined(adapterDraft.nameEn),
          nameZh: pickLegacyLocaleValue(translations, 'zh_HANS'),
          nameJa: pickLegacyLocaleValue(translations, 'ja'),
          translations,
          inherit: adapterDraft.inherit,
          version: adapterDetailPanel.data.version,
        });

        await refreshAdapters(updated.id);
        setAdapterDetailPanel({
          data: updated,
          loading: false,
          error: null,
          unavailableReason: null,
        });
        setAdapterDraft(buildAdapterDraft(updated));
        setNotice({
          tone: 'success',
          message: text(
            `${updated.code} adapter profile updated.`,
            `已更新适配器 ${updated.code} 的资料。`,
            `アダプター ${updated.code} のプロファイルを更新しました。`,
          ),
        });
      }
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, text('Failed to save adapter changes.', '保存适配器更改失败。', 'アダプター変更の保存に失敗しました。')),
      });
    } finally {
      setAdapterSubmitting(false);
    }
  }

  async function handleAdapterConfigSave() {
    if (!selectedAdapterId || !adapterDetailPanel.data) {
      return;
    }

    const payload = adapterConfigRows
      .filter((row) => row.configKey.trim())
      .filter((row) => !row.isSecret || !row.isMasked || row.isNew)
      .filter((row) => row.configValue.trim() !== '')
      .map((row) => ({
        configKey: row.configKey.trim(),
        configValue: row.configValue,
      }));

    if (payload.length === 0) {
      setNotice({
        tone: 'info',
        message: text(
          'There are no writable config changes to submit. Reveal masked secrets before updating them.',
          '当前没有可提交的配置变更。若要修改已遮罩的密钥，请先显式显示其内容。',
          '送信できる設定変更はありません。マスクされたシークレットを更新する前に、先に明示表示してください。',
        ),
      });
      return;
    }

    setAdapterConfigSubmitting(true);
    setNotice(null);

    try {
      await updateTenantAdapterConfigs(request, selectedAdapterId, {
        configs: payload,
        adapterVersion: adapterDetailPanel.data.version,
      });

      const nextDetail = await readTenantAdapter(request, selectedAdapterId);
      setAdapterDetailPanel({
        data: nextDetail,
        loading: false,
        error: null,
        unavailableReason: null,
      });
      setAdapterConfigRows(buildAdapterConfigRows(nextDetail));
      await refreshAdapters(selectedAdapterId);
      setNotice({
        tone: 'success',
        message: text(
          `${nextDetail.code} adapter configs updated.`,
          `已更新适配器 ${nextDetail.code} 的配置。`,
          `アダプター ${nextDetail.code} の設定を更新しました。`,
        ),
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, text('Failed to update adapter configs.', '更新适配器配置失败。', 'アダプター設定の更新に失敗しました。')),
      });
    } finally {
      setAdapterConfigSubmitting(false);
    }
  }

  async function handleRevealAdapterConfig(configKey: string) {
    if (!selectedAdapterId) {
      return;
    }

    setNotice(null);

    try {
      const revealed = await revealTenantAdapterConfig(request, selectedAdapterId, configKey);
      setAdapterConfigRows((current) =>
        current.map((row) =>
          row.configKey === revealed.configKey
            ? {
                ...row,
                configValue: revealed.configValue,
                isMasked: false,
              }
            : row,
        ),
      );
      setNotice({
        tone: 'info',
        message: text(
          `${revealed.configKey} revealed. Treat it as temporary secret material.`,
          `已显示 ${revealed.configKey}，请将其视为临时敏感信息。`,
          `${revealed.configKey} を表示しました。一時的な機密情報として扱ってください。`,
        ),
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, text('Failed to reveal adapter secret.', '显示适配器密钥失败。', 'アダプターシークレットの表示に失敗しました。')),
      });
    }
  }

  async function handleWebhookSave() {
    setWebhookSubmitting(true);
    setNotice(null);

    try {
      const headers = parseHeaderLines(webhookDraft.headersText, getInvalidHeaderMessage);
      const translations = buildManagedTranslations(webhookDraft.nameEn, webhookDraft.nameTranslations);
      const payload = {
        code: webhookDraft.code.trim().toUpperCase(),
        nameEn: webhookDraft.nameEn.trim(),
        nameZh: pickLegacyLocaleValue(translations, 'zh_HANS'),
        nameJa: pickLegacyLocaleValue(translations, 'ja'),
        translations,
        url: webhookDraft.url.trim(),
        secret: trimToUndefined(webhookDraft.secret),
        events: webhookDraft.selectedEvents as WebhookEventDefinition['event'][],
        headers,
        retryPolicy: {
          maxRetries: Number(webhookDraft.maxRetries || 3),
          backoffMs: Number(webhookDraft.backoffMs || 1000),
        },
      };

      if (webhookCreateMode) {
        const created = await createWebhook(request, payload);
        setWebhookCreateMode(false);
        await refreshWebhooks(created.id);
        setSelectedWebhookId(created.id);
        setNotice({
          tone: 'success',
          message: text(
            `${created.code} webhook created.`,
            `已创建 Webhook ${created.code}。`,
            `Webhook ${created.code} を作成しました。`,
          ),
        });
      } else if (selectedWebhookId && webhookDetailPanel.data) {
        const updated = await updateWebhook(request, selectedWebhookId, {
          nameEn: payload.nameEn,
          nameZh: payload.nameZh,
          nameJa: payload.nameJa,
          translations: payload.translations,
          url: payload.url,
          secret: payload.secret,
          events: payload.events,
          headers: payload.headers,
          retryPolicy: payload.retryPolicy,
          version: webhookDetailPanel.data.version,
        });

        setWebhookDetailPanel({
          data: updated,
          loading: false,
          error: null,
          unavailableReason: null,
        });
        setWebhookDraft(buildWebhookDraft(updated));
        await refreshWebhooks(updated.id);
        setNotice({
          tone: 'success',
          message: text(
            `${updated.code} webhook updated.`,
            `已更新 Webhook ${updated.code}。`,
            `Webhook ${updated.code} を更新しました。`,
          ),
        });
      }
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, text('Failed to save webhook changes.', '保存 Webhook 更改失败。', 'Webhook 変更の保存に失敗しました。')),
      });
    } finally {
      setWebhookSubmitting(false);
    }
  }

  async function handleConsumerSave() {
    setConsumerSubmitting(true);
    setNotice(null);

    try {
      const translations = buildManagedTranslations(consumerDraft.nameEn, consumerDraft.nameTranslations);
      const nameZh = pickLegacyLocaleValue(translations, 'zh_HANS');
      const nameJa = pickLegacyLocaleValue(translations, 'ja');
      const payload = {
        code: consumerDraft.code.trim().toUpperCase(),
        nameEn: consumerDraft.nameEn.trim(),
        nameZh,
        nameJa,
        translations,
        consumerCategory: consumerDraft.consumerCategory,
        contactName: trimToUndefined(consumerDraft.contactName),
        contactEmail: trimToUndefined(consumerDraft.contactEmail),
        allowedIps: splitCommaList(consumerDraft.allowedIpsText),
        rateLimit: trimToUndefined(consumerDraft.rateLimit)
          ? Number(consumerDraft.rateLimit)
          : undefined,
        notes: trimToUndefined(consumerDraft.notes),
      };

      if (consumerCreateMode) {
        const created = await createConsumer(request, payload);
        setConsumerCreateMode(false);
        await refreshConsumers(created.id);
        setSelectedConsumerId(created.id);
        setNotice({
          tone: 'success',
          message: text(
            `${created.code} API client created.`,
            `已创建 API 客户端 ${created.code}。`,
            `API クライアント ${created.code} を作成しました。`,
          ),
        });
      } else if (selectedConsumerId && selectedConsumer) {
        const updated = await updateConsumer(request, selectedConsumerId, {
          ...payload,
          version: selectedConsumer.version,
        });
        await refreshConsumers(updated.id);
        setSelectedConsumerId(updated.id);
        setNotice({
          tone: 'success',
          message: text(
            `${updated.code} API client updated.`,
            `已更新 API 客户端 ${updated.code}。`,
            `API クライアント ${updated.code} を更新しました。`,
          ),
        });
      }
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, text('Failed to save API client changes.', '保存 API 客户端更改失败。', 'API クライアント変更の保存に失敗しました。')),
      });
    } finally {
      setConsumerSubmitting(false);
    }
  }

  function updateTenantSenderOverride(
    tenantSchema: string,
    field: keyof TenantSenderOverrideDraft,
    value: string,
  ) {
    setEmailConfigDraft((current) => ({
      ...current,
      tenantSenderOverrides: {
        ...current.tenantSenderOverrides,
        [tenantSchema]: {
          fromAddress: current.tenantSenderOverrides[tenantSchema]?.fromAddress || '',
          fromName: current.tenantSenderOverrides[tenantSchema]?.fromName || '',
          replyTo: current.tenantSenderOverrides[tenantSchema]?.replyTo || '',
          [field]: value,
        },
      },
    }));
  }

  function buildTenantSenderOverridesPayload() {
    const entries = Object.entries(emailConfigDraft.tenantSenderOverrides)
      .map(([tenantSchema, override]) => {
        const normalized = {
          fromAddress: trimToUndefined(override.fromAddress),
          fromName: trimToUndefined(override.fromName),
          replyTo: trimToUndefined(override.replyTo),
        };

        return [tenantSchema, normalized] as const;
      })
      .filter((entry) => {
        const [tenantSchema, override] = entry;
        return tenantSchema.trim().length > 0 && !!(override.fromAddress || override.fromName || override.replyTo);
      });

    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }

  async function handleEmailConfigSave() {
    setEmailConfigSubmitting(true);
    setNotice(null);
    setEmailActionResult(null);

    try {
      const tenantSenderOverrides = buildTenantSenderOverridesPayload();
      const payload =
        emailConfigDraft.provider === 'tencent_ses'
          ? {
              provider: 'tencent_ses' as const,
              tencentSes: {
                secretId: emailConfigDraft.sesSecretId.trim(),
                secretKey: emailConfigDraft.sesSecretKey.trim(),
                region: trimToUndefined(emailConfigDraft.sesRegion),
                fromAddress: emailConfigDraft.sesFromAddress.trim(),
                fromName: emailConfigDraft.sesFromName.trim(),
                replyTo: trimToUndefined(emailConfigDraft.sesReplyTo),
              },
              tenantSenderOverrides,
            }
          : {
              provider: 'smtp' as const,
              smtp: {
                host: emailConfigDraft.smtpHost.trim(),
                port: Number(emailConfigDraft.smtpPort || 465),
                secure: emailConfigDraft.smtpSecure,
                username: emailConfigDraft.smtpUsername.trim(),
                password: emailConfigDraft.smtpPassword.trim(),
                fromAddress: emailConfigDraft.smtpFromAddress.trim(),
                fromName: emailConfigDraft.smtpFromName.trim(),
              },
              tenantSenderOverrides,
            };

      const nextConfig = await saveEmailConfig(request, payload);
      setEmailConfigPanel({
        data: nextConfig,
        loading: false,
        error: null,
        unavailableReason: null,
      });
      setEmailConfigDraft(buildEmailConfigDraft(nextConfig));
      setNotice({
        tone: 'success',
        message: text('Email configuration saved.', '邮件配置已保存。', 'メール設定を保存しました。'),
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, text('Failed to save email configuration.', '保存邮件配置失败。', 'メール設定の保存に失敗しました。')),
      });
    } finally {
      setEmailConfigSubmitting(false);
    }
  }

  async function handleEmailAction(action: 'connection' | 'test-email') {
    setEmailActionPending(action);
    setNotice(null);

    try {
      const result =
        action === 'connection'
          ? await testEmailConnection(request)
          : await sendEmailTest(request, emailConfigDraft.testEmail.trim());

      setEmailActionResult(result);
      setNotice({
        tone: result.success ? 'success' : 'error',
        message: result.message,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(
          reason,
          action === 'connection'
            ? text('Failed to test email connection.', '测试邮件连接失败。', 'メール接続テストに失敗しました。')
            : text('Failed to send test email.', '发送测试邮件失败。', 'テストメールの送信に失敗しました。'),
        ),
      });
    } finally {
      setEmailActionPending(null);
    }
  }

  async function handleTemplateSave() {
    setTemplateSubmitting(true);
    setNotice(null);

    try {
      const nameTranslations = buildManagedTranslations(templateDraft.nameEn, templateDraft.nameTranslations);
      const subjectTranslations = buildManagedTranslations(templateDraft.subjectEn, templateDraft.subjectTranslations);
      const bodyHtmlTranslations = buildManagedTranslations(templateDraft.bodyHtmlEn, templateDraft.bodyHtmlTranslations);
      const bodyTextTranslations = buildManagedTranslations(templateDraft.bodyTextEn, templateDraft.bodyTextTranslations);
      const payload = {
        code: templateDraft.code.trim().toUpperCase(),
        nameEn: templateDraft.nameEn.trim(),
        nameZh: pickLegacyLocaleValue(nameTranslations, 'zh_HANS'),
        nameJa: pickLegacyLocaleValue(nameTranslations, 'ja'),
        translations: nameTranslations,
        subjectEn: templateDraft.subjectEn.trim(),
        subjectZh: pickLegacyLocaleValue(subjectTranslations, 'zh_HANS'),
        subjectJa: pickLegacyLocaleValue(subjectTranslations, 'ja'),
        subjectTranslations,
        bodyHtmlEn: templateDraft.bodyHtmlEn,
        bodyHtmlZh: pickLegacyLocaleValue(bodyHtmlTranslations, 'zh_HANS'),
        bodyHtmlJa: pickLegacyLocaleValue(bodyHtmlTranslations, 'ja'),
        bodyHtmlTranslations,
        bodyTextEn: trimToUndefined(templateDraft.bodyTextEn),
        bodyTextZh: pickLegacyLocaleValue(bodyTextTranslations, 'zh_HANS'),
        bodyTextJa: pickLegacyLocaleValue(bodyTextTranslations, 'ja'),
        bodyTextTranslations,
        variables: splitCommaList(templateDraft.variablesText),
        category: templateDraft.category,
      };

      if (templateCreateMode) {
        const created = await createEmailTemplate(request, payload);
        setTemplateCreateMode(false);
        await refreshEmailTemplates(created.code);
        setSelectedTemplateCode(created.code);
        setNotice({
          tone: 'success',
          message: text(
            `${created.code} email template created.`,
            `已创建邮件模板 ${created.code}。`,
            `メールテンプレート ${created.code} を作成しました。`,
          ),
        });
      } else if (selectedTemplateCode) {
        const updated = await updateEmailTemplate(request, selectedTemplateCode, {
          nameEn: payload.nameEn,
          nameZh: payload.nameZh,
          nameJa: payload.nameJa,
          translations: payload.translations,
          subjectEn: payload.subjectEn,
          subjectZh: payload.subjectZh,
          subjectJa: payload.subjectJa,
          subjectTranslations: payload.subjectTranslations,
          bodyHtmlEn: payload.bodyHtmlEn,
          bodyHtmlZh: payload.bodyHtmlZh,
          bodyHtmlJa: payload.bodyHtmlJa,
          bodyHtmlTranslations: payload.bodyHtmlTranslations,
          bodyTextEn: payload.bodyTextEn,
          bodyTextZh: payload.bodyTextZh,
          bodyTextJa: payload.bodyTextJa,
          bodyTextTranslations: payload.bodyTextTranslations,
          variables: payload.variables,
          category: payload.category,
        });
        await refreshEmailTemplates(updated.code);
        setSelectedTemplateCode(updated.code);
        setNotice({
          tone: 'success',
          message: text(
            `${updated.code} email template updated.`,
            `已更新邮件模板 ${updated.code}。`,
            `メールテンプレート ${updated.code} を更新しました。`,
          ),
        });
      }
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, text('Failed to save email template changes.', '保存邮件模板更改失败。', 'メールテンプレート変更の保存に失敗しました。')),
      });
    } finally {
      setTemplateSubmitting(false);
    }
  }

  async function handleTemplatePreview() {
    if (!selectedTemplateCode) {
      setNotice({
        tone: 'info',
        message: text(
          'Save the template first, then preview the stored version.',
          '请先保存新模板，再基于已存储的模板进行预览。',
          '新しいテンプレートを先に保存してから、保存済みテンプレートでプレビューしてください。',
        ),
      });
      return;
    }

    setTemplatePreviewLoading(true);
    setNotice(null);

    try {
      const variables = parseVariableLines(templatePreviewVariables, getInvalidVariableMessage);
      const preview = await previewEmailTemplate(request, selectedTemplateCode, selectedLocale as EmailLocale, variables);
      setTemplatePreview(preview);
      setNotice({
        tone: 'success',
        message: text(
          `${selectedTemplateCode} preview rendered.`,
          `已渲染模板 ${selectedTemplateCode} 的预览。`,
          `テンプレート ${selectedTemplateCode} のプレビューを生成しました。`,
        ),
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, text('Failed to render email template preview.', '渲染邮件模板预览失败。', 'メールテンプレートのプレビュー生成に失敗しました。')),
      });
    } finally {
      setTemplatePreviewLoading(false);
    }
  }

  const adapterCount = adaptersPanel.data.length;
  const webhookCount = webhooksPanel.data.length;
  const consumerCount = consumersPanel.data.length;
  const configuredAdapterTranslationCount = countConfiguredTranslations(adapterDraft.nameTranslations);
  const configuredWebhookTranslationCount = countConfiguredTranslations(webhookDraft.nameTranslations);
  const configuredConsumerTranslationCount = countConfiguredTranslations(consumerDraft.nameTranslations);
  const configuredTemplateNameTranslationCount = countConfiguredTranslations(templateDraft.nameTranslations);
  const configuredTemplateSubjectTranslationCount = countConfiguredTranslations(templateDraft.subjectTranslations);
  const configuredTemplateBodyHtmlTranslationCount = countConfiguredTranslations(templateDraft.bodyHtmlTranslations);
  const configuredTemplateBodyTextTranslationCount = countConfiguredTranslations(templateDraft.bodyTextTranslations);
  const emailTemplateCount = emailTemplatesPanel.data.length;
  const templateTranslationDrawerConfig = templateTranslationSection
    ? templateTranslationSection === 'name'
      ? {
          title: text('Template name translations', '模板名称翻译', 'テンプレート名翻訳'),
          baseValue: templateDraft.nameEn,
          translations: templateDraft.nameTranslations,
        }
      : templateTranslationSection === 'subject'
        ? {
            title: text('Template subject translations', '模板主题翻译', 'テンプレート件名翻訳'),
            baseValue: templateDraft.subjectEn,
            translations: templateDraft.subjectTranslations,
          }
        : templateTranslationSection === 'bodyHtml'
          ? {
              title: text('HTML body translations', 'HTML 正文翻译', 'HTML 本文翻訳'),
              baseValue: templateDraft.bodyHtmlEn,
              translations: templateDraft.bodyHtmlTranslations,
            }
          : {
              title: text('Text body translations', '纯文本正文翻译', 'テキスト本文翻訳'),
              baseValue: templateDraft.bodyTextEn,
              translations: templateDraft.bodyTextTranslations,
            }
    : null;
  const isTenantRootScope = selectedIntegrationScope?.ownerType === 'tenant';
  const selectedScopeDisplayName = !selectedIntegrationScope
    ? text('No scope selected', '未选择范围', 'スコープ未選択')
    : selectedIntegrationScope.ownerType === 'tenant'
      ? tenantRootHint
      : selectedIntegrationScope.label;
  const noScopeWorkspaceDescription =
    selectedLocale === 'zh_HANT'
      ? '請先從左側選擇範圍，再開啟對應的整合工作區。'
      : selectedLocale === 'ko'
        ? '왼쪽 메뉴에서 범위를 선택하여 연동 워크스페이스를 여세요.'
        : selectedLocale === 'fr'
          ? "Sélectionnez une portée dans le menu de gauche pour ouvrir l'espace d’intégration."
          : text(
              'Select a scope from the left to open its integration workspace.',
              '请先从左侧选择一个范围，再打开对应的集成工作区。',
              '左側からスコープを選択して統合ワークスペースを開いてください。',
            );
  const noScopeTreeHint =
    selectedLocale === 'zh_HANT'
      ? '請先從左側樹中選擇租戶根、子公司或藝人。'
      : selectedLocale === 'ko'
        ? '먼저 왼쪽 트리에서 테넌트 루트, 자회사 또는 탤런트를 선택하세요.'
        : selectedLocale === 'fr'
          ? "Choisissez d’abord une racine de tenant, une filiale ou un talent dans l’arborescence de gauche."
          : text(
              'Choose tenant root, a subsidiary, or a talent from the left tree first.',
              '请先从左侧树中选择租户根、子公司或艺人。',
              '先に左側ツリーからテナントルート、子会社、またはタレントを選択してください。',
            );
  const noScopeTreeDescription =
    selectedLocale === 'zh_HANT'
      ? '請先從左側樹中選擇租戶、子公司或藝人。'
      : selectedLocale === 'ko'
        ? '왼쪽 트리에서 테넌트, 자회사 또는 탤런트를 선택하세요.'
        : selectedLocale === 'fr'
          ? 'Choisissez un tenant, une filiale ou un talent dans l’arborescence de gauche.'
          : text(
              'Choose a tenant, subsidiary, or talent from the left tree.',
              '请先从左侧树中选择租户、子公司或艺人。',
              '左側ツリーからテナント、子会社、またはタレントを選択してください。',
            );
  const selectedScopeHint = !selectedIntegrationScope
    ? noScopeTreeHint
    : selectedIntegrationScope.hint;
  const adapterSectionTitle = !selectedIntegrationScope || selectedIntegrationScope.ownerType === 'tenant'
    ? text('Tenant Adapters', '租户适配器', 'テナントアダプター')
    : selectedIntegrationScope.ownerType === 'subsidiary'
      ? text('Subsidiary Adapters', '子公司适配器', '子会社アダプター')
      : text('Talent Adapters', '艺人适配器', 'タレントアダプター');
  const adapterSectionDescription = !selectedIntegrationScope
    ? text(
        'Select a scope before managing adapter records.',
        '请先选择一个范围再管理适配器记录。',
        'アダプターを管理する前にスコープを選択してください。',
      )
    : selectedIntegrationScope.ownerType === 'tenant'
      ? text(
          'Create, update, and activate adapters tied to shared platform definitions at tenant root.',
          '在租户根范围创建、更新并启停绑定到共享平台定义的适配器。',
          'テナントルートで共有プラットフォーム定義に紐づくアダプターを作成・更新・有効化します。',
        )
      : text(
          `Manage adapters inherited by or owned within ${selectedIntegrationScope.label}. Webhooks and email stay at tenant root.`,
          `管理 ${selectedIntegrationScope.label} 范围内继承或自有的适配器。Webhook 与邮件保留在租户根范围。`,
          `${selectedIntegrationScope.label} に継承または所有されたアダプターを管理します。Webhook とメールはテナントルートに保持されます。`,
        );

  function renderScopeButton(
    scope: IntegrationScopeSelection,
    depth: number,
    kindLabel: string,
  ) {
    const isActive = scopeMatches(selectedScope, scope);

    return (
      <button
        key={`${scope.ownerType}:${scope.ownerId ?? 'root'}`}
        type="button"
        onClick={() => setSelectedScope(scope)}
        aria-pressed={isActive}
        className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
          isActive
            ? 'border-indigo-300 bg-indigo-50 text-indigo-950 shadow-sm'
            : 'border-transparent bg-white/60 text-slate-700 hover:border-slate-200 hover:bg-white'
        }`}
        style={{ marginLeft: `${depth * 16}px` }}
      >
        <div className="mt-1 flex h-5 w-5 flex-none items-center justify-center rounded-full border border-current/20 bg-white/70">
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold">{scope.label}</span>
            <span className="rounded-full border border-current/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-current/70">
              {kindLabel}
            </span>
          </div>
          <p className="text-xs text-slate-500">{scope.hint}</p>
        </div>
      </button>
    );
  }

  function renderTalentScope(
    talent: OrganizationTalent,
    labels: string[],
    depth: number,
  ) {
    return renderScopeButton(
      buildScopeSelection(
        'talent',
        talent.id,
        talent.displayName,
        [...labels, talent.displayName].join(' / '),
      ),
      depth,
      text('Talent', '艺人', 'タレント'),
    );
  }

  function renderOrganizationNodes(
    nodes: OrganizationNode[],
    depth = 1,
    lineage: string[] = [],
  ): ReactNode[] {
    return nodes.flatMap((node) => {
      const nextLineage = [...lineage, node.displayName];

      return [
        <div key={`subsidiary:${node.id}`} className="space-y-2">
          {renderScopeButton(
            buildScopeSelection(
              'subsidiary',
              node.id,
              node.displayName,
              nextLineage.join(' / '),
            ),
            depth,
            text('Subsidiary', '子公司', '子会社'),
          )}
          {node.talents.map((talent) => (
            <div key={`talent:${talent.id}`} className="space-y-2">
              {renderTalentScope(talent, nextLineage, depth + 1)}
            </div>
          ))}
          {renderOrganizationNodes(node.children, depth + 1, nextLineage)}
        </div>,
      ];
    });
  }

  const currentTabLabel =
    activeTab === 'adapters'
      ? text('Adapter Management', '适配器管理', 'アダプター管理')
      : activeTab === 'webhooks'
        ? text('Webhook Management', 'Webhook 管理', 'Webhook 管理')
        : activeTab === 'api-keys'
          ? text('API Client Management', 'API 客户端管理', 'API クライアント管理')
          : text('Email Management', '邮件管理', 'メール管理');
  const resolveAdapterScopeLabel = (adapter: IntegrationAdapterListItemRecord) => {
    if (adapter.isInherited) {
      return ownerScopeLabel(true);
    }

    if (selectedIntegrationScope?.ownerType === 'subsidiary') {
      return text('Subsidiary', '子公司', '子会社');
    }

    if (selectedIntegrationScope?.ownerType === 'talent') {
      return text('Talent', '艺人', 'タレント');
    }

    return text('Tenant', '租户', 'テナント');
  };

  return (
    <div className="space-y-6">
      <GlassSurface className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              <Cable className="h-3.5 w-3.5" />
              {workspaceChipLabel}
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-slate-950">{text({
                en: 'Integration Management',
                zh_HANS: '集成管理',
                zh_HANT: '整合管理',
                ja: '統合管理',
                ko: '통합 관리',
                fr: 'Gestion des intégrations',
              })}</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                {isAcWorkspace
                  ? text({
                      en: `Manage ${workspaceDescriptor} integrations, API clients, and email settings.`,
                      zh_HANS: `管理${workspaceDescriptor}集成、API 客户端与邮件设置。`,
                      zh_HANT: `管理${workspaceDescriptor}整合、API 用戶端與郵件設定。`,
                      ja: `${workspaceDescriptor}の連携、API クライアント、メール設定を管理します。`,
                      ko: `${workspaceDescriptor} 통합, API 클라이언트, 메일 설정을 관리합니다.`,
                      fr: `Gérez les intégrations ${workspaceDescriptor}, les clients API et les paramètres d’e-mail.`,
                    })
                  : !selectedIntegrationScope
                    ? noScopeWorkspaceDescription
                    : isTenantRootScope
                      ? text({
                          en: 'Manage tenant integrations, webhooks, and email templates here.',
                          zh_HANS: '在这里管理租户级集成、Webhook 与邮件模板。',
                          zh_HANT: '在這裡管理租戶層級的整合、Webhook 與郵件範本。',
                          ja: 'ここでテナントの連携、Webhook、メールテンプレートを管理します。',
                          ko: '여기에서 테넌트 통합, 웹훅, 이메일 템플릿을 관리합니다.',
                          fr: 'Gérez ici les intégrations du tenant, les webhooks et les modèles d’e-mail.',
                        })
                      : text({
                          en: `Manage adapters for ${selectedIntegrationScope.label}.`,
                          zh_HANS: `管理 ${selectedIntegrationScope.label} 的适配器。`,
                          zh_HANT: `管理 ${selectedIntegrationScope.label} 的適配器。`,
                          ja: `${selectedIntegrationScope.label} のアダプターを管理します。`,
                          ko: `${selectedIntegrationScope.label}의 어댑터를 관리합니다.`,
                          fr: `Gérez les adaptateurs de ${selectedIntegrationScope.label}.`,
                        })}
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {selectedScopeDisplayName}
              </p>
            </div>
          </div>

          {isAcWorkspace || selectedIntegrationScope ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label={text({
                  en: 'Scope',
                  zh_HANS: '范围',
                  zh_HANT: '範圍',
                  ja: 'スコープ',
                  ko: '범위',
                  fr: 'Périmètre',
                })}
                value={selectedScopeDisplayName}
                hint={selectedScopeHint}
              />
              <SummaryCard
                label={text({
                  en: 'Adapters',
                  zh_HANS: '适配器',
                  zh_HANT: '適配器',
                  ja: 'アダプター',
                  ko: '어댑터',
                  fr: 'Adaptateurs',
                })}
                value={String(adapterCount)}
                hint={text({
                  en: 'Adapters visible in the current scope, including inherited records where supported.',
                  zh_HANS: '当前范围可见的适配器数量；在支持的范围中包含继承记录。',
                  zh_HANT: '目前範圍可見的適配器數量；在支援的情況下包含繼承記錄。',
                  ja: '現在のスコープで表示されるアダプター数です。対応する場合は継承レコードも含みます。',
                  ko: '현재 범위에서 볼 수 있는 어댑터 수입니다. 지원되는 경우 상속 레코드도 포함됩니다.',
                  fr: 'Nombre d’adaptateurs visibles dans le périmètre actuel, y compris les éléments hérités lorsque c’est pris en charge.',
                })}
              />
              {isAcWorkspace || isTenantRootScope ? (
                <SummaryCard
                  label={text('Webhooks', 'Webhook', 'Webhook')}
                  value={String(webhookCount)}
                  hint={text('Endpoint URLs, retry settings, and recent active-state changes.', '端点地址、重试策略与最近的启停状态。', 'エンドポイント URL、再試行設定、最近の有効状態を表示します。')}
                />
              ) : null}
              {isAcWorkspace ? (
                <SummaryCard
                  label={text('API Clients', 'API 客户端', 'API クライアント')}
                  value={String(consumerCount)}
                  hint={text('Platform clients and their current key status.', '平台客户端及其当前密钥状态。', 'プラットフォームクライアントと現在のキー状態です。')}
                />
              ) : (
                <SummaryCard
                  label={text('Email Templates', '邮件模板', 'メールテンプレート')}
                  value={String(emailTemplateCount)}
                  hint={text('Notification templates and email settings available at tenant root.', '租户根范围可用的通知模板与邮件设置。', 'テナントルートで利用できる通知テンプレートとメール設定です。')}
                />
              )}
            </div>
          ) : null}
        </div>
      </GlassSurface>

      {notice ? <NoticeBanner tone={notice.tone} message={notice.message} /> : null}

      <div className={isAcWorkspace ? 'space-y-6' : 'grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]'}>
        {!isAcWorkspace ? (
          <GlassSurface className="p-6">
            <FormSection
              title={text({
                en: 'Scope Tree',
                zh_HANS: '范围树',
                zh_HANT: '範圍樹',
                ja: 'スコープツリー',
                ko: '범위 트리',
                fr: 'Arborescence des périmètres',
              })}
              description={text({
                en: 'Select tenant root, a subsidiary, or a talent to switch the integration workspace.',
                zh_HANS: '选择租户根、子公司或艺人，以切换右侧的集成工作区。',
                zh_HANT: '選擇租戶根、子公司或藝人，以切換右側的整合工作區。',
                ja: 'テナントルート、子会社、またはタレントを選択して、右側の統合ワークスペースを切り替えます。',
                ko: '테넌트 루트, 자회사 또는 탤런트를 선택해 오른쪽 통합 작업 영역을 전환하세요.',
                fr: 'Sélectionnez la racine du tenant, une filiale ou un talent pour changer l’espace de travail d’intégration à droite.',
              })}
            >
              <div className="space-y-2">
                {renderScopeButton(
                  tenantRootSelection,
                  0,
                  text({
                    en: 'Tenant',
                    zh_HANS: '租户',
                    zh_HANT: '租戶',
                    ja: 'テナント',
                    ko: '테넌트',
                    fr: 'Tenant',
                  }),
                )}
                {organizationTreePanel.loading ? (
                  <p className="px-4 py-3 text-sm text-slate-500">
                    {text({
                      en: 'Loading available scopes…',
                      zh_HANS: '正在加载可用范围…',
                      zh_HANT: '正在載入可用範圍…',
                      ja: '利用可能なスコープを読み込んでいます…',
                      ko: '사용 가능한 범위를 불러오는 중…',
                      fr: 'Chargement des périmètres disponibles…',
                    })}
                  </p>
                ) : organizationTreePanel.unavailableReason ? (
                  <StateView
                    status="unavailable"
                    title={text({
                      en: 'Scope tree unavailable',
                      zh_HANS: '范围树不可用',
                      zh_HANT: '範圍樹不可用',
                      ja: 'スコープツリーを利用できません',
                      ko: '범위 트리를 사용할 수 없습니다.',
                      fr: 'L’arborescence des périmètres est indisponible.',
                    })}
                    description={organizationTreePanel.unavailableReason}
                  />
                ) : organizationTreePanel.error ? (
                  <StateView
                    status="error"
                    title={text({
                      en: 'Scope tree failed to load',
                      zh_HANS: '范围树加载失败',
                      zh_HANT: '範圍樹載入失敗',
                      ja: 'スコープツリーの読み込みに失敗しました',
                      ko: '범위 트리를 불러오지 못했습니다.',
                      fr: 'Échec du chargement de l’arborescence des périmètres.',
                    })}
                    description={organizationTreePanel.error}
                  />
                ) : (
                  <>
                    {organizationTreePanel.data
                      ? renderOrganizationNodes(organizationTreePanel.data.subsidiaries)
                      : null}
                    {organizationTreePanel.data?.directTalents.map((talent) => (
                      <div key={`tenant-talent:${talent.id}`} className="space-y-2">
                        {renderTalentScope(talent, [tenantRootHint], 1)}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </FormSection>
          </GlassSurface>
        ) : null}

        <div className="space-y-6">

      {isAcWorkspace || selectedIntegrationScope ? (
        <>
          <GlassSurface className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              {availableTabs.length > 1
                ? availableTabs.map((tab) => (
                    <TabButton
                      key={tab}
                      label={tabLabel(tab)}
                      isActive={activeTab === tab}
                      onClick={() => setTab(tab)}
                    />
                  ))
                : null}
              <div className="ml-auto rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-600">
                {currentTabLabel}
              </div>
            </div>
          </GlassSurface>

          <div className={tabTransitionClassName}>
          {displayedTab === 'adapters' ? (
        <>
          <GlassSurface className="p-6">
            <FormSection
              title={adapterSectionTitle}
              description={adapterSectionDescription}
              actions={
                <>
                  <SecondaryButton onClick={() => void refreshAdapters()}>
                    <RefreshCcw className="h-4 w-4" />
                    {text({
                      en: 'Refresh',
                      zh_HANS: '刷新',
                      zh_HANT: '重新整理',
                      ja: '更新',
                      ko: '새로고침',
                      fr: 'Actualiser',
                    })}
                  </SecondaryButton>
                  <SecondaryButton
                    tone="primary"
                    onClick={() => {
                      setAdapterCreateMode(true);
                      setSelectedAdapterId(null);
                      setAdapterDraft(buildAdapterDraft());
                      setAdapterConfigRows(buildAdapterConfigRows());
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    {text({
                      en: 'New adapter',
                      zh_HANS: '新建适配器',
                      zh_HANT: '新增適配器',
                      ja: '新しいアダプター',
                      ko: '새 어댑터',
                      fr: 'Nouvel adaptateur',
                    })}
                  </SecondaryButton>
                </>
              }
            >
              {adaptersPanel.unavailableReason ? (
                <StateView
                  status="unavailable"
                  title={text('Adapters unavailable for this scope', '当前范围无法使用适配器', 'この範囲ではアダプターを利用できません')}
                  description={adaptersPanel.unavailableReason}
                />
              ) : adaptersPanel.error ? (
                <StateView status="error" title={text('Adapters unavailable', '适配器不可用', 'アダプターを利用できません')} description={adaptersPanel.error} />
              ) : (
                <>
                  <TableShell
                  columns={[
                    text('Platform', '平台', 'プラットフォーム'),
                    text('Code', '代码', 'コード'),
                    text('Type', '类型', '種別'),
                    text('Scope', '范围', 'スコープ'),
                    text('Configs', '配置项', '設定数'),
                    text('Status', '状态', '状態'),
                    text('Actions', '操作', '操作'),
                  ]}
                  dataLength={paginatedAdapters.items.length}
                  isLoading={adaptersPanel.loading}
                  isEmpty={adaptersPanel.data.length === 0}
                  emptyTitle={text('No adapters configured', '尚未配置适配器', '設定済みアダプターはありません')}
                  emptyDescription={text('Create the first adapter for this scope.', '为当前范围创建第一个适配器。', 'この範囲で最初のアダプターを作成してください。')}
                >
                  {paginatedAdapters.items.map((adapter) => (
                    <tr key={adapter.id} className={selectedAdapterId === adapter.id ? 'bg-indigo-50/40' : undefined}>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-950">{adapter.platform.displayName}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{adapter.platform.code}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">{adapter.code}</td>
                      <td className="px-6 py-4">
                        <StatusBadge tone="info" label={adapterTypeLabel(adapter.adapterType)} />
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge tone={adapter.isInherited ? 'warning' : 'success'} label={resolveAdapterScopeLabel(adapter)} />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{adapter.configCount}</td>
                      <td className="px-6 py-4">
                        <StatusBadge tone={adapter.isActive ? 'success' : 'danger'} label={statusLabel(adapter.isActive)} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <SecondaryButton
                            onClick={() => {
                              setAdapterCreateMode(false);
                              setSelectedAdapterId(adapter.id);
                            }}
                          >
                            {text('Open', '打开', '開く')}
                          </SecondaryButton>
                          {adapter.isActive ? (
                            <SecondaryButton
                              tone="danger"
                              onClick={() =>
                                setConfirmState({
                                  title: text(`Deactivate ${adapter.code}?`, `停用 ${adapter.code}？`, `${adapter.code} を無効化しますか？`),
                                  description: text('The adapter record stays available until you activate it again.', '适配器记录会保留，直到你再次启用它。', 'アダプターレコードは再度有効化するまで保持されます。'),
                                  confirmText: text('Deactivate adapter', '停用适配器', 'アダプターを無効化'),
                                  pendingText: text('Deactivating adapter...', '正在停用适配器...', 'アダプターを無効化しています...'),
                                  intent: 'danger',
                                  errorFallback: text('Failed to deactivate adapter.', '停用适配器失败。', 'アダプターの無効化に失敗しました。'),
                                  onConfirm: async () => {
                                    if (
                                      adapter.isInherited
                                      && selectedIntegrationScope
                                      && isScopedAdapterScope(selectedIntegrationScope)
                                    ) {
                                      await disableInheritedScopedAdapter(request, selectedIntegrationScope, adapter.id);
                                    } else {
                                      await deactivateTenantAdapter(request, adapter.id);
                                    }
                                    await refreshAdapters(adapter.id);
                                    if (selectedAdapterId === adapter.id) {
                                      setSelectedAdapterId(adapter.id);
                                    }
                                    return text(
                                      `${adapter.code} adapter deactivated.`,
                                      `已停用适配器 ${adapter.code}。`,
                                      `アダプター ${adapter.code} を無効化しました。`,
                                    );
                                  },
                                })
                              }
                            >
                              <Unplug className="h-4 w-4" />
                              {text('Deactivate', '停用', '無効化')}
                            </SecondaryButton>
                          ) : (
                            <SecondaryButton
                              tone="primary"
                              onClick={() =>
                                setConfirmState({
                                  title: text(`Reactivate ${adapter.code}?`, `重新启用 ${adapter.code}？`, `${adapter.code} を再有効化しますか？`),
                                  description: text('The adapter becomes available for use again.', '适配器将重新可用。', 'アダプターを再び利用できるようにします。'),
                                  confirmText: text('Reactivate adapter', '重新启用适配器', 'アダプターを再有効化'),
                                  pendingText: text('Reactivating adapter...', '正在重新启用适配器...', 'アダプターを再有効化しています...'),
                                  intent: 'primary',
                                  errorFallback: text('Failed to reactivate adapter.', '重新启用适配器失败。', 'アダプターの再有効化に失敗しました。'),
                                  onConfirm: async () => {
                                    if (
                                      adapter.isInherited
                                      && selectedIntegrationScope
                                      && isScopedAdapterScope(selectedIntegrationScope)
                                    ) {
                                      await enableInheritedScopedAdapter(request, selectedIntegrationScope, adapter.id);
                                    } else {
                                      await reactivateTenantAdapter(request, adapter.id);
                                    }
                                    await refreshAdapters(adapter.id);
                                    return text(
                                      `${adapter.code} adapter reactivated.`,
                                      `已重新启用适配器 ${adapter.code}。`,
                                      `アダプター ${adapter.code} を再有効化しました。`,
                                    );
                                  },
                                })
                              }
                            >
                              <RotateCcw className="h-4 w-4" />
                              {text('Reactivate', '重新启用', '再有効化')}
                            </SecondaryButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  </TableShell>
                  {adaptersPanel.data.length > 0 ? (
                    <PaginationFooter
                      locale={selectedLocale}
                      pagination={paginatedAdapters.pagination}
                      itemCount={paginatedAdapters.items.length}
                      pageSize={adapterPageSize}
                      onPageSizeChange={(pageSize) => {
                        setAdapterPageSize(pageSize);
                        setAdapterPage(1);
                      }}
                      onPrevious={() => setAdapterPage((current) => Math.max(current - 1, 1))}
                      onNext={() => setAdapterPage((current) => current + 1)}
                      isLoading={adaptersPanel.loading}
                    />
                  ) : null}
                  </>
                )}
              </FormSection>
            </GlassSurface>

          <GlassSurface className="p-6">
            <FormSection
              title={adapterCreateMode ? text('New Adapter', '新建适配器', '新しいアダプター') : text('Adapter Profile', '适配器资料', 'アダプタープロファイル')}
              description={
                adapterCreateMode
                  ? text('Create a tenant-owned adapter against the shared platform registry.', '基于共享平台目录创建一个租户持有的适配器。', '共有プラットフォーム一覧を基にテナント所有のアダプターを作成します。')
                  : text('Adapter metadata stays editable while secret config values remain masked until explicitly revealed.', '适配器元数据可随时编辑，密钥配置在显式显示前会保持遮罩。', 'アダプターのメタデータは編集でき、シークレット設定値は明示表示するまでマスクされたままです。')
              }
              actions={
                <>
                  {!adapterCreateMode ? (
                    <SecondaryButton
                      onClick={() => {
                        setAdapterCreateMode(true);
                        setSelectedAdapterId(null);
                        setAdapterDraft(buildAdapterDraft());
                        setAdapterConfigRows(buildAdapterConfigRows());
                      }}
                    >
                      {text('Start new', '新建', '新規作成')}
                    </SecondaryButton>
                  ) : (
                    <SecondaryButton
                      onClick={() => {
                        setAdapterCreateMode(false);
                        setSelectedAdapterId(adaptersPanel.data[0]?.id || null);
                      }}
                    >
                      {text('Cancel', '取消', 'キャンセル')}
                    </SecondaryButton>
                  )}
                  <AsyncSubmitButton
                    onClick={() => void handleAdapterSave()}
                    isPending={adapterSubmitting}
                    pendingText={
                      adapterCreateMode
                        ? text('Creating adapter...', '正在创建适配器...', 'アダプターを作成しています...')
                        : text('Saving adapter...', '正在保存适配器...', 'アダプターを保存しています...')
                    }
                  >
                    {adapterCreateMode ? text('Create adapter', '创建适配器', 'アダプターを作成') : text('Save adapter', '保存适配器', 'アダプターを保存')}
                  </AsyncSubmitButton>
                </>
              }
            >
              {adapterDetailPanel.unavailableReason ? (
                <StateView
                  status="unavailable"
                  title={text('Adapter detail unavailable for this scope', '当前范围无法查看适配器详情', 'この範囲ではアダプター詳細を表示できません')}
                  description={adapterDetailPanel.unavailableReason}
                />
              ) : adapterDetailPanel.error ? (
                <StateView status="error" title={text('Adapter detail unavailable', '适配器详情不可用', 'アダプター詳細を表示できません')} description={adapterDetailPanel.error} />
              ) : adapterDetailPanel.loading ? (
                <p className="text-sm text-slate-500">{text('Loading adapter detail…', '正在加载适配器详情…', 'アダプター詳細を読み込んでいます…')}</p>
              ) : adapterCreateMode || adapterDetailPanel.data ? (
                <>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <SelectField
                      label={text('Platform', '平台', 'プラットフォーム')}
                      value={adapterDraft.platformId}
                      onChange={(value) => setAdapterDraft((current) => ({ ...current, platformId: value }))}
                      disabled={!adapterCreateMode}
                      options={[
                        { value: '', label: text('Select platform', '选择平台', 'プラットフォームを選択') },
                        ...platformsPanel.data.map((platform) => ({
                          value: platform.id,
                          label: `${pickLocalizedName(platform.nameEn, platform.nameZh, platform.nameJa, platform.displayName || platform.name || platform.code)} (${platform.code})`,
                        })),
                      ]}
                    />
                    <TextField
                      label={text('Adapter code', '适配器代码', 'アダプターコード')}
                      value={adapterDraft.code}
                      onChange={(value) =>
                        setAdapterDraft((current) => ({
                          ...current,
                          code: value.toUpperCase(),
                        }))
                      }
                      disabled={!adapterCreateMode}
                      placeholder={text('BILIBILI_EXPORT', 'BILIBILI_EXPORT', 'BILIBILI_EXPORT')}
                    />
                    <TextField
                      label={text('Name (EN)', '名称（英文）', '名称（英語）')}
                      value={adapterDraft.nameEn}
                      onChange={(value) => setAdapterDraft((current) => ({ ...current, nameEn: value }))}
                    />
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">
                        {text('Translations', '翻译', '翻訳')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAdapterTranslationDrawerOpen(true)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                      >
                        <Languages className="h-4 w-4" />
                        {configuredAdapterTranslationCount > 0
                          ? text(
                              `Translation management (${configuredAdapterTranslationCount})`,
                              `翻译管理（${configuredAdapterTranslationCount}）`,
                              `翻訳管理（${configuredAdapterTranslationCount}）`,
                            )
                          : text('Translation management', '翻译管理', '翻訳管理')}
                      </button>
                      {consumerTranslationOptionsState.error ? (
                        <p className="text-xs text-amber-700">{consumerTranslationOptionsState.error}</p>
                      ) : null}
                    </div>
                    <SelectField
                      label={text('Adapter type', '适配器类型', 'アダプター種別')}
                      value={adapterDraft.adapterType}
                      onChange={(value) =>
                        setAdapterDraft((current) => ({
                          ...current,
                          adapterType: value as AdapterDraft['adapterType'],
                        }))
                      }
                      disabled={!adapterCreateMode}
                      options={[
                        { value: 'api_key', label: adapterTypeLabel('api_key') },
                        { value: 'oauth', label: adapterTypeLabel('oauth') },
                        { value: 'webhook', label: adapterTypeLabel('webhook') },
                      ]}
                    />
                  </div>
                  <CheckboxField
                    label={text('Allow inherited fallback behavior', '允许继承回退行为', '継承フォールバックを許可')}
                    checked={adapterDraft.inherit}
                    onChange={(checked) => setAdapterDraft((current) => ({ ...current, inherit: checked }))}
                  />
                  {!adapterCreateMode && adapterDetailPanel.data ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <SummaryCard label={text('Created', '创建时间', '作成日時')} value={formatDateTime(adapterDetailPanel.data.createdAt, text('Unknown', '未知', '不明'))} hint={text('Original creation timestamp.', '首次创建时间。', '初回作成日時です。')} />
                      <SummaryCard label={text('Updated', '更新时间', '更新日時')} value={formatDateTime(adapterDetailPanel.data.updatedAt, text('Unknown', '未知', '不明'))} hint={text('Most recent config or metadata write.', '最近一次配置或元数据写入时间。', '直近の設定またはメタデータ更新日時です。')} />
                      <SummaryCard label={text('Version', '版本', 'バージョン')} value={String(adapterDetailPanel.data.version)} hint={text('Current configuration version.', '当前配置版本。', '現在の設定バージョンです。')} />
                      <SummaryCard label={text('State', '状态', '状態')} value={statusLabel(adapterDetailPanel.data.isActive)} hint={text('Current active state.', '当前启停状态。', '現在の有効状態です。')} />
                    </div>
                  ) : null}
                </>
              ) : (
                <StateView
                  status="empty"
                  title={text('Select an adapter', '选择一个适配器', 'アダプターを選択')}
                  description={text('Pick an adapter from the table or create a new tenant-owned adapter to begin.', '从表格中选择一个适配器，或先创建新的租户适配器。', '表からアダプターを選択するか、新しいテナントアダプターを作成してください。')}
                />
              )}
            </FormSection>

            <FormSection
              title={text('Config Values', '配置值', '設定値')}
              description={text(
                'Add or update config rows here. Reveal masked secret values before replacing them.',
                '可在这里新增或更新配置行。若要替换已遮罩的密钥值，请先显式显示其内容。',
                'ここで設定行を追加・更新できます。マスク済みシークレットを置き換える前に内容を表示してください。',
              )}
              actions={
                adapterCreateMode || adapterDetailPanel.data ? (
                  <AsyncSubmitButton
                    onClick={() => void handleAdapterConfigSave()}
                    isPending={adapterConfigSubmitting}
                    pendingText={text('Saving configs...', '正在保存配置...', '設定を保存しています...')}
                  >
                    {text('Save config changes', '保存配置更改', '設定変更を保存')}
                  </AsyncSubmitButton>
                ) : undefined
              }
            >
              {adapterCreateMode || adapterDetailPanel.data ? (
                <div className="space-y-4">
                  {adapterConfigRows.map((row, index) => (
                    <div key={row.rowKey} className="grid gap-4 rounded-2xl border border-slate-200 bg-white/70 p-4 lg:grid-cols-[1fr_1fr_auto]">
                      <TextField
                        label={text(`Config key ${index + 1}`, `配置键 ${index + 1}`, `設定キー ${index + 1}`)}
                        value={row.configKey}
                        onChange={(value) =>
                          setAdapterConfigRows((current) =>
                            current.map((item) =>
                              item.rowKey === row.rowKey
                                ? {
                                    ...item,
                                    configKey: value,
                                    isSecret: /secret|token|password|key/i.test(value),
                                  }
                                : item,
                            ),
                          )
                        }
                        disabled={!row.isNew}
                        placeholder={text('client_secret', 'client_secret', 'client_secret')}
                      />
                      <TextField
                        label={text(`Value ${index + 1}`, `值 ${index + 1}`, `値 ${index + 1}`)}
                        value={row.configValue}
                        onChange={(value) =>
                          setAdapterConfigRows((current) =>
                            current.map((item) =>
                              item.rowKey === row.rowKey
                                ? {
                                    ...item,
                                    configValue: value,
                                    isMasked: false,
                                  }
                                : item,
                            ),
                          )
                        }
                        placeholder={row.isSecret ? text('Secret value', '密钥值', 'シークレット値') : text('Config value', '配置值', '設定値')}
                      />
                      <div className="flex flex-wrap items-end gap-2">
                        {row.isSecret ? <StatusBadge tone="warning" label={text('Secret', '密钥', 'シークレット')} /> : <StatusBadge tone="neutral" label={text('Plain', '明文', '平文')} />}
                        {!adapterCreateMode && row.isSecret && row.isMasked ? (
                          <SecondaryButton onClick={() => void handleRevealAdapterConfig(row.configKey)}>
                            {text('Reveal', '显示', '表示')}
                          </SecondaryButton>
                        ) : null}
                        {row.isNew ? (
                          <SecondaryButton
                            tone="danger"
                            onClick={() =>
                              setAdapterConfigRows((current) => current.filter((item) => item.rowKey !== row.rowKey))
                            }
                          >
                            {text('Remove', '移除', '削除')}
                          </SecondaryButton>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  <SecondaryButton
                    onClick={() =>
                      setAdapterConfigRows((current) => [
                        ...current,
                        {
                          rowKey: `new-config-${current.length + 1}-${Date.now()}`,
                          configKey: '',
                          configValue: '',
                          isSecret: false,
                          isMasked: false,
                          isNew: true,
                        },
                      ])
                    }
                  >
                    <Plus className="h-4 w-4" />
                    {text('Add config row', '新增配置行', '設定行を追加')}
                  </SecondaryButton>
                </div>
              ) : (
                <p className="text-sm text-slate-500">{text('Select or create an adapter to manage config values.', '请选择或创建一个适配器来管理配置值。', '設定値を管理するにはアダプターを選択または作成してください。')}</p>
              )}
            </FormSection>
          </GlassSurface>
        </>
      ) : null}

      {displayedTab === 'webhooks' ? (
        <>
          <GlassSurface className="p-6">
            <FormSection
              title={text('Webhook Endpoints', 'Webhook 端点', 'Webhook エンドポイント')}
              description={text('Create webhook endpoints, manage retry settings, and keep deactivation separate from delete.', '创建 Webhook 端点、管理重试策略，并将停用与永久删除区分开。', 'Webhook エンドポイントの作成、再試行設定の管理、無効化と削除の分離を行います。')}
              actions={
                <>
                  <SecondaryButton onClick={() => void refreshWebhooks()}>
                    <RefreshCcw className="h-4 w-4" />
                    {text('Refresh', '刷新', '更新')}
                  </SecondaryButton>
                  <SecondaryButton
                    tone="primary"
                    onClick={() => {
                      setWebhookCreateMode(true);
                      setSelectedWebhookId(null);
                      setWebhookDraft(buildWebhookDraft());
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    {text('New webhook', '新建 Webhook', '新しい Webhook')}
                  </SecondaryButton>
                </>
              }
            >
              {webhooksPanel.unavailableReason ? (
                <StateView
                  status="unavailable"
                  title={text('Webhooks unavailable for this scope', '当前范围无法使用 Webhook', 'この範囲では Webhook を利用できません')}
                  description={webhooksPanel.unavailableReason}
                />
              ) : webhooksPanel.error ? (
                <StateView status="error" title={text('Webhook list unavailable', 'Webhook 列表不可用', 'Webhook 一覧を表示できません')} description={webhooksPanel.error} />
              ) : (
                <>
                  <TableShell
                  columns={[
                    text('Code', '代码', 'コード'),
                    text('Endpoint', '端点', 'エンドポイント'),
                    text('Events', '事件数', 'イベント数'),
                    text('Failures', '失败次数', '失敗回数'),
                    text('Status', '状态', '状態'),
                    text('Actions', '操作', '操作'),
                  ]}
                  dataLength={paginatedWebhooks.items.length}
                  isLoading={webhooksPanel.loading}
                  isEmpty={webhooksPanel.data.length === 0}
                  emptyTitle={text('No webhooks configured', '尚未配置 Webhook', '設定済み Webhook はありません')}
                  emptyDescription={text('Create the first tenant webhook for customer, membership, marshmallow, report, or import events.', '创建第一个租户 Webhook，用于发送客户、会员、棉花糖、报表或导入事件。', '顧客、会員、マシュマロ、レポート、インポートイベント向けの最初の Webhook を作成してください。')}
                >
                  {paginatedWebhooks.items.map((webhook) => (
                    <tr key={webhook.id} className={selectedWebhookId === webhook.id ? 'bg-indigo-50/40' : undefined}>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{webhook.code}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{webhook.url}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{webhook.events.length}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{webhook.consecutiveFailures}</td>
                      <td className="px-6 py-4">
                        <StatusBadge tone={webhook.isActive ? 'success' : 'danger'} label={statusLabel(webhook.isActive)} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <SecondaryButton
                            onClick={() => {
                              setWebhookCreateMode(false);
                              setSelectedWebhookId(webhook.id);
                            }}
                          >
                            {text('Open', '打开', '開く')}
                          </SecondaryButton>
                          {webhook.isActive ? (
                            <SecondaryButton
                              tone="danger"
                              onClick={() =>
                                setConfirmState({
                                  title: text(`Deactivate ${webhook.code}?`, `停用 ${webhook.code}？`, `${webhook.code} を無効化しますか？`),
                                  description: text('The webhook stays stored, but sending pauses until you reactivate it.', 'Webhook 会被保留，但发送会暂停，直到你重新启用它。', 'Webhook は保持されますが、再有効化するまで送信が停止されます。'),
                                  confirmText: text('Deactivate webhook', '停用 Webhook', 'Webhook を無効化'),
                                  pendingText: text('Deactivating webhook...', '正在停用 Webhook...', 'Webhook を無効化しています...'),
                                  intent: 'danger',
                                  errorFallback: text('Failed to deactivate webhook.', '停用 Webhook 失败。', 'Webhook の無効化に失敗しました。'),
                                  onConfirm: async () => {
                                    await deactivateWebhook(request, webhook.id);
                                    await refreshWebhooks(webhook.id);
                                    return text(`${webhook.code} webhook deactivated.`, `已停用 Webhook ${webhook.code}。`, `Webhook ${webhook.code} を無効化しました。`);
                                  },
                                })
                              }
                            >
                              {text('Deactivate', '停用', '無効化')}
                            </SecondaryButton>
                          ) : (
                            <SecondaryButton
                              tone="primary"
                              onClick={() =>
                                setConfirmState({
                                  title: text(`Reactivate ${webhook.code}?`, `重新启用 ${webhook.code}？`, `${webhook.code} を再有効化しますか？`),
                                  description: text('This re-enables sending for the webhook endpoint.', '这会重新启用该 Webhook 端点的发送。', 'この Webhook エンドポイントの送信を再び有効にします。'),
                                  confirmText: text('Reactivate webhook', '重新启用 Webhook', 'Webhook を再有効化'),
                                  pendingText: text('Reactivating webhook...', '正在重新启用 Webhook...', 'Webhook を再有効化しています...'),
                                  intent: 'primary',
                                  errorFallback: text('Failed to reactivate webhook.', '重新启用 Webhook 失败。', 'Webhook の再有効化に失敗しました。'),
                                  onConfirm: async () => {
                                    await reactivateWebhook(request, webhook.id);
                                    await refreshWebhooks(webhook.id);
                                    return text(`${webhook.code} webhook reactivated.`, `已重新启用 Webhook ${webhook.code}。`, `Webhook ${webhook.code} を再有効化しました。`);
                                  },
                                })
                              }
                            >
                              {text('Reactivate', '重新启用', '再有効化')}
                            </SecondaryButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  </TableShell>
                  {webhooksPanel.data.length > 0 ? (
                    <PaginationFooter
                      locale={selectedLocale}
                      pagination={paginatedWebhooks.pagination}
                      itemCount={paginatedWebhooks.items.length}
                      pageSize={webhookPageSize}
                      onPageSizeChange={(pageSize) => {
                        setWebhookPageSize(pageSize);
                        setWebhookPage(1);
                      }}
                      onPrevious={() => setWebhookPage((current) => Math.max(current - 1, 1))}
                      onNext={() => setWebhookPage((current) => current + 1)}
                      isLoading={webhooksPanel.loading}
                    />
                  ) : null}
                </>
              )}
            </FormSection>
          </GlassSurface>

          <GlassSurface className="p-6">
            <FormSection
              title={webhookCreateMode ? text('New Webhook', '新建 Webhook', '新しい Webhook') : text('Webhook Detail', 'Webhook 详情', 'Webhook 詳細')}
              description={text('The stored secret remains masked in detail reads. Leave the secret field blank during update to preserve the current secret.', '详情读取时，已存储的密钥会保持遮罩。更新时将密钥字段留空即可保留当前值。', '保存済みシークレットは詳細取得時にマスクされたままです。更新時にシークレット欄を空欄にすると現在の値を保持します。')}
              actions={
                <>
                  {!webhookCreateMode ? (
                    <SecondaryButton
                      onClick={() => {
                        setWebhookCreateMode(true);
                        setSelectedWebhookId(null);
                        setWebhookDraft(buildWebhookDraft());
                      }}
                    >
                      {text('Start new', '新建', '新規作成')}
                    </SecondaryButton>
                  ) : (
                    <SecondaryButton
                      onClick={() => {
                        setWebhookCreateMode(false);
                        setSelectedWebhookId(webhooksPanel.data[0]?.id || null);
                      }}
                    >
                      {text('Cancel', '取消', 'キャンセル')}
                    </SecondaryButton>
                  )}
                  {!webhookCreateMode && selectedWebhookId ? (
                    <SecondaryButton
                      tone="danger"
                      onClick={() =>
                        setConfirmState({
                          title: text(
                            `Delete ${webhookDetailPanel.data?.code || 'webhook'}?`,
                            `删除 ${webhookDetailPanel.data?.code || 'Webhook'}？`,
                            `${webhookDetailPanel.data?.code || 'Webhook'} を削除しますか？`,
                          ),
                          description: text('Delete permanently removes the webhook record. Prefer deactivation when you only need to stop sending.', '删除会永久移除该 Webhook 记录。如果只是想停止发送，请优先停用。', '削除すると Webhook レコードは完全に消去されます。送信停止だけが目的なら無効化を優先してください。'),
                          confirmText: text('Delete webhook', '删除 Webhook', 'Webhook を削除'),
                          pendingText: text('Deleting webhook...', '正在删除 Webhook...', 'Webhook を削除しています...'),
                          intent: 'danger',
                          errorFallback: text('Failed to delete webhook.', '删除 Webhook 失败。', 'Webhook の削除に失敗しました。'),
                          onConfirm: async () => {
                            const targetCode = webhookDetailPanel.data?.code || text('Webhook', 'Webhook', 'Webhook');
                            await deleteWebhook(request, selectedWebhookId);
                            setSelectedWebhookId(null);
                            await refreshWebhooks();
                            return text(`${targetCode} deleted permanently.`, `已永久删除 ${targetCode}。`, `${targetCode} を完全に削除しました。`);
                          },
                        })
                      }
                    >
                      {text('Delete', '删除', '削除')}
                    </SecondaryButton>
                  ) : null}
                  <AsyncSubmitButton
                    onClick={() => void handleWebhookSave()}
                    isPending={webhookSubmitting}
                    pendingText={
                      webhookCreateMode
                        ? text('Creating webhook...', '正在创建 Webhook...', 'Webhook を作成しています...')
                        : text('Saving webhook...', '正在保存 Webhook...', 'Webhook を保存しています...')
                    }
                  >
                    {webhookCreateMode ? text('Create webhook', '创建 Webhook', 'Webhook を作成') : text('Save webhook', '保存 Webhook', 'Webhook を保存')}
                  </AsyncSubmitButton>
                </>
              }
            >
              {webhookDetailPanel.unavailableReason ? (
                <StateView
                  status="unavailable"
                  title={text('Webhook detail unavailable for this scope', '当前范围无法查看 Webhook 详情', 'この範囲では Webhook 詳細を表示できません')}
                  description={webhookDetailPanel.unavailableReason}
                />
              ) : webhookDetailPanel.error ? (
                <StateView status="error" title={text('Webhook detail unavailable', 'Webhook 详情不可用', 'Webhook 詳細を表示できません')} description={webhookDetailPanel.error} />
              ) : webhookDetailPanel.loading ? (
                <p className="text-sm text-slate-500">{text('Loading webhook detail…', '正在加载 Webhook 详情…', 'Webhook 詳細を読み込んでいます…')}</p>
              ) : webhookCreateMode || webhookDetailPanel.data ? (
                <>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <TextField
                      label={text('Webhook code', 'Webhook 代码', 'Webhook コード')}
                      value={webhookDraft.code}
                      onChange={(value) => setWebhookDraft((current) => ({ ...current, code: value.toUpperCase() }))}
                      disabled={!webhookCreateMode}
                      placeholder={text('CUSTOMER_DELTA', 'CUSTOMER_DELTA', 'CUSTOMER_DELTA')}
                    />
                    <TextField
                      label={text('Endpoint URL', '端点 URL', 'エンドポイント URL')}
                      value={webhookDraft.url}
                      onChange={(value) => setWebhookDraft((current) => ({ ...current, url: value }))}
                      placeholder={text('https://example.com/webhooks/customer', 'https://example.com/webhooks/customer', 'https://example.com/webhooks/customer')}
                    />
                    <TextField
                      label={text('Name (EN)', '名称（英文）', '名称（英語）')}
                      value={webhookDraft.nameEn}
                      onChange={(value) => setWebhookDraft((current) => ({ ...current, nameEn: value }))}
                    />
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">
                        {text('Translations', '翻译', '翻訳')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setWebhookTranslationDrawerOpen(true)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                      >
                        <Languages className="h-4 w-4" />
                        {configuredWebhookTranslationCount > 0
                          ? text(
                              `Translation management (${configuredWebhookTranslationCount})`,
                              `翻译管理（${configuredWebhookTranslationCount}）`,
                              `翻訳管理（${configuredWebhookTranslationCount}）`,
                            )
                          : text('Translation management', '翻译管理', '翻訳管理')}
                      </button>
                      {consumerTranslationOptionsState.error ? (
                        <p className="text-xs text-amber-700">{consumerTranslationOptionsState.error}</p>
                      ) : null}
                    </div>
                    <TextField
                      label={text('Secret override', '覆盖密钥', 'シークレット上書き')}
                      value={webhookDraft.secret}
                      onChange={(value) => setWebhookDraft((current) => ({ ...current, secret: value }))}
                      placeholder={
                        webhookDetailPanel.data?.secret
                          ? text('Leave blank to preserve current secret', '留空以保留当前密钥', '空欄で現在のシークレットを保持')
                          : text('Optional shared secret', '可选共享密钥', '任意の共有シークレット')
                      }
                    />
                    <TextField
                      label={text('Max retries', '最大重试次数', '最大再試行回数')}
                      value={webhookDraft.maxRetries}
                      onChange={(value) => setWebhookDraft((current) => ({ ...current, maxRetries: value }))}
                      type="number"
                    />
                    <TextField
                      label={text('Backoff (ms)', '退避间隔（毫秒）', 'バックオフ（ms）')}
                      value={webhookDraft.backoffMs}
                      onChange={(value) => setWebhookDraft((current) => ({ ...current, backoffMs: value }))}
                      type="number"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                    <p className="text-sm font-semibold text-slate-900">{text('Subscribed events', '订阅事件', '購読イベント')}</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {webhookEventsPanel.data.map((eventDefinition) => (
                        <label key={eventDefinition.event} className="rounded-2xl border border-slate-200 bg-white/90 p-3 text-sm text-slate-700">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={webhookDraft.selectedEvents.includes(eventDefinition.event)}
                              onChange={(event) =>
                                setWebhookDraft((current) => ({
                                  ...current,
                                  selectedEvents: event.target.checked
                                    ? [...current.selectedEvents, eventDefinition.event]
                                    : current.selectedEvents.filter((item) => item !== eventDefinition.event),
                                }))
                              }
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="space-y-1">
                              <p className="font-semibold text-slate-900">{eventDefinition.name}</p>
                              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{eventDefinition.event}</p>
                              <p className="text-xs leading-5 text-slate-500">{eventDefinition.description}</p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <TextAreaField
                    label={text('Request headers', '请求头', 'リクエストヘッダー')}
                    value={webhookDraft.headersText}
                    onChange={(value) => setWebhookDraft((current) => ({ ...current, headersText: value }))}
                    rows={5}
                    placeholder={text('X-Tenant-Code: TENANT_TEST\nX-Signature-Version: 1', 'X-Tenant-Code: TENANT_TEST\nX-Signature-Version: 1', 'X-Tenant-Code: TENANT_TEST\nX-Signature-Version: 1')}
                  />

                  {!webhookCreateMode && webhookDetailPanel.data ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <SummaryCard label={text('Created', '创建时间', '作成日時')} value={formatDateTime(webhookDetailPanel.data.createdAt, text('Unknown', '未知', '不明'))} hint={text('Original creation timestamp.', '首次创建时间。', '初回作成日時です。')} />
                      <SummaryCard label={text('Updated', '更新时间', '更新日時')} value={formatDateTime(webhookDetailPanel.data.updatedAt, text('Unknown', '未知', '不明'))} hint={text('Last write to secret, headers, or metadata.', '最近一次对密钥、请求头或元数据的写入时间。', 'シークレット・ヘッダー・メタデータの最終更新日時です。')} />
                      <SummaryCard label={text('Last Trigger', '最近触发', '最終実行')} value={formatDateTime(webhookDetailPanel.data.lastTriggeredAt)} hint={text('Most recent send attempt.', '最近一次发送尝试。', '直近の送信試行です。')} />
                      <SummaryCard label={text('Version', '版本', 'バージョン')} value={String(webhookDetailPanel.data.version)} hint={text('Current configuration version.', '当前配置版本。', '現在の設定バージョンです。')} />
                    </div>
                  ) : null}
                </>
              ) : (
                <StateView
                  status="empty"
                  title={text('Select a webhook', '选择一个 Webhook', 'Webhook を選択')}
                  description={text('Choose an existing webhook from the table or start a new endpoint definition.', '从表格中选择现有 Webhook，或开始创建新的端点定义。', '表から既存の Webhook を選択するか、新しいエンドポイント定義を開始してください。')}
                />
              )}
            </FormSection>
          </GlassSurface>
        </>
      ) : null}

      {displayedTab === 'api-keys' ? (
        <>
          <GlassSurface className="p-6">
            <FormSection
              title={text('API Clients', 'API 客户端', 'API クライアント')}
              description={text('Manage platform API clients and their active keys from one workspace.', '在同一工作区内管理平台 API 客户端及其有效密钥。', 'このワークスペースでプラットフォーム API クライアントと有効キーを管理します。')}
              actions={
                <>
                  <SecondaryButton onClick={() => void refreshConsumers()}>
                    <RefreshCcw className="h-4 w-4" />
                    {text('Refresh', '刷新', '更新')}
                  </SecondaryButton>
                  <SecondaryButton
                    tone="primary"
                    onClick={() => {
                      setConsumerCreateMode(true);
                      setSelectedConsumerId(null);
                      setConsumerDraft(buildConsumerDraft());
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    {text('New API client', '新建 API 客户端', '新しい API クライアント')}
                  </SecondaryButton>
                </>
              }
            >
              {consumersPanel.unavailableReason ? (
                <StateView
                  status="unavailable"
                  title={text('API clients unavailable for this scope', '当前范围无法使用 API 客户端', 'この範囲では API クライアントを利用できません')}
                  description={consumersPanel.unavailableReason}
                />
              ) : consumersPanel.error ? (
                <StateView status="error" title={text('API clients unavailable', 'API 客户端不可用', 'API クライアントを利用できません')} description={consumersPanel.error} />
              ) : (
                <>
                  <TableShell
                  columns={[
                    text('Code', '代码', 'コード'),
                    text('Category', '分类', 'カテゴリ'),
                    text('Contact', '联系人', '連絡先'),
                    text('API Key', 'API 密钥', 'API キー'),
                    text('Status', '状态', '状態'),
                    text('Actions', '操作', '操作'),
                  ]}
                  dataLength={paginatedConsumers.items.length}
                  isLoading={consumersPanel.loading}
                  isEmpty={consumersPanel.data.length === 0}
                  emptyTitle={text('No API clients configured', '尚未配置 API 客户端', '設定済み API クライアントはありません')}
                  emptyDescription={text('Create the first inbound consumer before generating or rotating managed API keys.', '在生成或轮换受管 API 密钥前，请先创建第一个入站消费者。', '管理対象 API キーを生成・ローテーションする前に、最初の受信クライアントを作成してください。')}
                >
                  {paginatedConsumers.items.map((consumer) => (
                    <tr key={consumer.id} className={selectedConsumerId === consumer.id ? 'bg-indigo-50/40' : undefined}>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">{consumer.code}</p>
                          <p className="text-xs text-slate-500">{pickConsumerDisplayName(consumer)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge tone="info" label={consumerCategoryLabel(consumer.consumerCategory)} />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{consumer.contactEmail || consumer.contactName || text('Unassigned', '未分配', '未設定')}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{consumer.apiKeyPrefix || text('Not generated', '未生成', '未生成')}</td>
                      <td className="px-6 py-4">
                        <StatusBadge tone={consumer.isActive ? 'success' : 'danger'} label={statusLabel(consumer.isActive)} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <SecondaryButton
                            onClick={() => {
                              setConsumerCreateMode(false);
                              setSelectedConsumerId(consumer.id);
                            }}
                          >
                            {text('Open', '打开', '開く')}
                          </SecondaryButton>
                          {consumer.isActive ? (
                            <SecondaryButton
                              tone="danger"
                              onClick={() =>
                                setConfirmState({
                                  title: text(`Deactivate ${consumer.code}?`, `停用 ${consumer.code}？`, `${consumer.code} を無効化しますか？`),
                                  description: text('The API client record remains stored, but should no longer be treated as an active integration consumer.', 'API 客户端记录会保留，但不再应被视为活跃的集成消费者。', 'API クライアントの記録は保持されますが、以後は有効な統合コンシューマーとして扱われません。'),
                                  confirmText: text('Deactivate client', '停用客户端', 'クライアントを無効化'),
                                  pendingText: text('Deactivating client...', '正在停用客户端...', 'クライアントを無効化しています...'),
                                  intent: 'danger',
                                  errorFallback: text('Failed to deactivate API client.', '停用 API 客户端失败。', 'API クライアントの無効化に失敗しました。'),
                                  onConfirm: async () => {
                                    await deactivateConsumer(request, consumer.id, consumer.version);
                                    await refreshConsumers(consumer.id);
                                    return text(`${consumer.code} API client deactivated.`, `已停用 API 客户端 ${consumer.code}。`, `API クライアント ${consumer.code} を無効化しました。`);
                                  },
                                })
                              }
                            >
                              {text('Deactivate', '停用', '無効化')}
                            </SecondaryButton>
                          ) : (
                            <SecondaryButton
                              tone="primary"
                              onClick={() =>
                                setConfirmState({
                                  title: text(`Reactivate ${consumer.code}?`, `重新启用 ${consumer.code}？`, `${consumer.code} を再有効化しますか？`),
                                  description: text('The API client becomes available for use again.', 'API 客户端将重新可用。', 'API クライアントを再び利用可能にします。'),
                                  confirmText: text('Reactivate client', '重新启用客户端', 'クライアントを再有効化'),
                                  pendingText: text('Reactivating client...', '正在重新启用客户端...', 'クライアントを再有効化しています...'),
                                  intent: 'primary',
                                  errorFallback: text('Failed to reactivate API client.', '重新启用 API 客户端失败。', 'API クライアントの再有効化に失敗しました。'),
                                  onConfirm: async () => {
                                    await reactivateConsumer(request, consumer.id, consumer.version);
                                    await refreshConsumers(consumer.id);
                                    return text(`${consumer.code} API client reactivated.`, `已重新启用 API 客户端 ${consumer.code}。`, `API クライアント ${consumer.code} を再有効化しました。`);
                                  },
                                })
                              }
                            >
                              {text('Reactivate', '重新启用', '再有効化')}
                            </SecondaryButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  </TableShell>
                  {consumersPanel.data.length > 0 ? (
                    <PaginationFooter
                      locale={selectedLocale}
                      pagination={paginatedConsumers.pagination}
                      itemCount={paginatedConsumers.items.length}
                      pageSize={consumerPageSize}
                      onPageSizeChange={(pageSize) => {
                        setConsumerPageSize(pageSize);
                        setConsumerPage(1);
                      }}
                      onPrevious={() => setConsumerPage((current) => Math.max(current - 1, 1))}
                      onNext={() => setConsumerPage((current) => current + 1)}
                      isLoading={consumersPanel.loading}
                    />
                  ) : null}
                </>
              )}
            </FormSection>
          </GlassSurface>

          <GlassSurface className="p-6">
            <FormSection
              title={consumerCreateMode ? text('New API Client', '新建 API 客户端', '新しい API クライアント') : text('API Client Detail', 'API 客户端详情', 'API クライアント詳細')}
              description={text('Review consumer metadata, contact data, IP allowlists, and managed key status.', '查看消费者元数据、联系信息、IP 白名单与受管密钥状态。', 'コンシューマーメタデータ、連絡先、IP 許可リスト、管理キー状態を確認します。')}
              actions={
                <>
                  {!consumerCreateMode ? (
                    <SecondaryButton
                      onClick={() => {
                        setConsumerCreateMode(true);
                        setSelectedConsumerId(null);
                        setConsumerDraft(buildConsumerDraft());
                      }}
                    >
                      {text('Start new', '新建', '新規作成')}
                    </SecondaryButton>
                  ) : (
                    <SecondaryButton
                      onClick={() => {
                        setConsumerCreateMode(false);
                        setSelectedConsumerId(consumersPanel.data[0]?.id || null);
                      }}
                    >
                      {text('Cancel', '取消', 'キャンセル')}
                    </SecondaryButton>
                  )}
                  <AsyncSubmitButton
                    onClick={() => void handleConsumerSave()}
                    isPending={consumerSubmitting}
                    pendingText={
                      consumerCreateMode
                        ? text('Creating API client...', '正在创建 API 客户端...', 'API クライアントを作成しています...')
                        : text('Saving API client...', '正在保存 API 客户端...', 'API クライアントを保存しています...')
                    }
                  >
                    {consumerCreateMode ? text('Create API client', '创建 API 客户端', 'API クライアントを作成') : text('Save API client', '保存 API 客户端', 'API クライアントを保存')}
                  </AsyncSubmitButton>
                </>
              }
            >
              {consumerCreateMode || selectedConsumer ? (
                <>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <TextField
                      label={text('Consumer code', '消费者代码', 'コンシューマーコード')}
                      value={consumerDraft.code}
                      onChange={(value) => setConsumerDraft((current) => ({ ...current, code: value.toUpperCase() }))}
                      disabled={!consumerCreateMode}
                      placeholder={text('BATCH_IMPORTER', 'BATCH_IMPORTER', 'BATCH_IMPORTER')}
                    />
                    <SelectField
                      label={text('Category', '分类', 'カテゴリ')}
                      value={consumerDraft.consumerCategory}
                      onChange={(value) =>
                        setConsumerDraft((current) => ({
                          ...current,
                          consumerCategory: value as ConsumerDraft['consumerCategory'],
                        }))
                      }
                      options={[
                        { value: 'external', label: consumerCategoryLabel('external') },
                        { value: 'partner', label: consumerCategoryLabel('partner') },
                        { value: 'internal', label: consumerCategoryLabel('internal') },
                      ]}
                    />
                    <TextField
                      label={text('Name (EN)', '名称（英文）', '名称（英語）')}
                      value={consumerDraft.nameEn}
                      onChange={(value) => setConsumerDraft((current) => ({ ...current, nameEn: value }))}
                    />
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">
                        {text('Translations', '翻译', '翻訳')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setConsumerTranslationDrawerOpen(true)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                      >
                        <Languages className="h-4 w-4" />
                        {configuredConsumerTranslationCount > 0
                          ? text(
                              `Translation management (${configuredConsumerTranslationCount})`,
                              `翻译管理（${configuredConsumerTranslationCount}）`,
                              `翻訳管理（${configuredConsumerTranslationCount}）`,
                            )
                          : text('Translation management', '翻译管理', '翻訳管理')}
                      </button>
                      {consumerTranslationOptionsState.error ? (
                        <p className="text-xs text-amber-700">{consumerTranslationOptionsState.error}</p>
                      ) : null}
                    </div>
                    <TextField
                      label={text('Contact name', '联系人姓名', '担当者名')}
                      value={consumerDraft.contactName}
                      onChange={(value) => setConsumerDraft((current) => ({ ...current, contactName: value }))}
                    />
                    <TextField
                      label={text('Contact email', '联系邮箱', '連絡先メール')}
                      value={consumerDraft.contactEmail}
                      onChange={(value) => setConsumerDraft((current) => ({ ...current, contactEmail: value }))}
                      type="email"
                    />
                    <TextField
                      label={text('Rate limit / minute', '每分钟限流', '分あたりレート制限')}
                      value={consumerDraft.rateLimit}
                      onChange={(value) => setConsumerDraft((current) => ({ ...current, rateLimit: value }))}
                      type="number"
                    />
                  </div>
                  <TextField
                    label={text('Allowed IPs', '允许的 IP', '許可 IP')}
                    value={consumerDraft.allowedIpsText}
                    onChange={(value) => setConsumerDraft((current) => ({ ...current, allowedIpsText: value }))}
                    placeholder={text('192.168.1.10, 10.0.0.0/8', '192.168.1.10, 10.0.0.0/8', '192.168.1.10, 10.0.0.0/8')}
                  />
                  <TextAreaField
                    label={text('Notes', '备注', 'メモ')}
                    value={consumerDraft.notes}
                    onChange={(value) => setConsumerDraft((current) => ({ ...current, notes: value }))}
                    rows={4}
                    placeholder={text('Operational notes for this inbound consumer.', '记录该入站消费者的运营备注。', 'この受信コンシューマーに関する運用メモを記入します。')}
                  />
                </>
              ) : (
                <StateView
                  status="empty"
                  title={text('Select an API client', '选择一个 API 客户端', 'API クライアントを選択')}
                  description={text('Pick a stored consumer or create a new one before managing key lifecycle.', '请先选择已有消费者或创建新的消费者，再管理密钥生命周期。', 'キーライフサイクルを管理する前に、保存済みコンシューマーを選ぶか新規作成してください。')}
                />
              )}
            </FormSection>

            <FormSection
              title={text('Key Lifecycle', '密钥生命周期', 'キーライフサイクル')}
              description={text('Generated keys are shown only once. Store them securely immediately after generation or rotation.', '生成后的密钥只会显示一次。请在生成或轮换后立即安全保存。', '生成されたキーは一度しか表示されません。生成またはローテーション直後に安全に保管してください。')}
            >
              {selectedConsumer ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <SecondaryButton
                      tone="primary"
                      onClick={() =>
                        setConfirmState({
                          title: selectedConsumer.apiKeyPrefix
                            ? text(`Rotate API key for ${selectedConsumer.code}?`, `为 ${selectedConsumer.code} 轮换 API 密钥？`, `${selectedConsumer.code} の API キーをローテーションしますか？`)
                            : text(`Generate API key for ${selectedConsumer.code}?`, `为 ${selectedConsumer.code} 生成 API 密钥？`, `${selectedConsumer.code} の API キーを生成しますか？`),
                          description: selectedConsumer.apiKeyPrefix
                            ? text('The previous key becomes unusable after rotation. Make sure the downstream consumer is ready for a new credential.', '轮换后旧密钥将失效。请确认下游消费者已准备好接收新凭据。', 'ローテーション後、以前のキーは無効になります。下流のコンシューマーが新しい認証情報を受け取れる状態か確認してください。')
                            : text('The generated API key is returned only once. Store it securely before leaving this screen.', '生成后的 API 密钥只会返回一次。请在离开此页面前安全保存。', '生成された API キーは一度しか返されません。この画面を離れる前に安全に保管してください。'),
                          confirmText: selectedConsumer.apiKeyPrefix ? text('Rotate key', '轮换密钥', 'キーをローテーション') : text('Generate key', '生成密钥', 'キーを生成'),
                          pendingText: selectedConsumer.apiKeyPrefix ? text('Rotating key...', '正在轮换密钥...', 'キーをローテーションしています...') : text('Generating key...', '正在生成密钥...', 'キーを生成しています...'),
                          intent: 'primary',
                          errorFallback: text('Failed to issue API key.', '签发 API 密钥失败。', 'API キーの発行に失敗しました。'),
                          onConfirm: async () => {
                            const result = selectedConsumer.apiKeyPrefix
                              ? await rotateConsumerKey(request, selectedConsumer.id)
                              : await generateConsumerKey(request, selectedConsumer.id);
                            setGeneratedKey({
                              consumerCode: selectedConsumer.code,
                              apiKey: result.apiKey || '',
                              apiKeyPrefix: result.apiKeyPrefix,
                              message: result.message,
                            });
                            await refreshConsumers(selectedConsumer.id);
                            return result.message;
                          },
                        })
                      }
                    >
                      <KeyRound className="h-4 w-4" />
                      {selectedConsumer.apiKeyPrefix ? text('Rotate key', '轮换密钥', 'キーをローテーション') : text('Generate key', '生成密钥', 'キーを生成')}
                    </SecondaryButton>
                    {selectedConsumer.apiKeyPrefix ? (
                      <SecondaryButton
                        tone="danger"
                        onClick={() =>
                        setConfirmState({
                            title: text(`Revoke API key for ${selectedConsumer.code}?`, `撤销 ${selectedConsumer.code} 的 API 密钥？`, `${selectedConsumer.code} の API キーを失効させますか？`),
                            description: text('Revocation removes the current managed key from the consumer record.', '撤销会将当前受管密钥从消费者记录中移除。', '失効すると現在の管理キーがコンシューマー記録から削除されます。'),
                            confirmText: text('Revoke key', '撤销密钥', 'キーを失効'),
                            pendingText: text('Revoking key...', '正在撤销密钥...', 'キーを失効しています...'),
                            intent: 'danger',
                            errorFallback: text('Failed to revoke API key.', '撤销 API 密钥失败。', 'API キーの失効に失敗しました。'),
                            onConfirm: async () => {
                              const result = await revokeConsumerKey(request, selectedConsumer.id);
                              setGeneratedKey(null);
                              await refreshConsumers(selectedConsumer.id);
                              return result.message;
                            },
                          })
                        }
                      >
                        {text('Revoke key', '撤销密钥', 'キーを失効')}
                      </SecondaryButton>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                      label={text('Active prefix', '当前前缀', '有効プレフィックス')}
                      value={selectedConsumer.apiKeyPrefix || text('None', '无', 'なし')}
                      hint={text('Only the stored prefix is ever readable after generation.', '生成后仅能再次读取已保存的前缀。', '生成後に再度参照できるのは保存済みプレフィックスのみです。')}
                    />
                    <SummaryCard
                      label={text('Category', '分类', 'カテゴリ')}
                      value={consumerCategoryLabel(selectedConsumer.consumerCategory)}
                      hint={text('Consumer ownership type for inbound traffic.', '入站流量所对应的消费者类型。', '受信トラフィックに紐づくコンシューマー種別です。')}
                    />
                    <SummaryCard
                      label={text('Status', '状态', '状態')}
                      value={statusLabel(selectedConsumer.isActive)}
                      hint={text('Client record active-state.', '客户端记录的当前状态。', 'クライアント記録の現在状態です。')}
                    />
                    <SummaryCard
                      label={text('Version', '版本', 'バージョン')}
                      value={String(selectedConsumer.version)}
                      hint={text('Current revision of this client record.', '当前客户端记录的修订号。', 'このクライアント記録の現在リビジョンです。')}
                    />
                  </div>

                  {generatedKey ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <p className="font-semibold">{text(`New key material for ${generatedKey.consumerCode}`, `${generatedKey.consumerCode} 的新密钥材料`, `${generatedKey.consumerCode} の新しいキー情報`)}</p>
                      <p className="mt-2 break-all font-mono text-xs">{generatedKey.apiKey}</p>
                      <p className="mt-2 text-xs">{generatedKey.message}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-500">{text('Select an API client to review its details and manage keys.', '请选择一个 API 客户端以查看详情并管理密钥。', 'API クライアントを選択して詳細確認とキー管理を行ってください。')}</p>
              )}
            </FormSection>
          </GlassSurface>
        </>
      ) : null}

      {displayedTab === 'email' ? (
        <>
          {isAcWorkspace ? (
            <GlassSurface className="p-6">
              <FormSection
                title={text('Email Configuration', '邮件配置', 'メール設定')}
                description={text(
                  'Manage global provider credentials and sender identity for platform mail delivery.',
                  '管理平台邮件投递使用的全局服务商凭据与发信身份。',
                  'プラットフォームメール配信のグローバル認証情報と送信者情報を管理します。',
                )}
                actions={
                  emailConfigPanel.unavailableReason || emailConfigPanel.error ? (
                    <SecondaryButton onClick={() => void refreshEmailConfig()}>
                      <RefreshCcw className="h-4 w-4" />
                      {text('Retry', '重试', '再試行')}
                    </SecondaryButton>
                  ) : (
                    <>
                      <SecondaryButton onClick={() => void refreshEmailConfig()}>
                        <RefreshCcw className="h-4 w-4" />
                        {text('Refresh', '刷新', '更新')}
                      </SecondaryButton>
                      <AsyncSubmitButton
                        onClick={() => void handleEmailConfigSave()}
                        isPending={emailConfigSubmitting}
                        pendingText={text('Saving email config...', '正在保存邮件配置...', 'メール設定を保存しています...')}
                      >
                        {text('Save email config', '保存邮件配置', 'メール設定を保存')}
                      </AsyncSubmitButton>
                    </>
                  )
                }
              >
              {emailConfigPanel.loading ? (
                <p className="text-sm text-slate-500">{text('Loading email configuration…', '正在加载邮件配置…', 'メール設定を読み込んでいます…')}</p>
              ) : emailConfigPanel.unavailableReason ? (
                <StateView
                  status="unavailable"
                  title={text('AC-only email configuration', '仅 AC 可用的邮件配置', 'AC 限定のメール設定')}
                  description={emailConfigPanel.unavailableReason}
                />
              ) : emailConfigPanel.error ? (
                <StateView status="error" title={text('Email configuration unavailable', '邮件配置不可用', 'メール設定を利用できません')} description={emailConfigPanel.error} />
              ) : (
                <>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <SelectField
                      label={text('Provider', '服务提供商', 'プロバイダー')}
                      value={emailConfigDraft.provider}
                      onChange={(value) =>
                        setEmailConfigDraft((current) => ({
                          ...current,
                          provider: value as EmailProvider,
                        }))
                      }
                      options={[
                        { value: 'smtp', label: emailProviderLabel('smtp') },
                        { value: 'tencent_ses', label: emailProviderLabel('tencent_ses') },
                      ]}
                    />
                    <TextField
                      label={text('Test email address', '测试邮箱地址', 'テストメールアドレス')}
                      value={emailConfigDraft.testEmail}
                      onChange={(value) => setEmailConfigDraft((current) => ({ ...current, testEmail: value }))}
                      type="email"
                    />
                  </div>

                  {emailConfigDraft.provider === 'smtp' ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <TextField
                        label={text('SMTP host', 'SMTP 主机', 'SMTP ホスト')}
                        value={emailConfigDraft.smtpHost}
                        onChange={(value) => setEmailConfigDraft((current) => ({ ...current, smtpHost: value }))}
                      />
                      <TextField
                        label={text('SMTP port', 'SMTP 端口', 'SMTP ポート')}
                        value={emailConfigDraft.smtpPort}
                        onChange={(value) => setEmailConfigDraft((current) => ({ ...current, smtpPort: value }))}
                        type="number"
                      />
                      <TextField
                        label={text('Username', '用户名', 'ユーザー名')}
                        value={emailConfigDraft.smtpUsername}
                        onChange={(value) => setEmailConfigDraft((current) => ({ ...current, smtpUsername: value }))}
                      />
                      <TextField
                        label={text('Password', '密码', 'パスワード')}
                        value={emailConfigDraft.smtpPassword}
                        onChange={(value) => setEmailConfigDraft((current) => ({ ...current, smtpPassword: value }))}
                      />
                      <TextField
                        label={text('From address', '发件地址', '送信元アドレス')}
                        value={emailConfigDraft.smtpFromAddress}
                        onChange={(value) => setEmailConfigDraft((current) => ({ ...current, smtpFromAddress: value }))}
                        type="email"
                      />
                      <TextField
                        label={text('From name', '发件名称', '送信者名')}
                        value={emailConfigDraft.smtpFromName}
                        onChange={(value) => setEmailConfigDraft((current) => ({ ...current, smtpFromName: value }))}
                      />
                      <CheckboxField
                        label={text('Use secure SMTP transport', '使用安全 SMTP 传输', '安全な SMTP 転送を使用')}
                        checked={emailConfigDraft.smtpSecure}
                        onChange={(checked) => setEmailConfigDraft((current) => ({ ...current, smtpSecure: checked }))}
                      />
                    </div>
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <TextField
                        label={text('SES secret ID', 'SES 密钥 ID', 'SES シークレット ID')}
                        value={emailConfigDraft.sesSecretId}
                        onChange={(value) => setEmailConfigDraft((current) => ({ ...current, sesSecretId: value }))}
                      />
                      <TextField
                        label={text('SES secret key', 'SES 密钥 Key', 'SES シークレットキー')}
                        value={emailConfigDraft.sesSecretKey}
                        onChange={(value) => setEmailConfigDraft((current) => ({ ...current, sesSecretKey: value }))}
                      />
                      <TextField
                        label={text('Region', '区域', 'リージョン')}
                        value={emailConfigDraft.sesRegion}
                        onChange={(value) => setEmailConfigDraft((current) => ({ ...current, sesRegion: value }))}
                      />
                      <TextField
                        label={text('From address', '发件地址', '送信元アドレス')}
                        value={emailConfigDraft.sesFromAddress}
                        onChange={(value) => setEmailConfigDraft((current) => ({ ...current, sesFromAddress: value }))}
                        type="email"
                      />
                      <TextField
                        label={text('From name', '发件名称', '送信者名')}
                        value={emailConfigDraft.sesFromName}
                        onChange={(value) => setEmailConfigDraft((current) => ({ ...current, sesFromName: value }))}
                      />
                      <TextField
                        label={text('Reply-to', '回复地址', '返信先')}
                        value={emailConfigDraft.sesReplyTo}
                        onChange={(value) => setEmailConfigDraft((current) => ({ ...current, sesReplyTo: value }))}
                        type="email"
                      />
                    </div>
                  )}

                  <FormSection
                    title={text('Tenant Sender Overrides', '租户发信身份', 'テナント別送信者')}
                    description={text(
                      'Keep provider credentials global, then override sender address and display name for individual tenants when needed.',
                      '服务商凭据保持全局统一；需要时可为单个租户覆盖发件地址与显示名称。',
                      'プロバイダー認証情報はグローバルのまま、必要なテナントごとに送信元アドレスと表示名を上書きします。',
                    )}
                  >
                    {emailSenderTenantsPanel.loading ? (
                      <p className="text-sm text-slate-500">{text('Loading tenants…', '正在加载租户…', 'テナントを読み込んでいます…')}</p>
                    ) : emailSenderTenantsPanel.error ? (
                      <StateView
                        status="error"
                        title={text('Tenant sender targets unavailable', '租户发信目标不可用', 'テナント送信者対象を利用できません')}
                        description={emailSenderTenantsPanel.error}
                      />
                    ) : emailSenderTenantsPanel.data.length === 0 ? (
                      <StateView
                        status="empty"
                        title={text('No active standard tenants', '没有可配置的普通租户', '設定対象の標準テナントはありません')}
                        description={text(
                          'Create or reactivate a standard tenant before adding tenant-specific sender identities.',
                          '请先创建或重新启用普通租户，再配置租户级发信身份。',
                          'テナント別送信者を追加する前に、標準テナントを作成または再有効化してください。',
                        )}
                      />
                    ) : (
                      <div className="space-y-4">
                        {emailSenderTenantsPanel.data.map((tenant) => {
                          const override = emailConfigDraft.tenantSenderOverrides[tenant.schemaName] ?? {
                            fromAddress: '',
                            fromName: '',
                            replyTo: '',
                          };

                          return (
                            <div
                              key={tenant.schemaName}
                              className="rounded-2xl border border-slate-200 bg-white/75 p-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{tenant.name}</p>
                                  <p className="text-xs text-slate-500">{tenant.code} · {tenant.schemaName}</p>
                                </div>
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                  {text('Optional override', '可选覆盖', '任意上書き')}
                                </span>
                              </div>
                              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                                <TextField
                                  label={text('From address', '发件地址', '送信元アドレス')}
                                  value={override.fromAddress}
                                  onChange={(value) => updateTenantSenderOverride(tenant.schemaName, 'fromAddress', value)}
                                  type="email"
                                />
                                <TextField
                                  label={text('From name', '发件名称', '送信者名')}
                                  value={override.fromName}
                                  onChange={(value) => updateTenantSenderOverride(tenant.schemaName, 'fromName', value)}
                                />
                                <TextField
                                  label={text('Reply-to', '回复地址', '返信先')}
                                  value={override.replyTo}
                                  onChange={(value) => updateTenantSenderOverride(tenant.schemaName, 'replyTo', value)}
                                  type="email"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </FormSection>

                  <div className="flex flex-wrap gap-3">
                    <SecondaryButton
                      onClick={() => void handleEmailAction('connection')}
                      disabled={emailActionPending !== null}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {text('Test connection', '测试连接', '接続をテスト')}
                    </SecondaryButton>
                    <SecondaryButton
                      tone="primary"
                      onClick={() => void handleEmailAction('test-email')}
                      disabled={emailActionPending !== null || !emailConfigDraft.testEmail.trim()}
                    >
                      <Mail className="h-4 w-4" />
                      {text('Send test email', '发送测试邮件', 'テストメールを送信')}
                    </SecondaryButton>
                  </div>

                  {emailActionResult ? (
                    <div className={`rounded-2xl border px-4 py-3 text-sm ${
                      emailActionResult.success
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-rose-200 bg-rose-50 text-rose-800'
                    }`}>
                      {emailActionResult.message}
                      {emailActionResult.error ? <p className="mt-1 text-xs">{emailActionResult.error}</p> : null}
                    </div>
                  ) : null}
                </>
              )}
              </FormSection>
            </GlassSurface>
          ) : null}

          <GlassSurface className="p-6">
            <FormSection
              title={text('Email Templates', '邮件模板', 'メールテンプレート')}
              description={text('Manage email templates in this workspace.', '在当前工作区管理邮件模板。', 'このワークスペースでメールテンプレートを管理します。')}
              actions={
                <>
                  <SecondaryButton onClick={() => void refreshEmailTemplates()}>
                    <RefreshCcw className="h-4 w-4" />
                    {text('Refresh', '刷新', '更新')}
                  </SecondaryButton>
                  <SecondaryButton
                    tone="primary"
                    onClick={() => {
                      setTemplateCreateMode(true);
                      setSelectedTemplateCode(null);
                      setTemplateDraft(buildEmailTemplateDraft());
                      setTemplatePreview(null);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    {text('New template', '新建模板', '新しいテンプレート')}
                  </SecondaryButton>
                </>
              }
            >
              {emailTemplatesPanel.unavailableReason ? (
                <StateView
                  status="unavailable"
                  title={text('Email templates unavailable for this scope', '当前范围无法使用邮件模板', 'この範囲ではメールテンプレートを利用できません')}
                  description={emailTemplatesPanel.unavailableReason}
                />
              ) : emailTemplatesPanel.error ? (
                <StateView status="error" title={text('Email templates unavailable', '邮件模板不可用', 'メールテンプレートを利用できません')} description={emailTemplatesPanel.error} />
              ) : (
                <>
                  <TableShell
                  columns={[
                    text('Code', '代码', 'コード'),
                    text('Category', '分类', 'カテゴリ'),
                    text('Locale Base', '当前语种内容', '現在の言語内容'),
                    text('Variables', '变量数', '変数数'),
                    text('Status', '状态', '状態'),
                    text('Actions', '操作', '操作'),
                  ]}
                  dataLength={paginatedEmailTemplates.items.length}
                  isLoading={emailTemplatesPanel.loading}
                  isEmpty={emailTemplatesPanel.data.length === 0}
                  emptyTitle={text('No email templates configured', '尚未配置邮件模板', '設定済みメールテンプレートはありません')}
                  emptyDescription={text('Create the first email template for system or business notifications.', '为系统或业务通知创建第一个邮件模板。', 'システム通知または業務通知用の最初のメールテンプレートを作成してください。')}
                >
                  {paginatedEmailTemplates.items.map((template) => (
                    <tr key={template.code} className={selectedTemplateCode === template.code ? 'bg-indigo-50/40' : undefined}>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">{template.code}</p>
                          <p className="text-xs text-slate-500">{pickTemplateName(template)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge tone="info" label={templateCategoryLabel(template.category)} />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{pickTemplateSubject(template)}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{template.variables.length}</td>
                      <td className="px-6 py-4">
                        <StatusBadge tone={template.isActive ? 'success' : 'danger'} label={statusLabel(template.isActive)} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <SecondaryButton
                            onClick={() => {
                              setTemplateCreateMode(false);
                              setSelectedTemplateCode(template.code);
                            }}
                          >
                            {text('Open', '打开', '開く')}
                          </SecondaryButton>
                          {template.isActive ? (
                            <SecondaryButton
                              tone="danger"
                              onClick={() =>
                                setConfirmState({
                                  title: text(`Deactivate ${template.code}?`, `停用 ${template.code}？`, `${template.code} を無効化しますか？`),
                                  description: text('The template stays stored, but is marked inactive until explicitly reactivated.', '模板会被保留，但在显式重新启用前会被标记为停用。', 'テンプレートは保持されますが、再有効化されるまで無効として扱われます。'),
                                  confirmText: text('Deactivate template', '停用模板', 'テンプレートを無効化'),
                                  pendingText: text('Deactivating template...', '正在停用模板...', 'テンプレートを無効化しています...'),
                                  intent: 'danger',
                                  errorFallback: text('Failed to deactivate email template.', '停用邮件模板失败。', 'メールテンプレートの無効化に失敗しました。'),
                                  onConfirm: async () => {
                                    await deactivateEmailTemplate(request, template.code);
                                    await refreshEmailTemplates(template.code);
                                    return text(`${template.code} template deactivated.`, `已停用模板 ${template.code}。`, `テンプレート ${template.code} を無効化しました。`);
                                  },
                                })
                              }
                            >
                              {text('Deactivate', '停用', '無効化')}
                            </SecondaryButton>
                          ) : (
                            <SecondaryButton
                              tone="primary"
                              onClick={() =>
                                setConfirmState({
                                  title: text(`Reactivate ${template.code}?`, `重新启用 ${template.code}？`, `${template.code} を再有効化しますか？`),
                                  description: text('The stored template becomes available for use again.', '已存储的模板将重新可用。', '保存済みテンプレートを再び利用可能にします。'),
                                  confirmText: text('Reactivate template', '重新启用模板', 'テンプレートを再有効化'),
                                  pendingText: text('Reactivating template...', '正在重新启用模板...', 'テンプレートを再有効化しています...'),
                                  intent: 'primary',
                                  errorFallback: text('Failed to reactivate email template.', '重新启用邮件模板失败。', 'メールテンプレートの再有効化に失敗しました。'),
                                  onConfirm: async () => {
                                    await reactivateEmailTemplate(request, template.code);
                                    await refreshEmailTemplates(template.code);
                                    return text(`${template.code} template reactivated.`, `已重新启用模板 ${template.code}。`, `テンプレート ${template.code} を再有効化しました。`);
                                  },
                                })
                              }
                            >
                              {text('Reactivate', '重新启用', '再有効化')}
                            </SecondaryButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  </TableShell>
                  {emailTemplatesPanel.data.length > 0 ? (
                    <PaginationFooter
                      locale={selectedLocale}
                      pagination={paginatedEmailTemplates.pagination}
                      itemCount={paginatedEmailTemplates.items.length}
                      pageSize={emailTemplatePageSize}
                      onPageSizeChange={(pageSize) => {
                        setEmailTemplatePageSize(pageSize);
                        setEmailTemplatePage(1);
                      }}
                      onPrevious={() => setEmailTemplatePage((current) => Math.max(current - 1, 1))}
                      onNext={() => setEmailTemplatePage((current) => current + 1)}
                      isLoading={emailTemplatesPanel.loading}
                    />
                  ) : null}
                </>
              )}
            </FormSection>
          </GlassSurface>

          <GlassSurface className="p-6">
            <FormSection
              title={templateCreateMode ? text('New Template', '新建模板', '新しいテンプレート') : text('Template Detail', '模板详情', 'テンプレート詳細')}
              description={text('Create or edit multilingual email copy. Preview uses the stored template content.', '创建或编辑多语言邮件内容。预览使用已保存的模板内容。', '多言語メール内容を作成・編集します。プレビューは保存済みテンプレートを使用します。')}
              actions={
                <>
                  {!templateCreateMode ? (
                    <SecondaryButton
                      onClick={() => {
                        setTemplateCreateMode(true);
                        setSelectedTemplateCode(null);
                        setTemplateDraft(buildEmailTemplateDraft());
                        setTemplatePreview(null);
                      }}
                    >
                      {text('Start new', '新建', '新規作成')}
                    </SecondaryButton>
                  ) : (
                    <SecondaryButton
                      onClick={() => {
                        setTemplateCreateMode(false);
                        setSelectedTemplateCode(emailTemplatesPanel.data[0]?.code || null);
                      }}
                    >
                      {text('Cancel', '取消', 'キャンセル')}
                    </SecondaryButton>
                  )}
                  <SecondaryButton
                    tone="primary"
                    onClick={() => void handleTemplatePreview()}
                    disabled={templatePreviewLoading || (!selectedTemplateCode && !templateCreateMode)}
                  >
                    <Sparkles className="h-4 w-4" />
                    {text('Preview template', '预览模板', 'テンプレートをプレビュー')}
                  </SecondaryButton>
                  <AsyncSubmitButton
                    onClick={() => void handleTemplateSave()}
                    isPending={templateSubmitting}
                    pendingText={
                      templateCreateMode
                        ? text('Creating template...', '正在创建模板...', 'テンプレートを作成しています...')
                        : text('Saving template...', '正在保存模板...', 'テンプレートを保存しています...')
                    }
                  >
                    {templateCreateMode ? text('Create template', '创建模板', 'テンプレートを作成') : text('Save template', '保存模板', 'テンプレートを保存')}
                  </AsyncSubmitButton>
                </>
              }
            >
              {templateCreateMode || selectedTemplate ? (
                <>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <TextField
                      label={text('Template code', '模板代码', 'テンプレートコード')}
                      value={templateDraft.code}
                      onChange={(value) => setTemplateDraft((current) => ({ ...current, code: value.toUpperCase() }))}
                      disabled={!templateCreateMode}
                      placeholder={text('WELCOME_EMAIL', 'WELCOME_EMAIL', 'WELCOME_EMAIL')}
                    />
                    <SelectField
                      label={text('Category', '分类', 'カテゴリ')}
                      value={templateDraft.category}
                      onChange={(value) =>
                        setTemplateDraft((current) => ({
                          ...current,
                          category: value as EmailTemplateCategory,
                        }))
                      }
                      options={[
                        { value: 'system', label: templateCategoryLabel('system') },
                        { value: 'business', label: templateCategoryLabel('business') },
                      ]}
                    />
                    <TextField
                      label={text('Name (EN)', '名称（英文）', '名称（英語）')}
                      value={templateDraft.nameEn}
                      onChange={(value) => setTemplateDraft((current) => ({ ...current, nameEn: value }))}
                    />
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">
                        {text('Name translations', '名称翻译', '名称翻訳')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTemplateTranslationSection('name')}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                      >
                        <Languages className="h-4 w-4" />
                        {configuredTemplateNameTranslationCount > 0
                          ? text(
                              `Translation management (${configuredTemplateNameTranslationCount})`,
                              `翻译管理（${configuredTemplateNameTranslationCount}）`,
                              `翻訳管理（${configuredTemplateNameTranslationCount}）`,
                            )
                          : text('Translation management', '翻译管理', '翻訳管理')}
                      </button>
                    </div>
                    <TextField
                      label={text('Subject (EN)', '主题（英文）', '件名（英語）')}
                      value={templateDraft.subjectEn}
                      onChange={(value) => setTemplateDraft((current) => ({ ...current, subjectEn: value }))}
                    />
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">
                        {text('Subject translations', '主题翻译', '件名翻訳')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTemplateTranslationSection('subject')}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                      >
                        <Languages className="h-4 w-4" />
                        {configuredTemplateSubjectTranslationCount > 0
                          ? text(
                              `Translation management (${configuredTemplateSubjectTranslationCount})`,
                              `翻译管理（${configuredTemplateSubjectTranslationCount}）`,
                              `翻訳管理（${configuredTemplateSubjectTranslationCount}）`,
                            )
                          : text('Translation management', '翻译管理', '翻訳管理')}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <TextAreaField
                      label={text('HTML body (EN)', 'HTML 内容（英文）', 'HTML 本文（英語）')}
                      value={templateDraft.bodyHtmlEn}
                      onChange={(value) => setTemplateDraft((current) => ({ ...current, bodyHtmlEn: value }))}
                      rows={8}
                    />
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">
                        {text('HTML body translations', 'HTML 正文翻译', 'HTML 本文翻訳')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTemplateTranslationSection('bodyHtml')}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                      >
                        <Languages className="h-4 w-4" />
                        {configuredTemplateBodyHtmlTranslationCount > 0
                          ? text(
                              `Translation management (${configuredTemplateBodyHtmlTranslationCount})`,
                              `翻译管理（${configuredTemplateBodyHtmlTranslationCount}）`,
                              `翻訳管理（${configuredTemplateBodyHtmlTranslationCount}）`,
                            )
                          : text('Translation management', '翻译管理', '翻訳管理')}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <TextAreaField
                      label={text('Text body (EN)', '纯文本内容（英文）', 'テキスト本文（英語）')}
                      value={templateDraft.bodyTextEn}
                      onChange={(value) => setTemplateDraft((current) => ({ ...current, bodyTextEn: value }))}
                      rows={5}
                    />
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">
                        {text('Text body translations', '纯文本正文翻译', 'テキスト本文翻訳')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTemplateTranslationSection('bodyText')}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                      >
                        <Languages className="h-4 w-4" />
                        {configuredTemplateBodyTextTranslationCount > 0
                          ? text(
                              `Translation management (${configuredTemplateBodyTextTranslationCount})`,
                              `翻译管理（${configuredTemplateBodyTextTranslationCount}）`,
                              `翻訳管理（${configuredTemplateBodyTextTranslationCount}）`,
                            )
                          : text('Translation management', '翻译管理', '翻訳管理')}
                      </button>
                    </div>
                  </div>

                  <TextField
                    label={text('Template variables', '模板变量', 'テンプレート変数')}
                    value={templateDraft.variablesText}
                    onChange={(value) => setTemplateDraft((current) => ({ ...current, variablesText: value }))}
                    placeholder={text('name, supportEmail', 'name, supportEmail', 'name, supportEmail')}
                  />

                  <TextAreaField
                    label={text('Preview variables', '预览变量', 'プレビュー変数')}
                    value={templatePreviewVariables}
                    onChange={setTemplatePreviewVariables}
                    rows={4}
                    placeholder={text('name=Tokino Sora\nsupportEmail=support@example.com', 'name=时乃空\nsupportEmail=support@example.com', 'name=ときのそら\nsupportEmail=support@example.com')}
                  />

                  {templatePreview ? (
                    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                      <p className="text-sm font-semibold text-slate-900">{text('Preview subject', '预览主题', 'プレビュー件名')}</p>
                      <p className="mt-2 text-sm text-slate-700">{templatePreview.subject}</p>
                      <p className="mt-4 text-sm font-semibold text-slate-900">{text('Preview HTML', '预览 HTML', 'プレビュー HTML')}</p>
                      <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                        <pre className="whitespace-pre-wrap break-words">{templatePreview.htmlBody}</pre>
                      </div>
                      {templatePreview.textBody ? (
                        <>
                          <p className="mt-4 text-sm font-semibold text-slate-900">{text('Preview text', '预览文本', 'プレビュー本文')}</p>
                          <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                            <pre className="whitespace-pre-wrap break-words">{templatePreview.textBody}</pre>
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <StateView
                  status="empty"
                  title={text('Select an email template', '选择一个邮件模板', 'メールテンプレートを選択')}
                  description={text('Open an existing template or create a new one to edit its content.', '请先打开一个已保存模板，或先创建新模板再编辑内容。', '既存テンプレートを開くか、新規作成してから内容を編集してください。')}
                />
              )}
            </FormSection>
          </GlassSurface>
        </>
      ) : null}
          </div>
        </>
      ) : (
        <GlassSurface className="p-8">
          <StateView
            status="empty"
            title={text('Select a scope first', '请先选择一个范围', '先にスコープを選択してください')}
            description={noScopeTreeDescription}
          />
        </GlassSurface>
      )}
        </div>
      </div>

      <TranslationDrawer
        open={consumerTranslationDrawerOpen}
        onOpenChange={setConsumerTranslationDrawerOpen}
        title={text('API client translations', 'API 客户端翻译', 'API クライアント翻訳')}
        baseValue={consumerDraft.nameEn}
        translations={consumerDraft.nameTranslations}
        availableLocales={consumerTranslationOptionsState.data}
        onSave={async (payload) => {
          const translations = extractSingleFieldTranslationPayload(payload);

          setConsumerDraft((current) => ({
            ...current,
            nameTranslations: translations,
            nameZh: pickLegacyLocaleValue(translations, 'zh_HANS') || '',
            nameJa: pickLegacyLocaleValue(translations, 'ja') || '',
          }));
        }}
        saveButtonLabel={text({ en: 'Save', zh_HANS: '保存', zh_HANT: '儲存', ja: '保存', ko: '저장', fr: 'Enregistrer' })}
        cancelButtonLabel={text({ en: 'Cancel', zh_HANS: '取消', zh_HANT: '取消', ja: 'キャンセル', ko: '취소', fr: 'Annuler' })}
        closeButtonAriaLabel={text({
          en: 'Close translation management drawer',
          zh_HANS: '关闭翻译管理抽屉',
          zh_HANT: '關閉翻譯管理抽屜',
          ja: '翻訳管理ドロワーを閉じる',
          ko: '번역 관리 서랍 닫기',
          fr: 'Fermer le panneau de gestion des traductions',
        })}
        addLanguageLabel={translationDrawerLabels.addLanguageLabel}
        removeLanguageVisibleLabel={translationDrawerLabels.removeLanguageVisibleLabel}
        removeLanguageAriaLabel={(language) =>
          `${translationDrawerLabels.removeLanguageVisibleLabel} ${language}`
        }
        searchPlaceholder={translationDrawerLabels.searchPlaceholder}
        noSearchResultsText={translationDrawerLabels.noSearchResultsText}
        emptyTranslationsText={translationDrawerLabels.emptyTranslationsText}
        baseValueSuffix={translationDrawerLabels.baseValueSuffix}
      />
      <TranslationDrawer
        open={adapterTranslationDrawerOpen}
        onOpenChange={setAdapterTranslationDrawerOpen}
        title={text('Adapter translations', '适配器翻译', 'アダプター翻訳')}
        baseValue={adapterDraft.nameEn}
        translations={adapterDraft.nameTranslations}
        availableLocales={consumerTranslationOptionsState.data}
        onSave={async (payload) => {
          const translations = extractSingleFieldTranslationPayload(payload);

          setAdapterDraft((current) => ({
            ...current,
            nameTranslations: translations,
            nameZh: pickLegacyLocaleValue(translations, 'zh_HANS') || '',
            nameJa: pickLegacyLocaleValue(translations, 'ja') || '',
          }));
        }}
        saveButtonLabel={text({ en: 'Save', zh_HANS: '保存', zh_HANT: '儲存', ja: '保存', ko: '저장', fr: 'Enregistrer' })}
        cancelButtonLabel={text({ en: 'Cancel', zh_HANS: '取消', zh_HANT: '取消', ja: 'キャンセル', ko: '취소', fr: 'Annuler' })}
        closeButtonAriaLabel={text({
          en: 'Close adapter translation drawer',
          zh_HANS: '关闭适配器翻译抽屉',
          zh_HANT: '關閉適配器翻譯抽屜',
          ja: 'アダプター翻訳ドロワーを閉じる',
          ko: '어댑터 번역 서랍 닫기',
          fr: 'Fermer le panneau de traduction de l’adaptateur',
        })}
        addLanguageLabel={translationDrawerLabels.addLanguageLabel}
        removeLanguageVisibleLabel={translationDrawerLabels.removeLanguageVisibleLabel}
        removeLanguageAriaLabel={(language) =>
          `${translationDrawerLabels.removeLanguageVisibleLabel} ${language}`
        }
        searchPlaceholder={translationDrawerLabels.searchPlaceholder}
        noSearchResultsText={translationDrawerLabels.noSearchResultsText}
        emptyTranslationsText={translationDrawerLabels.emptyTranslationsText}
        baseValueSuffix={translationDrawerLabels.baseValueSuffix}
      />
      <TranslationDrawer
        open={webhookTranslationDrawerOpen}
        onOpenChange={setWebhookTranslationDrawerOpen}
        title={text('Webhook translations', 'Webhook 翻译', 'Webhook 翻訳')}
        baseValue={webhookDraft.nameEn}
        translations={webhookDraft.nameTranslations}
        availableLocales={consumerTranslationOptionsState.data}
        onSave={async (payload) => {
          const translations = extractSingleFieldTranslationPayload(payload);

          setWebhookDraft((current) => ({
            ...current,
            nameTranslations: translations,
            nameZh: pickLegacyLocaleValue(translations, 'zh_HANS') || '',
            nameJa: pickLegacyLocaleValue(translations, 'ja') || '',
          }));
        }}
        saveButtonLabel={text({ en: 'Save', zh_HANS: '保存', zh_HANT: '儲存', ja: '保存', ko: '저장', fr: 'Enregistrer' })}
        cancelButtonLabel={text({ en: 'Cancel', zh_HANS: '取消', zh_HANT: '取消', ja: 'キャンセル', ko: '취소', fr: 'Annuler' })}
        closeButtonAriaLabel={text({
          en: 'Close webhook translation drawer',
          zh_HANS: '关闭 Webhook 翻译抽屉',
          zh_HANT: '關閉 Webhook 翻譯抽屜',
          ja: 'Webhook 翻訳ドロワーを閉じる',
          ko: '웹훅 번역 서랍 닫기',
          fr: 'Fermer le panneau de traduction du webhook',
        })}
        addLanguageLabel={translationDrawerLabels.addLanguageLabel}
        removeLanguageVisibleLabel={translationDrawerLabels.removeLanguageVisibleLabel}
        removeLanguageAriaLabel={(language) =>
          `${translationDrawerLabels.removeLanguageVisibleLabel} ${language}`
        }
        searchPlaceholder={translationDrawerLabels.searchPlaceholder}
        noSearchResultsText={translationDrawerLabels.noSearchResultsText}
        emptyTranslationsText={translationDrawerLabels.emptyTranslationsText}
        baseValueSuffix={translationDrawerLabels.baseValueSuffix}
      />
      <TranslationDrawer
        open={templateTranslationDrawerConfig !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTemplateTranslationSection(null);
          }
        }}
        title={templateTranslationDrawerConfig?.title ?? text({
          en: 'Template translations',
          zh_HANS: '模板翻译',
          zh_HANT: '範本翻譯',
          ja: 'テンプレート翻訳',
          ko: '템플릿 번역',
          fr: 'Traductions du modèle',
        })}
        baseValue={templateTranslationDrawerConfig?.baseValue ?? ''}
        translations={templateTranslationDrawerConfig?.translations ?? {}}
        availableLocales={consumerTranslationOptionsState.data}
        onSave={async (payload) => {
          const translations = extractSingleFieldTranslationPayload(payload);

          setTemplateDraft((current) => {
            if (templateTranslationSection === 'name') {
              return {
                ...current,
                nameTranslations: translations,
                nameZh: pickLegacyLocaleValue(translations, 'zh_HANS') || '',
                nameJa: pickLegacyLocaleValue(translations, 'ja') || '',
              };
            }

            if (templateTranslationSection === 'subject') {
              return {
                ...current,
                subjectTranslations: translations,
                subjectZh: pickLegacyLocaleValue(translations, 'zh_HANS') || '',
                subjectJa: pickLegacyLocaleValue(translations, 'ja') || '',
              };
            }

            if (templateTranslationSection === 'bodyHtml') {
              return {
                ...current,
                bodyHtmlTranslations: translations,
                bodyHtmlZh: pickLegacyLocaleValue(translations, 'zh_HANS') || '',
                bodyHtmlJa: pickLegacyLocaleValue(translations, 'ja') || '',
              };
            }

            return {
              ...current,
              bodyTextTranslations: translations,
              bodyTextZh: pickLegacyLocaleValue(translations, 'zh_HANS') || '',
              bodyTextJa: pickLegacyLocaleValue(translations, 'ja') || '',
            };
          });
          setTemplateTranslationSection(null);
        }}
        saveButtonLabel={text({ en: 'Save', zh_HANS: '保存', zh_HANT: '儲存', ja: '保存', ko: '저장', fr: 'Enregistrer' })}
        cancelButtonLabel={text({ en: 'Cancel', zh_HANS: '取消', zh_HANT: '取消', ja: 'キャンセル', ko: '취소', fr: 'Annuler' })}
        closeButtonAriaLabel={text({
          en: 'Close email template translation drawer',
          zh_HANS: '关闭邮件模板翻译抽屉',
          zh_HANT: '關閉郵件範本翻譯抽屜',
          ja: 'メールテンプレート翻訳ドロワーを閉じる',
          ko: '이메일 템플릿 번역 서랍 닫기',
          fr: 'Fermer le panneau de traduction du modèle d’e-mail',
        })}
        addLanguageLabel={translationDrawerLabels.addLanguageLabel}
        removeLanguageVisibleLabel={translationDrawerLabels.removeLanguageVisibleLabel}
        removeLanguageAriaLabel={(language) =>
          `${translationDrawerLabels.removeLanguageVisibleLabel} ${language}`
        }
        searchPlaceholder={translationDrawerLabels.searchPlaceholder}
        noSearchResultsText={translationDrawerLabels.noSearchResultsText}
        emptyTranslationsText={translationDrawerLabels.emptyTranslationsText}
        baseValueSuffix={translationDrawerLabels.baseValueSuffix}
      />
      <ConfirmActionDialog
        open={Boolean(confirmState)}
        title={confirmState?.title || text('Confirm action', '确认操作', '操作を確認')}
        description={confirmState?.description || ''}
        confirmText={confirmState?.confirmText}
        isPending={confirmPending}
        intent={confirmState?.intent}
        onCancel={() => {
          if (!confirmPending) {
            setConfirmState(null);
          }
        }}
        onConfirm={() => void handleConfirmAction()}
      />
    </div>
  );
}
