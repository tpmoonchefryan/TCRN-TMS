// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaClient } from '@tcrn/database';
import {
  createTestTenantFixture,
  createTestUserInTenant,
  type TenantFixture,
  type TestUser,
} from '@tcrn/shared';

import { AppModule } from '../../src/app.module';
import { TokenService } from '../../src/modules/auth/token.service';
import { bootstrapTestApp } from '../../src/testing/bootstrap-test-app';

const evidenceDir =
  process.env.P4_EVIDENCE_DIR ||
  '/Users/ryanlan/Code/TCRN Platform/vault/initiatives/projects/TCRN-TMS/active/public-presence-studio/evidence/2026-05-27-goals-phase-0-12-execution/phase-4-external-tool-connection-framework';
const acSchema = 'tenant_ac';
const acToolCodes = ['grafana', 'opa', 'flagsmith', 'nats-jetstream'] as const;
const requestIdPrefix = 'p4-http-platform-tools';
const passwordHash =
  '$argon2id$v=19$m=65536,t=3,p=4$gyJDmMv4EDc/W8LEkp3Zbw$xWYYRsj+Jfn1xELTKSlXg8AAM+zvG+nAX3rHoOdABTM';

interface AcTenant {
  id: string;
  code: string;
  schemaName: string;
}

interface AcUser {
  id: string;
  username: string;
  email: string;
  tenantId: string;
  schemaName: string;
  roles: string[];
}

interface AuditRow {
  action: string;
  toolCode: string;
  afterState: Record<string, unknown> | null;
  requestId: string | null;
  createdAt: Date;
}

function evidencePath(fileName: string) {
  mkdirSync(evidenceDir, { recursive: true });
  return path.join(evidenceDir, fileName);
}

