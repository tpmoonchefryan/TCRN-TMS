// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) - PolyForm Noncommercial License

import { createHash } from 'node:crypto';

import type { HomepageContentInput } from '../schemas/homepage';
import { normalizeTheme } from '../types/homepage/presets';
import type { ThemeConfig } from '../types/homepage/schema';
import {
  PUBLIC_PRESENCE_DOCUMENT_SCHEMA_VERSION,
  type PublicPresenceDocument,
  type PublicPresenceFieldValue,
  type PublicPresenceSectionNode,
  type PublicPresenceTemplateId,
  type PublicPresenceValidationIssue,
} from './types';
import {
  createPublicPresenceValidationArtifact,
  type PublicPresenceValidationArtifact,
} from './validation';

export const LEGACY_HOMEPAGE_IMPORTER_VERSION = '1.0.0' as const;

export const LEGACY_HOMEPAGE_MAPPING_STATUSES = [
  'mapped',
  'lockedSourceOwned',
  'unsafeBlocked',
  'unsupported',
] as const;

export const LEGACY_HOMEPAGE_MAPPING_CONFIDENCES = [
  'exact',
  'conservative',
  'ambiguous',
] as const;

export type LegacyHomepageMappingStatus =
  (typeof LEGACY_HOMEPAGE_MAPPING_STATUSES)[number];
export type LegacyHomepageMappingConfidence =
  (typeof LEGACY_HOMEPAGE_MAPPING_CONFIDENCES)[number];

export interface LegacyHomepageImport {
  sourceHomepageId: string | null;
  sourceVersionId: string | null;
  sourceSchemaVersion: string;
  importerVersion: typeof LEGACY_HOMEPAGE_IMPORTER_VERSION;
  importedAt: string;
  actorId: string | null;
  sourceContentHash: string;
  sourceThemeHash: string;
  mappingSummary: {
    mapped: number;
    lockedSourceOwned: number;
    unsafeBlocked: number;
    unsupported: number;
  };
}

export interface LegacyNodeMapping {
  originalComponentId: string;
  originalComponentType: string;
  originalOrder: number;
  visible: boolean;
  originalPropsHash: string;
  targetPath: string | null;
  mappingStatus: LegacyHomepageMappingStatus;
  mappingConfidence: LegacyHomepageMappingConfidence;
  validationIssueIds: string[];
  preservationId: string | null;
}

export interface LegacySourcePreservation {
  preservationId: string;
  originalComponentId: string;
  originalComponentType: string;
  rawProps: Record<string, unknown>;
  serializedNode: LegacyHomepageComponentInput;
  sourceOwnedReason: string;
  nonPublic: boolean;
  retentionPolicy: 'retainUntilCutoverProof';
}

export interface LegacyHomepageImportDryRunReport {
  importerVersion: typeof LEGACY_HOMEPAGE_IMPORTER_VERSION;
  sourceCount: number;
  mappedCount: number;
  lockedSourceOwnedCount: number;
  unsafeBlockedCount: number;
  unsupportedCount: number;
  blockerIssueIds: string[];
  issueCodes: string[];
  sectionKinds: string[];
  hasCompatibilitySection: boolean;
}

export interface ImportLegacyHomepageInput {
  actorId?: string | null;
  content: LegacyHomepageContentInput | HomepageContentInput;
  importedAt?: string;
  seoDescription?: string | null;
  seoTitle?: string | null;
  sourceHomepageId?: string | null;
  sourceVersionId?: string | null;
  templateId?: PublicPresenceTemplateId;
  theme?: ThemeConfig | null;
}

export interface LegacyHomepageImportResult {
  document: PublicPresenceDocument;
  dryRunReport: LegacyHomepageImportDryRunReport;
  importRecord: LegacyHomepageImport;
  nodeMappings: LegacyNodeMapping[];
  sourcePreservation: LegacySourcePreservation[];
  validationArtifact: PublicPresenceValidationArtifact;
}

interface MappingAccumulatorSection {
  section: PublicPresenceSectionNode;
}

export interface LegacyHomepageComponentInput {
  id: string;
  order: number;
  props: Record<string, unknown>;
  type: string;
  visible: boolean;
}

export interface LegacyHomepageContentInput {
  version: string;
  components: LegacyHomepageComponentInput[];
}

