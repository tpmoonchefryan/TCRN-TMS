'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { HomepageEditor } from '@/components/homepage/editor/HomepageEditor';
import { STAGING_BANNER_HEIGHT } from '@/components/staging-banner';
import { isStaging } from '@/lib/utils';
import { useEditorStore } from '@/stores/homepage/editor-store';
import { useTalentStore } from '@/stores/talent-store';

export default function BusinessHomepageEditorPage() {
  const { currentTalent } = useTalentStore();
  const { load, isLoading, error } = useEditorStore();
  const router = useRouter();

  useEffect(() => {
    if (currentTalent?.id) {
      load(currentTalent.id);
    }
  }, [currentTalent?.id, load]);

  if (!currentTalent) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Loading editor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-destructive gap-4">
        <p className="font-semibold">Error loading editor</p>
        <p className="text-sm">{error}</p>
        <button onClick={() => router.back()} className="text-sm underline">
          Go back
        </button>
      </div>
    );
  }

  const showBanner = isStaging();

  return (
    <div 
      className="fixed inset-0 z-50 bg-background"
      style={{ top: showBanner ? STAGING_BANNER_HEIGHT : 0 }}
    >
      <HomepageEditor talentId={currentTalent.id} />
    </div>
  );
}
