import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  buildPublicPresenceComponentAssetManifest,
  buildPublicPresenceTemplateAssetManifest,
  getPublicPresenceComponentSeedText,
  getPublicPresenceSystemAssetSeeds,
  getPublicPresenceTemplateSeedText,
  type PublicPresenceAssetManifest,
} from '@tcrn/shared';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootstrapTestApp } from '../../testing/bootstrap-test-app';
import { PublicPresenceAssetService } from './application/public-presence-asset.service';
import { PublicPresenceAssetController } from './controllers/public-presence-asset.controller';
import { PublicPresenceAssetRepository } from './infrastructure/public-presence-asset.repository';

const TEST_USER = {
  id: 'user-1',
  tenantId: 'tenant-1',
  tenantSchema: 'tenant_uat_corp',
  email: 'operator@example.com',
  username: 'operator',
};

describe('PublicPresenceAssetController duplicate path', () => {
  let app: INestApplication;
  let repository: {
    createAssetWithCurrentRevision: ReturnType<typeof vi.fn>;
    createRevisionAndAssignCurrent: ReturnType<typeof vi.fn>;
    findAssetByCodeAtScope: ReturnType<typeof vi.fn>;
    findAssetById: ReturnType<typeof vi.fn>;
    findCurrentRevision: ReturnType<typeof vi.fn>;
    listCodesAtScope: ReturnType<typeof vi.fn>;
    listRevisions: ReturnType<typeof vi.fn>;
    resolveScopeChain: ReturnType<typeof vi.fn>;
  };

  const createAssetRow = (
    seed: ReturnType<typeof getPublicPresenceSystemAssetSeeds>[number],
    overrides: Record<string, unknown> = {},
  ) => ({
    assetKind: seed.assetKind,
    code: seed.code,
    componentType: seed.componentType ?? null,
    createdAt: new Date('2026-05-24T10:00:00.000Z'),
    currentRevisionId: `revision-${seed.code}`,
    description: seed.description,
    id: `asset-${seed.code}`,
    isSystem: true,
    name: seed.name,
    ownerId: null,
    ownerType: 'system',
    status: 'active',
    templateId: seed.templateId ?? null,
    updatedAt: new Date('2026-05-24T10:05:00.000Z'),
    version: 1,
    ...overrides,
  });

  const createRevisionRow = (
    seed: ReturnType<typeof getPublicPresenceSystemAssetSeeds>[number],
    overrides: Record<string, unknown> = {},
  ) => {
    const assetId =
      typeof overrides.assetId === 'string' ? overrides.assetId : `asset-${seed.code}`;
    const revisionId =
      typeof overrides.id === 'string' ? overrides.id : `revision-${seed.code}`;

    let manifest: PublicPresenceAssetManifest;
    if (seed.assetKind === 'template') {
      const text = getPublicPresenceTemplateSeedText(seed.templateId!);
      manifest = {
        ...buildPublicPresenceTemplateAssetManifest(seed.templateId!, {
          assetCode: seed.code,
          assetId,
          assetRevisionId: revisionId,
          description: text.description,
          name: text.name,
          ownerId: null,
          ownerType: 'system',
        }),
        ...seed.manifest,
        ...(overrides.manifest as Record<string, unknown> | undefined),
      };
    } else {
      const text = getPublicPresenceComponentSeedText(seed.componentType!);
      manifest = {
        ...buildPublicPresenceComponentAssetManifest(seed.componentType!, {
          assetCode: seed.code,
          assetId,
          assetRevisionId: revisionId,
          description: text.description,
          name: text.name,
          ownerId: null,
          ownerType: 'system',
        }),
        ...seed.manifest,
        ...(overrides.manifest as Record<string, unknown> | undefined),
      };
    }

    return {
      artifactStatus: 'active',
      assetId,
      createdAt: new Date('2026-05-24T10:05:00.000Z'),
      createdBy: TEST_USER.id,
      id: revisionId,
      lastValidatedAt: new Date('2026-05-24T10:05:00.000Z'),
      manifest,
      revisionNumber: 1,
      runtimeContractVersion: '1.0.0',
      sourceBundle: seed.sourceBundle,
      sourceHash: 'c'.repeat(64),
      submittedAt: null,
      validationState: 'ready',
      validationSummary: {
        issueCount: 0,
        passCount: 4,
        warnCount: 0,
      },
      ...overrides,
    };
  };

  const TEST_IDS = {
    component: {
      duplicatedAssetId: '22222222-2222-4222-8222-222222222223',
      duplicatedRevisionId: '22222222-2222-4222-8222-222222222224',
      legacyAssetId: '22222222-2222-4222-8222-222222222225',
      repairedRevisionId: '22222222-2222-4222-8222-222222222226',
    },
    template: {
      duplicatedAssetId: '11111111-1111-4111-8111-111111111113',
      duplicatedRevisionId: '11111111-1111-4111-8111-111111111114',
      legacyAssetId: '11111111-1111-4111-8111-111111111115',
      repairedRevisionId: '11111111-1111-4111-8111-111111111116',
    },
  } as const;

  beforeEach(async () => {
    repository = {
      createAssetWithCurrentRevision: vi.fn(),
      createRevisionAndAssignCurrent: vi.fn(),
      findAssetByCodeAtScope: vi.fn(),
      findAssetById: vi.fn(),
      findCurrentRevision: vi.fn(),
      listCodesAtScope: vi.fn().mockResolvedValue([]),
      listRevisions: vi.fn(),
      resolveScopeChain: vi.fn().mockResolvedValue([
        { ownerType: 'system', ownerId: null },
        { ownerType: 'tenant', ownerId: null },
      ]),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PublicPresenceAssetController],
      providers: [
        PublicPresenceAssetService,
        {
          provide: PublicPresenceAssetRepository,
          useValue: repository,
        },
      ],
    }).compile();

    const service = moduleFixture.get(PublicPresenceAssetService);
    (service as unknown as {
      publicPresenceAssetRepository: typeof repository;
    }).publicPresenceAssetRepository = repository;

    const controller = moduleFixture.get(PublicPresenceAssetController);
    (controller as unknown as {
      publicPresenceAssetService: PublicPresenceAssetService;
    }).publicPresenceAssetService = service;

    app = moduleFixture.createNestApplication();
    app.use((req, _res, next) => {
      (req as { user?: typeof TEST_USER }).user = TEST_USER;
      next();
    });
    await bootstrapTestApp(app);
  });

  afterEach(async () => {
    await app.close();
  });

  it.each([
    {
      assetKind: 'template',
      ids: TEST_IDS.template,
      seed: getPublicPresenceSystemAssetSeeds().find(
        (item) => item.assetKind === 'template' && item.templateId === 'activeTalentHub',
      )!,
    },
    {
      assetKind: 'component',
      ids: TEST_IDS.component,
      seed: getPublicPresenceSystemAssetSeeds().find(
        (item) => item.assetKind === 'component' && item.componentType === 'SocialLinks',
      )!,
    },
  ])(
    'duplicates a legacy system $assetKind asset after runtime current-revision repair',
    async ({ ids, seed }) => {
      let repaired = false;
      const legacyAssetId = ids.legacyAssetId;
      const repairedRevisionId = ids.repairedRevisionId;
      const duplicatedAssetId = ids.duplicatedAssetId;
      const duplicatedRevisionId = ids.duplicatedRevisionId;
      const legacyAsset = createAssetRow(seed, {
        currentRevisionId: null,
        id: legacyAssetId,
      });
      const duplicatedAsset = {
        ...createAssetRow(seed, {
          code: `${seed.code}-copy`,
          currentRevisionId: duplicatedRevisionId,
          id: duplicatedAssetId,
          isSystem: false,
          ownerType: 'tenant',
          status: 'draft',
          templateId: seed.templateId ?? null,
        }),
      };
      const repairedRevision = createRevisionRow(seed, {
        assetId: legacyAssetId,
        id: repairedRevisionId,
      });
      const duplicatedRevision = createRevisionRow(seed, {
        assetId: duplicatedAssetId,
        id: duplicatedRevisionId,
        manifest: seed.assetKind === 'template'
          ? buildPublicPresenceTemplateAssetManifest(seed.templateId!, {
              assetCode: `${seed.code}-copy`,
              assetId: duplicatedAssetId,
              assetRevisionId: duplicatedRevisionId,
              description: seed.description,
              name: seed.name,
              ownerId: null,
              ownerType: 'tenant',
            })
          : buildPublicPresenceComponentAssetManifest(seed.componentType!, {
              assetCode: `${seed.code}-copy`,
              assetId: duplicatedAssetId,
              assetRevisionId: duplicatedRevisionId,
              description: seed.description,
              name: seed.name,
              ownerId: null,
              ownerType: 'tenant',
            }),
      });

      repository.findAssetByCodeAtScope.mockImplementation(
        async (_tenantSchema, ownerType, ownerId, code) => {
          if (ownerType !== 'system' || ownerId !== null) {
            return null;
          }

          const matchedSeed = getPublicPresenceSystemAssetSeeds().find((item) => item.code === code);
          if (!matchedSeed) {
            return null;
          }

          if (matchedSeed.code === seed.code && !repaired) {
            return legacyAsset;
          }

          return createAssetRow(matchedSeed, {
            currentRevisionId: matchedSeed.code === seed.code
              ? repairedRevisionId
              : `revision-${matchedSeed.code}`,
            id: matchedSeed.code === seed.code ? legacyAssetId : `asset-${matchedSeed.code}`,
          });
        },
      );
      repository.createRevisionAndAssignCurrent.mockImplementationOnce(async () => {
        repaired = true;
        return createAssetRow(seed, {
          currentRevisionId: repairedRevisionId,
          id: legacyAssetId,
        });
      });
      repository.findAssetById.mockImplementation(async (_tenantSchema, assetId) => {
        if (assetId === legacyAssetId) {
          return createAssetRow(seed, {
            currentRevisionId: repaired ? repairedRevisionId : null,
            id: legacyAssetId,
          });
        }

        if (assetId === duplicatedAssetId) {
          return duplicatedAsset;
        }

        return null;
      });
      repository.findCurrentRevision.mockImplementation(async (_tenantSchema, assetId) => {
        if (assetId === legacyAssetId) {
          return repaired ? repairedRevision : null;
        }

        if (assetId === duplicatedAssetId) {
          return duplicatedRevision;
        }

        return null;
      });
      repository.createAssetWithCurrentRevision.mockResolvedValueOnce(duplicatedAsset);
      repository.listRevisions.mockResolvedValueOnce([duplicatedRevision]);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/public-presence/assets/${legacyAssetId}/duplicate`)
        .query({ scopeType: 'tenant' })
        .send({});

      expect(response.status).toBe(201);
      expect(repository.createRevisionAndAssignCurrent).toHaveBeenCalledWith(
        TEST_USER.tenantSchema,
        expect.objectContaining({
          actorId: TEST_USER.id,
          assetId: legacyAssetId,
          artifactStatus: 'active',
          status: 'active',
        }),
      );
      expect(response.body).toEqual(
        expect.objectContaining({
          asset: expect.objectContaining({
            id: duplicatedAssetId,
            code: `${seed.code}-copy`,
          }),
          currentRevision: expect.objectContaining({
            id: duplicatedRevisionId,
            assetId: duplicatedAssetId,
          }),
        }),
      );
    },
  );
});
