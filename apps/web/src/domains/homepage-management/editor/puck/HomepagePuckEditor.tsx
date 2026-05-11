import { type Config, type Data, Puck, usePuck } from '@puckeditor/core';
import { type ThemeConfig } from '@tcrn/shared';
import { type ReactNode,useEffect, useLayoutEffect, useMemo, useState } from 'react';

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
  mapPuckDataToHomepageTheme,
} from '@/domains/homepage-management/editor/puck/homepage-puck-mappers';
import {
  DEFAULT_HOMEPAGE_PUCK_SIDEBAR_UI,
  HOMEPAGE_PUCK_SIDEBAR_STORAGE_KEY,
  sanitizeHomepagePuckSidebarStorageValue,
  sanitizeHomepagePuckSidebarUi,
  serializeHomepagePuckSidebarWidths,
} from '@/domains/homepage-management/editor/puck/homepage-puck-ui';
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
  onThemeChange: (theme: ThemeConfig) => void;
  theme: ThemeConfig;
}

export interface HomepagePuckSelectedItem {
  id: string | null;
  props: Record<string, unknown>;
  type: string;
}

const HOMEPAGE_PUCK_ROOT_ZONE = 'root:default-zone';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function isSameSerializedValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getViewportWidth() {
  return typeof window === 'undefined' ? null : window.innerWidth;
}

function getHomepagePuckSidebarUiKey(ui: {
  leftSideBarWidth: number;
  rightSideBarWidth: number;
}) {
  return serializeHomepagePuckSidebarWidths({
    left: ui.leftSideBarWidth,
    right: ui.rightSideBarWidth,
  });
}

function initializeHomepagePuckSidebarUi() {
  if (typeof window === 'undefined') {
    return DEFAULT_HOMEPAGE_PUCK_SIDEBAR_UI;
  }

  const storedWidths = sanitizeHomepagePuckSidebarStorageValue(
    window.localStorage.getItem(HOMEPAGE_PUCK_SIDEBAR_STORAGE_KEY),
    getViewportWidth(),
  );
  const serialized = serializeHomepagePuckSidebarWidths(storedWidths);

  if (window.localStorage.getItem(HOMEPAGE_PUCK_SIDEBAR_STORAGE_KEY) !== serialized) {
    window.localStorage.setItem(HOMEPAGE_PUCK_SIDEBAR_STORAGE_KEY, serialized);
  }

  return {
    leftSideBarWidth: storedWidths.left,
    rightSideBarWidth: storedWidths.right,
  };
}

