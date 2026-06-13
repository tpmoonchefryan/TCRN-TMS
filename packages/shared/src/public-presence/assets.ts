// SPDX-License-Identifier: Apache-2.0
import type { LocalizedText } from '../constants/locale';
import type { HomepageComponentType } from '../types/homepage/schema';
import type {
  PublicPresenceCollectionOperationDefinition,
  PublicPresenceComponentDefinition,
  PublicPresenceComponentVisualSupport,
  PublicPresenceFallbackPolicy,
  PublicPresenceProjectionMode,
  PublicPresenceStageSectionDefinition,
  PublicPresenceSourcePolicy,
  PublicPresenceTemplateDefinition,
  PublicPresenceTemplateId,
  PublicPresenceUnknownFieldPolicy,
} from './types';

export const PUBLIC_PRESENCE_ASSET_RUNTIME_VERSION = '1.0.0' as const;

export const ARTIST_STATUS_DICTIONARY_CODE = 'artist-status' as const;

export const HOMEPAGE_TEMPLATE_TYPE_DICTIONARY_CODE = 'homepage-template-type' as const;

export const ARTIST_STATUS_CODES = ['draft', 'published', 'disabled'] as const;

export const PUBLIC_PRESENCE_TEMPLATE_TYPE_CODES = [
  'pending-reveal',
  'operating',
  'graduated',
] as const;

export const PUBLIC_PRESENCE_TEMPLATE_TYPE_BY_TEMPLATE_ID: Record<
  PublicPresenceTemplateId,
  PublicPresenceTemplateTypeCode
> = {
  activeTalentHub: 'operating',
  debutReveal: 'pending-reveal',
};

export function resolvePublicPresenceTemplateTypeCode(
  templateId: PublicPresenceTemplateId
): PublicPresenceTemplateTypeCode {
  return PUBLIC_PRESENCE_TEMPLATE_TYPE_BY_TEMPLATE_ID[templateId];
}

export const PUBLIC_PRESENCE_ASSET_KINDS = ['template', 'component'] as const;

export const PUBLIC_PRESENCE_ASSET_OWNER_TYPES = [
  'system',
  'tenant',
  'subsidiary',
  'talent',
] as const;

export const PUBLIC_PRESENCE_ASSET_SCOPE_TYPES = ['tenant', 'subsidiary', 'talent'] as const;

export const PUBLIC_PRESENCE_ASSET_STATUSES = [
  'draft',
  'validated',
  'submitted',
  'active',
  'archived',
] as const;

export const PUBLIC_PRESENCE_ASSET_VALIDATION_STATES = ['ready', 'warning', 'unvalidated'] as const;

export const PUBLIC_PRESENCE_SOURCE_BUNDLE_FILE_KINDS = [
  'code',
  'style',
  'markup',
  'doc',
  'fixture',
  'schema',
  'test',
] as const;

export type ArtistStatusCode = (typeof ARTIST_STATUS_CODES)[number];

export type ArtistStageLifecycleMapping = ArtistStatusCode;

export type PublicPresenceTemplateTypeCode = (typeof PUBLIC_PRESENCE_TEMPLATE_TYPE_CODES)[number];

export type PublicPresenceAssetKind = (typeof PUBLIC_PRESENCE_ASSET_KINDS)[number];

export type PublicPresenceAssetOwnerType = (typeof PUBLIC_PRESENCE_ASSET_OWNER_TYPES)[number];

export type PublicPresenceAssetScopeType = (typeof PUBLIC_PRESENCE_ASSET_SCOPE_TYPES)[number];

export type PublicPresenceAssetStatus = (typeof PUBLIC_PRESENCE_ASSET_STATUSES)[number];

export type PublicPresenceAssetValidationState =
  (typeof PUBLIC_PRESENCE_ASSET_VALIDATION_STATES)[number];

export type PublicPresenceSourceBundleFileKind =
  (typeof PUBLIC_PRESENCE_SOURCE_BUNDLE_FILE_KINDS)[number];

export interface ArtistStageRecord {
  code: string;
  color: string | null;
  createdAt: string;
  description: LocalizedText;
  artistStatusCode: ArtistStatusCode;
  homepageTemplateTypeCode: PublicPresenceTemplateTypeCode;
  id: string;
  isActive: boolean;
  isSystem: boolean;
  name: LocalizedText;
  ownerId: string | null;
  ownerType: 'tenant';
  sortOrder: number;
  updatedAt: string;
  version: number;
}

export interface ArtistLifecycleFlowNode {
  stageCode: string;
  stageId: string;
}

export interface ArtistLifecycleFlowTransition {
  fromStageId: string;
  id: string;
  label?: string | null;
  reason?: string | null;
  toStageId: string;
}

export interface ArtistLifecycleHomepagePolicy {
  allowedTemplateTypeCodes: PublicPresenceTemplateTypeCode[];
  stageId: string;
}

export interface ArtistLifecycleFlow {
  homepagePolicyByStage: ArtistLifecycleHomepagePolicy[];
  nodes: ArtistLifecycleFlowNode[];
  transitions: ArtistLifecycleFlowTransition[];
}

export interface PublicPresenceSourceBundleFile {
  contents: string;
  kind: PublicPresenceSourceBundleFileKind;
  language: string;
  path: string;
}

