'use client';

import {
  DEFAULT_THEME,
  normalizeTheme,
  type ThemeConfig,
} from '@tcrn/shared';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bold,
  Eye,
  EyeOff,
  Globe2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import {
  type HomepageDraftComponentRecord,
  type HomepageDraftContent,
  type HomepageResponse,
  readHomepage,
  readHomepageVersion,
  saveHomepageDraft,
} from '@/domains/homepage-management/api/homepage.api';
import {
  type HomepageEditorCopy,
  useHomepageEditorCopy,
} from '@/domains/homepage-management/screens/homepage-editor.copy';
import { PublicHomepageRenderer } from '@/domains/public-homepage/components/PublicHomepageRenderer';
import { ApiRequestError } from '@/platform/http/api';
import {
  buildTalentWorkspaceSectionPath,
} from '@/platform/routing/workspace-paths';
import { useSession } from '@/platform/runtime/session/session-provider';
import {
  AsyncSubmitButton,
  ConfirmActionDialog,
  FormSection,
  GlassSurface,
  StateView,
} from '@/platform/ui';

type ComponentCategory = 'content' | 'core' | 'interactive' | 'layout' | 'media';
type SourceMode = 'draft' | 'empty' | 'published';
type PreviewViewport = 'desktop' | 'tablet' | 'mobile';
type StructuredBlockType =
  | 'ImageGallery'
  | 'LinkButton'
  | 'MarshmallowWidget'
  | 'ProfileCard'
  | 'RichText'
  | 'SocialLinks';

const PREVIEW_VIEWPORT_CLASSES: Record<PreviewViewport, string> = {
  desktop: 'max-w-none',
  tablet: 'max-w-3xl',
  mobile: 'max-w-sm',
};

interface ComponentCatalogEntry {
  category: ComponentCategory;
  defaultProps: Record<string, unknown>;
  type: string;
}

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

interface BlockPropsEditorProps {
  component: HomepageDraftComponentRecord;
  copy: HomepageEditorCopy;
  error?: string;
  isAdvancedJsonOpen: boolean;
  jsonValue: string;
  onAdvancedJsonOpenChange: (isOpen: boolean) => void;
  onJsonChange: (nextValue: string) => void;
  onPropsChange: (nextProps: Record<string, unknown>) => void;
}

interface StructuredBlockEditorContext {
  copy: HomepageEditorCopy;
  mergeProps: (nextPartialProps: Record<string, unknown>) => void;
  optionCopy: HomepageEditorCopy['structured']['options'];
  props: Record<string, unknown>;
}

type StructuredBlockEditorAdapter = (context: Readonly<StructuredBlockEditorContext>) => ReactNode;

interface FieldFrameProps {
  label: string;
  children: ReactNode;
}

interface TextInputProps {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  type?: 'number' | 'text' | 'url';
  min?: number;
}

interface SelectInputProps {
  label: string;
  value: string;
  options: readonly string[];
  optionCopy: Record<string, string>;
  onChange: (nextValue: string) => void;
}

const EMPTY_HOMEPAGE_CONTENT: HomepageDraftContent = {
  version: '1.0',
  components: [],
};

const COMPONENT_CATALOG: ComponentCatalogEntry[] = [
  {
    type: 'ProfileCard',
    category: 'core',
    defaultProps: {
      avatarUrl: '',
      displayName: '',
      bio: '',
      avatarShape: 'circle',
      nameFontSize: 'large',
      bioMaxLines: 3,
    },
  },
  {
    type: 'SocialLinks',
    category: 'core',
    defaultProps: {
      platforms: [],
      style: 'icon',
      layout: 'horizontal',
      iconSize: 'medium',
    },
  },
  {
    type: 'ImageGallery',
    category: 'media',
    defaultProps: {
      images: [],
      layoutMode: 'grid',
      columns: 3,
      gap: 'medium',
      showCaptions: false,
    },
  },
  {
    type: 'VideoEmbed',
    category: 'media',
    defaultProps: {
      videoUrl: '',
      aspectRatio: '16:9',
      autoplay: false,
      showControls: true,
    },
  },
  {
    type: 'RichText',
    category: 'content',
    defaultProps: {
      contentHtml: '',
      textAlign: 'left',
    },
  },
  {
    type: 'LinkButton',
    category: 'interactive',
    defaultProps: {
      label: '',
      url: '',
      style: 'primary',
      fullWidth: false,
    },
  },
  {
    type: 'MarshmallowWidget',
    category: 'interactive',
    defaultProps: {
      displayMode: 'compact',
      showRecentCount: 3,
      showSubmitButton: true,
    },
  },
  {
    type: 'Schedule',
    category: 'interactive',
    defaultProps: {
      title: '',
      weekOf: '',
      events: [],
    },
  },
  {
    type: 'MusicPlayer',
    category: 'media',
    defaultProps: {
      platform: 'spotify',
      embedValue: '',
      title: '',
      artist: '',
    },
  },
  {
    type: 'LiveStatus',
    category: 'core',
    defaultProps: {
      platform: 'youtube',
      channelName: '',
      streamUrl: '',
      isLive: false,
      viewers: '',
      title: '',
    },
  },
  {
    type: 'Divider',
    category: 'layout',
    defaultProps: {
      style: 'solid',
      spacing: 'medium',
    },
  },
  {
    type: 'Spacer',
    category: 'layout',
    defaultProps: {
      height: 'medium',
    },
  },
  {
    type: 'BilibiliDynamic',
    category: 'interactive',
    defaultProps: {
      uid: '',
      title: '',
      maxItems: 5,
      filterType: 'all',
      cardStyle: 'standard',
      refreshInterval: 0,
      showHeader: true,
    },
  },
];