function HomepagePuckBridge({
  onSelectedItemChange,
}: Readonly<{
  onSelectedItemChange?: (item: HomepagePuckSelectedItem | null) => void;
}>) {
  const { appState, dispatch, selectedItem } = usePuck();
  const leftSideBarWidth = appState.ui.leftSideBarWidth;
  const rightSideBarWidth = appState.ui.rightSideBarWidth;
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedWidths = initializeHomepagePuckSidebarUi();

    if (
      leftSideBarWidth !== storedWidths.leftSideBarWidth
      || rightSideBarWidth !== storedWidths.rightSideBarWidth
    ) {
      dispatch({
        type: 'setUi',
        ui: {
          leftSideBarWidth: storedWidths.leftSideBarWidth,
          rightSideBarWidth: storedWidths.rightSideBarWidth,
        },
        recordHistory: false,
      });
    }
  }, [dispatch]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextUi = sanitizeHomepagePuckSidebarUi(
      {
        leftSideBarWidth,
        rightSideBarWidth,
      },
      getViewportWidth(),
    );

    if (
      leftSideBarWidth !== nextUi.leftSideBarWidth
      || rightSideBarWidth !== nextUi.rightSideBarWidth
    ) {
      dispatch({
        type: 'setUi',
        ui: nextUi,
        recordHistory: false,
      });
      return;
    }

    const serialized = serializeHomepagePuckSidebarWidths({
      left: nextUi.leftSideBarWidth,
      right: nextUi.rightSideBarWidth,
    });

    if (window.localStorage.getItem(HOMEPAGE_PUCK_SIDEBAR_STORAGE_KEY) !== serialized) {
      window.localStorage.setItem(HOMEPAGE_PUCK_SIDEBAR_STORAGE_KEY, serialized);
    }
  }, [dispatch, leftSideBarWidth, rightSideBarWidth]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      const nextUi = sanitizeHomepagePuckSidebarUi(
        {
          leftSideBarWidth,
          rightSideBarWidth,
        },
        getViewportWidth(),
      );

      if (
        leftSideBarWidth !== nextUi.leftSideBarWidth
        || rightSideBarWidth !== nextUi.rightSideBarWidth
      ) {
        dispatch({
          type: 'setUi',
          ui: nextUi,
          recordHistory: false,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [dispatch, leftSideBarWidth, rightSideBarWidth]);

  return null;
}

function HomepagePuckEmptyInsertDrawerItem({
  children,
  isEmptyDraft,
  name,
}: Readonly<{
  children: ReactNode;
  isEmptyDraft: boolean;
  name: string;
}>) {
  const { dispatch } = usePuck();

  return (
    <div
      onClickCapture={(event) => {
        if (!isEmptyDraft) {
          return;
        }

        const target = event.target instanceof Element ? event.target : null;

        if (!target?.closest('[data-puck-drawer-item]')) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        dispatch({
          type: 'insert',
          componentType: name,
          destinationIndex: 0,
          destinationZone: HOMEPAGE_PUCK_ROOT_ZONE,
        });
      }}
    >
      {children}
    </div>
  );
}

export function HomepagePuckEditor({
  content,
  copy,
  fitToParent = false,
  isAdvancedEjected,
  onContentChange,
  onSaveDraft,
  onSelectedItemChange,
  onThemeChange,
  theme,
}: Readonly<HomepagePuckEditorProps>) {
  const config = useMemo(() => createHomepagePuckConfig(copy, theme), [copy, theme]);
  const data = useMemo(() => mapHomepageContentToPuckData(content, theme), [content, theme]);
  const isEmptyDraft = content.components.length === 0;
  const [puckUi, setPuckUi] = useState(DEFAULT_HOMEPAGE_PUCK_SIDEBAR_UI);

  useLayoutEffect(() => {
    const nextUi = initializeHomepagePuckSidebarUi();

    if (!isSameSerializedValue(DEFAULT_HOMEPAGE_PUCK_SIDEBAR_UI, nextUi)) {
      setPuckUi(nextUi);
    }
  }, []);

  const puckConfig = config as unknown as Config;
  const puckData = data as unknown as Data;
  const puckOverrides = useMemo(() => ({
    drawerItem: ({
      children,
      name,
    }: {
      children: ReactNode;
      name: string;
    }) => (
      <HomepagePuckEmptyInsertDrawerItem isEmptyDraft={isEmptyDraft} name={name}>
        {children}
      </HomepagePuckEmptyInsertDrawerItem>
    ),
  }), [isEmptyDraft]);

  return (
    <div
      data-homepage-puck-editor
      className={`rounded-3xl border border-slate-200 bg-white shadow-sm [&_.homepage-puck-block-preview_.min-h-screen]:min-h-0 ${
        fitToParent
          ? 'flex min-h-0 flex-1 flex-col overflow-auto'
          : 'min-h-[680px] overflow-hidden'
      }`}
    >
      {isEmptyDraft ? (
        <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">{copy.sections.emptyBlocksTitle}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{copy.sections.emptyBlocksDescription}</p>
        </div>
      ) : null}
      <Puck
        key={getHomepagePuckSidebarUiKey(puckUi)}
        config={puckConfig}
        data={puckData}
        height={fitToParent ? '100%' : 'min(82vh, 900px)'}
        iframe={{
          enabled: false,
        }}
        overrides={puckOverrides}
        ui={puckUi}
        onChange={(nextData) => {
          const nextContent = mapPuckDataToHomepageContent(
            nextData as Partial<HomepagePuckData>,
            content.version || '1.0',
          );
          const nextTheme = mapPuckDataToHomepageTheme(
            nextData as Partial<HomepagePuckData>,
            theme,
          );

          const nextMarkedContent = isAdvancedEjected
            ? markAdvancedSourceContent(nextContent)
            : nextContent;

          if (!isSameSerializedValue(theme, nextTheme)) {
            onThemeChange(nextTheme);
          }

          if (!isSameSerializedValue(content, nextMarkedContent)) {
            onContentChange(nextMarkedContent);
          }
        }}
        onPublish={() => {
          onSaveDraft();
        }}
        headerTitle={copy.modes.visual}
        renderHeaderActions={() => <HomepagePuckBridge onSelectedItemChange={onSelectedItemChange} />}
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
      <style jsx global>{`
        [data-homepage-puck-editor] > [class*="_Puck_"] {
          display: flex !important;
          flex: 1 1 0% !important;
          flex-direction: column !important;
          height: 100% !important;
          min-height: 0 !important;
          width: 100% !important;
        }

        [data-homepage-puck-editor] > [class*="_Puck_"],
        [data-homepage-puck-editor] > [class*="_PuckLayout_"],
        [data-homepage-puck-editor] [class*="_PuckLayout-inner_"] {
          min-width: 0 !important;
        }

        [data-homepage-puck-editor] > [class*="_Puck_"] > [class*="_PuckLayout_"] {
          display: flex !important;
          flex: 1 1 0% !important;
          flex-direction: column !important;
          height: 100% !important;
          min-height: 0 !important;
        }

        [data-homepage-puck-editor] [class*="_PuckLayout-inner_"] {
          width: 100% !important;
          height: 100% !important;
          min-height: 0 !important;
          --puck-frame-width: minmax(0, 1fr);
          grid-template-rows: min-content minmax(0, 1fr) !important;
        }

        [data-homepage-puck-editor] [class*="_PuckCanvas-root_"] {
          background: transparent !important;
          left: 50% !important;
          height: 100% !important;
          translate: -50% 0;
        }

        [data-homepage-puck-editor] [class*="_PuckCanvas-inner_"] {
          height: 100% !important;
        }

        [data-homepage-puck-editor] [class*="_PuckCanvas-root_"] [data-homepage-puck-root] {
          min-height: 100%;
        }
      `}</style>
    </div>
  );
}
