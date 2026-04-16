// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@tcrn/database';
import {
  createTestTalentInTenant,
  createTestTenantFixture,
  createTestUserInTenant,
  type TenantFixture,
  type TestUser,
} from '@tcrn/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../../src/app.module';
import { TokenService } from '../../src/modules/auth/token.service';
import { bootstrapTestApp } from '../../src/testing/bootstrap-test-app';

describe('Talent Draft Delete Integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let tenantFixture: TenantFixture;
  let testUser: TestUser;
  let accessToken: string;

  const withAuth = (req: request.Test) =>
    req
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-ID', tenantFixture.tenant.id);

  const uniqueSuffix = () =>
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();

  const createDraftTalent = async () =>
    createTestTalentInTenant(prisma, tenantFixture, null, {
      code: `TAL_DEL_${uniqueSuffix()}`,
      nameEn: 'Talent Draft Delete Integration',
      displayName: 'Talent Draft Delete Integration',
      homepagePath: `talent-draft-delete-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdBy: testUser.id,
    });

  const setTalentLifecycle = async (
    talentId: string,
    lifecycleStatus: 'published' | 'disabled',
  ) => {
    await prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantFixture.schemaName}".talent
        SET lifecycle_status = $2,
            published_at = CASE
              WHEN $2 IN ('published', 'disabled') THEN COALESCE(published_at, NOW())
              ELSE NULL
            END,
            published_by = CASE
              WHEN $2 IN ('published', 'disabled') THEN $3::uuid
              ELSE NULL
            END,
            updated_at = NOW()
        WHERE id = $1::uuid
      `,
      talentId,
      lifecycleStatus,
      testUser.id,
    );
  };

  const getTalentRow = async (talentId: string) => {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        version: number;
        profileStoreId: string | null;
        lifecycleStatus: string;
      }>
    >(
      `
        SELECT
          id,
          version,
          profile_store_id as "profileStoreId",
          lifecycle_status as "lifecycleStatus"
        FROM "${tenantFixture.schemaName}".talent
        WHERE id = $1::uuid
      `,
      talentId,
    );

    return rows[0] ?? null;
  };

  const seedDraftSafeSetupRows = async (talentId: string) => {
    const homepageId = crypto.randomUUID();
    const homepageVersionId = crypto.randomUUID();
    const marshmallowConfigId = crypto.randomUUID();
    const configOverrideEntityId = crypto.randomUUID();

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantFixture.schemaName}".talent_homepage
          (id, talent_id, is_published, theme, created_at, updated_at, version)
        VALUES
          ($1::uuid, $2::uuid, false, '{}'::jsonb, NOW(), NOW(), 1)
      `,
      homepageId,
      talentId,
    );

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantFixture.schemaName}".homepage_version
          (id, homepage_id, version_number, content, theme, status, updated_at, created_at, created_by)
        VALUES
          ($1::uuid, $2::uuid, 1, $3::jsonb, '{}'::jsonb, 'draft', NOW(), NOW(), $4::uuid)
      `,
      homepageVersionId,
      homepageId,
      JSON.stringify({
        version: '1.0.0',
        components: [],
      }),
      testUser.id,
    );

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantFixture.schemaName}".marshmallow_config
          (id, talent_id, is_enabled, captcha_mode, moderation_enabled, auto_approve, created_at, updated_at, version)
        VALUES
          ($1::uuid, $2::uuid, false, 'auto', true, false, NOW(), NOW(), 1)
      `,
      marshmallowConfigId,
      talentId,
    );

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantFixture.schemaName}".config_override
          (id, entity_type, entity_id, owner_type, owner_id, is_disabled, created_at, updated_at, created_by, updated_by)
        VALUES
          (gen_random_uuid(), 'customer_status', $1::uuid, 'talent', $2::uuid, false, NOW(), NOW(), $3::uuid, $3::uuid)
      `,
      configOverrideEntityId,
      talentId,
      testUser.id,
    );

    return {
      homepageId,
      homepageVersionId,
      marshmallowConfigId,
      configOverrideEntityId,
    };
  };

  const getDraftSafeSetupCounts = async (talentId: string) => {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        homepageCount: number;
        homepageVersionCount: number;
        marshmallowConfigCount: number;
        configOverrideCount: number;
      }>
    >(
      `
        SELECT
          (SELECT COUNT(*)::int
           FROM "${tenantFixture.schemaName}".talent_homepage
           WHERE talent_id = $1::uuid) as "homepageCount",
          (SELECT COUNT(*)::int
           FROM "${tenantFixture.schemaName}".homepage_version
           WHERE homepage_id IN (
             SELECT id
             FROM "${tenantFixture.schemaName}".talent_homepage
             WHERE talent_id = $1::uuid
           )) as "homepageVersionCount",
          (SELECT COUNT(*)::int
           FROM "${tenantFixture.schemaName}".marshmallow_config
           WHERE talent_id = $1::uuid) as "marshmallowConfigCount",
          (SELECT COUNT(*)::int
           FROM "${tenantFixture.schemaName}".config_override
           WHERE owner_type = 'talent'
             AND owner_id = $1::uuid) as "configOverrideCount"
      `,
      talentId,
    );

    return rows[0]!;
  };

  const seedProtectedCustomerProfile = async (talentId: string, profileStoreId: string) => {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${tenantFixture.schemaName}".customer_profile
          (
            id,
            talent_id,
            profile_store_id,
            origin_talent_id,
            profile_type,
            nickname,
            tags,
            is_active,
            created_at,
            updated_at,
            created_by,
            updated_by,
            version
          )
        VALUES
          (
            gen_random_uuid(),
            $1::uuid,
            $2::uuid,
            $1::uuid,
            'individual',
            'Protected Delete Customer',
            '{}'::varchar[],
            true,
            NOW(),
            NOW(),
            $3::uuid,
            $3::uuid,
            1
          )
      `,
      talentId,
      profileStoreId,
      testUser.id,
    );
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await bootstrapTestApp(app);

    prisma = new PrismaClient();
    tenantFixture = await createTestTenantFixture(prisma, 'talent_delete');
    testUser = await createTestUserInTenant(
      prisma,
      tenantFixture,
      `talent_delete_admin_${Date.now()}`,
      ['ADMIN'],
    );

    const tokenService = moduleFixture.get(TokenService);
    accessToken = tokenService.generateAccessToken({
      sub: testUser.id,
      tid: testUser.tenantId,
      tsc: testUser.schemaName,
      email: testUser.email,
      username: testUser.username,
    }).token;
  });

  afterAll(async () => {
    await app?.close();
    await tenantFixture?.cleanup();
    await prisma?.$disconnect();
  });

  it('hard-deletes a draft talent and cleans draft-safe setup rows', async () => {
    const talent = await createDraftTalent();
    await seedDraftSafeSetupRows(talent.id);

    const beforeCounts = await getDraftSafeSetupCounts(talent.id);
    expect(beforeCounts).toMatchObject({
      homepageCount: 1,
      homepageVersionCount: 1,
      marshmallowConfigCount: 1,
      configOverrideCount: 1,
    });

    const response = await withAuth(
      request(app.getHttpServer()).delete(`/api/v1/talents/${talent.id}`),
    )
      .query({ version: 1 })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      id: talent.id,
      deleted: true,
    });

    expect(await getTalentRow(talent.id)).toBeNull();
    expect(await getDraftSafeSetupCounts(talent.id)).toMatchObject({
      homepageCount: 0,
      homepageVersionCount: 0,
      marshmallowConfigCount: 0,
      configOverrideCount: 0,
    });
  });

  it.each(['published', 'disabled'] as const)(
    'returns TALENT_LIFECYCLE_CONFLICT for %s talent delete',
    async (lifecycleStatus) => {
      const talent = await createDraftTalent();
      await setTalentLifecycle(talent.id, lifecycleStatus);

      const response = await withAuth(
        request(app.getHttpServer()).delete(`/api/v1/talents/${talent.id}`),
      )
        .query({ version: 1 })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatchObject({
        code: 'TALENT_LIFECYCLE_CONFLICT',
      });
      expect(response.body.error.details).toMatchObject({
        lifecycleStatus,
      });

      const talentRow = await getTalentRow(talent.id);
      expect(talentRow).not.toBeNull();
      expect(talentRow?.lifecycleStatus).toBe(lifecycleStatus);
    },
  );

  it('returns TALENT_LIFECYCLE_CONFLICT when protected customer data already exists', async () => {
    const talent = await createDraftTalent();
    const talentRow = await getTalentRow(talent.id);

    if (!talentRow?.profileStoreId) {
      throw new Error(`No profile store found for draft delete test talent ${talent.id}`);
    }

    await seedProtectedCustomerProfile(talent.id, talentRow.profileStoreId);

    const response = await withAuth(
      request(app.getHttpServer()).delete(`/api/v1/talents/${talent.id}`),
    )
      .query({ version: 1 })
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatchObject({
      code: 'TALENT_LIFECYCLE_CONFLICT',
    });
    expect(response.body.error.details.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'CUSTOMER_PROFILE_EXISTS',
          count: 1,
        }),
      ]),
    );

    expect(await getTalentRow(talent.id)).not.toBeNull();
  });
});
