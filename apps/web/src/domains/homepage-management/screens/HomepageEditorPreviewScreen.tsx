'use client';

import { RefreshCw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  useHomepageEditorCopy,
} from '@/domains/homepage-management/screens/homepage-editor.copy';
import {
  getHomepageEditorPreviewStorageKey,
  type HomepageEditorPreviewSnapshot,
  readHomepageEditorPreviewSnapshot,
} from '@/domains/homepage-management/screens/homepage-editor-preview-storage';
import { PublicHomepageRenderer } from '@/domains/public-homepage/components/PublicHomepageRenderer';
import { GlassSurface, StateView } from '@/platform/ui';

export function HomepageEditorPreviewScreen({
  tenantId,
  talentId,
}: Readonly<{
  tenantId: string;
  talentId: string;
}>) {
  const searchParams = useSearchParams();
  const { copy } = useHomepageEditorCopy();
  const previewId = searchParams.get('previewId') || '';
  const [snapshot, setSnapshot] = useState<HomepageEditorPreviewSnapshot | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => {
    function refreshSnapshot() {
      if (!previewId) {
        setSnapshot(null);
        setIsUnavailable(true);
        return;
      }

      const nextSnapshot = readHomepageEditorPreviewSnapshot(previewId);

      if (
        !nextSnapshot ||
        nextSnapshot.tenantId !== tenantId ||
        nextSnapshot.talentId !== talentId
      ) {
        setSnapshot(null);
        setIsUnavailable(true);
        return;
      }

      setSnapshot(nextSnapshot);
      setIsUnavailable(false);
    }

    refreshSnapshot();

    const storageKey = getHomepageEditorPreviewStorageKey(previewId);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        refreshSnapshot();
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [previewId, talentId, tenantId]);

  if (isUnavailable || !snapshot) {
    return (
      <StateView
        status="unavailable"
        title={copy.preview.liveUnavailableTitle}
        description={copy.preview.liveUnavailableDescription}
      />
    );
  }

  return (
    <div className="space-y-6">
      <GlassSurface className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              <RefreshCw className="h-3.5 w-3.5" />
              {copy.preview.liveBadge}
            </p>
            <h1 className="text-2xl font-semibold text-slate-950">{copy.preview.liveTitle}</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              {copy.preview.liveDescription}
            </p>
          </div>
          {snapshot.homepageUrl ? (
            <p className="max-w-full break-words rounded-2xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-600">
              {snapshot.homepageUrl}
            </p>
          ) : null}
        </div>
      </GlassSurface>

      <div className="rounded-3xl border border-slate-200 bg-slate-100 p-4">
        <PublicHomepageRenderer
          content={snapshot.content}
          theme={snapshot.theme}
          updatedAt={snapshot.updatedAt}
          hero={snapshot.hero}
        />
      </div>
    </div>
  );
}
