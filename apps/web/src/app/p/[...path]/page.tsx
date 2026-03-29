// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { DEFAULT_THEME, normalizeTheme } from '@tcrn/shared';
import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';

import { HomepageRenderer } from '@/components/homepage/renderer/HomepageRenderer';
import { fetchPublicHomepage } from '@/lib/api/modules/public-homepage-fetch';

// Disable cache for instant updates during development/testing
export const revalidate = 0; 

interface PageProps {
  params: Promise<{
    path: string[];
  }>;
}

// Generate Metadata for SEO
export async function generateMetadata(
  props: PageProps,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const params = await props.params;
  const pathStr = Array.isArray(params.path) ? params.path.join('/') : params.path;
  const data = await fetchPublicHomepage(pathStr, { cache: 'no-store' });
  
  if (!data) {
    return {
      title: 'Page Not Found',
    };
  }

  const talentName = data.talent?.displayName || 'Talent';
  const title = data?.seo?.title || `${talentName} - Official Homepage`;
  const description = data?.seo?.description || `Official homepage of ${talentName}`;
  const images = data?.seo?.ogImageUrl ? [data.seo.ogImageUrl] : []; // property name mismatch? og_image_url in DB, mapped to ogImageUrl in service

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      type: 'profile',
      images: images,
      siteName: 'TCRN TMS',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: images,
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        noimageindex: false,
      },
    },
  };
}

export default async function PublicHomepage(props: PageProps) {
  const params = await props.params;
  const pathStr = Array.isArray(params.path) ? params.path.join('/') : params.path;
  const data = await fetchPublicHomepage(pathStr, { cache: 'no-store' });

  if (!data) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        <HomepageRenderer 
          content={data.content} 
          theme={normalizeTheme(data.theme) || DEFAULT_THEME} 
          className="min-h-screen"
          homepagePath={pathStr}
        />
      </main>
      
      {/* Footer / Branding - Fixed at bottom, non-intrusive */}
      <div 
        className="fixed bottom-4 left-0 right-0 text-center text-[10px] opacity-40 pointer-events-none z-50 select-none mix-blend-difference"
        style={{ color: data.theme?.colors?.text || '#000' }}
      >
        Powered by TCRN TMS
      </div>
    </div>
  );
}
