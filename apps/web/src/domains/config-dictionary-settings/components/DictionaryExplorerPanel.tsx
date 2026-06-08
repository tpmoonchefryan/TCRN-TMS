'use client';

import type { SupportedUiLocale } from '@tcrn/shared';
import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Fragment, startTransition, useEffect, useMemo, useState } from 'react';

import {
  type DictionaryItemRecord,
  type DictionaryTypeSummary,
  listDictionaryItems,
  type RequestEnvelopeFn,
  type RequestFn,
} from '@/domains/config-dictionary-settings/api/system-dictionary.api';
import { type ApiPaginationMeta, ApiRequestError } from '@/platform/http/api';
import { formatLocaleDateTime, pickLocaleText } from '@/platform/runtime/locale/locale-text';
import {
  buildPaginationMeta,
  getPaginationRange,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
  parsePageParam,
  parsePageSizeParam,
} from '@/platform/runtime/pagination/pagination';
import { PaginationFooter, StateView, TableShell } from '@/platform/ui';

interface DictionaryItemsState {
  dictionaryTypeCode: string | null;
  data: DictionaryItemRecord[];
  pagination: ApiPaginationMeta;
  error: string | null;
  loading: boolean;
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function formatDateTime(locale: SupportedUiLocale, value: string) {
  return formatLocaleDateTime(locale, value, value);
}

export interface DictionaryExplorerPanelCopy {
  codeColumn: string;
  localizedNameColumn: string;
  statusColumn: string;
  updatedColumn: string;
  actionsColumn: string;
  defaultItemsTitle: string;
  defaultItemsDescription: string;
  searchAriaLabel: string;
  searchPlaceholder: string;
  includeInactiveAriaLabel: string;
  includeInactiveLabel: string;
  itemsUnavailableTitle: string;
  itemsUnavailableFallback: string;
  emptyItemsTitle: string;
  emptyItemsFilteredDescription: string;
  emptyItemsDefaultDescription: string;
  activeStatus: string;
  inactiveStatus: string;
  versionPrefix: string;
}

const DEFAULT_COPY: DictionaryExplorerPanelCopy = {
  codeColumn: 'Code',
  localizedNameColumn: 'Localized Name',
  statusColumn: 'Status',
  updatedColumn: 'Updated',
  actionsColumn: 'Actions',
  defaultItemsTitle: 'Dictionary items',
  defaultItemsDescription:
    'Browse the stable controlled vocabulary used across downstream modules.',
  searchAriaLabel: 'Search dictionary items',
  searchPlaceholder: 'Search code or localized name',
  includeInactiveAriaLabel: 'Include inactive dictionary items',
  includeInactiveLabel: 'Include inactive',
  itemsUnavailableTitle: 'Dictionary items unavailable',
  itemsUnavailableFallback: 'Failed to load dictionary items.',
  emptyItemsTitle: 'No dictionary items found',
  emptyItemsFilteredDescription: 'No item matches the current search.',
  emptyItemsDefaultDescription: 'This dictionary type does not contain any visible items yet.',
  activeStatus: 'Active',
  inactiveStatus: 'Inactive',
  versionPrefix: 'v',
};

function resolveDictionaryExplorerTypeCode(
  types: readonly DictionaryTypeSummary[],
  requestedTypeCode: string | null
) {
  if (requestedTypeCode && types.some((entry) => entry.type === requestedTypeCode)) {
    return requestedTypeCode;
  }

  return types[0]?.type ?? null;
}

function parseDictionaryIncludeInactiveParam(value: string | null, fallback: boolean) {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return fallback;
}

function buildDictionaryExplorerQueryState(
  searchParams: { toString(): string },
  {
    defaultTypeCode,
    includeInactive,
    includeInactiveDefault,
    page,
    pageSize,
    retainDefaultQueryState = false,
    search,
    typeCode,
  }: {
    defaultTypeCode: string | null;
    includeInactive: boolean;
    includeInactiveDefault: boolean;
    page: number;
    pageSize: PageSizeOption;
    retainDefaultQueryState?: boolean;
    search: string;
    typeCode: string | null;
  }
) {
  const params = new URLSearchParams(searchParams.toString());
  const shouldRetainType = retainDefaultQueryState && params.has('dictionaryType');
  const shouldRetainPage = retainDefaultQueryState && params.has('dictionaryPage');
  const shouldRetainPageSize = retainDefaultQueryState && params.has('dictionaryPageSize');
  const normalizedSearch = search.trim();

  params.delete('dictionaryType');
  params.delete('dictionarySearch');
  params.delete('dictionaryInactive');
  params.delete('dictionaryPage');
  params.delete('dictionaryPageSize');

  if (typeCode && (typeCode !== defaultTypeCode || shouldRetainType)) {
    params.set('dictionaryType', typeCode);
  }

  if (normalizedSearch) {
    params.set('dictionarySearch', normalizedSearch);
  }

  if (includeInactive !== includeInactiveDefault) {
    params.set('dictionaryInactive', String(includeInactive));
  }

  if (page > 1 || shouldRetainPage) {
    params.set('dictionaryPage', String(page));
  }

  if (pageSize !== PAGE_SIZE_OPTIONS[0] || shouldRetainPageSize) {
    params.set('dictionaryPageSize', String(pageSize));
  }

  return params.toString();
}

export interface DictionaryExplorerPanelProps {
  request: RequestFn;
  requestEnvelope: RequestEnvelopeFn;
  types: DictionaryTypeSummary[];
  emptyTitle?: string;
  emptyDescription?: string;
  locale?: SupportedUiLocale;
  copy?: DictionaryExplorerPanelCopy;
  intro?: React.ReactNode;
  renderToolbar?: (selectedType: DictionaryTypeSummary | null) => React.ReactNode;
  renderItemActions?: (item: DictionaryItemRecord) => React.ReactNode;
  onTypeSelected?: (type: DictionaryTypeSummary | null) => void;
  refreshToken?: number;
  includeInactiveByDefault?: boolean;
  allowIncludeInactiveToggle?: boolean;
  retainDefaultQueryState?: boolean;
}

export function DictionaryExplorerPanel({
  request: _request,
  requestEnvelope,
  types,
  emptyTitle = 'No dictionary types returned',
  emptyDescription = 'The dictionary catalog is currently empty.',
  locale = 'en',
  copy = DEFAULT_COPY,
  intro,
  renderToolbar,
  renderItemActions,
  onTypeSelected,
  refreshToken = 0,
  includeInactiveByDefault = false,
  allowIncludeInactiveToggle = false,
  retainDefaultQueryState = false,
}: Readonly<DictionaryExplorerPanelProps>) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTypeCode = types[0]?.type ?? null;
  const urlSelectedTypeCode = resolveDictionaryExplorerTypeCode(
    types,
    searchParams.get('dictionaryType')
  );
  const urlSearch = searchParams.get('dictionarySearch') ?? '';
  const urlIncludeInactive = parseDictionaryIncludeInactiveParam(
    searchParams.get('dictionaryInactive'),
    includeInactiveByDefault
  );
  const urlPage = parsePageParam(searchParams.get('dictionaryPage'));
  const urlPageSize = parsePageSizeParam(searchParams.get('dictionaryPageSize'));
  const [selectedTypeCode, setSelectedTypeCode] = useState<string | null>(urlSelectedTypeCode);
  const [search, setSearch] = useState(urlSearch);
  const [includeInactive, setIncludeInactive] = useState(urlIncludeInactive);
  const [page, setPage] = useState(urlPage);
  const [pageSize, setPageSize] = useState<PageSizeOption>(urlPageSize);
  const [itemsPanel, setItemsPanel] = useState<DictionaryItemsState>({
    dictionaryTypeCode: null,
    data: [],
    pagination: buildPaginationMeta(0, 1, PAGE_SIZE_OPTIONS[0]),
    error: null,
    loading: false,
  });

