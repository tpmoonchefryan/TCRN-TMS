import type {
  PublicPresenceDocument,
  PublicPresencePhaseVisibility,
  PublicPresenceProjection,
  PublicPresenceTemplateId,
  PublicPresenceValidationSnapshot,
} from '@tcrn/shared';

export interface PublicPresenceStudioTemplateSummary {
  defaultSectionOrder: string[];
  label: string;
  optionalSections: string[];
  recommendedSections: string[];
  requiredSections: string[];
  templateId: PublicPresenceTemplateId;
  useCase: string;
}

export interface PublicPresenceStudioStageSectionSummary {
  allowedComponents: string[];
  collectionOperations: Array<{
    addLabel: string;
    canAdd: boolean;
    canRemove: boolean;
    canReorder: boolean;
    collectionKey: string;
    disabledReason?: string | null;
    itemLabel: string;
    maxItems?: number;
    minItems?: number;
    removeLabel: string;
    reorderLabel: string;
  }>;
  editabilityState: string;
  fallbackBehavior: string;
  fieldDefinitions: Array<{
    fieldKey: string;
    provenance: string[];
    required: string;
    sourceOnly: boolean;
    valueType: string;
    visualEditable: boolean;
  }>;
  kind: string;
  phaseVisibility: string[];
  purpose: string;
  sourcePolicy: string;
}

export interface PublicPresenceStudioVersionSummary {
  contentHash: string;
  contentHashAlgorithm: string;
  createdAt: string;
  document: PublicPresenceDocument;
  documentSchemaVersion: string;
  documentState: string;
  id: string;
  lastValidationSnapshotId: string | null;
  publishedAt: string | null;
  scheduledFor: string | null;
  templateId: PublicPresenceTemplateId;
  updatedAt: string;
  validationSnapshot: PublicPresenceValidationSnapshot | null;
  versionNumber: number;
}

export interface PublicPresenceStudioPageVersionSummary {
  latestVersion: PublicPresenceStudioVersionSummary | null;
  liveVersion: PublicPresenceStudioVersionSummary | null;
  revealAutoSwitchAt: string | null;
  scheduledVersion: PublicPresenceStudioVersionSummary | null;
  templateId: PublicPresenceTemplateId;
}

export type PublicPresenceStudioReleaseDependencyNextAction =
  | 'none'
  | 'startActiveTalentHubDraft'
  | 'openActiveTalentHubDraft'
  | 'openActiveTalentHubReview';

export interface PublicPresenceStudioReleaseDependency {
  blocksPublish: boolean;
  id: string;
  messageKey: string;
  nextAction: PublicPresenceStudioReleaseDependencyNextAction;
  revealAutoSwitchAt: string;
  severity: 'blocker' | 'info';
  status: 'blocked' | 'ready';
  suggestedFix: string;
  targetTemplateId: PublicPresenceTemplateId;
  targetVersionId: string | null;
  targetVersionState: string | null;
  templateId: PublicPresenceTemplateId;
}

export interface PublicPresenceStudioWorkspaceResponse {
  draftVersion: PublicPresenceStudioVersionSummary | null;
  liveVersion: PublicPresenceStudioVersionSummary | null;
  liveTemplateId: string | null;
  pageVersions: PublicPresenceStudioPageVersionSummary[];
  portal: {
    createdAt: string;
    draftVersionId: string | null;
    id: string;
    lastValidatedAt: string | null;
    latestValidationState: string | null;
    latestVersionNumber: number;
    liveVersionId: string | null;
    talentId: string;
    updatedAt: string;
    version: number;
  } | null;
  publicRoute: {
    canonicalPath: string;
    domainHostname: string | null;
    legacyPath: string | null;
    talentCode: string;
    tenantCode: string;
  } | null;
  releaseReadiness?: {
    blockingDependencyCount: number;
    dependencies: PublicPresenceStudioReleaseDependency[];
  };
  selectedTemplateId: PublicPresenceTemplateId;
  stageSections: PublicPresenceStudioStageSectionSummary[];
  templates: PublicPresenceStudioTemplateSummary[];
  workflowEvents: Array<{
    actorId: string | null;
    contentHash: string | null;
    eventType: string;
    fromDocumentState: string | null;
    id: string;
    occurredAt: string;
    payload: Record<string, unknown>;
    toDocumentState: string | null;
    versionId: string | null;
  }>;
}

export type PublicPresenceAuthoringArtifactKind = 'component' | 'template';
export type PublicPresenceAuthoringArtifactStatus = 'draft' | 'submitted' | 'validated';
export type PublicPresenceAuthoringValidationState = 'ready' | 'unvalidated' | 'warning';
export type PublicPresenceAuthoringFileKind = 'code' | 'doc' | 'fixture' | 'schema';

