import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { prisma } from '@tcrn/database';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootstrapTestApp } from '../../testing/bootstrap-test-app';
import { BlocklistService } from './blocklist.service';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { ConsumerKeyService } from './consumer-key.service';

vi.mock('@tcrn/database', () => ({
  prisma: {
    $executeRawUnsafe: vi.fn(),
    $queryRawUnsafe: vi.fn(),
  },
}));

const TEST_USER = {
  id: 'user-1',
  tenantId: 'tenant-1',
  tenantSchema: 'tenant_uat_corp',
  email: 'operator@example.com',
  username: 'operator',
};

const mockPrisma = prisma as unknown as {
  $executeRawUnsafe: ReturnType<typeof vi.fn>;
  $queryRawUnsafe: ReturnType<typeof vi.fn>;
};

describe('ConfigController artist-stage list path', () => {
  let app: INestApplication;

  beforeEach(async () => {
    mockPrisma.$executeRawUnsafe.mockReset();
    mockPrisma.$queryRawUnsafe.mockReset();
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ count: 1n }])
      .mockResolvedValueOnce([
        {
          id: 'artist-stage-1',
          ownerType: 'tenant',
          ownerId: null,
          code: 'PRE_DEBUT',
          name: {
            en: 'Pre-Debut',
            zh_HANS: '出道前',
            zh_HANT: '出道前',
            ja: 'デビュー前',
            ko: '데뷔 전',
            fr: 'Pre-debut',
          },
          description: {
            en: 'Draft-stage artists',
            zh_HANS: '草稿阶段艺人',
            zh_HANT: '草稿階段藝人',
            ja: '下書き段階のタレント',
            ko: '초안 단계 아티스트',
            fr: 'Artistes en brouillon',
          },
          extraData: null,
          sortOrder: 0,
          isActive: true,
          isForceUse: false,
          isSystem: true,
          createdAt: new Date('2026-05-23T18:00:00.000Z'),
          updatedAt: new Date('2026-05-23T18:05:00.000Z'),
          createdBy: null,
          updatedBy: null,
          version: 1,
          color: '#f59e0b',
          lifecycleStatusMapping: 'draft',
          homepagePolicyKey: 'debut-policy',
        },
      ])
      .mockResolvedValueOnce([]);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ConfigController],
      providers: [
        ConfigService,
        {
          provide: BlocklistService,
          useValue: {},
        },
        {
          provide: ConsumerKeyService,
          useValue: {},
        },
      ],
    }).compile();

    const controller = moduleFixture.get(ConfigController);
    (controller as unknown as { configService: ConfigService }).configService =
      moduleFixture.get(ConfigService);

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

  it('returns artist-stage records without selecting a nonexistent is_force_use column', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/configuration-entity/artist-stage')
      .query({ includeInactive: true, pageSize: 20 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: [
        expect.objectContaining({
          code: 'PRE_DEBUT',
          isForceUse: false,
          isSystem: true,
          lifecycleStatusMapping: 'draft',
          homepagePolicyKey: 'debut-policy',
        }),
      ],
      meta: {
        pagination: expect.objectContaining({
          page: 1,
          totalCount: 1,
        }),
      },
    });

    const listSql = String(mockPrisma.$queryRawUnsafe.mock.calls[1][0]);

    expect(listSql).toContain('is_system as "isSystem"');
    expect(listSql).toContain('false as "isForceUse"');
    expect(listSql).not.toContain('is_force_use as "isForceUse"');
  });
});
