// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  buildBlankPublicPresenceAssetSourceBundle,
  buildPublicPresenceComponentAssetManifest,
  ErrorCodes,
  getPublicPresenceComponentSeedText,
  getPublicPresenceSystemAssetSeeds,
  getPublicPresenceTemplateSeedText,
  buildPublicPresenceTemplateAssetManifest,
  resolvePublicPresenceTemplateTypeCode,
  type HomepageComponentType,
  type LocalizedText,
  type PublicPresenceAssetDetail,
  type PublicPresenceAssetKind,
  type PublicPresenceAssetListEntry,
  type PublicPresenceAssetManifest,
  type PublicPresenceAssetOwnerType,
  type PublicPresenceAssetScopeType,
  type PublicPresenceAssetStatus,
  type PublicPresenceAssetValidationSummary,
  type PublicPresenceSourceBundleFile,
  type PublicPresenceTemplateId,
  type PublicPresenceTemplateTypeCode,
  type RequestContext,
} from '@tcrn/shared';

import {
  derivePublicPresenceAssetManifestFromSourceManifest,
  parsePublicPresenceAssetSourceManifest,
} from '../domain/public-presence-asset-runtime.policy';
import {
  appendPublicPresenceAssetCopySuffix,
  assertManifestMatchesAssetRecord,
  buildDraftPublicPresenceAssetSummary,
  buildValidatedPublicPresenceAssetSummary,
  calculatePublicPresenceAssetSourceHash,
  normalizePublicPresenceAssetCode,
  normalizePublicPresenceAssetDescription,
  normalizePublicPresenceAssetName,
  normalizePublicPresenceAssetScope,
  parsePublicPresenceAssetManifest,
  parsePublicPresenceSourceBundle,
} from '../domain/public-presence-asset.policy';
import {
  type PublicPresenceAssetRevisionRow,
  type PublicPresenceAssetRow,
  type PublicPresenceAssetScopeRef,
  PublicPresenceAssetRepository,
} from '../infrastructure/public-presence-asset.repository';

interface ListAssetsInput {
  assetKind?: PublicPresenceAssetKind;
  scopeId?: string | null;
  scopeType?: PublicPresenceAssetScopeType;
}

interface CreateAssetInput {
  assetKind: PublicPresenceAssetKind;
  code?: string | null;
  componentType?: HomepageComponentType | null;
  description?: Partial<LocalizedText> | null;
  manifest?: unknown;
  name?: Partial<LocalizedText> | null;
  scopeId?: string | null;
  scopeType?: PublicPresenceAssetScopeType;
  sourceBundle?: unknown;
  templateId?: PublicPresenceTemplateId | null;
  templateTypeCode?: PublicPresenceTemplateTypeCode | null;
}

interface SaveAssetRevisionInput {
  description?: Partial<LocalizedText> | null;
  manifest?: unknown;
  name?: Partial<LocalizedText> | null;
  scopeId?: string | null;
  scopeType?: PublicPresenceAssetScopeType;
  sourceBundle: unknown;
}

interface DuplicateAssetInput {
  code?: string | null;
  description?: Partial<LocalizedText> | null;
  name?: Partial<LocalizedText> | null;
  scopeId?: string | null;
  scopeType?: PublicPresenceAssetScopeType;
}

@Injectable()
export class PublicPresenceAssetService {
  constructor(private readonly publicPresenceAssetRepository: PublicPresenceAssetRepository) {}

