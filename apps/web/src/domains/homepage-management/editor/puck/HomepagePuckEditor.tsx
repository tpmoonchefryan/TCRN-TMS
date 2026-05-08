import { type Config, type Data,Puck } from '@puckeditor/core';
import { type ThemeConfig } from '@tcrn/shared';
import { useMemo } from 'react';

import {
  type HomepageDraftContent,
} from '@/domains/homepage-management/api/homepage.api';
import {
  createHomepagePuckConfig,
} from '@/domains/homepage-management/editor/puck/homepage-puck-config';
import {
  type HomepagePuckData,
  mapHomepageContentToPuckData,
  mapPuckDataToHomepageContent,
} from '@/domains/homepage-management/editor/puck/homepage-puck-mappers';
import {
  markAdvancedSourceContent,
} from '@/domains/homepage-management/editor/source/homepage-advanced-eject';
import { type HomepageEditorCopy } from '@/domains/homepage-management/screens/homepage-editor.copy';

interface HomepagePuckEditorProps {
  content: HomepageDraftContent;
  copy: HomepageEditorCopy;
  isAdvancedEjected: boolean;
  onContentChange: (content: HomepageDraftContent) => void;
  onSaveDraft: () => void;
  theme: ThemeConfig;
}

export function HomepagePuckEditor({
  content,
  copy,
  isAdvancedEjected,
  onContentChange,
  onSaveDraft,
  theme,
}: Readonly<HomepagePuckEditorProps>) {
  const config = useMemo(() => createHomepagePuckConfig(copy, theme), [copy, theme]);
  const data = useMemo(() => mapHomepageContentToPuckData(content), [content]);
  const puckConfig = config as unknown as Config;
  const puckData = data as unknown as Data;

  return (
    <div className="min-h-[680px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm [&_.homepage-puck-block-preview_.min-h-screen]:min-h-0">
      <Puck
        config={puckConfig}
        data={puckData}
        height="min(82vh, 900px)"
        onChange={(nextData) => {
          const nextContent = mapPuckDataToHomepageContent(
            nextData as Partial<HomepagePuckData>,
            content.version || '1.0',
          );

          onContentChange(isAdvancedEjected ? markAdvancedSourceContent(nextContent) : nextContent);
        }}
        onPublish={() => {
          onSaveDraft();
        }}
        headerTitle={copy.modes.visual}
        renderHeaderActions={() => (
          <button
            type="button"
            onClick={onSaveDraft}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {copy.actions.saveDraft}
          </button>
        )}
        viewports={[
          {
            width: 390,
            height: 'auto',
            label: copy.sections.previewViewportMobile,
          },
          {
            width: 768,
            height: 'auto',
            label: copy.sections.previewViewportTablet,
          },
          {
            width: '100%',
            height: 'auto',
            label: copy.sections.previewViewportDesktop,
          },
        ]}
      />
    </div>
  );
}
