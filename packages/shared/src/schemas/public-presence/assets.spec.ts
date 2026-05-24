// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, expect, it } from 'vitest';

import {
  buildPublicPresenceSystemTemplateSeed,
  buildPublicPresenceSystemComponentSeed,
  getPublicPresenceSystemAssetSeeds,
} from '../../public-presence/asset-runtime';
import { PUBLIC_PRESENCE_ASSET_RUNTIME_VERSION } from '../../public-presence/assets';
import {
  ArtistLifecycleFlowSchema,
  ArtistStageRecordSchema,
  CreatePublicPresenceAssetSchema,
  createArtistLifecycleFlowSchema,
  CurrentPublicPresenceAssetRuntimeVersionSchema,
  PublicPresenceAssetListQuerySchema,
  PublicPresenceAssetDetailSchema,
  PublicPresenceAssetListEntrySchema,
  PublicPresenceAssetRevisionPinSchema,
  PublicPresenceAssetRevisionRecordSchema,
  PublicPresenceComponentAssetManifestSchema,
  PublicPresenceTemplateAssetManifestSchema,
} from './assets';

const stageCatalog = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'pre-debut',
    isActive: true,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    code: 'active',
    isActive: true,
  },
] as const;

describe('public presence D-026 asset runtime contracts', () => {
  it('accepts artist stage records with localized labels and lifecycle mapping', () => {
    expect(ArtistStageRecordSchema.parse({
      id: '11111111-1111-4111-8111-111111111111',
      ownerType: 'tenant',
      ownerId: null,
      code: 'pre-debut',
      name: {
        en: 'Pre-Debut',
        zh_HANS: '出道前',
        zh_HANT: '出道前',
        ja: 'プレデビュー',
        ko: '프리데뷔',
        fr: 'Pré-début',
      },
      description: {
        en: 'Teaser-safe stage',
        zh_HANS: '仅限预热内容的阶段',
        zh_HANT: '僅限預熱內容的階段',
        ja: 'ティザー向けステージ',
        ko: '티저 전용 단계',
        fr: 'Étape teaser',
      },
      sortOrder: 10,
      isActive: true,
      isSystem: false,
      color: '#E7A96B',
      lifecycleStatusMapping: 'draft',
      homepagePolicyKey: 'debut-policy',
      createdAt: '2026-05-23T12:00:00.000Z',
      updatedAt: '2026-05-23T12:00:00.000Z',
      version: 1,
    }).code).toBe('pre-debut');
  });

  it('validates artist lifecycle flow structure and homepage policy by stage', () => {
    expect(ArtistLifecycleFlowSchema.parse({
      nodes: [
        {
          stageId: stageCatalog[0].id,
          stageCode: stageCatalog[0].code,
        },
        {
          stageId: stageCatalog[1].id,
          stageCode: stageCatalog[1].code,
        },
      ],
      transitions: [
        {
          id: 'pre-debut->active',
          fromStageId: stageCatalog[0].id,
          toStageId: stageCatalog[1].id,
          label: 'Go live',
          reason: 'Reveal is complete',
        },
      ],
      homepagePolicyByStage: [
        {
          stageId: stageCatalog[0].id,
          allowedTemplateIds: ['debutReveal'],
        },
        {
          stageId: stageCatalog[1].id,
          allowedTemplateIds: ['activeTalentHub'],
        },
      ],
    }).homepagePolicyByStage).toHaveLength(2);
  });

  it('rejects duplicate transitions and dangling stage policy references', () => {
    const schema = createArtistLifecycleFlowSchema({ stageCatalog: [...stageCatalog] });

    expect(() =>
      schema.parse({
        nodes: [
          {
            stageId: stageCatalog[0].id,
            stageCode: stageCatalog[0].code,
          },
          {
            stageId: stageCatalog[1].id,
            stageCode: stageCatalog[1].code,
          },
        ],
        transitions: [
          {
            id: 'a',
            fromStageId: stageCatalog[0].id,
            toStageId: stageCatalog[1].id,
            label: null,
            reason: null,
          },
          {
            id: 'b',
            fromStageId: stageCatalog[0].id,
            toStageId: stageCatalog[1].id,
            label: null,
            reason: null,
          },
        ],
        homepagePolicyByStage: [
          {
            stageId: '33333333-3333-4333-8333-333333333333',
            allowedTemplateIds: ['activeTalentHub'],
          },
        ],
      }),
    ).toThrow(/Duplicate stage transition|Homepage policy stage/i);
  });

  it('rejects inactive artist stages when validating against the tenant stage catalog', () => {
    const schema = createArtistLifecycleFlowSchema({
      stageCatalog: [
        stageCatalog[0],
        {
          id: '44444444-4444-4444-8444-444444444444',
          code: 'retired',
          isActive: false,
        },
      ],
    });

    expect(() =>
      schema.parse({
        nodes: [
          {
            stageId: stageCatalog[0].id,
            stageCode: stageCatalog[0].code,
          },
          {
            stageId: '44444444-4444-4444-8444-444444444444',
            stageCode: 'retired',
          },
        ],
        transitions: [
          {
            id: 'pre-debut->retired',
            fromStageId: stageCatalog[0].id,
            toStageId: '44444444-4444-4444-8444-444444444444',
            label: null,
            reason: null,
          },
        ],
        homepagePolicyByStage: [
          {
            stageId: '44444444-4444-4444-8444-444444444444',
            allowedTemplateIds: ['activeTalentHub'],
          },
        ],
      }),
    ).toThrow(/must be active/i);
  });

  it('parses template and component asset manifests using the runtime contract version', () => {
    expect(CurrentPublicPresenceAssetRuntimeVersionSchema.parse(
      PUBLIC_PRESENCE_ASSET_RUNTIME_VERSION,
    )).toBe(PUBLIC_PRESENCE_ASSET_RUNTIME_VERSION);

    expect(PublicPresenceTemplateAssetManifestSchema.parse({
      assetKind: 'template',
      assetId: '55555555-5555-4555-8555-555555555555',
      assetRevisionId: '66666666-6666-4666-8666-666666666666',
      assetCode: 'tenant-active-hub',
      ownerType: 'tenant',
      ownerId: '77777777-7777-4777-8777-777777777777',
      name: {
        en: 'Active Hub',
        zh_HANS: '常驻主页',
        zh_HANT: '常駐主頁',
        ja: '常設ハブ',
        ko: '상시 허브',
        fr: 'Hub actif',
      },
      description: {
        en: 'Default active talent layout',
        zh_HANS: '常驻艺人主页布局',
        zh_HANT: '常駐藝人主頁布局',
        ja: '通常運用向けレイアウト',
        ko: '상시 운영용 레이아웃',
        fr: 'Mise en page active',
      },
      runtimeContractVersion: PUBLIC_PRESENCE_ASSET_RUNTIME_VERSION,
      label: 'Active Talent Hub',
      useCase: 'Always-on homepage',
      templateId: 'activeTalentHub',
      requiredSections: ['firstEncounter'],
      recommendedSections: ['officialChannels', 'fanActions'],
      optionalSections: ['agencyNotes'],
      lockedSections: [],
      defaultSectionOrder: ['firstEncounter', 'officialChannels', 'fanActions'],
      personaKitFields: ['tagline'],
      validationRules: ['firstEncounterRequired'],
      policyReferences: ['homepagePolicy.active'],
    }).templateId).toBe('activeTalentHub');

    expect(PublicPresenceComponentAssetManifestSchema.parse({
      assetKind: 'component',
      runtimeContractVersion: PUBLIC_PRESENCE_ASSET_RUNTIME_VERSION,
      componentType: 'SocialLinks',
      rendererSupport: true,
      visualSupport: 'supported',
      sourcePolicy: 'registryOwned',
      projectionMode: 'structured',
      propsSchemaKey: 'SocialLinks',
      fieldKeys: ['platforms', 'layout'],
      defaultProps: {
        layout: 'horizontal',
      },
      unknownFieldPolicy: 'preserveLocked',
      safetyPolicyReferences: ['officialChannelUrl'],
      aiPatchAllowlist: ['platforms', 'layout'],
    }).componentType).toBe('SocialLinks');
  });

  it('rejects asset query scopes that mix tenant scope with scopeId', () => {
    expect(() =>
      PublicPresenceAssetListQuerySchema.parse({
        assetKind: 'template',
        scopeType: 'tenant',
        scopeId: '77777777-7777-4777-8777-777777777777',
      }),
    ).toThrow(/scopeId/i);
  });

  it('rejects create payloads whose manifest disagrees with the requested template identity', () => {
    expect(() =>
      CreatePublicPresenceAssetSchema.parse({
        assetKind: 'template',
        templateId: 'activeTalentHub',
        manifest: {
          assetKind: 'template',
          runtimeContractVersion: PUBLIC_PRESENCE_ASSET_RUNTIME_VERSION,
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
    ).toThrow(/templateId/i);
  });

  it('parses immutable asset revisions and publish pins', () => {
    const revision = PublicPresenceAssetRevisionRecordSchema.parse({
      id: '88888888-8888-4888-8888-888888888888',
      assetId: '55555555-5555-4555-8555-555555555555',
      revisionNumber: 3,
      sourceBundle: [
        {
          path: 'src/index.tsx',
          kind: 'code',
          language: 'tsx',
          contents: 'export const Template = () => null;',
        },
      ],
      manifest: {
        assetKind: 'template',
        runtimeContractVersion: PUBLIC_PRESENCE_ASSET_RUNTIME_VERSION,
        label: 'Active Talent Hub',
        useCase: 'Always-on homepage',
        templateId: 'activeTalentHub',
        requiredSections: ['firstEncounter'],
        recommendedSections: ['officialChannels'],
        optionalSections: [],
        lockedSections: [],
        defaultSectionOrder: ['firstEncounter', 'officialChannels'],
        personaKitFields: [],
        validationRules: ['firstEncounterRequired'],
        policyReferences: [],
      },
      validationSummary: {
        issueCount: 0,
        passCount: 12,
        warnCount: 0,
      },
      sourceHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      runtimeContractVersion: PUBLIC_PRESENCE_ASSET_RUNTIME_VERSION,
      artifactStatus: 'validated',
      validationState: 'ready',
      lastValidatedAt: '2026-05-23T12:30:00.000Z',
      submittedAt: '2026-05-23T12:35:00.000Z',
      createdAt: '2026-05-23T12:00:00.000Z',
      createdBy: '99999999-9999-4999-8999-999999999999',
    });

    expect(PublicPresenceAssetRevisionPinSchema.parse({
      assetId: revision.assetId,
      assetRevisionId: revision.id,
      sourceHash: revision.sourceHash,
      snapshot: {
        assetId: revision.assetId,
        assetRevisionId: revision.id,
        manifest: revision.manifest,
        revisionNumber: revision.revisionNumber,
        sourceBundle: revision.sourceBundle,
        sourceHash: revision.sourceHash,
      },
    }).sourceHash).toBe(revision.sourceHash);
  });

  it('builds localized system template seeds with non-empty starter bundles', () => {
    const seed = buildPublicPresenceSystemTemplateSeed('activeTalentHub');

    expect(seed.manifest.assetKind).toBe('template');
    expect(seed.name.zh_HANS).toBe('常驻艺人主页');
    expect(seed.sourceBundle.map((file) => file.path)).toEqual([
      'manifest.json',
      'src/index.tsx',
      'fixtures/default.json',
      'docs/README.md',
    ]);
  });

  it('builds system component seeds and list entries that match the shared schemas', () => {
    const componentSeed = buildPublicPresenceSystemComponentSeed('SocialLinks');

    expect(PublicPresenceAssetListEntrySchema.parse({
      asset: {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        assetKind: 'component',
        code: componentSeed.code,
        componentType: 'SocialLinks',
        createdAt: '2026-05-23T12:00:00.000Z',
        currentRevisionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        description: componentSeed.description,
        isSystem: true,
        name: componentSeed.name,
        ownerId: null,
        ownerType: 'system',
        status: 'active',
        templateId: null,
        updatedAt: '2026-05-23T12:00:00.000Z',
        version: 1,
      },
      canEdit: false,
      currentRevision: {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        assetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        revisionNumber: 1,
        sourceBundle: componentSeed.sourceBundle,
        manifest: componentSeed.manifest,
        validationSummary: {
          issueCount: 0,
          passCount: 4,
          warnCount: 0,
        },
        sourceHash: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        runtimeContractVersion: PUBLIC_PRESENCE_ASSET_RUNTIME_VERSION,
        artifactStatus: 'active',
        validationState: 'ready',
        lastValidatedAt: '2026-05-23T12:00:00.000Z',
        submittedAt: null,
        createdAt: '2026-05-23T12:00:00.000Z',
        createdBy: null,
      },
      isInherited: true,
      scope: {
        scopeType: 'tenant',
        scopeId: null,
      },
    }).asset.code).toBe(componentSeed.code);
  });

  it('produces a seeded asset catalog with both template and component authorities', () => {
    const seeds = getPublicPresenceSystemAssetSeeds();

    expect(seeds.some((seed) => seed.assetKind === 'template' && seed.templateId === 'activeTalentHub')).toBe(true);
    expect(seeds.some((seed) => seed.assetKind === 'template' && seed.templateId === 'debutReveal')).toBe(true);
    expect(seeds.some((seed) => seed.assetKind === 'component' && seed.componentType === 'SocialLinks')).toBe(true);

    const templateSeed = seeds.find((seed) => seed.templateId === 'debutReveal');
    expect(PublicPresenceAssetDetailSchema.parse({
      asset: {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        assetKind: 'template',
        code: templateSeed?.code ?? 'debutReveal',
        componentType: null,
        createdAt: '2026-05-23T12:00:00.000Z',
        currentRevisionId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        description: templateSeed?.description,
        isSystem: true,
        name: templateSeed?.name,
        ownerId: null,
        ownerType: 'system',
        status: 'active',
        templateId: 'debutReveal',
        updatedAt: '2026-05-23T12:00:00.000Z',
        version: 1,
      },
      canEdit: false,
      currentRevision: null,
      isInherited: true,
      revisions: [],
      scope: {
        scopeType: 'tenant',
        scopeId: null,
      },
    }).asset.templateId).toBe('debutReveal');
  });
});
