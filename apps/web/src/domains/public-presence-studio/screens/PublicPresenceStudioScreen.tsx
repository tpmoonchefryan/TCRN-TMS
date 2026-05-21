'use client';

import type {
  HomepageComponentType,
  PublicPresenceComponentNode,
  PublicPresenceDocument,
  PublicPresenceFieldDefinition,
  PublicPresenceFieldProvenance,
  PublicPresenceFieldValue,
  PublicPresencePhaseVisibility,
  PublicPresenceProjection,
  PublicPresenceValidationIssue,
  PublicPresenceValidationSnapshot,
  SupportedUiLocale,
} from '@tcrn/shared';
import {
  DEFAULT_THEME,
  PUBLIC_PRESENCE_COMPONENT_DEFINITIONS,
  PUBLIC_PRESENCE_FAN_ACTION_SLOTS,
  PUBLIC_PRESENCE_NOTE_KINDS,
  normalizeTheme,
} from '@tcrn/shared';
import {
  AlertCircle,
  ArrowLeftRight,
  Eye,
  FileCode2,
  Layers3,
  Monitor,
  RefreshCcw,
  Save,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  type ReactNode,
  startTransition,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  PublicPresenceBadge,
  PublicPresenceShell,
  PublicPresenceStateView,
  PublicPresenceSurface,
} from '@/domains/public-presence';
import { PublicHomepageProjectionRenderer } from '@/domains/public-homepage/components/PublicHomepageProjectionRenderer';
import { preloadPublicHomepageProjectionMedia } from '@/domains/public-homepage/components/public-homepage-projection-media';
import { getHomepageCanvasStyle } from '@/domains/public-homepage/components/PublicHomepageRenderer';
import {
  approvePublicPresenceReview,
  bootstrapPublicPresenceWorkspace,
  cancelPublicPresenceSchedule,
  createPublicPresenceRollbackDraft,
  type PublicPresenceStudioReleaseDependency,
  type PublicPresenceStudioStageSectionSummary,
  type PublicPresenceStudioTemplateSummary,
  type PublicPresenceStudioWorkspaceResponse,
  publishPublicPresenceNow,
  readPublicPresenceDraftPreview,
  readPublicPresenceWorkspace,
  requestPublicPresenceChanges,
  savePublicPresenceWorkspaceDraft,
  schedulePublicPresencePublish,
  submitPublicPresenceForReview,
} from '@/domains/public-presence-studio/api/public-presence-studio.api';
import {
  formatPublicPresenceStudioDateTime,
  formatPublicPresenceStudioValidationSummary,
  getHomepageSurfaceActionLabel,
  getHomepageSurfaceLabel,
  getPublicPresenceDocumentStateLabel,
  getPublicPresenceEditabilityStateLabel,
  getPublicPresenceFanActionSlotLabel,
  getPublicPresenceFieldLabel,
  getPublicPresenceFieldPlaceholder,
  getPublicPresenceIssueMessageLabel,
  getPublicPresenceNoteKindLabel,
  getPublicPresencePreviewPhaseLabel,
  getPublicPresenceProvenanceLabel,
  getPublicPresenceStageSectionLabel,
  getPublicPresenceStageSectionPurpose,
  getPublicPresenceTemplateLabel,
  getPublicPresenceTemplateUseCase,
  getPublicPresenceWorkflowEventLabel,
  PUBLIC_PRESENCE_PREVIEW_PHASES,
  type PublicPresenceStudioCopy,
  usePublicPresenceStudioCopy,
} from '@/domains/public-presence-studio/screens/public-presence-studio.copy';
import { useOverlayFocusManager } from '@/domains/public-presence-studio/screens/public-presence-studio-overlay';
import { withPublicPresenceRouteTimeout } from '@/domains/public-presence-studio/screens/public-presence-studio.loading';
import {
  mergeUrlSearchParams,
  parseBooleanSearchParam,
  parseEnumSearchParam,
} from '@/domains/public-presence-studio/screens/public-presence-studio-url-state';
import {
  buildPublicPresenceHomepageSurfacePath,
  buildPublicPresenceAdvancedIdePath,
  buildPublicPresenceStudioPreviewPath,
  buildTalentWorkspaceSectionPath,
} from '@/platform/routing/workspace-paths';
import { pickLocaleText } from '@/platform/runtime/locale/locale-text';
import { useSession } from '@/platform/runtime/session/session-provider';

type StudioViewportMode = 'desktop' | 'mobile';
type LeftDrawerMode = 'sections' | 'release' | 'persona';
type MobileSheetMode = (typeof MOBILE_SHEET_QUERY_VALUES)[number];
type PendingMobileSheetMode = MobileSheetMode | 'closed';
type StagePanelMode = 'configure' | 'edit' | 'inspect';
type PendingStagePanelState = StagePanelState | 'closed';
type StudioEntryFocus = 'countdown' | 'overview' | 'release';

const STUDIO_VIEWPORT_QUERY_VALUES = ['desktop', 'mobile'] as const;
const LEFT_DRAWER_QUERY_VALUES = ['sections', 'release', 'persona'] as const;
const MOBILE_SHEET_QUERY_VALUES = ['manage', 'preview-tools'] as const;
const STAGE_PANEL_MODE_QUERY_VALUES = ['configure', 'edit', 'inspect'] as const;

interface NoticeState {
  message: string;
  persistent?: boolean;
  tone: 'error' | 'success';
}

interface StagePanelState {
  mode: StagePanelMode;
  sectionKind: string;
}

function parseStagePanelSearchParam(value: string | null): StagePanelState | null {
  if (!value) {
    return null;
  }

  const [rawMode, ...sectionParts] = value.split(':');
  const mode = parseEnumSearchParam(rawMode, STAGE_PANEL_MODE_QUERY_VALUES);
  const sectionKind = sectionParts.join(':').trim();

  if (!mode || !sectionKind) {
    return null;
  }

  return {
    mode,
    sectionKind,
  };
}

function serializeStagePanelSearchParam(value: StagePanelState | null) {
  return value ? `${value.mode}:${value.sectionKind}` : null;
}

function isSameStagePanel(
  left: StagePanelState | null | undefined,
  right: StagePanelState | null | undefined,
) {
  return (left?.mode ?? null) === (right?.mode ?? null)
    && (left?.sectionKind ?? null) === (right?.sectionKind ?? null);
}

function getErrorMessage(_reason: unknown, fallback: string) {
  return _reason instanceof Error ? _reason.message : fallback;
}

function NoticeToast({
  message,
  onDismiss,
  tone,
}: Readonly<{
  message: string;
  onDismiss: () => void;
  tone: NoticeState['tone'];
}>) {
  useEffect(() => {
    if (tone !== 'success') {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      onDismiss();
    }, 4000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [onDismiss, tone]);

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`fixed right-4 top-4 z-40 max-w-sm rounded-3xl border px-4 py-3 text-sm shadow-lg ${
        tone === 'error'
          ? 'border-rose-200 bg-rose-50 text-rose-800'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span>{message}</span>
        <button
          type="button"
          aria-label="Dismiss notice"
          onClick={onDismiss}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/15 bg-white/80"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function toPrettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function formatDateTime(locale: string, value: string | null) {
  return formatPublicPresenceStudioDateTime(locale, value);
}

function resolveWorkspacePublicPath(
  previewProjection: PublicPresenceProjection | null,
  workspace: PublicPresenceStudioWorkspaceResponse | null,
  fallback: string,
) {
  return (
    previewProjection?.route?.canonicalPath
    || workspace?.publicRoute?.canonicalPath
    || workspace?.liveVersion?.document.metadata?.canonicalPath
    || workspace?.draftVersion?.document.metadata?.canonicalPath
    || fallback
  );
}

function readFieldEntry(
  document: PublicPresenceDocument | null,
  sectionKind: string,
  fieldKey: string,
) {
  const section = document?.sections.find((entry) => entry.kind === sectionKind);
  const field = section?.fields?.[fieldKey];

  return field && typeof field === 'object' && 'value' in field
    ? (field as PublicPresenceFieldValue<unknown>)
    : null;
}

function readFieldValue(
  document: PublicPresenceDocument | null,
  sectionKind: string,
  fieldKey: string,
) {
  return readFieldEntry(document, sectionKind, fieldKey)?.value ?? '';
}

function readFieldProvenance(
  document: PublicPresenceDocument | null,
  sectionKind: string,
  fieldKey: string,
) {
  return readFieldEntry(document, sectionKind, fieldKey)?.provenance ?? 'publicPresence';
}

function getCurrentSectionDocument(
  document: PublicPresenceDocument | null,
  sectionKind: string,
) {
  return document?.sections.find((entry) => entry.kind === sectionKind) ?? null;
}

function moveCollectionItem<T>(
  items: T[],
  index: number,
  direction: 'up' | 'down',
) {
  const nextIndex = direction === 'up' ? index - 1 : index + 1;

  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

function summarizeInspectValue(
  locale: string,
  value: unknown,
) {
  if (value === null || value === undefined || value === '') {
    return pickLocaleText(locale, {
      en: 'Not set yet',
      zh_HANS: '尚未设置',
      zh_HANT: '尚未設定',
      ja: 'まだ設定されていません',
      ko: '아직 설정되지 않았습니다',
      fr: 'Pas encore defini',
    });
  }

  if (Array.isArray(value)) {
    return pickLocaleText(locale, {
      en: `${value.length} item(s)`,
      zh_HANS: `${value.length} 项`,
      zh_HANT: `${value.length} 項`,
      ja: `${value.length} 件`,
      ko: `${value.length}개 항목`,
      fr: `${value.length} element(s)`,
    });
  }

  if (typeof value === 'boolean') {
    return pickLocaleText(locale, {
      en: value ? 'Enabled' : 'Disabled',
      zh_HANS: value ? '已启用' : '已关闭',
      zh_HANT: value ? '已啟用' : '已關閉',
      ja: value ? '有効' : '無効',
      ko: value ? '사용 중' : '사용 안 함',
      fr: value ? 'Actif' : 'Inactif',
    });
  }

  if (typeof value === 'object') {
    return pickLocaleText(locale, {
      en: 'Configured value',
      zh_HANS: '已配置值',
      zh_HANT: '已配置值',
      ja: '設定済みの値',
      ko: '구성된 값',
      fr: 'Valeur configuree',
    });
  }

  const text = String(value).trim();
  return text.length > 96 ? `${text.slice(0, 93)}...` : text;
}

function buildSectionDocument(
  document: PublicPresenceDocument,
  sectionKind: string,
  fieldKey: string,
  value: unknown,
  provenance?: PublicPresenceFieldProvenance,
) {
  const nextSections = [...document.sections];
  const targetIndex = nextSections.findIndex((entry) => entry.kind === sectionKind);

  if (targetIndex === -1) {
    nextSections.push({
      fields: {
        [fieldKey]: {
          provenance: provenance ?? 'publicPresence',
          value,
        },
      },
      id: `${sectionKind}-${nextSections.length + 1}`,
      kind: sectionKind,
      title: sectionKind,
    });
  } else {
    const currentSection = nextSections[targetIndex];
    nextSections[targetIndex] = {
      ...currentSection,
      fields: {
        ...(currentSection.fields ?? {}),
        [fieldKey]: {
          provenance:
            provenance
            ?? (
              currentSection.fields?.[fieldKey] as
                | PublicPresenceFieldValue<unknown>
                | undefined
            )?.provenance
            ?? 'publicPresence',
          value,
        },
      },
    };
  }

  return {
    ...document,
    sections: nextSections,
  };
}

function buildEmptySectionDraft(
  section: PublicPresenceStudioStageSectionSummary,
  currentLength: number,
) {
  const fields: Record<string, PublicPresenceFieldValue<unknown>> = {};

  for (const definition of section.fieldDefinitions) {
    if (definition.fieldKey === 'actions' || definition.fieldKey === 'notes') {
      fields[definition.fieldKey] = {
        provenance: 'publicPresence',
        value: [],
      };
    }
  }

  return {
    components: section.allowedComponents.length > 0 ? [] : undefined,
    fields: Object.keys(fields).length > 0 ? fields : undefined,
    id: `${section.kind}-${currentLength + 1}`,
    kind: section.kind,
    phaseVisibility: section.phaseVisibility[0] as
      | PublicPresencePhaseVisibility
      | undefined,
    title: section.kind,
  };
}

function buildDefaultComponentForType(type: HomepageComponentType): PublicPresenceComponentNode {
  const definition = PUBLIC_PRESENCE_COMPONENT_DEFINITIONS[type];

  return {
    id: `${type.toLowerCase()}-${Date.now()}`,
    props: structuredClone(definition.defaultProps),
    type,
    visible: true,
  };
}

function resolveFieldEditability(
  definition:
    | Pick<PublicPresenceFieldDefinition, 'sourceOnly' | 'visualEditable'>
    | undefined,
  canEditVisually: boolean,
) {
  return Boolean(
    canEditVisually
      && definition
      && definition.visualEditable
      && !definition.sourceOnly,
  );
}

function sortSectionsForTemplate(
  currentTemplate: PublicPresenceStudioTemplateSummary | null,
  stageSections: PublicPresenceStudioStageSectionSummary[],
) {
  if (!currentTemplate) {
    return stageSections;
  }

  const hiddenKinds =
    currentTemplate.templateId === 'activeTalentHub'
      ? new Set(['countdownReveal', 'teaserRevealMedia'])
      : new Set<string>();
  const visibleKinds = new Set([
    ...currentTemplate.defaultSectionOrder,
    ...currentTemplate.requiredSections,
    ...currentTemplate.recommendedSections,
    ...currentTemplate.optionalSections,
  ]);

  const orderMap = new Map(
    currentTemplate.defaultSectionOrder.map((kind, index) => [kind, index]),
  );

  return stageSections
    .filter((section) => visibleKinds.has(section.kind) && !hiddenKinds.has(section.kind))
    .sort((left, right) => {
      const leftOrder = orderMap.get(left.kind) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = orderMap.get(right.kind) ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });
}

function collectIssuesForSection(
  snapshot: PublicPresenceValidationSnapshot | null,
  sectionKind: string,
  sectionId: string | null,
) {
  if (!snapshot) {
    return [];
  }

  return snapshot.issues.filter((issue) => {
    if (sectionId && issue.sectionId === sectionId) {
      return true;
    }

    return issue.fieldKey === sectionKind;
  });
}

function getIssueTone(issues: PublicPresenceValidationIssue[]) {
  if (issues.some((issue) => issue.severity === 'fatal' || issue.severity === 'blocker')) {
    return 'error' as const;
  }

  if (issues.some((issue) => issue.severity === 'warning')) {
    return 'warning' as const;
  }

  if (issues.length > 0) {
    return 'info' as const;
  }

  return 'success' as const;
}

function getValidationTone(
  snapshot: PublicPresenceValidationSnapshot | null,
): 'success' | 'warning' | 'error' | 'info' {
  if (!snapshot) {
    return 'info';
  }

  if (snapshot.issueCounts.fatal > 0 || snapshot.issueCounts.blocker > 0) {
    return 'error';
  }

  if (snapshot.issueCounts.warning > 0) {
    return 'warning';
  }

  return 'success';
}

function getValidationToneFromCounts(
  counts: {
    blocker: number;
    fatal: number;
    info: number;
    warning: number;
  } | null,
): 'success' | 'warning' | 'error' | 'info' {
  if (!counts) {
    return 'info';
  }

  if (counts.fatal > 0 || counts.blocker > 0) {
    return 'error';
  }

  if (counts.warning > 0) {
    return 'warning';
  }

  return 'success';
}

function buildReleaseDependencyIssues(
  dependencies: PublicPresenceStudioReleaseDependency[],
): PublicPresenceValidationIssue[] {
  return dependencies
    .filter((dependency) => dependency.status === 'blocked' && dependency.blocksPublish)
    .map((dependency) => ({
      acknowledgementRequired: false,
      blocksAiPatch: false,
      blocksPublish: dependency.blocksPublish,
      blocksVisualEdit: false,
      code: dependency.id,
      fallbackBehavior: 'safePlaceholder',
      id: dependency.id,
      messageKey: dependency.messageKey,
      path: ['releaseReadiness', dependency.targetTemplateId],
      policyVersion: 'studio-workbench',
      registryVersion: 'studio-workbench',
      severity: dependency.severity,
      state: 'invalidRecoverable',
      suggestedFix: dependency.suggestedFix,
      templateId: dependency.templateId,
    }));
}

function mergeReleaseIssueCounts(
  snapshot: PublicPresenceValidationSnapshot | null,
  dependencyIssues: PublicPresenceValidationIssue[],
) {
  const baseCounts = snapshot?.issueCounts ?? {
    blocker: 0,
    fatal: 0,
    info: 0,
    warning: 0,
  };

  return dependencyIssues.reduce(
    (counts, issue) => ({
      ...counts,
      [issue.severity]: counts[issue.severity] + 1,
    }),
    { ...baseCounts },
  );
}

function getReleaseDependencyActionLabel(
  locale: SupportedUiLocale,
  nextAction: PublicPresenceStudioReleaseDependency['nextAction'],
) {
  switch (nextAction) {
    case 'startActiveTalentHubDraft':
      return pickLocaleText(locale, {
        en: 'Start the always-on hub',
        zh_HANS: '开始常驻主页',
        zh_HANT: '開始常駐首頁',
        ja: '常設ハブを開始',
        ko: '상시 허브 시작',
        fr: 'Démarrer le hub permanent',
      });
    case 'openActiveTalentHubDraft':
      return pickLocaleText(locale, {
        en: 'Open the always-on hub draft',
        zh_HANS: '打开常驻主页草稿',
        zh_HANT: '打開常駐首頁草稿',
        ja: '常設ハブの下書きを開く',
        ko: '상시 허브 초안 열기',
        fr: 'Ouvrir le brouillon du hub permanent',
      });
    case 'openActiveTalentHubReview':
      return pickLocaleText(locale, {
        en: 'Open the always-on hub review',
        zh_HANS: '打开常驻主页审核面',
        zh_HANT: '打開常駐首頁審核面',
        ja: '常設ハブのレビューを開く',
        ko: '상시 허브 검토 열기',
        fr: 'Ouvrir la revue du hub permanent',
      });
    default:
      return pickLocaleText(locale, {
        en: 'Open the always-on hub',
        zh_HANS: '打开常驻主页',
        zh_HANT: '打開常駐首頁',
        ja: '常設ハブを開く',
        ko: '상시 허브 열기',
        fr: 'Ouvrir le hub permanent',
      });
  }
}

function buildStageSectionSummary(
  document: PublicPresenceDocument | null,
  section: PublicPresenceStudioStageSectionSummary,
) {
  const sectionDocument = getCurrentSectionDocument(document, section.kind);

  if (!sectionDocument) {
    return '';
  }

  if (section.kind === 'fanActions') {
    const actions = readFieldValue(document, section.kind, 'actions');
    return Array.isArray(actions) ? `${actions.length}` : '';
  }

  if (section.kind === 'agencyNotes') {
    const notes = readFieldValue(document, section.kind, 'notes');
    return Array.isArray(notes) ? `${notes.length}` : '';
  }

  if (sectionDocument.components?.length) {
    return `${sectionDocument.components.length}`;
  }

  return `${Object.keys(sectionDocument.fields ?? {}).length}`;
}

function isStageSectionDirty(
  currentDocument: PublicPresenceDocument | null,
  persistedDocument: PublicPresenceDocument | null,
  sectionKind: string,
) {
  const currentSection = getCurrentSectionDocument(currentDocument, sectionKind);
  const persistedSection = getCurrentSectionDocument(persistedDocument, sectionKind);

  return JSON.stringify(currentSection ?? null) !== JSON.stringify(persistedSection ?? null);
}

function getIssueSummaryCopy(
  locale: string,
  issue: PublicPresenceValidationIssue,
) {
  return getPublicPresenceIssueMessageLabel(
    locale,
    issue.messageKey,
    issue.suggestedFix ?? issue.messageKey,
  );
}

function EmptyWorkspaceState({
  copy,
  locale,
  onBootstrap,
  pendingTemplateId,
  templates,
}: Readonly<{
  copy: PublicPresenceStudioCopy;
  locale: string;
  onBootstrap: (templateId: string) => void;
  pendingTemplateId: string | null;
  templates: PublicPresenceStudioTemplateSummary[];
}>) {
  return (
    <div className="space-y-6">
      <PublicPresenceStateView
        actions={
          <div className="flex flex-wrap items-center justify-center gap-3">
            {templates.map((template) => (
              <button
                key={template.templateId}
                type="button"
                onClick={() => onBootstrap(template.templateId)}
                disabled={pendingTemplateId !== null}
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingTemplateId === template.templateId ? (
                  <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
                {copy.emptyWorkspace.startPrefix} {getPublicPresenceTemplateLabel(locale, template)}
              </button>
            ))}
          </div>
        }
        description={copy.state.initializeDescription}
        icon={<Sparkles />}
        title={copy.state.initializeTitle}
        tone="info"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {templates.map((template) => (
          <PublicPresenceSurface key={template.templateId} className="space-y-3" interactive>
            <div className="flex flex-wrap items-center gap-3">
              <PublicPresenceBadge tone="rose">
                {getPublicPresenceTemplateLabel(locale, template)}
              </PublicPresenceBadge>
              <PublicPresenceBadge tone="slate" variant="outline">
                {template.requiredSections.length} {copy.common.requiredSectionsSuffix}
              </PublicPresenceBadge>
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-950">
                {getPublicPresenceTemplateLabel(locale, template)}
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                {getPublicPresenceTemplateUseCase(locale, template)}
              </p>
            </div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {copy.emptyWorkspace.defaultOrderPrefix}:{' '}
              {template.defaultSectionOrder
                .map((sectionKind) =>
                  getPublicPresenceStageSectionLabel(locale, { kind: sectionKind }))
                .join(' / ')}
            </p>
          </PublicPresenceSurface>
        ))}
      </div>
    </div>
  );
}

function ControlledTextInput({
  disabled = false,
  footer,
  label,
  onChange,
  placeholder,
  value,
}: Readonly<{
  disabled?: boolean;
  footer?: ReactNode;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}>) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        placeholder={placeholder}
      />
      {footer}
    </label>
  );
}

function ControlledTextArea({
  disabled = false,
  footer,
  label,
  onChange,
  placeholder,
  value,
}: Readonly<{
  disabled?: boolean;
  footer?: ReactNode;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}>) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-24 w-full rounded-3xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        placeholder={placeholder}
      />
      {footer}
    </label>
  );
}

function ControlledSelect({
  disabled = false,
  footer,
  label,
  onChange,
  options,
  value,
}: Readonly<{
  disabled?: boolean;
  footer?: ReactNode;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}>) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {footer}
    </label>
  );
}

function ControlledCheckbox({
  checked,
  description,
  disabled = false,
  label,
  onChange,
}: Readonly<{
  checked: boolean;
  description?: string;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}>) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-300 disabled:cursor-not-allowed"
      />
      <span className="space-y-1">
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        {description ? (
          <span className="block text-xs leading-5 text-slate-500">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

function StudioSectionRow({
  copy,
  dirty,
  hasDraftSection,
  isSelected,
  issueCount,
  locale,
  onSelect,
  section,
  summary,
}: Readonly<{
  copy: PublicPresenceStudioCopy;
  dirty: boolean;
  hasDraftSection: boolean;
  isSelected: boolean;
  issueCount: number;
  locale: string;
  onSelect: () => void;
  section: PublicPresenceStudioStageSectionSummary;
  summary: string;
}>) {
  const tone = section.editabilityState === 'validLocked'
    ? 'warning'
    : issueCount > 0
      ? 'info'
      : 'success';
  const sectionLabel = getPublicPresenceStageSectionLabel(locale, section);
  const rowSummary = summary || (hasDraftSection ? copy.common.ready : copy.stageSections.missingFromDraft);
  const selectedLabel = pickLocaleText(locale, {
    en: 'Selected',
    zh_HANS: '当前选中',
    zh_HANT: '目前選取',
    ja: '選択中',
    ko: '선택됨',
    fr: 'Sélectionné',
  });

  return (
    <button
      type="button"
      data-testid={`stage-row-${section.kind}`}
      aria-pressed={isSelected}
      onClick={onSelect}
      className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
        isSelected
          ? 'border-rose-300 bg-rose-50/80 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-950">{sectionLabel}</span>
            {isSelected ? (
              <PublicPresenceBadge tone="rose" variant="outline">
                {selectedLabel}
              </PublicPresenceBadge>
            ) : null}
            <PublicPresenceBadge tone={tone} variant="outline">
              {getPublicPresenceEditabilityStateLabel(locale, section.editabilityState)}
            </PublicPresenceBadge>
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>
              {copy.stageSections.summaryPrefix}: {rowSummary}
            </span>
            {dirty ? (
              <PublicPresenceBadge tone="warning" variant="outline">
                {copy.common.unsaved}
              </PublicPresenceBadge>
            ) : null}
            {!hasDraftSection ? (
              <PublicPresenceBadge tone="slate" variant="outline">
                {copy.stageSections.missingFromDraft}
              </PublicPresenceBadge>
            ) : null}
          </span>
        </span>
        {issueCount > 0 ? (
          <PublicPresenceBadge tone="warning" variant="outline">
            {copy.stageSections.issueCountPrefix} {issueCount}
          </PublicPresenceBadge>
        ) : null}
      </span>
    </button>
  );
}

function PreviewViewportToggle({
  compact = false,
  locale,
  value,
  onChange,
}: Readonly<{
  compact?: boolean;
  locale: string;
  onChange: (value: StudioViewportMode) => void;
  value: StudioViewportMode;
}>) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={pickLocaleText(locale, {
      en: 'Preview viewport',
      zh_HANS: '预览视口',
      zh_HANT: '預覽視口',
      ja: 'プレビュー表示幅',
      ko: '미리보기 뷰포트',
      fr: 'Viewport d’aperçu',
    })}>
      {([
        ['desktop', <Monitor key="desktop" className="h-4 w-4" aria-hidden="true" />],
        ['mobile', <Smartphone key="mobile" className="h-4 w-4" aria-hidden="true" />],
      ] as const).map(([nextValue, icon]) => (
        <button
          key={nextValue}
          type="button"
          aria-pressed={value === nextValue}
          onClick={() => onChange(nextValue)}
          className={`inline-flex items-center ${compact ? 'gap-1.5 px-3 py-1.5 text-sm' : 'gap-2 px-4 py-2 text-sm'} rounded-full border font-semibold transition ${
            value === nextValue
              ? 'border-rose-300 bg-rose-50 text-rose-700'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          {icon}
          {nextValue === 'desktop'
            ? pickLocaleText(locale, {
                en: 'Desktop',
                zh_HANS: '桌面端',
                zh_HANT: '桌面端',
                ja: 'デスクトップ',
                ko: '데스크톱',
                fr: 'Desktop',
              })
            : pickLocaleText(locale, {
                en: 'Mobile',
                zh_HANS: '移动端',
                zh_HANT: '行動端',
                ja: 'モバイル',
                ko: '모바일',
                fr: 'Mobile',
              })}
        </button>
      ))}
    </div>
  );
}