export interface PublicPresenceAuthoringFile {
  contents: string;
  kind: PublicPresenceAuthoringFileKind;
  language: string;
  path: string;
}

export interface PublicPresenceAuthoringValidationSummary {
  issueCount: number;
  passCount: number;
  warnCount: number;
}

export interface PublicPresenceAuthoringDraftSummary {
  artifactKind: PublicPresenceAuthoringArtifactKind;
  artifactStatus: PublicPresenceAuthoringArtifactStatus;
  id: string;
  lastSavedAt: string;
  lastValidatedAt: string | null;
  subjectKey: string;
  submittedAt: string | null;
  updatedAt: string;
  validationState: PublicPresenceAuthoringValidationState;
}

export interface PublicPresenceAuthoringDraftResponse
  extends PublicPresenceAuthoringDraftSummary {
  sourceBundle: PublicPresenceAuthoringFile[];
  validationSummary: PublicPresenceAuthoringValidationSummary;
  version: number;
}

type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

function appendTemplateId(
  path: string,
  templateId?: string | null,
  extraParams?: URLSearchParams,
) {
  const params = extraParams ?? new URLSearchParams();

  if (templateId) {
    params.set('templateId', templateId);
  }

  const query = params.toString();

  return query ? `${path}?${query}` : path;
}

export function readPublicPresenceWorkspace(
  request: RequestFn,
  talentId: string,
  templateId?: string | null,
) {
  return request<PublicPresenceStudioWorkspaceResponse>(
    appendTemplateId(`/api/v1/talents/${talentId}/public-presence`, templateId),
  );
}

