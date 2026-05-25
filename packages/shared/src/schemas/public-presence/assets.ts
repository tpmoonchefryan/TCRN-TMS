// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { z } from 'zod';

import {
  ARTIST_STATUS_CODES,
  PUBLIC_PRESENCE_ASSET_KINDS,
  PUBLIC_PRESENCE_ASSET_OWNER_TYPES,
  PUBLIC_PRESENCE_ASSET_RUNTIME_VERSION,
  PUBLIC_PRESENCE_ASSET_STATUSES,
  PUBLIC_PRESENCE_ASSET_SCOPE_TYPES,
  PUBLIC_PRESENCE_ASSET_VALIDATION_STATES,
  PUBLIC_PRESENCE_SOURCE_BUNDLE_FILE_KINDS,
  PUBLIC_PRESENCE_TEMPLATE_TYPE_CODES,
  type ArtistStageRecord,
} from '../../public-presence/assets';
import {
  PUBLIC_PRESENCE_COMPONENT_VISUAL_SUPPORT,
  PUBLIC_PRESENCE_FALLBACK_POLICIES,
  PUBLIC_PRESENCE_FIELD_PROVENANCES,
  PUBLIC_PRESENCE_FIELD_VALUE_TYPES,
  PUBLIC_PRESENCE_PHASE_VISIBILITIES,
  PUBLIC_PRESENCE_PROJECTION_MODES,
  PUBLIC_PRESENCE_SOURCE_POLICIES,
  PUBLIC_PRESENCE_STAGE_SECTION_KINDS,
  PUBLIC_PRESENCE_TEMPLATE_IDS,
  PUBLIC_PRESENCE_UNKNOWN_FIELD_POLICIES,
  PUBLIC_PRESENCE_VALIDATION_STATES,
} from '../../public-presence/types';
import { HOMEPAGE_COMPONENT_TYPES } from '../../types/homepage/schema';
import { LocalizedTextSchema, PartialLocalizedTextSchema, UUIDSchema } from '../common.schema';

const AssetStatusSchema = z.enum(PUBLIC_PRESENCE_ASSET_STATUSES);
const SourceBundleFileKindSchema = z.enum(PUBLIC_PRESENCE_SOURCE_BUNDLE_FILE_KINDS);
const TemplateIdSchema = z.enum(PUBLIC_PRESENCE_TEMPLATE_IDS);
const ComponentTypeSchema = z.enum(HOMEPAGE_COMPONENT_TYPES);
const TemplateTypeCodeSchema = z.enum(PUBLIC_PRESENCE_TEMPLATE_TYPE_CODES);
const StageSectionKindSchema = z.enum(PUBLIC_PRESENCE_STAGE_SECTION_KINDS);
const FieldValueTypeSchema = z.enum(PUBLIC_PRESENCE_FIELD_VALUE_TYPES);
const FieldProvenanceSchema = z.enum(PUBLIC_PRESENCE_FIELD_PROVENANCES);
const PhaseVisibilitySchema = z.enum(PUBLIC_PRESENCE_PHASE_VISIBILITIES);
const ValidationStateSchema = z.enum(PUBLIC_PRESENCE_VALIDATION_STATES);
const FallbackPolicySchema = z.enum(PUBLIC_PRESENCE_FALLBACK_POLICIES);
const IsoDateTimeSchema = z.string().datetime({ offset: true });
const Sha256HashSchema = z.string().regex(/^[a-f0-9]{64}$/i, 'Expected a SHA-256 hash');

export interface ArtistLifecycleFlowStageCatalogEntry {
  code: string;
  id: string;
  isActive: boolean;
}

export const ArtistStatusCodeSchema = z.enum(ARTIST_STATUS_CODES);

export const ArtistStageLifecycleMappingSchema = ArtistStatusCodeSchema;

export const PublicPresenceAssetKindSchema = z.enum(PUBLIC_PRESENCE_ASSET_KINDS);

export const PublicPresenceAssetOwnerTypeSchema = z.enum(PUBLIC_PRESENCE_ASSET_OWNER_TYPES);

export const PublicPresenceAssetScopeTypeSchema = z.enum(PUBLIC_PRESENCE_ASSET_SCOPE_TYPES);

export const PublicPresenceAssetStatusSchema = AssetStatusSchema;