const STRUCTURED_BLOCK_TYPES = [
  'ImageGallery',
  'LinkButton',
  'MarshmallowWidget',
  'ProfileCard',
  'RichText',
  'SocialLinks',
] as const satisfies readonly StructuredBlockType[];

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiRequestError ? reason.message : fallback;
}

function asPrettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function cloneObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeComponents(components: HomepageDraftComponentRecord[]) {
  return [...components]
    .sort((left, right) => left.order - right.order)
    .map((component, index) => ({
      ...component,
      order: index + 1,
      visible: component.visible !== false,
    }));
}

function normalizeDraftContent(content: HomepageDraftContent | null | undefined): HomepageDraftContent {
  return {
    version: content?.version || '1.0',
    components: normalizeComponents(content?.components || []),
  };
}

function createComponentId() {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `component-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createComponentFromCatalog(
  entry: ComponentCatalogEntry,
  order: number,
): HomepageDraftComponentRecord {
  return {
    id: createComponentId(),
    type: entry.type,
    props: cloneObject(entry.defaultProps),
    order,
    visible: true,
  };
}

function parseJsonObject(input: string) {
  try {
    const value = JSON.parse(input) as unknown;

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {
        ok: false as const,
        reason: 'jsonObjectRequired' as const,
      };
    }

    return {
      ok: true as const,
      value: value as Record<string, unknown>,
    };
  } catch {
    return {
      ok: false as const,
      reason: 'invalidJson' as const,
    };
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function isStructuredBlockType(type: string): type is StructuredBlockType {
  return (STRUCTURED_BLOCK_TYPES as readonly string[]).includes(type);
}

function insertTextAtSelection(
  value: string,
  prefix: string,
  suffix = '',
) {
  const selection = typeof document === 'undefined' ? null : document.activeElement;

  if (!(selection instanceof HTMLTextAreaElement)) {
    return `${value}${prefix}${suffix}`;
  }

  const start = selection.selectionStart;
  const end = selection.selectionEnd;
  const selected = value.slice(start, end);

  return `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;
}

function getCatalogEntryCopy(copy: HomepageEditorCopy, type: string) {
  return copy.catalog.entries[type] || { description: type, label: type };
}

function buildPreviewHero(homepage: HomepageResponse | null, content: HomepageDraftContent) {
  const profileCard = content.components.find((component) => component.type === 'ProfileCard');
  const profileProps =
    profileCard && profileCard.props && typeof profileCard.props === 'object'
      ? (profileCard.props as Record<string, unknown>)
      : {};

  const displayName =
    typeof profileProps.displayName === 'string' && profileProps.displayName.trim()
      ? profileProps.displayName
      : homepage?.homepagePath || '';
  const avatarUrl =
    typeof profileProps.avatarUrl === 'string' && profileProps.avatarUrl.trim()
      ? profileProps.avatarUrl
      : null;

  return {
    displayName,
    avatarUrl,
    timezone: null,
    description: homepage?.seoDescription || homepage?.seoTitle || null,
  };
}

function buildComponentTextMap(content: HomepageDraftContent) {
  return Object.fromEntries(
    content.components.map((component) => [component.id, asPrettyJson(component.props)]),
  ) as Record<string, string>;
}

function buildEditorSignature(input: {
  content: HomepageDraftContent;
  theme: ThemeConfig;
  themeJson: string;
  componentJsonMap: Record<string, string>;
}) {
  return JSON.stringify({
    content: input.content,
    theme: input.theme,
    themeJson: input.themeJson,
    componentJsonEntries: Object.entries(input.componentJsonMap).sort(([left], [right]) => left.localeCompare(right)),
  });
}