interface MutableLegacyNodeMapping extends LegacyNodeMapping {
  matchComponentId?: string;
  matchFieldKey?: string;
  matchSectionId?: string;
}

interface CreateNodeMappingInput {
  mappingConfidence: LegacyHomepageMappingConfidence;
  mappingStatus: LegacyHomepageMappingStatus;
  matchComponentId?: string;
  matchFieldKey?: string;
  matchSectionId?: string;
  targetPath: string | null;
}

const UNSAFE_HTML_PATTERN = /<script|<style|<iframe|javascript:|\son\w+=|\sstyle=/i;
const UNSAFE_URL_PATTERN =
  /^(javascript:|data:|vbscript:)|localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\./i;

function stableHash(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(sortValue(value)))
    .digest('hex');
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortValue(entry));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = sortValue((value as Record<string, unknown>)[key]);
        return accumulator;
      }, {});
  }

  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function createFieldValue(
  value: string,
  provenance: PublicPresenceFieldValue['provenance'] = 'publicPresence',
): PublicPresenceFieldValue<string> {
  return {
    value,
    provenance,
  };
}

function ensureSection(
  sections: Map<string, MappingAccumulatorSection>,
  input: PublicPresenceSectionNode,
) {
  const existing = sections.get(input.id);
  if (existing) {
    return existing.section;
  }

  const section = {
    ...input,
    components: input.components ? [...input.components] : [],
    fields: input.fields ? { ...input.fields } : {},
  } satisfies PublicPresenceSectionNode;
  sections.set(section.id, { section });
  return section;
}

function createSourcePreservation(
  component: LegacyHomepageComponentInput,
  reason: string,
): LegacySourcePreservation {
  return {
    preservationId: `preserve:${component.id}`,
    originalComponentId: component.id,
    originalComponentType: component.type,
    rawProps: component.props,
    serializedNode: component,
    sourceOwnedReason: reason,
    nonPublic: true,
    retentionPolicy: 'retainUntilCutoverProof',
  };
}

function isUnsafeHtml(value: string | null) {
  return Boolean(value) && UNSAFE_HTML_PATTERN.test(value ?? '');
}

function isUnsafeUrl(value: string | null) {
  return Boolean(value) && UNSAFE_URL_PATTERN.test(value ?? '');
}

function looksPublicHttpsUrl(value: string | null) {
  if (!value || isUnsafeUrl(value)) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isYouTubeUrl(value: string | null) {
  if (!looksPublicHttpsUrl(value)) {
    return false;
  }

  try {
    const parsed = new URL(value ?? '');
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname === 'youtu.be'
      || hostname === 'youtube.com'
      || hostname.endsWith('.youtube.com')
    );
  } catch {
    return false;
  }
}

function convertRichTextToAgencyNote(value: string | null) {
  if (!value || isUnsafeHtml(value)) {
    return null;
  }

  const titleMatch = value.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i);
  const bodyText = value
    .replace(/<h[1-3][^>]*>.*?<\/h[1-3]>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!bodyText) {
    return null;
  }

  return {
    body: bodyText,
    title: titleMatch?.[1]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      || 'Legacy note',
  };
}

function createNodeMapping(
  component: LegacyHomepageComponentInput,
  preservation: LegacySourcePreservation,
  input: CreateNodeMappingInput,
): MutableLegacyNodeMapping {
  return {
    mappingConfidence: input.mappingConfidence,
    mappingStatus: input.mappingStatus,
    matchComponentId: input.matchComponentId,
    matchFieldKey: input.matchFieldKey,
    matchSectionId: input.matchSectionId,
    originalComponentId: component.id,
    originalComponentType: component.type,
    originalOrder: component.order,
    originalPropsHash: stableHash(component.props),
    preservationId: preservation.preservationId,
    targetPath: input.targetPath,
    validationIssueIds: [],
    visible: component.visible,
  };
}

function collectIssueIdsForMapping(
  mapping: MutableLegacyNodeMapping,
  issues: PublicPresenceValidationIssue[],
) {
  return issues
    .filter((issue) => {
      if (mapping.matchComponentId) {
        return issue.componentId === mapping.matchComponentId;
      }

      if (mapping.matchSectionId && mapping.matchFieldKey) {
        return (
          issue.sectionId === mapping.matchSectionId
          && issue.fieldKey === mapping.matchFieldKey
        );
      }

      if (mapping.matchSectionId) {
        return issue.sectionId === mapping.matchSectionId;
      }

      return false;
    })
    .map((issue) => issue.id);
}

