'use client';

import {
  DEFAULT_THEME,
  normalizeTheme,
  type ThemeConfig,
} from '@tcrn/shared';
import {
  ArrowLeft,
  Code2,
  ExternalLink,
  Eye,
  Globe2,
  Info,
  RotateCcw,
  Save,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  type HomepageDraftComponentRecord,
  type HomepageDraftContent,
  type HomepageResponse,
  readHomepage,
  readHomepageVersion,
  saveHomepageDraft,
} from '@/domains/homepage-management/api/homepage.api';
import { HomepageEditorDevModePanel } from '@/domains/homepage-management/editor/puck/HomepageEditorDevModePanel';
import { HomepagePuckEditor } from '@/domains/homepage-management/editor/puck/HomepagePuckEditor';
import { type HomepagePuckSelectedItem } from '@/domains/homepage-management/editor/puck/HomepagePuckEditor';
import {
  canSwitchFromAdvancedSourceToVisual,
  createLowCodeSnapshot,
  type HomepageLowCodeSnapshot,
  isAdvancedSourceContent,
  markAdvancedSourceContent,
  restoreLowCodeSnapshot,
} from '@/domains/homepage-management/editor/source/homepage-advanced-eject';
import {
  buildDefaultHomepageSourceDocument,
  buildHomepageSourceDocument,
  EMPTY_HOMEPAGE_CONTENT,
  normalizeHomepageDraftContent,
  parseHomepageSourceDocument,
} from '@/domains/homepage-management/editor/source/homepage-source-dsl';
import {
  type HomepageEditorCopy,
  useHomepageEditorCopy,
} from '@/domains/homepage-management/screens/homepage-editor.copy';
import {
  buildHomepageEditorPreviewPath,
  createHomepageEditorPreviewId,
  type HomepageEditorPreviewHero,
  writeHomepageEditorPreviewSnapshot,
} from '@/domains/homepage-management/screens/homepage-editor-preview-storage';
import { PublicHomepageRenderer } from '@/domains/public-homepage/components/PublicHomepageRenderer';
import { ApiRequestError } from '@/platform/http/api';
import {
  buildTalentWorkspaceSectionPath,
} from '@/platform/routing/workspace-paths';
import { useSession } from '@/platform/runtime/session/session-provider';
import {
  ActionDrawer,
  ActionDrawerFooter,
  AsyncSubmitButton,
  ConfirmActionDialog,
  FormSection,
  GlassSurface,
  StateView,
} from '@/platform/ui';

type AuthoringMode = 'dev' | 'source' | 'visual';
type SourceMode = 'draft' | 'empty' | 'published';
type PreviewViewport = 'desktop' | 'tablet' | 'mobile';

const PREVIEW_VIEWPORT_CLASSES: Record<PreviewViewport, string> = {
  desktop: 'max-w-none',
  tablet: 'max-w-3xl',
  mobile: 'max-w-sm',
};

interface EditorStatePayload {
  homepage: HomepageResponse;
  content: HomepageDraftContent;
  theme: ThemeConfig;
  sourceMode: SourceMode;
  sourceVersion: { id: string; versionNumber: number } | null;
}

interface NoticeState {
  tone: 'error' | 'success';
  message: string;
}

interface LeaveGuardState {
  href: string;
  label: string;
}

function PageInfoSummaryGrid({
  componentCount,
  copy,
  homepageUrl,
  sourceHint,
  sourceValue,
  tenantName,
}: Readonly<{
  componentCount: number;
  copy: HomepageEditorCopy;
  homepageUrl: string;
  sourceHint: string;
  sourceValue: string;
  tenantName: string;
}>) {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      <SummaryCard
        label={copy.summary.tenantLabel}
        value={tenantName}
        hint={copy.summary.tenantHint}
      />
      <SummaryCard
        label={copy.summary.sourceLabel}
        value={sourceValue}
        hint={sourceHint}
      />
      <SummaryCard
        label={copy.summary.componentsLabel}
        value={String(componentCount)}
        hint={copy.summary.componentsHint}
      />
      <SummaryCard
        label={copy.summary.homepageUrlLabel}
        value={homepageUrl}
        hint={copy.summary.homepageUrlHint}
      />
    </div>
  );
}

