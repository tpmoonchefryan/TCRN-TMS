import { type Config, type Data, Puck, usePuck } from '@puckeditor/core';
import { type ThemeConfig } from '@tcrn/shared';
import { useEffect, useMemo } from 'react';

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
  fitToParent?: boolean;
  isAdvancedEjected: boolean;
  onContentChange: (content: HomepageDraftContent) => void;
  onSaveDraft: () => void;
  onSelectedItemChange?: (item: HomepagePuckSelectedItem | null) => void;
  theme: ThemeConfig;
}

export interface HomepagePuckSelectedItem {
  id: string | null;
  props: Record<string, unknown>;
  type: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function PuckHeaderBridge({
  onSelectedItemChange,
}: Readonly<{
  onSelectedItemChange?: (item: HomepagePuckSelectedItem | null) => void;
}>) {
  const { selectedItem } = usePuck();
  const selectionId = typeof selectedItem?.props?.id === 'string' ? selectedItem.props.id : null;
  const selectionKey = selectedItem ? `${String(selectedItem.type)}:${selectionId ?? '__none__'}` : '__none__';
  const bridgedSelectedItem = useMemo(() => {
    if (!selectedItem) {
      return null;
    }

    return {
      id: selectionId,
      props: asRecord(selectedItem.props),
      type: String(selectedItem.type),
    } satisfies HomepagePuckSelectedItem;
  }, [selectionId, selectionKey]);

  useEffect(() => {
    if (!onSelectedItemChange) {
      return;
    }

    onSelectedItemChange(bridgedSelectedItem);
  }, [bridgedSelectedItem, onSelectedItemChange]);

  return null;
}

export function HomepagePuckEditor({
  content,
  copy,
  fitToParent = false,
  isAdvancedEjected,
  onContentChange,
  onSaveDraft,
  onSelectedItemChange,
  theme,
}: Readonly<HomepagePuckEditorProps>) {
  const config = useMemo(() => createHomepagePuckConfig(copy, theme), [copy, theme]);
  const data = useMemo(() => mapHomepageContentToPuckData(content), [content]);
  const puckConfig = config as unknown as Config;
  const puckData = data as unknown as Data;

  return (
    <div
      className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm [&_.homepage-puck-block-preview_.min-h-screen]:min-h-0 ${
        fitToParent ? 'flex h-full min-h-0' : 'min-h-[680px]'
      }`}
    >
      <Puck
        config={puckConfig}
        data={puckData}
        height={fitToParent ? '100%' : 'min(82vh, 900px)'}
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
        renderHeaderActions={() => <PuckHeaderBridge onSelectedItemChange={onSelectedItemChange} />}
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
