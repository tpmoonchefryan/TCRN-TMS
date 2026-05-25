// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  createArtistLifecycleFlowSchema,
  ErrorCodes,
  PUBLIC_PRESENCE_DOCUMENT_SCHEMA_VERSION,
  type ArtistLifecycleFlow,
  type HomepageComponentType,
  type LocalizedText,
  type PublicPresenceAssetListEntry,
  type PublicPresenceAssetRevisionPin,
  type PublicPresenceComponentDefinition,
  type PublicPresenceTemplateAssetManifest,
  type PublicPresenceDocument,
  PublicPresenceDocumentSchema,
  type PublicPresenceFieldProvenance,
  type PublicPresenceFieldValue,
  type PublicPresencePhaseVisibility,
  type PublicPresenceStageSectionDefinition,
  type PublicPresenceStageSectionKind,
  type PublicPresenceTemplateDefinition,
  type PublicPresenceTemplateId,
  type PublicPresenceTemplateTypeCode,
  PublicPresenceTemplateIdSchema,
  type PublicPresenceValidationSnapshot,
  PublicPresenceValidationSnapshotSchema,
  type RequestContext,
  resolvePublicPresenceTemplateTypeCode,
} from '@tcrn/shared';

import {
  readComponentSourceManifestFromAssetEntry,
  readTemplateSourceManifestFromAssetEntry,
  readTemplateSourceManifestFromPin,
} from '../domain/public-presence-asset-runtime.policy';
import type {
  PublicPresenceDocumentVersionRecord,
  PublicPresencePortalRecord,
  PublicPresenceValidationSnapshotRecord,
} from '../domain/public-presence-foundation.policy';
import { HomepageAdminRepository } from '../infrastructure/homepage-admin.repository';
import { PublicPresenceFoundationRepository } from '../infrastructure/public-presence-foundation.repository';
import { PublicPresenceAssetService } from './public-presence-asset.service';
import { PublicPresenceFoundationService } from './public-presence-foundation.service';
import {
  buildStudioReleaseReadinessSummary,
  extractRevealAutoSwitchAt,
  type PublicPresenceStudioReleaseDependency,
} from './public-presence-release-readiness';

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

export interface PublicPresenceStudioComponentSummary {
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
  componentType: HomepageComponentType;
  defaultProps: Record<string, unknown>;
  fieldDefinitions: Array<{
    fieldKey: string;
    provenance: string[];
    required: string;
    sourceOnly: boolean;
    valueType: string;
    visualEditable: boolean;
  }>;
  lockedSourceOwnedPolicy: string;
  rendererSupport: boolean;
  sourcePolicy: string;
  unknownFieldPolicy: string;
  visualSupport: string;
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
  templateAssetPin: PublicPresenceAssetRevisionPin | null;
  templateId: string;
  updatedAt: string;
  validationSnapshot: PublicPresenceValidationSnapshot | null;
  versionNumber: number;
}

export interface PublicPresenceStudioArtistStageSummary {
  artistStatusCode: string;
  code: string;
  homepageTemplateTypeCode: PublicPresenceTemplateTypeCode;
  id: string;
  name: LocalizedText;
}

export interface PublicPresenceStudioPolicyBlockReason {
  code:
    | 'artistStageUnavailable'
    | 'artistLifecycleFlowInvalid'
    | 'homepagePolicyMissing'
    | 'noAllowedTemplateAssets';
  messageKey: string;
}

export interface PublicPresenceStudioHomepagePolicySummary {
  allowedTemplateTypeCodes: PublicPresenceTemplateTypeCode[];
  blockedReasons: PublicPresenceStudioPolicyBlockReason[];
  status: 'blocked' | 'ready';
}

export interface PublicPresenceStudioTemplateAssetSummary {
  assetCode: string;
  assetDescription: LocalizedText;
  assetId: string;
  assetName: LocalizedText;
  blockedReasonCode:
    | 'homepagePolicyMissing'
    | 'noCurrentRevision'
    | 'notAllowedInCurrentStage'
    | 'validationRequired'
    | null;
  canEdit: boolean;
  currentRevisionId: string | null;
  currentRevisionNumber: number | null;
  currentRevisionSourceHash: string | null;
  currentRevisionStatus: string | null;
  currentRevisionValidationState: string | null;
  defaultSectionOrder: string[];
  isSelectable: boolean;
  isSystem: boolean;
  label: string;
  optionalSections: string[];
  ownerType: string;
  recommendedSections: string[];
  requiredSections: string[];
  templateId: PublicPresenceTemplateId;
  templateTypeCode: PublicPresenceTemplateTypeCode;
  useCase: string;
}

export interface PublicPresenceStudioWorkflowEventSummary {
  actorId: string | null;
  contentHash: string | null;
  eventType: string;
  fromDocumentState: string | null;
  id: string;
  occurredAt: string;
  payload: Record<string, unknown>;
  toDocumentState: string | null;
  versionId: string | null;
}

export interface PublicPresenceStudioPageVersionSummary {
  latestVersion: PublicPresenceStudioVersionSummary | null;
  liveVersion: PublicPresenceStudioVersionSummary | null;
  revealAutoSwitchAt: string | null;
  scheduledVersion: PublicPresenceStudioVersionSummary | null;
  templateId: PublicPresenceTemplateId;
}

