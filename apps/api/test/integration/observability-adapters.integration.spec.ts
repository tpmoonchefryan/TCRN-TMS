// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { PrismaClient } from '@tcrn/database';
import {
  OBSERVABILITY_ADAPTER_CODES,
  createTestTenantFixture,
  createTestUserInTenant,
  type TenantFixture,
  type TestUser,
} from '@tcrn/shared';

import { AppModule } from '../../src/app.module';
import { TokenService } from '../../src/modules/auth/token.service';
import { LokiQueryGateway } from '../../src/modules/log/infrastructure/loki-query.gateway';
import { bootstrapTestApp } from '../../src/testing/bootstrap-test-app';

const evidenceDir =
  process.env.P5_EVIDENCE_DIR ||
  '/Users/ryanlan/Code/TCRN Platform/vault/initiatives/projects/TCRN-TMS/active/public-presence-studio/evidence/2026-05-28-goals-phase-0-12-execution/phase-5-observability-adapter-foundation';
const acSchema = 'tenant_ac';
const requestIdPrefix = 'p5-http-observability';
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

interface SsoReadinessSnapshot {
  tool_code: string;
  status: string;
  required_by_phase: string | null;
  provider_id: string | null;
  fail_closed: boolean;
  evidence: Record<string, unknown>;
  updated_by: string | null;
}

interface AuditRow {
  action: string;
  toolCode: string;
  afterState: Record<string, unknown> | null;
  requestId: string | null;
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
    state: response.body.data?.state ?? null,
  };
}

