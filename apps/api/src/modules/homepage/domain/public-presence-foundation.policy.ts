// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { createHash } from 'node:crypto';

import {
  PUBLIC_PRESENCE_CONTENT_HASH_POLICY,
  type PublicPresenceAssetRevisionPin,
  type PublicPresenceDocument,
  type PublicPresenceDocumentState,
  type PublicPresenceHashAlgorithm,
  type PublicPresenceValidationIssueCounts,
  type PublicPresenceValidationSnapshot,
  type PublicPresenceValidationState,
  type PublicPresenceWorkflowEventType,
} from '@tcrn/shared';

const VALIDATION_STATE_ORDER: Record<PublicPresenceValidationState, number> = {
  unsafe: 3,
  invalidRecoverable: 2,
  validLocked: 1,
  validEditable: 0,
};

export interface PublicPresencePortalRecord {
  id: string;
  talentId: string;
  draftVersionId: string | null;
  liveVersionId: string | null;
  latestVersionNumber: number;
  latestValidationState: string | null;
  lastValidatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface PublicPresenceDocumentVersionRecord {
  id: string;
  portalId: string;
  versionNumber: number;
  documentSchemaVersion: string;
  templateId: string;
  templateAssetPin: PublicPresenceAssetRevisionPin | null;
  document: Record<string, unknown>;
  documentState: string;
  contentHashAlgorithm: string;
  contentHash: string;
  lastValidationSnapshotId: string | null;
  scheduledFor: Date | null;
  publishedAt: Date | null;
  publishedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

export interface PublicPresenceValidationSnapshotRecord {
  id: string;
  portalId: string;
  versionId: string;
  validationMode: string;
  validationState: string;
  fatalCount: number;
  blockerCount: number;
  warningCount: number;
  infoCount: number;
  issueCounts: PublicPresenceValidationIssueCounts;
  blockerIds: string[];
  acknowledgementIds: string[];
  blocksPublish: boolean;
  blocksVisualEdit: boolean;
  blocksAiPatch: boolean;
  projectionHash: string | null;
  registryVersion: string;
  safetyPolicyVersion: string;
  snapshot: Record<string, unknown>;
  createdAt: Date;
  createdBy: string | null;
}

export interface PublicPresenceWorkflowEventRecord {
  id: string;
  portalId: string;
  versionId: string | null;
  eventType: string;
  fromDocumentState: string | null;
  toDocumentState: string | null;
  contentHashAlgorithm: string | null;
  contentHash: string | null;
  payload: Record<string, unknown>;
  occurredAt: Date;
  actorId: string | null;
}

export interface PublicPresenceScheduledVersionRecord {
  portalId: string;
  talentId: string;
  versionId: string;
}

export interface PublicPresenceSnapshotPersistencePayload {
  acknowledgementIds: string[];
  blockerIds: string[];
  blocksAiPatch: boolean;
  blocksPublish: boolean;
  blocksVisualEdit: boolean;
  fatalCount: number;
  blockerCount: number;
  warningCount: number;
  infoCount: number;
  issueCounts: PublicPresenceValidationIssueCounts;
  projectionHash: string | null;
  registryVersion: string;
  safetyPolicyVersion: string;
}

export interface CreatePublicPresencePortalInput {
  talentId: string;
  actorId: string | null;
}

export interface PersistPublicPresenceDraftVersionInput {
  portalId: string;
  versionNumber: number;
  document: PublicPresenceDocument;
  templateAssetPin: PublicPresenceAssetRevisionPin | null;
  contentHashAlgorithm: PublicPresenceHashAlgorithm;
  contentHash: string;
  validationSnapshot: PublicPresenceValidationSnapshot;
  validationPersistence: PublicPresenceSnapshotPersistencePayload;
  validationState: PublicPresenceValidationState;
  actorId: string | null;
}

export interface PersistPublicPresenceValidationSnapshotInput {
  portalId: string;
  versionId: string;
  documentState: PublicPresenceDocumentState;
  templateAssetPin: PublicPresenceAssetRevisionPin | null;
  contentHashAlgorithm: PublicPresenceHashAlgorithm;
  contentHash: string;
  validationSnapshot: PublicPresenceValidationSnapshot;
  validationPersistence: PublicPresenceSnapshotPersistencePayload;
  validationState: PublicPresenceValidationState;
  actorId: string | null;
  eventType: PublicPresenceWorkflowEventType;
}

export interface UpdatePublicPresenceDocumentWorkflowStateInput {
  actorId: string | null;
  contentHash: string;
  contentHashAlgorithm: PublicPresenceHashAlgorithm;
  eventType: PublicPresenceWorkflowEventType;
  payload?: Record<string, unknown>;
  portalId: string;
  publishedAt?: Date | null;
  publishedBy?: string | null;
  scheduledFor?: Date | null;
  toDocumentState: PublicPresenceDocumentState;
  versionId: string;
}

export interface CreatePublicPresenceDocumentFromSourceInput {
  actorId: string | null;
  contentHash: string;
  contentHashAlgorithm: PublicPresenceHashAlgorithm;
  document: PublicPresenceDocument;
  documentState: PublicPresenceDocumentState;
  payload?: Record<string, unknown>;
  portalId: string;
  sourceVersionId: string | null;
  templateAssetPin: PublicPresenceAssetRevisionPin | null;
  templateId: string;
  versionNumber: number;
}

function canonicalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeValue(entry));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = canonicalizeValue(
          (value as Record<string, unknown>)[key],
        );
        return accumulator;
      }, {});
  }

  return value;
}

export function buildPublicPresenceHashableDocument(
  document: PublicPresenceDocument,
): Record<string, unknown> {
  return canonicalizeValue({
    schemaVersion: document.schemaVersion,
    templateId: document.templateId,
    sections: document.sections,
    metadata: document.metadata ?? null,
    personaKit: document.personaKit ?? null,
  }) as Record<string, unknown>;
}

export function calculatePublicPresenceContentHash(
  document: PublicPresenceDocument,
): string {
  const algorithm = PUBLIC_PRESENCE_CONTENT_HASH_POLICY.algorithm;

  return createHash(algorithm)
    .update(JSON.stringify(buildPublicPresenceHashableDocument(document)))
    .digest('hex');
}

export function derivePublicPresenceValidationState(
  snapshot: PublicPresenceValidationSnapshot,
): PublicPresenceValidationState {
  return snapshot.issues
    .map((issue) => issue.state)
    .sort(
      (left, right) => VALIDATION_STATE_ORDER[right] - VALIDATION_STATE_ORDER[left],
    )[0] ?? 'validEditable';
}

export function buildPublicPresenceSnapshotPersistencePayload(
  snapshot: PublicPresenceValidationSnapshot,
): PublicPresenceSnapshotPersistencePayload {
  return {
    acknowledgementIds: snapshot.acknowledgementIds,
    blockerIds: snapshot.blockerIds,
    blocksAiPatch: snapshot.issues.some((issue) => issue.blocksAiPatch),
    blocksPublish: snapshot.issues.some((issue) => issue.blocksPublish),
    blocksVisualEdit: snapshot.issues.some((issue) => issue.blocksVisualEdit),
    fatalCount: snapshot.issueCounts.fatal,
    blockerCount: snapshot.issueCounts.blocker,
    warningCount: snapshot.issueCounts.warning,
    infoCount: snapshot.issueCounts.info,
    issueCounts: snapshot.issueCounts,
    projectionHash: snapshot.projectionHash,
    registryVersion: snapshot.templateRegistryVersion,
    safetyPolicyVersion: snapshot.safetyPolicyVersion,
  };
}
