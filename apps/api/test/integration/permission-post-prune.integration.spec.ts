// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// API-layer regression proof for legacy RBAC prune batches.

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaClient } from '@tcrn/database';
import {
  type TenantFixture,
  type TestUser,
  createTestTenantFixture,
  createTestUserInTenant,
} from '@tcrn/shared';

import { auditLegacyRbac } from '../../../../packages/database/scripts/audit-legacy-rbac';
import {
  buildPrunePlan,
  executePrunePlan,
  promoteRuntimeVerifiedTargetInAudit,
} from '../../../../packages/database/scripts/prune-legacy-rbac';
import { verifyLegacyPruneRuntime } from '../../../../packages/database/scripts/verify-legacy-prune-runtime';
import { AppModule } from '../../src/app.module';
import { TokenService } from '../../src/modules/auth/token.service';
import { PermissionSnapshotService } from '../../src/modules/permission/permission-snapshot.service';
import { RedisService } from '../../src/modules/redis/redis.service';
import { bootstrapTestApp } from '../../src/testing/bootstrap-test-app';

interface LegacyPruneTargetFixture {
  legacyCode: string;
  module: string;
  nameEn: string;
  sortOrder: number;
  legacyActions: string[];
  expectedCanonicalPermissions: string[];
}

const CONTENT_LOG_TARGETS: readonly LegacyPruneTargetFixture[] = [
  {
    legacyCode: 'homepage',
    module: 'external',
    nameEn: 'Homepage',
    sortOrder: 180,
    legacyActions: ['read', 'write', 'delete', 'admin'],
    expectedCanonicalPermissions: [
      'talent.homepage:read',
      'talent.homepage:write',
      'talent.homepage:admin',
    ],
  },
  {
    legacyCode: 'marshmallow',
    module: 'external',
    nameEn: 'Marshmallow',
    sortOrder: 190,
    legacyActions: ['read', 'write', 'delete', 'admin'],
    expectedCanonicalPermissions: [
      'talent.marshmallow:read',
      'talent.marshmallow:write',
      'talent.marshmallow:execute',
      'talent.marshmallow:admin',
    ],
  },
  {
    legacyCode: 'log.change',
    module: 'log',
    nameEn: 'Change Log',
    sortOrder: 270,
    legacyActions: ['read', 'write', 'delete', 'admin'],
    expectedCanonicalPermissions: ['log.change_log:read'],
  },
  {
    legacyCode: 'log.integration',
    module: 'log',
    nameEn: 'Integration Log',
    sortOrder: 280,
    legacyActions: ['read', 'write', 'delete', 'admin'],
    expectedCanonicalPermissions: ['log.integration_log:read'],
  },
];

const CONFIG_SECURITY_TARGETS: readonly LegacyPruneTargetFixture[] = [
  {
    legacyCode: 'config.platform',
    module: 'config',
    nameEn: 'Platform Config',
    sortOrder: 170,
    legacyActions: ['read', 'write', 'delete', 'admin'],
    expectedCanonicalPermissions: [
      'config.platform_registry:read',
      'config.platform_registry:write',
      'config.platform_registry:admin',
      'config.platform_settings:read',
      'config.platform_settings:write',
      'config.platform_settings:admin',
    ],
  },
  {
    legacyCode: 'log.security',
    module: 'log',
    nameEn: 'Security Log',
    sortOrder: 300,
    legacyActions: ['read', 'write', 'delete', 'admin'],
    expectedCanonicalPermissions: ['log.search:read', 'log.tech_log:read'],
  },
];

const ALL_LEGACY_RESOURCE_CODES = [...new Set(
  [...CONTENT_LOG_TARGETS, ...CONFIG_SECURITY_TARGETS].map((target) => target.legacyCode),
)];

const ALL_LEGACY_RESOURCE_PATTERN = new RegExp(
  `^(${ALL_LEGACY_RESOURCE_CODES.map((resourceCode) => resourceCode.replace('.', '\\.')).join('|')})$`,
);

function buildExpectedCanonicalGrants(
  targets: readonly LegacyPruneTargetFixture[],
): Record<string, 'grant'> {
  return Object.fromEntries(
    targets.flatMap((target) =>
      target.expectedCanonicalPermissions.map((permissionKey) => [permissionKey, 'grant']),
    ),
  ) as Record<string, 'grant'>;
}

