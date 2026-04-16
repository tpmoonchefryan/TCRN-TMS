'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { HomepageEditor } from '@/components/homepage/editor/HomepageEditor';
import { STAGING_BANNER_HEIGHT } from '@/components/staging-banner';
import { useEditorStore } from '@/domains/homepage-public/state/editor-store';
import { isStaging } from '@/lib/utils';
import { useTalentStore } from '@/platform/state/talent-store';

export function BusinessHomepageEditorScreen() {
  const tCommon = useTranslations('common');
  const tEditor = useTranslations('homepageEditor');
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
        <Loader2 className="text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
        <span className="text-muted-foreground ml-2">{tCommon('loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive flex h-full w-full flex-col items-center justify-center gap-4">
        <p className="font-semibold">{tCommon('error')}</p>
        <p className="text-sm">{tEditor(error as never)}</p>
        <button onClick={() => router.back()} className="text-sm underline">
          {tCommon('back')}
        </button>
      </div>
    );
  }

  const showBanner = isStaging();

  return (
    <div
      className="bg-background fixed inset-0 z-50"
      style={{ top: showBanner ? STAGING_BANNER_HEIGHT : 0 }}
    >
      <HomepageEditor talentId={currentTalent.id} />
    </div>
  );
}
