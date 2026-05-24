import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  buildBlankPublicPresenceAssetSourceBundle,
  buildPublicPresenceComponentAssetManifest,
  buildPublicPresenceTemplateAssetManifest,
  getPublicPresenceComponentSeedText,
  getPublicPresenceSystemAssetSeeds,
  getPublicPresenceTemplateSeedText,
  type PublicPresenceAssetManifest,
  type RequestContext,
} from '@tcrn/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicPresenceAssetService } from './public-presence-asset.service';

const context: RequestContext = {
  tenantId: 'tenant-1',
  tenantSchema: 'tenant_test',
  userId: 'user-1',
  userName: 'Operator',
};

const TEMPLATE_ASSET_ID = '11111111-1111-4111-8111-111111111111';
const TEMPLATE_REVISION_ID = '11111111-1111-4111-8111-111111111112';
const COMPONENT_ASSET_ID = '22222222-2222-4222-8222-222222222221';
const COMPONENT_REVISION_ID = '22222222-2222-4222-8222-222222222222';

describe('PublicPresenceAssetService', () => {
  function createAssetRow(overrides: Record<string, unknown> = {}) {
    return {
      assetKind: 'template',
      code: 'activetalenthub',
      componentType: null,
      createdAt: new Date('2026-05-23T12:00:00.000Z'),
      currentRevisionId: TEMPLATE_REVISION_ID,
      description: {
        en: 'Template starter',
        zh_HANS: '模板起稿',
        zh_HANT: '模板起稿',
        ja: 'テンプレートスターター',
        ko: '템플릿 스타터',
        fr: 'Starter template',
      },
      id: TEMPLATE_ASSET_ID,
      isSystem: false,
      name: {
        en: 'Active Hub',
        zh_HANS: '常驻主页',
        zh_HANT: '常駐主頁',
        ja: '常設ホーム',
        ko: '상시 홈',
        fr: 'Hub actif',
      },
      ownerId: null,
      ownerType: 'tenant',
      status: 'draft',
      templateId: 'activeTalentHub',
      updatedAt: new Date('2026-05-23T12:05:00.000Z'),
      version: 1,
      ...overrides,
    };
  }

  function createRevisionRow(overrides: Record<string, unknown> = {}) {
    const assetId =
      typeof overrides.assetId === 'string' ? overrides.assetId : TEMPLATE_ASSET_ID;
    const revisionId =
      typeof overrides.id === 'string' ? overrides.id : TEMPLATE_REVISION_ID;
    const baseTemplateText = getPublicPresenceTemplateSeedText('activeTalentHub');
    const baseManifest = buildPublicPresenceTemplateAssetManifest('activeTalentHub', {
      assetCode: 'activetalenthub',
      assetId,
      assetRevisionId: revisionId,
      description: baseTemplateText.description,
      name: baseTemplateText.name,
      ownerId: null,
      ownerType: 'tenant',
    });
    const manifest = {
      ...baseManifest,
      ...(overrides.manifest as Record<string, unknown> | undefined),
    } as PublicPresenceAssetManifest;
    const sourceBundle = overrides.sourceBundle as ReturnType<
      typeof buildBlankPublicPresenceAssetSourceBundle
    > | undefined;
    const resolvedSourceBundle = sourceBundle
      ?? (
        manifest.assetKind === 'component'
          ? (() => {
              const componentType = manifest.componentType;
              const text = getPublicPresenceComponentSeedText(componentType);
              const componentManifest = {
                ...buildPublicPresenceComponentAssetManifest(componentType, {
                  assetCode: `${componentType.toLowerCase()}-code`,
                  assetId,
                  assetRevisionId: revisionId,
                  description: text.description,
                  name: text.name,
                  ownerId: null,
                  ownerType: 'tenant',
                }),
                ...manifest,
              };

              return buildBlankPublicPresenceAssetSourceBundle({
                assetCode: componentManifest.assetCode ?? `${componentType.toLowerCase()}-code`,
                assetKind: 'component',
                componentType,
                manifest: componentManifest,
                name: componentManifest.name ?? text.name,
              });
            })()
          : (() => {
              const templateId = manifest.templateId;
              const text = getPublicPresenceTemplateSeedText(templateId);
              const templateManifest = {
                ...buildPublicPresenceTemplateAssetManifest(templateId, {
                  assetCode: `${templateId}-code`,
                  assetId,
                  assetRevisionId: revisionId,
                  description: text.description,
                  name: text.name,
                  ownerId: null,
                  ownerType: 'tenant',
                }),
                ...manifest,
              };

              return buildBlankPublicPresenceAssetSourceBundle({
                assetCode: templateManifest.assetCode ?? `${templateId}-code`,
                assetKind: 'template',
                manifest: templateManifest,
                name: templateManifest.name ?? text.name,
                templateId,
              });
            })()
      );

    return {
      artifactStatus: 'draft',
      assetId,
      createdAt: new Date('2026-05-23T12:05:00.000Z'),
      createdBy: 'user-1',
      id: revisionId,
      lastValidatedAt: null,
      manifest,
      revisionNumber: 1,
      runtimeContractVersion: '1.0.0',
      sourceBundle: resolvedSourceBundle,
      sourceHash: 'a'.repeat(64),
      submittedAt: null,
      validationState: 'unvalidated',
      validationSummary: {
        issueCount: 0,
        passCount: 0,
        warnCount: 0,
      },
      ...overrides,
    };
  }

  function buildSystemSeedAssetRow(
    seed: ReturnType<typeof getPublicPresenceSystemAssetSeeds>[number],
    overrides: Record<string, unknown> = {},
  ) {
    return createAssetRow({
      assetKind: seed.assetKind,
      code: seed.code,
      componentType: seed.componentType ?? null,
      currentRevisionId: 'seed-revision-id',
      description: seed.description,
      id: `seed-${seed.code}`,
      isSystem: true,
      name: seed.name,
      ownerId: null,
      ownerType: 'system',
      status: 'active',
      templateId: seed.templateId ?? null,
      ...overrides,
    });
  }

  let repository: {
    createAssetWithCurrentRevision: ReturnType<typeof vi.fn>;
    createRevisionAndAssignCurrent: ReturnType<typeof vi.fn>;
    findAssetByCodeAtScope: ReturnType<typeof vi.fn>;
    findAssetById: ReturnType<typeof vi.fn>;
    findCurrentRevision: ReturnType<typeof vi.fn>;
    listCodesAtScope: ReturnType<typeof vi.fn>;
    listCurrentRevisionsByAssetIds: ReturnType<typeof vi.fn>;
    listRevisions: ReturnType<typeof vi.fn>;
    listVisibleAssets: ReturnType<typeof vi.fn>;
    resolveScopeChain: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      createAssetWithCurrentRevision: vi.fn().mockResolvedValue(createAssetRow()),
      createRevisionAndAssignCurrent: vi.fn().mockResolvedValue(createAssetRow({ version: 2 })),
      findAssetByCodeAtScope: vi.fn().mockResolvedValue(null),
      findAssetById: vi.fn().mockResolvedValue(createAssetRow()),
      findCurrentRevision: vi.fn().mockResolvedValue(createRevisionRow()),
      listCodesAtScope: vi.fn().mockResolvedValue([]),
      listCurrentRevisionsByAssetIds: vi.fn().mockResolvedValue([createRevisionRow()]),
      listRevisions: vi.fn().mockResolvedValue([createRevisionRow()]),
      listVisibleAssets: vi.fn().mockResolvedValue([createAssetRow()]),
      resolveScopeChain: vi.fn().mockResolvedValue([
        { ownerType: 'system', ownerId: null },
        { ownerType: 'tenant', ownerId: null },
      ]),
    };
  });

  it('creates scoped assets with a generated starter source bundle when one was not provided', async () => {
    const service = new PublicPresenceAssetService(repository as never);

    const result = await service.createAsset(context.tenantSchema ?? '', context, {
      assetKind: 'template',
      templateId: 'activeTalentHub',
      scopeType: 'tenant',
    });

    expect(repository.createAssetWithCurrentRevision).toHaveBeenCalledWith(
      context.tenantSchema,
      expect.objectContaining({
        assetKind: 'template',
        ownerType: 'tenant',
        ownerId: null,
        sourceBundle: expect.arrayContaining([
          expect.objectContaining({ path: 'manifest.json' }),
          expect.objectContaining({ path: 'src/index.tsx' }),
        ]),
      }),
    );
    expect(result.currentRevision?.sourceBundle.length).toBeGreaterThan(0);
  });

  it('rejects unsupported asset kinds before persistence', async () => {
    const service = new PublicPresenceAssetService(repository as never);

    await expect(
      service.createAsset(context.tenantSchema ?? '', context, {
        assetKind: 'unsupported' as never,
        componentType: 'SocialLinks',
        scopeType: 'tenant',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.createAssetWithCurrentRevision).not.toHaveBeenCalled();
  });

  it('rejects create payloads whose manifest does not match the requested template', async () => {
    const service = new PublicPresenceAssetService(repository as never);

    await expect(
      service.createAsset(context.tenantSchema ?? '', context, {
        assetKind: 'template',
        templateId: 'activeTalentHub',
        scopeType: 'tenant',
        manifest: {
          assetKind: 'template',
          runtimeContractVersion: '1.0.0',
          label: 'Debut Reveal',
          useCase: 'Debut launch',
          templateId: 'debutReveal',
          requiredSections: ['firstEncounter'],
          recommendedSections: ['countdownReveal'],
          optionalSections: [],
          lockedSections: [],
          defaultSectionOrder: ['firstEncounter', 'countdownReveal'],
          personaKitFields: [],
          validationRules: [],
          policyReferences: [],
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.createAssetWithCurrentRevision).not.toHaveBeenCalled();
  });

  it('duplicates inherited assets into the current scope with a new code', async () => {
    repository.findAssetById.mockResolvedValueOnce(
      createAssetRow({
        code: 'system-social-links',
        assetKind: 'component',
        componentType: 'SocialLinks',
        description: {
          en: 'System social links',
          zh_HANS: '系统社交链接',
          zh_HANT: '系統社交連結',
          ja: 'システムソーシャルリンク',
          ko: '시스템 소셜 링크',
          fr: 'Liens sociaux systeme',
        },
        id: COMPONENT_ASSET_ID,
        isSystem: true,
        name: {
          en: 'Social Links',
          zh_HANS: '社交链接',
          zh_HANT: '社交連結',
          ja: 'ソーシャルリンク',
          ko: '소셜 링크',
          fr: 'Liens sociaux',
        },
        ownerType: 'system',
        templateId: null,
      }),
    );
    repository.findCurrentRevision.mockResolvedValueOnce(
      createRevisionRow({
        assetId: COMPONENT_ASSET_ID,
        id: COMPONENT_REVISION_ID,
        manifest: {
          assetKind: 'component',
          runtimeContractVersion: '1.0.0',
          componentType: 'SocialLinks',
          rendererSupport: true,
          visualSupport: 'supported',
          sourcePolicy: 'registryOwned',
          projectionMode: 'structured',
          propsSchemaKey: 'SocialLinks',
          fieldKeys: ['platforms'],
          defaultProps: {},
          unknownFieldPolicy: 'preserveLocked',
          safetyPolicyReferences: [],
          aiPatchAllowlist: [],
        },
      }),
    );

    const service = new PublicPresenceAssetService(repository as never);
    await service.duplicateAsset(context.tenantSchema ?? '', 'asset-system', context, {
      scopeType: 'talent',
      scopeId: 'talent-1',
    });

    expect(repository.createAssetWithCurrentRevision).toHaveBeenCalledWith(
      context.tenantSchema,
      expect.objectContaining({
        ownerType: 'talent',
        ownerId: 'talent-1',
        code: 'system-social-links-copy',
      }),
    );
  });

  it('repairs a legacy system template missing currentRevisionId before listing assets', async () => {
    const systemSeeds = getPublicPresenceSystemAssetSeeds();
    const legacySeed = systemSeeds.find(
      (seed) => seed.assetKind === 'template' && seed.templateId === 'activeTalentHub',
    );

    expect(legacySeed).toBeDefined();

    let repaired = false;
    const legacyAsset = buildSystemSeedAssetRow(legacySeed!, {
      currentRevisionId: null,
      id: 'legacy-system-template',
    });
    const repairedRevision = createRevisionRow({
      artifactStatus: 'active',
      assetId: legacyAsset.id,
      id: 'legacy-system-template-revision',
      manifest: legacySeed!.manifest,
      sourceBundle: legacySeed!.sourceBundle,
      validationState: 'ready',
      validationSummary: {
        issueCount: 0,
        passCount: 4,
        warnCount: 0,
      },
    });

    repository.findAssetByCodeAtScope.mockImplementation(
      async (_tenantSchema, ownerType, ownerId, code) => {
        if (ownerType !== 'system' || ownerId !== null) {
          return null;
        }

        const matchedSeed = systemSeeds.find((seed) => seed.code === code);
        if (!matchedSeed) {
          return null;
        }

        if (matchedSeed.code === legacySeed!.code && !repaired) {
          return legacyAsset;
        }

        return buildSystemSeedAssetRow(matchedSeed, {
          id: matchedSeed.code === legacySeed!.code ? legacyAsset.id : `seed-${matchedSeed.code}`,
          currentRevisionId: matchedSeed.code === legacySeed!.code
            ? repairedRevision.id
            : `revision-${matchedSeed.code}`,
        });
      },
    );
    repository.createRevisionAndAssignCurrent.mockImplementationOnce(async () => {
      repaired = true;
      return buildSystemSeedAssetRow(legacySeed!, {
        currentRevisionId: repairedRevision.id,
        id: legacyAsset.id,
      });
    });
    repository.listVisibleAssets.mockResolvedValueOnce([
      buildSystemSeedAssetRow(legacySeed!, {
        currentRevisionId: repairedRevision.id,
        id: legacyAsset.id,
      }),
    ]);
    repository.listCurrentRevisionsByAssetIds.mockResolvedValueOnce([repairedRevision]);

    const service = new PublicPresenceAssetService(repository as never);
    const result = await service.listAssets(context.tenantSchema ?? '', {
      assetKind: 'template',
      scopeType: 'tenant',
    }, context.userId);

    expect(repository.createRevisionAndAssignCurrent).toHaveBeenCalledWith(
      context.tenantSchema,
      expect.objectContaining({
        actorId: context.userId,
        assetId: legacyAsset.id,
        artifactStatus: 'active',
        manifest: legacySeed!.manifest,
        sourceBundle: legacySeed!.sourceBundle,
        status: 'active',
      }),
    );
    expect(result[0]?.asset.currentRevisionId).toBe(repairedRevision.id);
    expect(result[0]?.currentRevision?.id).toBe(repairedRevision.id);
  });

  it('rejects saving inherited assets from a non-owner scope', async () => {
    repository.findAssetById.mockResolvedValueOnce(
      createAssetRow({
        ownerType: 'tenant',
        ownerId: null,
      }),
    );
    repository.resolveScopeChain.mockResolvedValueOnce([
      { ownerType: 'system', ownerId: null },
      { ownerType: 'tenant', ownerId: null },
      { ownerType: 'talent', ownerId: 'talent-1' },
    ]);

    const service = new PublicPresenceAssetService(repository as never);

    await expect(
      service.saveAssetDraft(context.tenantSchema ?? '', 'asset-1', context, {
        scopeType: 'talent',
        scopeId: 'talent-1',
        sourceBundle: createRevisionRow().sourceBundle,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects revision manifests that change the asset identity before mutation', async () => {
    const service = new PublicPresenceAssetService(repository as never);

    await expect(
      service.saveAssetDraft(context.tenantSchema ?? '', 'asset-1', context, {
        scopeType: 'tenant',
        manifest: {
          assetKind: 'template',
          runtimeContractVersion: '1.0.0',
          label: 'Debut Reveal',
          useCase: 'Debut launch',
          templateId: 'debutReveal',
          requiredSections: ['firstEncounter'],
          recommendedSections: ['countdownReveal'],
          optionalSections: [],
          lockedSections: [],
          defaultSectionOrder: ['firstEncounter', 'countdownReveal'],
          personaKitFields: [],
          validationRules: [],
          policyReferences: [],
        },
        sourceBundle: createRevisionRow().sourceBundle,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.createRevisionAndAssignCurrent).not.toHaveBeenCalled();
  });
});
