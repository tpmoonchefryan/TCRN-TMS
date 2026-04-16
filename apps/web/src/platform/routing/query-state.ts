// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

type QueryValue = string | number | null | undefined;
type SearchParamsLike = Pick<URLSearchParams, 'get' | 'toString'>;

type RouterLike = {
  replace: (href: string, options?: { scroll?: boolean }) => void;
};

type ReplaceQueryOptions = {
  router: RouterLike;
  pathname: string;
  searchParams: SearchParamsLike;
  updates: Record<string, QueryValue>;
  scroll?: boolean;
};

export function getQueryString(
  searchParams: SearchParamsLike,
  key: string,
  fallback = '',
): string {
  return searchParams.get(key) ?? fallback;
}

export function getQueryNumber(
  searchParams: SearchParamsLike,
  key: string,
  fallback: number,
  minimum = 1,
): number {
  const rawValue = searchParams.get(key);
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.max(minimum, Math.trunc(parsedValue));
}

export function replaceQueryState({
  router,
  pathname,
  searchParams,
  updates,
  scroll = false,
}: ReplaceQueryOptions) {
  const nextSearchParams = new URLSearchParams(searchParams.toString());

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || typeof value === 'undefined' || value === '') {
      nextSearchParams.delete(key);
      continue;
    }

    nextSearchParams.set(key, String(value));
  }

  const nextQuery = nextSearchParams.toString();
  const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname;
  router.replace(nextHref, { scroll });
}
