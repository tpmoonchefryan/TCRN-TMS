// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type {
  PublicMarshmallowConfigResponse,
  PublicMarshmallowMessagesResponse,
} from './content';
import {
  buildPublicRequestInit,
  encodePublicPath,
  fetchPublicJsonResource,
  getPublicApiUrl,
  type PublicFetchOptions,
} from './public-fetch-core';

export async function fetchPublicMarshmallowConfig(
  path: string,
  options?: PublicFetchOptions,
): Promise<PublicMarshmallowConfigResponse | null> {
  return fetchPublicJsonResource<PublicMarshmallowConfigResponse>(
    getPublicApiUrl(`/api/v1/public/marshmallow/${encodePublicPath(path)}/config`),
    buildPublicRequestInit(options, 300),
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
  const url = getPublicApiUrl(
    `/api/v1/public/marshmallow/${encodePublicPath(path)}/messages${queryString ? `?${queryString}` : ''}`,
  );

  return fetchPublicJsonResource<PublicMarshmallowMessagesResponse>(url, buildPublicRequestInit(options, 60));
}