  async listAssets(
    tenantSchema: string,
    input: ListAssetsInput = {},
    actorId?: string | null
  ): Promise<PublicPresenceAssetListEntry[]> {
    const scope = normalizePublicPresenceAssetScope(input.scopeType, input.scopeId);
    await this.ensureSystemSeeds(tenantSchema, actorId ?? null);
    const visibleScopes = await this.publicPresenceAssetRepository.resolveScopeChain(
      tenantSchema,
      scope.scopeType,
      scope.scopeId
    );
    const assets = await this.publicPresenceAssetRepository.listVisibleAssets(
      tenantSchema,
      visibleScopes,
      input.assetKind
    );
    const revisions = await this.publicPresenceAssetRepository.listCurrentRevisionsByAssetIds(
      tenantSchema,
      assets.map((asset) => asset.id)
    );
    const revisionMap = new Map(revisions.map((revision) => [revision.assetId, revision]));

    return assets.map((asset) =>
      this.toAssetListEntry(
        asset,
        revisionMap.get(asset.id) ?? null,
        scope.scopeType,
        scope.scopeId
      )
    );
  }

  async getAssetDetail(
    tenantSchema: string,
    assetId: string,
    input: ListAssetsInput = {},
    actorId?: string | null
  ): Promise<PublicPresenceAssetDetail> {
    const scope = normalizePublicPresenceAssetScope(input.scopeType, input.scopeId);
    await this.ensureSystemSeeds(tenantSchema, actorId ?? null);
    const visibleScopes = await this.publicPresenceAssetRepository.resolveScopeChain(
      tenantSchema,
      scope.scopeType,
      scope.scopeId
    );
    const asset = await this.requireVisibleAsset(tenantSchema, assetId, visibleScopes);
    const currentRevision = await this.publicPresenceAssetRepository.findCurrentRevision(
      tenantSchema,
      asset.id
    );
    const revisions = await this.publicPresenceAssetRepository.listRevisions(
      tenantSchema,
      asset.id
    );

    return {
      ...this.toAssetListEntry(asset, currentRevision, scope.scopeType, scope.scopeId),
      revisions: revisions.map((revision) => this.toRevisionRecord(revision)),
    };
  }

  async createAsset(
    tenantSchema: string,
    context: RequestContext,
    input: CreateAssetInput
  ): Promise<PublicPresenceAssetDetail> {
    this.assertSupportedAssetKind(input.assetKind);
    const scope = normalizePublicPresenceAssetScope(input.scopeType, input.scopeId);
    const ownerType = scope.scopeType;
    const ownerId = scope.scopeId;
    const requestedManifest = this.buildManifestForNewAsset(input, ownerType, ownerId);
    this.assertCreateAssetInputConsistency(input, requestedManifest);
    await this.ensureSystemSeeds(tenantSchema, context.userId ?? null);
    const seedText = this.getSeedTextForAssetKind(
      input.assetKind,
      input.templateId ?? null,
      input.componentType ?? null
    );
    const name = this.resolveLocalizedText(input.name, seedText.name);
    const description = this.resolveLocalizedDescription(input.description, seedText.description);
    const code = await this.createUniqueScopedCode(
      tenantSchema,
      ownerType,
      ownerId,
      normalizePublicPresenceAssetCode(
        input.code ??
          requestedManifest.assetCode ??
          (input.assetKind === 'template'
            ? (input.templateId ?? 'template')
            : (input.componentType ?? 'component'))
      )
    );
    const seedManifest = this.hydrateManifest(requestedManifest, {
      assetCode: code,
      description,
      name,
      ownerId,
      ownerType,
    });
    const sourceBundle = input.sourceBundle
      ? parsePublicPresenceSourceBundle(input.sourceBundle)
      : this.buildStarterSourceBundle(input.assetKind, code, seedManifest, name);
    const hydratedManifest = this.hydrateManifest(
      this.deriveManifestFromSourceBundle(sourceBundle),
      {
        assetCode: code,
        description,
        name,
        ownerId,
        ownerType,
      }
    );
    this.assertCreateAssetInputConsistency(input, hydratedManifest);
    const draftSummary = buildDraftPublicPresenceAssetSummary();
    const sourceHash = calculatePublicPresenceAssetSourceHash({
      manifest: hydratedManifest,
      sourceBundle,
    });

    const asset = await this.publicPresenceAssetRepository.createAssetWithCurrentRevision(
      tenantSchema,
      {
        actorId: context.userId ?? null,
        artifactStatus: 'draft',
        assetKind: input.assetKind,
        code,
        componentType:
          hydratedManifest.assetKind === 'component' ? hydratedManifest.componentType : null,
        description,
        manifest: hydratedManifest,
        name,
        ownerId,
        ownerType,
        sourceBundle,
        sourceHash,
        status: 'draft',
        templateId: hydratedManifest.assetKind === 'template' ? hydratedManifest.templateId : null,
        templateTypeCode:
          hydratedManifest.assetKind === 'template' ? hydratedManifest.templateTypeCode : null,
        validationState: draftSummary.validationState,
        validationSummary: draftSummary.validationSummary,
      }
    );

    return this.getAssetDetail(tenantSchema, asset.id, scope, context.userId ?? null);
  }

