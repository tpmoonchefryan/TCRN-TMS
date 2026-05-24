// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import type { HomepageComponentType, ThemeConfig } from '../types/homepage/schema';
import type { PublicPresenceAssetRevisionPin } from './assets';

export const PUBLIC_PRESENCE_DOCUMENT_SCHEMA_VERSION = '1.0' as const;
export const PUBLIC_PRESENCE_REGISTRY_VERSION = '1.0.0' as const;
export const PUBLIC_PRESENCE_SAFETY_POLICY_VERSION = '1.0.0' as const;

export const PUBLIC_PRESENCE_TEMPLATE_IDS = ['activeTalentHub', 'debutReveal'] as const;

export const PUBLIC_PRESENCE_STAGE_SECTION_KINDS = [
  'firstEncounter',
  'currentLaunchAction',
  'countdownReveal',
  'officialChannels',
  'stageSchedule',
  'teaserRevealMedia',
  'goodsSupport',
  'fanInteraction',
  'agencyNotes',
  'fanActions',
  'milestoneUnlocks',
  'officialUpdatesFeed',
] as const;

export const PUBLIC_PRESENCE_VALIDATION_SEVERITIES = [
  'fatal',
  'blocker',
  'warning',
  'info',
] as const;

export const PUBLIC_PRESENCE_VALIDATION_STATES = [
  'validEditable',
  'validLocked',
  'invalidRecoverable',
  'unsafe',
] as const;

export const PUBLIC_PRESENCE_FIELD_PROVENANCES = [
  'inherited',
  'override',
  'publicPresence',
  'locked',
  'sourceOwned',
] as const;

export const PUBLIC_PRESENCE_VALIDATION_MODES = [
  'draft',
  'preview',
  'publish',
  'projection',
  'aiPatch',
] as const;

export const PUBLIC_PRESENCE_DOCUMENT_STATES = [
  'draft',
  'inReview',
  'changesRequested',
  'approved',
  'scheduled',
  'published',
  'superseded',
  'archived',
  'rollbackDraft',
] as const;

export const PUBLIC_PRESENCE_WORKFLOW_EVENT_TYPES = [
  'draftSaved',
  'submittedForReview',
  'changesRequested',
  'approved',
  'scheduled',
  'scheduleCancelled',
  'published',
  'revealAutoSwitched',
  'unpublished',
  'rollbackDraftCreated',
  'validationSnapshotted',
] as const;

export const PUBLIC_PRESENCE_HASH_ALGORITHMS = ['sha256'] as const;

export const PUBLIC_PRESENCE_REVEAL_PHASES = [
  'teaser',
  'countdown',
  'preRevealHold',
  'revealed',
  'liveLaunch',
  'postLaunch',
  'expiredFallback',
] as const;

export const PUBLIC_PRESENCE_PHASE_VISIBILITIES = [
  'always',
  ...PUBLIC_PRESENCE_REVEAL_PHASES,
] as const;

export const PUBLIC_PRESENCE_NOTE_KINDS = [
  'announcement',
  'campaignCaveat',
  'safetyNotice',
  'legalDisclaimer',
  'contentAdvisory',
] as const;

export const PUBLIC_PRESENCE_FAN_ACTION_SLOTS = [
  'follow',
  'notify',
  'currentAction',
  'stream',
  'launch',
  'goods',
  'support',
  'marshmallow',
  'archive',
] as const;

export const PUBLIC_PRESENCE_URL_CATEGORIES = [
  'officialChannelUrl',
  'fanActionUrl',
  'goodsUrl',
  'supportUrl',
  'streamUrl',
  'launchUrl',
  'mediaAssetUrl',
  'embedUrl',
  'htmlContent',
] as const;

export const PUBLIC_PRESENCE_MEDIA_CATEGORIES = [
  'heroMedia',
  'profileAsset',
  'galleryImage',
  'metadataOgImage',
] as const;

export const PUBLIC_PRESENCE_FALLBACK_POLICIES = [
  'none',
  'safePlaceholder',
  'hide',
  'stripField',
  'lockedSourceOwned',
] as const;

export const PUBLIC_PRESENCE_COMPONENT_VISUAL_SUPPORT = ['supported', 'limited', 'locked'] as const;

