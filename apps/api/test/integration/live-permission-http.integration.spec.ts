// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Opt-in live HTTP smoke for post-prune permission verification on an existing tenant.

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaClient } from '@tcrn/database';

import { AppModule } from '../../src/app.module';
import { TokenService } from '../../src/modules/auth/token.service';
import { PermissionSnapshotService } from '../../src/modules/permission/permission-snapshot.service';
import { bootstrapTestApp } from '../../src/testing/bootstrap-test-app';

interface LiveTenantUser {
  id: string;
  email: string;
  username: string;
}

const LIVE_SCHEMA = process.env.LIVE_PERMISSION_SMOKE_SCHEMA;
const LIVE_USER = process.env.LIVE_PERMISSION_SMOKE_USER;

const LEGACY_PREFIXES = ['homepage:', 'marshmallow:', 'log.change:', 'log.integration:'] as const;
const EXPECTED_CANONICAL_GRANTS = {
  'talent.homepage:read': 'grant',
  'talent.marshmallow:read': 'grant',
  'talent.marshmallow:execute': 'grant',
  'log.change_log:read': 'grant',
  'log.integration_log:read': 'grant',
} as const satisfies Record<string, 'grant'>;

const describeLive = LIVE_SCHEMA && LIVE_USER ? describe : describe.skip;

describeLive('Live Permission HTTP Smoke', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let tenantId: string;
  let liveUser: LiveTenantUser;
  let tokenService: TokenService;
  let permissionSnapshotService: PermissionSnapshotService;

  const issueToken = (): string => {
    if (!LIVE_SCHEMA) {
      throw new Error('LIVE_PERMISSION_SMOKE_SCHEMA is required');
    }

    return tokenService.generateAccessToken({
      sub: liveUser.id,
      tid: tenantId,
      tsc: LIVE_SCHEMA,
      email: liveUser.email,
      username: liveUser.username,
    }).token;
  };

  const withAuth = (req: request.Test) =>
    req
      .set('Authorization', `Bearer ${issueToken()}`)
      .set('X-Tenant-ID', tenantId);

  const pickPermissions = (
    permissions: Record<string, string>,
    permissionKeys: readonly string[],
  ): Record<string, string> =>
    Object.fromEntries(
      permissionKeys.map((permissionKey) => [permissionKey, permissions[permissionKey] ?? 'missing']),
    );

  beforeAll(async () => {
    if (!LIVE_SCHEMA || !LIVE_USER) {
      return;
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await bootstrapTestApp(app);

    tokenService = moduleFixture.get(TokenService);
    permissionSnapshotService = moduleFixture.get(PermissionSnapshotService);
    prisma = new PrismaClient();

    const tenant = await prisma.tenant.findUnique({
      where: { schemaName: LIVE_SCHEMA },
      select: { id: true, code: true, schemaName: true, isActive: true },
    });

    if (!tenant?.isActive) {
      throw new Error(`Active tenant not found for schema ${LIVE_SCHEMA}`);
    }

    tenantId = tenant.id;

    const users = await prisma.$queryRawUnsafe<LiveTenantUser[]>(
      `
        SELECT id, email, username
        FROM "${LIVE_SCHEMA}".system_user
        WHERE username = $1
          AND is_active = true
        LIMIT 1
      `,
      LIVE_USER,
    );

    const selectedUser = users[0];

    if (!selectedUser) {
      throw new Error(`Active user ${LIVE_USER} not found in ${LIVE_SCHEMA}`);
    }

    liveUser = selectedUser;

    await permissionSnapshotService.refreshUserSnapshots(LIVE_SCHEMA, liveUser.id);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await app?.close();
  });

  it('returns canonical content/log grants with legacy keys removed', async () => {
    const response = await withAuth(
      request(app.getHttpServer()).get('/api/v1/users/me/permissions'),
    ).expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.scope).toEqual({
      type: 'tenant',
      id: null,
      name: null,
    });

    const permissions = response.body.data.permissions as Record<string, string>;
    const legacyKeys = Object.keys(permissions).filter((permissionKey) =>
      LEGACY_PREFIXES.some((prefix) => permissionKey.startsWith(prefix)),
    );

    expect(legacyKeys).toEqual([]);
    expect(pickPermissions(permissions, Object.keys(EXPECTED_CANONICAL_GRANTS))).toEqual(
      EXPECTED_CANONICAL_GRANTS,
    );
    expect(response.body.data.roles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scopeType: 'tenant',
          scopeId: null,
        }),
      ]),
    );
  });
});
