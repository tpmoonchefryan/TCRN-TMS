'use client';

import { Plus, RefreshCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { SupportedUiLocale } from '@tcrn/shared';

import {
  createCustomDomainBinding,
  type CustomDomainBindingCatalogItem,
  listCustomDomainBindings,
  updateCustomDomainBinding,
  verifyCustomDomainBinding,
} from '@/domains/config-dictionary-settings/api/public-domain-settings.api';
import type { ConfigEntityScopeType } from '@/domains/config-dictionary-settings/api/settings.api';
import { type SafeApiErrorView, toSafeApiErrorView } from '@/platform/http/safe-api-error';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import {
  buildPaginationMeta,
  getPaginationRange,
  type PageSizeOption,
} from '@/platform/runtime/pagination/pagination';
import {
  ActionDrawer,
  AsyncSubmitButton,
  PaginationFooter,
  StateView,
  TableShell,
} from '@/platform/ui';

type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;
type SslMode = 'auto' | 'self_hosted' | 'cloudflare';

interface CustomDomainConfigEntityWorkspaceProps {
  request: RequestFn;
  scopeType: ConfigEntityScopeType;
  scopeId?: string;
  locale?: SupportedUiLocale;
  search: string;
  currentScopeOnly: boolean;
  includeInactive: boolean;
  page: number;
  pageSize: PageSizeOption;
  onSearchChange: (value: string) => void;
  onCurrentScopeOnlyChange: (value: boolean) => void;
  onIncludeInactiveChange: (value: boolean) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSizeOption) => void;
}

interface DomainDraft {
  hostname: string;
  customDomainSslMode: SslMode;
  isActive: boolean;
}

interface NoticeState {
  tone: 'success' | 'error';
  message: string;
  secondaryText?: string;
}

const EMPTY_DRAFT: DomainDraft = {
  hostname: '',
  customDomainSslMode: 'auto',
  isActive: true,
};

function getTraceLabel(locale: SupportedUiLocale, traceId: string) {
  return pickLocaleText(locale, {
    en: `Trace ID: ${traceId}`,
    zh_HANS: `追踪 ID：${traceId}`,
    zh_HANT: `追踪 ID：${traceId}`,
    ja: `トレース ID: ${traceId}`,
    ko: `Trace ID: ${traceId}`,
    fr: `Trace ID: ${traceId}`,
  });
}

function getSafeCustomDomainError(
  reason: unknown,
  locale: SupportedUiLocale,
  fallbackDescription: string
): SafeApiErrorView {
  return toSafeApiErrorView(reason, {
    fallbackTitle: pickLocaleText(locale, {
      en: 'Custom domains unavailable',
      zh_HANS: '自定义域名不可用',
      zh_HANT: '自定义域名不可用',
      ja: 'カスタムドメインを読み込めません',
      ko: 'Custom domains unavailable',
      fr: 'Custom domains unavailable',
    }),
    fallbackDescription,
    descriptionByCode: {
      SYS_CUSTOM_DOMAIN_REGISTRY_UNAVAILABLE: pickLocaleText(locale, {
        en: 'Custom-domain routing is temporarily unavailable. Try again later or contact an administrator.',
        zh_HANS: '自定义域名路由暂时不可用。请稍后重试或联系管理员。',
        zh_HANT: '自定义域名路由暂时不可用。请稍后重试或联系管理员。',
        ja: 'カスタムドメインルーティングは一時的に利用できません。後でもう一度試すか、管理者に連絡してください。',
        ko: 'Custom-domain routing is temporarily unavailable. Try again later or contact an administrator.',
        fr: 'Custom-domain routing is temporarily unavailable. Try again later or contact an administrator.',
      }),
    },
  });
}

function normalizeHostname(value: string) {
  return value.trim().toLowerCase().replace(/\.$/, '');
}

function buildTxtRecord(token: string | null) {
  return token ? `tcrn-verify=${token}` : null;
}

function isSupportedSslMode(value: string): value is SslMode {
  return value === 'auto' || value === 'self_hosted' || value === 'cloudflare';
}