export const PUBLIC_PRESENCE_SOURCE_POLICIES = [
  'registryOwned',
  'preserveLocked',
  'sourceOnly',
] as const;

export const PUBLIC_PRESENCE_PROJECTION_MODES = ['structured', 'safeFallback', 'omit'] as const;

export const PUBLIC_PRESENCE_PROJECTION_SCHEMA_VERSION = '1.0' as const;

export const PUBLIC_PRESENCE_PROJECTED_SECTION_KINDS = [
  ...PUBLIC_PRESENCE_STAGE_SECTION_KINDS,
  'legacyCompatibility',
] as const;

export const PUBLIC_PRESENCE_PROJECTION_VISIBILITIES = ['visible', 'fallback', 'omitted'] as const;

export const PUBLIC_PRESENCE_PROJECTION_SECTION_TYPES = [
  'hero',
  'profileCard',
  'socialLinks',
  'imageGallery',
  'videoEmbed',
  'richText',
  'linkButton',
  'marshmallow',
  'schedule',
  'musicPlayer',
  'liveStatus',
  'divider',
  'spacer',
  'bilibiliDynamic',
  'fallbackCard',
] as const;

export const PUBLIC_PRESENCE_PROJECTED_MEDIA_KINDS = [
  'avatar',
  'ogImage',
  'galleryImage',
  'embeddedVideo',
] as const;

export const PUBLIC_PRESENCE_PROJECTION_EVENT_TYPES = ['built', 'rebuilt', 'invalidated'] as const;

export const PUBLIC_PRESENCE_UNKNOWN_FIELD_POLICIES = [
  'preserveLocked',
  'preserveSourceOwned',
  'rejectUnsafe',
] as const;

export const PUBLIC_PRESENCE_FIELD_VALUE_TYPES = [
  'string',
  'richText',
  'url',
  'boolean',
  'integer',
  'datetime',
  'timezone',
  'enum',
  'stringArray',
  'objectArray',
  'json',
] as const;

export type PublicPresenceTemplateId = (typeof PUBLIC_PRESENCE_TEMPLATE_IDS)[number];
export type PublicPresenceStageSectionKind = (typeof PUBLIC_PRESENCE_STAGE_SECTION_KINDS)[number];
export type PublicPresenceValidationSeverity =
  (typeof PUBLIC_PRESENCE_VALIDATION_SEVERITIES)[number];
export type PublicPresenceValidationState = (typeof PUBLIC_PRESENCE_VALIDATION_STATES)[number];
export type PublicPresenceFieldProvenance = (typeof PUBLIC_PRESENCE_FIELD_PROVENANCES)[number];
export type PublicPresenceValidationMode = (typeof PUBLIC_PRESENCE_VALIDATION_MODES)[number];
export type PublicPresenceDocumentState = (typeof PUBLIC_PRESENCE_DOCUMENT_STATES)[number];
export type PublicPresenceWorkflowEventType = (typeof PUBLIC_PRESENCE_WORKFLOW_EVENT_TYPES)[number];
export type PublicPresenceHashAlgorithm = (typeof PUBLIC_PRESENCE_HASH_ALGORITHMS)[number];
export type PublicPresenceRevealPhase = (typeof PUBLIC_PRESENCE_REVEAL_PHASES)[number];
export type PublicPresencePhaseVisibility = (typeof PUBLIC_PRESENCE_PHASE_VISIBILITIES)[number];
export type PublicPresenceNoteKind = (typeof PUBLIC_PRESENCE_NOTE_KINDS)[number];
export type PublicPresenceFanActionSlot = (typeof PUBLIC_PRESENCE_FAN_ACTION_SLOTS)[number];
export type PublicPresenceUrlCategory = (typeof PUBLIC_PRESENCE_URL_CATEGORIES)[number];
export type PublicPresenceMediaCategory = (typeof PUBLIC_PRESENCE_MEDIA_CATEGORIES)[number];
export type PublicPresenceFallbackPolicy = (typeof PUBLIC_PRESENCE_FALLBACK_POLICIES)[number];
export type PublicPresenceComponentVisualSupport =
  (typeof PUBLIC_PRESENCE_COMPONENT_VISUAL_SUPPORT)[number];
