// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ErrorCodes,
  PUBLIC_PRESENCE_DOCUMENT_SCHEMA_VERSION,
  PUBLIC_PRESENCE_STAGE_SECTION_DEFINITIONS,
  PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS,
  type PublicPresenceDocument,
  PublicPresenceDocumentSchema,
  type PublicPresenceFieldProvenance,
  type PublicPresenceFieldValue,
  type PublicPresencePhaseVisibility,
  type PublicPresenceStageSectionDefinition,
  type PublicPresenceTemplateDefinition,
  type PublicPresenceTemplateId,
  PublicPresenceTemplateIdSchema,
  type PublicPresenceValidationSnapshot,
  PublicPresenceValidationSnapshotSchema,
  type RequestContext,
} from '@tcrn/shared';

import type {
  PublicPresenceDocumentVersionRecord,
  PublicPresencePortalRecord,
  PublicPresenceValidationSnapshotRecord,
} from '../domain/public-presence-foundation.policy';
import { HomepageAdminRepository } from '../infrastructure/homepage-admin.repository';
import { PublicPresenceFoundationRepository } from '../infrastructure/public-presence-foundation.repository';
import { PublicPresenceFoundationService } from './public-presence-foundation.service';

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
  templateId: string;
  updatedAt: string;
  validationSnapshot: PublicPresenceValidationSnapshot | null;
  versionNumber: number;
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
  draftVersion: PublicPresenceStudioVersionSummary | null;
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
  selectedTemplateId: PublicPresenceTemplateId;
  stageSections: PublicPresenceStudioStageSectionSummary[];
  templates: PublicPresenceStudioTemplateSummary[];
  workflowEvents: PublicPresenceStudioWorkflowEventSummary[];
}

function createFieldValue<T>(
  value: T,
  provenance: PublicPresenceFieldProvenance = 'publicPresence',
): PublicPresenceFieldValue<T> {
  return { provenance, value };
}