function buildEditorLoadedStateSignature(content: HomepageDraftContent, theme: ThemeConfig) {
  return buildEditorSignature({
    content,
    theme,
    themeJson: asPrettyJson(theme),
    componentJsonMap: buildComponentTextMap(content),
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
    sourceContent = normalizeDraftContent(version.content);
    sourceTheme = normalizeTheme(version.theme);
  } else if (homepage.publishedVersion?.id) {
    const version = await readHomepageVersion(request, talentId, homepage.publishedVersion.id);
    sourceMode = 'published';
    sourceVersion = {
      id: version.id,
      versionNumber: version.versionNumber,
    };
    sourceContent = normalizeDraftContent(version.content);
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
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>
    </div>
  );
}

function FieldFrame({
  label,
  children,
}: Readonly<FieldFrameProps>) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = 'text',
  min,
}: Readonly<TextInputProps>) {
  return (
    <FieldFrame label={label}>
      <input
        type={type}
        value={value}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
    </FieldFrame>
  );
}

function TextAreaInput({
  label,
  value,
  onChange,
  rows = 4,
}: Readonly<{
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  rows?: number;
}>) {
  return (
    <FieldFrame label={label}>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
    </FieldFrame>
  );
}

function SelectInput({
  label,
  value,
  options,
  optionCopy,
  onChange,
}: Readonly<SelectInputProps>) {
  return (
    <FieldFrame label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {optionCopy[option] || option}
          </option>
        ))}
      </select>
    </FieldFrame>
  );
}

function CheckboxInput({
  label,
  checked,
  onChange,
}: Readonly<{
  label: string;
  checked: boolean;
  onChange: (nextValue: boolean) => void;
}>) {
  return (
    <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      {label}
    </label>
  );
}

function AdvancedJsonEditor({
  component,
  copy,
  error,
  jsonValue,
  onJsonChange,
}: Readonly<{
  component: HomepageDraftComponentRecord;
  copy: HomepageEditorCopy;
  error?: string;
  jsonValue: string;
  onJsonChange: (nextValue: string) => void;
}>) {
  const entryCopy = getCatalogEntryCopy(copy, component.type);

  return (
    <div className="space-y-2">
      <label htmlFor={`component-json-${component.id}`} className="text-sm font-medium text-slate-800">
        {copy.block.jsonLabel(entryCopy.label)}
      </label>
      <textarea
        id={`component-json-${component.id}`}
        name={`component-json-${component.id}`}
        value={jsonValue || '{}'}
        onChange={(event) => onJsonChange(event.target.value)}
        rows={10}
        className="min-h-[220px] w-full rounded-3xl border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-sm leading-6 text-slate-50 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        aria-invalid={error ? 'true' : 'false'}
        spellCheck={false}
      />
      {error ? (
        <p className="text-sm font-medium text-rose-700">{error}</p>
      ) : (
        <p className="text-xs leading-5 text-slate-500">{copy.block.jsonHint}</p>
      )}
    </div>
  );
}

function StructuredToolbarButton({
  label,
  children,
  onClick,
}: Readonly<{
  label: string;
  children: ReactNode;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      {children}
    </button>
  );
}