function writeEvidence(fileName: string, payload: unknown) {
  writeFileSync(evidencePath(fileName), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function statusSummary(response: request.Response) {
  return {
    status: response.status,
    success: response.body.success,
    errorCode: response.body.error?.code ?? null,
    message: response.body.error?.message ?? null,
  };
}

describe('Platform Tool Connections HTTP/RBAC integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let tokenService: TokenService;
  let acTenant: AcTenant;
  let ordinaryTenantFixture: TenantFixture;
  let acAdmin: AcUser;
  let acNoRole: AcUser;
  let acDisabledAdmin: AcUser;
  let ordinaryPlatformAdmin: TestUser;
  const acUserIds = new Set<string>();

  const issueToken = (user: AcUser | TestUser): string =>
    tokenService.generateAccessToken({
      sub: user.id,
      tid: user.tenantId,
      tsc: user.schemaName,
      email: user.email,
      username: user.username,
    }).token;

  const withAuth = (
    req: request.Test,
    user: AcUser | TestUser,
    tenantId = user.tenantId,
    requestId = `${requestIdPrefix}-${randomUUID()}`
  ) =>
    req
      .set('Authorization', `Bearer ${issueToken(user)}`)
      .set('X-Tenant-ID', tenantId)
      .set('X-Request-ID', requestId);

  const createAcUser = async (
    usernamePrefix: string,
    roleCodes: string[],
    isActive = true
  ): Promise<AcUser> => {
    const id = randomUUID();
    const username = `${usernamePrefix}_${Date.now()}_${id.slice(0, 8)}`;
    const email = `${username}@p4-http.test`;

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "${acSchema}".system_user
          (id, username, email, password_hash, password_changed_at, is_active, created_at, updated_at)
        VALUES ($1::uuid, $2, $3, $4, now(), $5, now(), now())
      `,
      id,
      username,
      email,
      passwordHash,
      isActive
    );

    for (const roleCode of roleCodes) {
      const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `
          SELECT id
          FROM "${acSchema}".role
          WHERE code = $1
            AND is_active = true
          LIMIT 1
        `,
        roleCode
      );

      if (!rows[0]) {
        throw new Error(`AC role not found: ${roleCode}`);
      }

      await prisma.$executeRawUnsafe(
        `
          INSERT INTO "${acSchema}".user_role
            (id, user_id, role_id, scope_type, scope_id, inherit, granted_at, granted_by)
          VALUES (gen_random_uuid(), $1::uuid, $2::uuid, 'tenant', NULL, true, now(), NULL)
        `,
        id,
        rows[0].id
      );
    }

    acUserIds.add(id);

    return {
      id,
      username,
      email,
      tenantId: acTenant.id,
      schemaName: acTenant.schemaName,
      roles: roleCodes,
    };
  };

  const cleanupPlatformArtifacts = async () => {
    await prisma.$executeRawUnsafe(
      `
        DELETE FROM public.platform_tool_audit_event
        WHERE request_id LIKE $1
      `,
      `${requestIdPrefix}%`
    );
    await prisma.$executeRawUnsafe(
      `
        DELETE FROM public.platform_tool_connection
        WHERE tenant_id = $1::uuid
          AND environment = 'shared_dev'
          AND namespace = 'p4-http'
      `,
      acTenant.id
    );
  };

  const cleanupAcUsers = async () => {
    for (const userId of acUserIds) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "${acSchema}".user_role WHERE user_id = $1::uuid`,
        userId
      );
      await prisma.$executeRawUnsafe(
        `DELETE FROM "${acSchema}".system_user WHERE id = $1::uuid`,
        userId
      );
    }
  };

  const readAuditRows = async () =>
    prisma.$queryRawUnsafe<AuditRow[]>(
      `
        SELECT
          action,
          tool_code as "toolCode",
          after_state as "afterState",
          request_id as "requestId",
          created_at as "createdAt"
        FROM public.platform_tool_audit_event
        WHERE tenant_id = $1::uuid
          AND request_id LIKE $2
        ORDER BY created_at ASC
      `,
      acTenant.id,
      `${requestIdPrefix}%`
    );

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await bootstrapTestApp(app);

    tokenService = moduleFixture.get(TokenService);
    prisma = new PrismaClient();

    const tenants = await prisma.$queryRawUnsafe<AcTenant[]>(
      `
        SELECT id, code, schema_name as "schemaName"
        FROM public.tenant
        WHERE tier = 'ac'
          AND is_active = true
        ORDER BY created_at ASC
        LIMIT 1
      `
    );

    if (!tenants[0]) {
      throw new Error('Active AC tenant is required for platform tool integration evidence');
    }

    acTenant = tenants[0];
    await cleanupPlatformArtifacts();

    acAdmin = await createAcUser('p4_ac_platform_admin', ['PLATFORM_ADMIN']);
    acNoRole = await createAcUser('p4_ac_no_role', []);
    acDisabledAdmin = await createAcUser('p4_ac_disabled_admin', ['PLATFORM_ADMIN'], false);
    ordinaryTenantFixture = await createTestTenantFixture(prisma, 'p4_http_ordinary');
    ordinaryPlatformAdmin = await createTestUserInTenant(
      prisma,
      ordinaryTenantFixture,
      `p4_ordinary_platform_admin_${Date.now()}`,
      ['PLATFORM_ADMIN']
    );
  });

  afterAll(async () => {
    await cleanupPlatformArtifacts();
    await cleanupAcUsers();
    await ordinaryTenantFixture?.cleanup();
    await prisma?.$disconnect();
    await app?.close();
  });

  it('proves AC-only API surface, RBAC denials, safe readback, health, deep-link, and audit', async () => {
    const server = request(app.getHttpServer());
    const definitions = await withAuth(server.get('/api/v1/platform-tools/definitions'), acAdmin)
      .expect(200);
    const list = await withAuth(
      server.get('/api/v1/platform-tools/connections').query({ environment: 'shared_dev' }),
      acAdmin
    ).expect(200);
    const missingPermission = await withAuth(
      server.get('/api/v1/platform-tools/definitions'),
      acNoRole,
      acTenant.id,
      `${requestIdPrefix}-missing-permission`
    ).expect(403);
    const disabledActor = await withAuth(
      server.get('/api/v1/platform-tools/definitions'),
      acDisabledAdmin,
      acTenant.id,
      `${requestIdPrefix}-disabled-actor`
    ).expect(403);
    const ordinaryDenied = await withAuth(
      server.get('/api/v1/platform-tools/definitions'),
      ordinaryPlatformAdmin,
      ordinaryTenantFixture.tenant.id,
      `${requestIdPrefix}-ordinary-denied`
    ).expect(403);

    expect(definitions.body.success).toBe(true);
    expect(definitions.body.data).toHaveLength(11);
    expect(list.body.success).toBe(true);
    expect(list.body.data).toHaveLength(11);
    expect(ordinaryPlatformAdmin.roles).toContain('PLATFORM_ADMIN');
    expect(missingPermission.body.error.message).toContain('Permission denied');
    expect(disabledActor.body.error.message).toMatch(/disabled|not active/i);
    expect(ordinaryDenied.body.error.message).toContain('AC operators only');

    const grafanaPatch = await withAuth(
      server.patch('/api/v1/platform-tools/connections/grafana'),
      acAdmin,
      acTenant.id,
      `${requestIdPrefix}-grafana-upsert`
    )
      .send({
        environment: 'shared_dev',
        deploymentMode: 'stubbed',
        localDevMode: 'stubbed',
        endpointUrl: 'https://example.com/tcrn-p4-grafana',
        namespace: 'p4-http',
        serviceName: 'p4-http-grafana',
        enabled: true,
        configs: [
          {
            configKey: 'client_secret',
            mutation: 'reference',
            isSecret: true,
            secretRef: 'env:P4_HTTP_CLIENT_REF',
          },
        ],
      })
      .expect(200);

    const grafanaDetail = await withAuth(
      server.get('/api/v1/platform-tools/connections/grafana').query({ environment: 'shared_dev' }),
      acAdmin,
      acTenant.id,
      `${requestIdPrefix}-grafana-detail`
    ).expect(200);
    const grafanaHealth = await withAuth(
      server
        .post('/api/v1/platform-tools/connections/grafana/health-check')
        .query({ environment: 'shared_dev' }),
      acAdmin,
      acTenant.id,
      `${requestIdPrefix}-grafana-health`
    ).expect(201);
    const grafanaDeepLink = await withAuth(
      server
        .get('/api/v1/platform-tools/connections/grafana/deep-link')
        .query({ environment: 'shared_dev' }),
      acAdmin,
      acTenant.id,
      `${requestIdPrefix}-grafana-deeplink`
    ).expect(200);

    const opaPatch = await withAuth(
      server.patch('/api/v1/platform-tools/connections/opa'),
      acAdmin,
      acTenant.id,
      `${requestIdPrefix}-opa-upsert`
    )
      .send({
        environment: 'shared_dev',
        deploymentMode: 'stubbed',
        localDevMode: 'stubbed',
        endpointUrl: 'https://example.com/tcrn-p4-opa',
        namespace: 'p4-http',
        serviceName: 'p4-http-opa',
        enabled: true,
      })
      .expect(200);
    const opaHealth = await withAuth(
      server
        .post('/api/v1/platform-tools/connections/opa/health-check')
        .query({ environment: 'shared_dev' }),
      acAdmin,
      acTenant.id,
      `${requestIdPrefix}-opa-health`
    ).expect(201);
    const natsDeepLink = await withAuth(
      server
        .get('/api/v1/platform-tools/connections/nats-jetstream/deep-link')
        .query({ environment: 'shared_dev' }),
      acAdmin,
      acTenant.id,
      `${requestIdPrefix}-nats-deeplink`
    ).expect(200);
    const deploymentBoundary = await withAuth(
      server.get('/api/v1/platform-tools/deployment-boundary'),
      acAdmin,
      acTenant.id,
      `${requestIdPrefix}-deployment-boundary`
    ).expect(200);
    const unsafeRequests = [
      {
        caseId: 'literal-loopback',
        endpointUrl: 'http://127.0.0.1:3000/internal-admin',
        expectedReason: 'blocked_ipv4_range',
        rawNeedle: '127.0.0.1',
      },
      {
        caseId: 'data-url',
        endpointUrl: 'data:text/plain,never-log-this',
        expectedReason: 'unsupported_protocol',
        rawNeedle: 'data:text/plain',
      },
      {
        caseId: 'dns-private-resolution',
        endpointUrl: 'http://localtest.me/p4-internal-admin',
        expectedReason: 'blocked_ipv4_range',
        rawNeedle: 'localtest.me',
      },
    ];
    const unsafeResponses = [];

    for (const unsafeRequest of unsafeRequests) {
      const unsafeResponse = await withAuth(
        server.patch('/api/v1/platform-tools/connections/flagsmith'),
        acAdmin,
        acTenant.id,
        `${requestIdPrefix}-unsafe-flagsmith-${unsafeRequest.caseId}`
      )
        .send({
          environment: 'shared_dev',
          deploymentMode: 'stubbed',
          localDevMode: 'stubbed',
          endpointUrl: unsafeRequest.endpointUrl,
          namespace: 'p4-http',
          serviceName: 'p4-http-flagsmith',
          enabled: true,
        })
        .expect(400);

      expect(unsafeResponse.body.error.details.reason).toBe(unsafeRequest.expectedReason);
      unsafeResponses.push({
        caseId: unsafeRequest.caseId,
        expectedReason: unsafeRequest.expectedReason,
        response: unsafeResponse,
      });
    }

    const readbackText = JSON.stringify(grafanaDetail.body);
    expect(readbackText).not.toContain('env:P4_HTTP_CLIENT_REF');
    expect(grafanaPatch.body.data.configValues[0]).toMatchObject({
      configKey: 'client_secret',
      isSecret: true,
      secretRef: '[redacted]',
      value: '[redacted]',
      secretStatus: 'external_reference',
    });
    expect(grafanaHealth.body.data.snapshot.status).toBe('sso_required');
    expect(opaPatch.body.data.connection.readinessState).toBe('configured');
    expect(opaHealth.body.data.snapshot.status).toBe('healthy');
    expect(grafanaDeepLink.body.data.state).toBe('sso_required');
    expect(natsDeepLink.body.data.state).toBe('disabled');
    expect(deploymentBoundary.body.data.liveClusterRequired).toBe(false);
    expect(deploymentBoundary.body.data.tools).toHaveLength(11);

    const audits = await readAuditRows();
    const auditText = JSON.stringify(audits);
    const configAudit = audits.find((row) => row.action === 'config.reference');
    const ssrfAuditRows = audits.filter((row) => row.action === 'connection.validation_denied');
    const ssrfAuditRow = ssrfAuditRows[0];
    const healthAudits = audits.filter((row) => row.action === 'health.run');
    const deepLinkAudits = audits.filter((row) => row.action === 'deep_link.denied');

    expect(configAudit?.afterState).toMatchObject({
      configKey: 'client_secret',
      mutation: 'reference',
      isSecret: true,
      secretStatus: 'external_reference',
      rawValueLogged: false,
    });
    expect(ssrfAuditRows).toHaveLength(unsafeRequests.length);
    for (const unsafeRequest of unsafeRequests) {
      const auditRow = ssrfAuditRows.find((row) =>
        row.requestId?.endsWith(unsafeRequest.caseId)
      );
      expect(auditRow?.afterState).toMatchObject({
        endpointUrlPresent: true,
        reason: unsafeRequest.expectedReason,
        rawValueLogged: false,
      });
    }
    expect(healthAudits).toHaveLength(2);
    expect(deepLinkAudits.length).toBeGreaterThanOrEqual(2);
    expect(auditText).not.toContain('P4_HTTP_CLIENT_REF');
    for (const unsafeRequest of unsafeRequests) {
      expect(auditText).not.toContain(unsafeRequest.rawNeedle);
    }
    expect(auditText).not.toContain('Bearer ');

    const apiResults = {
      checkedAt: new Date().toISOString(),
      test_layer: 'http_integration',
      data_mode: 'disposable_fixture',
      target_scope: 'ac_platform_tool_connection',
      acTenant,
      definitions: {
        ...statusSummary(definitions),
        definitionCount: definitions.body.data.length,
      },
      connections: {
        ...statusSummary(list),
        connectionCount: list.body.data.length,
      },
      denials: {
        missingPermission: statusSummary(missingPermission),
        disabledActor: statusSummary(disabledActor),
        ordinaryTenantWithPlatformAdminRole: {
          ...statusSummary(ordinaryDenied),
          roles: ordinaryPlatformAdmin.roles,
        },
      },
      mutations: {
        grafana: statusSummary(grafanaPatch),
        opa: statusSummary(opaPatch),
        unsafeFlagsmith: Object.fromEntries(
          unsafeResponses.map((item) => [
            item.caseId,
            {
              ...statusSummary(item.response),
              expectedReason: item.expectedReason,
              actualReason: item.response.body.error.details.reason,
            },
          ])
        ),
      },
      readback: {
        grafanaSecretRefRedacted: !readbackText.includes('env:P4_HTTP_CLIENT_REF'),
        grafanaConfigValues: grafanaDetail.body.data.configValues,
        deploymentBoundary: {
          liveClusterRequired: deploymentBoundary.body.data.liveClusterRequired,
          toolCount: deploymentBoundary.body.data.tools.length,
        },
      },
      passed: true,
    };
    const healthResults = {
      checkedAt: new Date().toISOString(),
      test_layer: 'http_integration',
      data_mode: 'disposable_fixture',
      target_scope: 'platform_tool_health',
      results: {
        grafanaSsoRequired: grafanaHealth.body.data.snapshot,
        opaStubbedHealthy: opaHealth.body.data.snapshot,
      },
      deepLinks: {
        grafana: grafanaDeepLink.body.data,
        natsJetstream: natsDeepLink.body.data,
      },
      passed: true,
    };
    const healthAudit = {
      checkedAt: new Date().toISOString(),
      test_layer: 'db_readback',
      data_mode: 'disposable_fixture',
      target_scope: 'platform_tool_health_audit',
      healthAudits,
      deepLinkAudits,
      rawAuthorizationLogged: /Bearer /i.test(auditText),
      passed: healthAudits.length === 2 && !/Bearer /i.test(auditText),
    };
    const ssrfAuditEvidence = {
      checkedAt: new Date().toISOString(),
      test_layer: 'db_readback',
      data_mode: 'disposable_fixture',
      target_scope: 'platform_tool_ssrf_audit',
      validationDeniedAudit: ssrfAuditRow,
      validationDeniedAudits: ssrfAuditRows,
      rawUnsafeUrlLogged: unsafeRequests.some((requestItem) =>
        auditText.includes(requestItem.rawNeedle)
      ),
      rawSecretLogged: auditText.includes('P4_HTTP_CLIENT_REF'),
      passed:
        ssrfAuditRows.length === unsafeRequests.length &&
        !unsafeRequests.some((requestItem) => auditText.includes(requestItem.rawNeedle)) &&
        !auditText.includes('P4_HTTP_CLIENT_REF'),
    };

    writeEvidence('platform-tool-ac-only-api-results.json', apiResults);
    writeEvidence('platform-tool-health-results.json', healthResults);
    writeEvidence('platform-tool-health-audit.json', healthAudit);
    writeEvidence('platform-tool-ssrf-audit.json', ssrfAuditEvidence);
  });
});
