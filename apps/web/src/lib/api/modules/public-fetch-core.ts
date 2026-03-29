// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
}

export interface PublicApiUrlOptions {
  allowServerApiUrlFallback?: boolean;
}

export interface PublicFetchOptions {
  revalidate?: number;
  cache?: RequestCache;
}

export function getPublicApiBaseUrl(options?: PublicApiUrlOptions): string {
  if (options?.allowServerApiUrlFallback) {
    return process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:4000';
  }

  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
}

export function getPublicApiUrl(pathname: string, options?: PublicApiUrlOptions): string {
  return `${getPublicApiBaseUrl(options)}${pathname}`;
}

export function encodePublicPath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function buildPublicRequestInit(
  options: PublicFetchOptions | undefined,
  defaultRevalidate: number,
): RequestInit & { next?: { revalidate: number } } {
  const { revalidate = defaultRevalidate, cache } = options ?? {};
  const requestInit: RequestInit & { next?: { revalidate: number } } = {
    ...(cache ? { cache } : {}),
  };

  if (cache !== 'no-store') {
    requestInit.next = { revalidate };
  }

  return requestInit;
}

export function unwrapPublicApiEnvelope<T>(payload: ApiEnvelope<T> | T): T | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if ('success' in payload) {
    return (payload as ApiEnvelope<T>).data ?? null;
  }

  return payload as T;
}

export async function fetchPublicJsonResource<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, init);
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<T> | T;
    return unwrapPublicApiEnvelope(payload);
  } catch (error) {
    console.error(`Error fetching public resource ${url}:`, error);
    return null;
  }
}