export interface PublicPresenceStudioWorkspace {
  componentDefinitions?: PublicPresenceStudioComponentSummary[];
  currentArtistStage: PublicPresenceStudioArtistStageSummary | null;
  draftVersion: PublicPresenceStudioVersionSummary | null;
  effectiveLifecycleStatus: string | null;
  homepagePolicy: PublicPresenceStudioHomepagePolicySummary;
  liveVersion: PublicPresenceStudioVersionSummary | null;
  liveTemplateId: PublicPresenceTemplateId | null;
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
  releaseReadiness: {
    blockingDependencyCount: number;
    dependencies: PublicPresenceStudioReleaseDependency[];
  };
  selectedTemplateAssetId: string | null;
  selectedTemplateId: PublicPresenceTemplateId;
  stageSections: PublicPresenceStudioStageSectionSummary[];
  templateAssets: PublicPresenceStudioTemplateAssetSummary[];
  templates: PublicPresenceStudioTemplateSummary[];
  workflowEvents: PublicPresenceStudioWorkflowEventSummary[];
}

function createFieldValue<T>(
  value: T,
  provenance: PublicPresenceFieldProvenance = 'publicPresence'
): PublicPresenceFieldValue<T> {
  return { provenance, value };
}

function buildStarterSection(
  kind: PublicPresenceStageSectionKind,
  index: number,
  talent: {
    code: string;
    displayName: string;
    timezone: string | null;
  },
  templateId: PublicPresenceTemplateId,
  stageSectionsByKind: ReadonlyMap<string, PublicPresenceStudioStageSectionSummary>
): PublicPresenceDocument['sections'][number] {
  const displayName = talent.displayName.trim() || talent.code;

  if (kind === 'firstEncounter') {
    return {
      id: `${kind}-${index + 1}`,
      kind,
      fields: {
        displayName: createFieldValue(displayName),
        headline: createFieldValue(
          templateId === 'debutReveal'
            ? 'Countdown updates, reveal moments, and launch links for fans.'
            : 'Official streams, updates, and fan links in one place.'
        ),
        intro: createFieldValue(
          templateId === 'debutReveal'
            ? `Follow ${displayName}'s countdown and join the debut reveal.`
            : `Welcome to ${displayName}'s official fan hub.`
        ),
      },
      phaseVisibility: 'always',
      title: 'First Encounter',
    };
  }

  if (kind === 'countdownReveal') {
    return {
      id: `${kind}-${index + 1}`,
      kind,
      fields: {
        phase: createFieldValue('countdown'),
        revealAtUtc: createFieldValue('2030-05-15T10:00:00.000Z'),
        revealName: createFieldValue(displayName),
        teaserName: createFieldValue(displayName),
        timezone: createFieldValue(talent.timezone?.trim() || 'Asia/Tokyo'),
      },
      phaseVisibility: 'countdown',
      title: 'Countdown / Reveal',
    };
  }

  if (kind === 'agencyNotes') {
    return {
      id: `${kind}-${index + 1}`,
      kind,
      fields: {
        notes: createFieldValue([]),
      },
      phaseVisibility: 'always',
      title: 'Agency Notes',
    };
  }

  if (kind === 'fanActions') {
    return {
      id: `${kind}-${index + 1}`,
      kind,
      fields: {
        actions: createFieldValue([]),
      },
      phaseVisibility: 'always',
      title: 'Fan Actions',
    };
  }

  const definition = stageSectionsByKind.get(kind);
  const phaseVisibility = definition?.phaseVisibility?.[0] as
    | PublicPresencePhaseVisibility
    | undefined;

  return {
    components: [],
    id: `${kind}-${index + 1}`,
    kind,
    phaseVisibility,
    title: definition?.purpose ? definition.purpose.split('.')[0] : kind,
  };
}

function buildStarterDocument(
  template: Pick<
    PublicPresenceStudioTemplateAssetSummary,
    | 'defaultSectionOrder'
    | 'label'
    | 'optionalSections'
    | 'recommendedSections'
    | 'requiredSections'
    | 'templateId'
  >,
  talent: {
    code: string;
    displayName: string;
    timezone: string | null;
  },
  stageSections: PublicPresenceStudioStageSectionSummary[]
): PublicPresenceDocument {
  const displayName = talent.displayName.trim() || talent.code;
  const stageSectionsByKind = new Map(
    stageSections.map((section) => [section.kind, section] as const)
  );
  const sectionKinds = Array.from(
    new Set([
      ...template.requiredSections,
      ...template.recommendedSections,
      ...template.optionalSections,
      ...template.defaultSectionOrder,
    ])
  ).filter((kind): kind is PublicPresenceStageSectionKind => stageSectionsByKind.has(kind));

  return {
    metadata: {
      title: displayName,
    },
    personaKit: {
      campaignLabel: template.label,
      tagline:
        template.templateId === 'debutReveal'
          ? 'Countdown updates, reveal moments, and launch links for fans.'
          : 'Official streams, updates, and fan links in one place.',
    },
    schemaVersion: PUBLIC_PRESENCE_DOCUMENT_SCHEMA_VERSION,
    sections: sectionKinds.map((kind, index) =>
      buildStarterSection(kind, index, talent, template.templateId, stageSectionsByKind)
    ),
    templateId: template.templateId,
  };
}

function serializeArtistStage(
  stage: {
    artistStatusCode: string;
    code: string;
    homepageTemplateTypeCode: PublicPresenceTemplateTypeCode;
    id: string;
    name: LocalizedText;
  } | null
): PublicPresenceStudioArtistStageSummary | null {
  if (!stage) {
    return null;
  }

  return {
    artistStatusCode: stage.artistStatusCode,
    code: stage.code,
    homepageTemplateTypeCode: stage.homepageTemplateTypeCode,
    id: stage.id,
    name: stage.name,
  };
}

