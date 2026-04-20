'use client';

import type { SupportedUiLocale } from '@tcrn/shared';
import { Search } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';

import {
  type DictionaryItemRecord,
  type DictionaryTypeSummary,
  listDictionaryItems,
  type RequestEnvelopeFn,
  type RequestFn,
} from '@/domains/config-dictionary-settings/api/system-dictionary.api';
import { type ApiPaginationMeta, ApiRequestError } from '@/platform/http/api';
import type { RuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import {
  formatLocaleDateTime,
  pickLocaleText,
} from '@/platform/runtime/locale/locale-text';
import {
  buildPaginationMeta,
  getPaginationRange,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
} from '@/platform/runtime/pagination/pagination';
import { StateView, TableShell } from '@/platform/ui';

interface DictionaryItemsState {
  data: DictionaryItemRecord[];
  pagination: ApiPaginationMeta;
  error: string | null;
  loading: boolean;
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function formatDateTime(locale: SupportedUiLocale | RuntimeLocale, value: string) {
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
  englishLabel: string;
  chineseLabel: string;
  japaneseLabel: string;
}

const DEFAULT_COPY: DictionaryExplorerPanelCopy = {
  codeColumn: 'Code',
  localizedNameColumn: 'Localized Name',
  statusColumn: 'Status',
  updatedColumn: 'Updated',
  actionsColumn: 'Actions',
  defaultItemsTitle: 'Dictionary items',
  defaultItemsDescription: 'Browse the stable controlled vocabulary used across downstream modules.',
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
  englishLabel: 'EN',
  chineseLabel: 'ZH',
  japaneseLabel: 'JA',
};

export interface DictionaryExplorerPanelProps {
  request: RequestFn;
  requestEnvelope: RequestEnvelopeFn;
  types: DictionaryTypeSummary[];
  emptyTitle?: string;
  emptyDescription?: string;
  locale?: SupportedUiLocale | RuntimeLocale;
  copy?: DictionaryExplorerPanelCopy;
  intro?: React.ReactNode;
  renderToolbar?: (selectedType: DictionaryTypeSummary | null) => React.ReactNode;
  renderItemActions?: (item: DictionaryItemRecord) => React.ReactNode;
  onTypeSelected?: (type: DictionaryTypeSummary | null) => void;
  refreshToken?: number;
  includeInactiveByDefault?: boolean;
  allowIncludeInactiveToggle?: boolean;
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
}: Readonly<DictionaryExplorerPanelProps>) {
  const [selectedTypeCode, setSelectedTypeCode] = useState<string | null>(types[0]?.type ?? null);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(includeInactiveByDefault);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(PAGE_SIZE_OPTIONS[0]);
  const [itemsPanel, setItemsPanel] = useState<DictionaryItemsState>({
    data: [],
    pagination: buildPaginationMeta(0, 1, PAGE_SIZE_OPTIONS[0]),
    error: null,
    loading: false,
  });

  const selectedType = useMemo(
    () => types.find((entry) => entry.type === selectedTypeCode) ?? null,
    [selectedTypeCode, types],
  );

  useEffect(() => {
    if (types.length === 0) {
      setSelectedTypeCode(null);
      return;
    }

    if (selectedTypeCode && types.some((entry) => entry.type === selectedTypeCode)) {
      return;
    }

    setSelectedTypeCode(types[0]?.type ?? null);
  }, [selectedTypeCode, types]);

  useEffect(() => {
    onTypeSelected?.(selectedType);
  }, [onTypeSelected, selectedType]);

  useEffect(() => {
    setPage(1);
  }, [includeInactive, search, selectedTypeCode]);

  useEffect(() => {
    if (!selectedType) {
      setItemsPanel({
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
      setItemsPanel((current) => ({
        ...current,
        error: null,
        loading: true,
      }));

      try {
        const response = await listDictionaryItems(requestEnvelope, selectedTypeCode, {
          includeInactive,
          page,
          pageSize,
          search: search.trim() || undefined,
        });

        if (cancelled) {
          return;
        }

        setItemsPanel({
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
  }, [copy.itemsUnavailableFallback, includeInactive, page, pageSize, refreshToken, requestEnvelope, search, selectedType]);

  if (types.length === 0) {
    return <StateView status="empty" title={emptyTitle} description={emptyDescription} />;
  }

  const pageRange = getPaginationRange(itemsPanel.pagination, itemsPanel.data.length);
  const paginationCopy = {
    page: pickLocaleText(locale, {
      en: `Page ${itemsPanel.pagination.page} of ${itemsPanel.pagination.totalPages}`,
      zh: `第 ${itemsPanel.pagination.page} / ${itemsPanel.pagination.totalPages} 页`,
      ja: `${itemsPanel.pagination.totalPages} ページ中 ${itemsPanel.pagination.page} ページ`,
    }),
    range:
      itemsPanel.pagination.totalCount === 0
        ? pickLocaleText(locale, {
            en: 'No dictionary items available.',
            zh: '当前没有词典项。',
            ja: '辞書項目はありません。',
          })
        : pickLocaleText(locale, {
            en: `Showing ${pageRange.start}-${pageRange.end} of ${itemsPanel.pagination.totalCount}`,
            zh: `显示第 ${pageRange.start}-${pageRange.end} 条，共 ${itemsPanel.pagination.totalCount} 条`,
            ja: `${itemsPanel.pagination.totalCount} 件中 ${pageRange.start}-${pageRange.end} 件を表示`,
          }),
    pageSize: pickLocaleText(locale, {
      en: 'Rows per page',
      zh: '每页条目',
      ja: '表示件数',
    }),
    previous: pickLocaleText(locale, {
      en: 'Previous',
      zh: '上一页',
      ja: '前へ',
    }),
    next: pickLocaleText(locale, {
      en: 'Next',
      zh: '下一页',
      ja: '次へ',
    }),
  };

  const columns = renderItemActions
    ? [copy.codeColumn, copy.localizedNameColumn, copy.statusColumn, copy.updatedColumn, copy.actionsColumn]
    : [copy.codeColumn, copy.localizedNameColumn, copy.statusColumn, copy.updatedColumn];

  return (
    <div className="space-y-5">
      {intro ? <div className="text-sm leading-6 text-slate-600">{intro}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(16rem,20rem)_1fr]">
        <div className="space-y-3">
          {types.map((dictionaryType) => {
            const isActive = dictionaryType.type === selectedTypeCode;

            return (
              <button
                key={dictionaryType.type}
                type="button"
                onClick={() => {
                  setSelectedTypeCode(dictionaryType.type);
                }}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isActive
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-950 shadow-sm'
                    : 'border-slate-200 bg-white/80 text-slate-900 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{dictionaryType.name}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{dictionaryType.type}</p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {dictionaryType.count}
                  </span>
                </div>
                {dictionaryType.description ? (
                  <p className="mt-3 text-sm leading-6 text-slate-600">{dictionaryType.description}</p>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-lg font-semibold text-slate-950">{selectedType?.name || copy.defaultItemsTitle}</p>
              <p className="text-sm leading-6 text-slate-600">
                {selectedType?.description || copy.defaultItemsDescription}
              </p>
            </div>
            {renderToolbar ? <div className="flex flex-wrap items-center gap-3">{renderToolbar(selectedType)}</div> : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="relative block min-w-[18rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                aria-label={copy.searchAriaLabel}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                placeholder={copy.searchPlaceholder}
                className="w-full rounded-xl border border-slate-300 bg-white/85 py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </label>

            {allowIncludeInactiveToggle ? (
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
                <input
                  aria-label={copy.includeInactiveAriaLabel}
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(event) => {
                    setIncludeInactive(event.target.checked);
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                />
                {copy.includeInactiveLabel}
              </label>
            ) : null}
          </div>

          {itemsPanel.error ? (
            <StateView status="error" title={copy.itemsUnavailableTitle} description={itemsPanel.error} />
          ) : (
            <Fragment>
              <TableShell
                columns={columns}
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
                        <p className="text-sm font-semibold text-slate-950">{item.code}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          {copy.versionPrefix}
                          {item.version}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-950">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {copy.englishLabel}: {item.nameEn}
                          {item.nameZh ? ` / ${copy.chineseLabel}: ${item.nameZh}` : ''}
                          {item.nameJa ? ` / ${copy.japaneseLabel}: ${item.nameJa}` : ''}
                        </p>
                        {item.descriptionEn || item.descriptionZh || item.descriptionJa ? (
                          <p className="text-sm leading-6 text-slate-600">
                            {item.descriptionEn || item.descriptionZh || item.descriptionJa}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {item.isActive ? copy.activeStatus : copy.inactiveStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDateTime(locale, item.updatedAt)}</td>
                    {renderItemActions ? <td className="px-6 py-4">{renderItemActions(item)}</td> : null}
                  </tr>
                ))}
              </TableShell>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 shadow-sm">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-700">{paginationCopy.page}</p>
                  <p className="text-xs text-slate-500">{paginationCopy.range}</p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="font-medium text-slate-700">{paginationCopy.pageSize}</span>
                    <select
                      aria-label={paginationCopy.pageSize}
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value) as PageSizeOption);
                        setPage(1);
                      }}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
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
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={!itemsPanel.pagination.hasPrev || itemsPanel.loading}
                      className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {paginationCopy.previous}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPage((current) => Math.min(itemsPanel.pagination.totalPages, current + 1))
                      }
                      disabled={!itemsPanel.pagination.hasNext || itemsPanel.loading}
                      className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {paginationCopy.next}
                    </button>
                  </div>
                </div>
              </div>
            </Fragment>
          )}
        </div>
      </div>
    </div>
  );
}