function buildStarterSection(
  kind: string,
  index: number,
  talentCode: string,
  templateId: PublicPresenceTemplateId,
): PublicPresenceDocument['sections'][number] {
  if (kind === 'firstEncounter') {
    return {
      id: `${kind}-${index + 1}`,
      kind,
      fields: {
        displayName: createFieldValue(talentCode),
        headline: createFieldValue(
          templateId === 'debutReveal'
            ? `${talentCode} debut campaign`
            : `${talentCode} official public presence`,
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
        phase: createFieldValue('teaser'),
        timezone: createFieldValue('UTC'),
      },
      phaseVisibility: 'teaser',
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

  const definition =
    PUBLIC_PRESENCE_STAGE_SECTION_DEFINITIONS[
      kind as keyof typeof PUBLIC_PRESENCE_STAGE_SECTION_DEFINITIONS
    ];
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
  template: PublicPresenceTemplateDefinition,
  talentCode: string,
): PublicPresenceDocument {
  const sectionKinds = Array.from(
    new Set([
      ...template.requiredSections,
      ...template.recommendedSections,
      ...template.optionalSections,
      ...template.defaultSectionOrder,
    ]),
  );

  return {
    metadata: {
      title: talentCode,
    },
    personaKit: {
      campaignLabel: template.label,
      tagline:
        template.templateId === 'debutReveal'
          ? 'Build reveal-safe public storytelling.'
          : 'Build the official always-on public presence.',
    },
    schemaVersion: PUBLIC_PRESENCE_DOCUMENT_SCHEMA_VERSION,
    sections: sectionKinds.map((kind, index) =>
      buildStarterSection(kind, index, talentCode, template.templateId),
    ),
    templateId: template.templateId,
  };
}

function serializeTemplateDefinition(
  definition: PublicPresenceTemplateDefinition,
): PublicPresenceStudioTemplateSummary {
  return {
    defaultSectionOrder: [...definition.defaultSectionOrder],
    label: definition.label,
    optionalSections: [...definition.optionalSections],
    recommendedSections: [...definition.recommendedSections],
    requiredSections: [...definition.requiredSections],
    templateId: definition.templateId,
    useCase: definition.useCase,
  };
}

function serializeStageSectionDefinition(
  definition: PublicPresenceStageSectionDefinition,
): PublicPresenceStudioStageSectionSummary {
  return {
    allowedComponents: [...definition.allowedComponents],
    collectionOperations: (definition.collectionOperations ?? []).map((operation) => ({
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
    })),
    editabilityState: definition.editabilityState,
    fallbackBehavior: definition.fallbackBehavior,
    fieldDefinitions: definition.fieldDefinitions.map((field) => ({
      fieldKey: field.fieldKey,
      provenance: [...field.provenance],
      required: field.required,
      sourceOnly: field.sourceOnly,
      valueType: field.valueType,
      visualEditable: field.visualEditable,
    })),
    kind: definition.kind,
    phaseVisibility: [...definition.phaseVisibility],
    purpose: definition.purpose,
    sourcePolicy: definition.sourcePolicy,
  };
}

function serializePortal(
  portal: PublicPresencePortalRecord,
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

function parseDocument(
  record: PublicPresenceDocumentVersionRecord,
): PublicPresenceDocument {
  return PublicPresenceDocumentSchema.parse(record.document);
}

function parseValidationSnapshot(
  record: PublicPresenceValidationSnapshotRecord | null,
): PublicPresenceValidationSnapshot | null {
  if (!record) {
    return null;
  }

  const parsed = PublicPresenceValidationSnapshotSchema.parse(record.snapshot);

  return {
    ...parsed,
    projectionHash: parsed.projectionHash ?? null,
  };
}

function serializeVersion(
  record: PublicPresenceDocumentVersionRecord,
  validationSnapshot: PublicPresenceValidationSnapshot | null,
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
    templateId: record.templateId,
    updatedAt: record.updatedAt.toISOString(),
    validationSnapshot,
    versionNumber: record.versionNumber,
  };
}

function serializeWorkflowEvent(
  record: {
    actorId: string | null;
    contentHash: string | null;
    eventType: string;
    fromDocumentState: string | null;
    id: string;
    occurredAt: Date;
    payload: Record<string, unknown>;
    toDocumentState: string | null;
    versionId: string | null;
  },
): PublicPresenceStudioWorkflowEventSummary {
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
  liveVersion: PublicPresenceDocumentVersionRecord | null,
): PublicPresenceTemplateId {
  const requestedTemplateId = PublicPresenceTemplateIdSchema.safeParse(
    templateIdInput ?? null,
  );

  if (requestedTemplateId.success) {
    return requestedTemplateId.data;
  }

  const liveTemplateId = PublicPresenceTemplateIdSchema.safeParse(
    liveVersion?.templateId ?? null,
  );

  if (liveTemplateId.success) {
    return liveTemplateId.data;
  }

  const latestTemplateId = PublicPresenceTemplateIdSchema.safeParse(
    latestVersions[0]?.templateId ?? null,
  );

  if (latestTemplateId.success) {
    return latestTemplateId.data;
  }

  return 'activeTalentHub';
}

function extractRevealAutoSwitchAt(
  version: PublicPresenceDocumentVersionRecord | null,
): string | null {
  if (!version || version.templateId !== 'debutReveal') {
    return null;
  }

  const document = parseDocument(version);
  const countdownSection = document.sections.find(
    (section) => section.kind === 'countdownReveal',
  );
  const fieldValue = countdownSection?.fields?.revealAtUtc;

  if (!fieldValue || typeof fieldValue !== 'object' || !('value' in fieldValue)) {
    return null;
  }

  return typeof fieldValue.value === 'string' && fieldValue.value.trim().length > 0
    ? fieldValue.value.trim()
    : null;
}

function normalizePublicRouteSegment(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

@Injectable()
export class PublicPresenceStudioService {
  constructor(
    private readonly homepageAdminRepository: HomepageAdminRepository,
    private readonly publicPresenceFoundationRepository: PublicPresenceFoundationRepository,
    private readonly publicPresenceFoundationService: PublicPresenceFoundationService,
  ) {}

  async getWorkspace(
    talentId: string,
    tenantSchema: string,
    templateIdInput?: string | null,
  ): Promise<PublicPresenceStudioWorkspace> {
    const talent = await this.homepageAdminRepository.findTalentById(
      tenantSchema,
      talentId,
    );

    if (!talent) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    const tenantCode =
      (await this.homepageAdminRepository.findTenantCodeBySchema(tenantSchema))
      ?? tenantSchema;
    const normalizedTenantCode = normalizePublicRouteSegment(tenantCode);
    const normalizedTalentCode = normalizePublicRouteSegment(talent.code);
    const portal =
      await this.publicPresenceFoundationRepository.findPortalByTalentId(
        tenantSchema,
        talentId,
      );

    const templates = Object.values(PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS).map(
      serializeTemplateDefinition,
    );
    const stageSections = Object.values(
      PUBLIC_PRESENCE_STAGE_SECTION_DEFINITIONS,
    ).map(serializeStageSectionDefinition);

    if (!portal) {
      const selectedTemplateId = resolveSelectedTemplateId(
        templateIdInput,
        [],
        null,
      );

      return {
        draftVersion: null,
        liveVersion: null,
        liveTemplateId: null,
        pageVersions: Object.values(PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS).map((template) => ({
          latestVersion: null,
          liveVersion: null,
          revealAutoSwitchAt: null,
          scheduledVersion: null,
          templateId: template.templateId,
        })),
        portal: null,
        publicRoute: {
          canonicalPath: `/${normalizedTenantCode}/${normalizedTalentCode}/homepage`,
          domainHostname: talent.customDomainVerified ? talent.customDomain : null,
          legacyPath: talent.homepagePath ?? null,
          talentCode: normalizedTalentCode,
          tenantCode: normalizedTenantCode,
        },
        selectedTemplateId,
        stageSections,
        templates,
        workflowEvents: [],
      };
    }

    const [latestRecords, liveRecord, workflowEvents, scheduledRecords] = await Promise.all([
      this.publicPresenceFoundationRepository.findLatestVersionsByPortal(
        tenantSchema,
        portal.id,
      ),
      portal.liveVersionId
        ? this.publicPresenceFoundationRepository.findDocumentVersionById(
            tenantSchema,
            portal.liveVersionId,
          )
        : Promise.resolve(null),
      this.publicPresenceFoundationRepository.findWorkflowEventsByPortalId(
        tenantSchema,
        portal.id,
      ),
      Promise.all(
        Object.values(PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS).map((template) =>
          this.publicPresenceFoundationRepository.findLatestVersionByTemplate(
            tenantSchema,
            portal.id,
            template.templateId,
            ['scheduled'],
          ),
        ),
      ),
    ]);

    const selectedTemplateId = resolveSelectedTemplateId(
      templateIdInput,
      latestRecords,
      liveRecord,
    );
    const latestRecordByTemplate = new Map(
      latestRecords.map((record) => [
        record.templateId as PublicPresenceTemplateId,
        record,
      ]),
    );
    const scheduledRecordByTemplate = new Map(
      scheduledRecords
        .filter((record): record is PublicPresenceDocumentVersionRecord => Boolean(record))
        .map((record) => [record.templateId as PublicPresenceTemplateId, record]),
    );
    const versionRecords = [
      ...latestRecords,
      ...scheduledRecords.filter((record): record is PublicPresenceDocumentVersionRecord => Boolean(record)),
      ...(liveRecord ? [liveRecord] : []),
    ];
    const uniqueVersionRecords = Array.from(
      new Map(versionRecords.map((record) => [record.id, record])).values(),
    );
    const snapshotEntries = await Promise.all(
      uniqueVersionRecords.map(async (record) => {
        const snapshot = record.lastValidationSnapshotId
          ? await this.publicPresenceFoundationRepository.findValidationSnapshotById(
              tenantSchema,
              record.lastValidationSnapshotId,
            )
          : null;

        return [record.id, parseValidationSnapshot(snapshot)] as const;
      }),
    );
    const snapshotByVersionId = new Map(snapshotEntries);
    const liveTemplateId = PublicPresenceTemplateIdSchema.safeParse(
      liveRecord?.templateId ?? null,
    ).success
      ? (liveRecord?.templateId as PublicPresenceTemplateId)
      : null;
    const pageVersions = Object.values(PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS).map((template) => {
      const latestRecord =
        latestRecordByTemplate.get(template.templateId) ?? null;
      const scheduledRecord =
        scheduledRecordByTemplate.get(template.templateId) ?? null;
      const liveTemplateVersion =
        liveRecord?.templateId === template.templateId ? liveRecord : null;

      return {
        latestVersion: latestRecord
          ? serializeVersion(
              latestRecord,
              snapshotByVersionId.get(latestRecord.id) ?? null,
            )
          : null,
        liveVersion: liveTemplateVersion
          ? serializeVersion(
              liveTemplateVersion,
              snapshotByVersionId.get(liveTemplateVersion.id) ?? null,
            )
          : null,
        revealAutoSwitchAt: extractRevealAutoSwitchAt(latestRecord),
        scheduledVersion: scheduledRecord
          ? serializeVersion(
              scheduledRecord,
              snapshotByVersionId.get(scheduledRecord.id) ?? null,
            )
          : null,
        templateId: template.templateId,
      } satisfies PublicPresenceStudioPageVersionSummary;
    });
    const selectedPageVersion =
      pageVersions.find((pageVersion) => pageVersion.templateId === selectedTemplateId)
      ?? null;

    return {
      draftVersion: selectedPageVersion?.latestVersion ?? null,
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
      selectedTemplateId,
      stageSections,
      templates,
      workflowEvents: workflowEvents.map(serializeWorkflowEvent),
    };
  }

  async bootstrapDraft(
    talentId: string,
    templateIdInput: string,
    context: RequestContext,
  ): Promise<PublicPresenceStudioWorkspace> {
    const tenantSchema = context.tenantSchema ?? '';
    const templateIdResult =
      PublicPresenceTemplateIdSchema.safeParse(templateIdInput);

    if (!templateIdResult.success) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Invalid Public Presence template id.',
      });
    }

    const existingWorkspace = await this.getWorkspace(
      talentId,
      tenantSchema,
      templateIdResult.data,
    );

    if (existingWorkspace.pageVersions.some((pageVersion) => (
      pageVersion.templateId === templateIdResult.data
      && pageVersion.latestVersion !== null
    ))) {
      return existingWorkspace;
    }

    const talent = await this.homepageAdminRepository.findTalentById(
      tenantSchema,
      talentId,
    );

    if (!talent) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Talent not found',
      });
    }

    const template =
      PUBLIC_PRESENCE_TEMPLATE_DEFINITIONS[templateIdResult.data];
    const starterDocument = buildStarterDocument(template, talent.code);

    await this.publicPresenceFoundationService.saveDraft(
      talentId,
      starterDocument,
      context,
      {
        expectedCurrentContentHash: null,
      },
    );

    return this.getWorkspace(talentId, tenantSchema, templateIdResult.data);
  }

  async saveDraft(
    talentId: string,
    documentInput: unknown,
    context: RequestContext,
    expectedCurrentContentHash?: string | null,
  ): Promise<PublicPresenceStudioWorkspace> {
    const documentResult = PublicPresenceDocumentSchema.safeParse(documentInput);

    if (!documentResult.success) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Invalid Public Presence document payload.',
      });
    }

    await this.publicPresenceFoundationService.saveDraft(
      talentId,
      documentResult.data,
      context,
      {
        expectedCurrentContentHash,
      },
    );

    return this.getWorkspace(
      talentId,
      context.tenantSchema ?? '',
      documentResult.data.templateId,
    );
  }
}