const STRUCTURED_BLOCK_EDITOR_REGISTRY = {
  ProfileCard: ({ copy, mergeProps, optionCopy, props }) => (
    <div className="grid gap-4 md:grid-cols-2">
      <TextInput label={copy.structured.displayName} value={asString(props.displayName)} onChange={(value) => mergeProps({ displayName: value })} />
      <TextInput label={copy.structured.imageUrl} value={asString(props.avatarUrl)} onChange={(value) => mergeProps({ avatarUrl: value })} type="url" />
      <SelectInput label={copy.structured.shape} value={asString(props.avatarShape, 'circle')} options={['circle', 'rounded', 'square']} optionCopy={optionCopy} onChange={(value) => mergeProps({ avatarShape: value })} />
      <SelectInput label={copy.structured.nameFontSize} value={asString(props.nameFontSize, 'large')} options={['small', 'medium', 'large']} optionCopy={optionCopy} onChange={(value) => mergeProps({ nameFontSize: value })} />
      <div className="md:col-span-2">
        <TextAreaInput label={copy.structured.bio} value={asString(props.bio)} onChange={(value) => mergeProps({ bio: value })} />
      </div>
      <TextInput
        label={copy.structured.bioMaxLines}
        value={String(asNumber(props.bioMaxLines, 3))}
        type="number"
        min={1}
        onChange={(value) => mergeProps({ bioMaxLines: Math.max(Number(value) || 1, 1) })}
      />
    </div>
  ),
  SocialLinks: ({ copy, mergeProps, optionCopy, props }) => {
    const platforms = Array.isArray(props.platforms)
      ? props.platforms.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      : [];

    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <SelectInput label={copy.structured.style} value={asString(props.style, 'icon')} options={['icon', 'button', 'pill']} optionCopy={optionCopy} onChange={(value) => mergeProps({ style: value })} />
          <SelectInput label={copy.structured.layout} value={asString(props.layout, 'horizontal')} options={['horizontal', 'vertical', 'grid']} optionCopy={optionCopy} onChange={(value) => mergeProps({ layout: value })} />
          <SelectInput label={copy.structured.nameFontSize} value={asString(props.iconSize, 'medium')} options={['small', 'medium', 'large']} optionCopy={optionCopy} onChange={(value) => mergeProps({ iconSize: value })} />
        </div>
        <div className="space-y-3">
          {platforms.map((platform, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_1.2fr_1fr_auto] md:items-end">
                <TextInput
                  label={copy.structured.platformCode}
                  value={asString(platform.platformCode)}
                  onChange={(value) => {
                    const nextPlatforms = [...platforms];
                    nextPlatforms[index] = { ...platform, platformCode: value };
                    mergeProps({ platforms: nextPlatforms });
                  }}
                />
                <TextInput
                  label={copy.structured.url}
                  value={asString(platform.url)}
                  type="url"
                  onChange={(value) => {
                    const nextPlatforms = [...platforms];
                    nextPlatforms[index] = { ...platform, url: value };
                    mergeProps({ platforms: nextPlatforms });
                  }}
                />
                <TextInput
                  label={copy.structured.label}
                  value={asString(platform.label)}
                  onChange={(value) => {
                    const nextPlatforms = [...platforms];
                    nextPlatforms[index] = { ...platform, label: value };
                    mergeProps({ platforms: nextPlatforms });
                  }}
                />
                <button
                  type="button"
                  onClick={() => mergeProps({ platforms: platforms.filter((_, platformIndex) => platformIndex !== index) })}
                  aria-label={copy.structured.removeSocialLink(index + 1)}
                  className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-3 py-2 text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => mergeProps({ platforms: [...platforms, { platformCode: '', url: '', label: '' }] })}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            {copy.structured.addSocialLink}
          </button>
        </div>
      </div>
    );
  },
  ImageGallery: ({ copy, mergeProps, optionCopy, props }) => {
    const images = Array.isArray(props.images)
      ? props.images.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      : [];

    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <SelectInput label={copy.structured.layoutMode} value={asString(props.layoutMode, 'grid')} options={['carousel', 'grid', 'masonry']} optionCopy={optionCopy} onChange={(value) => mergeProps({ layoutMode: value })} />
          <SelectInput label={copy.structured.columns} value={String(asNumber(props.columns, 3))} options={['2', '3', '4']} optionCopy={optionCopy} onChange={(value) => mergeProps({ columns: Number(value) })} />
          <SelectInput label={copy.structured.gap} value={asString(props.gap, 'medium')} options={['small', 'medium', 'large']} optionCopy={optionCopy} onChange={(value) => mergeProps({ gap: value })} />
        </div>
        <CheckboxInput label={copy.structured.showCaptions} checked={asBoolean(props.showCaptions)} onChange={(value) => mergeProps({ showCaptions: value })} />
        <div className="space-y-3">
          {images.map((image, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-end">
                <TextInput
                  label={copy.structured.imageUrl}
                  value={asString(image.url)}
                  type="url"
                  onChange={(value) => {
                    const nextImages = [...images];
                    nextImages[index] = { ...image, url: value };
                    mergeProps({ images: nextImages });
                  }}
                />
                <TextInput
                  label={copy.structured.imageAlt}
                  value={asString(image.alt)}
                  onChange={(value) => {
                    const nextImages = [...images];
                    nextImages[index] = { ...image, alt: value };
                    mergeProps({ images: nextImages });
                  }}
                />
                <TextInput
                  label={copy.structured.caption}
                  value={asString(image.caption)}
                  onChange={(value) => {
                    const nextImages = [...images];
                    nextImages[index] = { ...image, caption: value };
                    mergeProps({ images: nextImages });
                  }}
                />
                <button
                  type="button"
                  onClick={() => mergeProps({ images: images.filter((_, imageIndex) => imageIndex !== index) })}
                  aria-label={copy.structured.removeImage(index + 1)}
                  className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-3 py-2 text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => mergeProps({ images: [...images, { url: '', alt: '', caption: '' }] })}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            {copy.structured.addImage}
          </button>
        </div>
      </div>
    );
  },
  RichText: ({ copy, mergeProps, optionCopy, props }) => {
    const contentHtml = asString(props.contentHtml);
    const applyRichTextPattern = (prefix: string, suffix = '') => {
      mergeProps({ contentHtml: insertTextAtSelection(contentHtml, prefix, suffix) });
    };

    return (
      <div className="space-y-4">
        <SelectInput label={copy.structured.textAlign} value={asString(props.textAlign, 'left')} options={['left', 'center', 'right']} optionCopy={optionCopy} onChange={(value) => mergeProps({ textAlign: value })} />
        <div className="flex flex-wrap gap-2" role="toolbar" aria-label={copy.structured.content}>
          <StructuredToolbarButton label={copy.structured.bold} onClick={() => applyRichTextPattern('<strong>', '</strong>')}>
            <Bold className="h-4 w-4" />
          </StructuredToolbarButton>
          <StructuredToolbarButton label={copy.structured.italic} onClick={() => applyRichTextPattern('<em>', '</em>')}>
            <Italic className="h-4 w-4" />
          </StructuredToolbarButton>
          <StructuredToolbarButton label={copy.structured.link} onClick={() => applyRichTextPattern('<a href="">', '</a>')}>
            <Link2 className="h-4 w-4" />
          </StructuredToolbarButton>
          <StructuredToolbarButton label={copy.structured.bulletList} onClick={() => applyRichTextPattern('<ul><li>', '</li></ul>')}>
            <List className="h-4 w-4" />
          </StructuredToolbarButton>
          <StructuredToolbarButton label={copy.structured.numberedList} onClick={() => applyRichTextPattern('<ol><li>', '</li></ol>')}>
            <ListOrdered className="h-4 w-4" />
          </StructuredToolbarButton>
        </div>
        <TextAreaInput label={copy.structured.content} value={contentHtml} onChange={(value) => mergeProps({ contentHtml: value })} rows={8} />
      </div>
    );
  },
  LinkButton: ({ copy, mergeProps, optionCopy, props }) => (
    <div className="grid gap-4 md:grid-cols-2">
      <TextInput label={copy.structured.label} value={asString(props.label)} onChange={(value) => mergeProps({ label: value })} />
      <TextInput label={copy.structured.url} value={asString(props.url)} type="url" onChange={(value) => mergeProps({ url: value })} />
      <SelectInput label={copy.structured.style} value={asString(props.style, 'primary')} options={['primary', 'secondary', 'outline', 'ghost']} optionCopy={optionCopy} onChange={(value) => mergeProps({ style: value })} />
      <div className="flex items-end">
        <CheckboxInput label={copy.structured.fullWidth} checked={asBoolean(props.fullWidth)} onChange={(value) => mergeProps({ fullWidth: value })} />
      </div>
    </div>
  ),
  MarshmallowWidget: ({ copy, mergeProps, optionCopy, props }) => (
    <div className="grid gap-4 md:grid-cols-2">
      <SelectInput label={copy.structured.displayMode} value={asString(props.displayMode, 'compact')} options={['compact', 'full']} optionCopy={optionCopy} onChange={(value) => mergeProps({ displayMode: value })} />
      <TextInput
        label={copy.structured.showRecentCount}
        value={String(asNumber(props.showRecentCount, 3))}
        type="number"
        min={0}
        onChange={(value) => mergeProps({ showRecentCount: Math.max(Number(value) || 0, 0) })}
      />
      <CheckboxInput label={copy.structured.showSubmitButton} checked={asBoolean(props.showSubmitButton, true)} onChange={(value) => mergeProps({ showSubmitButton: value })} />
    </div>
  ),
} satisfies Record<StructuredBlockType, StructuredBlockEditorAdapter>;

function BlockPropsEditor({
  component,
  copy,
  error,
  isAdvancedJsonOpen,
  jsonValue,
  onAdvancedJsonOpenChange,
  onJsonChange,
  onPropsChange,
}: Readonly<BlockPropsEditorProps>) {
  const props = asRecord(component.props);
  const optionCopy = copy.structured.options;

  function mergeProps(nextPartialProps: Record<string, unknown>) {
    onPropsChange({
      ...props,
      ...nextPartialProps,
    });
  }

  function renderStructuredFields() {
    if (!isStructuredBlockType(component.type)) {
      return null;
    }

    return STRUCTURED_BLOCK_EDITOR_REGISTRY[component.type]({
      copy,
      mergeProps,
      optionCopy,
      props,
    });
  }

  if (!isStructuredBlockType(component.type)) {
    return (
      <div className="mt-4 space-y-3">
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {copy.structured.unsupportedAdvancedOnly}
        </p>
        <AdvancedJsonEditor
          component={component}
          copy={copy}
          error={error}
          jsonValue={jsonValue}
          onJsonChange={onJsonChange}
        />
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
        {renderStructuredFields()}
      </div>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onAdvancedJsonOpenChange(!isAdvancedJsonOpen)}
          aria-expanded={isAdvancedJsonOpen}
          aria-controls={`component-json-panel-${component.id}`}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {isAdvancedJsonOpen ? copy.structured.hideAdvancedJson : copy.structured.advancedJson}
        </button>
        {isAdvancedJsonOpen ? (
          <div id={`component-json-panel-${component.id}`}>
            <AdvancedJsonEditor
              component={component}
              copy={copy}
              error={error}
              jsonValue={jsonValue}
              onJsonChange={onJsonChange}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function HomepageEditorScreen({
  tenantId,
  talentId,
}: Readonly<{
  tenantId: string;
  talentId: string;
}>) {
  const router = useRouter();
  const { copy } = useHomepageEditorCopy();
  const { request, session } = useSession();
  const [homepage, setHomepage] = useState<HomepageResponse | null>(null);
  const [content, setContent] = useState<HomepageDraftContent>(EMPTY_HOMEPAGE_CONTENT);
  const [theme, setTheme] = useState<ThemeConfig>(normalizeTheme(DEFAULT_THEME));
  const [themeJson, setThemeJson] = useState(asPrettyJson(normalizeTheme(DEFAULT_THEME)));
  const [themeError, setThemeError] = useState<string | null>(null);
  const [componentJsonMap, setComponentJsonMap] = useState<Record<string, string>>({});
  const [componentErrors, setComponentErrors] = useState<Record<string, string>>({});
  const [activeComponentEditorId, setActiveComponentEditorId] = useState<string | null>(null);
  const [advancedJsonOpenMap, setAdvancedJsonOpenMap] = useState<Record<string, boolean>>({});
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<PreviewViewport>('desktop');
  const [isThemeEditorOpen, setIsThemeEditorOpen] = useState(false);
  const [sourceMode, setSourceMode] = useState<SourceMode>('empty');
  const [sourceVersion, setSourceVersion] = useState<{ id: string; versionNumber: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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

        setHomepage(nextState.homepage);
        setContent(nextState.content);
        setTheme(nextState.theme);
        setThemeJson(asPrettyJson(nextState.theme));
        setThemeError(null);
        setComponentJsonMap(buildComponentTextMap(nextState.content));
        setComponentErrors({});
        setActiveComponentEditorId(null);
        setAdvancedJsonOpenMap({});
        setIsCatalogOpen(false);
        setIsThemeEditorOpen(false);
        setSourceMode(nextState.sourceMode);
        setSourceVersion(nextState.sourceVersion);
        setBaselineSignature(buildEditorLoadedStateSignature(nextState.content, nextState.theme));
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
  }, [request, talentId]);

  const hasInvalidJson =
    !!themeError || Object.values(componentErrors).some((message) => Boolean(message));
  const hasUnsavedChanges =
    buildEditorSignature({
      content,
      theme,
      themeJson,
      componentJsonMap,
    }) !== baselineSignature;
  const previewHero = useMemo(() => buildPreviewHero(homepage, content), [content, homepage]);

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

  function replaceComponents(nextComponents: HomepageDraftComponentRecord[]) {
    setContent((current) => ({
      ...current,
      components: normalizeComponents(nextComponents),
    }));
  }

  function handleAddComponent(entry: ComponentCatalogEntry) {
    const nextComponent = createComponentFromCatalog(entry, content.components.length + 1);

    replaceComponents([...content.components, nextComponent]);
    setComponentJsonMap((current) => ({
      ...current,
      [nextComponent.id]: asPrettyJson(nextComponent.props),
    }));
    setActiveComponentEditorId(nextComponent.id);
    setIsCatalogOpen(false);
    setNotice(null);
  }

  function handleMoveComponent(componentId: string, direction: 'down' | 'up') {
    const currentIndex = content.components.findIndex((component) => component.id === componentId);

    if (currentIndex < 0) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= content.components.length) {
      return;
    }

    const nextComponents = [...content.components];
    const [component] = nextComponents.splice(currentIndex, 1);
    nextComponents.splice(targetIndex, 0, component);
    replaceComponents(nextComponents);
  }

  function handleRemoveComponent(componentId: string) {
    replaceComponents(content.components.filter((component) => component.id !== componentId));
    setComponentJsonMap((current) => {
      const nextMap = { ...current };
      delete nextMap[componentId];
      return nextMap;
    });
    setComponentErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[componentId];
      return nextErrors;
    });
    setAdvancedJsonOpenMap((current) => {
      const nextMap = { ...current };
      delete nextMap[componentId];
      return nextMap;
    });
    setActiveComponentEditorId((current) => (current === componentId ? null : current));
  }

  function handleToggleVisibility(componentId: string) {
    replaceComponents(
      content.components.map((component) =>
        component.id === componentId
          ? {
              ...component,
              visible: !component.visible,
            }
          : component,
      ),
    );
  }

  function handleComponentJsonChange(componentId: string, nextValue: string) {
    setComponentJsonMap((current) => ({
      ...current,
      [componentId]: nextValue,
    }));

    const parsed = parseJsonObject(nextValue);

    if (!parsed.ok) {
      setComponentErrors((current) => ({
        ...current,
        [componentId]: copy.state[parsed.reason],
      }));
      return;
    }

    setComponentErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[componentId];
      return nextErrors;
    });

    setContent((current) => ({
      ...current,
      components: current.components.map((component) =>
        component.id === componentId
          ? {
              ...component,
              props: parsed.value,
            }
          : component,
      ),
    }));
  }

  function handleComponentPropsChange(componentId: string, nextProps: Record<string, unknown>) {
    const normalizedProps = cloneObject(nextProps);

    setComponentJsonMap((current) => ({
      ...current,
      [componentId]: asPrettyJson(normalizedProps),
    }));
    setComponentErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[componentId];
      return nextErrors;
    });
    setContent((current) => ({
      ...current,
      components: current.components.map((component) =>
        component.id === componentId
          ? {
              ...component,
              props: normalizedProps,
            }
          : component,
      ),
    }));
  }

  function handleThemeJsonChange(nextValue: string) {
    setThemeJson(nextValue);

    const parsed = parseJsonObject(nextValue);

    if (!parsed.ok) {
      setThemeError(copy.state[parsed.reason]);
      return;
    }

    setThemeError(null);
    setTheme(normalizeTheme(parsed.value as unknown as ThemeConfig));
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
    if (hasInvalidJson) {
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

      setActiveComponentEditorId(null);
      setIsThemeEditorOpen(false);
      setAdvancedJsonOpenMap({});
      setHomepage(nextState.homepage);
      setContent(nextState.content);
      setTheme(nextState.theme);
      setThemeJson(asPrettyJson(nextState.theme));
      setThemeError(null);
      setComponentJsonMap(buildComponentTextMap(nextState.content));
      setComponentErrors({});
      setAdvancedJsonOpenMap({});
      setSourceMode(nextState.sourceMode);
      setSourceVersion(nextState.sourceVersion);
      setBaselineSignature(buildEditorLoadedStateSignature(nextState.content, nextState.theme));
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

  return (
    <div className="space-y-6">
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
                  copy.actions.backToManagement,
                );
              }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {copy.actions.backToManagement}
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
            <AsyncSubmitButton
              type="button"
              isPending={isSaving}
              pendingText={copy.actions.savingDraft}
              disabled={hasInvalidJson}
              onClick={() => void handleSaveDraft()}
              className="rounded-full px-5"
            >
              <Save className="mr-2 h-4 w-4" />
              {copy.actions.saveDraft}
            </AsyncSubmitButton>
          </div>
        </div>
      </GlassSurface>

      <div className="grid gap-4 xl:grid-cols-4">
        <SummaryCard
          label={copy.summary.tenantLabel}
          value={session?.tenantName || copy.summary.tenantFallback}
          hint={copy.summary.tenantHint}
        />
        <SummaryCard
          label={copy.summary.sourceLabel}
          value={sourceValue}
          hint={sourceHint}
        />
        <SummaryCard
          label={copy.summary.componentsLabel}
          value={String(content.components.length)}
          hint={copy.summary.componentsHint}
        />
        <SummaryCard
          label={copy.summary.homepageUrlLabel}
          value={homepage.homepageUrl}
          hint={copy.summary.homepageUrlHint}
        />
      </div>

      {notice ? <NoticeBanner tone={notice.tone} message={notice.message} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <GlassSurface className="p-6">
            <FormSection
              title={copy.sections.draftBlocksTitle}
              description={copy.sections.draftBlocksDescription}
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white/80 p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{copy.sections.catalogTitle}</p>
                    <p className="text-xs leading-5 text-slate-500">{copy.sections.catalogDescription}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCatalogOpen((current) => !current)}
                    aria-expanded={isCatalogOpen}
                    aria-controls="component-catalog-panel"
                    className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <Plus className="h-4 w-4" />
                    {isCatalogOpen ? copy.sections.hideCatalog : copy.sections.addBlock}
                  </button>
                </div>

                {isCatalogOpen ? (
                  <div id="component-catalog-panel" className="space-y-5 rounded-3xl border border-indigo-100 bg-indigo-50/45 p-4">
                    {(['core', 'media', 'content', 'interactive', 'layout'] as const).map((category) => {
                      const entries = COMPONENT_CATALOG.filter((entry) => entry.category === category);

                      return (
                        <div key={category} className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                              {copy.catalog.categories[category]}
                            </p>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            {entries.map((entry) => {
                              const entryCopy = getCatalogEntryCopy(copy, entry.type);

                              return (
                                <button
                                  key={entry.type}
                                  type="button"
                                  onClick={() => handleAddComponent(entry)}
                                  className="rounded-2xl border border-slate-200 bg-white/85 p-4 text-left transition hover:border-slate-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <p className="text-sm font-semibold text-slate-900">{entryCopy.label}</p>
                                      <p className="text-xs leading-5 text-slate-500">{entryCopy.description}</p>
                                    </div>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">
                                      <Plus className="h-3 w-3" />
                                      {copy.catalog.add}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                {content.components.length === 0 ? (
                  <StateView
                    status="unavailable"
                    title={copy.sections.emptyBlocksTitle}
                    description={copy.sections.emptyBlocksDescription}
                  />
                ) : (
                  content.components.map((component, index) => {
                    const entryCopy = getCatalogEntryCopy(copy, component.type);
                    const isEditing = activeComponentEditorId === component.id;

                    return (
                      <div key={component.id} className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                              {entryCopy.label}
                            </div>
                            <p className="text-sm text-slate-500">{copy.block.indexLabel(index + 1)}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleMoveComponent(component.id, 'up')}
                              disabled={index === 0}
                              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={copy.block.moveUp(entryCopy.label)}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveComponent(component.id, 'down')}
                              disabled={index === content.components.length - 1}
                              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={copy.block.moveDown(entryCopy.label)}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveComponentEditorId(isEditing ? null : component.id)}
                              aria-expanded={isEditing}
                              aria-controls={`component-editor-panel-${component.id}`}
                              aria-label={isEditing ? copy.block.doneEditingAriaLabel(entryCopy.label) : copy.block.editAriaLabel(entryCopy.label)}
                              className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
                            >
                              {isEditing ? copy.block.doneEditing : copy.block.edit}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleVisibility(component.id)}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              {component.visible ? (
                                <>
                                  <Eye className="h-4 w-4" />
                                  {copy.block.visible}
                                </>
                              ) : (
                                <>
                                  <EyeOff className="h-4 w-4" />
                                  {copy.block.hidden}
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveComponent(component.id)}
                              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                            >
                              <Trash2 className="h-4 w-4" />
                              {copy.block.remove}
                            </button>
                          </div>
                        </div>

                        {isEditing ? (
                          <div id={`component-editor-panel-${component.id}`}>
                            <BlockPropsEditor
                              component={component}
                              copy={copy}
                              error={componentErrors[component.id]}
                              isAdvancedJsonOpen={advancedJsonOpenMap[component.id] === true}
                              jsonValue={componentJsonMap[component.id] || '{}'}
                              onAdvancedJsonOpenChange={(isOpen) =>
                                setAdvancedJsonOpenMap((current) => ({
                                  ...current,
                                  [component.id]: isOpen,
                                }))
                              }
                              onJsonChange={(nextValue) => handleComponentJsonChange(component.id, nextValue)}
                              onPropsChange={(nextProps) => handleComponentPropsChange(component.id, nextProps)}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </FormSection>
          </GlassSurface>

          <GlassSurface className="p-6">
            <FormSection
              title={copy.sections.themeTitle}
              description={copy.sections.themeDescription}
            >
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setIsThemeEditorOpen((current) => !current)}
                  aria-expanded={isThemeEditorOpen}
                  aria-controls="theme-json-panel"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {isThemeEditorOpen ? copy.sections.hideThemeJson : copy.sections.editThemeJson}
                </button>
                {isThemeEditorOpen ? (
                  <div id="theme-json-panel" className="space-y-2">
                    <label htmlFor="theme-json-editor" className="text-sm font-medium text-slate-800">
                      {copy.sections.themeJsonLabel}
                    </label>
                    <textarea
                      id="theme-json-editor"
                      name="theme-json"
                      value={themeJson}
                      onChange={(event) => handleThemeJsonChange(event.target.value)}
                      rows={16}
                      className="min-h-[320px] w-full rounded-3xl border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-sm leading-6 text-slate-50 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      aria-invalid={themeError ? 'true' : 'false'}
                      spellCheck={false}
                    />
                    {themeError ? (
                      <p className="text-sm font-medium text-rose-700">{themeError}</p>
                    ) : (
                      <p className="text-xs leading-5 text-slate-500">{copy.sections.themeJsonHint}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs leading-5 text-slate-500">{copy.sections.themeJsonHint}</p>
                )}
              </div>
            </FormSection>
          </GlassSurface>
        </div>

        <div className="space-y-6">
          <GlassSurface className="p-6">
            <FormSection
              title={copy.sections.previewTitle}
              description={copy.sections.previewDescription}
            >
              <div className="space-y-4">
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
                          onClick={() => setPreviewViewport(viewport)}
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
                <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className={`mx-auto transition-[max-width] duration-200 ${PREVIEW_VIEWPORT_CLASSES[previewViewport]}`}>
                    <PublicHomepageRenderer
                      content={content}
                      theme={theme}
                      updatedAt={homepage.updatedAt}
                      hero={previewHero}
                    />
                  </div>
                </div>
              </div>
            </FormSection>
          </GlassSurface>
        </div>
      </div>

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