  const selectedType = useMemo(
    () => types.find((entry) => entry.type === selectedTypeCode) ?? null,
    [selectedTypeCode, types]
  );

  useEffect(() => {
    setSelectedTypeCode((current) =>
      current === urlSelectedTypeCode ? current : urlSelectedTypeCode
    );
    setSearch((current) => (current === urlSearch ? current : urlSearch));
    setIncludeInactive((current) =>
      current === urlIncludeInactive ? current : urlIncludeInactive
    );
    setPage((current) => (current === urlPage ? current : urlPage));
    setPageSize((current) => (current === urlPageSize ? current : urlPageSize));
  }, [urlIncludeInactive, urlPage, urlPageSize, urlSearch, urlSelectedTypeCode]);

  function applyDictionaryQueryState(
    nextState: Partial<{
      includeInactive: boolean;
      page: number;
      pageSize: PageSizeOption;
      search: string;
      typeCode: string | null;
    }>
  ) {
    const nextTypeCode = resolveDictionaryExplorerTypeCode(
      types,
      nextState.typeCode !== undefined ? nextState.typeCode : selectedTypeCode
    );
    const nextSearch = nextState.search ?? search;
    const nextIncludeInactive = nextState.includeInactive ?? includeInactive;
    const nextPage = nextState.page ?? page;
    const nextPageSize = nextState.pageSize ?? pageSize;

    if (nextState.typeCode !== undefined) {
      setSelectedTypeCode(nextTypeCode);
    }

    if (nextState.search !== undefined) {
      setSearch(nextSearch);
    }

    if (nextState.includeInactive !== undefined) {
      setIncludeInactive(nextIncludeInactive);
    }

    if (nextState.page !== undefined) {
      setPage(nextPage);
    }

    if (nextState.pageSize !== undefined) {
      setPageSize(nextPageSize);
    }

    const nextQueryString = buildDictionaryExplorerQueryState(searchParams, {
      defaultTypeCode,
      includeInactive: nextIncludeInactive,
      includeInactiveDefault: includeInactiveByDefault,
      page: nextPage,
      pageSize: nextPageSize,
      retainDefaultQueryState,
      search: nextSearch,
      typeCode: nextTypeCode,
    });
    const currentQueryString = buildDictionaryExplorerQueryState(searchParams, {
      defaultTypeCode,
      includeInactive,
      includeInactiveDefault: includeInactiveByDefault,
      page,
      pageSize,
      retainDefaultQueryState,
      search,
      typeCode: selectedTypeCode,
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
    onTypeSelected?.(selectedType);
  }, [onTypeSelected, selectedType]);

  useEffect(() => {
    if (
      !itemsPanel.loading &&
      itemsPanel.dictionaryTypeCode === selectedType?.type &&
      page !== itemsPanel.pagination.page &&
      !(retainDefaultQueryState && searchParams.has('dictionaryPage'))
    ) {
      const nextPage = itemsPanel.pagination.page;
      setPage(nextPage);

      const nextQueryString = buildDictionaryExplorerQueryState(searchParams, {
        defaultTypeCode,
        includeInactive,
        includeInactiveDefault: includeInactiveByDefault,
        page: nextPage,
        pageSize,
        retainDefaultQueryState,
        search,
        typeCode: selectedTypeCode,
      });
      const currentQueryString = buildDictionaryExplorerQueryState(searchParams, {
        defaultTypeCode,
        includeInactive,
        includeInactiveDefault: includeInactiveByDefault,
        page,
        pageSize,
        retainDefaultQueryState,
        search,
        typeCode: selectedTypeCode,
      });

      if (nextQueryString !== currentQueryString) {
        const nextHref = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
        startTransition(() => {
          router.replace(nextHref);
        });
      }
    }
  }, [
    defaultTypeCode,
    includeInactive,
    includeInactiveByDefault,
    itemsPanel.dictionaryTypeCode,
    itemsPanel.loading,
    itemsPanel.pagination.page,
    page,
    pageSize,
    pathname,
    retainDefaultQueryState,
    router,
    search,
    searchParams,
    selectedType?.type,
    selectedTypeCode,
  ]);

  useEffect(() => {
    if (!selectedType) {
      setItemsPanel({
        dictionaryTypeCode: null,
        data: [],
        pagination: buildPaginationMeta(0, 1, pageSize),
        error: null,
        loading: false,
      });
      return;
    }

    const selectedTypeCode = selectedType.type;
    let cancelled = false;

    async function loadItems() {
      setItemsPanel((current) => {
        const shouldRetainData = current.dictionaryTypeCode === selectedTypeCode;

        return {
          dictionaryTypeCode: selectedTypeCode,
          data: shouldRetainData ? current.data : [],
          pagination: shouldRetainData
            ? current.pagination
            : buildPaginationMeta(0, page, pageSize),
          error: null,
          loading: true,
        };
      });

      try {
        const response = await listDictionaryItems(
          requestEnvelope,
          selectedTypeCode,
          {
            includeInactive,
            page,
            pageSize,
            search: search.trim() || undefined,
          },
          locale
        );

        if (cancelled) {
          return;
        }

        setItemsPanel({
          dictionaryTypeCode: selectedTypeCode,
          data: response.items,
          pagination: response.pagination,
          error: null,
          loading: false,
        });
      } catch (reason) {
        if (cancelled) {
          return;
        }

        setItemsPanel({
          dictionaryTypeCode: selectedTypeCode,
          data: [],
          pagination: buildPaginationMeta(0, page, pageSize),
          error: getErrorMessage(reason, copy.itemsUnavailableFallback),
          loading: false,
        });
      }
    }

    void loadItems();

    return () => {
      cancelled = true;
    };
  }, [
    copy.itemsUnavailableFallback,
    includeInactive,
    locale,
    page,
    pageSize,
    refreshToken,
    requestEnvelope,
    search,
    selectedType,
  ]);

  if (types.length === 0) {
    return <StateView status="empty" title={emptyTitle} description={emptyDescription} />;
  }

  const pageRange = getPaginationRange(itemsPanel.pagination, itemsPanel.data.length);
  const paginationCopy = {
    page: pickLocaleText(locale, {
      en: `Page ${itemsPanel.pagination.page} of ${itemsPanel.pagination.totalPages}`,
      zh_HANS: `第 ${itemsPanel.pagination.page} / ${itemsPanel.pagination.totalPages} 页`,
      zh_HANT: `第 ${itemsPanel.pagination.page} / ${itemsPanel.pagination.totalPages} 页`,
      ja: `${itemsPanel.pagination.totalPages} ページ中 ${itemsPanel.pagination.page} ページ`,
      ko: `Page ${itemsPanel.pagination.page} of ${itemsPanel.pagination.totalPages}`,
      fr: `Page ${itemsPanel.pagination.page} of ${itemsPanel.pagination.totalPages}`,
    }),
    range:
      itemsPanel.pagination.totalCount === 0
        ? pickLocaleText(locale, {
            en: 'No dictionary items available.',
            zh_HANS: '当前没有词典项。',
            zh_HANT: '当前没有词典项。',
            ja: '辞書項目はありません。',
            ko: 'No dictionary items available.',
            fr: 'No dictionary items available.',
          })
        : pickLocaleText(locale, {
            en: `Showing ${pageRange.start}-${pageRange.end} of ${itemsPanel.pagination.totalCount}`,
            zh_HANS: `显示第 ${pageRange.start}-${pageRange.end} 条，共 ${itemsPanel.pagination.totalCount} 条`,
            zh_HANT: `显示第 ${pageRange.start}-${pageRange.end} 条，共 ${itemsPanel.pagination.totalCount} 条`,
            ja: `${itemsPanel.pagination.totalCount} 件中 ${pageRange.start}-${pageRange.end} 件を表示`,
            ko: `Showing ${pageRange.start}-${pageRange.end} of ${itemsPanel.pagination.totalCount}`,
            fr: `Showing ${pageRange.start}-${pageRange.end} of ${itemsPanel.pagination.totalCount}`,
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

  const columns = renderItemActions
    ? [
        copy.codeColumn,
        copy.localizedNameColumn,
        copy.statusColumn,
        copy.updatedColumn,
        copy.actionsColumn,
      ]
    : [copy.codeColumn, copy.localizedNameColumn, copy.statusColumn, copy.updatedColumn];

  return (
    <div className="min-w-0 space-y-5">
      {intro ? <div className="min-w-0 text-sm leading-6 break-words text-slate-600">{intro}</div> : null}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(16rem,20rem)_1fr]">
        <div className="min-w-0 space-y-3">
          {types.map((dictionaryType) => {
            const isActive = dictionaryType.type === selectedTypeCode;

            return (
              <button
                key={dictionaryType.type}
                type="button"
                onClick={() => {
                  applyDictionaryQueryState({ page: 1, typeCode: dictionaryType.type });
                }}
                className={`w-full min-w-0 rounded-2xl border px-4 py-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isActive
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-950 shadow-sm'
                    : 'border-slate-200 bg-white/80 text-slate-900 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold break-words">{dictionaryType.name}</p>
                    <p className="text-xs break-all tracking-[0.18em] text-slate-500 uppercase">
                      {dictionaryType.type}
                    </p>
                  </div>
                  <span className="max-w-full rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {dictionaryType.count}
                  </span>
                </div>
                {dictionaryType.description ? (
                  <p className="mt-3 text-sm leading-6 break-words text-slate-600">
                    {dictionaryType.description}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <p className="text-lg font-semibold text-slate-950">
                {selectedType?.name || copy.defaultItemsTitle}
              </p>
              <p className="text-sm leading-6 break-words text-slate-600">
                {selectedType?.description || copy.defaultItemsDescription}
              </p>
            </div>
            {renderToolbar ? (
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                {renderToolbar(selectedType)}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="relative block min-w-0 flex-1 basis-full sm:basis-72">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                aria-label={copy.searchAriaLabel}
                value={search}
                onChange={(event) => {
                  applyDictionaryQueryState({ page: 1, search: event.target.value });
                }}
                placeholder={copy.searchPlaceholder}
                className="w-full rounded-xl border border-slate-300 bg-white/85 py-2.5 pr-3 pl-10 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 focus:outline-none"
              />
            </label>

            {allowIncludeInactiveToggle ? (
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
                <input
                  aria-label={copy.includeInactiveAriaLabel}
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(event) => {
                    applyDictionaryQueryState({ includeInactive: event.target.checked, page: 1 });
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                />
                {copy.includeInactiveLabel}
              </label>
            ) : null}
          </div>

          {itemsPanel.error ? (
            <StateView
              status="error"
              title={copy.itemsUnavailableTitle}
              description={itemsPanel.error}
            />
          ) : (
            <Fragment>
              <TableShell
                ariaLabel={copy.defaultItemsTitle}
                columns={columns}
                tableClassName="table-fixed [overflow-wrap:anywhere]"
                dataLength={itemsPanel.data.length}
                isLoading={itemsPanel.loading}
                isEmpty={!itemsPanel.loading && itemsPanel.data.length === 0}
                emptyTitle={copy.emptyItemsTitle}
                emptyDescription={
                  search.trim().length > 0
                    ? copy.emptyItemsFilteredDescription
                    : copy.emptyItemsDefaultDescription
                }
              >
                {itemsPanel.data.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold break-all text-slate-950">{item.code}</p>
                        <p className="text-xs tracking-[0.18em] break-words text-slate-500 uppercase">
                          {copy.versionPrefix}
                          {item.version}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold break-words text-slate-950">
                          {item.localizedName}
                        </p>
                        <p className="text-xs break-words text-slate-500">{item.name.en}</p>
                        {item.localizedDescription ? (
                          <p className="text-sm leading-6 break-words text-slate-600">
                            {item.localizedDescription}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                          item.isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {item.isActive ? copy.activeStatus : copy.inactiveStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDateTime(locale, item.updatedAt)}
                    </td>
                    {renderItemActions ? (
                      <td className="px-6 py-4">{renderItemActions(item)}</td>
                    ) : null}
                  </tr>
                ))}
              </TableShell>
              <PaginationFooter
                pagination={itemsPanel.pagination}
                itemCount={itemsPanel.data.length}
                labels={{
                  pageLabel: paginationCopy.page,
                  rangeLabel: paginationCopy.range,
                  rowsPerPageLabel: paginationCopy.pageSize,
                  pageSizeAriaLabel: paginationCopy.pageSize,
                  previousLabel: paginationCopy.previous,
                  nextLabel: paginationCopy.next,
                }}
                onPageChange={(nextPage) => applyDictionaryQueryState({ page: nextPage })}
                onPageSizeChange={(nextPageSize) => {
                  applyDictionaryQueryState({
                    page: 1,
                    pageSize: nextPageSize as PageSizeOption,
                  });
                }}
                isLoading={itemsPanel.loading}
                className="rounded-2xl border border-slate-200 bg-white/85 shadow-sm"
              />
            </Fragment>
          )}
        </div>
      </div>
    </div>
  );
}
