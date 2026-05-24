import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import 'reflect-metadata';
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

describe('PublicPresenceAssetController list path', () => {
  let app: INestApplication;
  let repository: {
    createAssetWithCurrentRevision: ReturnType<typeof vi.fn>;
    findAssetByCodeAtScope: ReturnType<typeof vi.fn>;
    listCurrentRevisionsByAssetIds: ReturnType<typeof vi.fn>;
    listVisibleAssets: ReturnType<typeof vi.fn>;
    resolveScopeChain: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repository = {
      createAssetWithCurrentRevision: vi.fn(),
      findAssetByCodeAtScope: vi.fn().mockResolvedValue({ id: 'seed-present' }),
      listCurrentRevisionsByAssetIds: vi.fn(),
      listVisibleAssets: vi.fn(),
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
    (
      service as unknown as {
        publicPresenceAssetRepository: typeof repository;
      }
    ).publicPresenceAssetRepository = repository;

    const controller = moduleFixture.get(PublicPresenceAssetController);
    (
      controller as unknown as {
        publicPresenceAssetService: PublicPresenceAssetService;
      }
    ).publicPresenceAssetService = service;

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
      assetRow: {
        assetKind: 'template',
        code: 'active-hub-tenant',
        componentType: null,
        createdAt: new Date('2026-05-23T18:10:00.000Z'),
        currentRevisionId: 'revision-template-1',
        description: {
          en: 'Tenant template',
          zh_HANS: '租户模板',
          zh_HANT: '租戶模板',
          ja: 'テナントテンプレート',
          ko: '테넌트 템플릿',
          fr: 'Modele tenant',
        },
        id: 'asset-template-1',
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
        updatedAt: new Date('2026-05-23T18:12:00.000Z'),
        version: 3,
      },
      revisionRow: {
        artifactStatus: 'draft',
        assetId: 'asset-template-1',
        createdAt: new Date('2026-05-23T18:11:00.000Z'),
        createdBy: 'user-1',
        id: 'revision-template-1',
        lastValidatedAt: null,
        manifest: {
          assetKind: 'template',
          runtimeContractVersion: '1.0.0',
          label: 'Active Talent Hub',
          useCase: 'General homepage',
          templateId: 'activeTalentHub',
          requiredSections: ['hero'],
          recommendedSections: ['fanKit'],
          optionalSections: ['schedule'],
          lockedSections: [],
          defaultSectionOrder: ['hero', 'fanKit', 'schedule'],
          personaKitFields: [],
          validationRules: [],
          policyReferences: [],
        },
        revisionNumber: 7,
        runtimeContractVersion: '1.0.0',
        sourceBundle: [
          {
            path: 'manifest.json',
            kind: 'json',
            language: 'json',
            contents: '{}',
          },
        ],
        sourceHash: 'a'.repeat(64),
        submittedAt: null,
        validationState: 'unvalidated',
        validationSummary: {
          issueCount: 0,
          passCount: 0,
          warnCount: 0,
        },
      },
    },
    {
      assetKind: 'component',
      assetRow: {
        assetKind: 'component',
        code: 'social-links-tenant',
        componentType: 'SocialLinks',
        createdAt: new Date('2026-05-23T18:15:00.000Z'),
        currentRevisionId: 'revision-component-1',
        description: {
          en: 'Tenant component',
          zh_HANS: '租户组件',
          zh_HANT: '租戶組件',
          ja: 'テナントコンポーネント',
          ko: '테넌트 컴포넌트',
          fr: 'Composant tenant',
        },
        id: 'asset-component-1',
        isSystem: false,
        name: {
          en: 'Social Links',
          zh_HANS: '社交链接',
          zh_HANT: '社交連結',
          ja: 'ソーシャルリンク',
          ko: '소셜 링크',
          fr: 'Liens sociaux',
        },
        ownerId: null,
        ownerType: 'tenant',
        status: 'draft',
        templateId: null,
        updatedAt: new Date('2026-05-23T18:16:00.000Z'),
        version: 2,
      },
      revisionRow: {
        artifactStatus: 'draft',
        assetId: 'asset-component-1',
        createdAt: new Date('2026-05-23T18:15:30.000Z'),
        createdBy: 'user-1',
        id: 'revision-component-1',
        lastValidatedAt: null,
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
        revisionNumber: 4,
        runtimeContractVersion: '1.0.0',
        sourceBundle: [
          {
            path: 'manifest.json',
            kind: 'json',
            language: 'json',
            contents: '{}',
          },
        ],
        sourceHash: 'b'.repeat(64),
        submittedAt: null,
        validationState: 'unvalidated',
        validationSummary: {
          issueCount: 0,
          passCount: 0,
          warnCount: 0,
        },
      },
    },
  ])(
    'returns tenant-scope $assetKind inventory with current revision data',
    async ({ assetKind, assetRow, revisionRow }) => {
      repository.listVisibleAssets.mockResolvedValueOnce([assetRow]);
      repository.listCurrentRevisionsByAssetIds.mockResolvedValueOnce([revisionRow]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/public-presence/assets')
        .query({ assetKind, scopeType: 'tenant' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        expect.objectContaining({
          asset: expect.objectContaining({
            id: assetRow.id,
            assetKind,
            code: assetRow.code,
          }),
          canEdit: true,
          currentRevision: expect.objectContaining({
            id: revisionRow.id,
            assetId: assetRow.id,
            revisionNumber: revisionRow.revisionNumber,
            sourceHash: revisionRow.sourceHash,
          }),
          isInherited: false,
          scope: {
            scopeType: 'tenant',
            scopeId: null,
          },
        }),
      ]);
      expect(repository.listVisibleAssets).toHaveBeenCalledWith(
        TEST_USER.tenantSchema,
        [
          { ownerType: 'system', ownerId: null },
          { ownerType: 'tenant', ownerId: null },
        ],
        assetKind
      );
      expect(repository.listCurrentRevisionsByAssetIds).toHaveBeenCalledWith(
        TEST_USER.tenantSchema,
        [assetRow.id]
      );
    }
  );
});