function readTemplateAssetManifest(
  asset: PublicPresenceAssetListEntry
): PublicPresenceTemplateAssetManifest | null {
  const manifest = asset.currentRevision?.manifest;

  if (!manifest || manifest.assetKind !== 'template') {
    return null;
  }

  return {
    ...manifest,
    templateTypeCode:
      manifest.templateTypeCode ?? resolvePublicPresenceTemplateTypeCode(manifest.templateId),
  };
}

function serializeTemplateAssetSummary(input: {
  allowedTemplateTypeCodes: PublicPresenceTemplateTypeCode[];
  homepagePolicyBlocked: boolean;
  visibleAsset: PublicPresenceAssetListEntry;
}): PublicPresenceStudioTemplateAssetSummary | null {
  const manifest = readTemplateAssetManifest(input.visibleAsset);
  const currentRevision = input.visibleAsset.currentRevision;
  let blockedReasonCode: PublicPresenceStudioTemplateAssetSummary['blockedReasonCode'] = null;

  if (!manifest || !currentRevision) {
    blockedReasonCode = 'noCurrentRevision';
  } else if (input.homepagePolicyBlocked) {
    blockedReasonCode = 'homepagePolicyMissing';
  } else if (!input.allowedTemplateTypeCodes.includes(manifest.templateTypeCode)) {
    blockedReasonCode = 'notAllowedInCurrentStage';
  } else if (currentRevision.validationState === 'unvalidated') {
    blockedReasonCode = 'validationRequired';
  }

  if (!manifest) {
    return null;
  }

  return {
    assetCode: input.visibleAsset.asset.code,
    assetDescription: input.visibleAsset.asset.description,
    assetId: input.visibleAsset.asset.id,
    assetName: input.visibleAsset.asset.name,
    blockedReasonCode,
    canEdit: input.visibleAsset.canEdit,
    currentRevisionId: currentRevision?.id ?? null,
    currentRevisionNumber: currentRevision?.revisionNumber ?? null,
    currentRevisionSourceHash: currentRevision?.sourceHash ?? null,
    currentRevisionStatus: currentRevision?.artifactStatus ?? null,
    currentRevisionValidationState: currentRevision?.validationState ?? null,
    defaultSectionOrder: [...manifest.defaultSectionOrder],
    isSelectable: blockedReasonCode === null,
    isSystem: input.visibleAsset.asset.isSystem,
    label: manifest.label,
    optionalSections: [...manifest.optionalSections],
    ownerType: input.visibleAsset.asset.ownerType,
    recommendedSections: [...manifest.recommendedSections],
    requiredSections: [...manifest.requiredSections],
    templateId: manifest.templateId,
    templateTypeCode: manifest.templateTypeCode,
    useCase: manifest.useCase,
  };
}

function resolveSelectedTemplateAssetId(input: {
  selectedTemplateId: PublicPresenceTemplateId;
  templateAssets: PublicPresenceStudioTemplateAssetSummary[];
  version: PublicPresenceDocumentVersionRecord | null;
}): string | null {
  const pinnedAssetId = input.version?.templateAssetPin?.assetId ?? null;

  if (pinnedAssetId && input.templateAssets.some((asset) => asset.assetId === pinnedAssetId)) {
    return pinnedAssetId;
  }

  return (
    input.templateAssets.find(
      (asset) => asset.isSelectable && asset.templateId === input.selectedTemplateId
    )?.assetId ??
    input.templateAssets.find((asset) => asset.isSelectable)?.assetId ??
    null
  );
}

function buildTemplateAssetPinFromListEntry(
  asset: PublicPresenceAssetListEntry
): PublicPresenceAssetRevisionPin {
  const manifest = readTemplateAssetManifest(asset);
  const currentRevision = asset.currentRevision;

  if (!manifest || !currentRevision) {
    throw new ConflictException({
      code: ErrorCodes.RES_CONFLICT,
      message: 'Selected template asset is missing a current revision.',
    });
  }

  return {
    assetId: asset.asset.id,
    assetRevisionId: currentRevision.id,
    snapshot: {
      assetId: asset.asset.id,
      assetRevisionId: currentRevision.id,
      manifest,
      revisionNumber: currentRevision.revisionNumber,
      sourceBundle: currentRevision.sourceBundle,
      sourceHash: currentRevision.sourceHash,
    },
    sourceHash: currentRevision.sourceHash,
  };
}

function serializeTemplateSummaryFromManifest(
  manifest: Pick<
    PublicPresenceTemplateAssetManifest,
    | 'defaultSectionOrder'
    | 'label'
    | 'optionalSections'
    | 'recommendedSections'
    | 'requiredSections'
    | 'templateId'
    | 'useCase'
  >
): PublicPresenceStudioTemplateSummary {
  return {
    defaultSectionOrder: [...manifest.defaultSectionOrder],
    label: manifest.label,
    optionalSections: [...manifest.optionalSections],
    recommendedSections: [...manifest.recommendedSections],
    requiredSections: [...manifest.requiredSections],
    templateId: manifest.templateId,
    useCase: manifest.useCase,
  };
}

function readPinnedTemplateManifest(
  record: PublicPresenceDocumentVersionRecord | null
): PublicPresenceTemplateAssetManifest | null {
  const manifest = record?.templateAssetPin?.snapshot?.manifest;

  if (!manifest || manifest.assetKind !== 'template') {
    return null;
  }

  return manifest;
}