export type PublicPresenceSourcePolicy = (typeof PUBLIC_PRESENCE_SOURCE_POLICIES)[number];
export type PublicPresenceProjectionMode = (typeof PUBLIC_PRESENCE_PROJECTION_MODES)[number];
export type PublicPresenceProjectedSectionKind =
  (typeof PUBLIC_PRESENCE_PROJECTED_SECTION_KINDS)[number];
export type PublicPresenceProjectionVisibility =
  (typeof PUBLIC_PRESENCE_PROJECTION_VISIBILITIES)[number];
export type PublicPresenceProjectionSectionType =
  (typeof PUBLIC_PRESENCE_PROJECTION_SECTION_TYPES)[number];
export type PublicPresenceProjectedMediaKind =
  (typeof PUBLIC_PRESENCE_PROJECTED_MEDIA_KINDS)[number];
export type PublicPresenceProjectionEventType =
  (typeof PUBLIC_PRESENCE_PROJECTION_EVENT_TYPES)[number];
export type PublicPresenceUnknownFieldPolicy =
  (typeof PUBLIC_PRESENCE_UNKNOWN_FIELD_POLICIES)[number];
export type PublicPresenceFieldValueType = (typeof PUBLIC_PRESENCE_FIELD_VALUE_TYPES)[number];

export interface PublicPresenceFieldValue<T = unknown> {
  value: T;
  provenance?: PublicPresenceFieldProvenance;
  inheritedFrom?: string | null;
  note?: string;
}

export type PublicPresenceFieldRecord = Record<string, PublicPresenceFieldValue<unknown>>;

export interface PublicPresenceComponentNode {
  id: string;
  type: HomepageComponentType | string;
  props: Record<string, unknown>;
  visible?: boolean;
}

export interface PublicPresenceSectionNode {
  id: string;
  kind: PublicPresenceStageSectionKind | string;
  title?: string;
  fields?: PublicPresenceFieldRecord;
  components?: PublicPresenceComponentNode[];
  phaseVisibility?: PublicPresencePhaseVisibility;
}

export interface PublicPresenceMetadataInput {
  title?: string;
  description?: string;
  ogImageUrl?: string;
  canonicalPath?: string;
}

export interface PublicPresencePersonaKitInput {
  accentTone?: string;
  campaignLabel?: string;
  tagline?: string;
}

export interface PublicPresenceDocument {
  schemaVersion: typeof PUBLIC_PRESENCE_DOCUMENT_SCHEMA_VERSION;
  templateId: PublicPresenceTemplateId;
  sections: PublicPresenceSectionNode[];
  metadata?: PublicPresenceMetadataInput;
  personaKit?: PublicPresencePersonaKitInput;
}

export interface PublicPresenceContentHashPolicy {
  algorithm: PublicPresenceHashAlgorithm;
  canonicalization: 'stableJson';
  coveredDocumentFields: Array<
    'schemaVersion' | 'templateId' | 'sections' | 'metadata' | 'personaKit'
  >;
  excludesDerivedFields: string[];
}

export interface PublicPresenceFieldDefinition {
  fieldKey: string;
  jsonPath: string;
  valueType: PublicPresenceFieldValueType;
  required: 'always' | 'conditional' | 'optional';
  provenance: PublicPresenceFieldProvenance[];
  visualEditable: boolean;
  aiEditable: boolean;
  sourceOnly: boolean;
  urlCategory?: PublicPresenceUrlCategory;
  mediaCategory?: PublicPresenceMediaCategory;
  phaseVisibility?: PublicPresencePhaseVisibility[];
  validationRules: string[];
  fallbackPolicy: PublicPresenceFallbackPolicy;
}

export interface PublicPresenceCollectionOperationDefinition {
  addLabel: string;
  canAdd: boolean;
  canRemove: boolean;
  canReorder: boolean;
  collectionKey: string;
  itemLabel: string;
  maxItems?: number;
  minItems?: number;
  removeLabel: string;
  reorderLabel: string;
  disabledReason?: string | null;
}

export interface PublicPresenceTemplateDefinition {
  templateId: PublicPresenceTemplateId;
  registryVersion: string;
  label: string;
  useCase: string;
  requiredSections: PublicPresenceStageSectionKind[];
  recommendedSections: PublicPresenceStageSectionKind[];
  optionalSections: PublicPresenceStageSectionKind[];
  lockedSections: PublicPresenceStageSectionKind[];
  defaultSectionOrder: PublicPresenceStageSectionKind[];
  personaKitFields: string[];
  validationRules: string[];
  policyReferences: string[];
}