function resolveScopeLabel(scopeType: ConfigEntityScopeType, locale: SupportedUiLocale) {
  if (scopeType === 'tenant') {
    return pickLocaleText(locale, {
      en: 'tenant',
      zh_HANS: '租户',
      zh_HANT: '租户',
      ja: 'テナント',
      ko: 'tenant',
      fr: 'tenant',
    });
  }

  if (scopeType === 'subsidiary') {
    return pickLocaleText(locale, {
      en: 'subsidiary',
      zh_HANS: '分目录',
      zh_HANT: '分目录',
      ja: '配下スコープ',
      ko: 'subsidiary',
      fr: 'subsidiary',
    });
  }

  return pickLocaleText(locale, {
    en: 'talent',
    zh_HANS: '艺人',
    zh_HANT: '艺人',
    ja: 'タレント',
    ko: 'talent',
    fr: 'talent',
  });
}

function resolveOwnerLabel(domain: CustomDomainBindingCatalogItem, locale: SupportedUiLocale) {
  if (domain.ownerType === 'tenant') {
    return pickLocaleText(locale, {
      en: 'Tenant-owned',
      zh_HANS: '租户拥有',
      zh_HANT: '租户拥有',
      ja: 'テナント所有',
      ko: 'Tenant-owned',
      fr: 'Tenant-owned',
    });
  }

  if (domain.ownerType === 'subsidiary') {
    return pickLocaleText(locale, {
      en: 'Subsidiary-owned',
      zh_HANS: '分目录拥有',
      zh_HANT: '分目录拥有',
      ja: '配下スコープ所有',
      ko: 'Subsidiary-owned',
      fr: 'Subsidiary-owned',
    });
  }

  return pickLocaleText(locale, {
    en: 'Talent-owned',
    zh_HANS: '艺人拥有',
    zh_HANT: '艺人拥有',
    ja: 'タレント所有',
    ko: 'Talent-owned',
    fr: 'Talent-owned',
  });
}

function resolveRouteLabel(domain: CustomDomainBindingCatalogItem, locale: SupportedUiLocale) {
  if (domain.routeMode === 'dedicated_talent') {
    return pickLocaleText(locale, {
      en: 'Uses /homepage and /marshmallow directly.',
      zh_HANS: '直接使用 /homepage 与 /marshmallow。',
      zh_HANT: '直接使用 /homepage 与 /marshmallow。',
      ja: '/homepage と /marshmallow を直接使用します。',
      ko: 'Uses /homepage and /marshmallow directly.',
      fr: 'Uses /homepage and /marshmallow directly.',
    });
  }

  return pickLocaleText(locale, {
    en: 'Requires a talent code path before /homepage or /marshmallow.',
    zh_HANS: '进入 /homepage 或 /marshmallow 前需要带艺人代码路径。',
    zh_HANT: '进入 /homepage 或 /marshmallow 前需要带艺人代码路径。',
    ja: '/homepage または /marshmallow の前にタレントコードのパスが必要です。',
    ko: 'Requires a talent code path before /homepage or /marshmallow.',
    fr: 'Requires a talent code path before /homepage or /marshmallow.',
  });
}

