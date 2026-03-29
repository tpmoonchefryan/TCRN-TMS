// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { getPublicApiUrl, unwrapPublicApiEnvelope } from './public-fetch-core';

interface PublicDomainLookupApiPayload {
  path?: string;
  homepagePath?: string;
  marshmallowPath?: string;
}

export interface PublicDomainLookupResult {
  homepagePath: string;
  marshmallowPath: string;
}

export async function fetchPublicDomainLookup(domain: string): Promise<PublicDomainLookupResult | null> {
  try {
    const response = await fetch(
      getPublicApiUrl(`/api/v1/public/domain-lookup?domain=${encodeURIComponent(domain)}`, {
        allowServerApiUrlFallback: true,
      }),
      {
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as PublicDomainLookupApiPayload;
    const data = unwrapPublicApiEnvelope<PublicDomainLookupApiPayload>(payload);
    const homepagePath = data?.homepagePath || data?.path;
    const marshmallowPath = data?.marshmallowPath || data?.path;

    if (!homepagePath || !marshmallowPath) {
      return null;
    }

    return {
      homepagePath,
      marshmallowPath,
    };
  } catch (error) {
    console.warn(`Domain lookup failed for ${domain}:`, error);
    return null;
  }
}