  async saveAssetDraft(
    tenantSchema: string,
    assetId: string,
    context: RequestContext,
    input: SaveAssetRevisionInput
  ): Promise<PublicPresenceAssetDetail> {
    return this.persistRevision(tenantSchema, assetId, context, input, 'draft', false);
  }

  async validateAsset(
    tenantSchema: string,
    assetId: string,
    context: RequestContext,
    input: SaveAssetRevisionInput
  ): Promise<PublicPresenceAssetDetail> {
    return this.persistRevision(tenantSchema, assetId, context, input, 'validated', true);
  }

  async duplicateAsset(
    tenantSchema: string,
    assetId: string,
    context: RequestContext,
    input: DuplicateAssetInput = {}
  ): Promise<PublicPresenceAssetDetail> {
    const scope = normalizePublicPresenceAssetScope(input.scopeType, input.scopeId);
    await this.ensureSystemSeeds(tenantSchema, context.userId ?? null);
    const visibleScopes = await this.publicPresenceAssetRepository.resolveScopeChain(
      tenantSchema,
      scope.scopeType,
      scope.scopeId
    );
    const sourceAsset = await this.requireVisibleAsset(tenantSchema, assetId, visibleScopes);
    const sourceRevision = await this.publicPresenceAssetRepository.findCurrentRevision(
      tenantSchema,
      assetId
    );

    if (!sourceRevision) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Asset current revision was not found.',
      });
    }

    const ownerType = scope.scopeType;
    const ownerId = scope.scopeId;
    const name = this.resolveLocalizedText(
      input.name,
      appendPublicPresenceAssetCopySuffix(sourceAsset.name)
    );
    const description = this.resolveLocalizedDescription(
      input.description,
      sourceAsset.description
    );
    const code = await this.createUniqueScopedCode(
      tenantSchema,
      ownerType,
      ownerId,
      normalizePublicPresenceAssetCode(input.code ?? `${sourceAsset.code}-copy`)
    );
    const sourceBundle = parsePublicPresenceSourceBundle(sourceRevision.sourceBundle);
    const manifest = this.hydrateManifest(this.deriveManifestFromSourceBundle(sourceBundle), {
      assetCode: code,
      description,
      name,
      ownerId,
      ownerType,
    });
    const validation = buildValidatedPublicPresenceAssetSummary(sourceBundle);
    const asset = await this.publicPresenceAssetRepository.createAssetWithCurrentRevision(
      tenantSchema,
      {
        actorId: context.userId ?? null,
        artifactStatus: 'draft',
        assetKind: sourceAsset.assetKind,
        code,
        componentType: sourceAsset.componentType,
        description,
        manifest,
        name,
        ownerId,
        ownerType,
        sourceBundle,
        sourceHash: calculatePublicPresenceAssetSourceHash({
          manifest,
          sourceBundle,
        }),
        status: 'draft',
        templateId: sourceAsset.templateId,
        templateTypeCode: sourceAsset.templateTypeCode,
        validationState: validation.validationState,
        validationSummary: validation.validationSummary,
      }
    );

    return this.getAssetDetail(tenantSchema, asset.id, scope, context.userId ?? null);
  }

  private async persistRevision(
    tenantSchema: string,
    assetId: string,
    context: RequestContext,
    input: SaveAssetRevisionInput,
    artifactStatus: PublicPresenceAssetStatus,
    runValidation: boolean
  ): Promise<PublicPresenceAssetDetail> {
    const scope = normalizePublicPresenceAssetScope(input.scopeType, input.scopeId);
    await this.ensureSystemSeeds(tenantSchema, context.userId ?? null);
    const visibleScopes = await this.publicPresenceAssetRepository.resolveScopeChain(
      tenantSchema,
      scope.scopeType,
      scope.scopeId
    );
    const asset = await this.requireVisibleAsset(tenantSchema, assetId, visibleScopes);

    this.assertAssetEditable(asset, scope.scopeType, scope.scopeId);

    const name = this.resolveLocalizedText(input.name, asset.name);
    const description = this.resolveLocalizedDescription(input.description, asset.description);
    const sourceBundle = parsePublicPresenceSourceBundle(input.sourceBundle);
    const manifest = this.hydrateManifest(this.deriveManifestFromSourceBundle(sourceBundle), {
      assetCode: asset.code,
      assetId: asset.id,
      assetRevisionId: null,
      description,
      name,
      ownerId: asset.ownerId,
      ownerType: asset.ownerType,
    });

    if (input.manifest) {
      const explicitManifest = this.hydrateManifest(
        parsePublicPresenceAssetManifest(input.manifest),
        {
          assetCode: asset.code,
          assetId: asset.id,
          assetRevisionId: null,
          description,
          name,
          ownerId: asset.ownerId,
          ownerType: asset.ownerType,
        }
      );

      if (JSON.stringify(explicitManifest) !== JSON.stringify(manifest)) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message:
            'Asset manifest payload must match the authoritative manifest.json inside the source bundle.',
        });
      }
    }

    assertManifestMatchesAssetRecord({
      assetKind: asset.assetKind,
      componentType: asset.componentType,
      manifest,
      templateId: asset.templateId,
    });

    const validation = runValidation
      ? buildValidatedPublicPresenceAssetSummary(sourceBundle)
      : buildDraftPublicPresenceAssetSummary();
    await this.publicPresenceAssetRepository.createRevisionAndAssignCurrent(tenantSchema, {
      actorId: context.userId ?? null,
      artifactStatus,
      assetId: asset.id,
      description,
      manifest,
      name,
      sourceBundle,
      sourceHash: calculatePublicPresenceAssetSourceHash({
        manifest,
        sourceBundle,
      }),
      status: artifactStatus,
      validationState: validation.validationState,
      validationSummary: validation.validationSummary,
    });

    return this.getAssetDetail(tenantSchema, asset.id, scope, context.userId ?? null);
  }

  private async ensureSystemSeeds(tenantSchema: string, actorId: string | null) {
    for (const seed of getPublicPresenceSystemAssetSeeds()) {
      const existing = await this.publicPresenceAssetRepository.findAssetByCodeAtScope(
        tenantSchema,
        'system',
        null,
        seed.code
      );

      if (existing) {
        if (existing.currentRevisionId === null) {
          await this.repairSystemSeedCurrentRevision(tenantSchema, existing, seed, actorId);
        }

        continue;
      }

      await this.publicPresenceAssetRepository.createAssetWithCurrentRevision(tenantSchema, {
        ...this.buildSystemSeedRevisionInput(seed, actorId),
        assetKind: seed.assetKind,
        code: seed.code,
        componentType: seed.componentType ?? null,
        ownerId: null,
        ownerType: 'system',
        templateId: seed.templateId ?? null,
        templateTypeCode: seed.templateId
          ? resolvePublicPresenceTemplateTypeCode(seed.templateId)
          : null,
      });
    }
  }

  private async repairSystemSeedCurrentRevision(
    tenantSchema: string,
    asset: PublicPresenceAssetRow,
    seed: ReturnType<typeof getPublicPresenceSystemAssetSeeds>[number],
    actorId: string | null
  ) {
    const repairInput = this.buildSystemSeedRevisionInput(seed, actorId);

    await this.publicPresenceAssetRepository.createRevisionAndAssignCurrent(tenantSchema, {
      ...repairInput,
      assetId: asset.id,
    });
  }

  private buildSystemSeedRevisionInput(
    seed: ReturnType<typeof getPublicPresenceSystemAssetSeeds>[number],
    actorId: string | null
  ): Pick<
    Parameters<PublicPresenceAssetRepository['createAssetWithCurrentRevision']>[1],
    | 'actorId'
    | 'artifactStatus'
    | 'description'
    | 'manifest'
    | 'name'
    | 'sourceBundle'
    | 'sourceHash'
    | 'status'
    | 'validationState'
    | 'validationSummary'
  > {
    const validation = buildValidatedPublicPresenceAssetSummary(seed.sourceBundle);

    return {
      actorId,
      artifactStatus: 'active',
      description: seed.description,
      manifest: seed.manifest,
      name: seed.name,
      sourceBundle: seed.sourceBundle,
      sourceHash: calculatePublicPresenceAssetSourceHash({
        manifest: seed.manifest,
        sourceBundle: seed.sourceBundle,
      }),
      status: 'active',
      validationState: validation.validationState,
      validationSummary: validation.validationSummary,
    };
  }

  private buildManifestForNewAsset(
    input: CreateAssetInput,
    ownerType: PublicPresenceAssetOwnerType,
    ownerId: string | null
  ): PublicPresenceAssetManifest {
    if (input.manifest) {
      return parsePublicPresenceAssetManifest(input.manifest);
    }

    if (input.assetKind === 'template') {
      if (!input.templateId) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Template asset creation requires templateId.',
        });
      }

      const seedText = getPublicPresenceTemplateSeedText(input.templateId);
      return buildPublicPresenceTemplateAssetManifest(input.templateId, {
        description: seedText.description,
        name: seedText.name,
        ownerId,
        ownerType,
      });
    }

    if (!input.componentType) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Component asset creation requires componentType.',
      });
    }

    const seedText = getPublicPresenceComponentSeedText(input.componentType);
    return buildPublicPresenceComponentAssetManifest(input.componentType, {
      description: seedText.description,
      name: seedText.name,
      ownerId,
      ownerType,
    });
  }

  private assertSupportedAssetKind(
    assetKind: string
  ): asserts assetKind is PublicPresenceAssetKind {
    if (assetKind !== 'template' && assetKind !== 'component') {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Asset kind is invalid.',
      });
    }
  }

  private assertCreateAssetInputConsistency(
    input: CreateAssetInput,
    manifest: PublicPresenceAssetManifest
  ) {
    if (manifest.assetKind !== input.assetKind) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Asset manifest kind does not match the requested asset kind.',
      });
    }

    if (input.assetKind === 'template') {
      if (input.componentType) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Template asset creation must not include componentType.',
        });
      }

      if (!input.templateId) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Template asset creation requires templateId.',
        });
      }

      if (manifest.assetKind === 'template' && manifest.templateId !== input.templateId) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Template asset manifest templateId does not match the requested templateId.',
        });
      }

      if (
        input.templateTypeCode &&
        manifest.assetKind === 'template' &&
        manifest.templateTypeCode !== input.templateTypeCode
      ) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_FAILED,
          message:
            'Template asset manifest templateTypeCode does not match the requested templateTypeCode.',
        });
      }

      return;
    }

    if (input.templateId) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Component asset creation must not include templateId.',
      });
    }

    if (!input.componentType) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Component asset creation requires componentType.',
      });
    }

    if (manifest.assetKind !== 'component' || manifest.componentType !== input.componentType) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message:
          'Component asset manifest componentType does not match the requested componentType.',
      });
    }
  }

  private buildStarterSourceBundle(
    assetKind: PublicPresenceAssetKind,
    code: string,
    manifest: PublicPresenceAssetManifest,
    name: LocalizedText
  ) {
    return buildBlankPublicPresenceAssetSourceBundle({
      assetCode: code,
      assetKind,
      componentType: manifest.assetKind === 'component' ? manifest.componentType : undefined,
      manifest,
      name,
      templateId: manifest.assetKind === 'template' ? manifest.templateId : undefined,
    });
  }

  private deriveManifestFromSourceBundle(
    sourceBundle: PublicPresenceSourceBundleFile[]
  ): PublicPresenceAssetManifest {
    const sourceManifest = parsePublicPresenceAssetSourceManifest(sourceBundle);

    if (!sourceManifest) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Asset source bundle must include a valid manifest.json runtime contract.',
      });
    }

    return derivePublicPresenceAssetManifestFromSourceManifest(sourceManifest);
  }

  private buildDefaultManifestFromAsset(
    asset: PublicPresenceAssetRow,
    name: LocalizedText,
    description: LocalizedText
  ) {
    if (asset.assetKind === 'template' && asset.templateId) {
      return buildPublicPresenceTemplateAssetManifest(
        asset.templateId as PublicPresenceTemplateId,
        {
          assetCode: asset.code,
          assetId: asset.id,
          description,
          name,
          ownerId: asset.ownerId,
          ownerType: asset.ownerType,
        }
      );
    }

    if (asset.assetKind === 'component' && asset.componentType) {
      return buildPublicPresenceComponentAssetManifest(
        asset.componentType as HomepageComponentType,
        {
          assetCode: asset.code,
          assetId: asset.id,
          description,
          name,
          ownerId: asset.ownerId,
          ownerType: asset.ownerType,
        }
      );
    }

    throw new NotFoundException({
      code: ErrorCodes.RES_NOT_FOUND,
      message: 'Asset manifest metadata could not be reconstructed.',
    });
  }

  private hydrateManifest(
    manifest: PublicPresenceAssetManifest,
    metadata: {
      assetCode: string;
      assetId?: string | null;
      assetRevisionId?: string | null;
      description: LocalizedText;
      name: LocalizedText;
      ownerId: string | null;
      ownerType: PublicPresenceAssetOwnerType;
    }
  ): PublicPresenceAssetManifest {
    return {
      ...manifest,
      assetCode: metadata.assetCode,
      assetId: metadata.assetId ?? manifest.assetId ?? null,
      assetRevisionId: metadata.assetRevisionId ?? null,
      description: metadata.description,
      name: metadata.name,
      ownerId: metadata.ownerId,
      ownerType: metadata.ownerType,
    };
  }

  private getSeedTextForAssetKind(
    assetKind: PublicPresenceAssetKind,
    templateId: PublicPresenceTemplateId | null,
    componentType: HomepageComponentType | null
  ) {
    if (assetKind === 'template' && templateId) {
      return getPublicPresenceTemplateSeedText(templateId);
    }

    if (assetKind === 'component' && componentType) {
      return getPublicPresenceComponentSeedText(componentType);
    }

    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'Asset seed text could not be resolved for the requested asset kind.',
    });
  }

  private async requireVisibleAsset(
    tenantSchema: string,
    assetId: string,
    visibleScopes: PublicPresenceAssetScopeRef[]
  ) {
    const asset = await this.publicPresenceAssetRepository.findAssetById(tenantSchema, assetId);

    if (!asset || !visibleScopes.some((scope) => this.isScopeOwnerMatch(asset, scope))) {
      throw new NotFoundException({
        code: ErrorCodes.RES_NOT_FOUND,
        message: 'Public Presence asset was not found in the current scope.',
      });
    }

    return asset;
  }

  private assertAssetEditable(
    asset: PublicPresenceAssetRow,
    scopeType: PublicPresenceAssetScopeType,
    scopeId: string | null
  ) {
    if (asset.isSystem) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message: 'System Public Presence assets are read-only. Duplicate before editing.',
      });
    }

    if (asset.ownerType !== scopeType || asset.ownerId !== scopeId) {
      throw new ForbiddenException({
        code: ErrorCodes.PERM_ACCESS_DENIED,
        message:
          'This Public Presence asset is inherited. Switch to its owner scope or duplicate it.',
      });
    }
  }

  private async createUniqueScopedCode(
    tenantSchema: string,
    ownerType: PublicPresenceAssetOwnerType,
    ownerId: string | null,
    baseCode: string
  ) {
    const existingCodes = new Set(
      await this.publicPresenceAssetRepository.listCodesAtScope(tenantSchema, ownerType, ownerId)
    );

    if (!existingCodes.has(baseCode)) {
      return baseCode;
    }

    let attempt = 2;
    while (existingCodes.has(`${baseCode}-${attempt}`)) {
      attempt += 1;
    }

    return `${baseCode}-${attempt}`;
  }

  private toAssetListEntry(
    asset: PublicPresenceAssetRow,
    currentRevision: PublicPresenceAssetRevisionRow | null,
    scopeType: PublicPresenceAssetScopeType,
    scopeId: string | null
  ): PublicPresenceAssetListEntry {
    const canEdit = !asset.isSystem && asset.ownerType === scopeType && asset.ownerId === scopeId;

    return {
      asset: this.toAssetRecord(asset),
      canEdit,
      currentRevision: currentRevision ? this.toRevisionRecord(currentRevision) : null,
      isInherited: !canEdit,
      scope: {
        scopeId,
        scopeType,
      },
    };
  }

  private toAssetRecord(asset: PublicPresenceAssetRow) {
    return {
      assetKind: asset.assetKind,
      code: asset.code,
      componentType: asset.componentType as HomepageComponentType | null,
      createdAt: asset.createdAt.toISOString(),
      currentRevisionId: asset.currentRevisionId,
      description: asset.description,
      id: asset.id,
      isSystem: asset.isSystem,
      name: asset.name,
      ownerId: asset.ownerId,
      ownerType: asset.ownerType,
      status: asset.status,
      templateId: asset.templateId as PublicPresenceTemplateId | null,
      templateTypeCode: asset.templateTypeCode as PublicPresenceTemplateTypeCode | null,
      updatedAt: asset.updatedAt.toISOString(),
      version: asset.version,
    };
  }

  private toRevisionRecord(revision: PublicPresenceAssetRevisionRow) {
    return {
      artifactStatus: revision.artifactStatus,
      assetId: revision.assetId,
      createdAt: revision.createdAt.toISOString(),
      createdBy: revision.createdBy,
      id: revision.id,
      lastValidatedAt: revision.lastValidatedAt?.toISOString() ?? null,
      manifest: revision.manifest,
      revisionNumber: revision.revisionNumber,
      runtimeContractVersion: revision.runtimeContractVersion,
      sourceBundle: revision.sourceBundle,
      sourceHash: revision.sourceHash,
      submittedAt: revision.submittedAt?.toISOString() ?? null,
      validationState: revision.validationState,
      validationSummary: revision.validationSummary as PublicPresenceAssetValidationSummary,
    };
  }

  private isScopeOwnerMatch(asset: PublicPresenceAssetRow, scope: PublicPresenceAssetScopeRef) {
    return asset.ownerType === scope.ownerType && asset.ownerId === scope.ownerId;
  }

  private resolveLocalizedText(
    input: Partial<LocalizedText> | null | undefined,
    fallback: LocalizedText
  ) {
    if (!input) {
      return fallback;
    }

    return normalizePublicPresenceAssetName(input, fallback.en);
  }

  private resolveLocalizedDescription(
    input: Partial<LocalizedText> | null | undefined,
    fallback: LocalizedText
  ) {
    if (!input) {
      return fallback;
    }

    return normalizePublicPresenceAssetDescription(input, fallback.en);
  }
}
