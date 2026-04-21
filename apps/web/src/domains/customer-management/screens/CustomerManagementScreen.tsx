'use client';

import { resolveTrilingualLocaleFamily, type SupportedUiLocale } from '@tcrn/shared';
import { Plus, Search, UserMinus, UserRoundCheck, Users2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { startTransition, useDeferredValue, useEffect, useState } from 'react';

import {
  type CustomerListItem,
  deactivateCustomer,
  listCustomers,
  reactivateCustomer,
  readCustomerDetail,
} from '@/domains/customer-management/api/customer.api';
import {
  type ApiPaginationMeta,
  ApiRequestError,
  buildFallbackPagination,
} from '@/platform/http/api';
import { useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import {
  formatLocaleDateTime,
  formatLocaleNumber,
  pickLocaleText,
} from '@/platform/runtime/locale/locale-text';
import {
  getPaginationRange,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
  parsePageParam,
  parsePageSizeParam,
} from '@/platform/runtime/pagination/pagination';
import { useSession } from '@/platform/runtime/session/session-provider';
import { ConfirmActionDialog, GlassSurface, StateView, TableShell } from '@/platform/ui';

type ActivityFilter = 'all' | 'active' | 'inactive';
type MembershipFilter = 'all' | 'members' | 'non-members';

interface CustomersPanelState {
  data: CustomerListItem[];
  pagination: ApiPaginationMeta;
  loading: boolean;
  error: string | null;
}

interface NoticeState {
  tone: 'success' | 'error';
  message: string;
}

type DialogState =
  | {
      kind: 'deactivate';
      customerId: string;
      customerName: string;
      version: number;
      title: string;
      description: string;
      confirmText: string;
      pendingText: string;
      successMessage: string;
      errorFallback: string;
      intent: 'danger';
    }
  | {
      kind: 'reactivate';
      customerId: string;
      customerName: string;
      title: string;
      description: string;
      confirmText: string;
      pendingText: string;
      successMessage: string;
      errorFallback: string;
      intent: 'primary';
    };

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function getDateTimeFallback(locale: SupportedUiLocale) {
  return pickLocaleText(locale, {
    en: 'Never',
    zh_HANS: '从未',
    zh_HANT: '從未',
    ja: 'なし',
    ko: '없음',
    fr: 'Jamais',
  });
}

function formatCount(value: number, locale: SupportedUiLocale) {
  return formatLocaleNumber(locale, value);
}

function formatMembershipSummary(activeCount: number, totalCount: number, locale: SupportedUiLocale) {
  const active = formatCount(activeCount, locale);
  const total = formatCount(totalCount, locale);

  return pickLocaleText(locale, {
    en: `${active} active / ${total} total`,
    zh_HANS: `${active} 有效 / ${total} 总计`,
    zh_HANT: `${active} 有效 / ${total} 總計`,
    ja: `${active} 件有効 / 合計 ${total}`,
    ko: `${active} 활성 / 총 ${total}`,
    fr: `${active} actifs / ${total} au total`,
  });
}

function formatCompanyCustomerHint(value: number, locale: SupportedUiLocale) {
  const count = formatCount(value, locale);

  return pickLocaleText(locale, {
    en: `${count} visible profiles belong to company customers.`,
    zh_HANS: `当前可见档案中有 ${count} 个公司客户。`,
    zh_HANT: `目前可見檔案中有 ${count} 個公司客戶。`,
    ja: `表示中プロフィールのうち法人顧客は ${count} 件です。`,
    ko: `현재 표시된 프로필 중 ${count}건이 법인 고객입니다.`,
    fr: `${count} profils visibles appartiennent à des clients entreprise.`,
  });
}

function formatCreatedAt(value: string, locale: SupportedUiLocale) {
  const date = formatLocaleDateTime(locale, value, getDateTimeFallback(locale));

  return pickLocaleText(locale, {
    en: `Created ${date}`,
    zh_HANS: `创建于 ${date}`,
    zh_HANT: `建立於 ${date}`,
    ja: `${date} に作成`,
    ko: `${date} 생성`,
    fr: `Créé le ${date}`,
  });
}

function formatActionTitle(action: 'deactivate' | 'reactivate', customerName: string, locale: SupportedUiLocale) {
  return pickLocaleText(locale, {
    en: action === 'deactivate' ? `Deactivate ${customerName}?` : `Reactivate ${customerName}?`,
    zh_HANS: action === 'deactivate' ? `停用 ${customerName}？` : `重新激活 ${customerName}？`,
    zh_HANT: action === 'deactivate' ? `停用 ${customerName}？` : `重新啟用 ${customerName}？`,
    ja: action === 'deactivate' ? `${customerName} を無効化しますか？` : `${customerName} を再有効化しますか？`,
    ko: action === 'deactivate' ? `${customerName} 고객을 비활성화할까요?` : `${customerName} 고객을 다시 활성화할까요?`,
    fr: action === 'deactivate' ? `Désactiver ${customerName} ?` : `Réactiver ${customerName} ?`,
  });
}

function formatActionSuccess(action: 'deactivate' | 'reactivate', customerName: string, locale: SupportedUiLocale) {
  return pickLocaleText(locale, {
    en: action === 'deactivate'
      ? `${customerName} was deactivated.`
      : `${customerName} was reactivated.`,
    zh_HANS: action === 'deactivate' ? `${customerName} 已停用。` : `${customerName} 已重新激活。`,
    zh_HANT: action === 'deactivate' ? `${customerName} 已停用。` : `${customerName} 已重新啟用。`,
    ja: action === 'deactivate' ? `${customerName} を無効化しました。` : `${customerName} を再有効化しました。`,
    ko: action === 'deactivate' ? `${customerName} 고객을 비활성화했습니다.` : `${customerName} 고객을 다시 활성화했습니다.`,
    fr: action === 'deactivate' ? `${customerName} a été désactivé.` : `${customerName} a été réactivé.`,
  });
}

function getEffectiveSelectedLocale(
  currentLocale: 'en' | 'zh' | 'ja',
  selectedLocale: SupportedUiLocale | undefined,
): SupportedUiLocale {
  if (selectedLocale && resolveTrilingualLocaleFamily(selectedLocale) === currentLocale) {
    return selectedLocale;
  }

  return currentLocale === 'zh' ? 'zh_HANS' : currentLocale;
}

function parseActivityFilter(value: string | null): ActivityFilter {
  return value === 'active' || value === 'inactive' ? value : 'all';
}

function parseMembershipFilter(value: string | null): MembershipFilter {
  return value === 'members' || value === 'non-members' ? value : 'all';
}

function buildCustomerQueryState({
  search,
  activityFilter,
  membershipFilter,
  page,
  pageSize,
}: {
  search: string;
  activityFilter: ActivityFilter;
  membershipFilter: MembershipFilter;
  page: number;
  pageSize: PageSizeOption;
}) {
  const params = new URLSearchParams();
  const normalizedSearch = search.trim();

  if (normalizedSearch) {
    params.set('search', normalizedSearch);
  }

  if (activityFilter !== 'all') {
    params.set('activity', activityFilter);
  }

  if (membershipFilter !== 'all') {
    params.set('membership', membershipFilter);
  }

  if (page > 1) {
    params.set('page', String(page));
  }

  if (pageSize !== PAGE_SIZE_OPTIONS[0]) {
    params.set('pageSize', String(pageSize));
  }

  return params.toString();
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
  tone,
  label,
}: Readonly<{
  tone: 'success' | 'warning' | 'neutral' | 'danger';
  label: string;
}>) {
  const toneClasses =
    tone === 'success'
      ? 'bg-emerald-100 text-emerald-800'
      : tone === 'warning'
        ? 'bg-amber-100 text-amber-800'
        : tone === 'danger'
          ? 'bg-rose-100 text-rose-800'
          : 'bg-slate-100 text-slate-700';

  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${toneClasses}`}>{label}</span>;
}

function ActionButton({
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${toneClasses} disabled:cursor-not-allowed disabled:opacity-50`}
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

export function CustomerManagementScreen({
  tenantId,
  talentId,
}: Readonly<{
  tenantId: string;
  talentId: string;
}>) {
  const { copy, currentLocale: runtimeLocale, selectedLocale } = useRuntimeLocale();
  const currentLocale = getEffectiveSelectedLocale(runtimeLocale, selectedLocale);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { request, requestEnvelope, session } = useSession();
  const customerCopy = copy.customerManagement;
  const createdCustomerName = searchParams.get('created');
  const urlSearch = searchParams.get('search') ?? '';
  const urlActivityFilter = parseActivityFilter(searchParams.get('activity'));
  const urlMembershipFilter = parseMembershipFilter(searchParams.get('membership'));
  const urlPage = parsePageParam(searchParams.get('page'));
  const urlPageSize = parsePageSizeParam(searchParams.get('pageSize'));
  const [search, setSearch] = useState(urlSearch);
  const deferredSearch = useDeferredValue(search);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>(urlActivityFilter);
  const [membershipFilter, setMembershipFilter] = useState<MembershipFilter>(urlMembershipFilter);
  const [page, setPage] = useState(urlPage);
  const [pageSize, setPageSize] = useState<PageSizeOption>(urlPageSize);
  const [panel, setPanel] = useState<CustomersPanelState>({
    data: [],
    pagination: buildFallbackPagination(0, urlPage, urlPageSize),
    loading: true,
    error: null,
  });
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const [dialogPending, setDialogPending] = useState(false);
  const [preparingCustomerId, setPreparingCustomerId] = useState<string | null>(null);

  useEffect(() => {
    setSearch((current) => (current === urlSearch ? current : urlSearch));
    setActivityFilter((current) => (current === urlActivityFilter ? current : urlActivityFilter));
    setMembershipFilter((current) => (current === urlMembershipFilter ? current : urlMembershipFilter));
    setPage((current) => (current === urlPage ? current : urlPage));
    setPageSize((current) => (current === urlPageSize ? current : urlPageSize));
  }, [urlActivityFilter, urlMembershipFilter, urlPage, urlPageSize, urlSearch]);

  useEffect(() => {
    if (!createdCustomerName) {
      return;
    }

    setNotice({
      tone: 'success',
      message: pickLocaleText(currentLocale, {
        en: `${createdCustomerName} was created.`,
        zh_HANS: `${createdCustomerName} 已创建。`,
        zh_HANT: `${createdCustomerName} 已建立。`,
        ja: `${createdCustomerName} を作成しました。`,
        ko: `${createdCustomerName} 고객을 생성했습니다.`,
        fr: `${createdCustomerName} a été créé.`,
      }),
    });

    const params = new URLSearchParams(searchParams.toString());
    params.delete('created');
    const nextQuery = params.toString();
    const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname;

    startTransition(() => {
      router.replace(nextHref);
    });
  }, [createdCustomerName, currentLocale, pathname, router, searchParams]);

  function applyQueryState(
    nextState: Partial<{
      search: string;
      activityFilter: ActivityFilter;
      membershipFilter: MembershipFilter;
      page: number;
      pageSize: PageSizeOption;
    }>,
  ) {
    const nextSearch = nextState.search ?? search;
    const nextActivityFilter = nextState.activityFilter ?? activityFilter;
    const nextMembershipFilter = nextState.membershipFilter ?? membershipFilter;
    const nextPage = nextState.page ?? page;
    const nextPageSize = nextState.pageSize ?? pageSize;

    if (nextState.search !== undefined) {
      setSearch(nextSearch);
    }

    if (nextState.activityFilter !== undefined) {
      setActivityFilter(nextActivityFilter);
    }

    if (nextState.membershipFilter !== undefined) {
      setMembershipFilter(nextMembershipFilter);
    }

    if (nextState.page !== undefined) {
      setPage(nextPage);
    }

    if (nextState.pageSize !== undefined) {
      setPageSize(nextPageSize);
    }

    const nextQueryString = buildCustomerQueryState({
      search: nextSearch,
      activityFilter: nextActivityFilter,
      membershipFilter: nextMembershipFilter,
      page: nextPage,
      pageSize: nextPageSize,
    });

    const currentQueryString = buildCustomerQueryState({
      search,
      activityFilter,
      membershipFilter,
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

    async function loadCustomers() {
      setPanel((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      try {
        const result = await listCustomers(requestEnvelope, talentId, {
          page,
          pageSize,
          search: deferredSearch.trim() || undefined,
          isActive:
            activityFilter === 'all'
              ? undefined
              : activityFilter === 'active',
          hasMembership:
            membershipFilter === 'all'
              ? undefined
              : membershipFilter === 'members',
        });

        if (!cancelled) {
          setPanel({
            data: result.items,
            pagination: result.pagination,
            loading: false,
            error: null,
          });
        }
      } catch (reason) {
        if (!cancelled) {
          setPanel({
            data: [],
            pagination: buildFallbackPagination(0, page, pageSize),
            loading: false,
            error: getErrorMessage(reason, customerCopy.loadLedgerFallback),
          });
        }
      }
    }

    void loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [
    activityFilter,
    customerCopy.loadLedgerFallback,
    deferredSearch,
    membershipFilter,
    page,
    pageSize,
    requestEnvelope,
    talentId,
  ]);

  async function refreshCustomers() {
    const result = await listCustomers(requestEnvelope, talentId, {
      page,
      pageSize,
      search: deferredSearch.trim() || undefined,
      isActive:
        activityFilter === 'all'
          ? undefined
          : activityFilter === 'active',
      hasMembership:
        membershipFilter === 'all'
          ? undefined
          : membershipFilter === 'members',
    });

    setPanel({
      data: result.items,
      pagination: result.pagination,
      loading: false,
      error: null,
    });
  }

  async function prepareDeactivateDialog(customer: CustomerListItem) {
    setPreparingCustomerId(customer.id);
    setNotice(null);

    try {
      const detail = await readCustomerDetail(request, talentId, customer.id);
      setDialogState({
        kind: 'deactivate',
        customerId: customer.id,
        customerName: detail.nickname,
        version: detail.version,
        title: formatActionTitle('deactivate', detail.nickname, currentLocale),
        description: customerCopy.deactivateDescription,
        confirmText: customerCopy.deactivateConfirm,
        pendingText: customerCopy.deactivatePending,
        successMessage: formatActionSuccess('deactivate', detail.nickname, currentLocale),
        errorFallback: customerCopy.deactivateRequestFallback,
        intent: 'danger',
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, customerCopy.deactivateLoadFallback),
      });
    } finally {
      setPreparingCustomerId(null);
    }
  }

  async function handleConfirmAction() {
    if (!dialogState) {
      return;
    }

    setDialogPending(true);
    setNotice(null);

    try {
      if (dialogState.kind === 'deactivate') {
        await deactivateCustomer(request, talentId, dialogState.customerId, {
          version: dialogState.version,
        });
      } else {
        await reactivateCustomer(request, talentId, dialogState.customerId);
      }

      await refreshCustomers();
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

  const activeCount = panel.data.filter((item) => item.isActive).length;
  const membershipCount = panel.data.filter((item) => item.membershipSummary !== null).length;
  const companyCount = panel.data.filter((item) => item.profileType === 'company').length;
  const pageRange = getPaginationRange(panel.pagination, panel.data.length);
  const paginationLabel = pickLocaleText(currentLocale, {
    en: `Page ${panel.pagination.page} of ${panel.pagination.totalPages}`,
    zh_HANS: `第 ${panel.pagination.page} / ${panel.pagination.totalPages} 页`,
    zh_HANT: `第 ${panel.pagination.page} / ${panel.pagination.totalPages} 頁`,
    ja: `${panel.pagination.totalPages} ページ中 ${panel.pagination.page} ページ`,
    ko: `${panel.pagination.totalPages}페이지 중 ${panel.pagination.page}페이지`,
    fr: `Page ${panel.pagination.page} sur ${panel.pagination.totalPages}`,
  });
  const paginationRangeLabel =
    panel.pagination.totalCount === 0
      ? pickLocaleText(currentLocale, {
          en: 'No customers are currently visible.',
          zh_HANS: '当前没有客户记录。',
          zh_HANT: '目前沒有可見的客戶記錄。',
          ja: '現在表示できる顧客はありません。',
          ko: '현재 표시할 고객이 없습니다.',
          fr: 'Aucun client n’est actuellement visible.',
        })
      : pickLocaleText(currentLocale, {
          en: `Showing ${pageRange.start}-${pageRange.end} of ${panel.pagination.totalCount}`,
          zh_HANS: `显示第 ${pageRange.start}-${pageRange.end} 条，共 ${panel.pagination.totalCount} 条`,
          zh_HANT: `顯示第 ${pageRange.start}-${pageRange.end} 筆，共 ${panel.pagination.totalCount} 筆`,
          ja: `${panel.pagination.totalCount} 件中 ${pageRange.start}-${pageRange.end} 件を表示`,
          ko: `${panel.pagination.totalCount}개 중 ${pageRange.start}-${pageRange.end}개 표시`,
          fr: `Affichage de ${pageRange.start} à ${pageRange.end} sur ${panel.pagination.totalCount}`,
        });
  const pageSizeLabel = pickLocaleText(currentLocale, {
    en: 'Rows per page',
    zh_HANS: '每页条数',
    zh_HANT: '每頁筆數',
    ja: '1 ページの件数',
    ko: '페이지당 행 수',
    fr: 'Lignes par page',
  });
  const previousPageLabel = pickLocaleText(currentLocale, {
    en: 'Previous',
    zh_HANS: '上一页',
    zh_HANT: '上一頁',
    ja: '前へ',
    ko: '이전',
    fr: 'Précédent',
  });
  const nextPageLabel = pickLocaleText(currentLocale, {
    en: 'Next',
    zh_HANS: '下一页',
    zh_HANT: '下一頁',
    ja: '次へ',
    ko: '다음',
    fr: 'Suivant',
  });

  if (panel.loading && panel.data.length === 0) {
    return (
      <div className="space-y-6">
        <GlassSurface className="p-8">
          <p className="text-sm font-medium text-slate-500">{customerCopy.loading}</p>
        </GlassSurface>
      </div>
    );
  }

  if (panel.error && panel.data.length === 0) {
    return <StateView status="error" title={customerCopy.customerLedgerUnavailableTitle} description={panel.error} />;
  }

  return (
    <div className="space-y-6">
      <GlassSurface className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              <Users2 className="h-3.5 w-3.5" />
              {customerCopy.badge}
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-slate-950">{customerCopy.title}</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">{customerCopy.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/tenant/${tenantId}/talent/${talentId}/customers/new`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              {pickLocaleText(currentLocale, {
                en: 'Add customer',
                zh_HANS: '添加客户',
                zh_HANT: '新增客戶',
                ja: '顧客を追加',
                ko: '고객 추가',
                fr: 'Ajouter un client',
              })}
            </Link>
          </div>
        </div>
      </GlassSurface>

      <div className="grid gap-4 xl:grid-cols-4">
        <SummaryCard
          label={customerCopy.tenantLabel}
          value={session?.tenantName || customerCopy.currentTenantFallback}
          hint={customerCopy.tenantHint}
        />
        <SummaryCard
          label={customerCopy.visibleCustomersLabel}
          value={formatCount(panel.data.length, currentLocale)}
          hint={customerCopy.visibleCustomersHint}
        />
        <SummaryCard
          label={customerCopy.activeProfilesLabel}
          value={formatCount(activeCount, currentLocale)}
          hint={customerCopy.activeProfilesHint}
        />
        <SummaryCard
          label={customerCopy.membershipRecordsLabel}
          value={formatCount(membershipCount, currentLocale)}
          hint={formatCompanyCustomerHint(companyCount, currentLocale)}
        />
      </div>

      {notice ? <NoticeBanner tone={notice.tone} message={notice.message} /> : null}

      <GlassSurface className="p-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative min-w-[260px] flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) =>
                  applyQueryState({
                    search: event.target.value,
                    page: 1,
                  })
                }
                placeholder={customerCopy.searchPlaceholder}
                className="w-full rounded-2xl border border-slate-200 bg-white/85 py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'active', 'inactive'] as const).map((candidate) => {
                const isActive = activityFilter === candidate;

                return (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() =>
                      applyQueryState({
                        activityFilter: candidate,
                        page: 1,
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition ${
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white/85 text-slate-700 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    {candidate === 'all'
                      ? customerCopy.activityAll
                      : candidate === 'active'
                        ? customerCopy.activityActive
                        : customerCopy.activityInactive}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {([
                { key: 'all', label: customerCopy.membershipAll },
                { key: 'members', label: customerCopy.membershipOnlyMembers },
                { key: 'non-members', label: customerCopy.membershipOnlyNonMembers },
              ] as const).map((candidate) => {
                const isActive = membershipFilter === candidate.key;

                return (
                  <button
                    key={candidate.key}
                    type="button"
                    onClick={() =>
                      applyQueryState({
                        membershipFilter: candidate.key,
                        page: 1,
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition ${
                      isActive
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-200 bg-white/85 text-slate-700 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    {candidate.label}
                  </button>
                );
              })}
            </div>

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

          {panel.error ? (
            <StateView status="error" title={customerCopy.customerLedgerUnavailableTitle} description={panel.error} />
          ) : (
            <>
              <TableShell
                columns={[
                  customerCopy.customerColumn,
                  customerCopy.profileTypeColumn,
                  customerCopy.statusColumn,
                  customerCopy.membershipColumn,
                  customerCopy.updatedColumn,
                  customerCopy.actionsColumn,
                ]}
                dataLength={panel.data.length}
                isLoading={panel.loading}
                isEmpty={!panel.loading && panel.data.length === 0}
                emptyTitle={customerCopy.emptyTitle}
                emptyDescription={customerCopy.emptyDescription}
              >
                {panel.data.map((customer) => (
                  <tr key={customer.id} className="align-top">
                    <td className="px-6 py-4 text-sm text-slate-700">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{customer.nickname}</p>
                        <p className="text-xs text-slate-500">
                          {customer.companyShortName || customer.originTalent?.displayName || customerCopy.directCustomerRecord}
                        </p>
                        {customer.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {customer.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        tone={customer.profileType === 'company' ? 'warning' : 'neutral'}
                        label={
                          customer.profileType === 'company'
                            ? customerCopy.profileTypeCompany
                            : customerCopy.profileTypeIndividual
                        }
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <StatusBadge
                          tone={customer.isActive ? 'success' : 'danger'}
                          label={customer.status?.name || (customer.isActive ? customerCopy.statusActive : customerCopy.statusInactive)}
                        />
                        <p className="text-xs text-slate-500">{customer.primaryLanguage || customerCopy.languageUnset}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {customer.membershipSummary ? (
                        <div className="space-y-1">
                          <p className="font-medium text-slate-900">
                            {customer.membershipSummary.highestLevel.platformName} {customer.membershipSummary.highestLevel.levelName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatMembershipSummary(
                              customer.membershipSummary.activeCount,
                              customer.membershipSummary.totalCount,
                              currentLocale,
                            )}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-500">{customerCopy.membershipNone}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="space-y-1">
                        <p>{formatLocaleDateTime(currentLocale, customer.updatedAt, getDateTimeFallback(currentLocale))}</p>
                        <p className="text-xs text-slate-500">{formatCreatedAt(customer.createdAt, currentLocale)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {customer.isActive ? (
                        <ActionButton
                          tone="danger"
                          disabled={preparingCustomerId === customer.id}
                          onClick={() => void prepareDeactivateDialog(customer)}
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          {preparingCustomerId === customer.id ? customerCopy.deactivatePending : customerCopy.deactivateLabel}
                        </ActionButton>
                      ) : (
                        <ActionButton
                          tone="primary"
                          onClick={() =>
                            setDialogState({
                              kind: 'reactivate',
                              customerId: customer.id,
                              customerName: customer.nickname,
                              title: formatActionTitle('reactivate', customer.nickname, currentLocale),
                              description: customerCopy.reactivateDescription,
                              confirmText: customerCopy.reactivateConfirm,
                              pendingText: customerCopy.reactivatePending,
                              successMessage: formatActionSuccess('reactivate', customer.nickname, currentLocale),
                              errorFallback: customerCopy.reactivateRequestFallback,
                              intent: 'primary',
                            })
                          }
                        >
                          <UserRoundCheck className="h-3.5 w-3.5" />
                          {customerCopy.reactivateLabel}
                        </ActionButton>
                      )}
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
            </>
          )}
        </div>
      </GlassSurface>

      <ConfirmActionDialog
        open={dialogState !== null}
        title={dialogState?.title || ''}
        description={dialogState?.description || ''}
        confirmText={dialogState?.confirmText}
        pendingText={dialogState?.pendingText}
        intent={dialogState?.intent}
        isPending={dialogPending}
        onCancel={() => {
          if (!dialogPending) {
            setDialogState(null);
          }
        }}
        onConfirm={() => void handleConfirmAction()}
      />
    </div>
  );
}
