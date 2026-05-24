import React, { useId } from 'react';

import type { ApiPaginationMeta } from '@/platform/http/api';
import { getPaginationRange, PAGE_SIZE_OPTIONS } from '@/platform/runtime/pagination/pagination';

import { tokens } from '../foundations/tokens';

export interface PaginationFooterLabels {
  pageLabel: string;
  rangeLabel?: string;
  rowsPerPageLabel: string;
  previousLabel: string;
  nextLabel: string;
  pageSizeAriaLabel?: string;
}

export interface PaginationFooterProps {
  pagination: ApiPaginationMeta;
  itemCount: number;
  labels: PaginationFooterLabels;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  isLoading?: boolean;
  className?: string;
}

export const PaginationFooter: React.FC<PaginationFooterProps> = ({
  pagination,
  itemCount,
  labels,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  isLoading = false,
  className = '',
}) => {
  const pageSizeId = useId();
  const range = getPaginationRange(pagination, itemCount);
  const rangeLabel = labels.rangeLabel ?? `${range.start}-${range.end} / ${pagination.totalCount}`;
  const isPreviousDisabled = !pagination.hasPrev || isLoading;
  const isNextDisabled = !pagination.hasNext || isLoading;

  return (
    <div
      className={`flex flex-col gap-4 border-t border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-live="polite">
        <span className="font-medium text-slate-700">{labels.pageLabel}</span>
        <span>{rangeLabel}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange ? (
          <label htmlFor={pageSizeId} className="flex items-center gap-2">
            <span className="font-medium text-slate-700">{labels.rowsPerPageLabel}</span>
            <select
              id={pageSizeId}
              aria-label={labels.pageSizeAriaLabel ?? labels.rowsPerPageLabel}
              value={pagination.pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              disabled={isLoading}
              className={`rounded-lg border ${tokens.colors.border} bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
            disabled={isPreviousDisabled}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {labels.previousLabel}
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
            disabled={isNextDisabled}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {labels.nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
