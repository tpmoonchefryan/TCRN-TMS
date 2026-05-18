import type {
  PublicPresenceDocument,
  PublicPresencePhaseVisibility,
  PublicPresenceProjection,
  PublicPresenceValidationSnapshot,
} from '@tcrn/shared';

export interface PublicPresenceStudioTemplateSummary {
  defaultSectionOrder: string[];
  label: string;
  optionalSections: string[];
  recommendedSections: string[];
  requiredSections: string[];
  templateId: string;
  useCase: string;
}

export interface PublicPresenceStudioStageSectionSummary {
  allowedComponents: string[];
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
  templateId: string;
  updatedAt: string;
  validationSnapshot: PublicPresenceValidationSnapshot | null;
  versionNumber: number;
}

export interface PublicPresenceStudioPageVersionSummary {
  latestVersion: PublicPresenceStudioVersionSummary | null;
  liveVersion: PublicPresenceStudioVersionSummary | null;
  revealAutoSwitchAt: string | null;
  scheduledVersion: PublicPresenceStudioVersionSummary | null;
  templateId: string;
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
  selectedTemplateId: string;
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