export interface PublicPresenceStageSectionDefinition {
  kind: PublicPresenceStageSectionKind;
  purpose: string;
  allowedComponents: Array<HomepageComponentType | string>;
  collectionOperations?: PublicPresenceCollectionOperationDefinition[];
  slotRules: string[];
  phaseVisibility: PublicPresencePhaseVisibility[];
  editabilityState: PublicPresenceValidationState;
  sourcePolicy: PublicPresenceSourcePolicy;
  validationRules: string[];
  fallbackBehavior: PublicPresenceFallbackPolicy;
  fieldDefinitions: PublicPresenceFieldDefinition[];
}

export interface PublicPresenceComponentDefinition {
  componentType: HomepageComponentType;
  rendererSupport: boolean;
  visualSupport: PublicPresenceComponentVisualSupport;
  sourcePolicy: PublicPresenceSourcePolicy;
  publicProjectionMode: PublicPresenceProjectionMode;
  propsSchemaKey: string;
  defaultProps: Record<string, unknown>;
  collectionOperations?: PublicPresenceCollectionOperationDefinition[];
  fieldDefinitions: PublicPresenceFieldDefinition[];
  unknownFieldPolicy: PublicPresenceUnknownFieldPolicy;
  lockedSourceOwnedPolicy: PublicPresenceFallbackPolicy;
  safetyPolicyReferences: string[];
  aiPatchAllowlist: string[];
}

export interface PublicPresenceUrlPolicy {
  category: PublicPresenceUrlCategory;
  allowedProtocols: string[];
  allowListedHosts?: string[];
  allowInternalPath: boolean;
  blockPrivateHosts: boolean;
  description: string;
}

export interface PublicPresenceMediaPolicy {
  category: PublicPresenceMediaCategory;
  allowedProtocols: string[];
  allowInternalPath: boolean;
  preferManagedAssets: boolean;
  description: string;
}

export interface PublicPresenceEmbedPolicy {
  providerId: string;
  acceptedHosts: string[];
  allowYouTubeWatchUrl: boolean;
  fallbackBehavior: PublicPresenceFallbackPolicy;
  aiEditable: boolean;
}

export interface PublicPresenceSafetyPolicy {
  version: string;
  urlPolicies: Record<PublicPresenceUrlCategory, PublicPresenceUrlPolicy>;
  mediaPolicies: Record<PublicPresenceMediaCategory, PublicPresenceMediaPolicy>;
  embedPolicies: Record<string, PublicPresenceEmbedPolicy>;
  htmlRules: {
    forbiddenPatterns: string[];
    fallbackBehavior: PublicPresenceFallbackPolicy;
  };
}

export interface PublicPresenceValidationIssue {
  id: string;
  severity: PublicPresenceValidationSeverity;
  state: PublicPresenceValidationState;
  code: string;
  messageKey: string;
  path: string[];
  templateId: PublicPresenceTemplateId;
  sectionId?: string;
  componentId?: string;
  fieldKey?: string;
  blocksVisualEdit: boolean;
  blocksPublish: boolean;
  blocksAiPatch: boolean;
  acknowledgementRequired: boolean;
  fallbackBehavior: PublicPresenceFallbackPolicy;
  suggestedFix?: string;
  registryVersion: string;
  policyVersion: string;
}

export interface PublicPresenceValidationIssueCounts {
  fatal: number;
  blocker: number;
  warning: number;
  info: number;
}

export interface PublicPresenceFallbackDecision {
  path: string[];
  policy: PublicPresenceFallbackPolicy;
  reason: string;
}

export interface PublicPresenceValidationSnapshot {
  snapshotId: string;
  schemaVersion: string;
  validationMode: PublicPresenceValidationMode;
  documentSchemaVersion: string;
  templateId: PublicPresenceTemplateId;
  templateRegistryVersion: string;
  componentRegistryVersion: string;
  safetyPolicyVersion: string;
  issueCounts: PublicPresenceValidationIssueCounts;
  blockerIds: string[];
  issues: PublicPresenceValidationIssue[];
  fallbackDecisions: PublicPresenceFallbackDecision[];
  acknowledgementIds: string[];
  projectionHash: string | null;
  templateAssetPin?: PublicPresenceAssetRevisionPin | null;
}