export function importLegacyHomepageContent(
  input: ImportLegacyHomepageInput,
): LegacyHomepageImportResult {
  const content = {
    version:
      typeof input.content.version === 'string' && input.content.version.trim().length > 0
        ? input.content.version
        : '1.0',
    components: Array.isArray(input.content.components)
      ? input.content.components
        .map((component, index) => {
          const record = asRecord(component);
          return {
            id: asString(record.id) ?? `legacy-component-${index + 1}`,
            order:
              typeof record.order === 'number' && Number.isFinite(record.order)
                ? record.order
                : index + 1,
            props: asRecord(record.props),
            type: asString(record.type) ?? 'Unknown',
            visible: record.visible !== false,
          } satisfies LegacyHomepageComponentInput;
        })
      : [],
  } satisfies LegacyHomepageContentInput;
  const importedAt = input.importedAt ?? new Date().toISOString();
  const templateId = input.templateId ?? 'activeTalentHub';
  const normalizedTheme = normalizeTheme(input.theme ?? null);
  const sections = new Map<string, MappingAccumulatorSection>();

  const firstEncounter = ensureSection(sections, {
    id: 'legacy-first-encounter',
    kind: 'firstEncounter',
    fields: {},
  });
  const officialChannels = ensureSection(sections, {
    id: 'legacy-official-channels',
    kind: 'officialChannels',
    components: [],
  });

  const sourcePreservation = content.components.map((component) =>
    createSourcePreservation(component, 'legacy-source-preserved'),
  );
  const preservationById = new Map(
    sourcePreservation.map((preservation) => [
      preservation.originalComponentId,
      preservation,
    ]),
  );
  const nodeMappings: MutableLegacyNodeMapping[] = [];

  const ensureCompatibilitySection = () =>
    ensureSection(sections, {
      id: 'legacy-compatibility',
      kind: 'legacyCompatibility',
      components: [],
    });

  const ensureAgencyNotesSection = () =>
    ensureSection(sections, {
      id: 'legacy-agency-notes',
      kind: 'agencyNotes',
      fields: {
        notes: {
          provenance: 'publicPresence',
          value: [],
        },
      },
    });

  const ensureFanActionsSection = () =>
    ensureSection(sections, {
      id: 'legacy-fan-actions',
      kind: 'fanActions',
      fields: {
        actions: {
          provenance: 'publicPresence',
          value: [],
        },
      },
    });

  const ensureTeaserRevealMediaSection = () =>
    ensureSection(sections, {
      id: 'legacy-media',
      kind: 'teaserRevealMedia',
      components: [],
    });

  const ensureFanInteractionSection = () =>
    ensureSection(sections, {
      id: 'legacy-fan-interaction',
      kind: 'fanInteraction',
      components: [],
    });

  const ensureStageScheduleSection = () =>
    ensureSection(sections, {
      id: 'legacy-stage-schedule',
      kind: 'stageSchedule',
      components: [],
    });

  const ensureCurrentLaunchActionSection = () =>
    ensureSection(sections, {
      id: 'legacy-current-launch',
      kind: 'currentLaunchAction',
      components: [],
    });

  const ensureOfficialUpdatesFeedSection = () =>
    ensureSection(sections, {
      id: 'legacy-official-updates',
      kind: 'officialUpdatesFeed',
      components: [],
    });

  for (const component of content.components) {
    const preservation = preservationById.get(component.id);
    if (!preservation) {
      continue;
    }
    const props = component.props;

    switch (component.type) {
      case 'ProfileCard': {
        const displayName = asString(props.displayName)
          ?? asString(input.seoTitle)
          ?? 'Legacy homepage import';
        const bio = asString(props.bio) ?? asString(input.seoDescription);
        const avatarUrl = asString(props.avatarUrl);

        const nextFields: Record<string, PublicPresenceFieldValue<unknown>> = {
          ...(firstEncounter.fields ?? {}),
          displayName: createFieldValue(displayName, 'override'),
        };
        if (avatarUrl) {
          nextFields.avatarUrl = createFieldValue(avatarUrl, 'override');
        }
        if (bio) {
          nextFields.intro = createFieldValue(bio, 'override');
        }
        firstEncounter.fields = nextFields;

        nodeMappings.push(
          createNodeMapping(component, preservation, {
            mappingConfidence: 'conservative',
            mappingStatus: 'mapped',
            matchSectionId: firstEncounter.id,
            targetPath: 'sections.firstEncounter.fields',
          }),
        );
        break;
      }
      case 'SocialLinks': {
        officialChannels.components = [
          ...(officialChannels.components ?? []),
          {
            id: component.id,
            props,
            type: component.type,
            visible: component.visible,
          },
        ];
        nodeMappings.push(
          createNodeMapping(component, preservation, {
            mappingConfidence: 'exact',
            mappingStatus: 'mapped',
            matchComponentId: component.id,
            matchSectionId: officialChannels.id,
            targetPath: 'sections.officialChannels.components',
          }),
        );
        break;
      }
      case 'LinkButton': {
        const label = asString(props.label);
        const url = asString(props.url);

        if (label && looksPublicHttpsUrl(url)) {
          const fanActions = ensureFanActionsSection();
          const currentActions = Array.isArray(fanActions.fields?.actions?.value)
            ? fanActions.fields?.actions?.value
            : [];
          fanActions.fields = {
            ...(fanActions.fields ?? {}),
            actions: {
              provenance: 'publicPresence',
              value: [
                ...currentActions,
                {
                  label,
                  slot: 'currentAction',
                  url,
                },
              ],
            },
          };
          nodeMappings.push(
            createNodeMapping(component, preservation, {
              mappingConfidence: 'conservative',
              mappingStatus: 'mapped',
              matchFieldKey: 'actions',
              matchSectionId: fanActions.id,
              targetPath: 'sections.fanActions.fields.actions',
            }),
          );
          break;
        }

        const compatibilitySection = ensureCompatibilitySection();
        compatibilitySection.components = [
          ...(compatibilitySection.components ?? []),
          {
            id: component.id,
            props,
            type: component.type,
            visible: component.visible,
          },
        ];
        nodeMappings.push(
          createNodeMapping(component, preservation, {
            mappingConfidence: looksPublicHttpsUrl(url) ? 'ambiguous' : 'ambiguous',
            mappingStatus: isUnsafeUrl(url) ? 'unsafeBlocked' : 'lockedSourceOwned',
            matchComponentId: component.id,
            matchSectionId: compatibilitySection.id,
            targetPath: 'sections.legacyCompatibility.components',
          }),
        );
        break;
      }
      case 'RichText': {
        const structuredNote = convertRichTextToAgencyNote(asString(props.contentHtml));

        if (structuredNote) {
          const agencyNotes = ensureAgencyNotesSection();
          const currentNotes = Array.isArray(agencyNotes.fields?.notes?.value)
            ? agencyNotes.fields?.notes?.value
            : [];
          agencyNotes.fields = {
            ...(agencyNotes.fields ?? {}),
            notes: {
              provenance: 'publicPresence',
              value: [
                ...currentNotes,
                {
                  body: structuredNote.body,
                  kind: 'announcement',
                  title: structuredNote.title,
                },
              ],
            },
          };
          nodeMappings.push(
            createNodeMapping(component, preservation, {
              mappingConfidence: 'conservative',
              mappingStatus: 'mapped',
              matchFieldKey: 'notes',
              matchSectionId: agencyNotes.id,
              targetPath: 'sections.agencyNotes.fields.notes',
            }),
          );
          break;
        }

        const compatibilitySection = ensureCompatibilitySection();
        compatibilitySection.components = [
          ...(compatibilitySection.components ?? []),
          {
            id: component.id,
            props,
            type: component.type,
            visible: component.visible,
          },
        ];
        nodeMappings.push(
          createNodeMapping(component, preservation, {
            mappingConfidence: 'ambiguous',
            mappingStatus: isUnsafeHtml(asString(props.contentHtml))
              ? 'unsafeBlocked'
              : 'lockedSourceOwned',
            matchComponentId: component.id,
            matchSectionId: compatibilitySection.id,
            targetPath: 'sections.legacyCompatibility.components',
          }),
        );
        break;
      }
      case 'ImageGallery': {
        const mediaSection = ensureTeaserRevealMediaSection();
        mediaSection.components = [
          ...(mediaSection.components ?? []),
          {
            id: component.id,
            props,
            type: component.type,
            visible: component.visible,
          },
        ];
        nodeMappings.push(
          createNodeMapping(component, preservation, {
            mappingConfidence: 'exact',
            mappingStatus: 'mapped',
            matchComponentId: component.id,
            matchSectionId: mediaSection.id,
            targetPath: 'sections.teaserRevealMedia.components',
          }),
        );
        break;
      }
      case 'VideoEmbed': {
        if (isYouTubeUrl(asString(props.videoUrl))) {
          const mediaSection = ensureTeaserRevealMediaSection();
          mediaSection.components = [
            ...(mediaSection.components ?? []),
            {
              id: component.id,
              props,
              type: component.type,
              visible: component.visible,
            },
          ];
          nodeMappings.push(
            createNodeMapping(component, preservation, {
              mappingConfidence: 'exact',
              mappingStatus: 'mapped',
              matchComponentId: component.id,
              matchSectionId: mediaSection.id,
              targetPath: 'sections.teaserRevealMedia.components',
            }),
          );
          break;
        }

        const compatibilitySection = ensureCompatibilitySection();
        compatibilitySection.components = [
          ...(compatibilitySection.components ?? []),
          {
            id: component.id,
            props,
            type: component.type,
            visible: component.visible,
          },
        ];
        nodeMappings.push(
          createNodeMapping(component, preservation, {
            mappingConfidence: 'ambiguous',
            mappingStatus: isUnsafeUrl(asString(props.videoUrl))
              ? 'unsafeBlocked'
              : 'lockedSourceOwned',
            matchComponentId: component.id,
            matchSectionId: compatibilitySection.id,
            targetPath: 'sections.legacyCompatibility.components',
          }),
        );
        break;
      }
      case 'MarshmallowWidget': {
        const fanInteraction = ensureFanInteractionSection();
        fanInteraction.components = [
          ...(fanInteraction.components ?? []),
          {
            id: component.id,
            props,
            type: component.type,
            visible: component.visible,
          },
        ];
        nodeMappings.push(
          createNodeMapping(component, preservation, {
            mappingConfidence: 'exact',
            mappingStatus: 'mapped',
            matchComponentId: component.id,
            matchSectionId: fanInteraction.id,
            targetPath: 'sections.fanInteraction.components',
          }),
        );
        break;
      }
      case 'Schedule': {
        const stageSchedule = ensureStageScheduleSection();
        stageSchedule.components = [
          ...(stageSchedule.components ?? []),
          {
            id: component.id,
            props,
            type: component.type,
            visible: component.visible,
          },
        ];
        nodeMappings.push(
          createNodeMapping(component, preservation, {
            mappingConfidence: 'exact',
            mappingStatus: 'mapped',
            matchComponentId: component.id,
            matchSectionId: stageSchedule.id,
            targetPath: 'sections.stageSchedule.components',
          }),
        );
        break;
      }
      case 'LiveStatus': {
        const launchSection = ensureCurrentLaunchActionSection();
        launchSection.components = [
          ...(launchSection.components ?? []),
          {
            id: component.id,
            props,
            type: component.type,
            visible: component.visible,
          },
        ];
        nodeMappings.push(
          createNodeMapping(component, preservation, {
            mappingConfidence: 'exact',
            mappingStatus: 'mapped',
            matchComponentId: component.id,
            matchSectionId: launchSection.id,
            targetPath: 'sections.currentLaunchAction.components',
          }),
        );
        break;
      }
      case 'BilibiliDynamic': {
        const updatesSection = ensureOfficialUpdatesFeedSection();
        updatesSection.components = [
          ...(updatesSection.components ?? []),
          {
            id: component.id,
            props,
            type: component.type,
            visible: component.visible,
          },
        ];
        nodeMappings.push(
          createNodeMapping(component, preservation, {
            mappingConfidence: 'exact',
            mappingStatus: 'mapped',
            matchComponentId: component.id,
            matchSectionId: updatesSection.id,
            targetPath: 'sections.officialUpdatesFeed.components',
          }),
        );
        break;
      }
      case 'MusicPlayer':
      case 'Divider':
      case 'Spacer': {
        const compatibilitySection = ensureCompatibilitySection();
        compatibilitySection.components = [
          ...(compatibilitySection.components ?? []),
          {
            id: component.id,
            props,
            type: component.type,
            visible: component.visible,
          },
        ];
        nodeMappings.push(
          createNodeMapping(component, preservation, {
            mappingConfidence: 'ambiguous',
            mappingStatus: 'lockedSourceOwned',
            matchComponentId: component.id,
            matchSectionId: compatibilitySection.id,
            targetPath: 'sections.legacyCompatibility.components',
          }),
        );
        break;
      }
      default: {
        const compatibilitySection = ensureCompatibilitySection();
        compatibilitySection.components = [
          ...(compatibilitySection.components ?? []),
          {
            id: component.id,
            props,
            type: component.type,
            visible: component.visible,
          },
        ];
        nodeMappings.push(
          createNodeMapping(component, preservation, {
            mappingConfidence: 'ambiguous',
            mappingStatus: 'unsupported',
            matchComponentId: component.id,
            matchSectionId: compatibilitySection.id,
            targetPath: 'sections.legacyCompatibility.components',
          }),
        );
      }
    }
  }

  if (!firstEncounter.fields?.displayName) {
    firstEncounter.fields = {
      ...(firstEncounter.fields ?? {}),
      displayName: createFieldValue(
        asString(input.seoTitle) ?? 'Legacy homepage import',
        'publicPresence',
      ),
    };
  }

  const document = {
    schemaVersion: PUBLIC_PRESENCE_DOCUMENT_SCHEMA_VERSION,
    templateId,
    metadata: {
      description: asString(input.seoDescription) ?? undefined,
      title: asString(input.seoTitle) ?? undefined,
    },
    personaKit: undefined,
    sections: [...sections.values()].map((entry) => entry.section),
  } satisfies PublicPresenceDocument;

  const validationArtifact = createPublicPresenceValidationArtifact(document, {
    mode: 'draft',
  });

  const finalizedMappings = nodeMappings.map((mapping) => ({
    ...mapping,
    validationIssueIds: collectIssueIdsForMapping(
      mapping,
      validationArtifact.snapshot.issues,
    ),
  }));

  const mappingSummary = finalizedMappings.reduce(
    (summary, mapping) => {
      summary[mapping.mappingStatus] += 1;
      return summary;
    },
    {
      lockedSourceOwned: 0,
      mapped: 0,
      unsupported: 0,
      unsafeBlocked: 0,
    },
  );

  return {
    document: validationArtifact.document,
    dryRunReport: {
      blockerIssueIds: validationArtifact.snapshot.blockerIds,
      hasCompatibilitySection: validationArtifact.document.sections.some(
        (section) => section.kind === 'legacyCompatibility',
      ),
      importerVersion: LEGACY_HOMEPAGE_IMPORTER_VERSION,
      issueCodes: validationArtifact.snapshot.issues.map((issue) => issue.code),
      lockedSourceOwnedCount: mappingSummary.lockedSourceOwned,
      mappedCount: mappingSummary.mapped,
      sectionKinds: validationArtifact.document.sections.map((section) => section.kind),
      sourceCount: content.components.length,
      unsafeBlockedCount: mappingSummary.unsafeBlocked,
      unsupportedCount: mappingSummary.unsupported,
    },
    importRecord: {
      actorId: input.actorId ?? null,
      importedAt,
      importerVersion: LEGACY_HOMEPAGE_IMPORTER_VERSION,
      mappingSummary,
      sourceContentHash: stableHash(content),
      sourceHomepageId: input.sourceHomepageId ?? null,
      sourceSchemaVersion: content.version,
      sourceThemeHash: stableHash(normalizedTheme),
      sourceVersionId: input.sourceVersionId ?? null,
    },
    nodeMappings: finalizedMappings.map(
      ({
        matchComponentId: _matchComponentId,
        matchFieldKey: _matchFieldKey,
        matchSectionId: _matchSectionId,
        ...mapping
      }) => mapping,
    ),
    sourcePreservation,
    validationArtifact,
  };
}
