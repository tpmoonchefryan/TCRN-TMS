// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type {
  PublicMarshmallowConfigResponse,
  PublicMarshmallowMessagesResponse,
} from './content';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
}

const PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function unwrapApiEnvelope<T>(payload: ApiEnvelope<T> | T): T | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if ('success' in payload) {
    return (payload as ApiEnvelope<T>).data ?? null;
  }

  return payload as T;
}

async function fetchPublicResource<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, init);
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<T> | T;
    return unwrapApiEnvelope(payload);
  } catch (error) {
    console.error(`Error fetching public resource ${url}:`, error);
    return null;
  }
}

export async function fetchPublicMarshmallowConfig(
  path: string,
  options?: {
    revalidate?: number;
    cache?: RequestCache;
  },
): Promise<PublicMarshmallowConfigResponse | null> {
  const { revalidate = 300, cache } = options ?? {};
  const requestInit: RequestInit & { next?: { revalidate: number } } = {
    ...(cache ? { cache } : {}),
  };

  if (cache !== 'no-store') {
    requestInit.next = { revalidate };
  }

  return fetchPublicResource<PublicMarshmallowConfigResponse>(
    `${PUBLIC_API_BASE_URL}/api/v1/public/marshmallow/${path}/config`,
    requestInit,
  );
}

export async function fetchPublicMarshmallowMessages(
  path: string,
  query?: {
    limit?: number;
    cursor?: string;
    fingerprint?: string;
    bustCache?: boolean;
  },
  options?: {
    revalidate?: number;
    cache?: RequestCache;
  },
): Promise<PublicMarshmallowMessagesResponse | null> {
  const searchParams = new URLSearchParams();

  if (query?.limit !== undefined) {
    searchParams.set('limit', query.limit.toString());
  }
  if (query?.cursor) {
    searchParams.set('cursor', query.cursor);
  }
  if (query?.fingerprint) {
    searchParams.set('fingerprint', query.fingerprint);
  }
  if (query?.bustCache) {
    searchParams.set('_t', Date.now().toString());
  }

  const queryString = searchParams.toString();
  const url = `${PUBLIC_API_BASE_URL}/api/v1/public/marshmallow/${path}/messages${queryString ? `?${queryString}` : ''}`;

  const { revalidate = 60, cache } = options ?? {};
  const requestInit: RequestInit & { next?: { revalidate: number } } = {
    ...(cache ? { cache } : {}),
  };

  if (cache !== 'no-store') {
    requestInit.next = { revalidate };
  }

  return fetchPublicResource<PublicMarshmallowMessagesResponse>(url, requestInit);
}