export const PublicPresenceAssetValidationStateSchema = z.enum(
  PUBLIC_PRESENCE_ASSET_VALIDATION_STATES
);

export const PublicPresenceSourceBundleFileSchema = z
  .object({
    contents: z.string(),
    kind: SourceBundleFileKindSchema,
    language: z.string().trim().min(1).max(64),
    path: z.string().trim().min(1).max(255),
  })
  .strict();

export const ArtistStageRecordSchema = z
  .object({
    code: z.string().trim().min(1).max(32),
    color: z.string().trim().min(1).max(16).nullable(),
    createdAt: IsoDateTimeSchema,
    description: LocalizedTextSchema,
    artistStatusCode: ArtistStatusCodeSchema,
    id: UUIDSchema,
    isActive: z.boolean(),
    isSystem: z.boolean(),
    name: LocalizedTextSchema,
    ownerId: UUIDSchema.nullable(),
    ownerType: z.literal('tenant'),
    sortOrder: z.number().int(),
    updatedAt: IsoDateTimeSchema,
    version: z.number().int().min(1),
  })
  .strict() satisfies z.ZodType<ArtistStageRecord>;

export const ArtistLifecycleFlowNodeSchema = z
  .object({
    stageCode: z.string().trim().min(1).max(32),
    stageId: UUIDSchema,
  })
  .strict();

export const ArtistLifecycleFlowTransitionSchema = z
  .object({
    fromStageId: UUIDSchema,
    id: z.string().trim().min(1).max(64),
    label: z.string().trim().min(1).max(255).nullable(),
    reason: z.string().trim().min(1).max(1024).nullable(),
    toStageId: UUIDSchema,
  })
  .strict();

export const ArtistLifecycleHomepagePolicySchema = z
  .object({
    allowedTemplateTypeCodes: z.array(TemplateTypeCodeSchema),
    stageId: UUIDSchema,
  })
  .strict();

const ArtistLifecycleFlowSchemaBase = z
  .object({
    homepagePolicyByStage: z.array(ArtistLifecycleHomepagePolicySchema),
    nodes: z.array(ArtistLifecycleFlowNodeSchema),
    transitions: z.array(ArtistLifecycleFlowTransitionSchema),
  })
  .strict();

export function createArtistLifecycleFlowSchema(options?: {
  stageCatalog?: ArtistLifecycleFlowStageCatalogEntry[];
}) {
  return ArtistLifecycleFlowSchemaBase.superRefine((flow, context) => {
    const stageIds = new Set<string>();
    const stageCodes = new Set<string>();

    for (const [index, node] of flow.nodes.entries()) {
      if (stageIds.has(node.stageId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate stageId in artist lifecycle flow nodes',
          path: ['nodes', index, 'stageId'],
        });
      }

      if (stageCodes.has(node.stageCode)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate stageCode in artist lifecycle flow nodes',
          path: ['nodes', index, 'stageCode'],
        });
      }

      stageIds.add(node.stageId);
      stageCodes.add(node.stageCode);
    }

    const transitionKeys = new Set<string>();
    for (const [index, transition] of flow.transitions.entries()) {
      if (!stageIds.has(transition.fromStageId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Transition source stage must exist in flow nodes',
          path: ['transitions', index, 'fromStageId'],
        });
      }

      if (!stageIds.has(transition.toStageId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Transition target stage must exist in flow nodes',
          path: ['transitions', index, 'toStageId'],
        });
      }

      if (transition.fromStageId === transition.toStageId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Transition source and target stage must differ',
          path: ['transitions', index, 'toStageId'],
        });
      }

      const transitionKey = `${transition.fromStageId}->${transition.toStageId}`;
      if (transitionKeys.has(transitionKey)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate stage transition is not allowed',
          path: ['transitions', index],
        });
      }
      transitionKeys.add(transitionKey);
    }

    const policyStageIds = new Set<string>();
    for (const [index, policy] of flow.homepagePolicyByStage.entries()) {
      if (!stageIds.has(policy.stageId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Homepage policy stage must exist in flow nodes',
          path: ['homepagePolicyByStage', index, 'stageId'],
        });
      }

      if (policyStageIds.has(policy.stageId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate homepage policy stage is not allowed',
          path: ['homepagePolicyByStage', index, 'stageId'],
        });
      }
      policyStageIds.add(policy.stageId);

      const templateTypeCodes = new Set<string>();
      for (const [templateIndex, templateTypeCode] of policy.allowedTemplateTypeCodes.entries()) {
        if (templateTypeCodes.has(templateTypeCode)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Duplicate allowed homepage template type code is not allowed',
            path: ['homepagePolicyByStage', index, 'allowedTemplateTypeCodes', templateIndex],
          });
        }
        templateTypeCodes.add(templateTypeCode);
      }
    }

    if (!options?.stageCatalog) {
      return;
    }

    const stageCatalogById = new Map(options.stageCatalog.map((stage) => [stage.id, stage]));

    for (const [index, node] of flow.nodes.entries()) {
      const catalogStage = stageCatalogById.get(node.stageId);

      if (!catalogStage) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Flow node stage must exist in the tenant artist stage catalog',
          path: ['nodes', index, 'stageId'],
        });
        continue;
      }

      if (!catalogStage.isActive) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Flow node stage must be active in the tenant artist stage catalog',
          path: ['nodes', index, 'stageId'],
        });
      }

      if (catalogStage.code !== node.stageCode) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Flow node stageCode must match the tenant artist stage catalog',
          path: ['nodes', index, 'stageCode'],
        });
      }
    }

    for (const [index, policy] of flow.homepagePolicyByStage.entries()) {
      const catalogStage = stageCatalogById.get(policy.stageId);

      if (!catalogStage) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Homepage policy stage must exist in the tenant artist stage catalog',
          path: ['homepagePolicyByStage', index, 'stageId'],
        });
        continue;
      }

      if (!catalogStage.isActive) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Homepage policy stage must be active in the tenant artist stage catalog',
          path: ['homepagePolicyByStage', index, 'stageId'],
        });
      }
    }
  });
}

