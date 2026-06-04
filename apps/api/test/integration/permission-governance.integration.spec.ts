import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaClient } from '@tcrn/database';
import {
  createLocalizedText,
  createTestTenantFixture,
  createTestUserInTenant,
  INITIAL_ADMIN_ROLE_CODE,
  LEGACY_ADMIN_COMPATIBILITY_ROLE_CODES,
  type TenantFixture,
  type TestUser,
} from '@tcrn/shared';

import { AppModule } from '../../src/app.module';
import { TokenService } from '../../src/modules/auth/token.service';
import { PermissionSnapshotService } from '../../src/modules/permission/permission-snapshot.service';
import { RedisService } from '../../src/modules/redis/redis.service';
import { bootstrapTestApp } from '../../src/testing/bootstrap-test-app';

const CUSTOM_ROLE_CODE = 'PERMISSION_GOVERNANCE_OPERATOR';

describe('Permission Governance Integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let tenantFixture: TenantFixture;
  let adminUser: TestUser;
  let subjectUser: TestUser;
  let tokenService: TokenService;
  let permissionSnapshotService: PermissionSnapshotService;
  let redisService: RedisService;

  const issueToken = (user: TestUser): string =>
    tokenService.generateAccessToken({
      sub: user.id,
      tid: user.tenantId,
      tsc: user.schemaName,
      email: user.email,
      username: user.username,
    }).token;

  const withAuth = (req: request.Test, user: TestUser = adminUser) =>
    req.set('Authorization', `Bearer ${issueToken(user)}`).set('X-Tenant-ID', user.tenantId);

  async function removePermissionSnapshots(schemaName: string): Promise<void> {
    const keys = await redisService.keys(`perm:${schemaName}:*`);

    for (const key of keys) {
      await redisService.del(key);
    }
  }

  async function upsertLegacyCompatibilityRoles(): Promise<Array<{ id: string; code: string }>> {
    const legacyName = createLocalizedText({ en: 'Legacy Admin Compatibility' });

    for (const roleCode of LEGACY_ADMIN_COMPATIBILITY_ROLE_CODES) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO "${tenantFixture.schemaName}".role (
            id, code, name, description, is_system, is_active, created_at, updated_at, version
          )
          VALUES (
            gen_random_uuid(),
            $1,
            $2::jsonb,
            'Historical compatibility row for permission-governance tests',
            false,
            true,
            NOW(),
            NOW(),
            1
          )
          ON CONFLICT (code) DO UPDATE
          SET name = EXCLUDED.name,
              description = EXCLUDED.description,
              is_system = false,
              is_active = true,
              updated_at = NOW()
        `,
        roleCode,
        JSON.stringify(legacyName)
      );
    }

    return prisma.$queryRawUnsafe<Array<{ id: string; code: string }>>(
      `
        SELECT id, code
        FROM "${tenantFixture.schemaName}".role
        WHERE code = ANY($1::text[])
        ORDER BY code
      `,
      [...LEGACY_ADMIN_COMPATIBILITY_ROLE_CODES]
    );
  }

  async function countRolePolicy(
    roleId: string,
    resourceCode: string,
    action: string
  ): Promise<number> {
    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*)::bigint AS count
        FROM "${tenantFixture.schemaName}".role_policy rp
        JOIN "${tenantFixture.schemaName}".policy p ON p.id = rp.policy_id
        JOIN "${tenantFixture.schemaName}".resource r ON r.id = p.resource_id
        WHERE rp.role_id = $1::uuid
          AND r.code = $2
          AND p.action = $3
      `,
      roleId,
      resourceCode,
      action
    );

    return Number(rows[0]?.count ?? 0n);
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await bootstrapTestApp(app);

    tokenService = moduleFixture.get(TokenService);
    permissionSnapshotService = moduleFixture.get(PermissionSnapshotService);
    redisService = moduleFixture.get(RedisService);
    prisma = new PrismaClient();
    tenantFixture = await createTestTenantFixture(prisma, 'permission_governance');
    adminUser = await createTestUserInTenant(
      prisma,
      tenantFixture,
      `permission_governance_admin_${Date.now()}`,
      [INITIAL_ADMIN_ROLE_CODE]
    );
    subjectUser = await createTestUserInTenant(
      prisma,
      tenantFixture,
      `permission_governance_subject_${Date.now()}`,
      []
    );

    await upsertLegacyCompatibilityRoles();
  });

  afterAll(async () => {
    if (tenantFixture) {
      await removePermissionSnapshots(tenantFixture.schemaName);
    }

    await tenantFixture?.cleanup();
    await prisma?.$disconnect();
    await app?.close();
  });

  it('exposes exactly Initial Admin as the built-in role while hiding legacy compatibility rows by default', async () => {
    const defaultResponse = await withAuth(
      request(app.getHttpServer()).get('/api/v1/roles')
    ).expect(200);
    const defaultCodes = defaultResponse.body.data.map((role: { code: string }) => role.code);

    expect(defaultCodes).toContain(INITIAL_ADMIN_ROLE_CODE);
    expect(defaultCodes).not.toEqual(expect.arrayContaining([...LEGACY_ADMIN_COMPATIBILITY_ROLE_CODES]));

    const explicitFalseResponse = await withAuth(
      request(app.getHttpServer()).get('/api/v1/roles').query({ includeCompatibility: 'false' })
    ).expect(200);
    const explicitFalseCodes = explicitFalseResponse.body.data.map(
      (role: { code: string }) => role.code
    );

    expect(explicitFalseCodes).not.toEqual(
      expect.arrayContaining([...LEGACY_ADMIN_COMPATIBILITY_ROLE_CODES])
    );

    const roleSystemResponse = await withAuth(
      request(app.getHttpServer()).get('/api/v1/roles').query({ isSystem: true })
    ).expect(200);
    const roleSystemCodes = roleSystemResponse.body.data.map((role: { code: string }) => role.code);

    expect(roleSystemCodes).toEqual([INITIAL_ADMIN_ROLE_CODE]);

    const deprecatedSystemResponse = await withAuth(
      request(app.getHttpServer()).get('/api/v1/system-roles').query({ isSystem: true })
    ).expect(200);
    const deprecatedSystemCodes = deprecatedSystemResponse.body.data.map(
      (role: { code: string }) => role.code
    );

    expect(deprecatedSystemCodes).not.toEqual(
      expect.arrayContaining([...LEGACY_ADMIN_COMPATIBILITY_ROLE_CODES])
    );

    const compatibilityResponse = await withAuth(
      request(app.getHttpServer()).get('/api/v1/roles').query({ includeCompatibility: true })
    ).expect(200);
    const compatibilityCodes = compatibilityResponse.body.data.map(
      (role: { code: string }) => role.code
    );

    expect(compatibilityCodes).toEqual(
      expect.arrayContaining([...LEGACY_ADMIN_COMPATIBILITY_ROLE_CODES])
    );
  });

  it('rejects legacy admin compatibility assignment by roleCode and roleId', async () => {
    const legacyRoles = await upsertLegacyCompatibilityRoles();
    const adminRole = legacyRoles.find((role) => role.code === 'ADMIN');

    await withAuth(request(app.getHttpServer()).post(`/api/v1/users/${subjectUser.id}/roles`))
      .send({
        roleCode: 'PLATFORM_ADMIN',
        scopeType: 'tenant',
        inherit: false,
      })
      .expect(400)
      .expect((response) => {
        expect(response.body.error).toMatchObject({
          code: 'LEGACY_ADMIN_ROLE_ASSIGNMENT_REMOVED',
        });
      });

    await withAuth(request(app.getHttpServer()).post(`/api/v1/users/${subjectUser.id}/roles`))
      .send({
        roleId: adminRole?.id,
        scopeType: 'tenant',
        inherit: false,
      })
      .expect(400)
      .expect((response) => {
        expect(response.body.error).toMatchObject({
          code: 'LEGACY_ADMIN_ROLE_ASSIGNMENT_REMOVED',
        });
      });
  });

  it('preserves grant, deny, and unset semantics while /permissions/check refreshes stale snapshots', async () => {
    await removePermissionSnapshots(tenantFixture.schemaName);

    const createResponse = await withAuth(request(app.getHttpServer()).post('/api/v1/roles'))
      .send({
        code: CUSTOM_ROLE_CODE,
        name: createLocalizedText({ en: 'Permission Governance Operator' }),
        permissions: [{ resource: 'customer.profile', action: 'read', effect: 'grant' }],
      })
      .expect(201);
    const roleId = createResponse.body.data.id as string;
    let roleVersion = createResponse.body.data.version as number;

    await withAuth(request(app.getHttpServer()).post(`/api/v1/users/${subjectUser.id}/roles`))
      .send({
        roleCode: CUSTOM_ROLE_CODE,
        scopeType: 'tenant',
        inherit: true,
      })
      .expect(201);

    const grantCheck = await withAuth(
      request(app.getHttpServer()).post('/api/v1/permissions/check'),
      subjectUser
    )
      .send({
        checks: [{ resource: 'customer.profile', action: 'read', scopeType: 'tenant' }],
      })
      .expect(201);

    expect(grantCheck.body.data.results[0]).toMatchObject({
      resource: 'customer.profile',
      checkedAction: 'read',
      allowed: true,
    });

    const versionAfterGrant = await permissionSnapshotService.getCurrentPermissionVersion(
      tenantFixture.schemaName
    );

    const denyResponse = await withAuth(
      request(app.getHttpServer()).patch(`/api/v1/roles/${roleId}/permissions`)
    )
      .send({
        version: roleVersion,
        permissionStates: {
          rawPermissionStates: [
            { resource: 'customer.profile', action: 'read', state: 'deny' },
          ],
        },
      })
      .expect(200);
    roleVersion = denyResponse.body.data.version as number;

    const versionAfterDeny = await permissionSnapshotService.getCurrentPermissionVersion(
      tenantFixture.schemaName
    );
    expect(versionAfterDeny).toBeGreaterThan(versionAfterGrant);

    const denyCheck = await withAuth(
      request(app.getHttpServer()).post('/api/v1/permissions/check'),
      subjectUser
    )
      .send({
        checks: [{ resource: 'customer.profile', action: 'read', scopeType: 'tenant' }],
      })
      .expect(201);

    expect(denyCheck.body.data.results[0]).toMatchObject({
      resource: 'customer.profile',
      checkedAction: 'read',
      allowed: false,
    });

    expect(await countRolePolicy(roleId, 'customer.profile', 'read')).toBe(1);

    await withAuth(request(app.getHttpServer()).patch(`/api/v1/roles/${roleId}/permissions`))
      .send({
        version: roleVersion,
        permissionStates: {
          rawPermissionStates: [
            { resource: 'customer.profile', action: 'read', state: 'unset' },
          ],
        },
      })
      .expect(200);

    expect(await countRolePolicy(roleId, 'customer.profile', 'read')).toBe(0);

    const unsetCheck = await withAuth(
      request(app.getHttpServer()).post('/api/v1/permissions/check'),
      subjectUser
    )
      .send({
        checks: [{ resource: 'customer.profile', action: 'read', scopeType: 'tenant' }],
      })
      .expect(201);

    expect(unsetCheck.body.data.results[0]).toMatchObject({
      resource: 'customer.profile',
      checkedAction: 'read',
      allowed: false,
    });
  });
});