function buildWorkspaceTemplateSummaries(input: {
  templateAssets: PublicPresenceStudioTemplateAssetSummary[];
  versionRecords: PublicPresenceDocumentVersionRecord[];
}): PublicPresenceStudioTemplateSummary[] {
  const summaryByTemplateId = new Map<
    PublicPresenceTemplateId,
    PublicPresenceStudioTemplateSummary
  >();

  for (const asset of input.templateAssets) {
    if (summaryByTemplateId.has(asset.templateId)) {
      continue;
    }

    summaryByTemplateId.set(asset.templateId, serializeTemplateSummaryFromManifest(asset));
  }

  for (const record of input.versionRecords) {
    const manifest = readPinnedTemplateManifest(record);

    if (!manifest || summaryByTemplateId.has(manifest.templateId)) {
      continue;
    }

    summaryByTemplateId.set(manifest.templateId, serializeTemplateSummaryFromManifest(manifest));
  }

  return Array.from(summaryByTemplateId.values());
}

function collectWorkspaceTemplateIds(input: {
  selectedTemplateId: PublicPresenceTemplateId;
  templateAssets: PublicPresenceStudioTemplateAssetSummary[];
  versionRecords: PublicPresenceDocumentVersionRecord[];
}): PublicPresenceTemplateId[] {
  const templateIds: PublicPresenceTemplateId[] = [];
  const seenTemplateIds = new Set<PublicPresenceTemplateId>();

  const appendTemplateId = (templateId: PublicPresenceTemplateId | null) => {
    if (!templateId || seenTemplateIds.has(templateId)) {
      return;
    }

    seenTemplateIds.add(templateId);
    templateIds.push(templateId);
  };

  for (const asset of input.templateAssets) {
    appendTemplateId(asset.templateId);
  }

  for (const record of input.versionRecords) {
    const parsedTemplateId = PublicPresenceTemplateIdSchema.safeParse(record.templateId);

    if (parsedTemplateId.success) {
      appendTemplateId(parsedTemplateId.data);
    }
  }

  appendTemplateId(input.selectedTemplateId);

  return templateIds;
}

function serializeCollectionOperations(
  operations:
    | PublicPresenceStageSectionDefinition['collectionOperations']
    | PublicPresenceComponentDefinition['collectionOperations']
) {
  return (operations ?? []).map((operation) => ({
    addLabel: operation.addLabel,
    canAdd: operation.canAdd,
    canRemove: operation.canRemove,
    canReorder: operation.canReorder,
    collectionKey: operation.collectionKey,
    disabledReason: operation.disabledReason ?? null,
    itemLabel: operation.itemLabel,
    maxItems: operation.maxItems,
    minItems: operation.minItems,
    removeLabel: operation.removeLabel,
    reorderLabel: operation.reorderLabel,
  }));
}

function serializeFieldDefinitions(
  fieldDefinitions:
    | PublicPresenceStageSectionDefinition['fieldDefinitions']
    | PublicPresenceComponentDefinition['fieldDefinitions']
) {
  return fieldDefinitions.map((field) => ({
    fieldKey: field.fieldKey,
    provenance: [...field.provenance],
    required: field.required,
    sourceOnly: field.sourceOnly,
    valueType: field.valueType,
    visualEditable: field.visualEditable,
  }));
}

function serializeStageSectionDefinition(
  definition: PublicPresenceStageSectionDefinition
): PublicPresenceStudioStageSectionSummary {
  return {
    allowedComponents: [...definition.allowedComponents],
    collectionOperations: serializeCollectionOperations(definition.collectionOperations),
    editabilityState: definition.editabilityState,
    fallbackBehavior: definition.fallbackBehavior,
    fieldDefinitions: serializeFieldDefinitions(definition.fieldDefinitions),
    kind: definition.kind,
    phaseVisibility: [...definition.phaseVisibility],
    purpose: definition.purpose,
    sourcePolicy: definition.sourcePolicy,
  };
}

function serializeComponentDefinition(
  definition: PublicPresenceComponentDefinition
): PublicPresenceStudioComponentSummary {
  return {
    collectionOperations: serializeCollectionOperations(definition.collectionOperations),
    componentType: definition.componentType,
    defaultProps: structuredClone(definition.defaultProps),
    fieldDefinitions: serializeFieldDefinitions(definition.fieldDefinitions),
    lockedSourceOwnedPolicy: definition.lockedSourceOwnedPolicy,
    rendererSupport: definition.rendererSupport,
    sourcePolicy: definition.sourcePolicy,
    unknownFieldPolicy: definition.unknownFieldPolicy,
    visualSupport: definition.visualSupport,
  };
}

function buildWorkspaceComponentDefinitions(
  visibleComponentAssets: PublicPresenceAssetListEntry[]
): PublicPresenceStudioComponentSummary[] {
  const definitions = new Map<HomepageComponentType, PublicPresenceStudioComponentSummary>();

  for (const asset of visibleComponentAssets) {
    const manifest = readComponentSourceManifestFromAssetEntry(asset);

    if (!manifest) {
      continue;
    }

    definitions.set(
      manifest.componentType,
      serializeComponentDefinition({
        aiPatchAllowlist: [...manifest.aiPatchAllowlist],
        collectionOperations: structuredClone(manifest.collectionOperations ?? []),
        componentType: manifest.componentType,
        defaultProps: structuredClone(manifest.defaultProps),
        fieldDefinitions: structuredClone(manifest.fieldDefinitions),
        lockedSourceOwnedPolicy: manifest.lockedSourceOwnedPolicy,
        propsSchemaKey: manifest.propsSchemaKey,
        publicProjectionMode: manifest.projectionMode,
        rendererSupport: manifest.rendererSupport,
        safetyPolicyReferences: [...manifest.safetyPolicyReferences],
        sourcePolicy: manifest.sourcePolicy,
        unknownFieldPolicy: manifest.unknownFieldPolicy,
        visualSupport: manifest.visualSupport,
      })
    );
  }

  return Array.from(definitions.values());
}

