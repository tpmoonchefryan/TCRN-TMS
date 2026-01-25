// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

'use client';

import { useParams } from 'next/navigation';
import React from 'react';

import { HomepageEditor } from '@/components/homepage/editor/HomepageEditor';
import { useEditorStore } from '@/stores/homepage/editor-store';

export default function AdminHomepageEditorPage() {
  const params = useParams();
  const talentId = params.id as string;
  const { load, isLoading, error } = useEditorStore();

  React.useEffect(() => {
    if (talentId) {
      load(talentId);
    }
  }, [talentId, load]);

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
      <div className="h-full w-full flex flex-col items-center justify-center text-destructive">
        <p className="font-semibold">Error loading editor</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <HomepageEditor talentId={talentId} />
    </div>
  );
}