export function CustomDomainConfigEntityWorkspace({
  request,
  scopeType,
  scopeId,
  locale = 'en',
  search,
  currentScopeOnly,
  includeInactive,
  page,
  pageSize,
  onSearchChange,
  onCurrentScopeOnlyChange,
  onIncludeInactiveChange,
  onPageChange,
  onPageSizeChange,
}: Readonly<CustomDomainConfigEntityWorkspaceProps>) {
  const scopeLabel = resolveScopeLabel(scopeType, locale);
  const [domains, setDomains] = useState<CustomDomainBindingCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<SafeApiErrorView | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [editorMode, setEditorMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editorTarget, setEditorTarget] = useState<CustomDomainBindingCatalogItem | null>(null);
  const [draft, setDraft] = useState<DomainDraft>(EMPTY_DRAFT);
  const [editorPending, setEditorPending] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [verificationPendingId, setVerificationPendingId] = useState<string | null>(null);

  const ownedCount = domains.filter((domain) => !domain.inherited).length;
  const inheritedCount = domains.filter((domain) => domain.inherited).length;
  const activeCount = domains.filter((domain) => domain.isActive).length;
  const pagination = buildPaginationMeta(domains.length, page, pageSize);
  const visibleDomains = domains.slice(
    (pagination.page - 1) * pagination.pageSize,
    pagination.page * pagination.pageSize
  );
  const pageRange = getPaginationRange(pagination, visibleDomains.length);
  const paginationCopy = {
    page: pickLocaleText(locale, {
      en: `Page ${pagination.page} of ${pagination.totalPages}`,
      zh_HANS: `第 ${pagination.page} / ${pagination.totalPages} 页`,
      zh_HANT: `第 ${pagination.page} / ${pagination.totalPages} 页`,
      ja: `${pagination.totalPages} ページ中 ${pagination.page} ページ`,
      ko: `Page ${pagination.page} of ${pagination.totalPages}`,
      fr: `Page ${pagination.page} of ${pagination.totalPages}`,
    }),
    range:
      pagination.totalCount === 0
        ? pickLocaleText(locale, {
            en: 'No custom domains are currently visible.',
            zh_HANS: '当前没有可显示的自定义域名。',
            zh_HANT: '当前没有可显示的自定义域名。',
            ja: '現在表示できるカスタムドメインはありません。',
            ko: 'No custom domains are currently visible.',
            fr: 'No custom domains are currently visible.',
          })
        : pickLocaleText(locale, {
            en: `Showing ${pageRange.start}-${pageRange.end} of ${pagination.totalCount}`,
            zh_HANS: `显示第 ${pageRange.start}-${pageRange.end} 条，共 ${pagination.totalCount} 条`,
            zh_HANT: `显示第 ${pageRange.start}-${pageRange.end} 条，共 ${pagination.totalCount} 条`,
            ja: `${pagination.totalCount} 件中 ${pageRange.start}-${pageRange.end} 件を表示`,
            ko: `Showing ${pageRange.start}-${pageRange.end} of ${pagination.totalCount}`,
            fr: `Showing ${pageRange.start}-${pageRange.end} of ${pagination.totalCount}`,
          }),
    pageSize: pickLocaleText(locale, {
      en: 'Rows per page',
      zh_HANS: '每页条目',
      zh_HANT: '每页条目',
      ja: '表示件数',
      ko: 'Rows per page',
      fr: 'Rows per page',
    }),
    previous: pickLocaleText(locale, {
      en: 'Previous',
      zh_HANS: '上一页',
      zh_HANT: '上一页',
      ja: '前へ',
      ko: 'Previous',
      fr: 'Previous',
    }),
    next: pickLocaleText(locale, {
      en: 'Next',
      zh_HANS: '下一页',
      zh_HANT: '下一页',
      ja: '次へ',
      ko: 'Next',
      fr: 'Next',
    }),
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await listCustomDomainBindings(request, {
          scopeType,
          scopeId,
          includeInherited: !currentScopeOnly,
          includeInactive,
          search,
        });

        if (!cancelled) {
          setDomains(response.domains);
        }
      } catch (reason) {
        if (!cancelled) {
          setDomains([]);
          setError(
            getSafeCustomDomainError(
              reason,
              locale,
              pickLocaleText(locale, {
                en: 'Custom-domain records are unavailable for this scope.',
                zh_HANS: '当前范围的自定义域名记录不可用。',
                zh_HANT: '当前范围的自定义域名记录不可用。',
                ja: 'このスコープのカスタムドメインレコードを読み込めません。',
                ko: 'Custom-domain records are unavailable for this scope.',
                fr: 'Custom-domain records are unavailable for this scope.',
              })
            )
          );
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
  }, [currentScopeOnly, includeInactive, locale, refreshTick, request, scopeId, scopeType, search]);

  useEffect(() => {
    if (!loading && page !== pagination.page) {
      onPageChange(pagination.page);
    }
  }, [loading, onPageChange, page, pagination.page]);

  function refresh() {
    setRefreshTick((current) => current + 1);
  }

  function beginCreate() {
    setNotice(null);
    setEditorError(null);
    setEditorTarget(null);
    setDraft(EMPTY_DRAFT);
    setEditorMode('create');
  }

  function beginEdit(domain: CustomDomainBindingCatalogItem) {
    setNotice(null);
    setEditorError(null);
    setEditorTarget(domain);
    setDraft({
      hostname: domain.hostname,
      customDomainSslMode: isSupportedSslMode(domain.customDomainSslMode)
        ? domain.customDomainSslMode
        : 'auto',
      isActive: domain.isActive,
    });
    setEditorMode('edit');
  }

  function closeEditor() {
    setEditorMode('closed');
    setEditorTarget(null);
    setEditorError(null);
    setDraft(EMPTY_DRAFT);
  }

  async function handleSubmit() {
    const hostname = normalizeHostname(draft.hostname);

    if (!hostname) {
      setEditorError(
        pickLocaleText(locale, {
          en: 'Hostname is required.',
          zh_HANS: '域名不能为空。',
          zh_HANT: '域名不能为空。',
          ja: 'ホスト名は必須です。',
          ko: 'Hostname is required.',
          fr: 'Hostname is required.',
        })
      );
      return;
    }

    if (scopeType !== 'tenant' && !scopeId) {
      setEditorError(
        pickLocaleText(locale, {
          en: 'A subsidiary or talent scope is required before saving this domain.',
          zh_HANS: '保存该域名前需要明确分目录或艺人范围。',
          zh_HANT: '保存该域名前需要明确分目录或艺人范围。',
          ja: 'このドメインを保存するには配下スコープまたはタレントスコープが必要です。',
          ko: 'A subsidiary or talent scope is required before saving this domain.',
          fr: 'A subsidiary or talent scope is required before saving this domain.',
        })
      );
      return;
    }

    setEditorPending(true);
    setEditorError(null);
    setNotice(null);

    const payload = {
      ownerType: scopeType,
      ownerId: scopeType === 'tenant' ? null : scopeId,
      hostname,
      customDomainSslMode: draft.customDomainSslMode,
      isActive: draft.isActive,
    };

    try {
      const response =
        editorMode === 'edit' && editorTarget
          ? await updateCustomDomainBinding(request, editorTarget.id, payload)
          : await createCustomDomainBinding(request, payload);

      const txtRecord =
        response.txtRecord ?? buildTxtRecord(response.domain.customDomainVerificationToken);
      setNotice({
        tone: 'success',
        message: txtRecord
          ? pickLocaleText(locale, {
              en: `Custom domain saved. Add TXT record: ${txtRecord}`,
              zh_HANS: `自定义域名已保存。请添加 TXT 记录：${txtRecord}`,
              zh_HANT: `自定义域名已保存。请添加 TXT 记录：${txtRecord}`,
              ja: `カスタムドメインを保存しました。TXT レコードを追加してください: ${txtRecord}`,
              ko: `Custom domain saved. Add TXT record: ${txtRecord}`,
              fr: `Custom domain saved. Add TXT record: ${txtRecord}`,
            })
          : pickLocaleText(locale, {
              en: 'Custom domain saved.',
              zh_HANS: '自定义域名已保存。',
              zh_HANT: '自定义域名已保存。',
              ja: 'カスタムドメインを保存しました。',
              ko: 'Custom domain saved.',
              fr: 'Custom domain saved.',
            }),
      });
      closeEditor();
      refresh();
    } catch (reason) {
      setEditorError(
        getSafeCustomDomainError(
          reason,
          locale,
          pickLocaleText(locale, {
            en: 'Failed to save custom domain.',
            zh_HANS: '保存自定义域名失败。',
            zh_HANT: '保存自定义域名失败。',
            ja: 'カスタムドメインの保存に失敗しました。',
            ko: 'Failed to save custom domain.',
            fr: 'Failed to save custom domain.',
          })
        ).description
      );
    } finally {
      setEditorPending(false);
    }
  }

  async function handleVerify(domain: CustomDomainBindingCatalogItem) {
    setVerificationPendingId(domain.id);
    setNotice(null);

    try {
      const result = await verifyCustomDomainBinding(request, domain.id);
      setNotice({
        tone: result.verified ? 'success' : 'error',
        message: result.message,
      });
      refresh();
    } catch (reason) {
      const errorView = getSafeCustomDomainError(
        reason,
        locale,
        pickLocaleText(locale, {
          en: 'Failed to verify custom domain.',
          zh_HANS: '验证自定义域名失败。',
          zh_HANT: '验证自定义域名失败。',
          ja: 'カスタムドメインの検証に失敗しました。',
          ko: 'Failed to verify custom domain.',
          fr: 'Failed to verify custom domain.',
        })
      );
      setNotice({
        tone: 'error',
        message: errorView.description,
        secondaryText: errorView.traceId ? getTraceLabel(locale, errorView.traceId) : undefined,
      });
    } finally {
      setVerificationPendingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h4 className="text-lg font-semibold text-slate-950">
            {pickLocaleText(locale, {
              en: 'Custom-domain records',
              zh_HANS: '自定义域名记录',
              zh_HANT: '自定义域名记录',
              ja: 'カスタムドメインレコード',
              ko: 'Custom-domain records',
              fr: 'Custom-domain records',
            })}
          </h4>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            {pickLocaleText(locale, {
              en: `Manage domains owned by this ${scopeLabel}; inherited domains remain visible as selectable routing sources.`,
              zh_HANS: `管理当前${scopeLabel}拥有的域名；继承域名作为可用路由来源保留可见。`,
              zh_HANT: `管理当前${scopeLabel}拥有的域名；继承域名作为可用路由来源保留可见。`,
              ja: `この${scopeLabel}が所有するドメインを管理し、継承ドメインは選択可能なルートソースとして表示します。`,
              ko: `Manage domains owned by this ${scopeLabel}; inherited domains remain visible as selectable routing sources.`,
              fr: `Manage domains owned by this ${scopeLabel}; inherited domains remain visible as selectable routing sources.`,
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={beginCreate}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" />
          {pickLocaleText(locale, {
            en: 'New custom domain',
            zh_HANS: '新增自定义域名',
            zh_HANT: '新增自定义域名',
            ja: 'カスタムドメインを追加',
            ko: 'New custom domain',
            fr: 'New custom domain',
          })}
        </button>
      </div>

      {notice ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            notice.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {notice.message}
          {notice.secondaryText ? (
            <p className="mt-1 text-xs font-semibold">{notice.secondaryText}</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            {pickLocaleText(locale, {
              en: 'Owned here',
              zh_HANS: '本级拥有',
              zh_HANT: '本级拥有',
              ja: 'この階層で所有',
              ko: 'Owned here',
              fr: 'Owned here',
            })}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{ownedCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            {pickLocaleText(locale, {
              en: 'Inherited',
              zh_HANS: '继承',
              zh_HANT: '继承',
              ja: '継承',
              ko: 'Inherited',
              fr: 'Inherited',
            })}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{inheritedCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            {pickLocaleText(locale, {
              en: 'Active',
              zh_HANS: '启用中',
              zh_HANT: '启用中',
              ja: '有効',
              ko: 'Active',
              fr: 'Active',
            })}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{activeCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative block min-w-[18rem] flex-1">
            <span className="sr-only">
              {pickLocaleText(locale, {
                en: 'Search custom domains',
                zh_HANS: '搜索自定义域名',
                zh_HANT: '搜索自定义域名',
                ja: 'カスタムドメインを検索',
                ko: 'Search custom domains',
                fr: 'Search custom domains',
              })}
            </span>
            <input
              aria-label={pickLocaleText(locale, {
                en: 'Search custom domains',
                zh_HANS: '搜索自定义域名',
                zh_HANT: '搜索自定义域名',
                ja: 'カスタムドメインを検索',
                ko: 'Search custom domains',
                fr: 'Search custom domains',
              })}
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="brand.example.com"
              className="w-full rounded-xl border border-slate-300 bg-white/85 py-2.5 pr-3 pl-4 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            aria-label={pickLocaleText(locale, {
              en: 'Refresh custom domains',
              zh_HANS: '刷新自定义域名',
              zh_HANT: '刷新自定义域名',
              ja: 'カスタムドメインを更新',
              ko: 'Refresh custom domains',
              fr: 'Refresh custom domains',
            })}
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
            <input
              aria-label={pickLocaleText(locale, {
                en: 'Current scope domains only',
                zh_HANS: '仅当前范围域名',
                zh_HANT: '仅当前范围域名',
                ja: '現在スコープのドメインのみ',
                ko: 'Current scope domains only',
                fr: 'Current scope domains only',
              })}
              type="checkbox"
              checked={currentScopeOnly}
              onChange={(event) => onCurrentScopeOnlyChange(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
            />
            {pickLocaleText(locale, {
              en: 'Current scope only',
              zh_HANS: '仅当前范围',
              zh_HANT: '仅当前范围',
              ja: '現在スコープのみ',
              ko: 'Current scope only',
              fr: 'Current scope only',
            })}
          </label>
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
            <input
              aria-label={pickLocaleText(locale, {
                en: 'Include inactive custom domains',
                zh_HANS: '包含停用域名',
                zh_HANT: '包含停用域名',
                ja: '無効ドメインを含める',
                ko: 'Include inactive custom domains',
                fr: 'Include inactive custom domains',
              })}
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => onIncludeInactiveChange(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
            />
            {pickLocaleText(locale, {
              en: 'Include inactive',
              zh_HANS: '包含停用',
              zh_HANT: '包含停用',
              ja: '無効を含める',
              ko: 'Include inactive',
              fr: 'Include inactive',
            })}
          </label>
        </div>
      </div>

      {error ? (
        <StateView
          status="error"
          title={error.title}
          description={error.description}
          secondaryText={error.traceId ? getTraceLabel(locale, error.traceId) : undefined}
        />
      ) : (
        <TableShell
          ariaLabel={pickLocaleText(locale, {
            en: 'Custom-domain records',
            zh_HANS: '自定义域名记录',
            zh_HANT: '自定义域名记录',
            ja: 'カスタムドメインレコード',
            ko: 'Custom-domain records',
            fr: 'Custom-domain records',
          })}
          columns={[
            pickLocaleText(locale, {
              en: 'Hostname',
              zh_HANS: '域名',
              zh_HANT: '域名',
              ja: 'ホスト名',
              ko: 'Hostname',
              fr: 'Hostname',
            }),
            pickLocaleText(locale, {
              en: 'Scope / route',
              zh_HANS: '范围 / 路由',
              zh_HANT: '范围 / 路由',
              ja: 'スコープ / ルート',
              ko: 'Scope / route',
              fr: 'Scope / route',
            }),
            pickLocaleText(locale, {
              en: 'Verification / status',
              zh_HANS: '验证 / 状态',
              zh_HANT: '验证 / 状态',
              ja: '検証 / 状態',
              ko: 'Verification / status',
              fr: 'Verification / status',
            }),
            pickLocaleText(locale, {
              en: 'Actions',
              zh_HANS: '操作',
              zh_HANT: '操作',
              ja: '操作',
              ko: 'Actions',
              fr: 'Actions',
            }),
          ]}
          dataLength={visibleDomains.length}
          isLoading={loading}
          isEmpty={!loading && domains.length === 0}
          emptyTitle={pickLocaleText(locale, {
            en: 'No custom-domain records returned',
            zh_HANS: '未返回自定义域名记录',
            zh_HANT: '未返回自定义域名记录',
            ja: 'カスタムドメインレコードがありません',
            ko: 'No custom-domain records returned',
            fr: 'No custom-domain records returned',
          })}
          emptyDescription={pickLocaleText(locale, {
            en: 'Create a domain for this scope or include inherited records.',
            zh_HANS: '为当前范围创建域名，或包含继承记录。',
            zh_HANT: '为当前范围创建域名，或包含继承记录。',
            ja: 'このスコープのドメインを作成するか、継承レコードを含めてください。',
            ko: 'Create a domain for this scope or include inherited records.',
            fr: 'Create a domain for this scope or include inherited records.',
          })}
        >
          {visibleDomains.map((domain) => (
            <tr key={domain.id} className={!domain.isActive ? 'bg-slate-50/80' : undefined}>
              <td className="px-6 py-4 align-top">
                <div className="space-y-2">
                  <p className="font-mono text-sm font-semibold break-all text-slate-950">
                    {domain.hostname}
                  </p>
                  {domain.customDomainVerificationToken ? (
                    <p className="font-mono text-xs leading-5 break-all text-slate-500">
                      {buildTxtRecord(domain.customDomainVerificationToken)}
                    </p>
                  ) : null}
                </div>
              </td>
              <td className="px-6 py-4 align-top">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold tracking-[0.16em] text-slate-700 uppercase">
                      {domain.inherited
                        ? pickLocaleText(locale, {
                            en: 'Inherited',
                            zh_HANS: '继承',
                            zh_HANT: '继承',
                            ja: '継承',
                            ko: 'Inherited',
                            fr: 'Inherited',
                          })
                        : pickLocaleText(locale, {
                            en: 'Managed here',
                            zh_HANS: '本级管理',
                            zh_HANT: '本级管理',
                            ja: 'この階層で管理',
                            ko: 'Managed here',
                            fr: 'Managed here',
                          })}
                    </span>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold tracking-[0.16em] text-indigo-700 uppercase">
                      {resolveOwnerLabel(domain, locale)}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">
                    {resolveRouteLabel(domain, locale)}
                  </p>
                </div>
              </td>
              <td className="px-6 py-4 align-top">
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.16em] uppercase ${domain.customDomainVerified ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}
                  >
                    {domain.customDomainVerified
                      ? pickLocaleText(locale, {
                          en: 'Verified',
                          zh_HANS: '已验证',
                          zh_HANT: '已验证',
                          ja: '検証済み',
                          ko: 'Verified',
                          fr: 'Verified',
                        })
                      : pickLocaleText(locale, {
                          en: 'Unverified',
                          zh_HANS: '未验证',
                          zh_HANT: '未验证',
                          ja: '未検証',
                          ko: 'Unverified',
                          fr: 'Unverified',
                        })}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.16em] uppercase ${domain.isActive ? 'border-slate-200 bg-white text-slate-600' : 'border-rose-200 bg-rose-50 text-rose-700'}`}
                  >
                    {domain.isActive
                      ? pickLocaleText(locale, {
                          en: 'Active',
                          zh_HANS: '启用中',
                          zh_HANT: '启用中',
                          ja: '有効',
                          ko: 'Active',
                          fr: 'Active',
                        })
                      : pickLocaleText(locale, {
                          en: 'Inactive',
                          zh_HANS: '停用',
                          zh_HANT: '停用',
                          ja: '無効',
                          ko: 'Inactive',
                          fr: 'Inactive',
                        })}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold tracking-[0.16em] text-slate-600 uppercase">
                    {domain.customDomainSslMode}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 align-top">
                <div className="flex flex-wrap justify-end gap-2">
                  {!domain.inherited ? (
                    <>
                      <button
                        type="button"
                        onClick={() => beginEdit(domain)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold tracking-[0.16em] text-slate-700 uppercase transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        {pickLocaleText(locale, {
                          en: 'Edit',
                          zh_HANS: '编辑',
                          zh_HANT: '编辑',
                          ja: '編集',
                          ko: 'Edit',
                          fr: 'Edit',
                        })}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleVerify(domain)}
                        disabled={verificationPendingId === domain.id}
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold tracking-[0.16em] text-slate-700 uppercase transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {verificationPendingId === domain.id
                          ? pickLocaleText(locale, {
                              en: 'Verifying',
                              zh_HANS: '验证中',
                              zh_HANT: '验证中',
                              ja: '検証中',
                              ko: 'Verifying',
                              fr: 'Verifying',
                            })
                          : pickLocaleText(locale, {
                              en: 'Verify',
                              zh_HANS: '验证',
                              zh_HANT: '验证',
                              ja: '検証',
                              ko: 'Verify',
                              fr: 'Verify',
                            })}
                      </button>
                    </>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                      {pickLocaleText(locale, {
                        en: 'Review only',
                        zh_HANS: '仅查看',
                        zh_HANT: '仅查看',
                        ja: '確認のみ',
                        ko: 'Review only',
                        fr: 'Review only',
                      })}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </TableShell>
      )}

      {!error ? (
        <PaginationFooter
          pagination={pagination}
          itemCount={visibleDomains.length}
          labels={{
            pageLabel: paginationCopy.page,
            rangeLabel: paginationCopy.range,
            rowsPerPageLabel: paginationCopy.pageSize,
            pageSizeAriaLabel: paginationCopy.pageSize,
            previousLabel: paginationCopy.previous,
            nextLabel: paginationCopy.next,
          }}
          onPageChange={onPageChange}
          onPageSizeChange={(nextPageSize) => onPageSizeChange(nextPageSize as PageSizeOption)}
          isLoading={loading}
          className="rounded-2xl border border-slate-200 bg-slate-50/80"
        />
      ) : null}

      <ActionDrawer
        open={editorMode !== 'closed'}
        onOpenChange={(open) => {
          if (!open && !editorPending) {
            closeEditor();
          }
        }}
        title={
          editorMode === 'edit'
            ? pickLocaleText(locale, {
                en: 'Edit custom domain',
                zh_HANS: '编辑自定义域名',
                zh_HANT: '编辑自定义域名',
                ja: 'カスタムドメインを編集',
                ko: 'Edit custom domain',
                fr: 'Edit custom domain',
              })
            : pickLocaleText(locale, {
                en: 'Create custom domain',
                zh_HANS: '新增自定义域名',
                zh_HANT: '新增自定义域名',
                ja: 'カスタムドメインを作成',
                ko: 'Create custom domain',
                fr: 'Create custom domain',
              })
        }
        description={pickLocaleText(locale, {
          en: `Changes are saved as ${scopeLabel}-owned custom-domain configuration records.`,
          zh_HANS: `变更会保存为当前${scopeLabel}拥有的自定义域名配置记录。`,
          zh_HANT: `变更会保存为当前${scopeLabel}拥有的自定义域名配置记录。`,
          ja: `変更はこの${scopeLabel}所有のカスタムドメイン設定レコードとして保存されます。`,
          ko: `Changes are saved as ${scopeLabel}-owned custom-domain configuration records.`,
          fr: `Changes are saved as ${scopeLabel}-owned custom-domain configuration records.`,
        })}
        size="lg"
        closeButtonAriaLabel={pickLocaleText(locale, {
          en: 'Close custom-domain editor',
          zh_HANS: '关闭自定义域名编辑器',
          zh_HANT: '关闭自定义域名编辑器',
          ja: 'カスタムドメインエディターを閉じる',
          ko: 'Close custom-domain editor',
          fr: 'Close custom-domain editor',
        })}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={closeEditor}
              disabled={editorPending}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pickLocaleText(locale, {
                en: 'Cancel',
                zh_HANS: '取消',
                zh_HANT: '取消',
                ja: 'キャンセル',
                ko: 'Cancel',
                fr: 'Cancel',
              })}
            </button>
            <AsyncSubmitButton
              intent="primary"
              isPending={editorPending}
              pendingText={pickLocaleText(locale, {
                en: 'Saving domain...',
                zh_HANS: '正在保存域名...',
                zh_HANT: '正在保存域名...',
                ja: 'ドメインを保存中...',
                ko: 'Saving domain...',
                fr: 'Saving domain...',
              })}
              onClick={() => void handleSubmit()}
            >
              {pickLocaleText(locale, {
                en: 'Save custom domain',
                zh_HANS: '保存自定义域名',
                zh_HANT: '保存自定义域名',
                ja: 'カスタムドメインを保存',
                ko: 'Save custom domain',
                fr: 'Save custom domain',
              })}
            </AsyncSubmitButton>
          </div>
        }
      >
        <div className="space-y-5">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-900">
              {pickLocaleText(locale, {
                en: 'Hostname',
                zh_HANS: '域名',
                zh_HANT: '域名',
                ja: 'ホスト名',
                ko: 'Hostname',
                fr: 'Hostname',
              })}
            </span>
            <input
              aria-label={pickLocaleText(locale, {
                en: 'Custom-domain hostname',
                zh_HANS: '自定义域名域名',
                zh_HANT: '自定义域名域名',
                ja: 'カスタムドメインホスト名',
                ko: 'Custom-domain hostname',
                fr: 'Custom-domain hostname',
              })}
              type="text"
              value={draft.hostname}
              onChange={(event) => {
                setDraft((current) => ({ ...current, hostname: event.target.value }));
                setEditorError(null);
              }}
              placeholder="brand.example.com"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-slate-400"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">
                {pickLocaleText(locale, {
                  en: 'SSL mode',
                  zh_HANS: 'SSL 模式',
                  zh_HANT: 'SSL 模式',
                  ja: 'SSL モード',
                  ko: 'SSL mode',
                  fr: 'SSL mode',
                })}
              </span>
              <select
                aria-label={pickLocaleText(locale, {
                  en: 'Custom-domain SSL mode',
                  zh_HANS: '自定义域名 SSL 模式',
                  zh_HANT: '自定义域名 SSL 模式',
                  ja: 'カスタムドメイン SSL モード',
                  ko: 'Custom-domain SSL mode',
                  fr: 'Custom-domain SSL mode',
                })}
                value={draft.customDomainSslMode}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    customDomainSslMode: event.target.value as SslMode,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition outline-none focus:border-slate-400"
              >
                <option value="auto">auto</option>
                <option value="self_hosted">self_hosted</option>
                <option value="cloudflare">cloudflare</option>
              </select>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <input
                aria-label={pickLocaleText(locale, {
                  en: 'Custom domain is active',
                  zh_HANS: '自定义域名启用中',
                  zh_HANT: '自定义域名启用中',
                  ja: 'カスタムドメインを有効化',
                  ko: 'Custom domain is active',
                  fr: 'Custom domain is active',
                })}
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              <span className="space-y-1">
                <span className="block text-sm font-semibold text-slate-950">
                  {pickLocaleText(locale, {
                    en: 'Active for routing',
                    zh_HANS: '启用于路由',
                    zh_HANT: '启用于路由',
                    ja: 'ルーティングで有効',
                    ko: 'Active for routing',
                    fr: 'Active for routing',
                  })}
                </span>
                <span className="block text-sm leading-6 text-slate-600">
                  {pickLocaleText(locale, {
                    en: 'Inactive domains stay saved but are not offered to downstream routing selections.',
                    zh_HANS: '停用域名会保留记录，但不会作为下游路由选择项提供。',
                    zh_HANT: '停用域名会保留记录，但不会作为下游路由选择项提供。',
                    ja: '無効なドメインは保存されますが、下流のルート選択には提供されません。',
                    ko: 'Inactive domains stay saved but are not offered to downstream routing selections.',
                    fr: 'Inactive domains stay saved but are not offered to downstream routing selections.',
                  })}
                </span>
              </span>
            </label>
          </div>

          {editorError ? <p className="text-sm font-medium text-red-600">{editorError}</p> : null}
        </div>
      </ActionDrawer>
    </div>
  );
}