function resolveWorkspaceStageSections(input: {
  selectedTemplateAssetId: string | null;
  templateAssets: PublicPresenceStudioTemplateAssetSummary[];
  version: PublicPresenceDocumentVersionRecord | null;
  visibleTemplateAssets: PublicPresenceAssetListEntry[];
  versionRecords: PublicPresenceDocumentVersionRecord[];
}): PublicPresenceStudioStageSectionSummary[] {
  const selectedTemplateEntry = input.selectedTemplateAssetId
    ? (input.visibleTemplateAssets.find(
        (asset) => asset.asset.id === input.selectedTemplateAssetId
      ) ?? null)
    : null;
  const selectedTemplateSourceManifest =
    readTemplateSourceManifestFromAssetEntry(selectedTemplateEntry ?? { currentRevision: null }) ??
    readTemplateSourceManifestFromPin(input.version?.templateAssetPin ?? null) ??
    input.versionRecords
      .map((record) => readTemplateSourceManifestFromPin(record.templateAssetPin))
      .find((manifest) => Boolean(manifest)) ??
    null;

  return selectedTemplateSourceManifest
    ? selectedTemplateSourceManifest.stageSections.map(serializeStageSectionDefinition)
    : [];
}

function serializePortal(
  portal: PublicPresencePortalRecord
): NonNullable<PublicPresenceStudioWorkspace['portal']> {
  return {
    createdAt: portal.createdAt.toISOString(),
    draftVersionId: portal.draftVersionId,
    id: portal.id,
    lastValidatedAt: portal.lastValidatedAt?.toISOString() ?? null,
    latestValidationState: portal.latestValidationState,
    latestVersionNumber: portal.latestVersionNumber,
    liveVersionId: portal.liveVersionId,
    talentId: portal.talentId,
    updatedAt: portal.updatedAt.toISOString(),
    version: portal.version,
  };
}

function parseDocument(record: PublicPresenceDocumentVersionRecord): PublicPresenceDocument {
  return PublicPresenceDocumentSchema.parse(record.document);
}

function parseValidationSnapshot(
  record: PublicPresenceValidationSnapshotRecord | null
): PublicPresenceValidationSnapshot | null {
  if (!record) {
    return null;
  }

  const parsed = PublicPresenceValidationSnapshotSchema.parse({
    ...record.snapshot,
    projectionHash: (record.snapshot as { projectionHash?: string | null }).projectionHash ?? null,
  });

  return parsed as PublicPresenceValidationSnapshot;
}

function serializeVersion(
  record: PublicPresenceDocumentVersionRecord,
  validationSnapshot: PublicPresenceValidationSnapshot | null
): PublicPresenceStudioVersionSummary {
  return {
    contentHash: record.contentHash,
    contentHashAlgorithm: record.contentHashAlgorithm,
    createdAt: record.createdAt.toISOString(),
    document: parseDocument(record),
    documentSchemaVersion: record.documentSchemaVersion,
    documentState: record.documentState,
    id: record.id,
    lastValidationSnapshotId: record.lastValidationSnapshotId,
    publishedAt: record.publishedAt?.toISOString() ?? null,
    scheduledFor: record.scheduledFor?.toISOString() ?? null,
    templateAssetPin: record.templateAssetPin,
    templateId: record.templateId,
    updatedAt: record.updatedAt.toISOString(),
    validationSnapshot,
    versionNumber: record.versionNumber,
  };
}

function serializeWorkflowEvent(record: {
  actorId: string | null;
  contentHash: string | null;
  eventType: string;
  fromDocumentState: string | null;
  id: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
  toDocumentState: string | null;
  versionId: string | null;
}): PublicPresenceStudioWorkflowEventSummary {
  return {
    actorId: record.actorId,
    contentHash: record.contentHash,
    eventType: record.eventType,
    fromDocumentState: record.fromDocumentState,
    id: record.id,
    occurredAt: record.occurredAt.toISOString(),
    payload: record.payload,
    toDocumentState: record.toDocumentState,
    versionId: record.versionId,
  };
}

function resolveSelectedTemplateId(
  templateIdInput: string | null | undefined,
  latestVersions: PublicPresenceDocumentVersionRecord[],
  liveVersion: PublicPresenceDocumentVersionRecord | null
): PublicPresenceTemplateId {
  const requestedTemplateId = PublicPresenceTemplateIdSchema.safeParse(templateIdInput ?? null);

  if (requestedTemplateId.success) {
    return requestedTemplateId.data;
  }

  const liveTemplateId = PublicPresenceTemplateIdSchema.safeParse(liveVersion?.templateId ?? null);

  if (liveTemplateId.success) {
    return liveTemplateId.data;
  }

  const latestTemplateId = PublicPresenceTemplateIdSchema.safeParse(
    latestVersions[0]?.templateId ?? null
  );

  if (latestTemplateId.success) {
    return latestTemplateId.data;
  }

  return 'activeTalentHub';
}

