// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import type { PublicHomepageResponse } from './content';
import {
  buildPublicRequestInit,
  encodePublicPath,
  fetchPublicJsonResource,
  getPublicApiUrl,
  type PublicFetchOptions,
} from './public-fetch-core';

export async function fetchPublicHomepage(
  path: string,
  options?: PublicFetchOptions,
): Promise<PublicHomepageResponse | null> {
  return fetchPublicJsonResource<PublicHomepageResponse>(
    getPublicApiUrl(`/api/v1/public/homepage/${encodePublicPath(path)}`),
    buildPublicRequestInit(options, 0),
  );
}