export const ArtistLifecycleFlowSchema = createArtistLifecycleFlowSchema();

export const PublicPresenceAssetManifestBaseSchema = z
  .object({
    assetCode: z.string().trim().min(1).max(64).nullable().optional(),
    assetId: UUIDSchema.nullable().optional(),
    assetKind: PublicPresenceAssetKindSchema,
    assetRevisionId: UUIDSchema.nullable().optional(),
    description: LocalizedTextSchema.nullable().optional(),
    name: LocalizedTextSchema.nullable().optional(),
    ownerId: UUIDSchema.nullable().optional(),
    ownerType: PublicPresenceAssetOwnerTypeSchema.nullable().optional(),
    runtimeContractVersion: z.string().trim().min(1).max(32),
  })
  .strict();

export const PublicPresenceTemplateAssetManifestSchema =
  PublicPresenceAssetManifestBaseSchema.extend({
    assetKind: z.literal('template'),
    defaultSectionOrder: z.array(StageSectionKindSchema),
    label: z.string().trim().min(1).max(255),
    lockedSections: z.array(StageSectionKindSchema),
    optionalSections: z.array(StageSectionKindSchema),
    personaKitFields: z.array(z.string().trim().min(1).max(128)),
    policyReferences: z.array(z.string().trim().min(1).max(128)),
    recommendedSections: z.array(StageSectionKindSchema),
    requiredSections: z.array(StageSectionKindSchema),
    templateId: TemplateIdSchema,
    templateTypeCode: TemplateTypeCodeSchema,
    useCase: z.string().trim().min(1).max(255),
    validationRules: z.array(z.string().trim().min(1).max(255)),
  }).strict();

export const PublicPresenceComponentAssetManifestSchema =
  PublicPresenceAssetManifestBaseSchema.extend({
    aiPatchAllowlist: z.array(z.string().trim().min(1).max(255)).optional(),
    assetKind: z.literal('component'),
    componentType: ComponentTypeSchema,
    defaultProps: z.record(z.string(), z.unknown()).optional(),
    fieldKeys: z.array(z.string().trim().min(1).max(128)).optional(),
    projectionMode: z.enum(PUBLIC_PRESENCE_PROJECTION_MODES).optional(),
    propsSchemaKey: z.string().trim().min(1).max(128).optional(),
    rendererSupport: z.boolean(),
    safetyPolicyReferences: z.array(z.string().trim().min(1).max(128)).optional(),
    sourcePolicy: z.enum(PUBLIC_PRESENCE_SOURCE_POLICIES).optional(),
    unknownFieldPolicy: z.enum(PUBLIC_PRESENCE_UNKNOWN_FIELD_POLICIES).optional(),
    visualSupport: z.enum(PUBLIC_PRESENCE_COMPONENT_VISUAL_SUPPORT),
  }).strict();

