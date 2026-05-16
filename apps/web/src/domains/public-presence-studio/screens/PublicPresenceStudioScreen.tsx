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
} from '@tcrn/shared';
import {
  PUBLIC_PRESENCE_COMPONENT_DEFINITIONS,
  PUBLIC_PRESENCE_FAN_ACTION_SLOTS,
  PUBLIC_PRESENCE_NOTE_KINDS,
} from '@tcrn/shared';
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ClipboardList,
  Eye,
  FileCode2,
  Layers3,
  LayoutTemplate,
  RefreshCcw,
  Save,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { type ReactNode, startTransition, useEffect, useMemo, useState } from 'react';

import { HomepageManagementScreen } from '@/domains/homepage-management/screens/HomepageManagementScreen';
import { PublicHomepageProjectionRenderer } from '@/domains/public-homepage/components/PublicHomepageProjectionRenderer';
import {
  PublicPresenceBadge,
  PublicPresenceShell,
  PublicPresenceStateView,
  PublicPresenceSurface,
} from '@/domains/public-presence';
import {
  approvePublicPresenceReview,
  bootstrapPublicPresenceWorkspace,
  cancelPublicPresenceSchedule,
  createPublicPresenceRollbackDraft,
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
  getPublicPresenceEditabilityStateLabel,
  formatPublicPresenceStudioDateTime,
  formatPublicPresenceStudioValidationSummary,
  getPublicPresenceDocumentStateLabel,
  getPublicPresenceFanActionSlotLabel,
  getPublicPresenceFieldLabel,
  getPublicPresenceFieldPlaceholder,
  getPublicPresenceIssueMessageLabel,
  getPublicPresenceNoteKindLabel,
  getPublicPresencePreviewPhaseLabel,
  getPublicPresenceProvenanceLabel,
  getPublicPresenceSourcePolicyLabel,
  getPublicPresenceStageSectionLabel,
  getPublicPresenceStageSectionPurpose,
  getPublicPresenceStudioTabLabel,
  getPublicPresenceTemplateLabel,
  getPublicPresenceTemplateUseCase,
  getPublicPresenceValueTypeLabel,
  getPublicPresenceWorkflowEventLabel,
  PUBLIC_PRESENCE_PREVIEW_PHASES,
  type PublicPresenceStudioCopy,
  type PublicPresenceStudioTabId,
  usePublicPresenceStudioCopy,
} from '@/domains/public-presence-studio/screens/public-presence-studio.copy';
import { useSession } from '@/platform/runtime/session/session-provider';

interface NoticeState {
  message: string;
  tone: 'error' | 'success';
}

interface TabDefinition {
  icon: ReactNode;
  id: PublicPresenceStudioTabId;
}

type StagePanelMode = 'configure' | 'edit' | 'inspect';

interface StagePanelState {
  mode: StagePanelMode;
  sectionKind: string;
}

interface PreviewViewportMode {
  frameClassName: string;
  id: 'desktop' | 'mobile';
}

const STUDIO_TABS: TabDefinition[] = [
  { icon: <LayoutTemplate aria-hidden="true" />, id: 'overview' },
  { icon: <Layers3 aria-hidden="true" />, id: 'stageSections' },
  { icon: <Sparkles aria-hidden="true" />, id: 'personaKit' },
  { icon: <Eye aria-hidden="true" />, id: 'fanPreview' },
  { icon: <ShieldCheck aria-hidden="true" />, id: 'reviewPublish' },
  { icon: <FileCode2 aria-hidden="true" />, id: 'advanced' },
];

const PREVIEW_VIEWPORTS: PreviewViewportMode[] = [
  { id: 'desktop', frameClassName: 'min-h-[28rem] w-full' },
  { id: 'mobile', frameClassName: 'mx-auto min-h-[32rem] w-full max-w-[23rem]' },
];

function getErrorMessage(_reason: unknown, fallback: string) {
  return fallback;
}

function formatDateTime(locale: string, value: string | null) {
  return formatPublicPresenceStudioDateTime(locale, value);
}

function toPrettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function resolveWorkspacePublicPath(
  previewProjection: PublicPresenceProjection | null,
  workspace: PublicPresenceStudioWorkspaceResponse | null,
  fallback: string,
) {
  return (
    previewProjection?.route.canonicalPath
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

function readFieldInheritedFrom(
  document: PublicPresenceDocument | null,
  sectionKind: string,
  fieldKey: string,
) {
  return readFieldEntry(document, sectionKind, fieldKey)?.inheritedFrom ?? null;
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

function SummaryCard({
  hint,
  label,
  value,
}: Readonly<{
  hint: string;
  label: string;
  value: string;
}>) {
  return (
    <PublicPresenceSurface className="p-4 sm:p-5" variant="inset">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{hint}</p>
    </PublicPresenceSurface>
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
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
                  getPublicPresenceStageSectionLabel(locale, { kind: sectionKind }),
                )
                .join(' / ')}
            </p>
          </PublicPresenceSurface>
        ))}
      </div>
    </div>
  );
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

