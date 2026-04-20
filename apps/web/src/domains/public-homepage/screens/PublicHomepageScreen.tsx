'use client';

import {
  DEFAULT_THEME,
  type ThemeConfig,
} from '@tcrn/shared';
import { Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  type PublicHomepageResponse,
  readPublicHomepage,
} from '@/domains/public-homepage/api/public-homepage.api';
import {
  getHomepageCanvasStyle,
  PublicHomepageRenderer,
} from '@/domains/public-homepage/components/PublicHomepageRenderer';
import { ApiRequestError } from '@/platform/http/api';
import { useRuntimeLocale } from '@/platform/runtime/locale/locale-provider';
import { GlassSurface, StateView } from '@/platform/ui';

function getErrorMessage(reason: unknown, fallback: string) {
  if (!(reason instanceof ApiRequestError)) {
    return fallback;
  }

  return reason.message && reason.message !== 'Request failed' ? reason.message : fallback;
}

function isUnavailableError(reason: unknown) {
  return reason instanceof ApiRequestError && reason.status === 404;
}

function getHeroDescription(data: PublicHomepageResponse) {
  return data.seo.description || data.seo.title || null;
}

export function PublicHomepageScreen({
  path,
}: Readonly<{
  path: string;
}>) {
  const { copy } = useRuntimeLocale();
  const [data, setData] = useState<PublicHomepageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setIsUnavailable(false);

      try {
        const nextData = await readPublicHomepage(path);

        if (cancelled) {
          return;
        }

        setData(nextData);
      } catch (reason) {
        if (cancelled) {
          return;
        }

        const unavailable = isUnavailableError(reason);
        setData(null);
        setIsUnavailable(unavailable);
        setError(
          getErrorMessage(
            reason,
            unavailable ? copy.publicHomepage.unavailableDescription : copy.publicHomepage.failedDescription,
          ),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [path]);

  const pageTheme: ThemeConfig = data?.theme || DEFAULT_THEME;
  const canvasStyle = useMemo(() => getHomepageCanvasStyle(pageTheme), [pageTheme]);

  if (loading && !data) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-4xl space-y-5">
          <GlassSurface variant="solid" className="p-8">
            <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              <Sparkles className="h-4 w-4" />
              {copy.publicHomepage.loading}
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="h-32 animate-pulse rounded-3xl bg-slate-200/70" />
              <div className="h-32 animate-pulse rounded-3xl bg-slate-200/70 md:col-span-2" />
            </div>
          </GlassSurface>
          <div className="grid gap-4">
            <div className="h-40 animate-pulse rounded-[30px] bg-white/60" />
            <div className="h-40 animate-pulse rounded-[30px] bg-white/60" />
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl">
          <StateView
            status={isUnavailable ? 'unavailable' : 'error'}
            title={isUnavailable ? copy.publicHomepage.unavailableTitle : copy.publicHomepage.failedTitle}
            description={
              error ||
              (isUnavailable
                ? copy.publicHomepage.unavailableDescription
                : copy.publicHomepage.failedDescription)
            }
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-10 md:py-14" style={canvasStyle}>
      <div className="mx-auto max-w-6xl">
        <PublicHomepageRenderer
          content={data.content}
          theme={data.theme}
          updatedAt={data.updatedAt}
          hero={{
            displayName: data.talent.displayName,
            avatarUrl: data.talent.avatarUrl,
            timezone: data.talent.timezone,
            description: getHeroDescription(data),
          }}
        />
      </div>
    </main>
  );
}