export const PublicPresenceAssetManifestSchema = z.discriminatedUnion('assetKind', [
  PublicPresenceTemplateAssetManifestSchema,
  PublicPresenceComponentAssetManifestSchema,
]);

export const PublicPresenceCollectionOperationDefinitionSchema = z
  .object({
    addLabel: z.string().trim().min(1).max(255),
    canAdd: z.boolean(),
    canRemove: z.boolean(),
    canReorder: z.boolean(),
    collectionKey: z.string().trim().min(1).max(128),
    disabledReason: z.string().trim().min(1).max(255).nullable().optional(),
    itemLabel: z.string().trim().min(1).max(255),
    maxItems: z.number().int().min(0).optional(),
    minItems: z.number().int().min(0).optional(),
    removeLabel: z.string().trim().min(1).max(255),
    reorderLabel: z.string().trim().min(1).max(255),
  })
  .strict();

export const PublicPresenceFieldDefinitionSchema = z
  .object({
    fallbackPolicy: FallbackPolicySchema,
    fieldKey: z.string().trim().min(1).max(128),
    jsonPath: z.string().trim().min(1).max(255),
    mediaCategory: z.string().trim().min(1).max(64).optional(),
    phaseVisibility: z.array(PhaseVisibilitySchema).optional(),
    provenance: z.array(FieldProvenanceSchema).min(1),
    required: z.enum(['always', 'conditional', 'optional']),
    sourceOnly: z.boolean(),
    urlCategory: z.string().trim().min(1).max(64).optional(),
    validationRules: z.array(z.string().trim().min(1).max(255)),
    valueType: FieldValueTypeSchema,
    visualEditable: z.boolean(),
    aiEditable: z.boolean(),
  })
  .strict();

export const PublicPresenceStageSectionDefinitionSchema = z
  .object({
    allowedComponents: z.array(z.union([ComponentTypeSchema, z.string().trim().min(1).max(128)])),
    collectionOperations: z.array(PublicPresenceCollectionOperationDefinitionSchema).optional(),
    editabilityState: ValidationStateSchema,
    fallbackBehavior: FallbackPolicySchema,
    fieldDefinitions: z.array(PublicPresenceFieldDefinitionSchema),
    kind: StageSectionKindSchema,
    phaseVisibility: z.array(PhaseVisibilitySchema),
    purpose: z.string().trim().min(1).max(2048),
    slotRules: z.array(z.string().trim().min(1).max(255)),
    sourcePolicy: z.enum(PUBLIC_PRESENCE_SOURCE_POLICIES),
    validationRules: z.array(z.string().trim().min(1).max(255)),
  })
  .strict();

export const PublicPresenceTemplateSourceManifestSchema =
  PublicPresenceTemplateAssetManifestSchema.extend({
    authoring: z.record(z.string(), z.unknown()).optional(),
    registryVersion: z.string().trim().min(1).max(32),
    safetyPolicyVersion: z.string().trim().min(1).max(32),
    stageSections: z.array(PublicPresenceStageSectionDefinitionSchema).min(1),
  }).passthrough();

export const PublicPresenceComponentSourceManifestSchema =
  PublicPresenceComponentAssetManifestSchema.extend({
    aiPatchAllowlist: z.array(z.string().trim().min(1).max(255)),
    authoring: z.record(z.string(), z.unknown()).optional(),
    collectionOperations: z.array(PublicPresenceCollectionOperationDefinitionSchema).optional(),
    defaultProps: z.record(z.string(), z.unknown()),
    fieldDefinitions: z.array(PublicPresenceFieldDefinitionSchema).min(1),
    lockedSourceOwnedPolicy: FallbackPolicySchema,
    projectionMode: z.enum(PUBLIC_PRESENCE_PROJECTION_MODES),
    propsSchemaKey: z.string().trim().min(1).max(128),
    registryVersion: z.string().trim().min(1).max(32),
    safetyPolicyReferences: z.array(z.string().trim().min(1).max(128)),
    safetyPolicyVersion: z.string().trim().min(1).max(32),
    sourcePolicy: z.enum(PUBLIC_PRESENCE_SOURCE_POLICIES),
    unknownFieldPolicy: z.enum(PUBLIC_PRESENCE_UNKNOWN_FIELD_POLICIES),
  }).passthrough();