function getCurrentSectionDocument(
  document: PublicPresenceDocument | null,
  sectionKind: string,
) {
  return document?.sections.find((entry) => entry.kind === sectionKind) ?? null;
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

function sortSectionsForTemplate(
  currentTemplate: PublicPresenceStudioTemplateSummary | null,
  stageSections: PublicPresenceStudioStageSectionSummary[],
) {
  if (!currentTemplate) {
    return stageSections;
  }

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
    .filter((section) => visibleKinds.has(section.kind))
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
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-rose-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
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
        className="min-h-24 w-full rounded-3xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
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
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-rose-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
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

function PublicPresenceStudioScreenInner({
  tenantId,
  talentId,
}: Readonly<{
  talentId: string;
  tenantId: string;
}>) {
  const { copy, selectedLocale } = usePublicPresenceStudioCopy();
  const { request, session } = useSession();
  const [activeTab, setActiveTab] = useState<PublicPresenceStudioTabId>('overview');
  const [workspace, setWorkspace] = useState<PublicPresenceStudioWorkspaceResponse | null>(null);
  const [editorDocument, setEditorDocument] = useState<PublicPresenceDocument | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPhase, setPreviewPhase] = useState<PublicPresencePhaseVisibility | 'current'>('current');
  const [previewProjection, setPreviewProjection] = useState<PublicPresenceProjection | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [workflowAction, setWorkflowAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [stagePanel, setStagePanel] = useState<StagePanelState | null>(null);
  const [previewViewport, setPreviewViewport] = useState<PreviewViewportMode['id']>('desktop');
  const [selectedPreviewSectionId, setSelectedPreviewSectionId] = useState<string | null>(null);
  const [showReviewHistory, setShowReviewHistory] = useState(false);
  const [showMigrationTools, setShowMigrationTools] = useState(false);

  const previewPhaseOptions = useMemo(
    () =>
      PUBLIC_PRESENCE_PREVIEW_PHASES.map((value) => ({
        value,
        label: getPublicPresencePreviewPhaseLabel(selectedLocale, value),
      })),
    [selectedLocale],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await readPublicPresenceWorkspace(request, talentId);

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setWorkspace(result);
          setEditorDocument(result.draftVersion?.document ?? null);
          setSourceText(result.draftVersion ? toPrettyJson(result.draftVersion.document) : '');
          setLoading(false);
        });
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
  }, [copy.state.loadWorkspaceError, request, talentId]);

  useEffect(() => {
    if (activeTab !== 'fanPreview' || !workspace?.draftVersion) {
      return;
    }

    let cancelled = false;

    const loadPreview = async () => {
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const result = await readPublicPresenceDraftPreview(
          request,
          talentId,
          previewPhase,
        );

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setPreviewProjection(result);
          setSelectedPreviewSectionId(result.sections[0]?.id ?? null);
          setPreviewLoading(false);
        });
      } catch (reason) {
        if (cancelled) {
          return;
        }

        setPreviewProjection(null);
        setPreviewError(getErrorMessage(reason, copy.state.previewBuildError));
        setPreviewLoading(false);
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    previewPhase,
    request,
    talentId,
    workspace?.draftVersion?.contentHash,
    workspace?.draftVersion?.id,
    copy.state.previewBuildError,
  ]);

  const applyWorkspace = (result: PublicPresenceStudioWorkspaceResponse) => {
    setWorkspace(result);
    setEditorDocument(result.draftVersion?.document ?? null);
    setSourceText(result.draftVersion ? toPrettyJson(result.draftVersion.document) : '');
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
        tone: 'success',
      });
    } catch (reason) {
      setNotice({
        message: getErrorMessage(reason, copy.notices.workflowActionError),
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
        tone: 'success',
      });
    } catch (reason) {
      setNotice({
        message: getErrorMessage(reason, copy.notices.bootstrapError),
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
        tone: 'success',
      });
    } catch (reason) {
      setNotice({
        message: getErrorMessage(reason, copy.notices.saveDraftError),
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSourceDocument = async () => {
    if (!workspace?.draftVersion) {
      return;
    }

    let parsed: PublicPresenceDocument;

    try {
      parsed = JSON.parse(sourceText) as PublicPresenceDocument;
    } catch {
      setNotice({
        message: copy.advanced.invalidJson,
        tone: 'error',
      });
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const result = await savePublicPresenceWorkspaceDraft(request, talentId, {
        document: parsed,
        expectedCurrentContentHash: workspace.draftVersion.contentHash,
      });
      applyWorkspace(result);
      setNotice({
        message: copy.notices.saveSourceSuccess,
        tone: 'success',
      });
    } catch (reason) {
      setNotice({
        message: getErrorMessage(reason, copy.notices.saveSourceError),
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const currentTemplate = workspace?.templates.find(
    (template) => template.templateId === workspace?.draftVersion?.document.templateId,
  ) ?? null;
  const currentSnapshot = workspace?.draftVersion?.validationSnapshot ?? null;
  const currentDraftHash = workspace?.draftVersion?.contentHash ?? null;
  const currentDocumentState = workspace?.draftVersion?.documentState ?? 'draft';
  const persistedSourceText = workspace?.draftVersion
    ? toPrettyJson(workspace.draftVersion.document)
    : '';
  const hasUnsavedDraftChanges = Boolean(
    workspace?.draftVersion && sourceText !== persistedSourceText,
  );
  const orderedSections = sortSectionsForTemplate(currentTemplate, workspace?.stageSections ?? []);
  const selectedStageSection = orderedSections.find(
    (section) => section.kind === stagePanel?.sectionKind,
  ) ?? null;
  const selectedStageSectionDocument = selectedStageSection
    ? getCurrentSectionDocument(editorDocument, selectedStageSection.kind)
    : null;
  const selectedPreviewSection = previewProjection?.sections.find(
    (section) => section.id === selectedPreviewSectionId,
  ) ?? null;
  const workspacePublicPath = resolveWorkspacePublicPath(
    previewProjection,
    workspace,
    copy.common.notSet,
  );
  const viewportFrameClass = PREVIEW_VIEWPORTS.find((viewport) => viewport.id === previewViewport)
    ?.frameClassName ?? PREVIEW_VIEWPORTS[0].frameClassName;
  const workspaceLabel = session?.tenantName || `${copy.common.tenantPrefix} ${tenantId}`;

  const isWorkflowActionDisabled =
    workflowAction !== null || hasUnsavedDraftChanges;

  const updateDocument = (next: PublicPresenceDocument) => {
    setEditorDocument(next);
    setSourceText(toPrettyJson(next));
  };

  const setFieldValue = (sectionKind: string, fieldKey: string, value: unknown) => {
    if (!editorDocument) {
      return;
    }

    updateDocument(buildSectionDocument(editorDocument, sectionKind, fieldKey, value));
  };

  const resetFieldValue = (sectionKind: string, fieldKey: string) => {
    if (!editorDocument) {
      return;
    }

    const section = editorDocument.sections.find((entry) => entry.kind === sectionKind);
    if (!section?.fields?.[fieldKey]) {
      return;
    }

    const nextSections = editorDocument.sections.map((entry) => {
      if (entry.kind !== sectionKind) {
        return entry;
      }

      const nextFields = { ...(entry.fields ?? {}) };
      delete nextFields[fieldKey];

      return {
        ...entry,
        fields: Object.keys(nextFields).length > 0 ? nextFields : undefined,
      };
    });

    updateDocument({
      ...editorDocument,
      sections: nextSections,
    });
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

  const addComponentToSection = (
    sectionKind: string,
    componentType: HomepageComponentType,
  ) => {
    if (!editorDocument) {
      return;
    }

    const nextSections = editorDocument.sections.map((section) => {
      if (section.kind !== sectionKind) {
        return section;
      }

      return {
        ...section,
        components: [
          ...(section.components ?? []),
          buildDefaultComponentForType(componentType),
        ],
      };
    });

    updateDocument({
      ...editorDocument,
      sections: nextSections,
    });
  };

  const replaceSectionComponents = (
    sectionKind: string,
    components: PublicPresenceComponentNode[],
  ) => {
    if (!editorDocument) {
      return;
    }

    const nextSections = editorDocument.sections.map((section) => (
      section.kind === sectionKind
        ? {
            ...section,
            components,
          }
        : section
    ));

    updateDocument({
      ...editorDocument,
      sections: nextSections,
    });
  };

  const removeComponentFromSection = (sectionKind: string, componentIndex: number) => {
    if (!editorDocument) {
      return;
    }

    const nextSections = editorDocument.sections.map((section) => {
      if (section.kind !== sectionKind) {
        return section;
      }

      return {
        ...section,
        components: (section.components ?? []).filter((_, index) => index !== componentIndex),
      };
    });

    updateDocument({
      ...editorDocument,
      sections: nextSections,
    });
  };

  const ensureSectionExists = (section: PublicPresenceStudioStageSectionSummary) => {
    if (!editorDocument) {
      return;
    }

    if (editorDocument.sections.some((entry) => entry.kind === section.kind)) {
      return;
    }

    updateDocument({
      ...editorDocument,
      sections: [
        ...editorDocument.sections,
        buildEmptySectionDraft(section, editorDocument.sections.length),
      ],
    });
  };

  const moveSection = (sectionKind: string, direction: 'up' | 'down') => {
    if (!editorDocument) {
      return;
    }

    const currentIndex = editorDocument.sections.findIndex((section) => section.kind === sectionKind);
    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= editorDocument.sections.length) {
      return;
    }

    const nextSections = [...editorDocument.sections];
    const [current] = nextSections.splice(currentIndex, 1);
    nextSections.splice(targetIndex, 0, current);
    updateDocument({
      ...editorDocument,
      sections: nextSections,
    });
  };

  const removeSection = (sectionKind: string) => {
    if (!editorDocument) {
      return;
    }

    updateDocument({
      ...editorDocument,
      sections: editorDocument.sections.filter((section) => section.kind !== sectionKind),
    });
    if (stagePanel?.sectionKind === sectionKind) {
      setStagePanel(null);
    }
  };

  const renderStructuredSectionEditor = (section: PublicPresenceStudioStageSectionSummary) => {
    const sectionDocument = getCurrentSectionDocument(editorDocument, section.kind);
    const canEditVisually =
      section.editabilityState === 'validEditable' && section.sourcePolicy === 'registryOwned';
    const fieldDefinitions = new Map(
      section.fieldDefinitions.map((definition) => [definition.fieldKey, definition]),
    );

    const renderFieldFooter = (fieldKey: string) => {
      const definition = fieldDefinitions.get(fieldKey);
      const provenance = readFieldProvenance(editorDocument, section.kind, fieldKey);
      const canReset = Boolean(readFieldEntry(editorDocument, section.kind, fieldKey))
        && provenance !== 'locked'
        && provenance !== 'sourceOwned';

      return (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <PublicPresenceBadge tone="slate" variant="outline">
            {getPublicPresenceProvenanceLabel(selectedLocale, provenance)}
          </PublicPresenceBadge>
          {definition?.sourceOnly ? (
            <PublicPresenceBadge tone="warning" variant="outline">
              {copy.common.advancedOnly}
            </PublicPresenceBadge>
          ) : null}
          {definition && !definition.visualEditable ? (
            <PublicPresenceBadge tone="warning" variant="outline">
              {copy.common.locked}
            </PublicPresenceBadge>
          ) : null}
          {canReset ? (
            <button
              type="button"
              onClick={() => resetFieldValue(section.kind, fieldKey)}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {copy.stageSections.resetField}
            </button>
          ) : null}
        </div>
      );
    };

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
            {copy.stageSections.sourceOwnedDescription}
          </p>
          <PublicPresenceBadge tone="slate" variant="outline">
            {copy.common.advancedOnly}
          </PublicPresenceBadge>
        </div>
      );
    }

    if (section.kind === 'countdownReveal') {
      const countdownPhaseOptions = PUBLIC_PRESENCE_PREVIEW_PHASES
        .filter((value) => value !== 'current' && value !== 'always')
        .map((value) => ({
          label: getPublicPresencePreviewPhaseLabel(selectedLocale, value),
          value,
        }));

      return (
        <div className="grid gap-4">
          <ControlledSelect
            disabled={!isFieldEditable('phase')}
            label={getPublicPresenceFieldLabel(selectedLocale, 'phase')}
            onChange={(value) => setFieldValue(section.kind, 'phase', value)}
            options={countdownPhaseOptions}
            value={String(readFieldValue(editorDocument, section.kind, 'phase') || 'teaser')}
            footer={renderFieldFooter('phase')}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('revealAtUtc')}
            label={getPublicPresenceFieldLabel(selectedLocale, 'revealAtUtc')}
            onChange={(value) => setFieldValue(section.kind, 'revealAtUtc', value)}
            placeholder={copy.stageSections.revealTimeExample}
            value={String(readFieldValue(editorDocument, section.kind, 'revealAtUtc') ?? '')}
            footer={renderFieldFooter('revealAtUtc')}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('timezone')}
            label={getPublicPresenceFieldLabel(selectedLocale, 'timezone')}
            onChange={(value) => setFieldValue(section.kind, 'timezone', value)}
            placeholder={copy.stageSections.timezoneExample}
            value={String(readFieldValue(editorDocument, section.kind, 'timezone') ?? '')}
            footer={renderFieldFooter('timezone')}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('teaserName')}
            label={getPublicPresenceFieldLabel(selectedLocale, 'teaserName')}
            onChange={(value) => setFieldValue(section.kind, 'teaserName', value)}
            placeholder={getPublicPresenceFieldPlaceholder(selectedLocale, 'teaserName')}
            value={String(readFieldValue(editorDocument, section.kind, 'teaserName') ?? '')}
            footer={renderFieldFooter('teaserName')}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('revealName')}
            label={getPublicPresenceFieldLabel(selectedLocale, 'revealName')}
            onChange={(value) => setFieldValue(section.kind, 'revealName', value)}
            placeholder={getPublicPresenceFieldPlaceholder(selectedLocale, 'revealName')}
            value={String(readFieldValue(editorDocument, section.kind, 'revealName') ?? '')}
            footer={renderFieldFooter('revealName')}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('streamUrl')}
            label={getPublicPresenceFieldLabel(selectedLocale, 'streamUrl')}
            onChange={(value) => setFieldValue(section.kind, 'streamUrl', value)}
            placeholder={copy.stageSections.urlPlaceholder}
            value={String(readFieldValue(editorDocument, section.kind, 'streamUrl') ?? '')}
            footer={renderFieldFooter('streamUrl')}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('launchUrl')}
            label={getPublicPresenceFieldLabel(selectedLocale, 'launchUrl')}
            onChange={(value) => setFieldValue(section.kind, 'launchUrl', value)}
            placeholder={copy.stageSections.urlPlaceholder}
            value={String(readFieldValue(editorDocument, section.kind, 'launchUrl') ?? '')}
            footer={renderFieldFooter('launchUrl')}
          />
        </div>
      );
    }

    if (section.kind === 'fanActions') {
      const actions = Array.isArray(readFieldValue(editorDocument, section.kind, 'actions'))
        ? (readFieldValue(editorDocument, section.kind, 'actions') as Array<Record<string, unknown>>)
        : [];

      return (
        <div className="space-y-4">
          {actions.length === 0 ? (
            <p className="text-sm text-slate-500">{copy.stageSections.noActionsYet}</p>
          ) : null}
          {actions.map((action, index) => (
            <div key={`${section.kind}-${index}`} className="grid gap-3 rounded-3xl border border-slate-200 bg-white/80 p-4">
              <ControlledSelect
                disabled={!isFieldEditable('actions')}
                label={`${copy.stageSections.fanActionsLabel} ${index + 1} ${getPublicPresenceFieldLabel(selectedLocale, 'slot')}`}
                onChange={(value) => {
                  const next = [...actions];
                  next[index] = { ...action, slot: value };
                  setFieldValue(section.kind, 'actions', next);
                }}
                options={PUBLIC_PRESENCE_FAN_ACTION_SLOTS.map((slot) => ({
                  label: getPublicPresenceFanActionSlotLabel(selectedLocale, slot),
                  value: slot,
                }))}
                value={String(action.slot ?? '')}
              />
              <ControlledTextInput
                disabled={!isFieldEditable('actions')}
                label={`${copy.stageSections.fanActionsLabel} ${index + 1} ${getPublicPresenceFieldLabel(selectedLocale, 'label')}`}
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
                label={`${copy.stageSections.fanActionsLabel} ${index + 1} ${getPublicPresenceFieldLabel(selectedLocale, 'url')}`}
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
            disabled={!isFieldEditable('actions')}
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
          {renderFieldFooter('actions')}
        </div>
      );
    }

    if (section.kind === 'agencyNotes') {
      const notes = Array.isArray(readFieldValue(editorDocument, section.kind, 'notes'))
        ? (readFieldValue(editorDocument, section.kind, 'notes') as Array<Record<string, unknown>>)
        : [];

      return (
        <div className="space-y-4">
          {notes.length === 0 ? (
            <p className="text-sm text-slate-500">{copy.stageSections.noNotesYet}</p>
          ) : null}
          {notes.map((note, index) => (
            <div key={`${section.kind}-${index}`} className="grid gap-3 rounded-3xl border border-slate-200 bg-white/80 p-4">
              <ControlledSelect
                disabled={!isFieldEditable('notes')}
                label={`${copy.stageSections.agencyNotesLabel} ${index + 1} ${getPublicPresenceFieldLabel(selectedLocale, 'kind')}`}
                onChange={(value) => {
                  const next = [...notes];
                  next[index] = { ...note, kind: value };
                  setFieldValue(section.kind, 'notes', next);
                }}
                options={PUBLIC_PRESENCE_NOTE_KINDS.map((kind) => ({
                  label: getPublicPresenceNoteKindLabel(selectedLocale, kind),
                  value: kind,
                }))}
                value={String(note.kind ?? 'announcement')}
              />
              <ControlledTextInput
                disabled={!isFieldEditable('notes')}
                label={`${copy.stageSections.agencyNotesLabel} ${index + 1} ${getPublicPresenceFieldLabel(selectedLocale, 'title')}`}
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
                label={`${copy.stageSections.agencyNotesLabel} ${index + 1} ${getPublicPresenceFieldLabel(selectedLocale, 'body')}`}
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
            disabled={!isFieldEditable('notes')}
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
          {renderFieldFooter('notes')}
        </div>
      );
    }

    if (section.kind === 'firstEncounter') {
      return (
        <div className="grid gap-4">
          <ControlledTextInput
            disabled={!isFieldEditable('displayName')}
            label={getPublicPresenceFieldLabel(selectedLocale, 'displayName')}
            onChange={(value) => setFieldValue(section.kind, 'displayName', value)}
            placeholder={getPublicPresenceFieldPlaceholder(selectedLocale, 'displayName')}
            value={String(readFieldValue(editorDocument, section.kind, 'displayName') ?? '')}
            footer={renderFieldFooter('displayName')}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('headline')}
            label={getPublicPresenceFieldLabel(selectedLocale, 'headline')}
            onChange={(value) => setFieldValue(section.kind, 'headline', value)}
            placeholder={getPublicPresenceFieldPlaceholder(selectedLocale, 'headline')}
            value={String(readFieldValue(editorDocument, section.kind, 'headline') ?? '')}
            footer={renderFieldFooter('headline')}
          />
          <ControlledTextArea
            disabled={!isFieldEditable('intro')}
            label={getPublicPresenceFieldLabel(selectedLocale, 'intro')}
            onChange={(value) => setFieldValue(section.kind, 'intro', value)}
            placeholder={getPublicPresenceFieldPlaceholder(selectedLocale, 'intro')}
            value={String(readFieldValue(editorDocument, section.kind, 'intro') ?? '')}
            footer={renderFieldFooter('intro')}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('avatarUrl')}
            label={getPublicPresenceFieldLabel(selectedLocale, 'avatarUrl')}
            onChange={(value) => setFieldValue(section.kind, 'avatarUrl', value)}
            placeholder={copy.stageSections.urlPlaceholder}
            value={String(readFieldValue(editorDocument, section.kind, 'avatarUrl') ?? '')}
            footer={renderFieldFooter('avatarUrl')}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('heroMediaUrl')}
            label={getPublicPresenceFieldLabel(selectedLocale, 'heroMediaUrl')}
            onChange={(value) => setFieldValue(section.kind, 'heroMediaUrl', value)}
            placeholder={copy.stageSections.urlPlaceholder}
            value={String(readFieldValue(editorDocument, section.kind, 'heroMediaUrl') ?? '')}
            footer={renderFieldFooter('heroMediaUrl')}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('teaserName')}
            label={getPublicPresenceFieldLabel(selectedLocale, 'teaserName')}
            onChange={(value) => setFieldValue(section.kind, 'teaserName', value)}
            placeholder={getPublicPresenceFieldPlaceholder(selectedLocale, 'teaserName')}
            value={String(readFieldValue(editorDocument, section.kind, 'teaserName') ?? '')}
            footer={renderFieldFooter('teaserName')}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('revealName')}
            label={getPublicPresenceFieldLabel(selectedLocale, 'revealName')}
            onChange={(value) => setFieldValue(section.kind, 'revealName', value)}
            placeholder={getPublicPresenceFieldPlaceholder(selectedLocale, 'revealName')}
            value={String(readFieldValue(editorDocument, section.kind, 'revealName') ?? '')}
            footer={renderFieldFooter('revealName')}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('primaryCtaLabel')}
            label={getPublicPresenceFieldLabel(selectedLocale, 'primaryCtaLabel')}
            onChange={(value) => setFieldValue(section.kind, 'primaryCtaLabel', value)}
            placeholder={getPublicPresenceFieldPlaceholder(selectedLocale, 'primaryCtaLabel')}
            value={String(readFieldValue(editorDocument, section.kind, 'primaryCtaLabel') ?? '')}
            footer={renderFieldFooter('primaryCtaLabel')}
          />
          <ControlledTextInput
            disabled={!isFieldEditable('primaryCtaUrl')}
            label={getPublicPresenceFieldLabel(selectedLocale, 'primaryCtaUrl')}
            onChange={(value) => setFieldValue(section.kind, 'primaryCtaUrl', value)}
            placeholder={copy.stageSections.urlPlaceholder}
            value={String(readFieldValue(editorDocument, section.kind, 'primaryCtaUrl') ?? '')}
            footer={renderFieldFooter('primaryCtaUrl')}
          />
        </div>
      );
    }

    if (section.kind === 'currentLaunchAction') {
      const component = getFirstComponent();

      return (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">
              {copy.stageSections.componentModeLabel}
            </span>
            <button
              type="button"
              onClick={() => replaceSectionComponents(section.kind, [buildDefaultComponentForType('LinkButton')])}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                component?.type === 'LinkButton'
                  ? 'border-rose-300 bg-rose-50 text-rose-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {copy.stageSections.linkMode}
            </button>
            <button
              type="button"
              onClick={() => replaceSectionComponents(section.kind, [buildDefaultComponentForType('LiveStatus')])}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                component?.type === 'LiveStatus'
                  ? 'border-rose-300 bg-rose-50 text-rose-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {copy.stageSections.liveStatusMode}
            </button>
          </div>
          {component?.type === 'LinkButton' ? (
            <div className="grid gap-4">
              <ControlledTextInput
                label={getPublicPresenceFieldLabel(selectedLocale, 'label')}
                onChange={(value) => setComponentPropValue(section.kind, 0, 'label', value)}
                placeholder={getPublicPresenceFieldPlaceholder(selectedLocale, 'label')}
                value={String(component.props.label ?? '')}
              />
              <ControlledTextInput
                label={getPublicPresenceFieldLabel(selectedLocale, 'url')}
                onChange={(value) => setComponentPropValue(section.kind, 0, 'url', value)}
                placeholder={copy.stageSections.urlPlaceholder}
                value={String(component.props.url ?? '')}
              />
            </div>
          ) : null}
          {component?.type === 'LiveStatus' ? (
            <div className="grid gap-4">
              <ControlledTextInput
                label={getPublicPresenceFieldLabel(selectedLocale, 'platform')}
                onChange={(value) => setComponentPropValue(section.kind, 0, 'platform', value)}
                placeholder={copy.stageSections.platformPlaceholder}
                value={String(component.props.platform ?? '')}
              />
              <ControlledTextInput
                label={getPublicPresenceFieldLabel(selectedLocale, 'channelName')}
                onChange={(value) => setComponentPropValue(section.kind, 0, 'channelName', value)}
                placeholder={getPublicPresenceFieldPlaceholder(selectedLocale, 'channelName')}
                value={String(component.props.channelName ?? '')}
              />
              <ControlledTextInput
                label={getPublicPresenceFieldLabel(selectedLocale, 'title')}
                onChange={(value) => setComponentPropValue(section.kind, 0, 'title', value)}
                placeholder={copy.stageSections.titlePlaceholder}
                value={String(component.props.title ?? '')}
              />
              <ControlledTextInput
                label={getPublicPresenceFieldLabel(selectedLocale, 'streamUrl')}
                onChange={(value) => setComponentPropValue(section.kind, 0, 'streamUrl', value)}
                placeholder={copy.stageSections.urlPlaceholder}
                value={String(component.props.streamUrl ?? '')}
              />
              <ControlledTextInput
                label={getPublicPresenceFieldLabel(selectedLocale, 'viewers')}
                onChange={(value) => setComponentPropValue(section.kind, 0, 'viewers', value)}
                placeholder={getPublicPresenceFieldPlaceholder(selectedLocale, 'viewers')}
                value={String(component.props.viewers ?? '')}
              />
              <ControlledCheckbox
                checked={Boolean(component.props.isLive)}
                label={getPublicPresenceFieldLabel(selectedLocale, 'isLive')}
                onChange={(checked) => setComponentPropValue(section.kind, 0, 'isLive', checked)}
              />
            </div>
          ) : null}
        </div>
      );
    }

    if (section.kind === 'officialChannels') {
      const component = getFirstComponent();
      const platforms = component?.type === 'SocialLinks' && Array.isArray(component.props.platforms)
        ? (component.props.platforms as Array<Record<string, unknown>>)
        : [];

      if (!component || component.type !== 'SocialLinks') {
        return (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => replaceSectionComponents(section.kind, [buildDefaultComponentForType('SocialLinks')])}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
            >
              {copy.stageSections.addChannel}
            </button>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          {platforms.length === 0 ? (
            <p className="text-sm text-slate-500">{copy.stageSections.noChannelsYet}</p>
          ) : null}
          {platforms.map((platform, index) => (
            <div key={`${section.kind}-platform-${index}`} className="grid gap-3 rounded-3xl border border-slate-200 bg-white/80 p-4">
              <ControlledTextInput
                label={`${getPublicPresenceFieldLabel(selectedLocale, 'platform')} ${index + 1}`}
                onChange={(value) => {
                  const next = [...platforms];
                  next[index] = { ...platform, platformCode: value };
                  setComponentPropValue(section.kind, 0, 'platforms', next);
                }}
                placeholder={copy.stageSections.platformPlaceholder}
                value={String(platform.platformCode ?? '')}
              />
              <ControlledTextInput
                label={`${getPublicPresenceFieldLabel(selectedLocale, 'label')} ${index + 1}`}
                onChange={(value) => {
                  const next = [...platforms];
                  next[index] = { ...platform, label: value };
                  setComponentPropValue(section.kind, 0, 'platforms', next);
                }}
                placeholder={copy.stageSections.actionLabelPlaceholder}
                value={String(platform.label ?? '')}
              />
              <ControlledTextInput
                label={`${getPublicPresenceFieldLabel(selectedLocale, 'url')} ${index + 1}`}
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

    if (section.kind === 'stageSchedule') {
      const component = getFirstComponent();
      const events = component?.type === 'Schedule' && Array.isArray(component.props.events)
        ? (component.props.events as Array<Record<string, unknown>>)
        : [];

      if (!component || component.type !== 'Schedule') {
        return (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => replaceSectionComponents(section.kind, [buildDefaultComponentForType('Schedule')])}
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
            label={getPublicPresenceFieldLabel(selectedLocale, 'title')}
            onChange={(value) => setComponentPropValue(section.kind, 0, 'title', value)}
            placeholder={copy.stageSections.titlePlaceholder}
            value={String(component.props.title ?? '')}
          />
          <ControlledTextInput
            label={getPublicPresenceFieldLabel(selectedLocale, 'weekOf')}
            onChange={(value) => setComponentPropValue(section.kind, 0, 'weekOf', value)}
            placeholder={getPublicPresenceFieldPlaceholder(selectedLocale, 'weekOf')}
            value={String(component.props.weekOf ?? '')}
          />
          {events.length === 0 ? (
            <p className="text-sm text-slate-500">{copy.stageSections.noEventsYet}</p>
          ) : null}
          {events.map((event, index) => (
            <div key={`${section.kind}-event-${index}`} className="grid gap-3 rounded-3xl border border-slate-200 bg-white/80 p-4">
              <ControlledTextInput
                label={`${getPublicPresenceFieldLabel(selectedLocale, 'day')} ${index + 1}`}
                onChange={(value) => {
                  const next = [...events];
                  next[index] = { ...event, day: value };
                  setComponentPropValue(section.kind, 0, 'events', next);
                }}
                placeholder={copy.stageSections.dayPlaceholder}
                value={String(event.day ?? '')}
              />
              <ControlledTextInput
                label={`${getPublicPresenceFieldLabel(selectedLocale, 'time')} ${index + 1}`}
                onChange={(value) => {
                  const next = [...events];
                  next[index] = { ...event, time: value };
                  setComponentPropValue(section.kind, 0, 'events', next);
                }}
                placeholder={copy.stageSections.timePlaceholder}
                value={String(event.time ?? '')}
              />
              <ControlledTextInput
                label={`${getPublicPresenceFieldLabel(selectedLocale, 'title')} ${index + 1}`}
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

    if (section.kind === 'teaserRevealMedia') {
      const component = getFirstComponent();
      const images = component?.type === 'ImageGallery' && Array.isArray(component.props.images)
        ? (component.props.images as Array<Record<string, unknown>>)
        : [];

      return (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">
              {copy.stageSections.componentModeLabel}
            </span>
            <button
              type="button"
              onClick={() => replaceSectionComponents(section.kind, [buildDefaultComponentForType('ImageGallery')])}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                component?.type === 'ImageGallery'
                  ? 'border-rose-300 bg-rose-50 text-rose-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {copy.stageSections.galleryMode}
            </button>
            <button
              type="button"
              onClick={() => replaceSectionComponents(section.kind, [buildDefaultComponentForType('VideoEmbed')])}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                component?.type === 'VideoEmbed'
                  ? 'border-rose-300 bg-rose-50 text-rose-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {copy.stageSections.videoMode}
            </button>
          </div>
          {component?.type === 'ImageGallery' ? (
            <>
              {images.length === 0 ? (
                <p className="text-sm text-slate-500">{copy.stageSections.noImagesYet}</p>
              ) : null}
              {images.map((image, index) => (
                <div key={`${section.kind}-image-${index}`} className="grid gap-3 rounded-3xl border border-slate-200 bg-white/80 p-4">
                  <ControlledTextInput
                    label={`${getPublicPresenceFieldLabel(selectedLocale, 'url')} ${index + 1}`}
                    onChange={(value) => {
                      const next = [...images];
                      next[index] = { ...image, url: value };
                      setComponentPropValue(section.kind, 0, 'images', next);
                    }}
                    placeholder={copy.stageSections.urlPlaceholder}
                    value={String(image.url ?? '')}
                  />
                  <ControlledTextInput
                    label={`${getPublicPresenceFieldLabel(selectedLocale, 'alt')} ${index + 1}`}
                    onChange={(value) => {
                      const next = [...images];
                      next[index] = { ...image, alt: value };
                      setComponentPropValue(section.kind, 0, 'images', next);
                    }}
                    placeholder={getPublicPresenceFieldPlaceholder(selectedLocale, 'alt')}
                    value={String(image.alt ?? '')}
                  />
                  <ControlledTextInput
                    label={`${getPublicPresenceFieldLabel(selectedLocale, 'caption')} ${index + 1}`}
                    onChange={(value) => {
                      const next = [...images];
                      next[index] = { ...image, caption: value };
                      setComponentPropValue(section.kind, 0, 'images', next);
                    }}
                    placeholder={getPublicPresenceFieldPlaceholder(selectedLocale, 'caption')}
                    value={String(image.caption ?? '')}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setComponentPropValue(section.kind, 0, 'images', [
                    ...images,
                    { alt: '', caption: '', url: '' },
                  ])
                }
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {copy.stageSections.addImage}
              </button>
            </>
          ) : null}
          {component?.type === 'VideoEmbed' ? (
            <div className="grid gap-4">
              <ControlledTextInput
                disabled
                label={getPublicPresenceFieldLabel(selectedLocale, 'title')}
                onChange={(value) => setComponentPropValue(section.kind, 0, 'title', value)}
                placeholder={copy.stageSections.titlePlaceholder}
                value={String(component.props.title ?? '')}
              />
              <ControlledTextInput
                disabled
                label={getPublicPresenceFieldLabel(selectedLocale, 'videoUrl')}
                onChange={(value) => setComponentPropValue(section.kind, 0, 'videoUrl', value)}
                placeholder={copy.stageSections.urlPlaceholder}
                value={String(component.props.videoUrl ?? '')}
              />
            </div>
          ) : null}
        </div>
      );
    }

    if (section.kind === 'goodsSupport') {
      const components = getSectionComponents().filter((component) => component.type === 'LinkButton');

      return (
        <div className="space-y-4">
          {components.length === 0 ? (
            <p className="text-sm text-slate-500">{copy.stageSections.noGoodsLinksYet}</p>
          ) : null}
          {components.map((component, index) => (
            <div key={component.id} className="grid gap-3 rounded-3xl border border-slate-200 bg-white/80 p-4">
              <ControlledTextInput
                label={`${getPublicPresenceFieldLabel(selectedLocale, 'label')} ${index + 1}`}
                onChange={(value) => setComponentPropValue(section.kind, index, 'label', value)}
                placeholder={copy.stageSections.actionLabelPlaceholder}
                value={String(component.props.label ?? '')}
              />
              <ControlledTextInput
                label={`${getPublicPresenceFieldLabel(selectedLocale, 'url')} ${index + 1}`}
                onChange={(value) => setComponentPropValue(section.kind, index, 'url', value)}
                placeholder={copy.stageSections.urlPlaceholder}
                value={String(component.props.url ?? '')}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => addComponentToSection(section.kind, 'LinkButton')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {copy.stageSections.addGoodsLink}
          </button>
        </div>
      );
    }

    if (section.kind === 'fanInteraction') {
      const component = getFirstComponent();

      if (!component || component.type !== 'MarshmallowWidget') {
        return (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => replaceSectionComponents(section.kind, [buildDefaultComponentForType('MarshmallowWidget')])}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
            >
              {copy.stageSections.addSection}
            </button>
          </div>
        );
      }

      return (
        <div className="grid gap-4">
          <ControlledTextInput
            disabled
            label={getPublicPresenceFieldLabel(selectedLocale, 'displayMode')}
            onChange={(value) => setComponentPropValue(section.kind, 0, 'displayMode', value)}
            placeholder={getPublicPresenceFieldPlaceholder(selectedLocale, 'displayMode')}
            value={String(component.props.displayMode ?? '')}
          />
          <ControlledTextInput
            disabled
            label={getPublicPresenceFieldLabel(selectedLocale, 'showRecentCount')}
            onChange={(value) => setComponentPropValue(section.kind, 0, 'showRecentCount', Number(value) || 0)}
            placeholder={copy.stageSections.recentCountExample}
            value={String(component.props.showRecentCount ?? '')}
          />
          <ControlledCheckbox
            checked={Boolean(component.props.showSubmitButton)}
            disabled
            label={getPublicPresenceFieldLabel(selectedLocale, 'showSubmitButton')}
            onChange={(checked) => setComponentPropValue(section.kind, 0, 'showSubmitButton', checked)}
          />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">{copy.stageSections.noTypedComponentYet}</p>
        {section.allowedComponents.map((component) => (
          <PublicPresenceBadge key={component} tone="slate" variant="outline">
            {component}
          </PublicPresenceBadge>
        ))}
      </div>
    );
  };

  const renderStagePanel = () => {
    if (!selectedStageSection || !stagePanel) {
      return (
        <PublicPresenceSurface className="space-y-3" variant="inset">
          <h2 className="text-lg font-semibold text-slate-950">
            {copy.stageSections.panelSummaryTitle}
          </h2>
          <p className="text-sm leading-6 text-slate-600">{copy.stageSections.description}</p>
        </PublicPresenceSurface>
      );
    }

    const sectionIssues = collectIssuesForSection(
      currentSnapshot,
      selectedStageSection.kind,
      selectedStageSectionDocument?.id ?? null,
    );
    const panelTitle =
      stagePanel.mode === 'edit'
        ? copy.stageSections.editorTitle
        : stagePanel.mode === 'configure'
          ? copy.stageSections.configureTitle
          : copy.stageSections.inspectTitle;

    return (
      <PublicPresenceSurface
        className="space-y-4"
        data-testid="stage-section-panel"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">{panelTitle}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <PublicPresenceBadge tone="rose">
                {getPublicPresenceStageSectionLabel(selectedLocale, selectedStageSection)}
              </PublicPresenceBadge>
              <PublicPresenceBadge
                tone={getIssueTone(sectionIssues)}
                variant="outline"
              >
                {copy.stageSections.issueCountPrefix} {sectionIssues.length}
              </PublicPresenceBadge>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStagePanel(null)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {copy.stageSections.closePanel}
          </button>
        </div>
        {stagePanel.mode === 'inspect' ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              {getPublicPresenceStageSectionPurpose(selectedLocale, selectedStageSection)}
            </p>
            <div className="flex flex-wrap gap-2">
              <PublicPresenceBadge tone="slate" variant="outline">
                {copy.stageSections.sectionStatePrefix}:{' '}
                {getPublicPresenceEditabilityStateLabel(
                  selectedLocale,
                  selectedStageSection.editabilityState,
                )}
              </PublicPresenceBadge>
              <PublicPresenceBadge tone="slate" variant="outline">
                {copy.stageSections.sourceSummaryPrefix}:{' '}
                {getPublicPresenceSourcePolicyLabel(
                  selectedLocale,
                  selectedStageSection.sourcePolicy,
                )}
              </PublicPresenceBadge>
              {selectedStageSection.sourcePolicy !== 'registryOwned' ? (
                <>
                  <PublicPresenceBadge tone="warning" variant="outline">
                    {copy.stageSections.sourceOwned}
                  </PublicPresenceBadge>
                  <PublicPresenceBadge tone="warning" variant="outline">
                    {copy.common.advancedOnly}
                  </PublicPresenceBadge>
                </>
              ) : null}
            </div>
            <div className="grid gap-3">
              {sectionIssues.length === 0 ? (
                <p className="text-sm text-slate-500">{copy.reviewPublish.noIssues}</p>
              ) : (
                sectionIssues.map((issue) => (
                  <PublicPresenceSurface key={issue.id} className="space-y-2" variant="inset">
                    <div className="flex flex-wrap items-center gap-2">
                      <PublicPresenceBadge tone={issue.severity === 'info' ? 'info' : 'warning'}>
                        {copy.stageSections.issueSeverityPrefix}: {issue.severity}
                      </PublicPresenceBadge>
                    </div>
                    <p className="text-sm leading-6 text-slate-600">
                      {copy.stageSections.issueSummaryPrefix}:{' '}
                      {getIssueSummaryCopy(selectedLocale, issue)}
                    </p>
                  </PublicPresenceSurface>
                ))
              )}
            </div>
          </div>
        ) : null}
        {stagePanel.mode === 'configure' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {selectedStageSection.phaseVisibility.map((phase) => (
                <PublicPresenceBadge key={phase} tone="slate" variant="outline">
                  {copy.stageSections.phasePrefix}{' '}
                  {getPublicPresencePreviewPhaseLabel(
                    selectedLocale,
                    phase as PublicPresencePhaseVisibility,
                  )}
                </PublicPresenceBadge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => moveSection(selectedStageSection.kind, 'up')}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
                {copy.stageSections.moveUp}
              </button>
              <button
                type="button"
                onClick={() => moveSection(selectedStageSection.kind, 'down')}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
                {copy.stageSections.moveDown}
              </button>
              <button
                type="button"
                onClick={() => removeSection(selectedStageSection.kind)}
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
              >
                {copy.stageSections.removeSection}
              </button>
            </div>
          </div>
        ) : null}
        {stagePanel.mode === 'edit' ? renderStructuredSectionEditor(selectedStageSection) : null}
      </PublicPresenceSurface>
    );
  };

  return (
    <PublicPresenceShell decorationDensity="calm">
      <div className="space-y-6">
        <PublicPresenceSurface className="space-y-5 overflow-visible">
          <div className="flex flex-wrap items-center gap-3">
            <PublicPresenceBadge icon={<Sparkles />} tone="rose">
              {copy.header.badge}
            </PublicPresenceBadge>
            <PublicPresenceBadge tone="slate" variant="outline">
              {workspaceLabel}
            </PublicPresenceBadge>
            {workspace?.draftVersion ? (
              <PublicPresenceBadge tone={getValidationTone(currentSnapshot)}>
                {formatPublicPresenceStudioValidationSummary(
                  selectedLocale,
                  currentSnapshot?.issueCounts ?? null,
                )}
              </PublicPresenceBadge>
            ) : null}
            {workspace?.draftVersion ? (
              <PublicPresenceBadge tone={hasUnsavedDraftChanges ? 'warning' : 'success'} variant="outline">
                {hasUnsavedDraftChanges ? copy.common.unsaved : copy.common.saved}
              </PublicPresenceBadge>
            ) : null}
          </div>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                {copy.header.title}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                {copy.header.description}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <SummaryCard
                hint={copy.header.draftSourceHint}
                label={copy.header.draftSourceLabel}
                value={workspace?.draftVersion ? copy.common.publicPresence : copy.common.notInitialized}
              />
              <SummaryCard
                hint={copy.header.legacyCompatibilityHint}
                label={copy.header.legacyCompatibilityLabel}
                value={copy.common.advancedOnly}
              />
            </div>
          </div>
          {notice ? (
            <div
              role={notice.tone === 'success' ? 'status' : 'alert'}
              className={`rounded-3xl border px-4 py-3 text-sm ${
                notice.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {notice.message}
            </div>
          ) : null}
        </PublicPresenceSurface>

        {loading ? (
          <PublicPresenceStateView
            description={copy.state.loadingDescription}
            icon={<RefreshCcw className="animate-spin" />}
            title={copy.state.loadingTitle}
            tone="info"
          />
        ) : error ? (
          <PublicPresenceStateView
            description={error}
            icon={<AlertCircle />}
            title={copy.state.unavailableTitle}
            tone="error"
          />
        ) : !workspace ? null : !workspace.draftVersion ? (
          <EmptyWorkspaceState
            copy={copy}
            locale={selectedLocale}
            onBootstrap={handleBootstrap}
            pendingTemplateId={pendingTemplateId}
            templates={workspace.templates}
          />
        ) : (
          <div className="space-y-6">
            <div
              aria-label={copy.common.studioSectionsLabel}
              className="flex flex-wrap gap-2"
              role="tablist"
            >
              {STUDIO_TABS.map((tab) => (
                <button
                  key={tab.id}
                  aria-selected={activeTab === tab.id}
                  role="tab"
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'border-rose-300 bg-rose-50 text-rose-700'
                      : 'border-slate-200 bg-white/85 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center [&>svg]:h-4 [&>svg]:w-4">
                    {tab.icon}
                  </span>
                  <span>{getPublicPresenceStudioTabLabel(selectedLocale, tab.id)}</span>
                </button>
              ))}
            </div>

            {activeTab === 'overview' ? (
              <div className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-4">
                  <SummaryCard
                    hint={copy.overview.templateHint}
                    label={copy.overview.templateLabel}
                    value={
                      currentTemplate
                        ? getPublicPresenceTemplateLabel(selectedLocale, currentTemplate)
                        : workspace.draftVersion.document.templateId
                    }
                  />
                  <SummaryCard
                    hint={copy.overview.draftVersionHint}
                    label={copy.overview.draftVersionLabel}
                    value={`v${workspace.draftVersion.versionNumber}`}
                  />
                  <SummaryCard
                    hint={copy.overview.lastSavedHint}
                    label={copy.overview.lastSavedLabel}
                    value={formatDateTime(selectedLocale, workspace.draftVersion.updatedAt)}
                  />
                  <SummaryCard
                    hint={copy.overview.liveVersionHint}
                    label={copy.overview.liveVersionLabel}
                    value={
                      workspace.liveVersion
                        ? `v${workspace.liveVersion.versionNumber}`
                        : copy.common.notPublished
                    }
                  />
                  <SummaryCard
                    hint={copy.overview.livePathHint}
                    label={copy.overview.livePathLabel}
                    value={workspacePublicPath}
                  />
                </div>
                <PublicPresenceSurface className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <PublicPresenceBadge icon={<ShieldCheck />} tone={getValidationTone(currentSnapshot)}>
                      {copy.reviewPublish.readinessTitle}
                    </PublicPresenceBadge>
                    <PublicPresenceBadge tone="slate" variant="outline">
                      {getPublicPresenceDocumentStateLabel(selectedLocale, currentDocumentState)}
                    </PublicPresenceBadge>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">
                    {copy.reviewPublish.readinessDescription}
                  </p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <SummaryCard
                      hint={copy.reviewPublish.fatalHint}
                      label={copy.reviewPublish.fatalLabel}
                      value={String(currentSnapshot?.issueCounts.fatal ?? 0)}
                    />
                    <SummaryCard
                      hint={copy.reviewPublish.blockerHint}
                      label={copy.reviewPublish.blockerLabel}
                      value={String(currentSnapshot?.issueCounts.blocker ?? 0)}
                    />
                    <SummaryCard
                      hint={copy.reviewPublish.warningHint}
                      label={copy.reviewPublish.warningLabel}
                      value={String(currentSnapshot?.issueCounts.warning ?? 0)}
                    />
                  </div>
                </PublicPresenceSurface>
              </div>
            ) : null}

            {activeTab === 'stageSections' ? (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
                <PublicPresenceSurface className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-slate-950">
                      {copy.stageSections.title}
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      {copy.stageSections.description}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {orderedSections.map((section) => {
                      const sectionDocument = getCurrentSectionDocument(editorDocument, section.kind);
                      const issues = collectIssuesForSection(
                        currentSnapshot,
                        section.kind,
                        sectionDocument?.id ?? null,
                      );
                      const summaryValue = buildStageSectionSummary(editorDocument, section);

                      return (
                        <div
                          key={section.kind}
                          className="rounded-3xl border border-slate-200 bg-white/90 px-4 py-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <PublicPresenceBadge tone="rose">
                                  {getPublicPresenceStageSectionLabel(selectedLocale, section)}
                                </PublicPresenceBadge>
                                <PublicPresenceBadge tone="slate" variant="outline">
                                  {sectionDocument
                                    ? copy.stageSections.presentInDraft
                                    : copy.stageSections.missingFromDraft}
                                </PublicPresenceBadge>
                                <PublicPresenceBadge
                                  tone={getIssueTone(issues)}
                                  variant="outline"
                                >
                                  {copy.stageSections.issueCountPrefix} {issues.length}
                                </PublicPresenceBadge>
                              </div>
                              <h3 className="text-base font-semibold text-slate-950">
                                {getPublicPresenceStageSectionPurpose(selectedLocale, section)}
                              </h3>
                              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                <span>
                                  {copy.stageSections.sourceSummaryPrefix}:{' '}
                                  {getPublicPresenceSourcePolicyLabel(
                                    selectedLocale,
                                    section.sourcePolicy,
                                  )}
                                </span>
                                {summaryValue ? (
                                  <span>
                                    {copy.stageSections.summaryPrefix}: {summaryValue}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  ensureSectionExists(section);
                                  setStagePanel({ mode: 'edit', sectionKind: section.kind });
                                }}
                                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                              >
                                {copy.stageSections.editAction} {getPublicPresenceStageSectionLabel(selectedLocale, section)}
                              </button>
                              <button
                                type="button"
                                onClick={() => setStagePanel({ mode: 'configure', sectionKind: section.kind })}
                                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                              >
                                {copy.stageSections.configureAction} {getPublicPresenceStageSectionLabel(selectedLocale, section)}
                              </button>
                              <button
                                type="button"
                                onClick={() => setStagePanel({ mode: 'inspect', sectionKind: section.kind })}
                                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                              >
                                {copy.stageSections.inspectAction} {getPublicPresenceStageSectionLabel(selectedLocale, section)}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        void handleSaveVisualDocument();
                      }}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? (
                        <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Save className="h-4 w-4" aria-hidden="true" />
                      )}
                      {copy.stageSections.saveButton}
                    </button>
                  </div>
                </PublicPresenceSurface>
                {renderStagePanel()}
              </div>
            ) : null}

            {activeTab === 'personaKit' ? (
              <PublicPresenceSurface className="space-y-5">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-slate-950">
                    {copy.personaKit.title}
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    {copy.personaKit.description}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
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
                  <div className="md:col-span-2">
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
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void handleSaveVisualDocument();
                  }}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden="true" />
                  )}
                  {copy.personaKit.saveButton}
                </button>
              </PublicPresenceSurface>
            ) : null}

            {activeTab === 'fanPreview' ? (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
                <PublicPresenceSurface className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <PublicPresenceBadge icon={<Eye />} tone="rose">
                      {copy.fanPreview.badge}
                    </PublicPresenceBadge>
                    <PublicPresenceBadge tone="slate" variant="outline">
                      {copy.fanPreview.sharedPathBadge}
                    </PublicPresenceBadge>
                  </div>
                  <p className="text-sm leading-7 text-slate-600">
                    {copy.fanPreview.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {PREVIEW_VIEWPORTS.map((viewport) => (
                      <button
                        key={viewport.id}
                        type="button"
                        onClick={() => setPreviewViewport(viewport.id)}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                          previewViewport === viewport.id
                            ? 'border-rose-300 bg-rose-50 text-rose-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {viewport.id === 'desktop'
                          ? copy.fanPreview.desktopMode
                          : copy.fanPreview.mobileMode}
                      </button>
                    ))}
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="font-semibold">{copy.fanPreview.simulatePhase}</span>
                      <select
                        value={previewPhase}
                        onChange={(event) =>
                          setPreviewPhase(
                            event.target.value as PublicPresencePhaseVisibility | 'current',
                          )
                        }
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-rose-300"
                      >
                        {previewPhaseOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {hasUnsavedDraftChanges ? (
                    <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {copy.fanPreview.unsavedWarning}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      {copy.fanPreview.savedState}
                    </div>
                  )}
                  {previewError ? (
                    <PublicPresenceStateView
                      description={previewError}
                      title={copy.state.previewUnavailableTitle}
                      tone="error"
                    />
                  ) : previewLoading && !previewProjection ? (
                    <PublicPresenceStateView
                      description={copy.state.previewLoadingDescription}
                      icon={<RefreshCcw className="animate-spin" />}
                      title={copy.state.previewLoadingTitle}
                      tone="info"
                    />
                  ) : previewProjection ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <span>{copy.fanPreview.frameHint}</span>
                        <PublicPresenceBadge tone="slate" variant="outline">
                          {copy.fanPreview.resolvedPhaseLabel}:{' '}
                          {getPublicPresencePreviewPhaseLabel(
                            selectedLocale,
                            previewProjection.resolvedRevealPhase,
                          )}
                        </PublicPresenceBadge>
                      </div>
                      <div
                        aria-label={copy.fanPreview.frameLabel}
                        className={`overflow-hidden rounded-[2rem] border border-slate-200 bg-white/80 p-3 sm:p-4 ${viewportFrameClass}`}
                      >
                        <PublicHomepageProjectionRenderer projection={previewProjection} />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <PublicPresenceSurface className="space-y-2" variant="inset">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {copy.fanPreview.fallbacksLabel}
                          </h3>
                          <p className="text-sm leading-6 text-slate-600">
                            {copy.fanPreview.fallbacksHint}
                          </p>
                          <p className="text-sm leading-6 text-slate-900">
                            {previewProjection.fallbackDecisions?.length ?? 0}
                          </p>
                        </PublicPresenceSurface>
                        <PublicPresenceSurface className="space-y-2" variant="inset">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {copy.fanPreview.resolvedPhaseLabel}
                          </h3>
                          <p className="text-sm leading-6 text-slate-600">
                            {copy.fanPreview.resolvedPhaseHint}
                          </p>
                          <p className="text-sm leading-6 text-slate-900">
                            {getPublicPresencePreviewPhaseLabel(
                              selectedLocale,
                              previewProjection.resolvedRevealPhase,
                            )}
                          </p>
                        </PublicPresenceSurface>
                      </div>
                    </div>
                  ) : (
                    <PublicPresenceStateView
                      description={copy.state.previewWaitingDescription}
                      title={copy.state.previewWaitingTitle}
                      tone="info"
                    />
                  )}
                </PublicPresenceSurface>
                <PublicPresenceSurface className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-slate-950">
                      {copy.fanPreview.previewInspectorTitle}
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      {copy.fanPreview.selectedSectionEmpty}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {copy.fanPreview.previewSectionsTitle}
                    </h3>
                    {previewProjection?.sections.length ? (
                      previewProjection.sections.map((section) => (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => setSelectedPreviewSectionId(section.id)}
                          className={`w-full rounded-3xl border px-4 py-3 text-left transition ${
                            selectedPreviewSectionId === section.id
                              ? 'border-rose-300 bg-rose-50'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <PublicPresenceBadge tone="rose">
                              {getPublicPresenceStageSectionLabel(selectedLocale, section)}
                            </PublicPresenceBadge>
                            <PublicPresenceBadge tone="slate" variant="outline">
                              {copy.fanPreview.validationMarkersPrefix} {section.validationIssueIds.length}
                            </PublicPresenceBadge>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="text-sm leading-6 text-slate-600">
                        {copy.fanPreview.noSections}
                      </p>
                    )}
                  </div>
                  {selectedPreviewSection ? (
                    <PublicPresenceSurface className="space-y-3" variant="inset">
                      <div className="flex flex-wrap items-center gap-2">
                        <PublicPresenceBadge tone="rose">
                          {copy.fanPreview.selectedSectionLabel}
                        </PublicPresenceBadge>
                        <PublicPresenceBadge tone="slate" variant="outline">
                          {getPublicPresenceStageSectionLabel(selectedLocale, selectedPreviewSection)}
                        </PublicPresenceBadge>
                      </div>
                      <p className="text-sm leading-6 text-slate-600">
                        {copy.fanPreview.validationMarkersPrefix}: {selectedPreviewSection.validationIssueIds.length}
                      </p>
                      {selectedPreviewSection.fallbackBehavior === 'lockedSourceOwned' ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          {copy.fanPreview.lockedOverlay}
                        </div>
                      ) : null}
                    </PublicPresenceSurface>
                  ) : null}
                </PublicPresenceSurface>
              </div>
            ) : null}

            {activeTab === 'reviewPublish' ? (
              <div className="space-y-4">
                <PublicPresenceSurface className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-slate-950">
                      {copy.reviewPublish.readinessTitle}
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      {copy.reviewPublish.readinessDescription}
                    </p>
                  </div>
                  {hasUnsavedDraftChanges ? (
                    <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {copy.reviewPublish.unsavedChangesHint}
                    </div>
                  ) : null}
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                      hint={copy.reviewPublish.fatalHint}
                      label={copy.reviewPublish.fatalLabel}
                      value={String(currentSnapshot?.issueCounts.fatal ?? 0)}
                    />
                    <SummaryCard
                      hint={copy.reviewPublish.blockerHint}
                      label={copy.reviewPublish.blockerLabel}
                      value={String(currentSnapshot?.issueCounts.blocker ?? 0)}
                    />
                    <SummaryCard
                      hint={copy.reviewPublish.warningHint}
                      label={copy.reviewPublish.warningLabel}
                      value={String(currentSnapshot?.issueCounts.warning ?? 0)}
                    />
                    <SummaryCard
                      hint={copy.reviewPublish.infoHint}
                      label={copy.reviewPublish.infoLabel}
                      value={String(currentSnapshot?.issueCounts.info ?? 0)}
                    />
                  </div>
                </PublicPresenceSurface>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <PublicPresenceSurface className="space-y-4">
                    <div className="space-y-2">
                      <h2 className="text-lg font-semibold text-slate-950">
                        {copy.reviewPublish.actionsTitle}
                      </h2>
                      <p className="text-sm leading-6 text-slate-600">
                        {copy.reviewPublish.actionsDescription}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => {
                          void runWorkflowAction(
                            'submit',
                            copy.notices.submitSuccess,
                            () =>
                              submitPublicPresenceForReview(
                                request,
                                talentId,
                                currentDraftHash,
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
                          void runWorkflowAction(
                            'approve',
                            copy.notices.approveSuccess,
                            () =>
                              approvePublicPresenceReview(
                                request,
                                talentId,
                                currentDraftHash,
                              ),
                          );
                        }}
                        disabled={isWorkflowActionDisabled || !['inReview', 'changesRequested'].includes(currentDocumentState)}
                        className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {workflowAction === 'approve'
                          ? copy.reviewPublish.approvePending
                          : copy.reviewPublish.approve}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void runWorkflowAction(
                            'publish',
                            copy.notices.publishSuccess,
                            () =>
                              publishPublicPresenceNow(
                                request,
                                talentId,
                                currentDraftHash,
                              ),
                          );
                        }}
                        disabled={isWorkflowActionDisabled || !['approved', 'scheduled'].includes(currentDocumentState)}
                        className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {workflowAction === 'publish'
                          ? copy.reviewPublish.publishPending
                          : copy.reviewPublish.publishNow}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
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
                      <button
                        type="button"
                        onClick={() => {
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
                                },
                              ),
                          );
                        }}
                        disabled={isWorkflowActionDisabled || currentDocumentState !== 'approved'}
                        className="rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {workflowAction === 'schedule'
                          ? copy.reviewPublish.schedulePending
                          : copy.reviewPublish.schedulePublish}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void runWorkflowAction(
                            'cancelSchedule',
                            copy.notices.cancelScheduleSuccess,
                            () =>
                              cancelPublicPresenceSchedule(
                                request,
                                talentId,
                                currentDraftHash,
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
                    <div className="grid gap-4 md:grid-cols-2">
                      <ControlledTextArea
                        label={copy.reviewPublish.reviewNote}
                        onChange={setReviewComment}
                        value={reviewComment}
                      />
                      <label className="block space-y-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {copy.reviewPublish.scheduleField}
                        </span>
                        <input
                          type="datetime-local"
                          value={scheduledFor}
                          onChange={(event) => setScheduledFor(event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-rose-300"
                        />
                        <p className="text-xs leading-5 text-slate-500">
                          {copy.reviewPublish.schedulingHint}
                        </p>
                      </label>
                    </div>
                  </PublicPresenceSurface>

                  <PublicPresenceSurface className="space-y-4">
                    <div className="space-y-2">
                      <h2 className="text-lg font-semibold text-slate-950">
                        {copy.reviewPublish.changeSummaryTitle}
                      </h2>
                      <p className="text-sm leading-6 text-slate-600">
                        {copy.reviewPublish.historyHint}
                      </p>
                    </div>
                    <SummaryCard
                      hint={copy.reviewPublish.draftVersionPrefix}
                      label={copy.reviewPublish.versionPrefix}
                      value={`v${workspace.draftVersion.versionNumber}`}
                    />
                    <SummaryCard
                      hint={copy.reviewPublish.liveVersionPrefix}
                      label={copy.reviewPublish.rollbackTitle}
                      value={workspace.liveVersion ? `v${workspace.liveVersion.versionNumber}` : copy.common.notPublished}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void runWorkflowAction(
                          'rollback',
                          copy.notices.rollbackSuccess,
                          () =>
                            createPublicPresenceRollbackDraft(
                              request,
                              talentId,
                              workspace.liveVersion?.id ?? null,
                            ),
                        );
                      }}
                      disabled={isWorkflowActionDisabled || !workspace.liveVersion}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {workflowAction === 'rollback'
                        ? copy.reviewPublish.rollbackPending
                        : copy.reviewPublish.rollback}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReviewHistory((current) => !current)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      {copy.reviewPublish.reviewHistoryToggle}
                    </button>
                  </PublicPresenceSurface>
                </div>

                {showReviewHistory ? (
                  <PublicPresenceSurface className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-950">
                      {copy.reviewPublish.workflowEventsTitle}
                    </h2>
                    {workspace.workflowEvents.length === 0 ? (
                      <p className="text-sm leading-6 text-slate-600">
                        {copy.reviewPublish.workflowEventsEmpty}
                      </p>
                    ) : (
                      <div className="grid gap-3">
                        {workspace.workflowEvents.map((event) => (
                          <PublicPresenceSurface key={event.id} className="space-y-2" variant="inset">
                            <div className="flex flex-wrap items-center gap-2">
                              <PublicPresenceBadge tone="slate">
                                {getPublicPresenceWorkflowEventLabel(
                                  selectedLocale,
                                  event.eventType,
                                )}
                              </PublicPresenceBadge>
                              {event.toDocumentState ? (
                                <PublicPresenceBadge tone="slate" variant="outline">
                                  {getPublicPresenceDocumentStateLabel(
                                    selectedLocale,
                                    event.fromDocumentState
                                      ?? copy.reviewPublish.transitionFallback,
                                  )}{' '}
                                  {'->'}{' '}
                                  {getPublicPresenceDocumentStateLabel(
                                    selectedLocale,
                                    event.toDocumentState,
                                  )}
                                </PublicPresenceBadge>
                              ) : null}
                              <PublicPresenceBadge tone="slate" variant="outline">
                                {formatDateTime(selectedLocale, event.occurredAt)}
                              </PublicPresenceBadge>
                            </div>
                            <p className="text-sm leading-6 text-slate-600">
                              {copy.reviewPublish.proofPrefix}{' '}
                              {event.contentHash?.slice(0, 12) ?? copy.common.na}
                            </p>
                          </PublicPresenceSurface>
                        ))}
                      </div>
                    )}
                  </PublicPresenceSurface>
                ) : null}
              </div>
            ) : null}

            {activeTab === 'advanced' ? (
              <div className="space-y-4">
                <PublicPresenceSurface className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-slate-950">
                      {copy.advanced.title}
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      {copy.advanced.description}
                    </p>
                  </div>
                  <textarea
                    value={sourceText}
                    onChange={(event) => setSourceText(event.target.value)}
                    spellCheck={false}
                    aria-label={copy.common.sourceSchemaLabel}
                    className="min-h-[28rem] w-full rounded-[2rem] border border-slate-200 bg-slate-950 px-5 py-5 font-mono text-sm leading-6 text-slate-100 outline-none ring-0 transition focus:border-rose-300"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {copy.advanced.draftUpdatedPrefix}{' '}
                      {formatDateTime(selectedLocale, workspace.draftVersion.updatedAt)}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        void handleSaveSourceDocument();
                      }}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? (
                        <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Save className="h-4 w-4" aria-hidden="true" />
                      )}
                      {copy.advanced.saveButton}
                    </button>
                  </div>
                </PublicPresenceSurface>

                <PublicPresenceSurface className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-slate-950">
                      {copy.advanced.validationDetailsTitle}
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      {copy.advanced.validationDetailsDescription}
                    </p>
                  </div>
                  <pre className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-950/95 p-4 text-xs leading-6 text-slate-100">
                    {JSON.stringify(currentSnapshot, null, 2)}
                  </pre>
                </PublicPresenceSurface>

                <PublicPresenceSurface className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-slate-950">
                      {copy.advanced.migrationToolsTitle}
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      {copy.advanced.migrationToolsDescription}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMigrationTools((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <ClipboardList className="h-4 w-4" aria-hidden="true" />
                    {showMigrationTools
                      ? copy.advanced.closeMigrationTools
                      : copy.advanced.openMigrationTools}
                  </button>
                  {showMigrationTools ? (
                    <HomepageManagementScreen tenantId={tenantId} talentId={talentId} />
                  ) : null}
                </PublicPresenceSurface>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </PublicPresenceShell>
  );
}

export function PublicPresenceStudioScreen(props: Readonly<{ talentId: string; tenantId: string }>) {
  return <PublicPresenceStudioScreenInner {...props} />;
}