function normalizePublicRouteSegment(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

@Injectable()
export class PublicPresenceStudioService {
  constructor(
    private readonly homepageAdminRepository: HomepageAdminRepository,
    private readonly publicPresenceFoundationRepository: PublicPresenceFoundationRepository,
    private readonly publicPresenceAssetService: PublicPresenceAssetService,
    private readonly publicPresenceFoundationService: PublicPresenceFoundationService
  ) {}

  private async loadStudioPolicyContext(talentId: string, tenantSchema: string) {
    const talent = await this.homepageAdminRepository.findTalentById(tenantSchema, talentId);

    if (!talent) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    const [stageCatalog, flowRecord, visibleTemplateAssets, visibleComponentAssets] =
      await Promise.all([
        this.homepageAdminRepository.listArtistStages(tenantSchema),
        this.homepageAdminRepository.readArtistLifecycleFlow(tenantSchema),
        this.publicPresenceAssetService.listAssets(
          tenantSchema,
          {
            assetKind: 'template',
            scopeId: talentId,
            scopeType: 'talent',
          },
          null
        ),
        this.publicPresenceAssetService.listAssets(
          tenantSchema,
          {
            assetKind: 'component',
            scopeId: talentId,
            scopeType: 'talent',
          },
          null
        ),
      ]);
    const blockedReasons: PublicPresenceStudioPolicyBlockReason[] = [];
    const currentStage = stageCatalog.find((stage) => stage.id === talent.artistStageId) ?? null;

    if (!currentStage) {
      blockedReasons.push({
        code: 'artistStageUnavailable',
        messageKey: 'publicPresence.policy.artistStageUnavailable',
      });
    }

    let normalizedFlow: ArtistLifecycleFlow | null = null;
    let flowFallbackInvalid = false;

    try {
      normalizedFlow = createArtistLifecycleFlowSchema({
        stageCatalog: stageCatalog.map((stage) => ({
          code: stage.code,
          id: stage.id,
          isActive: stage.isActive,
        })),
      }).parse(flowRecord);
    } catch {
      flowFallbackInvalid = true;
    }

    const fallbackAllowedTemplateTypeCodes =
      currentStage && normalizedFlow
        ? (normalizedFlow.homepagePolicyByStage.find(
            (policy) => policy.stageId === currentStage.id
          )?.allowedTemplateTypeCodes ?? [])
        : [];
    const allowedTemplateTypeCodes = currentStage?.homepageTemplateTypeCode
      ? [currentStage.homepageTemplateTypeCode]
      : fallbackAllowedTemplateTypeCodes;

    if (currentStage && !currentStage.homepageTemplateTypeCode && flowFallbackInvalid) {
      blockedReasons.push({
        code: 'artistLifecycleFlowInvalid',
        messageKey: 'publicPresence.policy.artistLifecycleFlowInvalid',
      });
    }

    if (currentStage && !flowFallbackInvalid && allowedTemplateTypeCodes.length === 0) {
      blockedReasons.push({
        code: 'homepagePolicyMissing',
        messageKey: 'publicPresence.policy.homepagePolicyMissing',
      });
    }

    const homepagePolicyBlocked = blockedReasons.length > 0;
    const templateAssets = visibleTemplateAssets
      .map((asset) =>
	        serializeTemplateAssetSummary({
	          allowedTemplateTypeCodes,
	          homepagePolicyBlocked,
	          visibleAsset: asset,
        })
      )
      .filter((asset): asset is PublicPresenceStudioTemplateAssetSummary => Boolean(asset));

    if (!homepagePolicyBlocked && !templateAssets.some((asset) => asset.isSelectable)) {
      blockedReasons.push({
        code: 'noAllowedTemplateAssets',
        messageKey: 'publicPresence.policy.noAllowedTemplateAssets',
      });
    }

    return {
	      currentStage,
	      homepagePolicy: {
	        allowedTemplateTypeCodes,
	        blockedReasons,
        status: blockedReasons.length > 0 ? 'blocked' : 'ready',
      } satisfies PublicPresenceStudioHomepagePolicySummary,
      talent,
      visibleComponentAssets,
      templateAssets,
      visibleTemplateAssets,
    };
  }

  private resolveBootstrapTemplateAsset(
    templateAssets: PublicPresenceStudioTemplateAssetSummary[],
    selection: string
  ) {
    const normalizedSelection = selection.trim();

    return (
      templateAssets.find((asset) => asset.assetId === normalizedSelection && asset.isSelectable) ??
      templateAssets.find(
        (asset) => asset.templateId === normalizedSelection && asset.isSelectable
      ) ??
      null
    );
  }

  async getWorkspace(
    talentId: string,
    tenantSchema: string,
    templateIdInput?: string | null
  ): Promise<PublicPresenceStudioWorkspace> {
    const {
      currentStage,
      homepagePolicy,
      talent,
      visibleComponentAssets,
      templateAssets,
      visibleTemplateAssets,
    } = await this.loadStudioPolicyContext(talentId, tenantSchema);
    const tenantCode =
      (await this.homepageAdminRepository.findTenantCodeBySchema(tenantSchema)) ?? tenantSchema;
    const normalizedTenantCode = normalizePublicRouteSegment(tenantCode);
    const normalizedTalentCode = normalizePublicRouteSegment(talent.code);
    const portal = await this.publicPresenceFoundationRepository.findPortalByTalentId(
      tenantSchema,
      talentId
    );

    const componentDefinitions = buildWorkspaceComponentDefinitions(visibleComponentAssets);

    if (!portal) {
      const selectedTemplateId = resolveSelectedTemplateId(templateIdInput, [], null);
      const templates = buildWorkspaceTemplateSummaries({
        templateAssets,
        versionRecords: [],
      });
      const workspaceTemplateIds = collectWorkspaceTemplateIds({
        selectedTemplateId,
        templateAssets,
        versionRecords: [],
      });
      const selectedTemplateAssetId = resolveSelectedTemplateAssetId({
        selectedTemplateId,
        templateAssets,
        version: null,
      });

      return {
        componentDefinitions,
        currentArtistStage: serializeArtistStage(currentStage),
        draftVersion: null,
        effectiveLifecycleStatus: talent.lifecycleStatus,
        homepagePolicy,
        liveVersion: null,
        liveTemplateId: null,
        pageVersions: workspaceTemplateIds.map((templateId) => ({
          latestVersion: null,
          liveVersion: null,
          revealAutoSwitchAt: null,
          scheduledVersion: null,
          templateId,
        })),
        portal: null,
        publicRoute: {
          canonicalPath: `/${normalizedTenantCode}/${normalizedTalentCode}/homepage`,
          domainHostname: talent.customDomainVerified ? talent.customDomain : null,
          legacyPath: talent.homepagePath ?? null,
          talentCode: normalizedTalentCode,
          tenantCode: normalizedTenantCode,
        },
        releaseReadiness: {
          blockingDependencyCount: 0,
          dependencies: [],
        },
        selectedTemplateAssetId,
        selectedTemplateId,
        stageSections: resolveWorkspaceStageSections({
          selectedTemplateAssetId,
          templateAssets,
          version: null,
          versionRecords: [],
          visibleTemplateAssets,
        }),
        templateAssets,
        templates,
        workflowEvents: [],
      };
    }

    const [latestRecords, liveRecord, workflowEvents, scheduledRecords, publishReadyRecords] =
      await Promise.all([
        this.publicPresenceFoundationRepository.findLatestVersionsByPortal(tenantSchema, portal.id),
        portal.liveVersionId
          ? this.publicPresenceFoundationRepository.findDocumentVersionById(
              tenantSchema,
              portal.liveVersionId
            )
          : Promise.resolve(null),
        this.publicPresenceFoundationRepository.findWorkflowEventsByPortalId(
          tenantSchema,
          portal.id
        ),
        Promise.all(
          templateAssets.map((templateAsset) =>
            this.publicPresenceFoundationRepository.findLatestVersionByTemplate(
              tenantSchema,
              portal.id,
              templateAsset.templateId,
              ['scheduled']
            )
          )
        ),
        Promise.all(
          templateAssets.map((templateAsset) =>
            this.publicPresenceFoundationRepository.findLatestVersionByTemplate(
              tenantSchema,
              portal.id,
              templateAsset.templateId,
              ['approved', 'scheduled', 'published']
            )
          )
        ),
      ]);

    const selectedTemplateId = resolveSelectedTemplateId(
      templateIdInput,
      latestRecords,
      liveRecord
    );
    const latestRecordByTemplate = new Map(
      latestRecords.map((record) => [record.templateId as PublicPresenceTemplateId, record])
    );
    const scheduledRecordByTemplate = new Map(
      scheduledRecords
        .filter((record): record is PublicPresenceDocumentVersionRecord => Boolean(record))
        .map((record) => [record.templateId as PublicPresenceTemplateId, record])
    );
    const publishReadyRecordByTemplate = new Map(
      publishReadyRecords
        .filter((record): record is PublicPresenceDocumentVersionRecord => Boolean(record))
        .map((record) => [record.templateId as PublicPresenceTemplateId, record])
    );
    const versionRecords = [
      ...latestRecords,
      ...scheduledRecords.filter((record): record is PublicPresenceDocumentVersionRecord =>
        Boolean(record)
      ),
      ...(liveRecord ? [liveRecord] : []),
    ];
    const uniqueVersionRecords = Array.from(
      new Map(versionRecords.map((record) => [record.id, record])).values()
    );
    const snapshotEntries = await Promise.all(
      uniqueVersionRecords.map(async (record) => {
        const snapshot = record.lastValidationSnapshotId
          ? await this.publicPresenceFoundationRepository.findValidationSnapshotById(
              tenantSchema,
              record.lastValidationSnapshotId
            )
          : null;

        return [record.id, parseValidationSnapshot(snapshot)] as const;
      })
    );
    const snapshotByVersionId = new Map(snapshotEntries);
    const liveTemplateId = PublicPresenceTemplateIdSchema.safeParse(liveRecord?.templateId ?? null)
      .success
      ? (liveRecord?.templateId as PublicPresenceTemplateId)
      : null;
    const templateVersionRecords = [
      ...uniqueVersionRecords,
      ...publishReadyRecords.filter((record): record is PublicPresenceDocumentVersionRecord =>
        Boolean(record)
      ),
    ];
    const templates = buildWorkspaceTemplateSummaries({
      templateAssets,
      versionRecords: templateVersionRecords,
    });
    const workspaceTemplateIds = collectWorkspaceTemplateIds({
      selectedTemplateId,
      templateAssets,
      versionRecords: templateVersionRecords,
    });
    const pageVersions = workspaceTemplateIds.map((templateId) => {
      const latestRecord = latestRecordByTemplate.get(templateId) ?? null;
      const scheduledRecord = scheduledRecordByTemplate.get(templateId) ?? null;
      const liveTemplateVersion = liveRecord?.templateId === templateId ? liveRecord : null;

      return {
        latestVersion: latestRecord
          ? serializeVersion(latestRecord, snapshotByVersionId.get(latestRecord.id) ?? null)
          : null,
        liveVersion: liveTemplateVersion
          ? serializeVersion(
              liveTemplateVersion,
              snapshotByVersionId.get(liveTemplateVersion.id) ?? null
            )
          : null,
        revealAutoSwitchAt: extractRevealAutoSwitchAt(latestRecord),
        scheduledVersion: scheduledRecord
          ? serializeVersion(scheduledRecord, snapshotByVersionId.get(scheduledRecord.id) ?? null)
          : null,
        templateId,
      } satisfies PublicPresenceStudioPageVersionSummary;
    });
    const selectedPageVersion =
      pageVersions.find((pageVersion) => pageVersion.templateId === selectedTemplateId) ?? null;
    const selectedVersionRecord =
      latestRecordByTemplate.get(selectedTemplateId) ??
      (liveRecord?.templateId === selectedTemplateId ? liveRecord : null);
    const releaseReadiness = buildStudioReleaseReadinessSummary({
      latestActiveHubVersion: latestRecordByTemplate.get('activeTalentHub') ?? null,
      publishReadyActiveHubVersion:
        publishReadyRecordByTemplate.get('activeTalentHub') ??
        (liveRecord?.templateId === 'activeTalentHub' ? liveRecord : null),
      selectedVersion: selectedVersionRecord,
    });
    const selectedTemplateAssetId = resolveSelectedTemplateAssetId({
      selectedTemplateId,
      templateAssets,
      version: selectedVersionRecord,
    });
    const stageSections = resolveWorkspaceStageSections({
      selectedTemplateAssetId,
      templateAssets,
      version: selectedVersionRecord,
      versionRecords: templateVersionRecords,
      visibleTemplateAssets,
    });

    return {
      componentDefinitions,
      currentArtistStage: serializeArtistStage(currentStage),
      draftVersion: selectedPageVersion?.latestVersion ?? null,
      effectiveLifecycleStatus: talent.lifecycleStatus,
      homepagePolicy,
      liveVersion: liveRecord
        ? serializeVersion(liveRecord, snapshotByVersionId.get(liveRecord.id) ?? null)
        : null,
      liveTemplateId,
      pageVersions,
      portal: serializePortal(portal),
      publicRoute: {
        canonicalPath: `/${normalizedTenantCode}/${normalizedTalentCode}/homepage`,
        domainHostname: talent.customDomainVerified ? talent.customDomain : null,
        legacyPath: talent.homepagePath ?? null,
        talentCode: normalizedTalentCode,
        tenantCode: normalizedTenantCode,
      },
      releaseReadiness,
      selectedTemplateAssetId,
      selectedTemplateId,
      stageSections,
      templateAssets,
      templates,
      workflowEvents: workflowEvents.map(serializeWorkflowEvent),
    };
  }

  async bootstrapDraft(
    talentId: string,
    templateSelection: string,
    context: RequestContext
  ): Promise<PublicPresenceStudioWorkspace> {
    const tenantSchema = context.tenantSchema ?? '';
    const { homepagePolicy, talent, templateAssets, visibleTemplateAssets } =
      await this.loadStudioPolicyContext(talentId, tenantSchema);

    if (homepagePolicy.status !== 'ready') {
      throw new ConflictException({
        code: ErrorCodes.RES_CONFLICT,
        details: homepagePolicy,
        message: 'Homepage work is unavailable for the current Artist Stage.',
      });
    }

    const selectedTemplateAsset = this.resolveBootstrapTemplateAsset(
      templateAssets,
      templateSelection
    );

    if (!selectedTemplateAsset) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Selected template asset is unavailable in the current scope.',
      });
    }

    const existingWorkspace = await this.getWorkspace(
      talentId,
      tenantSchema,
      selectedTemplateAsset.templateId
    );

    if (
      existingWorkspace.pageVersions.some(
        (pageVersion) =>
          pageVersion.templateId === selectedTemplateAsset.templateId &&
          pageVersion.latestVersion !== null
      )
    ) {
      return existingWorkspace;
    }
    const selectedTemplateEntry = visibleTemplateAssets.find(
      (asset) => asset.asset.id === selectedTemplateAsset.assetId
    );

    if (!selectedTemplateEntry) {
      throw new ConflictException({
        code: ErrorCodes.RES_CONFLICT,
        message: 'Selected template asset is no longer available for this workspace.',
      });
    }

    const stageSections = resolveWorkspaceStageSections({
      selectedTemplateAssetId: selectedTemplateAsset.assetId,
      templateAssets,
      version: null,
      versionRecords: [],
      visibleTemplateAssets,
    });
    const starterDocument = buildStarterDocument(
      selectedTemplateAsset,
      {
        code: talent.code,
        displayName: talent.displayName,
        timezone: talent.timezone,
      },
      stageSections
    );

    await this.publicPresenceFoundationService.saveDraft(talentId, starterDocument, context, {
      expectedCurrentContentHash: null,
      templateAssetPin: buildTemplateAssetPinFromListEntry(selectedTemplateEntry),
    });

    return this.getWorkspace(talentId, tenantSchema, selectedTemplateAsset.templateId);
  }

  async saveDraft(
    talentId: string,
    documentInput: unknown,
    context: RequestContext,
    expectedCurrentContentHash?: string | null
  ): Promise<PublicPresenceStudioWorkspace> {
    const documentResult = PublicPresenceDocumentSchema.safeParse(documentInput);

    if (!documentResult.success) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Invalid Public Presence document payload.',
      });
    }

    const tenantSchema = context.tenantSchema ?? '';
    const portal = await this.publicPresenceFoundationRepository.findPortalByTalentId(
      tenantSchema,
      talentId
    );
    const currentVersion = portal
      ? await this.publicPresenceFoundationRepository.findLatestVersionByTemplate(
          tenantSchema,
          portal.id,
          documentResult.data.templateId
        )
      : null;

    await this.publicPresenceFoundationService.saveDraft(talentId, documentResult.data, context, {
      expectedCurrentContentHash,
      templateAssetPin: currentVersion?.templateAssetPin ?? null,
    });

    return this.getWorkspace(talentId, tenantSchema, documentResult.data.templateId);
  }
}
