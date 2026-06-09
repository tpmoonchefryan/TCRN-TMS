'use client';

import { Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { DEFAULT_THEME, type ThemeConfig, toIntlLocale } from '@tcrn/shared';

import {
  type PublicHomepageResponse,
  readPublicHomepage,
} from '@/domains/public-homepage/api/public-homepage.api';
import { PublicHomepageProjectionRenderer } from '@/domains/public-homepage/components/PublicHomepageProjectionRenderer';
import { getHomepageCanvasStyle } from '@/domains/public-homepage/components/PublicHomepageRenderer';
import {
  PublicPresenceBadge,
  PublicPresenceShell,
  PublicPresenceStateView,
  PublicPresenceSurface,
} from '@/domains/public-presence';
import { ApiRequestError } from '@/platform/http/api';
import { useUiLocale } from '@/platform/runtime/locale/locale-provider';

function getApiErrorMessage(reason: unknown) {
  if (!(reason instanceof ApiRequestError)) {
    return null;
  }

  return reason.message && reason.message !== 'Request failed' ? reason.message : null;
}

function isUnavailableError(reason: unknown) {
  return reason instanceof ApiRequestError && reason.status === 404;
}

export function PublicHomepageScreen({
  path,
}: Readonly<{
  path: string;
}>) {
  const { copy } = useUiLocale();
  const [data, setData] = useState<PublicHomepageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);

  const documentLocale = toIntlLocale(data?.metadata.locale ?? 'en');

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
        setError(getApiErrorMessage(reason));
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

  useEffect(() => {
    const previousLang = document.documentElement.lang;
    document.documentElement.lang = documentLocale;

    return () => {
      document.documentElement.lang = previousLang;
    };
  }, [documentLocale]);

  const pageTheme: ThemeConfig = data?.appearance.theme || DEFAULT_THEME;
  const canvasStyle = useMemo(() => getHomepageCanvasStyle(pageTheme), [pageTheme]);

  if (loading && !data) {
    return (
      <PublicPresenceShell
        contentClassName="flex min-h-[70vh] items-center"
        decorationDensity="calm"
      >
        <div className="w-full space-y-5">
          <PublicPresenceSurface className="p-8">
            <PublicPresenceBadge icon={<Sparkles />} tone="rose">
              {copy.publicHomepage.loading}
            </PublicPresenceBadge>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="h-32 animate-pulse rounded-lg bg-white/70" />
              <div className="h-32 animate-pulse rounded-lg bg-white/70 md:col-span-2" />
            </div>
          </PublicPresenceSurface>
          <div className="grid gap-4">
            <div className="h-40 animate-pulse rounded-lg bg-white/60" />
            <div className="h-40 animate-pulse rounded-lg bg-white/60" />
          </div>
        </div>
      </PublicPresenceShell>
    );
  }

  if (!data) {
    const description = isUnavailable
      ? copy.publicHomepage.unavailableDescription
      : error || copy.publicHomepage.failedDescription;

    return (
      <PublicPresenceShell
        contentClassName="flex min-h-[70vh] items-center justify-center"
        decorationDensity="calm"
        width="sm"
      >
        <PublicPresenceStateView
          tone={isUnavailable ? 'unavailable' : 'error'}
          title={
            isUnavailable ? copy.publicHomepage.unavailableTitle : copy.publicHomepage.failedTitle
          }
          description={description}
        />
      </PublicPresenceShell>
    );
  }

  return (
    <PublicPresenceShell decorationDensity="calm" style={canvasStyle}>
      <PublicHomepageProjectionRenderer projection={data} />
    </PublicPresenceShell>
  );
}