describe('Permission Post-Prune Integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let tenantFixture: TenantFixture;
  let testUser: TestUser;
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

  const withAuth = (req: request.Test) =>
    req
      .set('Authorization', `Bearer ${issueToken(testUser)}`)
      .set('X-Tenant-ID', tenantFixture.tenant.id);

  const pickPermissions = (
    permissions: Record<string, string>,
    permissionKeys: readonly string[],
  ): Record<string, string> =>
    Object.fromEntries(
      permissionKeys.map((permissionKey) => [permissionKey, permissions[permissionKey] ?? 'missing']),
    );

  const listLegacyPermissionKeys = (
    permissions: Record<string, string>,
    targets: readonly LegacyPruneTargetFixture[],
  ): string[] =>
    Object.keys(permissions).filter((permissionKey) =>
      targets.some((target) => permissionKey.startsWith(`${target.legacyCode}:`)),
    );

  async function seedLegacyResourceGrant(
    schemaName: string,
    roleCode: string,
    target: LegacyPruneTargetFixture,
  ): Promise<void> {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${schemaName}".resource (
          id, code, module, name_en, name_zh, name_ja, sort_order, is_active, created_at, updated_at
        )
        VALUES (gen_random_uuid(), $1, $2, $3, NULL, NULL, $4, true, NOW(), NOW())
        ON CONFLICT (code) DO UPDATE
        SET module = EXCLUDED.module,
            name_en = EXCLUDED.name_en,
            is_active = true,
            sort_order = EXCLUDED.sort_order,
            updated_at = NOW()
      `,
      target.legacyCode,
      target.module,
      target.nameEn,
      target.sortOrder,
    );

    const roleRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        SELECT id
        FROM "${schemaName}".role
        WHERE code = $1
        LIMIT 1
      `,
      roleCode,
    );

    const roleId = roleRows[0]?.id;

    if (!roleId) {
      throw new Error(`Role ${roleCode} not found in ${schemaName}`);
    }

    const resourceRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        SELECT id
        FROM "${schemaName}".resource
        WHERE code = $1
        LIMIT 1
      `,
      target.legacyCode,
    );

    const resourceId = resourceRows[0]?.id;

    if (!resourceId) {
      throw new Error(`Resource ${target.legacyCode} not found in ${schemaName}`);
    }

    for (const action of target.legacyActions) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO "${schemaName}".policy (
            id, resource_id, action, is_active, created_at, updated_at
          )
          VALUES (gen_random_uuid(), CAST($1 AS uuid), $2, true, NOW(), NOW())
          ON CONFLICT (resource_id, action) DO UPDATE
          SET is_active = true,
              updated_at = NOW()
        `,
        resourceId,
        action,
      );

      const policyRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `
          SELECT id
          FROM "${schemaName}".policy
          WHERE resource_id = CAST($1 AS uuid)
            AND action = $2
          LIMIT 1
        `,
        resourceId,
        action,
      );

      const policyId = policyRows[0]?.id;

      if (!policyId) {
        throw new Error(`Policy ${target.legacyCode}:${action} not found in ${schemaName}`);
      }

      await prisma.$executeRawUnsafe(
        `
          INSERT INTO "${schemaName}".role_policy (
            id, role_id, policy_id, effect, created_at
          )
          VALUES (gen_random_uuid(), CAST($1 AS uuid), CAST($2 AS uuid), 'grant', NOW())
          ON CONFLICT (role_id, policy_id) DO UPDATE
          SET effect = 'grant'
        `,
        roleId,
        policyId,
      );
    }
  }

  async function removePermissionSnapshots(schemaName: string): Promise<void> {
    const keys = await redisService.keys(`perm:${schemaName}:*`);

    for (const key of keys) {
      await redisService.del(key);
    }
  }

  async function runPostPruneSmoke(
    targets: readonly LegacyPruneTargetFixture[],
  ): Promise<void> {
    const selectedLegacyCodes = targets.map((target) => target.legacyCode);
    const expectedCanonicalGrants = buildExpectedCanonicalGrants(targets);
    const expectedCanonicalKeys = Object.keys(expectedCanonicalGrants);

    for (const target of targets) {
      await seedLegacyResourceGrant(tenantFixture.schemaName, 'ADMIN', target);
    }

    await removePermissionSnapshots(tenantFixture.schemaName);
    await permissionSnapshotService.refreshUserSnapshots(tenantFixture.schemaName, testUser.id);

    const beforeResponse = await withAuth(
      request(app.getHttpServer()).get('/api/v1/users/me/permissions'),
    ).expect(200);
    const beforePermissions = beforeResponse.body.data.permissions as Record<string, string>;

    expect(pickPermissions(beforePermissions, expectedCanonicalKeys)).toEqual(expectedCanonicalGrants);
    expect(listLegacyPermissionKeys(beforePermissions, targets)).toEqual([]);

    let auditSummary = await auditLegacyRbac(prisma, {
      schemas: [tenantFixture.schemaName],
      legacyCodes: selectedLegacyCodes,
      skipTemplate: false,
      includeHistoricalRoles: false,
      includeCompatResources: false,
      excludeRoles: [],
      json: false,
    });

    for (const target of targets) {
      const runtimeProof = await verifyLegacyPruneRuntime(prisma, {
        schemas: [tenantFixture.schemaName],
        legacyCodes: [target.legacyCode],
        excludeRoles: [],
        allowUsers: [testUser.username],
        json: false,
      });

      expect(runtimeProof.target.verified).toBe(true);

      auditSummary = promoteRuntimeVerifiedTargetInAudit(
        auditSummary,
        tenantFixture.schemaName,
        target.legacyCode,
        runtimeProof.target.affectedUsers.map((user) => user.username),
      );
    }

    const prunePlan = buildPrunePlan(auditSummary, {
      schemas: [tenantFixture.schemaName],
      skipTemplate: false,
      legacyCodes: selectedLegacyCodes,
      excludeRoles: [],
      allowUsers: [testUser.username],
      runtimeProof: true,
      apply: true,
      json: false,
    });

    expect(prunePlan.skipped).toEqual([]);
    expect(prunePlan.plans).toHaveLength(1);
    expect(prunePlan.plans[0]?.blocked).toEqual([]);
    expect(prunePlan.plans[0]?.candidates).toHaveLength(targets.length);

    const applySummary = await executePrunePlan(prisma, prunePlan);
    expect(applySummary.applied).toHaveLength(1);
    expect(applySummary.applied[0]?.targets).toHaveLength(targets.length);

    await removePermissionSnapshots(tenantFixture.schemaName);
    await permissionSnapshotService.refreshUserSnapshots(tenantFixture.schemaName, testUser.id);

    const afterResponse = await withAuth(
      request(app.getHttpServer()).get('/api/v1/users/me/permissions'),
    ).expect(200);
    const afterPermissions = afterResponse.body.data.permissions as Record<string, string>;

    expect(pickPermissions(afterPermissions, expectedCanonicalKeys)).toEqual(expectedCanonicalGrants);
    expect(pickPermissions(afterPermissions, expectedCanonicalKeys)).toEqual(
      pickPermissions(beforePermissions, expectedCanonicalKeys),
    );
    expect(listLegacyPermissionKeys(afterPermissions, targets)).toEqual([]);
    expect(afterResponse.body.data.roles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'ADMIN',
          source: 'direct',
          scopeType: 'tenant',
          scopeId: null,
        }),
      ]),
    );

    const postApplyAudit = await auditLegacyRbac(prisma, {
      schemas: [tenantFixture.schemaName],
      legacyCodes: selectedLegacyCodes,
      skipTemplate: false,
      includeHistoricalRoles: false,
      includeCompatResources: false,
      excludeRoles: [],
      json: false,
    });

    expect(postApplyAudit.skipped).toEqual([]);
    expect(postApplyAudit.audited).toHaveLength(1);

    for (const target of postApplyAudit.audited[0]?.targets ?? []) {
      expect(target.legacyCode).toMatch(ALL_LEGACY_RESOURCE_PATTERN);
      expect(target.readiness).toBe('absent');
      expect(target.legacy.present).toBe(false);
    }
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
    tenantFixture = await createTestTenantFixture(prisma, 'permprune');
    testUser = await createTestUserInTenant(
      prisma,
      tenantFixture,
      `perm_prune_admin_${Date.now()}`,
      ['ADMIN'],
    );
  });

  afterAll(async () => {
    if (tenantFixture) {
      await removePermissionSnapshots(tenantFixture.schemaName);
    }

    await tenantFixture?.cleanup();
    await prisma?.$disconnect();
    await app?.close();
  });

  it('keeps canonical grants on /users/me/permissions after pruning legacy homepage/marshmallow/log resources', async () => {
    await runPostPruneSmoke(CONTENT_LOG_TARGETS);
  });

  it('keeps canonical grants on /users/me/permissions after pruning split/retired config-security legacy resources', async () => {
    await runPostPruneSmoke(CONFIG_SECURITY_TARGETS);
  });
});