export const PublicPresenceAssetSourceManifestSchema = z.discriminatedUnion('assetKind', [
  PublicPresenceTemplateSourceManifestSchema,
  PublicPresenceComponentSourceManifestSchema,
]);

const PublicPresenceAssetScopeQueryBaseSchema = z
  .object({
    scopeId: UUIDSchema.optional(),
    scopeType: PublicPresenceAssetScopeTypeSchema.optional(),
  })
  .strict();

const PublicPresenceAssetScopeQueryRefinement = (
  value: {
    scopeId?: string;
    scopeType?: z.infer<typeof PublicPresenceAssetScopeTypeSchema>;
  },
  context: z.RefinementCtx
) => {
  const normalizedScopeType = value.scopeType ?? 'tenant';

  if (normalizedScopeType === 'tenant' && value.scopeId !== undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Tenant asset scope must not include scopeId.',
      path: ['scopeId'],
    });
  }

  if (normalizedScopeType !== 'tenant' && !value.scopeId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Subsidiary and talent asset scopes require scopeId.',
      path: ['scopeId'],
    });
  }
};

export const PublicPresenceAssetScopeQuerySchema =
  PublicPresenceAssetScopeQueryBaseSchema.superRefine(PublicPresenceAssetScopeQueryRefinement);

export const PublicPresenceAssetListQuerySchema = PublicPresenceAssetScopeQueryBaseSchema.extend({
  assetKind: PublicPresenceAssetKindSchema.optional(),
})
  .strict()
  .superRefine(PublicPresenceAssetScopeQueryRefinement);

const PublicPresenceAssetOptionalCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .nullable()
  .optional();

const PublicPresenceAssetOptionalNameSchema = PartialLocalizedTextSchema.nullable().optional();

const PublicPresenceAssetOptionalDescriptionSchema =
  PartialLocalizedTextSchema.nullable().optional();

const PublicPresenceAssetOptionalSourceBundleSchema = z
  .array(PublicPresenceSourceBundleFileSchema)
  .min(1)
  .optional();

export const CreatePublicPresenceAssetSchema = z.discriminatedUnion('assetKind', [
  z
    .object({
      assetKind: z.literal('template'),
      code: PublicPresenceAssetOptionalCodeSchema,
      componentType: z.null().optional(),
      description: PublicPresenceAssetOptionalDescriptionSchema,
      manifest: PublicPresenceTemplateAssetManifestSchema.optional(),
      name: PublicPresenceAssetOptionalNameSchema,
      sourceBundle: PublicPresenceAssetOptionalSourceBundleSchema,
      templateId: TemplateIdSchema,
      templateTypeCode: TemplateTypeCodeSchema.optional(),
    })
    .strict()
    .superRefine((value, context) => {
      if (value.manifest && value.manifest.templateId !== value.templateId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Template asset manifest templateId must match the requested templateId.',
          path: ['manifest', 'templateId'],
        });
      }

      if (
        value.templateTypeCode &&
        value.manifest &&
        value.manifest.templateTypeCode !== value.templateTypeCode
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Template asset manifest templateTypeCode must match the requested templateTypeCode.',
          path: ['manifest', 'templateTypeCode'],
        });
      }
    }),
  z
    .object({
      assetKind: z.literal('component'),
      code: PublicPresenceAssetOptionalCodeSchema,
      componentType: ComponentTypeSchema,
      description: PublicPresenceAssetOptionalDescriptionSchema,
      manifest: PublicPresenceComponentAssetManifestSchema.optional(),
      name: PublicPresenceAssetOptionalNameSchema,
      sourceBundle: PublicPresenceAssetOptionalSourceBundleSchema,
      templateId: z.null().optional(),
    })
    .strict()
    .superRefine((value, context) => {
      if (value.manifest && value.manifest.componentType !== value.componentType) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Component asset manifest componentType must match the requested componentType.',
          path: ['manifest', 'componentType'],
        });
      }
    }),
]);