describe('Observability adapter HTTP/RBAC integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let tokenService: TokenService;
  let lokiQueryGateway: LokiQueryGateway;
  let acTenant: AcTenant;
  let acAdmin: AcUser;
  let acNoRole: AcUser;
  let acDisabledAdmin: AcUser;
  let ordinaryTenantFixture: TenantFixture;
  let ordinaryPlatformAdmin: TestUser;
  let previousSsoRows: SsoReadinessSnapshot[];
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
    const email = `${username}@p5-http.test`;

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
          AND namespace = 'p5-http'
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

  const restoreSsoReadiness = async () => {
    await prisma.$executeRawUnsafe(
      `DELETE FROM public.platform_external_tool_sso_readiness WHERE tool_code = 'grafana'`
    );

    for (const row of previousSsoRows) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO public.platform_external_tool_sso_readiness
            (tool_code, status, required_by_phase, provider_id, fail_closed, evidence, updated_by)
          VALUES ($1, $2, $3, $4::uuid, $5, $6::jsonb, $7::uuid)
          ON CONFLICT (tool_code)
          DO UPDATE SET
            status = EXCLUDED.status,
            required_by_phase = EXCLUDED.required_by_phase,
            provider_id = EXCLUDED.provider_id,
            fail_closed = EXCLUDED.fail_closed,
            evidence = EXCLUDED.evidence,
            updated_by = EXCLUDED.updated_by,
            updated_at = now()
        `,
        row.tool_code,
        row.status,
        row.required_by_phase,
        row.provider_id,
        row.fail_closed,
        JSON.stringify(row.evidence ?? {}),
        row.updated_by
      );
    }
  };

  const writeGrafanaConnection = async (input: {
    endpointUrl: string | null;
    enabled: boolean;
    healthStatus: string;
  }) => {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO public.platform_tool_connection
          (
            tenant_id,
            tool_code,
            environment,
            deployment_mode,
            local_dev_mode,
            endpoint_url,
            namespace,
            service_name,
            enabled,
            readiness_state,
            sso_readiness_state,
            health_status,
            created_by,
            updated_by
          )
        VALUES
          (
            $1::uuid,
            'grafana',
            'shared_dev',
            'external_provided',
            'external_provided',
            $2,
            'p5-http',
            'p5-http-grafana',
            $3,
            CASE WHEN $3 THEN 'ready' ELSE 'disabled' END,
            'ready',
            $4,
            $5::uuid,
            $5::uuid
          )
        ON CONFLICT (tenant_id, tool_code, environment)
        DO UPDATE SET
          endpoint_url = EXCLUDED.endpoint_url,
          enabled = EXCLUDED.enabled,
          readiness_state = EXCLUDED.readiness_state,
          sso_readiness_state = EXCLUDED.sso_readiness_state,
          health_status = EXCLUDED.health_status,
          namespace = EXCLUDED.namespace,
          service_name = EXCLUDED.service_name,
          updated_by = EXCLUDED.updated_by,
          updated_at = now(),
          version = platform_tool_connection.version + 1
      `,
      acTenant.id,
      input.endpointUrl,
      input.enabled,
      input.healthStatus,
      acAdmin.id
    );
  };

  const writeGrafanaSso = async (status: 'blocked' | 'ready') => {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO public.platform_external_tool_sso_readiness
          (tool_code, status, required_by_phase, fail_closed, evidence, updated_by)
        VALUES
          ('grafana', $1, 'phase_5', true, '{"source":"p5_http_matrix"}'::jsonb, $2::uuid)
        ON CONFLICT (tool_code)
        DO UPDATE SET
          status = EXCLUDED.status,
          required_by_phase = EXCLUDED.required_by_phase,
          fail_closed = EXCLUDED.fail_closed,
          evidence = EXCLUDED.evidence,
          updated_by = EXCLUDED.updated_by,
          updated_at = now()
      `,
      status,
      acAdmin.id
    );
  };

  const readAuditRows = async () =>
    prisma.$queryRawUnsafe<AuditRow[]>(
      `
        SELECT
          action,
          tool_code as "toolCode",
          after_state as "afterState",
          request_id as "requestId"
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
    lokiQueryGateway = moduleFixture.get(LokiQueryGateway);
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
      throw new Error('Active AC tenant is required for observability adapter integration evidence');
    }

    acTenant = tenants[0];
    previousSsoRows = await prisma.$queryRawUnsafe<SsoReadinessSnapshot[]>(
      `
        SELECT tool_code, status, required_by_phase, provider_id, fail_closed, evidence, updated_by
        FROM public.platform_external_tool_sso_readiness
        WHERE tool_code = 'grafana'
      `
    );
    await cleanupPlatformArtifacts();

    acAdmin = await createAcUser('p5_ac_platform_admin', ['PLATFORM_ADMIN']);
    acNoRole = await createAcUser('p5_ac_no_role', []);
    acDisabledAdmin = await createAcUser('p5_ac_disabled_admin', ['PLATFORM_ADMIN'], false);
    ordinaryTenantFixture = await createTestTenantFixture(prisma, 'p5_http_observability_ordinary');
    ordinaryPlatformAdmin = await createTestUserInTenant(
      prisma,
      ordinaryTenantFixture,
      `p5_ordinary_platform_admin_${Date.now()}`,
      ['PLATFORM_ADMIN']
    );
  });

  afterAll(async () => {
    await cleanupPlatformArtifacts();
    await restoreSsoReadiness();
    await cleanupAcUsers();
    await ordinaryTenantFixture?.cleanup();
    await prisma?.$disconnect();
    await app?.close();
  });

  it('proves AC-only observability adapter API, deep-link states, and safe audit readback', async () => {
    const server = request(app.getHttpServer());
    const definitions = await withAuth(
      server.get('/api/v1/observability/adapters/definitions'),
      acAdmin
    ).expect(200);
    const policy = await withAuth(
      server.get('/api/v1/observability/adapters/policy'),
      acAdmin
    ).expect(200);
    const summary = await withAuth(
      server.get('/api/v1/observability/adapters/summary').query({ environment: 'shared_dev' }),
      acAdmin,
      acTenant.id,
      `${requestIdPrefix}-summary-readback`
    ).expect(200);
    const missingPermission = await withAuth(
      server.get('/api/v1/observability/adapters/definitions'),
      acNoRole,
      acTenant.id,
      `${requestIdPrefix}-missing-permission`
    ).expect(403);
    const disabledActor = await withAuth(
      server.get('/api/v1/observability/adapters/summary').query({ environment: 'shared_dev' }),
      acDisabledAdmin,
      acTenant.id,
      `${requestIdPrefix}-disabled-actor`
    ).expect(403);
    const ordinaryDenied = await withAuth(
      server.get('/api/v1/observability/adapters/definitions'),
      ordinaryPlatformAdmin,
      ordinaryTenantFixture.tenant.id,
      `${requestIdPrefix}-ordinary-denied`
    ).expect(403);
    const rawLogqlDenied = await withAuth(
      server.get('/api/v1/logs/search').query({
        query: '{tenant_id="other"} |= "secret"',
        limit: 500,
      }),
      ordinaryPlatformAdmin,
      ordinaryTenantFixture.tenant.id,
      `${requestIdPrefix}-raw-logql-denied`
    ).expect(403);
    const crossTenantSelectorDenied = await withAuth(
      server.get('/api/v1/logs/search').query({
        query: `{tenant_schema="${acTenant.schemaName}"} |= "tenant-canary"`,
        limit: 100,
      }),
      ordinaryPlatformAdmin,
      ordinaryTenantFixture.tenant.id,
      `${requestIdPrefix}-cross-tenant-selector-denied`
    ).expect(403);
    const lokiQueryCalls: Array<Parameters<LokiQueryGateway['queryRange']>[0]> = [];
    const isEnabledSpy = vi.spyOn(lokiQueryGateway, 'isEnabled').mockReturnValue(true);
    const queryRangeSpy = vi
      .spyOn(lokiQueryGateway, 'queryRange')
      .mockImplementation(async (params) => {
        lokiQueryCalls.push(params);

        return {
          status: 'success',
          data: {
            resultType: 'streams',
            result: [
              {
                stream: {
                  app: 'tcrn-tms',
                  tenant_schema: ordinaryTenantFixture.tenant.schemaName,
                  stream: 'technical_event_log',
                },
                values: [
                  [
                    '1713085200000000000',
                    JSON.stringify({
                      message: 'tenant-canary visible only inside requesting tenant',
                      tenantSchema: ordinaryTenantFixture.tenant.schemaName,
                    }),
                  ],
                ],
              },
            ],
            stats: { inspectedStreams: 1 },
          },
        };
      });
    const ordinarySafeKeywordSearch = await withAuth(
      server.get('/api/v1/logs/search').query({
        keyword: 'tenant-canary',
        stream: 'technical_event_log',
        timeRange: '7d',
        limit: 500,
      }),
      ordinaryPlatformAdmin,
      ordinaryTenantFixture.tenant.id,
      `${requestIdPrefix}-ordinary-safe-keyword`
    ).expect(200);
    isEnabledSpy.mockRestore();
    queryRangeSpy.mockRestore();

    expect(definitions.body.success).toBe(true);
    expect(definitions.body.data.map((definition: { code: string }) => definition.code)).toEqual(
      OBSERVABILITY_ADAPTER_CODES
    );
    expect(summary.body.success).toBe(true);
    expect(summary.body.data.map((item: { definition: { code: string } }) => item.definition.code)).toEqual(
      OBSERVABILITY_ADAPTER_CODES
    );
    expect(
      summary.body.data.every(
        (item: { definition: { defaultEnabled: boolean }; policy: { rawQueryAllowedForOrdinaryTenants: boolean } }) =>
          item.definition.defaultEnabled === false &&
          item.policy.rawQueryAllowedForOrdinaryTenants === false
      )
    ).toBe(true);
    expect(policy.body.data.rawQueryAllowedForOrdinaryTenants).toBe(false);
    expect(statusSummary(missingPermission).status).toBe(403);
    expect(statusSummary(disabledActor).status).toBe(403);
    expect(statusSummary(ordinaryDenied).message).toContain('AC operators only');
    expect(statusSummary(crossTenantSelectorDenied).status).toBe(403);
    expect(lokiQueryCalls).toHaveLength(1);
    expect(lokiQueryCalls[0].query).toBe(
      `{app="tcrn-tms", tenant_schema="${ordinaryTenantFixture.tenant.schemaName}", stream="technical_event_log"} |= "tenant-canary"`
    );
    expect(lokiQueryCalls[0].query).not.toContain(acTenant.schemaName);
    expect(lokiQueryCalls[0].limit).toBe(100);

    const notConfigured = await withAuth(
      server
        .get('/api/v1/observability/adapters/grafana_console/deep-link')
        .query({ environment: 'shared_dev' }),
      acAdmin,
      acTenant.id,
      `${requestIdPrefix}-not-configured`
    ).expect(200);

    await writeGrafanaConnection({
      endpointUrl: 'https://93.184.216.34/tcrn-p5-grafana',
      enabled: true,
      healthStatus: 'healthy',
    });
    await writeGrafanaSso('blocked');

    const ssoRequired = await withAuth(
      server
        .get('/api/v1/observability/adapters/grafana_console/deep-link')
        .query({ environment: 'shared_dev' }),
      acAdmin,
      acTenant.id,
      `${requestIdPrefix}-sso-required`
    ).expect(200);

    await writeGrafanaSso('ready');
    await writeGrafanaConnection({
      endpointUrl: 'https://93.184.216.34/tcrn-p5-grafana',
      enabled: true,
      healthStatus: 'unhealthy',
    });

    const unhealthy = await withAuth(
      server
        .get('/api/v1/observability/adapters/grafana_console/deep-link')
        .query({ environment: 'shared_dev' }),
      acAdmin,
      acTenant.id,
      `${requestIdPrefix}-unhealthy`
    ).expect(200);

    await writeGrafanaConnection({
      endpointUrl: 'http://127.0.0.1:3000',
      enabled: true,
      healthStatus: 'healthy',
    });

    const unsafe = await withAuth(
      server
        .get('/api/v1/observability/adapters/grafana_console/deep-link')
        .query({ environment: 'shared_dev' }),
      acAdmin,
      acTenant.id,
      `${requestIdPrefix}-unsafe`
    ).expect(200);

    await writeGrafanaConnection({
      endpointUrl: 'https://93.184.216.34/tcrn-p5-grafana',
      enabled: true,
      healthStatus: 'healthy',
    });

    const accepted = await withAuth(
      server
        .get('/api/v1/observability/adapters/grafana_console/deep-link')
        .query({ environment: 'shared_dev' }),
      acAdmin,
      acTenant.id,
      `${requestIdPrefix}-accepted`
    ).expect(200);
    const noExecutePermission = await withAuth(
      server
        .get('/api/v1/observability/adapters/grafana_console/deep-link')
        .query({ environment: 'shared_dev' }),
      acNoRole,
      acTenant.id,
      `${requestIdPrefix}-no-execute`
    ).expect(403);
    const audits = await readAuditRows();
    const auditText = JSON.stringify(audits);

    const payload = {
      checkedAt: new Date().toISOString(),
      target_scope: 'observability_adapter_http_matrix',
      definitions: {
        status: definitions.status,
        adapterCodes: definitions.body.data.map((definition: { code: string }) => definition.code),
      },
      summary: {
        status: summary.status,
        adapterCodes: summary.body.data.map(
          (item: { definition: { code: string } }) => item.definition.code
        ),
        defaultEnabledValues: summary.body.data.map(
          (item: { definition: { defaultEnabled: boolean } }) => item.definition.defaultEnabled
        ),
        readinessStates: summary.body.data.map(
          (item: { profile: { readinessState: string } }) => item.profile.readinessState
        ),
        rawQueryAllowedForOrdinaryTenants: summary.body.data.map(
          (item: { policy: { rawQueryAllowedForOrdinaryTenants: boolean } }) =>
            item.policy.rawQueryAllowedForOrdinaryTenants
        ),
      },
      policy: {
        status: policy.status,
        rawQueryAllowedForOrdinaryTenants:
          policy.body.data.rawQueryAllowedForOrdinaryTenants,
      },
      denials: {
        missingPermission: statusSummary(missingPermission),
        disabledActor: statusSummary(disabledActor),
        ordinaryDenied: statusSummary(ordinaryDenied),
        noExecutePermission: statusSummary(noExecutePermission),
        rawLogqlDenied: statusSummary(rawLogqlDenied),
        crossTenantSelectorDenied: statusSummary(crossTenantSelectorDenied),
      },
      tenantScopedLogSearch: {
        status: ordinarySafeKeywordSearch.status,
        entryCount:
          ordinarySafeKeywordSearch.body.data?.entries?.length ??
          ordinarySafeKeywordSearch.body.entries?.length ??
          0,
        queryRange: lokiQueryCalls[0],
        tenantSchema: ordinaryTenantFixture.tenant.schemaName,
        crossTenantSchema: acTenant.schemaName,
        queryIncludesTenantSchema: lokiQueryCalls[0]?.query.includes(
          `tenant_schema="${ordinaryTenantFixture.tenant.schemaName}"`
        ),
        queryExcludesCrossTenantSchema: !lokiQueryCalls[0]?.query.includes(acTenant.schemaName),
        rangeCappedTo24h: (() => {
          const start = new Date(lokiQueryCalls[0]?.start ?? 0).getTime();
          const end = new Date(lokiQueryCalls[0]?.end ?? 0).getTime();
          return Number.isFinite(start) && Number.isFinite(end) && end - start <= 24 * 60 * 60 * 1000;
        })(),
        resultLimitCapped: lokiQueryCalls[0]?.limit === 100,
      },
      deepLinks: {
        notConfigured: statusSummary(notConfigured),
        ssoRequired: statusSummary(ssoRequired),
        unhealthy: statusSummary(unhealthy),
        unsafe: statusSummary(unsafe),
        accepted: {
          ...statusSummary(accepted),
          opensInNewTab: accepted.body.data.opensInNewTab,
          urlReturned: Boolean(accepted.body.data.url),
        },
      },
      audit: {
        actions: audits.map((row) => row.action),
        states: audits.map((row) => row.afterState?.state),
        rawUrlLogged: auditText.includes('tcrn-p5-grafana') || auditText.includes('127.0.0.1'),
        rawAuthorizationLogged: /Bearer /i.test(auditText),
      },
      passed:
        definitions.status === 200 &&
        summary.status === 200 &&
        summary.body.data.length === OBSERVABILITY_ADAPTER_CODES.length &&
        summary.body.data.every(
          (item: { definition: { defaultEnabled: boolean }; policy: { rawQueryAllowedForOrdinaryTenants: boolean } }) =>
            item.definition.defaultEnabled === false &&
            item.policy.rawQueryAllowedForOrdinaryTenants === false
        ) &&
        policy.body.data.rawQueryAllowedForOrdinaryTenants === false &&
        missingPermission.status === 403 &&
        disabledActor.status === 403 &&
        ordinaryDenied.status === 403 &&
        noExecutePermission.status === 403 &&
        rawLogqlDenied.status === 403 &&
        crossTenantSelectorDenied.status === 403 &&
        ordinarySafeKeywordSearch.status === 200 &&
        ((ordinarySafeKeywordSearch.body.data?.entries?.length ??
          ordinarySafeKeywordSearch.body.entries?.length ??
          0) >= 1) &&
        lokiQueryCalls[0]?.query.includes(
          `tenant_schema="${ordinaryTenantFixture.tenant.schemaName}"`
        ) &&
        !lokiQueryCalls[0]?.query.includes(acTenant.schemaName) &&
        lokiQueryCalls[0]?.limit === 100 &&
        String(rawLogqlDenied.body.error?.message ?? '').includes('Raw LogQL') &&
        notConfigured.body.data.state === 'not_configured' &&
        ssoRequired.body.data.state === 'sso_required' &&
        unhealthy.body.data.state === 'unhealthy' &&
        unsafe.body.data.state === 'unsafe_url' &&
        accepted.body.data.state === 'accepted' &&
        accepted.body.data.opensInNewTab === true &&
        audits.filter((row) => row.action.startsWith('observability.deep_link.')).length >= 5 &&
        !auditText.includes('tcrn-p5-grafana') &&
        !auditText.includes('127.0.0.1') &&
        !/Bearer /i.test(auditText),
    };

    writeEvidence('observability-http-api-matrix.json', payload);

    expect(payload.passed).toBe(true);
  });
});