export interface PublicPresenceProjectedAction {
  id: string;
  slot: string;
  label: string;
  href: string | null;
  providerId: string | null;
  category: PublicPresenceUrlCategory | 'internalRoute';
  phaseVisibility: PublicPresencePhaseVisibility;
  fallbackBehavior: PublicPresenceFallbackPolicy;
}

export interface PublicPresenceProjectedMedia {
  id: string;
  kind: PublicPresenceProjectedMediaKind;
  providerId: string | null;
  assetId: string | null;
  url: string | null;
  alt: string | null;
  phaseVisibility: PublicPresencePhaseVisibility;
  fallbackBehavior: PublicPresenceFallbackPolicy;
}

export interface PublicPresenceProjectionMetadata {
  title: string | null;
  description: string | null;
  canonicalPath: string;
  ogImage: PublicPresenceProjectedMedia | null;
  ogImageAlt: string | null;
  locale: string | null;
}

export interface PublicPresenceProjectionRoute {
  canonicalPath: string;
  legacyPath: string | null;
  tenantCode: string | null;
  talentCode: string | null;
  domainHostname: string | null;
  cacheKeys: string[];
}

export interface PublicPresenceProjectedSectionBase {
  id: string;
  kind: PublicPresenceProjectedSectionKind;
  sectionType: PublicPresenceProjectionSectionType;
  visibility: PublicPresenceProjectionVisibility;
  fallbackBehavior: PublicPresenceFallbackPolicy;
  validationIssueIds: string[];
}

export interface PublicPresenceProjectedHeroSection extends PublicPresenceProjectedSectionBase {
  sectionType: 'hero';
  title: string;
  description: string | null;
  timezone: string | null;
  avatar: PublicPresenceProjectedMedia | null;
  primaryAction: PublicPresenceProjectedAction | null;
}

export interface PublicPresenceProjectedProfileCardSection extends PublicPresenceProjectedSectionBase {
  sectionType: 'profileCard';
  displayName: string | null;
  bio: string | null;
  avatar: PublicPresenceProjectedMedia | null;
}

export interface PublicPresenceProjectedSocialLinksSection extends PublicPresenceProjectedSectionBase {
  sectionType: 'socialLinks';
  title: string | null;
  links: PublicPresenceProjectedAction[];
  layout: 'horizontal' | 'vertical' | 'grid';
  style: 'icon' | 'button' | 'pill';
}

export interface PublicPresenceProjectedImageGallerySection extends PublicPresenceProjectedSectionBase {
  sectionType: 'imageGallery';
  title: string | null;
  images: PublicPresenceProjectedMedia[];
  columns: number;
  showCaptions: boolean;
}

export interface PublicPresenceProjectedVideoEmbedSection extends PublicPresenceProjectedSectionBase {
  sectionType: 'videoEmbed';
  title: string | null;
  providerId: string | null;
  iframeSrc: string | null;
  aspectRatio: '16:9' | '4:3' | '1:1';
  allow: string | null;
  referrerPolicy: string | null;
  sandbox: string | null;
  fallbackAction: PublicPresenceProjectedAction | null;
}

export interface PublicPresenceProjectedRichTextSection extends PublicPresenceProjectedSectionBase {
  sectionType: 'richText';
  html: string;
  textAlign: 'left' | 'center' | 'right';
}

export interface PublicPresenceProjectedLinkButtonSection extends PublicPresenceProjectedSectionBase {
  sectionType: 'linkButton';
  action: PublicPresenceProjectedAction;
}

export interface PublicPresenceProjectedMarshmallowSection extends PublicPresenceProjectedSectionBase {
  sectionType: 'marshmallow';
  title: string | null;
  description: string | null;
  action: PublicPresenceProjectedAction | null;
}

export interface PublicPresenceProjectedScheduleEvent {
  day: string;
  time: string;
  title: string;
}

export interface PublicPresenceProjectedScheduleSection extends PublicPresenceProjectedSectionBase {
  sectionType: 'schedule';
  title: string | null;
  weekOf: string | null;
  events: PublicPresenceProjectedScheduleEvent[];
}

export interface PublicPresenceProjectedMusicPlayerSection extends PublicPresenceProjectedSectionBase {
  sectionType: 'musicPlayer';
  title: string | null;
  artist: string | null;
  description: string | null;
}

