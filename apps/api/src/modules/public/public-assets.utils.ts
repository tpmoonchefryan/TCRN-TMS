// SPDX-License-Identifier: Apache-2.0
import { BUCKETS } from '../minio/minio.service';

export const PUBLIC_ASSET_BUCKETS = [BUCKETS.AVATARS, BUCKETS.HOMEPAGE_ASSETS] as const;

export type PublicAssetBucket = (typeof PUBLIC_ASSET_BUCKETS)[number];

export function resolvePublicAssetBucket(bucket: string): PublicAssetBucket | null {
  return PUBLIC_ASSET_BUCKETS.includes(bucket as PublicAssetBucket)
    ? (bucket as PublicAssetBucket)
    : null;
}

export function extractPublicAssetKey(pathOrUrl: string, bucket: string): string | null {
  const urlParts = pathOrUrl.split(`/${bucket}/`);
  if (urlParts.length < 2 || !urlParts[1]) {
    return null;
  }

  return decodeURIComponent(urlParts[1]);
}