function resolveDevModeSelectedComponent(
  content: HomepageDraftContent,
  selectedPuckItem: HomepagePuckSelectedItem | null,
): HomepageDraftComponentRecord | null {
  if (selectedPuckItem?.id) {
    const matchedComponent = content.components.find((component) => component.id === selectedPuckItem.id);

    if (matchedComponent) {
      return matchedComponent;
    }
  }

  if (selectedPuckItem) {
    return {
      id: selectedPuckItem.id || `puck-${selectedPuckItem.type}`,
      order: 0,
      props: selectedPuckItem.props,
      type: selectedPuckItem.type,
      visible: selectedPuckItem.props.visible !== false,
    };
  }

  return content.components[0] ?? null;
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function asPrettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function buildPreviewHero(
  homepage: HomepageResponse | null,
  content: HomepageDraftContent,
): HomepageEditorPreviewHero {
  const profileCard = content.components.find((component) => component.type === 'ProfileCard');
  const profileProps = asRecord(profileCard?.props);

  const displayName = asString(profileProps.displayName).trim() || homepage?.homepagePath || '';
  const avatarUrl = asString(profileProps.avatarUrl).trim() || null;

  return {
    displayName,
    avatarUrl,
    timezone: null,
    description: homepage?.seoDescription || homepage?.seoTitle || null,
  };
}

function buildEditorSignature(input: {
  content: HomepageDraftContent;
  sourceJson: string;
  theme: ThemeConfig;
}) {
  return JSON.stringify({
    content: input.content,
    sourceJson: input.sourceJson,
    theme: input.theme,
  });
}

function buildSourceJson(content: HomepageDraftContent, theme: ThemeConfig) {
  return asPrettyJson(buildHomepageSourceDocument(content, theme));
}

function buildEditorLoadedStateSignature(content: HomepageDraftContent, theme: ThemeConfig) {
  return buildEditorSignature({
    content,
    sourceJson: buildSourceJson(content, theme),
    theme,
  });
}

async function loadHomepageEditorState(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  talentId: string,
): Promise<EditorStatePayload> {
  const homepage = await readHomepage(request, talentId);
  let sourceMode: SourceMode = 'empty';
  let sourceVersion: { id: string; versionNumber: number } | null = null;
  let sourceContent = EMPTY_HOMEPAGE_CONTENT;
  let sourceTheme = normalizeTheme(DEFAULT_THEME);

  if (homepage.draftVersion?.id) {
    const version = await readHomepageVersion(request, talentId, homepage.draftVersion.id);
    sourceMode = 'draft';
    sourceVersion = {
      id: version.id,
      versionNumber: version.versionNumber,
    };
    sourceContent = normalizeHomepageDraftContent(version.content);
    sourceTheme = normalizeTheme(version.theme);
  } else if (homepage.publishedVersion?.id) {
    const version = await readHomepageVersion(request, talentId, homepage.publishedVersion.id);
    sourceMode = 'published';
    sourceVersion = {
      id: version.id,
      versionNumber: version.versionNumber,
    };
    sourceContent = normalizeHomepageDraftContent(version.content);
    sourceTheme = normalizeTheme(version.theme);
  }

  return {
    homepage,
    content: sourceContent,
    theme: sourceTheme,
    sourceMode,
    sourceVersion,
  };
}

function NoticeBanner({
  tone,
  message,
}: Readonly<NoticeState>) {
  const toneClasses =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-rose-200 bg-rose-50 text-rose-800';

  return (
    <div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-medium ${toneClasses}`}>
      {message}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: Readonly<{
  label: string;
  value: string;
  hint: string;
}>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 break-all text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>
    </div>
  );
}

function AuthoringModeSelector({
  copy,
  compact = false,
  isVisualDisabled,
  mode,
  onModeChange,
}: Readonly<{
  copy: HomepageEditorCopy;
  compact?: boolean;
  isVisualDisabled: boolean;
  mode: AuthoringMode;
  onModeChange: (mode: AuthoringMode) => void;
}>) {
  const buttons = (
    <div className="inline-flex rounded-full border border-slate-200 bg-white p-1" role="group" aria-label={copy.modes.title}>
      {([
        { icon: Eye, mode: 'visual' as const, label: copy.modes.visual },
        { icon: Info, mode: 'dev' as const, label: copy.modes.dev },
        { icon: Code2, mode: 'source' as const, label: copy.modes.source },
      ]).map(({ icon: Icon, label, mode: nextMode }) => {
        const isActive = mode === nextMode;
        const disabled = nextMode === 'visual' && isVisualDisabled;

        return (
          <button
            key={nextMode}
            type="button"
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => onModeChange(nextMode)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              isActive
                ? 'bg-slate-950 text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-45'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
  const content = (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">{copy.modes.title}</p>
        <p className="text-xs leading-5 text-slate-500">
          {mode === 'visual'
            ? copy.modes.visualDescription
            : mode === 'dev'
              ? copy.modes.devDescription
              : copy.modes.sourceDescription}
        </p>
      </div>
      {buttons}
    </div>
  );

  if (compact) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
        {content}
      </div>
    );
  }

  return (
    <GlassSurface className="p-4">
      {content}
    </GlassSurface>
  );
}

function PreviewViewportControls({
  copy,
  previewViewport,
  onPreviewViewportChange,
}: Readonly<{
  copy: HomepageEditorCopy;
  previewViewport: PreviewViewport;
  onPreviewViewportChange: (viewport: PreviewViewport) => void;
}>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">{copy.sections.previewViewportLabel}</p>
        <p className="text-xs leading-5 text-slate-500">{copy.sections.previewViewportHint}</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={copy.sections.previewViewportLabel}>
        {(['desktop', 'tablet', 'mobile'] as const).map((viewport) => {
          const isActive = previewViewport === viewport;
          const label = viewport === 'desktop'
            ? copy.sections.previewViewportDesktop
            : viewport === 'tablet'
              ? copy.sections.previewViewportTablet
              : copy.sections.previewViewportMobile;

          return (
            <button
              key={viewport}
              type="button"
              aria-pressed={isActive}
              onClick={() => onPreviewViewportChange(viewport)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isActive
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HomepagePreviewFrame({
  content,
  hero,
  homepage,
  previewViewport,
  theme,
}: Readonly<{
  content: HomepageDraftContent;
  hero: HomepageEditorPreviewHero;
  homepage: HomepageResponse;
  previewViewport: PreviewViewport;
  theme: ThemeConfig;
}>) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className={`mx-auto transition-[max-width] duration-200 ${PREVIEW_VIEWPORT_CLASSES[previewViewport]}`}>
        <PublicHomepageRenderer
          content={content}
          theme={theme}
          updatedAt={homepage.updatedAt}
          hero={hero}
        />
      </div>
    </div>
  );
}

export function HomepageEditorScreen({
  tenantId,
  talentId,
  standalone = false,
}: Readonly<{
  tenantId: string;
  talentId: string;
  standalone?: boolean;
}>) {
  const router = useRouter();
  const { copy } = useHomepageEditorCopy();
  const { request, session } = useSession();
  const [homepage, setHomepage] = useState<HomepageResponse | null>(null);
  const [content, setContent] = useState<HomepageDraftContent>(EMPTY_HOMEPAGE_CONTENT);
  const [theme, setTheme] = useState<ThemeConfig>(normalizeTheme(DEFAULT_THEME));
  const [sourceJson, setSourceJson] = useState(asPrettyJson(buildDefaultHomepageSourceDocument()));
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [lowCodeSnapshot, setLowCodeSnapshot] = useState<HomepageLowCodeSnapshot | null>(null);
  const [authoringMode, setAuthoringMode] = useState<AuthoringMode>('visual');
  const [previewViewport, setPreviewViewport] = useState<PreviewViewport>('desktop');
  const [isPageInfoOpen, setIsPageInfoOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [livePreviewId, setLivePreviewId] = useState<string | null>(null);
  const [sourceMode, setSourceMode] = useState<SourceMode>('empty');
  const [sourceVersion, setSourceVersion] = useState<{ id: string; versionNumber: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPuckItem, setSelectedPuckItem] = useState<HomepagePuckSelectedItem | null>(null);
  const [baselineSignature, setBaselineSignature] = useState(() =>
    buildEditorLoadedStateSignature(EMPTY_HOMEPAGE_CONTENT, normalizeTheme(DEFAULT_THEME)),
  );
  const [leaveGuardState, setLeaveGuardState] = useState<LeaveGuardState | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadEditor() {
      setLoading(true);
      setLoadError(null);

      try {
        const nextState = await loadHomepageEditorState(request, talentId);

        if (cancelled) {
          return;
        }

        const nextSourceJson = buildSourceJson(nextState.content, nextState.theme);

        setHomepage(nextState.homepage);
        setContent(nextState.content);
        setTheme(nextState.theme);
        setSourceJson(nextSourceJson);
        setSourceError(null);
        setLowCodeSnapshot(null);
        setAuthoringMode(isAdvancedSourceContent(nextState.content) ? 'source' : 'visual');
        setIsPageInfoOpen(false);
        setIsPreviewOpen(false);
        setLivePreviewId(null);
        setSelectedPuckItem(null);
        setSourceMode(nextState.sourceMode);
        setSourceVersion(nextState.sourceVersion);
        setBaselineSignature(buildEditorSignature({
          content: nextState.content,
          sourceJson: nextSourceJson,
          theme: nextState.theme,
        }));
      } catch (reason) {
        if (!cancelled) {
          setLoadError(getErrorMessage(reason, copy.state.loadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadEditor();

    return () => {
      cancelled = true;
    };
  }, [copy.state.loadError, request, talentId]);

  const isAdvancedEjected = isAdvancedSourceContent(content);
  const hasInvalidSource = Boolean(sourceError);
  const hasUnsavedChanges =
    buildEditorSignature({
      content,
      sourceJson,
      theme,
    }) !== baselineSignature;
  const previewHero = useMemo(() => buildPreviewHero(homepage, content), [content, homepage]);
  const devModeSelectedComponent = useMemo(
    () => resolveDevModeSelectedComponent(content, selectedPuckItem),
    [content, selectedPuckItem],
  );

  useEffect(() => {
    if (authoringMode !== 'source' && !sourceError) {
      setSourceJson(buildSourceJson(content, theme));
    }
  }, [authoringMode, content, sourceError, theme]);

  useEffect(() => {
    if (!homepage || !livePreviewId) {
      return;
    }

    writeHomepageEditorPreviewSnapshot(livePreviewId, {
      schemaVersion: 1,
      tenantId,
      talentId,
      homepageUrl: homepage.homepageUrl,
      updatedAt: homepage.updatedAt,
      content,
      theme,
      hero: previewHero,
    });
  }, [content, homepage, livePreviewId, previewHero, talentId, tenantId, theme]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  function handleContentChange(nextContent: HomepageDraftContent) {
    setContent(nextContent);
    setNotice(null);
  }

  function handleSourceJsonChange(nextValue: string) {
    setSourceJson(nextValue);

    const parsed = parseHomepageSourceDocument(nextValue);

    if (!parsed.ok) {
      setSourceError(copy.state[parsed.reason]);
      return;
    }

    setSourceError(null);
    setContent(markAdvancedSourceContent(parsed.value.content));
    setTheme(parsed.value.theme);
    setNotice(null);
  }

  function handleAuthoringModeChange(nextMode: AuthoringMode) {
    if (nextMode === authoringMode) {
      return;
    }

    if (nextMode === 'visual') {
      if (!canSwitchFromAdvancedSourceToVisual(isAdvancedEjected)) {
        setNotice({
          tone: 'error',
          message: copy.state.visualLockedAfterEject,
        });
        return;
      }

      setAuthoringMode('visual');
      setNotice(null);
      return;
    }

    if (nextMode === 'dev') {
      setAuthoringMode('dev');
      setNotice(null);
      return;
    }

    const nextContent = isAdvancedEjected ? content : markAdvancedSourceContent(content);

    if (!isAdvancedEjected && !lowCodeSnapshot) {
      setLowCodeSnapshot(createLowCodeSnapshot(content, theme));
    }

    setContent(nextContent);
    setSourceJson(buildSourceJson(nextContent, theme));
    setSourceError(null);
    setAuthoringMode('source');
    setNotice(null);
  }

  function handleRestoreLowCodeSnapshot() {
    if (!lowCodeSnapshot) {
      return;
    }

    const restored = restoreLowCodeSnapshot(lowCodeSnapshot);
    const restoredSourceJson = buildSourceJson(restored.content, restored.theme);

    setContent(restored.content);
    setTheme(restored.theme);
    setSourceJson(restoredSourceJson);
    setSourceError(null);
    setLowCodeSnapshot(null);
    setAuthoringMode('visual');
    setNotice({
      tone: 'success',
      message: copy.state.lowCodeSnapshotRestored,
    });
  }

  function handleOpenLivePreview() {
    if (!homepage) {
      return;
    }

    const previewId = livePreviewId || createHomepageEditorPreviewId(tenantId, talentId);
    const previewPath = buildHomepageEditorPreviewPath(tenantId, talentId, previewId);

    writeHomepageEditorPreviewSnapshot(previewId, {
      schemaVersion: 1,
      tenantId,
      talentId,
      homepageUrl: homepage.homepageUrl,
      updatedAt: homepage.updatedAt,
      content,
      theme,
      hero: previewHero,
    });
    setLivePreviewId(previewId);
    window.open(previewPath, '_blank');
  }

  function requestLeave(href: string, label: string) {
    if (!hasUnsavedChanges) {
      router.push(href);
      return;
    }

    setLeaveGuardState({
      href,
      label,
    });
  }

  async function handleSaveDraft() {
    if (hasInvalidSource) {
      setNotice({
        tone: 'error',
        message: copy.state.invalidEditorsBeforeSave,
      });
      return;
    }

    setIsSaving(true);
    setNotice(null);

    try {
      const result = await saveHomepageDraft(request, talentId, {
        content,
        theme,
      });
      const nextState = await loadHomepageEditorState(request, talentId);
      const nextSourceJson = buildSourceJson(nextState.content, nextState.theme);

      setHomepage(nextState.homepage);
      setContent(nextState.content);
      setTheme(nextState.theme);
      setSourceJson(nextSourceJson);
      setSourceError(null);
      setLowCodeSnapshot(null);
      setAuthoringMode(isAdvancedSourceContent(nextState.content) ? 'source' : 'visual');
      setSelectedPuckItem(null);
      setSourceMode(nextState.sourceMode);
      setSourceVersion(nextState.sourceVersion);
      setBaselineSignature(buildEditorSignature({
        content: nextState.content,
        sourceJson: nextSourceJson,
        theme: nextState.theme,
      }));
      setNotice({
        tone: 'success',
        message: result.isNewVersion
          ? copy.notices.saveNewVersion(result.draftVersion.versionNumber)
          : copy.notices.saveNoChange(result.draftVersion.versionNumber),
      });
    } catch (reason) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(reason, copy.state.saveError),
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <GlassSurface className="p-8">
          <p className="text-sm font-medium text-slate-500">{copy.state.loading}</p>
        </GlassSurface>
      </div>
    );
  }

  if (loadError || !homepage) {
    return (
      <StateView
        status="error"
        title={copy.state.unavailableTitle}
        description={loadError || undefined}
      />
    );
  }

  const sourceValue =
    sourceMode === 'draft'
      ? sourceVersion
        ? copy.summary.sourceDraftVersion(sourceVersion.versionNumber)
        : copy.summary.sourceDraft
      : sourceMode === 'published'
        ? sourceVersion
          ? copy.summary.sourcePublishedVersion(sourceVersion.versionNumber)
          : copy.summary.sourcePublished
        : copy.summary.sourceEmpty;
  const sourceHint =
    sourceMode === 'draft'
      ? copy.summary.sourceDraftHint
      : sourceMode === 'published'
        ? copy.summary.sourcePublishedHint
        : copy.summary.sourceEmptyHint;
  const exitActionLabel = standalone ? copy.actions.exitEditor : copy.actions.backToManagement;
  const tenantName = session?.tenantName || copy.summary.tenantFallback;
  const puckEditor = (
    <HomepagePuckEditor
      content={content}
      copy={copy}
      fitToParent={standalone}
      isAdvancedEjected={isAdvancedEjected}
      onContentChange={handleContentChange}
      onSaveDraft={() => void handleSaveDraft()}
      onSelectedItemChange={setSelectedPuckItem}
      theme={theme}
    />
  );

  return (
    <div className={standalone ? 'flex min-h-[100dvh] flex-col gap-4 bg-slate-50 p-4' : 'space-y-6'}>
      {standalone ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
          <button
            type="button"
            onClick={() => {
              requestLeave(
                buildTalentWorkspaceSectionPath(tenantId, talentId, 'homepage'),
                exitActionLabel,
              );
            }}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {exitActionLabel}
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border border-slate-200 bg-white p-1" role="group" aria-label={copy.modes.title}>
              {([
                { icon: Eye, mode: 'visual' as const, label: copy.modes.visual },
                { icon: Info, mode: 'dev' as const, label: copy.modes.dev },
                { icon: Code2, mode: 'source' as const, label: copy.modes.source },
              ]).map(({ icon: Icon, label, mode: nextMode }) => {
                const isActive = authoringMode === nextMode;
                const disabled = nextMode === 'visual' && isAdvancedEjected;

                return (
                  <button
                    key={nextMode}
                    type="button"
                    aria-pressed={isActive}
                    disabled={disabled}
                    onClick={() => handleAuthoringModeChange(nextMode)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      isActive
                        ? 'bg-slate-950 text-white'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-45'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                );
              })}
            </div>
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                hasUnsavedChanges
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {hasUnsavedChanges ? copy.actions.unsavedChanges : copy.actions.allChangesSaved}
            </div>
            <button
              type="button"
              onClick={() => setIsPageInfoOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Info className="h-4 w-4" />
              {copy.actions.pageInfo}
            </button>
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Eye className="h-4 w-4" />
              {copy.actions.previewDraft}
            </button>
            <button
              type="button"
              onClick={handleOpenLivePreview}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <ExternalLink className="h-4 w-4" />
              {copy.actions.openLivePreview}
            </button>
            <AsyncSubmitButton
              type="button"
              isPending={isSaving}
              pendingText={copy.actions.savingDraft}
              disabled={hasInvalidSource}
              onClick={() => void handleSaveDraft()}
              className="rounded-full px-4"
            >
              <Save className="mr-2 h-4 w-4" />
              {copy.actions.saveDraft}
            </AsyncSubmitButton>
          </div>
        </div>
      ) : (
        <>
          <GlassSurface className="p-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  <Globe2 className="h-3.5 w-3.5" />
                  {copy.header.eyebrow}
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold text-slate-950">{copy.header.title}</h1>
                  <p className="max-w-3xl text-sm leading-6 text-slate-600">{copy.header.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    requestLeave(
                      buildTalentWorkspaceSectionPath(tenantId, talentId, 'homepage'),
                      exitActionLabel,
                    );
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {exitActionLabel}
                </button>
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                    hasUnsavedChanges
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {hasUnsavedChanges ? copy.actions.unsavedChanges : copy.actions.allChangesSaved}
                </div>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <Eye className="h-4 w-4" />
                  {copy.actions.previewDraft}
                </button>
                <button
                  type="button"
                  onClick={handleOpenLivePreview}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <ExternalLink className="h-4 w-4" />
                  {copy.actions.openLivePreview}
                </button>
                <AsyncSubmitButton
                  type="button"
                  isPending={isSaving}
                  pendingText={copy.actions.savingDraft}
                  disabled={hasInvalidSource}
                  onClick={() => void handleSaveDraft()}
                  className="rounded-full px-5"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {copy.actions.saveDraft}
                </AsyncSubmitButton>
              </div>
            </div>
          </GlassSurface>

          <PageInfoSummaryGrid
            componentCount={content.components.length}
            copy={copy}
            homepageUrl={homepage.homepageUrl}
            sourceHint={sourceHint}
            sourceValue={sourceValue}
            tenantName={tenantName}
          />
        </>
      )}

      <div className={standalone ? 'flex min-h-0 flex-1 flex-col gap-4' : 'space-y-6'}>
        {notice ? <NoticeBanner tone={notice.tone} message={notice.message} /> : null}

        {standalone ? null : (
          <AuthoringModeSelector
            copy={copy}
            isVisualDisabled={isAdvancedEjected}
            mode={authoringMode}
            onModeChange={handleAuthoringModeChange}
          />
        )}

        {authoringMode === 'source' ? (
          <GlassSurface className={standalone ? 'flex min-h-0 flex-1 flex-col p-6' : 'p-6'}>
            <FormSection
              title={copy.sections.sourceTitle}
              description={copy.sections.sourceDescription}
            >
              <div className={standalone ? 'flex min-h-0 flex-1 flex-col space-y-4' : 'space-y-4'}>
                {lowCodeSnapshot ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-medium text-amber-900">{copy.state.visualLockedAfterEject}</p>
                    <button
                      type="button"
                      onClick={handleRestoreLowCodeSnapshot}
                      className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {copy.actions.restoreLowCodeSnapshot}
                    </button>
                  </div>
                ) : null}
                <label htmlFor="homepage-source-editor" className="text-sm font-medium text-slate-800">
                  {copy.sections.sourceJsonLabel}
                </label>
                <textarea
                  id="homepage-source-editor"
                  name="homepage-source"
                  value={sourceJson}
                  onChange={(event) => handleSourceJsonChange(event.target.value)}
                  rows={24}
                  className={`w-full rounded-3xl border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-sm leading-6 text-slate-50 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 ${
                    standalone ? 'min-h-0 flex-1' : 'min-h-[560px]'
                  }`}
                  aria-invalid={sourceError ? 'true' : 'false'}
                  spellCheck={false}
                />
                {sourceError ? (
                  <p className="text-sm font-medium text-rose-700">{sourceError}</p>
                ) : (
                  <p className="text-xs leading-5 text-slate-500">{copy.sections.sourceJsonHint}</p>
                )}
              </div>
            </FormSection>
          </GlassSurface>
        ) : authoringMode === 'dev' ? (
          standalone ? (
            <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="flex min-h-0 flex-col">
                {puckEditor}
              </div>
              <HomepageEditorDevModePanel
                content={content}
                copy={copy}
                isAdvancedEjected={isAdvancedEjected}
                selectedComponent={devModeSelectedComponent}
                theme={theme}
              />
            </div>
          ) : (
            <GlassSurface className="p-6">
              <FormSection
                title={copy.sections.draftBlocksTitle}
                description={copy.modes.devDescription}
              >
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div>{puckEditor}</div>
                  <HomepageEditorDevModePanel
                    content={content}
                    copy={copy}
                    isAdvancedEjected={isAdvancedEjected}
                    selectedComponent={devModeSelectedComponent}
                    theme={theme}
                  />
                </div>
              </FormSection>
            </GlassSurface>
          )
        ) : standalone ? (
          <div className="flex min-h-0 flex-1 flex-col">
            {puckEditor}
          </div>
        ) : (
          <GlassSurface className="p-6">
            <FormSection
              title={copy.sections.draftBlocksTitle}
              description={copy.sections.draftBlocksDescription}
            >
              {puckEditor}
            </FormSection>
          </GlassSurface>
        )}
      </div>

      <ActionDrawer
        open={isPageInfoOpen}
        onOpenChange={setIsPageInfoOpen}
        title={copy.sections.pageInfoTitle}
        description={copy.sections.pageInfoDescription}
        closeButtonAriaLabel={copy.actions.pageInfo}
        size="lg"
      >
        <PageInfoSummaryGrid
          componentCount={content.components.length}
          copy={copy}
          homepageUrl={homepage.homepageUrl}
          sourceHint={sourceHint}
          sourceValue={sourceValue}
          tenantName={tenantName}
        />
      </ActionDrawer>

      <ActionDrawer
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        title={copy.preview.drawerTitle}
        description={copy.preview.drawerDescription}
        closeButtonAriaLabel={copy.preview.closeLabel}
        size="full"
        footer={(
          <ActionDrawerFooter
            secondary={(
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {copy.dialogs.leaveCancel}
              </button>
            )}
            primary={(
              <button
                type="button"
                onClick={handleOpenLivePreview}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <ExternalLink className="h-4 w-4" />
                {copy.actions.openLivePreview}
              </button>
            )}
          />
        )}
      >
        <div className="space-y-4">
          <PreviewViewportControls
            copy={copy}
            previewViewport={previewViewport}
            onPreviewViewportChange={setPreviewViewport}
          />
          <HomepagePreviewFrame
            content={content}
            hero={previewHero}
            homepage={homepage}
            previewViewport={previewViewport}
            theme={theme}
          />
        </div>
      </ActionDrawer>

      <ConfirmActionDialog
        open={leaveGuardState !== null}
        title={copy.dialogs.leaveTitle}
        description={leaveGuardState ? copy.dialogs.leaveDescription(leaveGuardState.label) : ''}
        confirmText={copy.dialogs.leaveConfirm}
        cancelText={copy.dialogs.leaveCancel}
        intent="danger"
        onCancel={() => {
          setLeaveGuardState(null);
        }}
        onConfirm={() => {
          if (!leaveGuardState) {
            return;
          }

          const targetHref = leaveGuardState.href;
          setLeaveGuardState(null);
          router.push(targetHref);
        }}
      />
    </div>
  );
}