export interface PublicPresenceProjectedLiveStatusSection extends PublicPresenceProjectedSectionBase {
  sectionType: 'liveStatus';
  platform: string | null;
  channelName: string | null;
  title: string | null;
  isLive: boolean;
  viewers: string | null;
  streamAction: PublicPresenceProjectedAction | null;
}

export interface PublicPresenceProjectedDividerSection extends PublicPresenceProjectedSectionBase {
  sectionType: 'divider';
  style: 'solid' | 'dashed' | 'dotted';
  spacing: 'small' | 'medium' | 'large';
}

export interface PublicPresenceProjectedSpacerSection extends PublicPresenceProjectedSectionBase {
  sectionType: 'spacer';
  height: 'small' | 'medium' | 'large' | 'xlarge';
}

export interface PublicPresenceProjectedBilibiliDynamicSection extends PublicPresenceProjectedSectionBase {
  sectionType: 'bilibiliDynamic';
  title: string | null;
  description: string | null;
  profileAction: PublicPresenceProjectedAction | null;
}

export interface PublicPresenceProjectedFallbackCardSection extends PublicPresenceProjectedSectionBase {
  sectionType: 'fallbackCard';
  title: string;
  description: string | null;
}

export type PublicPresenceProjectedSection =
  | PublicPresenceProjectedHeroSection
  | PublicPresenceProjectedProfileCardSection
  | PublicPresenceProjectedSocialLinksSection
  | PublicPresenceProjectedImageGallerySection
  | PublicPresenceProjectedVideoEmbedSection
  | PublicPresenceProjectedRichTextSection
  | PublicPresenceProjectedLinkButtonSection
  | PublicPresenceProjectedMarshmallowSection
  | PublicPresenceProjectedScheduleSection
  | PublicPresenceProjectedMusicPlayerSection
  | PublicPresenceProjectedLiveStatusSection
  | PublicPresenceProjectedDividerSection
  | PublicPresenceProjectedSpacerSection
  | PublicPresenceProjectedBilibiliDynamicSection
  | PublicPresenceProjectedFallbackCardSection;

export interface PublicPresenceProjectionAppearance {
  theme: ThemeConfig;
}

export interface PublicPresenceProjection {
  projectionSchemaVersion: typeof PUBLIC_PRESENCE_PROJECTION_SCHEMA_VERSION;
  projectionId: string;
  projectionVersion: number;
  portalId: string | null;
  documentVersionId: string | null;
  contentHash: string;
  validationSnapshotId: string | null;
  templateAssetPin?: PublicPresenceAssetRevisionPin | null;
  registryVersion: string;
  safetyPolicyVersion: string;
  projectionHash: string;
  resolvedRevealPhase: PublicPresencePhaseVisibility;
  route: PublicPresenceProjectionRoute;
  metadata: PublicPresenceProjectionMetadata;
  appearance: PublicPresenceProjectionAppearance;
  sections: PublicPresenceProjectedSection[];
  actions: PublicPresenceProjectedAction[];
  media: PublicPresenceProjectedMedia[];
  fallbackDecisions: PublicPresenceFallbackDecision[];
  createdAt: string;
  rebuiltAt: string;
}

export interface PublicPresencePublicProjectionRoute {
  canonicalPath: string;
  legacyPath: string | null;
  tenantCode: string | null;
  talentCode: string | null;
  domainHostname: string | null;
}

export interface PublicPresencePublicProjection {
  projectionSchemaVersion: typeof PUBLIC_PRESENCE_PROJECTION_SCHEMA_VERSION;
  resolvedRevealPhase: PublicPresencePhaseVisibility;
  route: PublicPresencePublicProjectionRoute;
  metadata: PublicPresenceProjectionMetadata;
  appearance: PublicPresenceProjectionAppearance;
  sections: PublicPresenceProjectedSection[];
  actions: PublicPresenceProjectedAction[];
  media: PublicPresenceProjectedMedia[];
}

export interface PublicPresenceProjectionEvent {
  eventType: PublicPresenceProjectionEventType;
  projectionHash: string;
  cacheKeys: string[];
  source: 'legacyHomepageCompatibility' | 'publicPresenceDocument';
  validationState: 'clean' | 'fallback';
  createdAt: string;
}
