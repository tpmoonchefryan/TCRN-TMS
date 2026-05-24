// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootstrapTestApp } from '../../testing/bootstrap-test-app';
import { PublicPresenceAssetService } from './application/public-presence-asset.service';
import { PublicPresenceAssetController } from './controllers/public-presence-asset.controller';

const TEST_USER = {
  id: 'user-1',
  tenantId: 'tenant-1',
  tenantSchema: 'tenant_uat_corp',
  email: 'operator@example.com',
  username: 'operator',
};

const TEST_ASSET_ID = '11111111-1111-4111-8111-111111111111';
const TEST_SCOPE_ID = '22222222-2222-4222-8222-222222222222';

describe('PublicPresenceAssetController validation', () => {
  let app: INestApplication;
  let assetService: {
    createAsset: ReturnType<typeof vi.fn>;
    duplicateAsset: ReturnType<typeof vi.fn>;
    getAssetDetail: ReturnType<typeof vi.fn>;
    listAssets: ReturnType<typeof vi.fn>;
    saveAssetDraft: ReturnType<typeof vi.fn>;
    validateAsset: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    assetService = {
      createAsset: vi.fn(),
      duplicateAsset: vi.fn(),
      getAssetDetail: vi.fn(),
      listAssets: vi.fn(),
      saveAssetDraft: vi.fn(),
      validateAsset: vi.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PublicPresenceAssetController],
      providers: [
        {
          provide: PublicPresenceAssetService,
          useValue: assetService,
        },
      ],
    }).compile();

    const controller = moduleFixture.get(PublicPresenceAssetController);
    (controller as unknown as {
      publicPresenceAssetService: typeof assetService;
    }).publicPresenceAssetService = assetService;

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

  it('rejects invalid assetKind on list before hitting the service', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/public-presence/assets')
      .query({ assetKind: 'widget' });

    expect(response.status).toBe(400);
    expect(assetService.listAssets).not.toHaveBeenCalled();
  });

  it('rejects invalid scopeType on detail reads before hitting the service', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/public-presence/assets/${TEST_ASSET_ID}`)
      .query({ scopeType: 'workspace' });

    expect(response.status).toBe(400);
    expect(assetService.getAssetDetail).not.toHaveBeenCalled();
  });

  it('rejects mismatched template manifest payloads before create mutation', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/public-presence/assets')
      .query({ scopeType: 'tenant' })
      .send({
        assetKind: 'template',
        templateId: 'activeTalentHub',
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
      });

    expect(response.status).toBe(400);
    expect(assetService.createAsset).not.toHaveBeenCalled();
  });

  it('rejects empty revision source bundles before draft save mutation', async () => {
    const response = await request(app.getHttpServer())
      .put(`/api/v1/public-presence/assets/${TEST_ASSET_ID}/current`)
      .query({ scopeType: 'tenant' })
      .send({
        sourceBundle: [],
      });

    expect(response.status).toBe(400);
    expect(assetService.saveAssetDraft).not.toHaveBeenCalled();
  });

  it('rejects missing non-tenant scope ids before validate and duplicate mutations', async () => {
    const validateResponse = await request(app.getHttpServer())
      .post(`/api/v1/public-presence/assets/${TEST_ASSET_ID}/current/validate`)
      .query({ scopeType: 'talent' })
      .send({
        sourceBundle: [
          {
            path: 'src/index.tsx',
            kind: 'code',
            language: 'tsx',
            contents: 'export const Template = () => null;',
          },
        ],
      });

    const duplicateResponse = await request(app.getHttpServer())
      .post(`/api/v1/public-presence/assets/${TEST_ASSET_ID}/duplicate`)
      .query({ scopeType: 'subsidiary' })
      .send({
        code: 'copy',
      });

    expect(validateResponse.status).toBe(400);
    expect(duplicateResponse.status).toBe(400);
    expect(assetService.validateAsset).not.toHaveBeenCalled();
    expect(assetService.duplicateAsset).not.toHaveBeenCalled();
  });

  it('rejects tenant scope ids on duplicate before mutation', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/public-presence/assets/${TEST_ASSET_ID}/duplicate`)
      .query({ scopeType: 'tenant', scopeId: TEST_SCOPE_ID })
      .send({});

    expect(response.status).toBe(400);
    expect(assetService.duplicateAsset).not.toHaveBeenCalled();
  });
});
