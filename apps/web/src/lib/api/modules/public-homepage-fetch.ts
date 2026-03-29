// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { PublicHomepageResponse } from './content';

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

function encodeHomepagePath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export async function fetchPublicHomepage(
  path: string,
  options?: {
    revalidate?: number;
    cache?: RequestCache;
  },
): Promise<PublicHomepageResponse | null> {
  const { revalidate = 0, cache } = options ?? {};
  const requestInit: RequestInit & { next?: { revalidate: number } } = {
    ...(cache ? { cache } : {}),
  };

  if (cache !== 'no-store') {
    requestInit.next = { revalidate };
  }

  const encodedPath = encodeHomepagePath(path);
  return fetchPublicResource<PublicHomepageResponse>(
    `${PUBLIC_API_BASE_URL}/api/v1/public/homepage/${encodedPath}`,
    requestInit,
  );
}
