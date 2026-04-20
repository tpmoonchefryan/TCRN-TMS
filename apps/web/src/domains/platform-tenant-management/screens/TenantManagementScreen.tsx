'use client';

import { PenSquare, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { startTransition, useDeferredValue, useEffect, useState } from 'react';

import {
  activateTenant,
  deactivateTenant,
  listTenants,
  type TenantListItem,
} from '@/domains/platform-tenant-management/api/tenant-management.api';
import {
  type ApiPaginationMeta,
  buildFallbackPagination,
} from '@/platform/http/api';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import {
  getPaginationRange,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
  parsePageParam,
  parsePageSizeParam,
} from '@/platform/runtime/pagination/pagination';
import { useSession } from '@/platform/runtime/session/session-provider';
import { ConfirmActionDialog, GlassSurface, StateView, TableShell } from '@/platform/ui';

import {
  formatTenantCreatedAt,
  formatTenantMetric,
  useTenantManagementCopy,
} from './tenant-management.copy';
import {
  type ActivityFilter,
  formatDateTime,
  getErrorMessage,
  InlineActionButton,
  NoticeBanner,
  SummaryCard,
  type TierFilter,
  ToneBadge,
} from './tenant-management.shared';

interface PanelState {
  data: TenantListItem[];
  pagination: ApiPaginationMeta;
  loading: boolean;
  error: string | null;
}

interface NoticeState {
  tone: 'success' | 'error';
  message: string;
}

interface ConfirmState {
  title: string;
  description: string;
  confirmText: string;
  intent: 'danger' | 'primary';
  onConfirm: () => Promise<string>;
  errorFallback: string;
}

function parseTierFilter(value: string | null): TierFilter {
  return value === 'ac' || value === 'standard' ? value : 'all';
}

function parseActivityFilter(value: string | null): ActivityFilter {
  return value === 'active' || value === 'inactive' ? value : 'all';
}

function buildTenantQueryState({
  search,
  tierFilter,
  activityFilter,
  page,
  pageSize,
}: {
  search: string;
  tierFilter: TierFilter;
  activityFilter: ActivityFilter;
  page: number;
  pageSize: PageSizeOption;
}) {
  const params = new URLSearchParams();
  const normalizedSearch = search.trim();

  if (normalizedSearch) {
    params.set('search', normalizedSearch);
  }

  if (tierFilter !== 'all') {
    params.set('tier', tierFilter);
  }

  if (activityFilter !== 'all') {
    params.set('status', activityFilter);
  }

  if (page > 1) {
    params.set('page', String(page));
  }

  if (pageSize !== PAGE_SIZE_OPTIONS[0]) {
    params.set('pageSize', String(pageSize));
  }

  return params.toString();
}

export function TenantManagementScreen({
  acTenantId,
}: Readonly<{
  acTenantId: string;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') ?? '';
  const urlTierFilter = parseTierFilter(searchParams.get('tier'));
  const urlActivityFilter = parseActivityFilter(searchParams.get('status'));
  const urlPage = parsePageParam(searchParams.get('page'));
  const urlPageSize = parsePageSizeParam(searchParams.get('pageSize'));
  const { request, requestEnvelope, session } = useSession();
  const { copy, selectedLocale } = useTenantManagementCopy();
  const managementCopy = copy.management;
  const filterCopy = copy.filters;
  const [search, setSearch] = useState(urlSearch);
  const deferredSearch = useDeferredValue(search);
  const [tierFilter, setTierFilter] = useState<TierFilter>(urlTierFilter);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>(urlActivityFilter);
  const [page, setPage] = useState(urlPage);
  const [pageSize, setPageSize] = useState<PageSizeOption>(urlPageSize);
  const [panel, setPanel] = useState<PanelState>({
    data: [],
    pagination: buildFallbackPagination(0, 1, PAGE_SIZE_OPTIONS[0]),
    loading: true,
    error: null,
  });
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);

  useEffect(() => {
    setSearch((current) => (current === urlSearch ? current : urlSearch));
    setTierFilter((current) => (current === urlTierFilter ? current : urlTierFilter));
    setActivityFilter((current) => (current === urlActivityFilter ? current : urlActivityFilter));
    setPage((current) => (current === urlPage ? current : urlPage));
    setPageSize((current) => (current === urlPageSize ? current : urlPageSize));
  }, [urlActivityFilter, urlPage, urlPageSize, urlSearch, urlTierFilter]);

  function applyQueryState(
    nextState: Partial<{
      search: string;
      tierFilter: TierFilter;
      activityFilter: ActivityFilter;
      page: number;
      pageSize: PageSizeOption;
    }>,
  ) {
    const nextSearch = nextState.search ?? search;
    const nextTierFilter = nextState.tierFilter ?? tierFilter;
    const nextActivityFilter = nextState.activityFilter ?? activityFilter;
    const nextPage = nextState.page ?? page;
    const nextPageSize = nextState.pageSize ?? pageSize;

    if (nextState.search !== undefined) {
      setSearch(nextSearch);
    }

    if (nextState.tierFilter !== undefined) {
      setTierFilter(nextTierFilter);
    }

    if (nextState.activityFilter !== undefined) {
      setActivityFilter(nextActivityFilter);
    }

    if (nextState.page !== undefined) {
      setPage(nextPage);
    }

    if (nextState.pageSize !== undefined) {
      setPageSize(nextPageSize);
    }

    const nextQueryString = buildTenantQueryState({
      search: nextSearch,
      tierFilter: nextTierFilter,
      activityFilter: nextActivityFilter,
      page: nextPage,
      pageSize: nextPageSize,
    });

    const currentQueryString = buildTenantQueryState({
      search,
      tierFilter,
      activityFilter,
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

  async function refreshTenants() {
    setPanel((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const result = await listTenants(requestEnvelope, {
        page,
        pageSize,
        search: deferredSearch.trim() || undefined,
        tier: tierFilter === 'all' ? undefined : tierFilter,
        isActive: activityFilter === 'all' ? undefined : activityFilter === 'active',
      });

      setPanel({
        data: result.items,
        pagination: result.pagination,
        loading: false,
        error: null,
      });
    } catch (reason) {
      setPanel((current) => ({
        data: current.data,
        pagination: buildFallbackPagination(current.data.length, page, pageSize),
        loading: false,
        error: getErrorMessage(reason, managementCopy.loadError),
      }));
    }
  }

  useEffect(() => {
    void refreshTenants();
  }, [activityFilter, deferredSearch, page, pageSize, requestEnvelope, tierFilter]);

  async function handleConfirm() {
    if (!confirmState) {
      return;
    }

    const currentState = confirmState;
    setConfirmPending(true);
    setNotice(null);

    try {
      const successMessage = await currentState.onConfirm();
      setNotice({
        tone: 'success',
        message: successMessage,
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, currentState.errorFallback),
      });
    } finally {
      setConfirmPending(false);
      setConfirmState(null);
    }
  }

  if (panel.error && panel.data.length === 0 && !panel.loading) {
    return (
      <StateView status="error" title={managementCopy.title} description={panel.error} />
    );
  }

  const activeCount = panel.data.filter((tenant) => tenant.isActive).length;
  const acCount = panel.data.filter((tenant) => tenant.tier === 'ac').length;
  const standardCount = panel.data.filter((tenant) => tenant.tier === 'standard').length;
  const pageRange = getPaginationRange(panel.pagination, panel.data.length);
  const paginationLabel = pickLocaleText(selectedLocale, {
    en: `Page ${panel.pagination.page} of ${panel.pagination.totalPages}`,
    zh_HANS: `第 ${panel.pagination.page} / ${panel.pagination.totalPages} 页`,
    zh_HANT: `第 ${panel.pagination.page} / ${panel.pagination.totalPages} 頁`,
    ja: `${panel.pagination.totalPages} ページ中 ${panel.pagination.page} ページ`,
    ko: `${panel.pagination.totalPages}페이지 중 ${panel.pagination.page}페이지`,
    fr: `Page ${panel.pagination.page} sur ${panel.pagination.totalPages}`,
  });
  const paginationRangeLabel =
    panel.pagination.totalCount === 0
      ? pickLocaleText(selectedLocale, {
          en: 'No tenants are currently visible.',
          zh_HANS: '当前没有租户记录。',
          zh_HANT: '目前沒有可見的租戶記錄。',
          ja: '現在表示できるテナントはありません。',
          ko: '현재 표시할 테넌트가 없습니다.',
          fr: 'Aucun tenant n’est actuellement visible.',
        })
      : pickLocaleText(selectedLocale, {
          en: `Showing ${pageRange.start}-${pageRange.end} of ${panel.pagination.totalCount}`,
          zh_HANS: `显示第 ${pageRange.start}-${pageRange.end} 条，共 ${panel.pagination.totalCount} 条`,
          zh_HANT: `顯示第 ${pageRange.start}-${pageRange.end} 筆，共 ${panel.pagination.totalCount} 筆`,
          ja: `${panel.pagination.totalCount} 件中 ${pageRange.start}-${pageRange.end} 件を表示`,
          ko: `${panel.pagination.totalCount}개 중 ${pageRange.start}-${pageRange.end}개 표시`,
          fr: `Affichage de ${pageRange.start} à ${pageRange.end} sur ${panel.pagination.totalCount}`,
        });
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

  return (
    <div className="space-y-6">
      <GlassSurface className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {managementCopy.badge}
            </p>
            <h1 className="text-3xl font-semibold text-slate-950">{managementCopy.title}</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              {managementCopy.summaryDescription}
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {session?.tenantName || copy.currentAcTenantFallback}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label={managementCopy.visibleTenantsLabel}
              value={String(panel.data.length)}
              hint={managementCopy.visibleTenantsHint}
            />
            <SummaryCard label={managementCopy.active} value={String(activeCount)} hint={managementCopy.activeHint} />
            <SummaryCard label={managementCopy.acTierLabel} value={String(acCount)} hint={managementCopy.acTierHint} />
            <SummaryCard
              label={managementCopy.standardTierLabel}
              value={String(standardCount)}
              hint={managementCopy.standardTierHint}
            />
          </div>
        </div>
      </GlassSurface>

      {notice ? <NoticeBanner tone={notice.tone} message={notice.message} /> : null}

      <GlassSurface className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <Link
              href={`/ac/${acTenantId}/tenants/new`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              {managementCopy.createTenant}
            </Link>
            <label className="relative min-w-[18rem]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) =>
                  applyQueryState({
                    search: event.target.value,
                    page: 1,
                  })
                }
                placeholder={managementCopy.searchPlaceholder}
                className="w-full rounded-full border border-slate-200 bg-white/85 py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm text-slate-700">
              {managementCopy.tierFilter}
              <select
                value={tierFilter}
                onChange={(event) =>
                  applyQueryState({
                    tierFilter: event.target.value as TierFilter,
                    page: 1,
                  })
                }
                className="bg-transparent text-sm outline-none"
              >
                <option value="all">{filterCopy.all}</option>
                <option value="ac">AC</option>
                <option value="standard">{filterCopy.standard}</option>
              </select>
            </label>

            <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm text-slate-700">
              {managementCopy.statusFilter}
              <select
                value={activityFilter}
                onChange={(event) =>
                  applyQueryState({
                    activityFilter: event.target.value as ActivityFilter,
                    page: 1,
                  })
                }
                className="bg-transparent text-sm outline-none"
              >
                <option value="all">{filterCopy.all}</option>
                <option value="active">{managementCopy.activeStatus}</option>
                <option value="inactive">{managementCopy.inactiveStatus}</option>
              </select>
            </label>

            <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm text-slate-700">
              {pageSizeLabel}
              <select
                value={pageSize}
                onChange={(event) =>
                  applyQueryState({
                    pageSize: Number(event.target.value) as PageSizeOption,
                    page: 1,
                  })
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
        </div>
      </GlassSurface>

      <GlassSurface className="p-4">
        {panel.error ? <NoticeBanner tone="error" message={panel.error} /> : null}
        <TableShell
          columns={[
            managementCopy.tenantColumn,
            managementCopy.tierColumn,
            managementCopy.lifecycleColumn,
            managementCopy.statsColumn,
            managementCopy.updatedColumn,
            managementCopy.actionsColumn,
          ]}
          dataLength={panel.data.length}
          isLoading={panel.loading}
          isEmpty={!panel.loading && panel.data.length === 0}
          emptyTitle={managementCopy.emptyTitle}
          emptyDescription={managementCopy.emptyDescription}
        >
          {panel.data.map((tenant) => (
            <tr key={tenant.id} className="align-top">
              <td className="px-6 py-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">{tenant.name}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{tenant.code}</p>
                </div>
              </td>
              <td className="px-6 py-4">
                <ToneBadge
                  tone={tenant.tier === 'ac' ? 'info' : 'neutral'}
                  label={tenant.tier === 'ac' ? 'AC' : filterCopy.standard}
                />
              </td>
              <td className="px-6 py-4">
                <ToneBadge
                  tone={tenant.isActive ? 'success' : 'warning'}
                  label={tenant.isActive ? managementCopy.activeStatus : managementCopy.inactiveStatus}
                />
              </td>
              <td className="px-6 py-4 text-sm text-slate-600">
                <div className="space-y-1">
                  <p>{formatTenantMetric(tenant.stats.subsidiaryCount, 'subsidiaries', selectedLocale)}</p>
                  <p>{formatTenantMetric(tenant.stats.talentCount, 'talents', selectedLocale)}</p>
                  <p>{formatTenantMetric(tenant.stats.userCount, 'users', selectedLocale)}</p>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-slate-600">
                <div className="space-y-1">
                  <p>{formatDateTime(tenant.updatedAt, selectedLocale, managementCopy.updatedColumn)}</p>
                  <p className="text-xs text-slate-500">
                    {formatTenantCreatedAt(tenant.createdAt, selectedLocale, managementCopy.updatedColumn)}
                  </p>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/ac/${acTenantId}/tenants/${tenant.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <PenSquare className="h-3.5 w-3.5" />
                    {managementCopy.editTenant}
                  </Link>

                  {tenant.isActive ? (
                    <InlineActionButton
                      tone="danger"
                      onClick={() =>
                        setConfirmState({
                          title: `Deactivate ${tenant.name}?`,
                          description: copy.editor.deactivateDescription,
                          confirmText: copy.editor.deactivateSubmit,
                          intent: 'danger',
                          onConfirm: async () => {
                            await deactivateTenant(request, tenant.id, 'Deactivated from AC console');
                            await refreshTenants();
                            return `${tenant.name} ${copy.editor.successDeactivate}`;
                          },
                          errorFallback: copy.editor.deactivateError,
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {copy.editor.deactivateSubmit}
                    </InlineActionButton>
                  ) : (
                    <InlineActionButton
                      tone="primary"
                      onClick={() =>
                        setConfirmState({
                          title: `${copy.editor.reactivateSubmit}: ${tenant.name}?`,
                          description: copy.editor.reactivateDescription,
                          confirmText: copy.editor.reactivateSubmit,
                          intent: 'primary',
                          onConfirm: async () => {
                            await activateTenant(request, tenant.id);
                            await refreshTenants();
                            return `${tenant.name} ${copy.editor.successReactivate}`;
                          },
                          errorFallback: copy.editor.reactivateError,
                        })
                      }
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {copy.editor.reactivateSubmit}
                    </InlineActionButton>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </TableShell>

        <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-700">{paginationLabel}</p>
            <p className="text-xs text-slate-500">{paginationRangeLabel}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                applyQueryState({
                  page: Math.max(1, page - 1),
                })
              }
              disabled={!panel.pagination.hasPrev || panel.loading}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {previousPageLabel}
            </button>
            <button
              type="button"
              onClick={() =>
                applyQueryState({
                  page: page + 1,
                })
              }
              disabled={!panel.pagination.hasNext || panel.loading}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {nextPageLabel}
            </button>
          </div>
        </div>
      </GlassSurface>

      <ConfirmActionDialog
        open={Boolean(confirmState)}
        title={confirmState?.title || copy.confirmAction}
        description={confirmState?.description || ''}
        confirmText={confirmState?.confirmText || copy.confirmAction}
        intent={confirmState?.intent || 'danger'}
        isPending={confirmPending}
        onCancel={() => {
          if (!confirmPending) {
            setConfirmState(null);
          }
        }}
        onConfirm={() => void handleConfirm()}
      />
    </div>
  );
}
