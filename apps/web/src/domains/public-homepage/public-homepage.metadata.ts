import { BROWSER_PUBLIC_CONSUMER_CODE, BROWSER_PUBLIC_CONSUMER_HEADER } from '@tcrn/shared';
import type { Metadata } from 'next';

import {
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_OG_IMAGE_PATH,
  resolvePublicApiOrigin,
} from '@/app/site-metadata';
import {
  buildPublicHomepageEndpoint,
  type PublicHomepageResponse,
} from '@/domains/public-homepage/api/public-homepage.api';
import {
  resolvePublicHomepageFallbackDescription,
  resolvePublicHomepageFallbackTitle,
} from '@/domains/public-homepage/public-homepage-fallback-copy';
import { readApiData } from '@/platform/http/api';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';

async function readPublicHomepageMetadataSource(path: string): Promise<PublicHomepageResponse | null> {
  try {
    const response = await fetch(`${resolvePublicApiOrigin()}${buildPublicHomepageEndpoint(path)}`, {
      headers: {
        [BROWSER_PUBLIC_CONSUMER_HEADER]: BROWSER_PUBLIC_CONSUMER_CODE,
      },
      next: {
        revalidate: 300,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await readApiData<PublicHomepageResponse>(response);
  } catch {
    // Metadata enrichment is best-effort; never fail the public page when SEO fetch/parsing is unavailable.
    return null;
  }
}

export async function buildPublicHomepageMetadata(path: string): Promise<Metadata> {
  const data = await readPublicHomepageMetadataSource(path);

  if (!data) {
    return {};
  }

  const locale = data.metadata.locale || 'en';
  const title = resolvePublicHomepageFallbackTitle(
    locale,
    data.metadata.title?.trim()
    || pickLocaleText(locale, {
      en: 'TCRN TMS',
      zh_HANS: 'TCRN TMS',
      zh_HANT: 'TCRN TMS',
      ja: 'TCRN TMS',
      ko: 'TCRN TMS',
      fr: 'TCRN TMS',
    }),
  );
  const description = resolvePublicHomepageFallbackDescription(
    locale,
    data.metadata.description?.trim()
    || pickLocaleText(locale, {
      en: 'Official fan page',
      zh_HANS: '官方粉丝页',
      zh_HANT: '官方粉絲頁',
      ja: '公式ファンページ',
      ko: '공식 팬 페이지',
      fr: 'Page fan officielle',
    }),
  ) || '';
  const imageUrl = data.metadata.ogImage?.url?.trim() || DEFAULT_OG_IMAGE_PATH;
  const imageAlt = data.metadata.ogImageAlt?.trim() || DEFAULT_OG_IMAGE_ALT;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [
        {
          url: imageUrl,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}