export const UpdatePublicPresenceAssetRevisionSchema = z
  .object({
    description: PublicPresenceAssetOptionalDescriptionSchema,
    manifest: PublicPresenceAssetManifestSchema.optional(),
    name: PublicPresenceAssetOptionalNameSchema,
    sourceBundle: z.array(PublicPresenceSourceBundleFileSchema).min(1),
  })
  .strict();

export const DuplicatePublicPresenceAssetSchema = z
  .object({
    code: PublicPresenceAssetOptionalCodeSchema,
    description: PublicPresenceAssetOptionalDescriptionSchema,
    name: PublicPresenceAssetOptionalNameSchema,
  })
  .strict();

export const PublicPresenceAssetRecordSchema = z
  .object({
    assetKind: PublicPresenceAssetKindSchema,
    code: z.string().trim().min(1).max(64),
    componentType: ComponentTypeSchema.nullable(),
    createdAt: IsoDateTimeSchema,
    currentRevisionId: UUIDSchema.nullable(),
    description: LocalizedTextSchema,
    id: UUIDSchema,
    isSystem: z.boolean(),
    name: LocalizedTextSchema,
    ownerId: UUIDSchema.nullable(),
    ownerType: PublicPresenceAssetOwnerTypeSchema,
    status: AssetStatusSchema,
    templateId: TemplateIdSchema.nullable(),
    templateTypeCode: TemplateTypeCodeSchema.nullable(),
    updatedAt: IsoDateTimeSchema,
    version: z.number().int().min(1),
  })
  .strict();

export const PublicPresenceAssetValidationSummarySchema = z
  .object({
    issueCount: z.number().int().min(0),
    passCount: z.number().int().min(0),
    warnCount: z.number().int().min(0),
  })
  .strict();

export const PublicPresenceAssetRevisionRecordSchema = z
  .object({
    artifactStatus: AssetStatusSchema,
    assetId: UUIDSchema,
    createdAt: IsoDateTimeSchema,
    createdBy: UUIDSchema.nullable(),
    id: UUIDSchema,
    lastValidatedAt: IsoDateTimeSchema.nullable(),
    manifest: PublicPresenceAssetManifestSchema,
    revisionNumber: z.number().int().min(1),
    runtimeContractVersion: z.string().trim().min(1).max(32),
    sourceBundle: z.array(PublicPresenceSourceBundleFileSchema).min(1),
    sourceHash: Sha256HashSchema,
    submittedAt: IsoDateTimeSchema.nullable(),
    validationState: PublicPresenceAssetValidationStateSchema,
    validationSummary: PublicPresenceAssetValidationSummarySchema,
  })
  .strict();

export const PublicPresenceAssetSnapshotSchema = z
  .object({
    assetId: UUIDSchema,
    assetRevisionId: UUIDSchema,
    manifest: PublicPresenceAssetManifestSchema,
    revisionNumber: z.number().int().min(1),
    sourceBundle: z.array(PublicPresenceSourceBundleFileSchema).min(1),
    sourceHash: Sha256HashSchema,
  })
  .strict();

export const PublicPresenceAssetRevisionPinSchema = z
  .object({
    assetId: UUIDSchema,
    assetRevisionId: UUIDSchema,
    snapshot: PublicPresenceAssetSnapshotSchema.nullable(),
    sourceHash: Sha256HashSchema,
  })
  .strict();

export const PublicPresenceAssetScopeContextSchema = z
  .object({
    scopeId: UUIDSchema.nullable(),
    scopeType: PublicPresenceAssetScopeTypeSchema,
  })
  .strict();

export const PublicPresenceAssetListEntrySchema = z
  .object({
    asset: PublicPresenceAssetRecordSchema,
    canEdit: z.boolean(),
    currentRevision: PublicPresenceAssetRevisionRecordSchema.nullable(),
    isInherited: z.boolean(),
    scope: PublicPresenceAssetScopeContextSchema,
  })
  .strict();

export const PublicPresenceAssetDetailSchema = PublicPresenceAssetListEntrySchema.extend({
  revisions: z.array(PublicPresenceAssetRevisionRecordSchema),
}).strict();

export const CurrentPublicPresenceAssetRuntimeVersionSchema = z.literal(
  PUBLIC_PRESENCE_ASSET_RUNTIME_VERSION
);