export function bootstrapPublicPresenceWorkspace(
  request: RequestFn,
  talentId: string,
  templateId: string,
) {
  return request<PublicPresenceStudioWorkspaceResponse>(
    `/api/v1/talents/${talentId}/public-presence/bootstrap`,
    {
      body: JSON.stringify({ templateId }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  );
}

export function savePublicPresenceWorkspaceDraft(
  request: RequestFn,
  talentId: string,
  input: {
    document: PublicPresenceDocument;
    expectedCurrentContentHash?: string | null;
  },
) {
  return request<PublicPresenceStudioWorkspaceResponse>(
    `/api/v1/talents/${talentId}/public-presence/draft`,
    {
      body: JSON.stringify(input),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    },
  );
}

export function readPublicPresenceDraftPreview(
  request: RequestFn,
  talentId: string,
  phase: PublicPresencePhaseVisibility | 'current' = 'current',
  templateId?: string | null,
) {
  const params = new URLSearchParams();

  if (phase !== 'current') {
    params.set('phase', phase);
  }

  return request<PublicPresenceProjection>(
    appendTemplateId(`/api/v1/talents/${talentId}/public-presence/preview`, templateId, params),
  );
}

export function submitPublicPresenceForReview(
  request: RequestFn,
  talentId: string,
  expectedCurrentContentHash?: string | null,
  templateId?: string | null,
) {
  return request<PublicPresenceStudioWorkspaceResponse>(
    `/api/v1/talents/${talentId}/public-presence/review/submit`,
    {
      body: JSON.stringify({ expectedCurrentContentHash, templateId }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  );
}

export function requestPublicPresenceChanges(
  request: RequestFn,
  talentId: string,
  input: {
    comment?: string | null;
    expectedCurrentContentHash?: string | null;
    templateId?: string | null;
  },
) {
  return request<PublicPresenceStudioWorkspaceResponse>(
    `/api/v1/talents/${talentId}/public-presence/review/request-changes`,
    {
      body: JSON.stringify(input),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  );
}

export function approvePublicPresenceReview(
  request: RequestFn,
  talentId: string,
  expectedCurrentContentHash?: string | null,
  templateId?: string | null,
) {
  return request<PublicPresenceStudioWorkspaceResponse>(
    `/api/v1/talents/${talentId}/public-presence/review/approve`,
    {
      body: JSON.stringify({ expectedCurrentContentHash, templateId }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  );
}

export function publishPublicPresenceNow(
  request: RequestFn,
  talentId: string,
  expectedCurrentContentHash?: string | null,
  templateId?: string | null,
) {
  return request<PublicPresenceStudioWorkspaceResponse>(
    `/api/v1/talents/${talentId}/public-presence/publish`,
    {
      body: JSON.stringify({ expectedCurrentContentHash, templateId }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  );
}

export function schedulePublicPresencePublish(
  request: RequestFn,
  talentId: string,
  input: {
    expectedCurrentContentHash?: string | null;
    scheduledFor: string;
    templateId?: string | null;
  },
) {
  return request<PublicPresenceStudioWorkspaceResponse>(
    `/api/v1/talents/${talentId}/public-presence/publish/schedule`,
    {
      body: JSON.stringify(input),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  );
}

export function cancelPublicPresenceSchedule(
  request: RequestFn,
  talentId: string,
  expectedCurrentContentHash?: string | null,
  templateId?: string | null,
) {
  return request<PublicPresenceStudioWorkspaceResponse>(
    `/api/v1/talents/${talentId}/public-presence/publish/cancel`,
    {
      body: JSON.stringify({ expectedCurrentContentHash, templateId }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  );
}

export function createPublicPresenceRollbackDraft(
  request: RequestFn,
  talentId: string,
  sourceVersionId?: string | null,
) {
  return request<PublicPresenceStudioWorkspaceResponse>(
    `/api/v1/talents/${talentId}/public-presence/rollback-draft`,
    {
      body: JSON.stringify({ sourceVersionId }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  );
}

function resolveAuthoringCollectionPath(
  talentId: string,
  artifactKind: PublicPresenceAuthoringArtifactKind,
) {
  return `/api/v1/talents/${talentId}/public-presence/authoring/${
    artifactKind === 'template' ? 'templates' : 'components'
  }`;
}

function appendSubjectKey(path: string, subjectKey?: string | null) {
  if (!subjectKey) {
    return path;
  }

  const params = new URLSearchParams();
  params.set('subjectKey', subjectKey);
  return `${path}?${params.toString()}`;
}

export function listPublicPresenceAuthoringDrafts(
  request: RequestFn,
  talentId: string,
  artifactKind: PublicPresenceAuthoringArtifactKind,
) {
  return request<PublicPresenceAuthoringDraftSummary[]>(
    resolveAuthoringCollectionPath(talentId, artifactKind),
  );
}

export function readPublicPresenceAuthoringDraft(
  request: RequestFn,
  talentId: string,
  artifactKind: PublicPresenceAuthoringArtifactKind,
  subjectKey?: string | null,
) {
  return request<PublicPresenceAuthoringDraftResponse | null>(
    appendSubjectKey(
      `${resolveAuthoringCollectionPath(talentId, artifactKind)}/current`,
      subjectKey,
    ),
  );
}

function writePublicPresenceAuthoringDraft(
  request: RequestFn,
  talentId: string,
  artifactKind: PublicPresenceAuthoringArtifactKind,
  pathSuffix: '' | '/submit' | '/validate',
  input: {
    sourceBundle: PublicPresenceAuthoringFile[];
    subjectKey?: string | null;
    validationSummary?: PublicPresenceAuthoringValidationSummary;
  },
  method: 'POST' | 'PUT',
) {
  return request<PublicPresenceAuthoringDraftResponse>(
    `${resolveAuthoringCollectionPath(talentId, artifactKind)}/current${pathSuffix}`,
    {
      body: JSON.stringify(input),
      headers: {
        'Content-Type': 'application/json',
      },
      method,
    },
  );
}

export function savePublicPresenceAuthoringDraft(
  request: RequestFn,
  talentId: string,
  artifactKind: PublicPresenceAuthoringArtifactKind,
  input: {
    sourceBundle: PublicPresenceAuthoringFile[];
    subjectKey?: string | null;
  },
) {
  return writePublicPresenceAuthoringDraft(
    request,
    talentId,
    artifactKind,
    '',
    input,
    'PUT',
  );
}

export function validatePublicPresenceAuthoringDraft(
  request: RequestFn,
  talentId: string,
  artifactKind: PublicPresenceAuthoringArtifactKind,
  input: {
    sourceBundle: PublicPresenceAuthoringFile[];
    subjectKey?: string | null;
    validationSummary?: PublicPresenceAuthoringValidationSummary;
  },
) {
  return writePublicPresenceAuthoringDraft(
    request,
    talentId,
    artifactKind,
    '/validate',
    input,
    'POST',
  );
}

export function submitPublicPresenceAuthoringDraft(
  request: RequestFn,
  talentId: string,
  artifactKind: PublicPresenceAuthoringArtifactKind,
  input: {
    sourceBundle: PublicPresenceAuthoringFile[];
    subjectKey?: string | null;
    validationSummary?: PublicPresenceAuthoringValidationSummary;
  },
) {
  return writePublicPresenceAuthoringDraft(
    request,
    talentId,
    artifactKind,
    '/submit',
    input,
    'POST',
  );
}