function PublicPresenceStudioScreenInner({
  initialFocus,
  initialTemplateId,
  tenantId,
  talentId,
}: Readonly<{
  initialFocus?: string | null;
  initialTemplateId?: string | null;
  talentId: string;
  tenantId: string;
}>) {
  const { copy, locale } = usePublicPresenceStudioCopy();
  const { request } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const [workspace, setWorkspace] = useState<PublicPresenceStudioWorkspaceResponse | null>(null);
  const [editorDocument, setEditorDocument] = useState<PublicPresenceDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewPhase, setPreviewPhase] = useState<PublicPresencePhaseVisibility | 'current'>('current');
  const [previewProjection, setPreviewProjection] = useState<PublicPresenceProjection | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [workflowAction, setWorkflowAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [stagePanel, setStagePanel] = useState<StagePanelState | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialTemplateId ?? 'activeTalentHub',
  );
  const [showReviewHistory, setShowReviewHistory] = useState(false);
  const [leftDrawerMode, setLeftDrawerMode] = useState<LeftDrawerMode>('sections');
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [mobileManageOpen, setMobileManageOpen] = useState(false);
  const [mobilePreviewToolsOpen, setMobilePreviewToolsOpen] = useState(false);
  const [previewFocus, setPreviewFocus] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<StudioViewportMode>('desktop');
  const [isDesktopWorkbench, setIsDesktopWorkbench] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth >= 1280 : true),
  );
  const pendingMobileSheetRef = useRef<PendingMobileSheetMode | null>(null);
  const pendingStagePanelRef = useRef<PendingStagePanelState | null>(null);
  const mobileManageSheetId = useId();
  const mobilePreviewToolsSheetId = useId();
  const leftDrawerId = useId();
  const rightDrawerId = useId();

  const queryState = useMemo(() => {
    const previewViewportValue = parseEnumSearchParam(
      searchParams.get('viewport'),
      STUDIO_VIEWPORT_QUERY_VALUES,
    ) ?? 'desktop';
    const previewPhaseValue = parseEnumSearchParam(
      searchParams.get('phase'),
      ['current', ...PUBLIC_PRESENCE_PREVIEW_PHASES] as const,
    ) ?? 'current';
    const previewFocusValue = parseBooleanSearchParam(searchParams.get('previewFocus')) ?? false;
    const leftDrawerValue = parseEnumSearchParam(
      searchParams.get('leftPanel'),
      LEFT_DRAWER_QUERY_VALUES,
    );
    const mobileSheetValue = parseEnumSearchParam(
      searchParams.get('sheet'),
      MOBILE_SHEET_QUERY_VALUES,
    );
    const stagePanelValue = parseStagePanelSearchParam(searchParams.get('stagePanel'));

    return {
      hasExplicitWorkbenchState: [
        'viewport',
        'previewFocus',
        'phase',
        'leftPanel',
        'stagePanel',
        'sheet',
      ].some((key) => searchParams.has(key)),
      hasLeftPanelQuery: searchParams.has('leftPanel'),
      leftDrawerMode: leftDrawerValue,
      mobileSheet: mobileSheetValue,
      previewFocus: previewFocusValue,
      previewPhase: previewPhaseValue,
      previewViewport: previewViewportValue,
      stagePanel: stagePanelValue,
      templateId: searchParams.get('templateId'),
    };
  }, [searchKey, searchParams]);

  useEffect(() => {
    const syncWorkbenchMode = () => {
      setIsDesktopWorkbench(window.innerWidth >= 1280);
    };

    syncWorkbenchMode();
    window.addEventListener('resize', syncWorkbenchMode);

    return () => {
      window.removeEventListener('resize', syncWorkbenchMode);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await withPublicPresenceRouteTimeout(
          readPublicPresenceWorkspace(
            request,
            talentId,
            selectedTemplateId,
          ),
          pickLocaleText(locale, {
            en: 'Public Page Studio took too long to load. Refresh the page or confirm the local API is running.',
            zh_HANS: 'Public Page Studio 加载时间过长。请刷新页面，或确认本地 API 已启动。',
            zh_HANT: 'Public Page Studio 載入時間過長。請重新整理頁面，或確認本地 API 已啟動。',
            ja: 'Public Page Studio の読み込みに時間がかかりすぎています。再読み込みするか、ローカル API が起動しているか確認してください。',
            ko: 'Public Page Studio 로딩이 너무 오래 걸립니다. 페이지를 새로고침하거나 로컬 API가 실행 중인지 확인하세요.',
            fr: 'Public Page Studio met trop de temps à charger. Actualisez la page ou vérifiez que l’API locale tourne bien.',
          }),
        );

        if (cancelled) {
          return;
        }

        setWorkspace(result);
        setEditorDocument(result.draftVersion?.document ?? null);
        setLoading(false);
      } catch (reason) {
        if (cancelled) {
          return;
        }

        setError(getErrorMessage(reason, copy.state.loadWorkspaceError));
        setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [copy.state.loadWorkspaceError, request, selectedTemplateId, talentId]);

  useEffect(() => {
    if (!workspace?.draftVersion) {
      setPreviewProjection(null);
      setPreviewError(null);
      return;
    }

    let cancelled = false;

    const loadPreview = async () => {
      setPreviewError(null);

      try {
        const result = await withPublicPresenceRouteTimeout(
          readPublicPresenceDraftPreview(
            request,
            talentId,
            previewPhase,
            selectedTemplateId,
          ),
          pickLocaleText(locale, {
            en: 'Studio fan preview took too long to refresh. Refresh the page or confirm the local API is running.',
            zh_HANS: 'Studio 粉丝预览刷新时间过长。请刷新页面，或确认本地 API 已启动。',
            zh_HANT: 'Studio 粉絲預覽刷新時間過長。請重新整理頁面，或確認本地 API 已啟動。',
            ja: 'Studio ファンプレビューの更新に時間がかかりすぎています。再読み込みするか、ローカル API が起動しているか確認してください。',
            ko: 'Studio 팬 미리보기 새로고침이 너무 오래 걸립니다. 페이지를 새로고침하거나 로컬 API가 실행 중인지 확인하세요.',
            fr: 'Le fan preview Studio met trop de temps à se rafraîchir. Actualisez la page ou vérifiez que l’API locale tourne bien.',
          }),
        );

        await preloadPublicHomepageProjectionMedia(result);

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setPreviewProjection(result);
        });
      } catch (reason) {
        if (cancelled) {
          return;
        }

        setPreviewProjection(null);
        setPreviewError(getErrorMessage(reason, copy.state.previewBuildError));
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [
    copy.state.previewBuildError,
    previewPhase,
    request,
    selectedTemplateId,
    talentId,
    workspace?.draftVersion?.contentHash,
    workspace?.draftVersion?.id,
  ]);

  const applyWorkspace = (result: PublicPresenceStudioWorkspaceResponse) => {
    setWorkspace(result);
    setSelectedTemplateId(result.selectedTemplateId || selectedTemplateId);
    setEditorDocument(result.draftVersion?.document ?? null);
  };

  const runWorkflowAction = async (
    actionId: string,
    successMessage: string,
    run: () => Promise<PublicPresenceStudioWorkspaceResponse>,
  ) => {
    setWorkflowAction(actionId);
    setNotice(null);

    try {
      const result = await run();
      applyWorkspace(result);
      setNotice({
        message: successMessage,
        persistent: false,
        tone: 'success',
      });
    } catch (reason) {
      setNotice({
        message: getErrorMessage(reason, copy.notices.workflowActionError),
        persistent: true,
        tone: 'error',
      });
    } finally {
      setWorkflowAction(null);
    }
  };

  const handleBootstrap = async (templateId: string) => {
    setPendingTemplateId(templateId);
    setNotice(null);

    try {
      const result = await bootstrapPublicPresenceWorkspace(
        request,
        talentId,
        templateId,
      );
      applyWorkspace(result);
      setNotice({
        message: copy.notices.bootstrapSuccess,
        persistent: false,
        tone: 'success',
      });
    } catch (reason) {
      setNotice({
        message: getErrorMessage(reason, copy.notices.bootstrapError),
        persistent: true,
        tone: 'error',
      });
    } finally {
      setPendingTemplateId(null);
    }
  };

  const handleSaveVisualDocument = async () => {
    if (!editorDocument || !workspace?.draftVersion) {
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const result = await savePublicPresenceWorkspaceDraft(request, talentId, {
        document: editorDocument,
        expectedCurrentContentHash: workspace.draftVersion.contentHash,
      });
      applyWorkspace(result);
      setNotice({
        message: copy.notices.saveDraftSuccess,
        persistent: false,
        tone: 'success',
      });
    } catch (reason) {
      setNotice({
        message: getErrorMessage(reason, copy.notices.saveDraftError),
        persistent: true,
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const currentTemplate = workspace?.templates.find(
    (template) => template.templateId === (workspace?.selectedTemplateId ?? selectedTemplateId),
  ) ?? null;
  const persistTemplateQuery = searchParams.has('templateId') || selectedTemplateId !== 'activeTalentHub';
  const currentSnapshot = workspace?.draftVersion?.validationSnapshot ?? null;
  const currentDraftHash = workspace?.draftVersion?.contentHash ?? null;
  const currentDocumentState = workspace?.draftVersion?.documentState ?? 'draft';
  const blockedReleaseDependencyIssues = useMemo(
    () => buildReleaseDependencyIssues(workspace?.releaseReadiness?.dependencies ?? []),
    [workspace?.releaseReadiness?.dependencies],
  );
  const currentReleaseIssues = useMemo(
    () => [
      ...(currentSnapshot?.issues ?? []),
      ...blockedReleaseDependencyIssues,
    ],
    [blockedReleaseDependencyIssues, currentSnapshot?.issues],
  );
  const currentReleaseIssueCounts = useMemo(
    () => mergeReleaseIssueCounts(currentSnapshot, blockedReleaseDependencyIssues),
    [blockedReleaseDependencyIssues, currentSnapshot],
  );
  const blockedReleaseDependencyById = useMemo(
    () => new Map(
      (workspace?.releaseReadiness?.dependencies ?? [])
        .filter((dependency) => dependency.status === 'blocked' && dependency.blocksPublish)
        .map((dependency) => [dependency.id, dependency] as const),
    ),
    [workspace?.releaseReadiness?.dependencies],
  );
  const hasBlockingReleaseIssues =
    currentReleaseIssueCounts.fatal > 0 || currentReleaseIssueCounts.blocker > 0;
  const canRunDirectPublishPath = ['draft', 'changesRequested', 'inReview', 'approved', 'scheduled'].includes(
    currentDocumentState,
  );
  const orderedSections = useMemo(
    () => sortSectionsForTemplate(currentTemplate, workspace?.stageSections ?? []),
    [currentTemplate, workspace?.stageSections],
  );

  const runDirectPublishPath = async () => {
    if (!workspace?.draftVersion) {
      throw new Error(copy.notices.workflowActionError);
    }

    return publishPublicPresenceNow(
      request,
      talentId,
      currentDraftHash,
      workspace.selectedTemplateId,
    );
  };

  const closeMobileWorkbenchSheets = useCallback(() => {
    pendingMobileSheetRef.current = 'closed';
    setMobileManageOpen(false);
    setMobilePreviewToolsOpen(false);
  }, []);

  const closeStageWorkbenchPanel = useCallback(() => {
    pendingStagePanelRef.current = 'closed';
    setStagePanel(null);
  }, []);

  const openExclusiveMobileManageSheet = useCallback(() => {
    pendingMobileSheetRef.current = 'manage';
    setMobilePreviewToolsOpen(false);
    setMobileManageOpen(true);
  }, []);

  const openExclusiveMobilePreviewToolsSheet = useCallback(() => {
    pendingMobileSheetRef.current = 'preview-tools';
    setMobileManageOpen(false);
    setMobilePreviewToolsOpen(true);
  }, []);

  const openWorkbenchDrawer = useCallback((mode: LeftDrawerMode) => {
    closeMobileWorkbenchSheets();
    closeStageWorkbenchPanel();
    setLeftDrawerMode(mode);
    setLeftDrawerOpen(true);
  }, [closeMobileWorkbenchSheets, closeStageWorkbenchPanel]);

  const handleResolveReleaseDependency = async (
    dependency: PublicPresenceStudioReleaseDependency,
  ) => {
    if (dependency.targetTemplateId !== 'activeTalentHub') {
      return;
    }

    setNotice(null);

    if (dependency.nextAction === 'startActiveTalentHubDraft') {
      await handleBootstrap('activeTalentHub');
    } else {
      setSelectedTemplateId('activeTalentHub');
    }

    setPreviewFocus(false);
    openWorkbenchDrawer('release');
  };

  const openStageWorkbenchPanel = useCallback((nextPanel: StagePanelState) => {
    closeMobileWorkbenchSheets();
    if (!isDesktopWorkbench) {
      setLeftDrawerOpen(false);
    }
    pendingStagePanelRef.current = nextPanel;
    setStagePanel(nextPanel);
  }, [closeMobileWorkbenchSheets, isDesktopWorkbench]);

  useEffect(() => {
    setPreviewViewport((current) => (
      current === queryState.previewViewport ? current : queryState.previewViewport
    ));
    setPreviewFocus((current) => (
      current === queryState.previewFocus ? current : queryState.previewFocus
    ));
    setPreviewPhase((current) => (
      current === queryState.previewPhase ? current : queryState.previewPhase
    ));

    const nextMobileManageOpen = queryState.mobileSheet === 'manage';
    const nextMobilePreviewToolsOpen = queryState.mobileSheet === 'preview-tools';
    const nextLeftDrawerMode = queryState.leftDrawerMode;
    const nextQueryMobileSheet = queryState.mobileSheet ?? null;
    const pendingMobileSheet = pendingMobileSheetRef.current;
    const pendingTargetReached = pendingMobileSheet === 'closed'
      ? nextQueryMobileSheet === null
      : pendingMobileSheet !== null && pendingMobileSheet === nextQueryMobileSheet;

    if (pendingTargetReached) {
      pendingMobileSheetRef.current = null;
    }

    if (pendingMobileSheet === null || pendingTargetReached) {
      setMobileManageOpen((current) => (
        current === nextMobileManageOpen ? current : nextMobileManageOpen
      ));
      setMobilePreviewToolsOpen((current) => (
        current === nextMobilePreviewToolsOpen ? current : nextMobilePreviewToolsOpen
      ));
    }

    if (nextLeftDrawerMode) {
      setLeftDrawerMode((current) => (
        current === nextLeftDrawerMode ? current : nextLeftDrawerMode
      ));
      setLeftDrawerOpen((current) => (current ? current : true));
    } else if (queryState.previewFocus) {
      setLeftDrawerOpen((current) => (current ? false : current));
    } else if (queryState.hasLeftPanelQuery) {
      setLeftDrawerOpen((current) => (current ? false : current));
    }

  }, [
    queryState.hasLeftPanelQuery,
    queryState.leftDrawerMode,
    queryState.mobileSheet,
    queryState.previewFocus,
    queryState.previewPhase,
    queryState.previewViewport,
  ]);

  useEffect(() => {
    const nextStagePanel = queryState.stagePanel
      && orderedSections.some((section) => section.kind === queryState.stagePanel?.sectionKind)
      ? queryState.stagePanel
      : null;
    const pendingStagePanel = pendingStagePanelRef.current;
    const pendingTargetReached = pendingStagePanel === 'closed'
      ? nextStagePanel === null
      : pendingStagePanel !== null && isSameStagePanel(pendingStagePanel, nextStagePanel);

    if (pendingTargetReached) {
      pendingStagePanelRef.current = null;
    }

    if (pendingStagePanel !== null && !pendingTargetReached) {
      return;
    }

    setStagePanel((current) => (
      isSameStagePanel(current, nextStagePanel) ? current : nextStagePanel
    ));
  }, [
    orderedSections,
    queryState.stagePanel,
  ]);

  useEffect(() => {
    const entryFocus = initialFocus as StudioEntryFocus | null | undefined;

    if (!workspace || !editorDocument || !entryFocus || queryState.hasExplicitWorkbenchState) {
      return;
    }

    if (entryFocus === 'release') {
      setLeftDrawerMode('release');
      setLeftDrawerOpen(true);
      setPreviewFocus(false);
      return;
    }

    if (entryFocus === 'countdown') {
      const countdownSection = orderedSections.find((section) => section.kind === 'countdownReveal');

      if (countdownSection) {
        setLeftDrawerMode('sections');
        setLeftDrawerOpen(true);
        openStageWorkbenchPanel({ mode: 'edit', sectionKind: countdownSection.kind });
        setPreviewFocus(false);
        return;
      }
    }

    setLeftDrawerMode('sections');
    setLeftDrawerOpen(false);
  }, [
    editorDocument,
    initialFocus,
    openStageWorkbenchPanel,
    orderedSections,
    queryState.hasExplicitWorkbenchState,
    workspace,
  ]);

  useEffect(() => {
    if (!stagePanel) {
      return;
    }

    const stillVisible = orderedSections.some((section) => section.kind === stagePanel.sectionKind);

    if (!stillVisible) {
      closeStageWorkbenchPanel();
    }
  }, [closeStageWorkbenchPanel, orderedSections, stagePanel]);

  useEffect(() => {
    if (isDesktopWorkbench || !stagePanel || !leftDrawerOpen) {
      return;
    }

    setLeftDrawerOpen(false);
  }, [isDesktopWorkbench, leftDrawerOpen, stagePanel]);

  const selectedStageSection = orderedSections.find(
    (section) => section.kind === stagePanel?.sectionKind,
  ) ?? null;
  const selectedStageSectionDocument = selectedStageSection
    ? getCurrentSectionDocument(editorDocument, selectedStageSection.kind)
    : null;
  const selectedSectionIssues = selectedStageSection
    ? collectIssuesForSection(
        currentSnapshot,
        selectedStageSection.kind,
        selectedStageSectionDocument?.id ?? null,
      )
    : [];
  const managementHref = buildTalentWorkspaceSectionPath(
    tenantId,
    talentId,
    'homepage',
  );
  const previewHref = buildPublicPresenceStudioPreviewPath(
    tenantId,
    talentId,
    workspace?.selectedTemplateId ?? selectedTemplateId,
  );
  const advancedIdeHref = buildPublicPresenceAdvancedIdePath(
    tenantId,
    talentId,
    {
      mode: 'page-source',
      templateId: workspace?.selectedTemplateId ?? selectedTemplateId,
    },
  );
  const templateCenterHref = buildPublicPresenceHomepageSurfacePath(
    tenantId,
    talentId,
    'templates',
  );
  const previewTheme = useMemo(
    () => normalizeTheme(previewProjection?.appearance.theme || DEFAULT_THEME),
    [previewProjection],
  );
  const previewCanvasStyle = useMemo(
    () => ({
      ...getHomepageCanvasStyle(previewTheme),
      minHeight: '100%',
    }),
    [previewTheme],
  );
  const visualDraftDirty = useMemo(() => {
    if (!editorDocument || !workspace?.draftVersion?.document) {
      return false;
    }

    return JSON.stringify(editorDocument) !== JSON.stringify(workspace.draftVersion.document);
  }, [editorDocument, workspace?.draftVersion?.document]);

  const isWorkflowActionDisabled =
    workflowAction !== null || visualDraftDirty;

  const updateDocument = (next: PublicPresenceDocument) => {
    setEditorDocument(next);
  };

  const setFieldValue = (sectionKind: string, fieldKey: string, value: unknown) => {
    if (!editorDocument) {
      return;
    }

    updateDocument(buildSectionDocument(editorDocument, sectionKind, fieldKey, value));
  };

  const updateSectionComponent = (
    sectionKind: string,
    componentIndex: number,
    updater: (component: PublicPresenceComponentNode) => PublicPresenceComponentNode,
  ) => {
    if (!editorDocument) {
      return;
    }

    const nextSections = editorDocument.sections.map((section) => {
      if (section.kind !== sectionKind) {
        return section;
      }

      const components = [...(section.components ?? [])];
      const currentComponent = components[componentIndex];

      if (!currentComponent) {
        return section;
      }

      components[componentIndex] = updater(currentComponent);

      return {
        ...section,
        components,
      };
    });

    updateDocument({
      ...editorDocument,
      sections: nextSections,
    });
  };

  const setComponentPropValue = (
    sectionKind: string,
    componentIndex: number,
    fieldKey: string,
    value: unknown,
  ) => {
    updateSectionComponent(sectionKind, componentIndex, (component) => ({
      ...component,
      props: {
        ...component.props,
        [fieldKey]: value,
      },
    }));
  };

  const ensureSectionExists = (section: PublicPresenceStudioStageSectionSummary) => {
    if (!editorDocument) {
      return;
    }

    if (editorDocument.sections.some((entry) => entry.kind === section.kind)) {
      return;
    }

    const nextSection: PublicPresenceDocument['sections'][number] = buildEmptySectionDraft(
      section,
      editorDocument.sections.length,
    );

    if (section.allowedComponents.length === 1) {
      nextSection.components = [
        buildDefaultComponentForType(section.allowedComponents[0] as HomepageComponentType),
      ];
    }

    updateDocument({
      ...editorDocument,
      sections: [
        ...editorDocument.sections,
        nextSection,
      ],
    });
  };

  const renderFieldFooter = (
    _sectionKind: string,
    _fieldKey: string,
    definition: PublicPresenceStudioStageSectionSummary['fieldDefinitions'][number] | undefined,
  ) => {
    if (!definition?.sourceOnly && definition?.visualEditable !== false) {
      return null;
    }

    return (
      <p className="text-xs leading-5 text-slate-500">
        {definition?.sourceOnly ? (
          pickLocaleText(locale, {
            en: 'This field stays with the page setup. Review it in Configure or Inspect when you need more detail.',
            zh_HANS: '这个字段跟随页面设置保留。如需更多细节，请到配置或查看页处理。',
            zh_HANT: '這個欄位會跟隨頁面設定保留。如需更多細節，請到配置或查看頁處理。',
            ja: 'この項目はページ設定に合わせて保持されます。詳しく確認するときは設定または確認を開いてください。',
            ko: '이 필드는 페이지 설정에 맞춰 유지됩니다. 더 자세한 내용은 구성 또는 확인에서 살펴보세요.',
            fr: 'Ce champ reste lie a la configuration de la page. Ouvrez Configuration ou Inspection pour plus de details.',
          })
        ) : (
          pickLocaleText(locale, {
            en: 'This field is fixed in the current page setup.',
            zh_HANS: '这个字段在当前页面设置中保持固定。',
            zh_HANT: '這個欄位在目前頁面設定中保持固定。',
            ja: 'この項目は現在のページ設定で固定されています。',
            ko: '이 필드는 현재 페이지 설정에 고정되어 있습니다.',
            fr: 'Ce champ est fixe dans la configuration actuelle de la page.',
          })
        )}
      </p>
    );
  };

  const renderStructuredSectionEditor = (section: PublicPresenceStudioStageSectionSummary) => {
    const sectionDocument = getCurrentSectionDocument(editorDocument, section.kind);
    const canEditVisually =
      section.editabilityState === 'validEditable' && section.sourcePolicy === 'registryOwned';
    const fieldDefinitions = new Map(
      section.fieldDefinitions.map((definition) => [definition.fieldKey, definition]),
    );
    const isFieldEditable = (fieldKey: string) =>
      resolveFieldEditability(fieldDefinitions.get(fieldKey), canEditVisually);

    const getSectionComponents = () => sectionDocument?.components ?? [];
    const getFirstComponent = () => getSectionComponents()[0] ?? null;

    if (!sectionDocument) {
      return (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">{copy.stageSections.missingFromDraft}</p>
          <button
            type="button"
            onClick={() => ensureSectionExists(section)}
            className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
          >
            {copy.stageSections.addSection}
          </button>
        </div>
      );
    }

    if (!canEditVisually) {
      return (
        <div className="space-y-3">
          <p className="text-sm leading-6 text-slate-600">
            {pickLocaleText(locale, {
              en: 'This section is fixed by the current page setup, so it stays read-only in this editor.',
              zh_HANS: '这个分区由当前页面设置固定，因此在这里保持只读。',
              zh_HANT: '這個分區由目前頁面設定固定，因此在這裡保持唯讀。',
              ja: 'このセクションは現在のページ設定で固定されているため、この編集面では読み取り専用です。',
              ko: '이 섹션은 현재 페이지 설정에 고정되어 있어 이 편집면에서는 읽기 전용입니다.',
              fr: 'Cette section est fixée par la configuration actuelle de la page et reste donc en lecture seule ici.',
            })}
          </p>
          <PublicPresenceBadge tone="warning" variant="outline">
            {copy.common.locked}
          </PublicPresenceBadge>
        </div>
      );
    }

    if (section.kind === 'countdownReveal') {
      return (
        <div className="grid gap-4">
          <ControlledTextInput
            disabled={!isFieldEditable('teaserName')}
            label={getPublicPresenceFieldLabel(locale, 'teaserName')}
            onChange={(value) => setFieldValue(section.kind, 'teaserName', value)}
            placeholder={getPublicPresenceFieldPlaceholder(locale, 'teaserName')}
            value={String(readFieldValue(editorDocument, section.kind, 'teaserName') ?? '')}
            footer={renderFieldFooter(section.kind, 'teaserName', fieldDefinitions.get('teaserName'))}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('revealName')}
            label={getPublicPresenceFieldLabel(locale, 'revealName')}
            onChange={(value) => setFieldValue(section.kind, 'revealName', value)}
            placeholder={getPublicPresenceFieldPlaceholder(locale, 'revealName')}
            value={String(readFieldValue(editorDocument, section.kind, 'revealName') ?? '')}
            footer={renderFieldFooter(section.kind, 'revealName', fieldDefinitions.get('revealName'))}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('streamUrl')}
            label={getPublicPresenceFieldLabel(locale, 'streamUrl')}
            onChange={(value) => setFieldValue(section.kind, 'streamUrl', value)}
            placeholder={copy.stageSections.urlPlaceholder}
            value={String(readFieldValue(editorDocument, section.kind, 'streamUrl') ?? '')}
            footer={renderFieldFooter(section.kind, 'streamUrl', fieldDefinitions.get('streamUrl'))}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('launchUrl')}
            label={getPublicPresenceFieldLabel(locale, 'launchUrl')}
            onChange={(value) => setFieldValue(section.kind, 'launchUrl', value)}
            placeholder={copy.stageSections.urlPlaceholder}
            value={String(readFieldValue(editorDocument, section.kind, 'launchUrl') ?? '')}
            footer={renderFieldFooter(section.kind, 'launchUrl', fieldDefinitions.get('launchUrl'))}
          />
        </div>
      );
    }

    if (section.kind === 'fanActions') {
      const actions = Array.isArray(readFieldValue(editorDocument, section.kind, 'actions'))
        ? (readFieldValue(editorDocument, section.kind, 'actions') as Array<Record<string, unknown>>)
        : [];
      const actionOps = section.collectionOperations.find((entry) => entry.collectionKey === 'actions');

      return (
        <div className="space-y-4">
          {actions.length === 0 ? (
            <p className="text-sm text-slate-500">{copy.stageSections.noActionsYet}</p>
          ) : null}
          {actions.map((action, index) => (
            <div key={`${section.kind}-${index}`} className="grid gap-3 rounded-3xl border border-slate-200 bg-white/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {copy.stageSections.entryLabelPrefix} {index + 1}
                </p>
                <div className="flex flex-wrap gap-2">
                  {actionOps?.canReorder ? (
                    <>
                      <button
                        type="button"
                        disabled={index === 0 || !isFieldEditable('actions')}
                        onClick={() => {
                          setFieldValue(section.kind, 'actions', moveCollectionItem(actions, index, 'up'));
                        }}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {copy.stageSections.moveUp}
                      </button>
                      <button
                        type="button"
                        disabled={index === actions.length - 1 || !isFieldEditable('actions')}
                        onClick={() => {
                          setFieldValue(section.kind, 'actions', moveCollectionItem(actions, index, 'down'));
                        }}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {copy.stageSections.moveDown}
                      </button>
                    </>
                  ) : null}
                  {actionOps?.canRemove ? (
                    <button
                      type="button"
                      disabled={!isFieldEditable('actions')}
                      onClick={() => {
                        setFieldValue(section.kind, 'actions', actions.filter((_, actionIndex) => actionIndex !== index));
                      }}
                      className="inline-flex items-center rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {pickLocaleText(locale, {
                        en: 'Delete',
                        zh_HANS: '删除',
                        zh_HANT: '刪除',
                        ja: '削除',
                        ko: '삭제',
                        fr: 'Supprimer',
                      })}
                    </button>
                  ) : null}
                </div>
              </div>
              <ControlledSelect
                disabled={!isFieldEditable('actions')}
                label={`${copy.stageSections.fanActionsLabel} ${index + 1} ${getPublicPresenceFieldLabel(locale, 'slot')}`}
                onChange={(value) => {
                  const next = [...actions];
                  next[index] = { ...action, slot: value };
                  setFieldValue(section.kind, 'actions', next);
                }}
                options={PUBLIC_PRESENCE_FAN_ACTION_SLOTS.map((slot) => ({
                  label: getPublicPresenceFanActionSlotLabel(locale, slot),
                  value: slot,
                }))}
                value={String(action.slot ?? '')}
              />
              <ControlledTextInput
                disabled={!isFieldEditable('actions')}
                label={`${copy.stageSections.fanActionsLabel} ${index + 1} ${getPublicPresenceFieldLabel(locale, 'label')}`}
                onChange={(value) => {
                  const next = [...actions];
                  next[index] = { ...action, label: value };
                  setFieldValue(section.kind, 'actions', next);
                }}
                placeholder={copy.stageSections.actionLabelPlaceholder}
                value={String(action.label ?? '')}
              />
              <ControlledTextInput
                disabled={!isFieldEditable('actions')}
                label={`${copy.stageSections.fanActionsLabel} ${index + 1} ${getPublicPresenceFieldLabel(locale, 'url')}`}
                onChange={(value) => {
                  const next = [...actions];
                  next[index] = { ...action, url: value };
                  setFieldValue(section.kind, 'actions', next);
                }}
                placeholder={copy.stageSections.urlPlaceholder}
                value={String(action.url ?? '')}
              />
            </div>
          ))}
          <button
            type="button"
            disabled={!isFieldEditable('actions') || actionOps?.canAdd === false}
            onClick={() =>
              setFieldValue(section.kind, 'actions', [
                ...actions,
                { label: '', slot: '', url: '' },
              ])
            }
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {copy.stageSections.addAction}
          </button>
          {renderFieldFooter(section.kind, 'actions', fieldDefinitions.get('actions'))}
        </div>
      );
    }

    if (section.kind === 'agencyNotes') {
      const notes = Array.isArray(readFieldValue(editorDocument, section.kind, 'notes'))
        ? (readFieldValue(editorDocument, section.kind, 'notes') as Array<Record<string, unknown>>)
        : [];
      const noteOps = section.collectionOperations.find((entry) => entry.collectionKey === 'notes');

      return (
        <div className="space-y-4">
          {notes.length === 0 ? (
            <p className="text-sm text-slate-500">{copy.stageSections.noNotesYet}</p>
          ) : null}
          {notes.map((note, index) => (
            <div key={`${section.kind}-${index}`} className="grid gap-3 rounded-3xl border border-slate-200 bg-white/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {copy.stageSections.entryLabelPrefix} {index + 1}
                </p>
                <div className="flex flex-wrap gap-2">
                  {noteOps?.canReorder ? (
                    <>
                      <button
                        type="button"
                        disabled={index === 0 || !isFieldEditable('notes')}
                        onClick={() => {
                          setFieldValue(section.kind, 'notes', moveCollectionItem(notes, index, 'up'));
                        }}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {copy.stageSections.moveUp}
                      </button>
                      <button
                        type="button"
                        disabled={index === notes.length - 1 || !isFieldEditable('notes')}
                        onClick={() => {
                          setFieldValue(section.kind, 'notes', moveCollectionItem(notes, index, 'down'));
                        }}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {copy.stageSections.moveDown}
                      </button>
                    </>
                  ) : null}
                  {noteOps?.canRemove ? (
                    <button
                      type="button"
                      disabled={!isFieldEditable('notes')}
                      onClick={() => {
                        setFieldValue(section.kind, 'notes', notes.filter((_, noteIndex) => noteIndex !== index));
                      }}
                      className="inline-flex items-center rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {pickLocaleText(locale, {
                        en: 'Delete',
                        zh_HANS: '删除',
                        zh_HANT: '刪除',
                        ja: '削除',
                        ko: '삭제',
                        fr: 'Supprimer',
                      })}
                    </button>
                  ) : null}
                </div>
              </div>
              <ControlledSelect
                disabled={!isFieldEditable('notes')}
                label={`${copy.stageSections.agencyNotesLabel} ${index + 1} ${getPublicPresenceFieldLabel(locale, 'kind')}`}
                onChange={(value) => {
                  const next = [...notes];
                  next[index] = { ...note, kind: value };
                  setFieldValue(section.kind, 'notes', next);
                }}
                options={PUBLIC_PRESENCE_NOTE_KINDS.map((kind) => ({
                  label: getPublicPresenceNoteKindLabel(locale, kind),
                  value: kind,
                }))}
                value={String(note.kind ?? 'announcement')}
              />
              <ControlledTextInput
                disabled={!isFieldEditable('notes')}
                label={`${copy.stageSections.agencyNotesLabel} ${index + 1} ${getPublicPresenceFieldLabel(locale, 'title')}`}
                onChange={(value) => {
                  const next = [...notes];
                  next[index] = { ...note, title: value };
                  setFieldValue(section.kind, 'notes', next);
                }}
                placeholder={copy.stageSections.noteTitlePlaceholder}
                value={String(note.title ?? '')}
              />
              <ControlledTextArea
                disabled={!isFieldEditable('notes')}
                label={`${copy.stageSections.agencyNotesLabel} ${index + 1} ${getPublicPresenceFieldLabel(locale, 'body')}`}
                onChange={(value) => {
                  const next = [...notes];
                  next[index] = { ...note, body: value };
                  setFieldValue(section.kind, 'notes', next);
                }}
                placeholder={copy.stageSections.noteBodyPlaceholder}
                value={String(note.body ?? '')}
              />
            </div>
          ))}
          <button
            type="button"
            disabled={!isFieldEditable('notes') || noteOps?.canAdd === false}
            onClick={() =>
              setFieldValue(section.kind, 'notes', [
                ...notes,
                { body: '', kind: 'announcement', title: '' },
              ])
            }
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {copy.stageSections.addNote}
          </button>
          {renderFieldFooter(section.kind, 'notes', fieldDefinitions.get('notes'))}
        </div>
      );
    }

    if (section.kind === 'firstEncounter') {
      return (
        <div className="grid gap-4">
          <ControlledTextInput
            disabled={!isFieldEditable('displayName')}
            label={getPublicPresenceFieldLabel(locale, 'displayName')}
            onChange={(value) => setFieldValue(section.kind, 'displayName', value)}
            placeholder={getPublicPresenceFieldPlaceholder(locale, 'displayName')}
            value={String(readFieldValue(editorDocument, section.kind, 'displayName') ?? '')}
            footer={renderFieldFooter(section.kind, 'displayName', fieldDefinitions.get('displayName'))}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('headline')}
            label={getPublicPresenceFieldLabel(locale, 'headline')}
            onChange={(value) => setFieldValue(section.kind, 'headline', value)}
            placeholder={getPublicPresenceFieldPlaceholder(locale, 'headline')}
            value={String(readFieldValue(editorDocument, section.kind, 'headline') ?? '')}
            footer={renderFieldFooter(section.kind, 'headline', fieldDefinitions.get('headline'))}
          />
          <ControlledTextArea
            disabled={!isFieldEditable('intro')}
            label={getPublicPresenceFieldLabel(locale, 'intro')}
            onChange={(value) => setFieldValue(section.kind, 'intro', value)}
            placeholder={getPublicPresenceFieldPlaceholder(locale, 'intro')}
            value={String(readFieldValue(editorDocument, section.kind, 'intro') ?? '')}
            footer={renderFieldFooter(section.kind, 'intro', fieldDefinitions.get('intro'))}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('avatarUrl')}
            label={getPublicPresenceFieldLabel(locale, 'avatarUrl')}
            onChange={(value) => setFieldValue(section.kind, 'avatarUrl', value)}
            placeholder={copy.stageSections.urlPlaceholder}
            value={String(readFieldValue(editorDocument, section.kind, 'avatarUrl') ?? '')}
            footer={renderFieldFooter(section.kind, 'avatarUrl', fieldDefinitions.get('avatarUrl'))}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('heroMediaUrl')}
            label={getPublicPresenceFieldLabel(locale, 'heroMediaUrl')}
            onChange={(value) => setFieldValue(section.kind, 'heroMediaUrl', value)}
            placeholder={copy.stageSections.urlPlaceholder}
            value={String(readFieldValue(editorDocument, section.kind, 'heroMediaUrl') ?? '')}
            footer={renderFieldFooter(section.kind, 'heroMediaUrl', fieldDefinitions.get('heroMediaUrl'))}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('teaserName')}
            label={getPublicPresenceFieldLabel(locale, 'teaserName')}
            onChange={(value) => setFieldValue(section.kind, 'teaserName', value)}
            placeholder={getPublicPresenceFieldPlaceholder(locale, 'teaserName')}
            value={String(readFieldValue(editorDocument, section.kind, 'teaserName') ?? '')}
            footer={renderFieldFooter(section.kind, 'teaserName', fieldDefinitions.get('teaserName'))}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('revealName')}
            label={getPublicPresenceFieldLabel(locale, 'revealName')}
            onChange={(value) => setFieldValue(section.kind, 'revealName', value)}
            placeholder={getPublicPresenceFieldPlaceholder(locale, 'revealName')}
            value={String(readFieldValue(editorDocument, section.kind, 'revealName') ?? '')}
            footer={renderFieldFooter(section.kind, 'revealName', fieldDefinitions.get('revealName'))}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('primaryCtaLabel')}
            label={getPublicPresenceFieldLabel(locale, 'primaryCtaLabel')}
            onChange={(value) => setFieldValue(section.kind, 'primaryCtaLabel', value)}
            placeholder={getPublicPresenceFieldPlaceholder(locale, 'primaryCtaLabel')}
            value={String(readFieldValue(editorDocument, section.kind, 'primaryCtaLabel') ?? '')}
            footer={renderFieldFooter(section.kind, 'primaryCtaLabel', fieldDefinitions.get('primaryCtaLabel'))}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('primaryCtaUrl')}
            label={getPublicPresenceFieldLabel(locale, 'primaryCtaUrl')}
            onChange={(value) => setFieldValue(section.kind, 'primaryCtaUrl', value)}
            placeholder={copy.stageSections.urlPlaceholder}
            value={String(readFieldValue(editorDocument, section.kind, 'primaryCtaUrl') ?? '')}
            footer={renderFieldFooter(section.kind, 'primaryCtaUrl', fieldDefinitions.get('primaryCtaUrl'))}
          />
        </div>
      );
    }

    const component = getFirstComponent();

    if (section.kind === 'officialChannels') {
      const definition = PUBLIC_PRESENCE_COMPONENT_DEFINITIONS.SocialLinks;
      const platforms = component?.type === 'SocialLinks' && Array.isArray(component.props.platforms)
        ? (component.props.platforms as Array<Record<string, unknown>>)
        : [];
      const channelOps = section.collectionOperations.find((entry) => entry.collectionKey === 'platforms');

      if (!component || component.type !== 'SocialLinks') {
        return (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              {pickLocaleText(locale, {
                en: 'This template owns one official channel cluster. Add the fixed Social Links slot to begin editing.',
                zh_HANS: '这个模板拥有一个固定的官方渠道组。先启用固定的 Social Links 槽位，再开始编辑。',
                zh_HANT: '這個模板擁有一個固定的官方渠道組。先啟用固定的 Social Links 槽位，再開始編輯。',
                ja: 'このテンプレートは固定の公式チャンネル群を 1 つ持ちます。編集を始めるには固定 Social Links スロットを有効にしてください。',
                ko: '이 템플릿은 고정된 공식 채널 묶음 1개를 가집니다. 편집을 시작하려면 고정 Social Links 슬롯을 먼저 활성화하세요.',
                fr: 'Ce template possède un cluster officiel fixe. Activez d’abord le slot Social Links fixe pour commencer.',
              })}
            </p>
            <button
              type="button"
              onClick={() => {
                if (!editorDocument) {
                  return;
                }

                const nextSections = editorDocument.sections.map((entry) => (
                  entry.kind === section.kind
                    ? {
                        ...entry,
                        components: [buildDefaultComponentForType('SocialLinks')],
                      }
                    : entry
                ));

                updateDocument({
                  ...editorDocument,
                  sections: nextSections,
                });
              }}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
            >
              {copy.stageSections.addChannel}
            </button>
          </div>
        );
      }

      const layoutField = definition.fieldDefinitions.find((field) => field.fieldKey === 'layout');
      const styleField = definition.fieldDefinitions.find((field) => field.fieldKey === 'style');

      return (
        <div className="space-y-4">
          <ControlledSelect
            disabled={!resolveFieldEditability(layoutField, true)}
            label={getPublicPresenceFieldLabel(locale, 'layout')}
            onChange={(value) => setComponentPropValue(section.kind, 0, 'layout', value)}
            options={[
              { label: 'horizontal', value: 'horizontal' },
              { label: 'stack', value: 'stack' },
            ]}
            value={String(component.props.layout ?? 'horizontal')}
            footer={renderFieldFooter(section.kind, 'layout', layoutField)}
          />
          <ControlledSelect
            disabled={!resolveFieldEditability(styleField, true)}
            label={getPublicPresenceFieldLabel(locale, 'style')}
            onChange={(value) => setComponentPropValue(section.kind, 0, 'style', value)}
            options={[
              { label: 'pill', value: 'pill' },
              { label: 'outline', value: 'outline' },
            ]}
            value={String(component.props.style ?? 'pill')}
            footer={renderFieldFooter(section.kind, 'style', styleField)}
          />
          {platforms.length === 0 ? (
            <p className="text-sm text-slate-500">{copy.stageSections.noChannelsYet}</p>
          ) : null}
          {platforms.map((platform, index) => (
            <div key={`${section.kind}-platform-${index}`} className="grid gap-3 rounded-3xl border border-slate-200 bg-white/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {copy.stageSections.entryLabelPrefix} {index + 1}
                </p>
                <div className="flex flex-wrap gap-2">
                  {channelOps?.canReorder ? (
                    <>
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => {
                          setComponentPropValue(section.kind, 0, 'platforms', moveCollectionItem(platforms, index, 'up'));
                        }}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {copy.stageSections.moveUp}
                      </button>
                      <button
                        type="button"
                        disabled={index === platforms.length - 1}
                        onClick={() => {
                          setComponentPropValue(section.kind, 0, 'platforms', moveCollectionItem(platforms, index, 'down'));
                        }}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {copy.stageSections.moveDown}
                      </button>
                    </>
                  ) : null}
                  {channelOps?.canRemove ? (
                    <button
                      type="button"
                      onClick={() => {
                        setComponentPropValue(section.kind, 0, 'platforms', platforms.filter((_, platformIndex) => platformIndex !== index));
                      }}
                      className="inline-flex items-center rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
                    >
                      {pickLocaleText(locale, {
                        en: 'Delete',
                        zh_HANS: '删除',
                        zh_HANT: '刪除',
                        ja: '削除',
                        ko: '삭제',
                        fr: 'Supprimer',
                      })}
                    </button>
                  ) : null}
                </div>
              </div>
              <ControlledTextInput
                label={`${getPublicPresenceFieldLabel(locale, 'platform')} ${index + 1}`}
                onChange={(value) => {
                  const next = [...platforms];
                  next[index] = { ...platform, platformCode: value };
                  setComponentPropValue(section.kind, 0, 'platforms', next);
                }}
                placeholder={copy.stageSections.platformPlaceholder}
                value={String(platform.platformCode ?? '')}
              />
              <ControlledTextInput
                label={`${getPublicPresenceFieldLabel(locale, 'label')} ${index + 1}`}
                onChange={(value) => {
                  const next = [...platforms];
                  next[index] = { ...platform, label: value };
                  setComponentPropValue(section.kind, 0, 'platforms', next);
                }}
                placeholder={copy.stageSections.actionLabelPlaceholder}
                value={String(platform.label ?? '')}
              />
              <ControlledTextInput
                label={`${getPublicPresenceFieldLabel(locale, 'url')} ${index + 1}`}
                onChange={(value) => {
                  const next = [...platforms];
                  next[index] = { ...platform, url: value };
                  setComponentPropValue(section.kind, 0, 'platforms', next);
                }}
                placeholder={copy.stageSections.urlPlaceholder}
                value={String(platform.url ?? '')}
              />
            </div>
          ))}
          <button
            type="button"
            disabled={channelOps?.canAdd === false}
            onClick={() =>
              setComponentPropValue(section.kind, 0, 'platforms', [
                ...platforms,
                { label: '', platformCode: '', url: '' },
              ])
            }
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {copy.stageSections.addChannel}
          </button>
        </div>
      );
    }

    if (section.kind === 'currentLaunchAction') {
      const linkDefinition = PUBLIC_PRESENCE_COMPONENT_DEFINITIONS.LinkButton;
      const liveDefinition = PUBLIC_PRESENCE_COMPONENT_DEFINITIONS.LiveStatus;
      const activeDefinition = component?.type === 'LiveStatus' ? liveDefinition : linkDefinition;

      if (!component) {
        return (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              {pickLocaleText(locale, {
                en: 'This slot is template-owned. The draft may host one approved launch-action component.',
                zh_HANS: '这个槽位由模板定义。草稿中只能承载一个已批准的上线动作组件。',
                zh_HANT: '這個槽位由模板定義。草稿中只能承載一個已批准的上線動作元件。',
                ja: 'このスロットはテンプレート所有です。ドラフトでは承認済みの導線コンポーネントを 1 つだけ保持できます。',
                ko: '이 슬롯은 템플릿 소유입니다. 드래프트에는 승인된 런치 액션 컴포넌트 하나만 둘 수 있습니다.',
                fr: 'Ce slot appartient au template. Le brouillon ne peut contenir qu’un composant d’action approuve.',
              })}
            </p>
            <button
              type="button"
              onClick={() => {
                if (!editorDocument) {
                  return;
                }

                const nextSections = editorDocument.sections.map((entry) => (
                  entry.kind === section.kind
                    ? {
                        ...entry,
                        components: [buildDefaultComponentForType('LinkButton')],
                      }
                    : entry
                ));

                updateDocument({
                  ...editorDocument,
                  sections: nextSections,
                });
              }}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
            >
              {copy.stageSections.editAction}
            </button>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            {pickLocaleText(locale, {
              en: 'The template governs this single launch slot. You may tune the approved component fields, but not replace the slot with arbitrary blocks.',
              zh_HANS: '模板治理这个单一上线槽位。你可以调整已批准组件的字段，但不能用任意区块替换这个槽位。',
              zh_HANT: '模板治理這個單一上線槽位。你可以調整已批准元件的欄位，但不能用任意區塊替換這個槽位。',
              ja: 'テンプレートがこの単一導線スロットを管理します。承認済みコンポーネントの項目は調整できますが、任意のブロックに置き換えることはできません。',
              ko: '템플릿이 이 단일 런치 슬롯을 관리합니다. 승인된 컴포넌트 필드는 조정할 수 있지만 임의 블록으로 교체할 수는 없습니다.',
              fr: 'Le template gouverne ce slot unique. Vous pouvez ajuster les champs approuves, mais pas le remplacer par des blocs arbitraires.',
            })}
          </p>
          {component.type === 'LinkButton' ? (
            <div className="grid gap-4">
              <ControlledTextInput
                label={getPublicPresenceFieldLabel(locale, 'label')}
                onChange={(value) => setComponentPropValue(section.kind, 0, 'label', value)}
                placeholder={getPublicPresenceFieldPlaceholder(locale, 'label')}
                value={String(component.props.label ?? '')}
                footer={renderFieldFooter(section.kind, 'label', activeDefinition.fieldDefinitions.find((field) => field.fieldKey === 'label'))}
              />
              <ControlledTextInput
                label={getPublicPresenceFieldLabel(locale, 'url')}
                onChange={(value) => setComponentPropValue(section.kind, 0, 'url', value)}
                placeholder={copy.stageSections.urlPlaceholder}
                value={String(component.props.url ?? '')}
                footer={renderFieldFooter(section.kind, 'url', activeDefinition.fieldDefinitions.find((field) => field.fieldKey === 'url'))}
              />
            </div>
          ) : null}
          {component.type === 'LiveStatus' ? (
            <div className="grid gap-4">
              <ControlledTextInput
                label={getPublicPresenceFieldLabel(locale, 'platform')}
                onChange={(value) => setComponentPropValue(section.kind, 0, 'platform', value)}
                placeholder={copy.stageSections.platformPlaceholder}
                value={String(component.props.platform ?? '')}
              />
              <ControlledTextInput
                label={getPublicPresenceFieldLabel(locale, 'channelName')}
                onChange={(value) => setComponentPropValue(section.kind, 0, 'channelName', value)}
                placeholder={getPublicPresenceFieldPlaceholder(locale, 'channelName')}
                value={String(component.props.channelName ?? '')}
              />
              <ControlledTextInput
                label={getPublicPresenceFieldLabel(locale, 'title')}
                onChange={(value) => setComponentPropValue(section.kind, 0, 'title', value)}
                placeholder={copy.stageSections.titlePlaceholder}
                value={String(component.props.title ?? '')}
              />
              <ControlledTextInput
                label={getPublicPresenceFieldLabel(locale, 'streamUrl')}
                onChange={(value) => setComponentPropValue(section.kind, 0, 'streamUrl', value)}
                placeholder={copy.stageSections.urlPlaceholder}
                value={String(component.props.streamUrl ?? '')}
              />
              <ControlledTextInput
                label={getPublicPresenceFieldLabel(locale, 'viewers')}
                onChange={(value) => setComponentPropValue(section.kind, 0, 'viewers', value)}
                placeholder={getPublicPresenceFieldPlaceholder(locale, 'viewers')}
                value={String(component.props.viewers ?? '')}
              />
              <ControlledCheckbox
                checked={Boolean(component.props.isLive)}
                label={getPublicPresenceFieldLabel(locale, 'isLive')}
                onChange={(checked) => setComponentPropValue(section.kind, 0, 'isLive', checked)}
              />
            </div>
          ) : null}
        </div>
      );
    }

    if (section.kind === 'stageSchedule') {
      const events = component?.type === 'Schedule' && Array.isArray(component.props.events)
        ? (component.props.events as Array<Record<string, unknown>>)
        : [];
      const scheduleOps = section.collectionOperations.find((entry) => entry.collectionKey === 'events');

      if (!component || component.type !== 'Schedule') {
        return (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              {pickLocaleText(locale, {
                en: 'This template owns one bounded schedule surface. Enable the fixed schedule slot to start editing.',
                zh_HANS: '这个模板拥有一个固定且受边界约束的日程面。先启用固定 schedule 槽位，再开始编辑。',
                zh_HANT: '這個模板擁有一個固定且受邊界約束的日程面。先啟用固定 schedule 槽位，再開始編輯。',
                ja: 'このテンプレートは固定のスケジュール面を 1 つ持ちます。編集を始めるには固定 schedule スロットを有効にしてください。',
                ko: '이 템플릿은 고정된 일정 표면 1개를 가집니다. 편집을 시작하려면 고정 schedule 슬롯을 활성화하세요.',
                fr: 'Ce template possède une surface planning fixe et bornee. Activez le slot schedule fixe pour commencer.',
              })}
            </p>
            <button
              type="button"
              onClick={() => {
                if (!editorDocument) {
                  return;
                }

                const nextSections = editorDocument.sections.map((entry) => (
                  entry.kind === section.kind
                    ? {
                        ...entry,
                        components: [buildDefaultComponentForType('Schedule')],
                      }
                    : entry
                ));

                updateDocument({
                  ...editorDocument,
                  sections: nextSections,
                });
              }}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
            >
              {copy.stageSections.addEvent}
            </button>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          <ControlledTextInput
            label={getPublicPresenceFieldLabel(locale, 'title')}
            onChange={(value) => setComponentPropValue(section.kind, 0, 'title', value)}
            placeholder={copy.stageSections.titlePlaceholder}
            value={String(component.props.title ?? '')}
          />
          <ControlledTextInput
            label={getPublicPresenceFieldLabel(locale, 'weekOf')}
            onChange={(value) => setComponentPropValue(section.kind, 0, 'weekOf', value)}
            placeholder={getPublicPresenceFieldPlaceholder(locale, 'weekOf')}
            value={String(component.props.weekOf ?? '')}
          />
          {events.length === 0 ? (
            <p className="text-sm text-slate-500">{copy.stageSections.noEventsYet}</p>
          ) : null}
          {events.map((event, index) => (
            <div key={`${section.kind}-event-${index}`} className="grid gap-3 rounded-3xl border border-slate-200 bg-white/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {copy.stageSections.entryLabelPrefix} {index + 1}
                </p>
                <div className="flex flex-wrap gap-2">
                  {scheduleOps?.canReorder ? (
                    <>
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => {
                          setComponentPropValue(section.kind, 0, 'events', moveCollectionItem(events, index, 'up'));
                        }}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {copy.stageSections.moveUp}
                      </button>
                      <button
                        type="button"
                        disabled={index === events.length - 1}
                        onClick={() => {
                          setComponentPropValue(section.kind, 0, 'events', moveCollectionItem(events, index, 'down'));
                        }}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {copy.stageSections.moveDown}
                      </button>
                    </>
                  ) : null}
                  {scheduleOps?.canRemove ? (
                    <button
                      type="button"
                      onClick={() => {
                        setComponentPropValue(section.kind, 0, 'events', events.filter((_, eventIndex) => eventIndex !== index));
                      }}
                      className="inline-flex items-center rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
                    >
                      {pickLocaleText(locale, {
                        en: 'Delete',
                        zh_HANS: '删除',
                        zh_HANT: '刪除',
                        ja: '削除',
                        ko: '삭제',
                        fr: 'Supprimer',
                      })}
                    </button>
                  ) : null}
                </div>
              </div>
              <ControlledTextInput
                label={`${getPublicPresenceFieldLabel(locale, 'day')} ${index + 1}`}
                onChange={(value) => {
                  const next = [...events];
                  next[index] = { ...event, day: value };
                  setComponentPropValue(section.kind, 0, 'events', next);
                }}
                placeholder={copy.stageSections.dayPlaceholder}
                value={String(event.day ?? '')}
              />
              <ControlledTextInput
                label={`${getPublicPresenceFieldLabel(locale, 'time')} ${index + 1}`}
                onChange={(value) => {
                  const next = [...events];
                  next[index] = { ...event, time: value };
                  setComponentPropValue(section.kind, 0, 'events', next);
                }}
                placeholder={copy.stageSections.timePlaceholder}
                value={String(event.time ?? '')}
              />
              <ControlledTextInput
                label={`${getPublicPresenceFieldLabel(locale, 'title')} ${index + 1}`}
                onChange={(value) => {
                  const next = [...events];
                  next[index] = { ...event, title: value };
                  setComponentPropValue(section.kind, 0, 'events', next);
                }}
                placeholder={copy.stageSections.titlePlaceholder}
                value={String(event.title ?? '')}
              />
            </div>
          ))}
          <button
            type="button"
            disabled={scheduleOps?.canAdd === false}
            onClick={() =>
              setComponentPropValue(section.kind, 0, 'events', [
                ...events,
                { day: '', time: '', title: '' },
              ])
            }
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {copy.stageSections.addEvent}
          </button>
        </div>
      );
    }

    if (section.kind === 'fanInteraction') {
      const definition = PUBLIC_PRESENCE_COMPONENT_DEFINITIONS.MarshmallowWidget;

      if (!component || component.type !== 'MarshmallowWidget') {
        return (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              {pickLocaleText(locale, {
                en: 'This template reserves one bounded Marshmallow surface. The slot stays fixed and only approved fields can change here.',
                zh_HANS: '这个模板预留了一个受边界约束的棉花糖面。这个槽位保持固定，且这里只能调整已批准字段。',
                zh_HANT: '這個模板預留了一個受邊界約束的棉花糖面。這個槽位保持固定，且這裡只能調整已批准欄位。',
                ja: 'このテンプレートは境界付き Marshmallow 面を 1 つ予約しています。スロットは固定で、ここで変更できるのは承認済み項目のみです。',
                ko: '이 템플릿은 경계가 있는 Marshmallow 표면 하나를 예약합니다. 슬롯은 고정되며 여기서는 승인된 필드만 바꿀 수 있습니다.',
                fr: 'Ce template reserve une surface Marshmallow bornee. Le slot reste fixe et seuls les champs approuves peuvent changer ici.',
              })}
            </p>
            <button
              type="button"
              onClick={() => {
                if (!editorDocument) {
                  return;
                }

                const nextSections = editorDocument.sections.map((entry) => (
                  entry.kind === section.kind
                    ? {
                        ...entry,
                        components: [buildDefaultComponentForType('MarshmallowWidget')],
                      }
                    : entry
                ));

                updateDocument({
                  ...editorDocument,
                  sections: nextSections,
                });
              }}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
            >
              {copy.stageSections.editAction}
            </button>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          {definition.fieldDefinitions.map((field) => {
            const fieldValue = component.props[field.fieldKey];
            if (field.valueType === 'boolean') {
              return (
                <ControlledCheckbox
                  key={field.fieldKey}
                  checked={Boolean(fieldValue)}
                  disabled={!field.visualEditable}
                  label={getPublicPresenceFieldLabel(locale, field.fieldKey)}
                  onChange={(checked) => setComponentPropValue(section.kind, 0, field.fieldKey, checked)}
                />
              );
            }

            return (
              <ControlledTextInput
                key={field.fieldKey}
                disabled={!field.visualEditable}
                label={getPublicPresenceFieldLabel(locale, field.fieldKey)}
                onChange={(value) => setComponentPropValue(section.kind, 0, field.fieldKey, value)}
                placeholder={getPublicPresenceFieldPlaceholder(locale, field.fieldKey)}
                value={String(fieldValue ?? '')}
              />
            );
          })}
        </div>
      );
    }

    if (section.kind === 'teaserRevealMedia') {
      const definition = component?.type === 'ImageGallery'
        ? PUBLIC_PRESENCE_COMPONENT_DEFINITIONS.ImageGallery
        : PUBLIC_PRESENCE_COMPONENT_DEFINITIONS.VideoEmbed;

      if (!component) {
        return (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              {pickLocaleText(locale, {
                en: 'This reveal-safe slot stays under the template setup. Enable the approved media block before editing.',
                zh_HANS: '这个揭晓安全槽位保持在模板设置内。请先启用已批准的媒体模块，再开始编辑。',
                zh_HANT: '這個揭曉安全槽位保持在模板設定內。請先啟用已批准的媒體模組，再開始編輯。',
                ja: 'この公開安全スロットはテンプレート設定の範囲に残ります。編集前に承認済みメディアブロックを有効にしてください。',
                ko: '이 리빌 안전 슬롯은 템플릿 설정 범위에 머뭅니다. 편집 전에 승인된 미디어 블록을 먼저 활성화하세요.',
                fr: 'Ce slot reveal-safe reste dans la configuration du template. Activez d’abord le bloc media approuvé avant de modifier.',
              })}
            </p>
            <button
              type="button"
              onClick={() => {
                if (!editorDocument) {
                  return;
                }

                const nextSections = editorDocument.sections.map((entry) => (
                  entry.kind === section.kind
                    ? {
                        ...entry,
                        components: [buildDefaultComponentForType('ImageGallery')],
                      }
                    : entry
                ));

                updateDocument({
                  ...editorDocument,
                  sections: nextSections,
                });
              }}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
            >
              {copy.stageSections.editAction}
            </button>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            {pickLocaleText(locale, {
              en: 'This slot keeps one approved reveal-safe media block. You may tune its approved fields only.',
              zh_HANS: '这个槽位保留一个已批准的揭晓安全媒体模块。你只能调整其已批准字段。',
              zh_HANT: '這個槽位保留一個已批准的揭曉安全媒體模組。你只能調整其已批准欄位。',
              ja: 'このスロットには承認済みの公開安全メディアブロックが 1 つ入ります。調整できるのは承認済み項目のみです。',
              ko: '이 슬롯에는 승인된 리빌 안전 미디어 블록 하나가 들어갑니다. 승인된 필드만 조정할 수 있습니다.',
              fr: 'Ce slot garde un bloc media reveal-safe approuve. Vous ne pouvez ajuster que les champs approuves.',
            })}
          </p>
          {component.type === 'ImageGallery' ? (
            <>
              {Array.isArray(component.props.images) && component.props.images.length === 0 ? (
                <p className="text-sm text-slate-500">{copy.stageSections.noImagesYet}</p>
              ) : null}
              {Array.isArray(component.props.images)
                ? (component.props.images as Array<Record<string, unknown>>).map((image, index) => (
                    <div key={`${section.kind}-image-${index}`} className="grid gap-3 rounded-3xl border border-slate-200 bg-white/80 p-4">
                      <ControlledTextInput
                        label={`${getPublicPresenceFieldLabel(locale, 'url')} ${index + 1}`}
                        onChange={(value) => {
                          const next = [...(component.props.images as Array<Record<string, unknown>>)];
                          next[index] = { ...image, url: value };
                          setComponentPropValue(section.kind, 0, 'images', next);
                        }}
                        placeholder={copy.stageSections.urlPlaceholder}
                        value={String(image.url ?? '')}
                      />
                      <ControlledTextInput
                        label={`${getPublicPresenceFieldLabel(locale, 'alt')} ${index + 1}`}
                        onChange={(value) => {
                          const next = [...(component.props.images as Array<Record<string, unknown>>)];
                          next[index] = { ...image, alt: value };
                          setComponentPropValue(section.kind, 0, 'images', next);
                        }}
                        placeholder={getPublicPresenceFieldPlaceholder(locale, 'alt')}
                        value={String(image.alt ?? '')}
                      />
                      <ControlledTextInput
                        label={`${getPublicPresenceFieldLabel(locale, 'caption')} ${index + 1}`}
                        onChange={(value) => {
                          const next = [...(component.props.images as Array<Record<string, unknown>>)];
                          next[index] = { ...image, caption: value };
                          setComponentPropValue(section.kind, 0, 'images', next);
                        }}
                        placeholder={getPublicPresenceFieldPlaceholder(locale, 'caption')}
                        value={String(image.caption ?? '')}
                      />
                    </div>
                  ))
                : null}
            </>
          ) : null}
          {component.type === 'VideoEmbed'
            ? definition.fieldDefinitions.map((field) => (
                <ControlledTextInput
                  key={field.fieldKey}
                  disabled={!field.visualEditable}
                  label={getPublicPresenceFieldLabel(locale, field.fieldKey)}
                  onChange={(value) => setComponentPropValue(section.kind, 0, field.fieldKey, value)}
                  placeholder={getPublicPresenceFieldPlaceholder(locale, field.fieldKey)}
                  value={String(component.props[field.fieldKey] ?? '')}
                />
              ))
            : null}
        </div>
      );
    }

    if (section.kind === 'goodsSupport') {
      const components = getSectionComponents().filter((entry) => entry.type === 'LinkButton');

      return (
        <div className="space-y-4">
          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            {pickLocaleText(locale, {
              en: 'This template reserves goods/support links only. The slot stays fixed, and each row remains a typed destination.',
              zh_HANS: '这个模板只预留商品与支持链接。槽位保持固定，每一行都必须是类型化目标。',
              zh_HANT: '這個模板只預留商品與支援連結。槽位保持固定，每一行都必須是型別化目標。',
              ja: 'このテンプレートはグッズ/サポートリンク専用です。スロットは固定で、各行は型付き導線のまま保たれます。',
              ko: '이 템플릿은 굿즈/지원 링크 전용입니다. 슬롯은 고정되며 각 행은 타입이 있는 목적지로 유지됩니다.',
              fr: 'Ce template reserve uniquement des liens goods/support. Le slot reste fixe et chaque ligne garde une destination typée.',
            })}
          </p>
          {components.length === 0 ? (
            <p className="text-sm text-slate-500">{copy.stageSections.noGoodsLinksYet}</p>
          ) : null}
          {components.map((entry, index) => (
            <div key={entry.id} className="grid gap-3 rounded-3xl border border-slate-200 bg-white/80 p-4">
              <ControlledTextInput
                label={`${getPublicPresenceFieldLabel(locale, 'label')} ${index + 1}`}
                onChange={(value) => setComponentPropValue(section.kind, index, 'label', value)}
                placeholder={copy.stageSections.actionLabelPlaceholder}
                value={String(entry.props.label ?? '')}
              />
              <ControlledTextInput
                label={`${getPublicPresenceFieldLabel(locale, 'url')} ${index + 1}`}
                onChange={(value) => setComponentPropValue(section.kind, index, 'url', value)}
                placeholder={copy.stageSections.urlPlaceholder}
                value={String(entry.props.url ?? '')}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              if (!editorDocument) {
                return;
              }

              const nextSections = editorDocument.sections.map((entry) => (
                entry.kind === section.kind
                  ? {
                      ...entry,
                      components: [
                        ...(entry.components ?? []),
                        buildDefaultComponentForType('LinkButton'),
                      ],
                    }
                  : entry
              ));

              updateDocument({
                ...editorDocument,
                sections: nextSections,
              });
            }}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {copy.stageSections.addGoodsLink}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-sm leading-6 text-slate-600">
          {pickLocaleText(locale, {
            en: 'This section follows the current page setup. Review its state here, then adjust another section if you need fan-facing changes.',
            zh_HANS: '这个分区遵循当前页面设置。你可以先在这里查看状态；如果要改动粉丝可见内容，请切换到其他分区。',
            zh_HANT: '這個分區遵循目前頁面設定。你可以先在這裡查看狀態；如果要改動粉絲可見內容，請切換到其他分區。',
            ja: 'このセクションは現在のページ設定に従います。まずここで状態を確認し、ファン向け内容を変える場合は別のセクションを選んでください。',
            ko: '이 섹션은 현재 페이지 설정을 따릅니다. 여기에서 상태를 확인하고, 팬에게 보이는 내용을 바꾸려면 다른 섹션을 선택하세요.',
            fr: 'Cette section suit la configuration actuelle de la page. Vérifiez son état ici, puis passez à une autre section si vous devez changer le contenu visible par les fans.',
          })}
        </p>
      </div>
    );
  };

  const renderInspectFieldSummary = (section: PublicPresenceStudioStageSectionSummary) => {
    if (section.fieldDefinitions.length === 0) {
      return null;
    }

    return (
      <PublicPresenceSurface className="space-y-3" variant="inset">
        <p className="text-sm font-semibold text-slate-900">
          {pickLocaleText(locale, {
            en: 'Field access',
            zh_HANS: '字段访问',
            zh_HANT: '欄位存取',
            ja: '項目アクセス',
            ko: '필드 접근',
            fr: 'Acces aux champs',
          })}
        </p>
        <div className="space-y-2">
          {section.fieldDefinitions.map((field) => {
            const entry = readFieldEntry(editorDocument, section.kind, field.fieldKey);
            const provenance = readFieldProvenance(editorDocument, section.kind, field.fieldKey);

            return (
              <div
                key={`${section.kind}-${field.fieldKey}`}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {getPublicPresenceFieldLabel(locale, field.fieldKey)}
                  </p>
                  <PublicPresenceBadge tone="slate" variant="outline">
                    {getPublicPresenceProvenanceLabel(locale, provenance)}
                  </PublicPresenceBadge>
                  {field.sourceOnly ? (
                    <PublicPresenceBadge tone="warning" variant="outline">
                      {pickLocaleText(locale, {
                        en: 'Advanced or source-owned',
                        zh_HANS: '高级或源侧维护',
                        zh_HANT: '進階或來源維護',
                        ja: '詳細またはソース側で管理',
                        ko: '고급 또는 소스 측 관리',
                        fr: 'Avance ou gere par la source',
                      })}
                    </PublicPresenceBadge>
                  ) : null}
                  {!field.visualEditable ? (
                    <PublicPresenceBadge tone="warning" variant="outline">
                      {copy.common.locked}
                    </PublicPresenceBadge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {summarizeInspectValue(locale, entry?.value)}
                </p>
              </div>
            );
          })}
        </div>
      </PublicPresenceSurface>
    );
  };

  const renderStagePanel = () => {
    if (!selectedStageSection || !stagePanel) {
      return null;
    }

    const title = stagePanel.mode === 'edit'
      ? copy.stageSections.editorTitle
      : stagePanel.mode === 'configure'
        ? copy.stageSections.configureTitle
        : copy.stageSections.inspectTitle;

    const sectionIssues = selectedSectionIssues;
    const sectionIssueTone = getIssueTone(sectionIssues);
    const sectionDirty = isStageSectionDirty(
      editorDocument,
      workspace?.draftVersion?.document ?? null,
      selectedStageSection.kind,
    );
    const selectedFieldDefinitions = new Map(
      selectedStageSection.fieldDefinitions.map((definition) => [definition.fieldKey, definition]),
    );
    const canEditSelectedSection =
      selectedStageSection.editabilityState === 'validEditable'
      && selectedStageSection.sourcePolicy === 'registryOwned';
    const countdownPhaseOptions = PUBLIC_PRESENCE_PREVIEW_PHASES
      .filter((value) => value !== 'current' && value !== 'always')
      .map((value) => ({
        label: getPublicPresencePreviewPhaseLabel(locale, value),
        value,
      }));

    return (
      <PublicPresenceSurface
        className="space-y-5 p-0 shadow-none"
        data-testid="stage-section-panel"
        variant="inset"
      >
        <div className="space-y-4 border-b border-slate-200 px-4 pb-4 pt-4">
          <div className="space-y-2 pr-10">
            <div className="flex flex-wrap items-center gap-2">
              <PublicPresenceBadge tone="rose">
                {getPublicPresenceStageSectionLabel(locale, selectedStageSection)}
              </PublicPresenceBadge>
              <PublicPresenceBadge tone={sectionIssueTone} variant="outline">
                {copy.stageSections.issueCountPrefix} {sectionIssues.length}
              </PublicPresenceBadge>
              <PublicPresenceBadge tone="slate" variant="outline">
                {getPublicPresenceEditabilityStateLabel(
                  locale,
                  selectedStageSection.editabilityState,
                )}
              </PublicPresenceBadge>
              {sectionDirty ? (
                <PublicPresenceBadge tone="warning" variant="outline">
                  {copy.common.unsaved}
                </PublicPresenceBadge>
              ) : null}
            </div>
            <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
            <p className="text-sm leading-6 text-slate-600">
              {stagePanel.mode === 'edit'
                ? pickLocaleText(locale, {
                    en: 'Update the fan-facing fields for this section without leaving the live page canvas.',
                    zh_HANS: '直接在这里更新这个分区面向粉丝的字段，无需离开当前页面画布。',
                    zh_HANT: '直接在這裡更新這個分區面向粉絲的欄位，無需離開目前頁面畫布。',
                    ja: '現在のページキャンバスを離れずに、このセクションのファン向け項目を更新します。',
                    ko: '현재 페이지 캔버스를 벗어나지 않고 이 섹션의 팬 대상 필드를 수정합니다.',
                    fr: 'Mettez à jour ici les champs visibles par les fans sans quitter le canvas de la page.',
                  })
                : stagePanel.mode === 'configure'
                  ? pickLocaleText(locale, {
                      en: 'Adjust when this section appears and how it stays available in the page flow.',
                      zh_HANS: '在这里调整这个分区何时出现，以及它如何保持在当前页面流程中。',
                      zh_HANT: '在這裡調整這個分區何時出現，以及它如何保持在目前頁面流程中。',
                      ja: 'このセクションがいつ表示され、ページの流れの中でどう維持されるかをここで調整します。',
                      ko: '이 섹션이 언제 보이고 페이지 흐름에서 어떻게 유지되는지 여기에서 조정합니다.',
                      fr: 'Ajustez ici quand cette section apparaît et comment elle reste disponible dans le parcours de la page.',
                    })
                  : pickLocaleText(locale, {
                      en: 'Review the current status, visibility, and readiness details for this section.',
                      zh_HANS: '在这里查看这个分区当前的状态、可见性和就绪详情。',
                      zh_HANT: '在這裡查看這個分區目前的狀態、可見性與就緒詳情。',
                      ja: 'このセクションの現在の状態、表示条件、準備状況をここで確認します。',
                      ko: '이 섹션의 현재 상태, 표시 여부, 준비 상태를 여기에서 확인합니다.',
                      fr: 'Vérifiez ici l’état actuel, la visibilité et les détails de readiness de cette section.',
                    })}
            </p>
          </div>
          <div
            className="grid grid-cols-3 gap-2"
            role="group"
            aria-label={pickLocaleText(locale, {
              en: 'Section mode',
              zh_HANS: '分区模式',
              zh_HANT: '分區模式',
              ja: 'セクションモード',
              ko: '섹션 모드',
              fr: 'Mode de section',
            })}
          >
            {([
              ['edit', copy.stageSections.editAction],
              ['configure', copy.stageSections.configureAction],
              ['inspect', copy.stageSections.inspectAction],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={stagePanel.mode === mode}
                onClick={() => setStagePanel({ mode, sectionKind: selectedStageSection.kind })}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                  stagePanel.mode === mode
                    ? 'border border-rose-300 bg-rose-50 text-rose-700'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {stagePanel.mode === 'inspect' ? (
          <div className="space-y-4 px-4 pb-4">
            <PublicPresenceSurface className="space-y-3" variant="inset">
              <p className="text-sm font-semibold text-slate-900">
                {pickLocaleText(locale, {
                  en: 'Section status',
                  zh_HANS: '分区状态',
                  zh_HANT: '分區狀態',
                  ja: 'セクション状態',
                  ko: '섹션 상태',
                  fr: 'État de la section',
                })}
              </p>
              <p className="text-sm leading-6 text-slate-600">
                {selectedStageSection.sourcePolicy === 'registryOwned'
                  ? getPublicPresenceStageSectionPurpose(locale, selectedStageSection)
                  : pickLocaleText(locale, {
                      en: 'This section is being kept in its current page setup and is shown here for review only.',
                      zh_HANS: '这个分区会保持当前页面设置中的状态，这里仅供查看。',
                      zh_HANT: '這個分區會保持目前頁面設定中的狀態，這裡僅供查看。',
                      ja: 'このセクションは現在のページ設定のまま維持され、ここでは確認のみ行えます。',
                      ko: '이 섹션은 현재 페이지 설정 상태로 유지되며 여기서는 확인만 할 수 있습니다.',
                      fr: 'Cette section est conservée dans la configuration actuelle de la page et n’est affichée ici qu’à titre de vérification.',
                    })}
              </p>
              {selectedStageSection.sourcePolicy !== 'registryOwned' ? (
                <PublicPresenceBadge tone="warning" variant="outline">
                  {copy.stageSections.sourceOwned}
                </PublicPresenceBadge>
              ) : null}
            </PublicPresenceSurface>
            {renderInspectFieldSummary(selectedStageSection)}
            {sectionIssues.length > 0 ? (
              <PublicPresenceSurface className="space-y-3" variant="inset">
                <p className="text-sm font-semibold text-slate-900">
                  {copy.stageSections.issuePanelTitle}
                </p>
                <div className="space-y-3">
                  {sectionIssues.map((issue) => (
                    <div key={issue.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <PublicPresenceBadge tone={issue.severity === 'fatal' || issue.severity === 'blocker' ? 'error' : issue.severity === 'warning' ? 'warning' : 'info'}>
                          {copy.stageSections.issueSeverityPrefix}: {issue.severity}
                        </PublicPresenceBadge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {copy.stageSections.issueSummaryPrefix}:{' '}
                        {getIssueSummaryCopy(locale, issue)}
                      </p>
                    </div>
                  ))}
                </div>
              </PublicPresenceSurface>
            ) : null}
          </div>
        ) : null}

        {stagePanel.mode === 'configure' ? (
          <div className="space-y-4 px-4 pb-4">
            {selectedStageSection.kind === 'countdownReveal' ? (
              <>
                <ControlledSelect
                  disabled={!resolveFieldEditability(selectedFieldDefinitions.get('phase'), canEditSelectedSection)}
                  label={getPublicPresenceFieldLabel(locale, 'phase')}
                  onChange={(value) => setFieldValue(selectedStageSection.kind, 'phase', value)}
                  options={countdownPhaseOptions}
                  value={String(readFieldValue(editorDocument, selectedStageSection.kind, 'phase') || 'countdown')}
                />
                <ControlledTextInput
                  disabled={!resolveFieldEditability(selectedFieldDefinitions.get('revealAtUtc'), canEditSelectedSection)}
                  label={getPublicPresenceFieldLabel(locale, 'revealAtUtc')}
                  onChange={(value) => setFieldValue(selectedStageSection.kind, 'revealAtUtc', value)}
                  placeholder={copy.stageSections.revealTimeExample}
                  value={String(readFieldValue(editorDocument, selectedStageSection.kind, 'revealAtUtc') ?? '')}
                />
                <ControlledTextInput
                  disabled={!resolveFieldEditability(selectedFieldDefinitions.get('timezone'), canEditSelectedSection)}
                  label={getPublicPresenceFieldLabel(locale, 'timezone')}
                  onChange={(value) => setFieldValue(selectedStageSection.kind, 'timezone', value)}
                  placeholder={copy.stageSections.timezoneExample}
                  value={String(readFieldValue(editorDocument, selectedStageSection.kind, 'timezone') ?? '')}
                />
              </>
            ) : null}
            <ControlledSelect
              disabled={selectedStageSection.phaseVisibility.length <= 1}
              label={copy.stageSections.phasePrefix}
              onChange={(value) => {
                if (!editorDocument || !selectedStageSectionDocument) {
                  return;
                }

                updateDocument({
                  ...editorDocument,
                  sections: editorDocument.sections.map((entry) => (
                    entry.kind === selectedStageSection.kind
                      ? {
                          ...entry,
                          phaseVisibility: value as PublicPresencePhaseVisibility,
                        }
                      : entry
                  )),
                });
              }}
              options={selectedStageSection.phaseVisibility.map((phase) => ({
                label: getPublicPresencePreviewPhaseLabel(
                  locale,
                  phase as PublicPresencePhaseVisibility,
                ),
                value: phase,
              }))}
              value={
                selectedStageSectionDocument?.phaseVisibility
                ?? (selectedStageSection.phaseVisibility[0] as PublicPresencePhaseVisibility | undefined)
                ?? 'always'
              }
            />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              {pickLocaleText(locale, {
                en: 'This page keeps the section order steady. Use these settings only to control when the section appears.',
                zh_HANS: '这个页面会保持分区顺序稳定。这里的设置只用于控制这个分区何时出现。',
                zh_HANT: '這個頁面會保持分區順序穩定。這裡的設定只用於控制這個分區何時出現。',
                ja: 'このページではセクション順序を固定します。ここでは表示タイミングだけを調整してください。',
                ko: '이 페이지는 섹션 순서를 고정합니다. 여기에서는 이 섹션이 언제 보일지만 조정하세요.',
                fr: 'Cette page garde l’ordre des sections stable. Utilisez ces réglages uniquement pour contrôler quand la section apparaît.',
              })}
            </div>
          </div>
        ) : null}

        {stagePanel.mode === 'edit' ? (
          <div className="px-4 pb-4">
            {renderStructuredSectionEditor(selectedStageSection)}
          </div>
        ) : null}
      </PublicPresenceSurface>
    );
  };

  const renderReleaseQueue = () => (
    <div className="space-y-4">
      <PublicPresenceSurface className="space-y-4" variant="inset">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-950">
            {copy.reviewPublish.readinessTitle}
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            {copy.reviewPublish.readinessDescription}
          </p>
        </div>
        {visualDraftDirty ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {copy.reviewPublish.unsavedChangesHint}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {([
            [copy.reviewPublish.fatalLabel, currentReleaseIssueCounts.fatal, 'error'],
            [copy.reviewPublish.blockerLabel, currentReleaseIssueCounts.blocker, 'error'],
            [copy.reviewPublish.warningLabel, currentReleaseIssueCounts.warning, 'warning'],
            [copy.reviewPublish.infoLabel, currentReleaseIssueCounts.info, 'info'],
          ] as const).map(([label, count, tone]) => (
            <div
              key={label}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <PublicPresenceBadge tone={tone} variant="outline">
                {label}
              </PublicPresenceBadge>
              <span className="font-semibold text-slate-950">{count}</span>
            </div>
          ))}
        </div>
        {currentReleaseIssues.length ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {pickLocaleText(locale, {
                en: 'Open checks',
                zh_HANS: '当前检查项',
                zh_HANT: '目前檢查項',
                ja: '現在の確認項目',
                ko: '현재 확인 항목',
                fr: 'Vérifications ouvertes',
              })}
            </p>
            <div className="space-y-2">
              {currentReleaseIssues.map((issue) => {
                const dependency = blockedReleaseDependencyById.get(issue.id);

                return (
                  <div
                    key={issue.id}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <PublicPresenceBadge
                        tone={
                          issue.severity === 'fatal' || issue.severity === 'blocker'
                            ? 'error'
                            : issue.severity === 'warning'
                              ? 'warning'
                              : 'info'
                        }
                        variant="outline"
                      >
                        {issue.severity}
                      </PublicPresenceBadge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {getIssueSummaryCopy(locale, issue)}
                    </p>
                    {dependency ? (
                      <button
                        type="button"
                        onClick={() => {
                          void handleResolveReleaseDependency(dependency);
                        }}
                        className="mt-3 inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                      >
                        {getReleaseDependencyActionLabel(locale, dependency.nextAction)}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm leading-6 text-slate-600">{copy.reviewPublish.noIssues}</p>
        )}
      </PublicPresenceSurface>

      <PublicPresenceSurface className="space-y-4" variant="inset">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-950">
            {copy.reviewPublish.actionsTitle}
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            {copy.reviewPublish.actionsDescription}
          </p>
        </div>
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => {
              if (!workspace) {
                return;
              }

              void runWorkflowAction(
                'submit',
                copy.notices.submitSuccess,
                () =>
                  submitPublicPresenceForReview(
                    request,
                    talentId,
                    currentDraftHash,
                    workspace.selectedTemplateId,
                  ),
              );
            }}
            disabled={isWorkflowActionDisabled || !['draft', 'changesRequested'].includes(currentDocumentState)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {workflowAction === 'submit'
              ? copy.reviewPublish.submitPending
              : copy.reviewPublish.submit}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!workspace) {
                return;
              }

              void runWorkflowAction(
                'approve',
                copy.notices.approveSuccess,
                () =>
                  approvePublicPresenceReview(
                    request,
                    talentId,
                    currentDraftHash,
                    workspace.selectedTemplateId,
                  ),
              );
            }}
            disabled={
              isWorkflowActionDisabled
              || hasBlockingReleaseIssues
              || !['inReview', 'changesRequested'].includes(currentDocumentState)
            }
            className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {workflowAction === 'approve'
              ? copy.reviewPublish.approvePending
              : copy.reviewPublish.approve}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!workspace) {
                return;
              }

              void runWorkflowAction(
                'publish',
                copy.notices.publishSuccess,
                () => runDirectPublishPath(),
              );
            }}
            disabled={isWorkflowActionDisabled || hasBlockingReleaseIssues || !canRunDirectPublishPath}
            className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {workflowAction === 'publish'
              ? copy.reviewPublish.publishPending
              : copy.reviewPublish.publishNow}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!workspace) {
                return;
              }

              void runWorkflowAction(
                'requestChanges',
                copy.notices.requestChangesSuccess,
                () =>
                  requestPublicPresenceChanges(
                    request,
                    talentId,
                    {
                      comment: reviewComment || null,
                      expectedCurrentContentHash: currentDraftHash,
                      templateId: workspace.selectedTemplateId,
                    },
                  ),
              );
            }}
            disabled={isWorkflowActionDisabled || !['inReview', 'approved', 'scheduled'].includes(currentDocumentState)}
            className="rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {workflowAction === 'requestChanges'
              ? copy.reviewPublish.requestChangesPending
              : copy.reviewPublish.requestChanges}
          </button>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-900">
            {copy.reviewPublish.reviewNote}
          </span>
          <textarea
            value={reviewComment}
            onChange={(event) => setReviewComment(event.target.value)}
            className="min-h-24 w-full rounded-3xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-200"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-900">
            {copy.reviewPublish.scheduleField}
          </span>
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(event) => setScheduledFor(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-200"
          />
        </label>
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => {
              if (!workspace) {
                return;
              }

              if (!scheduledFor) {
                setNotice({
                  message: copy.reviewPublish.chooseFutureTimeError,
                  tone: 'error',
                });
                return;
              }

              void runWorkflowAction(
                'schedule',
                copy.notices.scheduleSuccess,
                () =>
                  schedulePublicPresencePublish(
                    request,
                    talentId,
                    {
                      expectedCurrentContentHash: currentDraftHash,
                      scheduledFor: new Date(scheduledFor).toISOString(),
                      templateId: workspace.selectedTemplateId,
                    },
                  ),
              );
            }}
            disabled={
              isWorkflowActionDisabled
              || hasBlockingReleaseIssues
              || !['approved', 'scheduled'].includes(currentDocumentState)
            }
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {workflowAction === 'schedule'
              ? copy.reviewPublish.schedulePending
              : copy.reviewPublish.schedulePublish}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!workspace) {
                return;
              }

              void runWorkflowAction(
                'cancelSchedule',
                copy.notices.cancelScheduleSuccess,
                () =>
                  cancelPublicPresenceSchedule(
                    request,
                    talentId,
                    currentDraftHash,
                    workspace.selectedTemplateId,
                  ),
              );
            }}
            disabled={isWorkflowActionDisabled || currentDocumentState !== 'scheduled'}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {workflowAction === 'cancelSchedule'
              ? copy.reviewPublish.cancelSchedulePending
              : copy.reviewPublish.cancelSchedule}
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
          <p className="text-sm font-semibold text-slate-900">
            {copy.reviewPublish.rollbackTitle}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {copy.reviewPublish.rollbackDescription}
          </p>
          <button
            type="button"
            onClick={() => {
              if (!workspace) {
                return;
              }

              void runWorkflowAction(
                'rollback',
                copy.notices.rollbackSuccess,
                () =>
                  createPublicPresenceRollbackDraft(
                    request,
                    talentId,
                    workspace.selectedTemplateId,
                  ),
              );
            }}
            disabled={workflowAction !== null || !workspace?.liveVersion}
            className="mt-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {workflowAction === 'rollback'
              ? copy.reviewPublish.rollbackPending
              : copy.reviewPublish.rollback}
          </button>
        </div>
      </PublicPresenceSurface>

      <PublicPresenceSurface className="space-y-4" variant="inset">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">
            {pickLocaleText(locale, {
              en: 'Recent activity',
              zh_HANS: '最近活动',
              zh_HANT: '最近活動',
              ja: '最近の動き',
              ko: '최근 활동',
              fr: 'Activité récente',
            })}
          </h2>
          <button
            type="button"
            onClick={() => setShowReviewHistory((current) => !current)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {copy.reviewPublish.reviewHistoryToggle}
          </button>
        </div>
        {showReviewHistory ? (
          workspace?.workflowEvents.length ? (
            <div className="grid gap-3">
              {workspace.workflowEvents.map((event) => (
                <PublicPresenceSurface key={event.id} className="space-y-2" variant="inset">
                  <div className="flex flex-wrap items-center gap-2">
                    <PublicPresenceBadge tone="slate">
                      {getPublicPresenceWorkflowEventLabel(locale, event.eventType)}
                    </PublicPresenceBadge>
                    {event.toDocumentState ? (
                      <PublicPresenceBadge tone="slate" variant="outline">
                        {getPublicPresenceDocumentStateLabel(
                          locale,
                          event.fromDocumentState ?? copy.reviewPublish.transitionFallback,
                        )}{' '}
                        {'->'}{' '}
                        {getPublicPresenceDocumentStateLabel(
                          locale,
                          event.toDocumentState,
                        )}
                      </PublicPresenceBadge>
                    ) : null}
                    <PublicPresenceBadge tone="slate" variant="outline">
                      {formatDateTime(locale, event.occurredAt)}
                    </PublicPresenceBadge>
                  </div>
                </PublicPresenceSurface>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-600">
              {copy.reviewPublish.workflowEventsEmpty}
            </p>
          )
        ) : (
          <p className="text-sm leading-6 text-slate-600">
            {pickLocaleText(locale, {
              en: 'Open the recent activity list when you need a quick release timeline without leaving the workbench.',
              zh_HANS: '如果你需要快速查看发布时间线，可以在这里展开最近活动，而不必离开当前工作面。',
              zh_HANT: '如果你需要快速查看發佈時間線，可以在這裡展開最近活動，而不必離開目前工作面。',
              ja: '公開までの流れをすばやく確認したいときは、ここから最近の動きを開いてください。',
              ko: '공개 흐름을 빠르게 확인해야 할 때 여기에서 최근 활동을 열어 보세요.',
              fr: 'Ouvrez ici l’activité récente quand vous avez besoin d’un aperçu rapide de la chronologie de publication sans quitter le workbench.',
            })}
          </p>
        )}
      </PublicPresenceSurface>
    </div>
  );

  const renderLeftDrawer = () => {
    if (leftDrawerMode === 'release') {
      return renderReleaseQueue();
    }

    if (leftDrawerMode === 'persona') {
      return (
        <PublicPresenceSurface className="space-y-4" variant="inset">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">
              {copy.personaKit.title}
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              {copy.personaKit.description}
            </p>
          </div>
          <ControlledTextInput
            label={copy.personaKit.accentTone}
            onChange={(value) => {
              if (!editorDocument) {
                return;
              }

              updateDocument({
                ...editorDocument,
                personaKit: {
                  ...(editorDocument.personaKit ?? {}),
                  accentTone: value,
                },
              });
            }}
            value={editorDocument?.personaKit?.accentTone ?? ''}
          />
          <ControlledTextInput
            label={copy.personaKit.campaignLabel}
            onChange={(value) => {
              if (!editorDocument) {
                return;
              }

              updateDocument({
                ...editorDocument,
                personaKit: {
                  ...(editorDocument.personaKit ?? {}),
                  campaignLabel: value,
                },
              });
            }}
            value={editorDocument?.personaKit?.campaignLabel ?? ''}
          />
          <ControlledTextArea
            label={copy.personaKit.tagline}
            onChange={(value) => {
              if (!editorDocument) {
                return;
              }

              updateDocument({
                ...editorDocument,
                personaKit: {
                  ...(editorDocument.personaKit ?? {}),
                  tagline: value,
                },
              });
            }}
            value={editorDocument?.personaKit?.tagline ?? ''}
          />
        </PublicPresenceSurface>
      );
    }

    return (
      <div className="space-y-4">
        <PublicPresenceSurface className="space-y-4" variant="inset">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">
              {copy.stageSections.title}
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              {pickLocaleText(locale, {
                en: 'Select one section from the page flow, then edit it in the inspector without losing the live preview.',
                zh_HANS: '先从页面流程中选中一个分区，再在右侧检查器里编辑，同时保留实时预览。',
                zh_HANT: '先從頁面流程中選取一個分區，再在右側檢查器裡編輯，同時保留即時預覽。',
                ja: 'ページの流れからセクションを 1 つ選び、ライブプレビューを保ったまま右側インスペクターで編集します。',
                ko: '페이지 흐름에서 섹션 하나를 고른 뒤, 라이브 미리보기를 유지한 채 오른쪽 인스펙터에서 편집하세요.',
                fr: 'Sélectionnez une section dans le flux de page, puis modifiez-la dans l’inspecteur sans perdre l’aperçu en direct.',
              })}
            </p>
          </div>
          <div className="space-y-2" data-testid="stage-sections-list">
            {orderedSections.map((section) => {
              const sectionDocument = getCurrentSectionDocument(editorDocument, section.kind);
              const issues = collectIssuesForSection(
                currentSnapshot,
                section.kind,
                sectionDocument?.id ?? null,
              );
              const summaryValue = buildStageSectionSummary(editorDocument, section);
              const sectionDirty = isStageSectionDirty(
                editorDocument,
                workspace?.draftVersion?.document ?? null,
                section.kind,
              );

              return (
                <StudioSectionRow
                  key={section.kind}
                  copy={copy}
                  dirty={sectionDirty}
                  hasDraftSection={Boolean(sectionDocument)}
                  isSelected={stagePanel?.sectionKind === section.kind}
                  issueCount={issues.length}
                  locale={locale}
                  onSelect={() => {
                    rightDrawerOverlay.registerTrigger(document.activeElement);
                    openStageWorkbenchPanel({ mode: 'edit', sectionKind: section.kind });
                  }}
                  section={section}
                  summary={summaryValue}
                />
              );
            })}
          </div>
        </PublicPresenceSurface>
      </div>
    );
  };

  const currentValidationSummary = formatPublicPresenceStudioValidationSummary(
    locale,
    currentReleaseIssueCounts,
  );
  const showLeftDrawer = !previewFocus && leftDrawerOpen && !stagePanel;
  const showRightDrawer = !previewFocus && Boolean(stagePanel);
  const leftDrawerOverlay = useOverlayFocusManager({
    desktopBreakpoint: 1280,
    onClose: () => setLeftDrawerOpen(false),
    open: showLeftDrawer,
  });
  const mobileManageOverlay = useOverlayFocusManager({
    onClose: closeMobileWorkbenchSheets,
    open: mobileManageOpen,
  });
  const mobilePreviewToolsOverlay = useOverlayFocusManager({
    onClose: closeMobileWorkbenchSheets,
    open: mobilePreviewToolsOpen,
  });
  const rightDrawerOverlay = useOverlayFocusManager({
    desktopBreakpoint: 1280,
    onClose: closeStageWorkbenchPanel,
    open: showRightDrawer,
  });
  const leftDrawerContent = showLeftDrawer ? renderLeftDrawer() : null;
  const rightDrawerContent = showRightDrawer ? renderStagePanel() : null;
  const leftDrawerLabel = leftDrawerMode === 'sections'
    ? pickLocaleText(locale, {
        en: 'Stage sections panel',
        zh_HANS: '舞台分区面板',
        zh_HANT: '舞台分區面板',
        ja: 'ステージセクションパネル',
        ko: '스테이지 섹션 패널',
        fr: 'Panneau sections de scene',
      })
    : leftDrawerMode === 'persona'
      ? pickLocaleText(locale, {
          en: 'Persona Kit panel',
          zh_HANS: '人设工具面板',
          zh_HANT: '人設工具面板',
          ja: 'ペルソナキットパネル',
          ko: '페르소나 킷 패널',
          fr: 'Panneau kit persona',
        })
      : leftDrawerMode === 'release'
        ? pickLocaleText(locale, {
            en: 'Readiness queue panel',
            zh_HANS: '就绪队列面板',
            zh_HANT: '就緒佇列面板',
            ja: '準備キューパネル',
            ko: '준비 큐 패널',
            fr: 'Panneau file de readiness',
          })
        : pickLocaleText(locale, {
            en: 'Stage sections panel',
            zh_HANS: '舞台分区面板',
            zh_HANT: '舞台分區面板',
            ja: 'ステージセクションパネル',
            ko: '스테이지 섹션 패널',
            fr: 'Panneau sections de scene',
          });
  const rightDrawerLabel = stagePanel?.mode === 'edit'
    ? pickLocaleText(locale, {
        en: 'Edit section panel',
        zh_HANS: '编辑分区面板',
        zh_HANT: '編輯分區面板',
        ja: 'セクション編集パネル',
        ko: '섹션 편집 패널',
        fr: 'Panneau edition de section',
      })
    : stagePanel?.mode === 'configure'
      ? pickLocaleText(locale, {
          en: 'Configure section panel',
          zh_HANS: '配置分区面板',
          zh_HANT: '配置分區面板',
          ja: 'セクション設定パネル',
          ko: '섹션 구성 패널',
          fr: 'Panneau configuration de section',
        })
      : pickLocaleText(locale, {
          en: 'Inspect section panel',
          zh_HANS: '查看分区面板',
          zh_HANT: '查看分區面板',
          ja: 'セクション確認パネル',
          ko: '섹션 검사 패널',
          fr: 'Panneau inspection de section',
        });
  const drawerCloseLabel = pickLocaleText(locale, {
    en: 'Close panel',
    zh_HANS: '关闭面板',
    zh_HANT: '關閉面板',
    ja: 'パネルを閉じる',
    ko: '패널 닫기',
    fr: 'Fermer le panneau',
  });
  const workbenchGridClass = previewFocus
    ? 'xl:grid-cols-[minmax(0,1fr)]'
    : showLeftDrawer && showRightDrawer
      ? 'xl:grid-cols-[3.5rem_20rem_minmax(0,1fr)_24rem]'
      : showLeftDrawer
        ? 'xl:grid-cols-[3.5rem_20rem_minmax(0,1fr)]'
        : showRightDrawer
          ? 'xl:grid-cols-[3.5rem_minmax(0,1fr)_24rem]'
          : 'xl:grid-cols-[3.5rem_minmax(0,1fr)]';
  const effectiveStagePanel = stagePanel
    ?? (
      queryState.stagePanel
      && orderedSections.some((section) => section.kind === queryState.stagePanel?.sectionKind)
        ? queryState.stagePanel
        : null
    );

  useLayoutEffect(() => {
    if (!workspace?.draftVersion || !editorDocument) {
      return;
    }

    const syncedLeftPanel = leftDrawerOpen && (isDesktopWorkbench || !effectiveStagePanel)
      ? leftDrawerMode
      : null;

    const nextSearch = mergeUrlSearchParams(searchParams, {
      focus: null,
      leftPanel: syncedLeftPanel,
      phase: previewPhase === 'current' ? null : previewPhase,
      previewFocus: previewFocus ? '1' : null,
      sheet: mobileManageOpen
        ? 'manage'
        : mobilePreviewToolsOpen
          ? 'preview-tools'
          : null,
      stagePanel: serializeStagePanelSearchParam(effectiveStagePanel),
      templateId: persistTemplateQuery ? selectedTemplateId : null,
      viewport: previewViewport === 'desktop' ? null : previewViewport,
    }).toString();

    if (nextSearch === searchKey) {
      return;
    }

    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, {
      scroll: false,
    });
  }, [
    editorDocument,
    effectiveStagePanel,
    leftDrawerMode,
    leftDrawerOpen,
    isDesktopWorkbench,
    mobileManageOpen,
    mobilePreviewToolsOpen,
    pathname,
    previewFocus,
    previewPhase,
    previewViewport,
    router,
    searchKey,
    searchParams,
    selectedTemplateId,
    persistTemplateQuery,
    workspace?.draftVersion,
  ]);

  if (loading) {
    return (
      <PublicPresenceShell decorationDensity="calm" width="xl">
        <PublicPresenceStateView
          description={copy.state.loadingDescription}
          icon={<RefreshCcw className="animate-spin" />}
          title={copy.state.loadingTitle}
          tone="info"
        />
      </PublicPresenceShell>
    );
  }

  if (error) {
    return (
      <PublicPresenceShell decorationDensity="calm" width="xl">
        <PublicPresenceStateView
          description={error}
          title={copy.state.unavailableTitle}
          tone="error"
        />
      </PublicPresenceShell>
    );
  }

  if (!workspace) {
    return null;
  }

  if (!workspace.draftVersion || !editorDocument) {
    return (
      <PublicPresenceShell decorationDensity="calm" width="xl">
        <EmptyWorkspaceState
          copy={copy}
          locale={locale}
          onBootstrap={(templateId) => {
            void handleBootstrap(templateId);
          }}
          pendingTemplateId={pendingTemplateId}
          templates={workspace.templates}
        />
      </PublicPresenceShell>
    );
  }

  return (
    <PublicPresenceShell
      className="px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-3"
      contentClassName="max-w-none"
      decorationDensity="calm"
    >
      <div className="space-y-2">
        <PublicPresenceSurface
          className="sticky top-2 z-20 px-3 py-1.5 sm:px-3 sm:py-1.5 lg:px-3 lg:py-1.5 shadow-sm backdrop-blur"
          data-testid="studio-topbar"
        >
          <div className="flex items-center justify-between gap-2 xl:hidden">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              <div className="min-w-0">
                <PublicPresenceBadge icon={<Sparkles />} tone="rose">
                  {copy.header.badge}
                </PublicPresenceBadge>
              </div>
              <PublicPresenceBadge
                tone={visualDraftDirty ? 'warning' : 'success'}
                variant="outline"
              >
                {visualDraftDirty ? copy.common.unsaved : copy.common.saved}
              </PublicPresenceBadge>
            </div>
            <button
              type="button"
              data-testid="studio-mobile-manage-button"
              aria-controls={mobileManageSheetId}
              aria-expanded={mobileManageOpen}
              aria-haspopup="dialog"
              ref={mobileManageOverlay.fallbackTriggerRef}
              onClick={(event) => {
                mobileManageOverlay.registerTrigger(event.currentTarget);
                openExclusiveMobileManageSheet();
              }}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {pickLocaleText(locale, {
                en: 'Manage',
                zh_HANS: '管理',
                zh_HANT: '管理',
                ja: '管理',
                ko: '관리',
                fr: 'Gérer',
              })}
            </button>
          </div>

          <div className="hidden items-center justify-between gap-3 xl:flex">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <PublicPresenceBadge icon={<Sparkles />} tone="rose">
                {copy.header.badge}
              </PublicPresenceBadge>
              <PublicPresenceBadge tone={getValidationToneFromCounts(currentReleaseIssueCounts)} variant="outline">
                {currentValidationSummary}
              </PublicPresenceBadge>
              <PublicPresenceBadge className="hidden min-[1400px]:inline-flex" tone="slate" variant="outline">
                {currentTemplate
                  ? getPublicPresenceTemplateLabel(locale, currentTemplate)
                  : selectedTemplateId}
              </PublicPresenceBadge>
              <PublicPresenceBadge
                className="hidden min-[1400px]:inline-flex"
                tone={visualDraftDirty ? 'warning' : 'success'}
                variant="outline"
              >
                {visualDraftDirty ? copy.common.unsaved : copy.common.saved}
              </PublicPresenceBadge>
              <Link
                href={managementHref}
                aria-label={getHomepageSurfaceActionLabel(locale, 'homepageMenu')}
                title={getHomepageSurfaceActionLabel(locale, 'homepageMenu')}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 min-[1400px]:h-auto min-[1400px]:w-auto min-[1400px]:gap-2 min-[1400px]:px-3 min-[1400px]:py-2"
              >
                <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                <span className="hidden min-[1400px]:inline">
                  {getHomepageSurfaceActionLabel(locale, 'homepageMenu')}
                </span>
              </Link>
              <Link
                href={templateCenterHref}
                aria-label={getHomepageSurfaceLabel(locale, 'templates')}
                title={getHomepageSurfaceLabel(locale, 'templates')}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 min-[1400px]:h-auto min-[1400px]:w-auto min-[1400px]:gap-2 min-[1400px]:px-3 min-[1400px]:py-2"
              >
                <Layers3 className="h-4 w-4" aria-hidden="true" />
                <span className="hidden min-[1400px]:inline">
                  {getHomepageSurfaceLabel(locale, 'templates')}
                </span>
              </Link>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => openWorkbenchDrawer('release')}
                aria-label={pickLocaleText(locale, {
                  en: 'Open readiness panel',
                  zh_HANS: '打开就绪面板',
                  zh_HANT: '打開就緒面板',
                  ja: '準備パネルを開く',
                  ko: '준비 패널 열기',
                  fr: 'Ouvrir le panneau readiness',
                })}
                title={copy.reviewPublish.readinessTitle}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 min-[1400px]:h-auto min-[1400px]:w-auto min-[1400px]:gap-2 min-[1400px]:px-3 min-[1400px]:py-2"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span className="hidden min-[1400px]:inline">
                  {copy.reviewPublish.readinessTitle}
                </span>
              </button>
              <Link
                href={previewHref}
                aria-label={pickLocaleText(locale, {
                  en: 'Open preview',
                  zh_HANS: '打开预览',
                  zh_HANT: '打開預覽',
                  ja: 'プレビューを開く',
                  ko: '미리보기 열기',
                  fr: 'Ouvrir l’aperçu',
                })}
                title={pickLocaleText(locale, {
                  en: 'Open preview',
                  zh_HANS: '打开预览',
                  zh_HANT: '打開預覽',
                  ja: 'プレビューを開く',
                  ko: '미리보기 열기',
                  fr: 'Ouvrir l’aperçu',
                })}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-white text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 min-[1400px]:h-auto min-[1400px]:w-auto min-[1400px]:gap-2 min-[1400px]:px-3 min-[1400px]:py-2"
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                <span className="hidden min-[1400px]:inline">
                  {pickLocaleText(locale, {
                    en: 'Open preview',
                    zh_HANS: '打开预览',
                    zh_HANT: '打開預覽',
                    ja: 'プレビューを開く',
                    ko: '미리보기 열기',
                    fr: 'Ouvrir l’aperçu',
                  })}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  void handleSaveVisualDocument();
                }}
                disabled={saving || !visualDraftDirty}
                aria-label={pickLocaleText(locale, {
                  en: 'Save draft',
                  zh_HANS: '保存草稿',
                  zh_HANT: '儲存草稿',
                  ja: 'ドラフト保存',
                  ko: '드래프트 저장',
                  fr: 'Enregistrer le brouillon',
                })}
                title={pickLocaleText(locale, {
                  en: 'Save draft',
                  zh_HANS: '保存草稿',
                  zh_HANT: '儲存草稿',
                  ja: 'ドラフト保存',
                  ko: '드래프트 저장',
                  fr: 'Enregistrer le brouillon',
                })}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-white text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 min-[1400px]:h-auto min-[1400px]:w-auto min-[1400px]:gap-2 min-[1400px]:px-3 min-[1400px]:py-2"
              >
                {saving ? (
                  <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="hidden min-[1400px]:inline">
                  {pickLocaleText(locale, {
                    en: 'Save draft',
                    zh_HANS: '保存草稿',
                    zh_HANT: '儲存草稿',
                    ja: 'ドラフト保存',
                    ko: '드래프트 저장',
                    fr: 'Enregistrer le brouillon',
                  })}
                </span>
              </button>
            </div>
          </div>
        </PublicPresenceSurface>

        {mobileManageOpen ? (
          <PublicPresenceSurface
            aria-label={pickLocaleText(locale, {
              en: 'Studio destinations sheet',
              zh_HANS: 'Studio 入口抽屉',
              zh_HANT: 'Studio 入口抽屜',
              ja: 'Studio 移動シート',
              ko: 'Studio 이동 시트',
              fr: 'Feuille destinations studio',
            })}
            aria-modal
            className="!fixed inset-x-3 bottom-3 z-40 max-h-[72vh] overflow-auto rounded-[2rem] border border-slate-200/90 bg-white/97 p-4 shadow-xl xl:hidden"
            data-testid="studio-mobile-manage-sheet"
            id={mobileManageSheetId}
            role="dialog"
            variant="inset"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-slate-950">
                  {pickLocaleText(locale, {
                    en: 'Studio destinations',
                    zh_HANS: 'Studio 入口',
                    zh_HANT: 'Studio 入口',
                    ja: 'Studio 移動先',
                    ko: 'Studio 이동',
                    fr: 'Destinations studio',
                  })}
                </h2>
                <p className="text-sm text-slate-600">
                  {pickLocaleText(locale, {
                    en: 'Open management, templates, or preview from one place.',
                    zh_HANS: '在这里统一打开管理页、模板中心或预览。',
                    zh_HANT: '在這裡統一打開管理頁、模板中心或預覽。',
                    ja: 'ここから管理、テンプレート、プレビューをまとめて開きます。',
                    ko: '여기에서 관리, 템플릿, 미리보기를 한 번에 엽니다.',
                    fr: 'Ouvrez ici la gestion, les templates ou l’aperçu depuis un seul endroit.',
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={closeMobileWorkbenchSheets}
                ref={mobileManageOverlay.mobileInitialFocusRef}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                {pickLocaleText(locale, {
                  en: 'Close',
                  zh_HANS: '关闭',
                  zh_HANT: '關閉',
                  ja: '閉じる',
                  ko: '닫기',
                  fr: 'Fermer',
                })}
              </button>
            </div>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => {
                  void handleSaveVisualDocument();
                }}
                disabled={saving || !visualDraftDirty}
                className="inline-flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{pickLocaleText(locale, {
                  en: 'Save draft',
                  zh_HANS: '保存草稿',
                  zh_HANT: '儲存草稿',
                  ja: 'ドラフト保存',
                  ko: '드래프트 저장',
                  fr: 'Enregistrer le brouillon',
                })}</span>
                {saving ? (
                  <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={() => openWorkbenchDrawer('release')}
                className="inline-flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span>{copy.reviewPublish.readinessTitle}</span>
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-controls={mobilePreviewToolsSheetId}
                aria-expanded={mobilePreviewToolsOpen}
                aria-haspopup="dialog"
                onClick={(event) => {
                  mobilePreviewToolsOverlay.registerTrigger(event.currentTarget);
                  openExclusiveMobilePreviewToolsSheet();
                }}
                className="inline-flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
              >
                <span>{pickLocaleText(locale, {
                  en: 'Preview tools',
                  zh_HANS: '预览工具',
                  zh_HANT: '預覽工具',
                  ja: 'プレビュー操作',
                  ko: '미리보기 도구',
                  fr: 'Outils aperçu',
                })}</span>
                <Settings2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <Link
                href={managementHref}
                className="inline-flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span>{getHomepageSurfaceActionLabel(locale, 'homepageMenu')}</span>
                <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href={templateCenterHref}
                className="inline-flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span>{getHomepageSurfaceLabel(locale, 'templates')}</span>
                <Layers3 className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href={advancedIdeHref}
                className="inline-flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span>{copy.advanced.title}</span>
                <FileCode2 className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href={previewHref}
                className="inline-flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
              >
                <span>{pickLocaleText(locale, {
                  en: 'Open preview',
                  zh_HANS: '打开预览',
                  zh_HANT: '打開預覽',
                  ja: 'プレビューを開く',
                  ko: '미리보기 열기',
                  fr: 'Ouvrir l’aperçu',
                })}</span>
                <Eye className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </PublicPresenceSurface>
        ) : null}

        {notice ? (
          <NoticeToast
            message={notice.message}
            onDismiss={() => setNotice(null)}
            tone={notice.tone}
          />
        ) : null}

        <div className={`grid min-h-[calc(100vh-4.75rem)] gap-2 ${workbenchGridClass}`}>
          {!previewFocus ? (
            <PublicPresenceSurface
              className="!fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 flex-row items-center gap-2 rounded-full border border-slate-200/90 bg-white/97 px-2 py-2 shadow-lg backdrop-blur md:!static md:bottom-auto md:left-auto md:z-auto md:h-full md:translate-x-0 md:flex-col md:rounded-[2rem] md:border-transparent md:bg-white md:px-2 md:py-3 md:shadow-none md:backdrop-blur-0"
              data-testid="left-rail"
              variant="inset"
            >
              {([
                ['sections', <Layers3 key="sections" className="h-4 w-4" aria-hidden="true" />, pickLocaleText(locale, {
                  en: 'Stage Sections',
                  zh_HANS: '舞台分区',
                  zh_HANT: '舞台分區',
                  ja: 'ステージセクション',
                  ko: '스테이지 섹션',
                  fr: 'Sections de scène',
                })],
                ['persona', <Sparkles key="persona" className="h-4 w-4" aria-hidden="true" />, copy.personaKit.title],
                ['release', <ShieldCheck key="release" className="h-4 w-4" aria-hidden="true" />, copy.reviewPublish.readinessTitle],
              ] as const).map(([mode, icon, label]) => {
                const isActive = leftDrawerOpen && leftDrawerMode === mode;

                return (
                  <button
                    key={mode}
                    type="button"
                    aria-controls={leftDrawerId}
                    aria-expanded={isActive}
                    aria-label={label}
                    aria-pressed={isActive}
                    ref={isActive ? leftDrawerOverlay.fallbackTriggerRef : undefined}
                    onClick={(event) => {
                      leftDrawerOverlay.registerTrigger(event.currentTarget);
                      if (isActive) {
                        setLeftDrawerOpen(false);
                        return;
                      }

                      openWorkbenchDrawer(mode);
                    }}
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                      isActive
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                    title={label}
                  >
                    {icon}
                  </button>
                );
              })}
              <Link
                href={advancedIdeHref}
                aria-label={copy.advanced.title}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                title={copy.advanced.title}
              >
                <FileCode2 className="h-4 w-4" aria-hidden="true" />
              </Link>
            </PublicPresenceSurface>
          ) : null}

          {showLeftDrawer ? (
            <div className="contents">
              {isDesktopWorkbench ? (
                <div
                  aria-label={leftDrawerLabel}
                  className="hidden min-h-0 overflow-hidden xl:block"
                  data-testid="studio-left-drawer-desktop"
                  id={leftDrawerId}
                  role="region"
                >
                  <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                    <button
                      type="button"
                      aria-label={drawerCloseLabel}
                      onClick={() => setLeftDrawerOpen(false)}
                      ref={leftDrawerOverlay.desktopInitialFocusRef}
                      className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <div className="h-full overflow-auto p-3">{leftDrawerContent}</div>
                  </div>
                </div>
              ) : (
                <div
                  aria-label={leftDrawerLabel}
                  aria-modal
                  className="xl:hidden fixed inset-x-3 bottom-20 z-40 max-h-[72vh] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)] ring-1 ring-white/90"
                  id={leftDrawerId}
                  role="dialog"
                >
                  <div className="relative max-h-[72vh] overflow-auto rounded-[1.85rem] bg-[linear-gradient(180deg,#ffffff_0%,#fcfbf8_100%)] p-3">
                  <button
                    type="button"
                    aria-label={drawerCloseLabel}
                    onClick={() => setLeftDrawerOpen(false)}
                    ref={leftDrawerOverlay.mobileInitialFocusRef}
                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <div>{leftDrawerContent}</div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div className="flex min-h-0 flex-col gap-2">
            <PublicPresenceSurface className="px-3 py-2 shadow-sm backdrop-blur">
              <div className="space-y-2 xl:hidden">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <PublicPresenceBadge icon={<Eye />} tone="rose">
                    {copy.fanPreview.badge}
                  </PublicPresenceBadge>
                  <button
                    type="button"
                    aria-controls={mobilePreviewToolsSheetId}
                    aria-expanded={mobilePreviewToolsOpen}
                    aria-haspopup="dialog"
                    aria-pressed={mobilePreviewToolsOpen}
                    ref={mobilePreviewToolsOverlay.fallbackTriggerRef}
                    onClick={(event) => {
                      mobilePreviewToolsOverlay.registerTrigger(event.currentTarget);
                      openExclusiveMobilePreviewToolsSheet();
                    }}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                      mobilePreviewToolsOpen
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Settings2 className="h-4 w-4" aria-hidden="true" />
                    {pickLocaleText(locale, {
                      en: 'Preview tools',
                      zh_HANS: '预览工具',
                      zh_HANT: '預覽工具',
                      ja: 'プレビュー操作',
                      ko: '미리보기 도구',
                      fr: 'Outils aperçu',
                    })}
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <PreviewViewportToggle
                    compact
                    locale={locale}
                    onChange={setPreviewViewport}
                    value={previewViewport}
                  />
                  <button
                    type="button"
                    aria-pressed={previewFocus}
                    onClick={() => setPreviewFocus((current) => !current)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                      previewFocus
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Monitor className="h-4 w-4" aria-hidden="true" />
                    {pickLocaleText(locale, {
                      en: 'Preview focus',
                      zh_HANS: '预览聚焦',
                      zh_HANT: '預覽聚焦',
                      ja: 'プレビュー集中',
                      ko: '미리보기 집중',
                      fr: 'Focus aperçu',
                    })}
                  </button>
                </div>
              </div>

              <div className="hidden flex-wrap items-center justify-between gap-3 xl:flex">
                <div className="flex flex-wrap items-center gap-2">
                  <PublicPresenceBadge icon={<Eye />} tone="rose">
                    {copy.fanPreview.badge}
                  </PublicPresenceBadge>
                  <PublicPresenceBadge tone="slate" variant="outline">
                    {currentTemplate
                      ? getPublicPresenceTemplateLabel(locale, currentTemplate)
                      : selectedTemplateId}
                  </PublicPresenceBadge>
                  <PublicPresenceBadge tone="slate" variant="outline">
                    {copy.fanPreview.resolvedPhaseLabel}:{' '}
                    {previewProjection
                      ? getPublicPresencePreviewPhaseLabel(
                          locale,
                          previewProjection.resolvedRevealPhase,
                        )
                      : getPublicPresencePreviewPhaseLabel(locale, previewPhase)}
                  </PublicPresenceBadge>
                  {selectedStageSection ? (
                    <PublicPresenceBadge tone="slate" variant="outline">
                      {copy.fanPreview.selectedSectionLabel}:{' '}
                      {getPublicPresenceStageSectionLabel(locale, selectedStageSection)}
                    </PublicPresenceBadge>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PreviewViewportToggle
                    locale={locale}
                    onChange={setPreviewViewport}
                    value={previewViewport}
                  />
                  <button
                    type="button"
                    aria-pressed={previewFocus}
                    onClick={() => setPreviewFocus((current) => !current)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      previewFocus
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Monitor className="h-4 w-4" aria-hidden="true" />
                    {pickLocaleText(locale, {
                      en: 'Preview focus',
                      zh_HANS: '预览聚焦',
                      zh_HANT: '預覽聚焦',
                      ja: 'プレビュー集中',
                      ko: '미리보기 집중',
                      fr: 'Focus aperçu',
                    })}
                  </button>
                </div>
              </div>
            </PublicPresenceSurface>

            <PublicPresenceSurface
              className="relative flex min-h-[calc(100vh-4.75rem)] flex-1 flex-col border border-slate-200/80 bg-white/95 p-0 sm:p-0 lg:p-0"
              data-testid="canvas-stage"
            >
              {previewError ? (
                <PublicPresenceStateView
                  description={previewError}
                  icon={<AlertCircle />}
                  title={copy.state.previewUnavailableTitle}
                  tone="error"
                />
              ) : previewProjection ? (
                <div className={`min-h-0 flex-1 px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4 ${previewViewport === 'mobile' ? 'mx-auto w-full max-w-[27rem]' : ''}`}>
                  <div className="h-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-3">
                    <div
                      className="h-full overflow-auto rounded-[1.5rem] px-4 py-5 sm:px-6 sm:py-6"
                      style={previewCanvasStyle}
                    >
                      <div className={previewViewport === 'mobile' ? 'mx-auto w-full' : 'mx-auto max-w-4xl'}>
                        <PublicHomepageProjectionRenderer
                          projection={previewProjection}
                          responsiveMode={previewViewport}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[calc(100vh-8rem)] flex-1 items-center justify-center px-4 pt-16">
                  <PublicPresenceStateView
                    description={copy.state.previewLoadingDescription}
                    icon={<RefreshCcw className="animate-spin" />}
                    title={copy.state.previewLoadingTitle}
                    tone="info"
                  />
                </div>
              )}
            </PublicPresenceSurface>

            <div
              className="rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-2"
              data-testid="bottom-preview-bar"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <div className="min-w-[12rem]">
                    <ControlledSelect
                      label={copy.fanPreview.simulatePhase}
                      onChange={(value) => {
                        if (
                          PUBLIC_PRESENCE_PREVIEW_PHASES.includes(
                            value as PublicPresencePhaseVisibility | 'current',
                          )
                        ) {
                          setPreviewPhase(value as PublicPresencePhaseVisibility | 'current');
                        }
                      }}
                      options={PUBLIC_PRESENCE_PREVIEW_PHASES.map((value) => ({
                        label: getPublicPresencePreviewPhaseLabel(locale, value),
                        value,
                      }))}
                      value={previewPhase}
                    />
                  </div>
                  <PublicPresenceBadge className="hidden sm:inline-flex" tone="slate" variant="outline">
                    {copy.fanPreview.resolvedPhaseLabel}:{' '}
                    {previewProjection
                      ? getPublicPresencePreviewPhaseLabel(
                          locale,
                          previewProjection.resolvedRevealPhase,
                        )
                      : getPublicPresencePreviewPhaseLabel(locale, previewPhase)}
                  </PublicPresenceBadge>
                  {selectedStageSection ? (
                    <PublicPresenceBadge className="hidden sm:inline-flex" tone="slate" variant="outline">
                      {copy.fanPreview.selectedSectionLabel}:{' '}
                      {getPublicPresenceStageSectionLabel(locale, selectedStageSection)}
                    </PublicPresenceBadge>
                  ) : null}
                </div>
                <PublicPresenceBadge tone={visualDraftDirty ? 'warning' : 'success'} variant="outline">
                  {visualDraftDirty ? copy.common.unsaved : copy.common.saved}
                </PublicPresenceBadge>
              </div>
            </div>
            {mobilePreviewToolsOpen ? (
              <PublicPresenceSurface
                aria-label={pickLocaleText(locale, {
                  en: 'Studio preview tools sheet',
                  zh_HANS: 'Studio 预览工具抽屉',
                  zh_HANT: 'Studio 預覽工具抽屜',
                  ja: 'Studio プレビュー操作シート',
                  ko: 'Studio 미리보기 도구 시트',
                  fr: 'Feuille outils aperçu studio',
                })}
                aria-modal
                className="!fixed inset-x-3 bottom-3 z-40 max-h-[72vh] overflow-auto rounded-[2rem] border border-slate-200/90 bg-white/97 p-4 shadow-xl xl:hidden"
                data-testid="studio-mobile-preview-tools-sheet"
                id={mobilePreviewToolsSheetId}
                role="dialog"
                variant="inset"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-slate-950">
                      {pickLocaleText(locale, {
                        en: 'Preview tools',
                        zh_HANS: '预览工具',
                        zh_HANT: '預覽工具',
                        ja: 'プレビュー操作',
                        ko: '미리보기 도구',
                        fr: 'Outils aperçu',
                      })}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {pickLocaleText(locale, {
                        en: 'Check phase, selected section, and saved preview details here.',
                        zh_HANS: '在这里查看阶段、当前分区和已保存的预览信息。',
                        zh_HANT: '在這裡查看階段、目前分區與已儲存的預覽資訊。',
                        ja: 'ここでフェーズ、選択中セクション、保存済みプレビュー情報を確認します。',
                        ko: '여기에서 단계, 선택 섹션, 저장된 미리보기 정보를 확인합니다.',
                        fr: 'Vérifiez ici la phase, la section sélectionnée et les détails de l’aperçu enregistré.',
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeMobileWorkbenchSheets}
                    ref={mobilePreviewToolsOverlay.mobileInitialFocusRef}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    {pickLocaleText(locale, {
                      en: 'Close',
                      zh_HANS: '关闭',
                      zh_HANT: '關閉',
                      ja: '閉じる',
                      ko: '닫기',
                      fr: 'Fermer',
                    })}
                  </button>
                </div>
                <div className="grid gap-3">
                  <button
                    type="button"
                    aria-controls={mobileManageSheetId}
                    aria-expanded={mobileManageOpen}
                    aria-haspopup="dialog"
                    onClick={(event) => {
                      mobileManageOverlay.registerTrigger(event.currentTarget);
                      openExclusiveMobileManageSheet();
                    }}
                    className="inline-flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                  >
                    <span>{pickLocaleText(locale, {
                      en: 'Manage',
                      zh_HANS: '管理',
                      zh_HANT: '管理',
                      ja: '管理',
                      ko: '관리',
                      fr: 'Gérer',
                    })}</span>
                    <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <PublicPresenceBadge tone="slate" variant="outline">
                    {currentTemplate
                      ? getPublicPresenceTemplateLabel(locale, currentTemplate)
                      : selectedTemplateId}
                  </PublicPresenceBadge>
                  <PublicPresenceBadge tone="slate" variant="outline">
                    {copy.fanPreview.resolvedPhaseLabel}:{' '}
                    {previewProjection
                      ? getPublicPresencePreviewPhaseLabel(
                          locale,
                          previewProjection.resolvedRevealPhase,
                        )
                      : getPublicPresencePreviewPhaseLabel(locale, previewPhase)}
                  </PublicPresenceBadge>
                  {selectedStageSection ? (
                    <PublicPresenceBadge tone="slate" variant="outline">
                      {copy.fanPreview.selectedSectionLabel}:{' '}
                      {getPublicPresenceStageSectionLabel(locale, selectedStageSection)}
                    </PublicPresenceBadge>
                  ) : null}
                </div>
              </PublicPresenceSurface>
            ) : null}
          </div>

          {showRightDrawer ? (
            <div className="contents">
              {isDesktopWorkbench ? (
                <div
                  aria-label={rightDrawerLabel}
                  className="hidden min-h-0 overflow-hidden xl:block"
                  data-testid="studio-right-drawer-desktop"
                  id={rightDrawerId}
                  role="region"
                >
                  <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                    <button
                      type="button"
                      aria-label={drawerCloseLabel}
                      onClick={closeStageWorkbenchPanel}
                      ref={rightDrawerOverlay.desktopInitialFocusRef}
                      className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <div className="h-full overflow-auto p-3">{rightDrawerContent}</div>
                  </div>
                </div>
              ) : (
                <div
                  aria-label={rightDrawerLabel}
                  aria-modal
                  className="xl:hidden fixed inset-x-3 bottom-20 z-40 max-h-[72vh] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)] ring-1 ring-white/90"
                  id={rightDrawerId}
                  role="dialog"
                >
                  <div className="relative max-h-[72vh] overflow-auto rounded-[1.85rem] bg-[linear-gradient(180deg,#ffffff_0%,#fcfbf8_100%)] p-3">
                  <button
                    type="button"
                    aria-label={drawerCloseLabel}
                    onClick={closeStageWorkbenchPanel}
                    ref={rightDrawerOverlay.mobileInitialFocusRef}
                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <div>{rightDrawerContent}</div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </PublicPresenceShell>
  );
}

export function PublicPresenceStudioScreen(
  props: Readonly<{
    initialFocus?: string | null;
    initialTemplateId?: string | null;
    talentId: string;
    tenantId: string;
  }>,
) {
  return <PublicPresenceStudioScreenInner {...props} />;
}
