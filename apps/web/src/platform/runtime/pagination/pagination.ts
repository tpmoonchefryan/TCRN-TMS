import type { ApiPaginationMeta } from '@/platform/http/api';

export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export function parsePageParam(value: string | null): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export function parsePageSizeParam(value: string | null): PageSizeOption {
  const parsed = Number(value);

  if (PAGE_SIZE_OPTIONS.includes(parsed as PageSizeOption)) {
    return parsed as PageSizeOption;
  }

  return PAGE_SIZE_OPTIONS[0];
}

export function getPaginationRange(
  pagination: ApiPaginationMeta,
  itemCount: number,
): {
  start: number;
  end: number;
} {
  if (itemCount === 0 || pagination.totalCount === 0) {
    return { start: 0, end: 0 };
  }

  const start = (pagination.page - 1) * pagination.pageSize + 1;
  const end = start + itemCount - 1;

  return { start, end };
}

export function buildPaginationMeta(
  totalCount: number,
  page: number,
  pageSize: number,
): ApiPaginationMeta {
  const safeTotalCount = Math.max(0, totalCount);
  const totalPages = Math.max(1, Math.ceil(safeTotalCount / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  return {
    page: safePage,
    pageSize,
    totalCount: safeTotalCount,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
}