export interface PublicPresenceAssetManifestBase {
  assetCode?: string | null;
  assetId?: string | null;
  assetKind: PublicPresenceAssetKind;
  assetRevisionId?: string | null;
  description?: LocalizedText | null;
  name?: LocalizedText | null;
  ownerId?: string | null;
  ownerType?: PublicPresenceAssetOwnerType | null;
  runtimeContractVersion: string;
}

export interface PublicPresenceTemplateAssetManifest extends PublicPresenceAssetManifestBase {
  assetKind: 'template';
  defaultSectionOrder: string[];
  label: string;
  lockedSections: string[];
  optionalSections: string[];
  personaKitFields: string[];
  policyReferences: string[];
  recommendedSections: string[];
  requiredSections: string[];
  templateId: PublicPresenceTemplateId;
  templateTypeCode: PublicPresenceTemplateTypeCode;
  useCase: string;
  validationRules: string[];
}

export interface PublicPresenceComponentAssetManifest extends PublicPresenceAssetManifestBase {
  aiPatchAllowlist?: string[];
  assetKind: 'component';
  componentType: HomepageComponentType;
  defaultProps?: Record<string, unknown>;
  fieldKeys?: string[];
  projectionMode?: PublicPresenceProjectionMode;
  propsSchemaKey?: string;
  rendererSupport: boolean;
  safetyPolicyReferences?: string[];
  sourcePolicy?: PublicPresenceSourcePolicy;
  unknownFieldPolicy?: PublicPresenceUnknownFieldPolicy;
  visualSupport: PublicPresenceComponentVisualSupport;
}

export type PublicPresenceAssetManifest =
  | PublicPresenceTemplateAssetManifest
  | PublicPresenceComponentAssetManifest;

export interface PublicPresenceTemplateSourceManifest extends PublicPresenceTemplateAssetManifest {
  authoring?: Record<string, unknown>;
  registryVersion: string;
  safetyPolicyVersion: string;
  stageSections: PublicPresenceStageSectionDefinition[];
}

export interface PublicPresenceComponentSourceManifest extends PublicPresenceComponentAssetManifest {
  aiPatchAllowlist: string[];
  authoring?: Record<string, unknown>;
  collectionOperations?: PublicPresenceCollectionOperationDefinition[];
  defaultProps: Record<string, unknown>;
  fieldDefinitions: PublicPresenceComponentDefinition['fieldDefinitions'];
  lockedSourceOwnedPolicy: PublicPresenceFallbackPolicy;
  projectionMode: PublicPresenceProjectionMode;
  propsSchemaKey: string;
  registryVersion: string;
  safetyPolicyReferences: string[];
  safetyPolicyVersion: string;
  sourcePolicy: PublicPresenceSourcePolicy;
  unknownFieldPolicy: PublicPresenceUnknownFieldPolicy;
}

export type PublicPresenceAssetSourceManifest =
  | PublicPresenceTemplateSourceManifest
  | PublicPresenceComponentSourceManifest;

export interface PublicPresenceAssetRuntimeAuthority {
  components: Record<string, PublicPresenceComponentDefinition>;
  registryVersion: string;
  safetyPolicyVersion: string;
  stageSections: Record<string, PublicPresenceStageSectionDefinition>;
  template: PublicPresenceTemplateDefinition;
}

export interface PublicPresenceAssetRecord {
  assetKind: PublicPresenceAssetKind;
  code: string;
  componentType: HomepageComponentType | null;
  createdAt: string;
  currentRevisionId: string | null;
  description: LocalizedText;
  id: string;
  isSystem: boolean;
  name: LocalizedText;
  ownerId: string | null;
  ownerType: PublicPresenceAssetOwnerType;
  status: PublicPresenceAssetStatus;
  templateId: PublicPresenceTemplateId | null;
  templateTypeCode: PublicPresenceTemplateTypeCode | null;
  updatedAt: string;
  version: number;
}

export interface PublicPresenceAssetValidationSummary {
  issueCount: number;
  passCount: number;
  warnCount: number;
}

export interface PublicPresenceAssetRevisionRecord {
  artifactStatus: PublicPresenceAssetStatus;
  assetId: string;
  createdAt: string;
  createdBy: string | null;
  id: string;
  lastValidatedAt: string | null;
  manifest: PublicPresenceAssetManifest;
  revisionNumber: number;
  runtimeContractVersion: string;
  sourceBundle: PublicPresenceSourceBundleFile[];
  sourceHash: string;
  submittedAt: string | null;
  validationState: PublicPresenceAssetValidationState;
  validationSummary: PublicPresenceAssetValidationSummary;
}

export interface PublicPresenceAssetSnapshot {
  assetId: string;
  assetRevisionId: string;
  manifest: PublicPresenceAssetManifest;
  revisionNumber: number;
  sourceBundle: PublicPresenceSourceBundleFile[];
  sourceHash: string;
}

export interface PublicPresenceAssetRevisionPin {
  assetId: string;
  assetRevisionId: string;
  snapshot: PublicPresenceAssetSnapshot | null;
  sourceHash: string;
}

export interface PublicPresenceAssetScopeContext {
  scopeId: string | null;
  scopeType: PublicPresenceAssetScopeType;
}

export interface PublicPresenceAssetListEntry {
  asset: PublicPresenceAssetRecord;
  canEdit: boolean;
  currentRevision: PublicPresenceAssetRevisionRecord | null;
  isInherited: boolean;
  scope: PublicPresenceAssetScopeContext;
}

export interface PublicPresenceAssetDetail extends PublicPresenceAssetListEntry {
  revisions: PublicPresenceAssetRevisionRecord[];
}
