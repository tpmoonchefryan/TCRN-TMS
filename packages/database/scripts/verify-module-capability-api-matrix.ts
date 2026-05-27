// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// HTTP acceptance proof for Phase 1 Module / Capability registry.

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { PrismaClient } from '../src/platform/prisma/client';
import { loadRepoEnvFiles } from './load-repo-env';

loadRepoEnvFiles(import.meta.url);

const prisma = new PrismaClient();

interface CliOptions {
  baseUrl: string;
  evidenceJson?: string;
  targetTenantCode: string;
}

interface LoginInput {
  tenantCode: string;
  login: string;
  password: string;
}

interface HttpResult {
  status: number;
  ok: boolean;
  code: string | null;
  data?: unknown;
}

interface LoginResult {
  token: string;
  tenantId: string;
  tenantSchema: string;
  userId: string;
}

interface CapabilityReadback {
  version: number;
  effective?: {
    summary?: {
      enabledCapabilityCodes?: string[];
    };
  };
}

interface RoleExpirySnapshot {
  id: string;
  expiresAt: string | null;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    baseUrl: 'http://localhost:4000',
    targetTenantCode: 'TEST_P1_CAP_HTTP_STD_CONFLICT',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--base-url' && next) {
      options.baseUrl = next.replace(/\/$/, '');
      index += 1;
    } else if (arg === '--target-tenant-code' && next) {
      options.targetTenantCode = next;
      index += 1;
    } else if (arg === '--evidence-json' && next) {
      options.evidenceJson = next;
      index += 1;
    }
  }

  return options;
}

function env(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function writeEvidence(filePath: string | undefined, payload: unknown) {
  if (!filePath) {
    return;
  }

  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function requestJson(
  baseUrl: string,
  method: string,
  route: string,
  token?: string,
  body?: unknown
): Promise<HttpResult> {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-request-id': `phase-1-${method.toLowerCase()}-${route
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 64)}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json()) as {
    success?: boolean;
    data?: unknown;
    error?: { code?: string };
  };

  return {
    status: response.status,
    ok: response.ok && payload.success === true,
    code: payload.error?.code ?? null,
    data: payload.data,
  };
}

async function login(baseUrl: string, input: LoginInput) {
  const result = await requestJson(baseUrl, 'POST', '/api/v1/auth/login', undefined, input);

  if (!result.ok || !result.data || typeof result.data !== 'object') {
    throw new Error(`Login failed for ${input.tenantCode}/${input.login}: ${result.status}`);
  }

  const data = result.data as {
    accessToken: string;
    user: { id: string; tenant: { id: string; code?: string; schemaName: string } };
  };

  return {
    token: data.accessToken,
    tenantId: data.user.tenant.id,
    tenantSchema: data.user.tenant.schemaName,
    userId: data.user.id,
  } satisfies LoginResult;
}

async function readAuditSummary(tenantId: string) {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      action: string;
      oldVersion: number;
      newVersion: number;
      oldCapabilityCodes: unknown;
      newCapabilityCodes: unknown;
      requestId: string | null;
      ipAddress: string | null;
    }>
  >(
    `
      SELECT
        action,
        old_version AS "oldVersion",
        new_version AS "newVersion",
        old_capability_codes AS "oldCapabilityCodes",
        new_capability_codes AS "newCapabilityCodes",
        request_id AS "requestId",
        ip_address AS "ipAddress"
      FROM public.tenant_capability_audit
      WHERE tenant_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT 3
    `,
    tenantId
  );

  return rows;
}

async function findTenant(baseUrl: string, acToken: string, tenantCode: string) {
  const list = await requestJson(baseUrl, 'GET', '/api/v1/tenants?page=1&pageSize=200', acToken);

  if (!list.ok || !list.data || !Array.isArray(list.data)) {
    throw new Error('Unable to list tenants for matrix target lookup');
  }

  const tenant = (list.data as Array<{ id: string; code: string; isActive: boolean }>).find(
    (item) => item.code === tenantCode
  );

  if (!tenant) {
    throw new Error(`Target tenant ${tenantCode} was not found`);
  }

  return tenant;
}

async function readTenantCapabilityCodes(baseUrl: string, acToken: string, tenantId: string) {
  const read = await requestJson(
    baseUrl,
    'GET',
    `/api/v1/tenants/${tenantId}/capabilities`,
    acToken
  );
  const data = read.data as CapabilityReadback | undefined;

  return {
    read,
    version: data?.version ?? 1,
    enabledCapabilityCodes: data?.effective?.summary?.enabledCapabilityCodes ?? [],
  };
}

async function replaceTenantCapabilityCodes(
  baseUrl: string,
  acToken: string,
  tenantId: string,
  enabledCapabilityCodes: readonly string[],
  note: string
) {
  const { version } = await readTenantCapabilityCodes(baseUrl, acToken, tenantId);

  return requestJson(baseUrl, 'PUT', `/api/v1/tenants/${tenantId}/capabilities`, acToken, {
    enabledCapabilityCodes,
    version,
    note,
  });
}

async function setSystemUserActive(tenantSchema: string, userId: string, isActive: boolean) {
  await prisma.$executeRawUnsafe(
    `
      UPDATE "${tenantSchema}".system_user
      SET is_active = $2, updated_at = now()
      WHERE id = $1::uuid
    `,
    userId,
    isActive
  );
}

async function readUserRoleExpirySnapshot(tenantSchema: string, userId: string) {
  return prisma.$queryRawUnsafe<RoleExpirySnapshot[]>(
    `
      SELECT id, expires_at AS "expiresAt"
      FROM "${tenantSchema}".user_role
      WHERE user_id = $1::uuid
      ORDER BY id
    `,
    userId
  );
}

async function expireUserRoles(tenantSchema: string, userId: string) {
  await prisma.$executeRawUnsafe(
    `
      UPDATE "${tenantSchema}".user_role
      SET expires_at = now() - interval '1 minute'
      WHERE user_id = $1::uuid
    `,
    userId
  );
}

async function restoreUserRoles(tenantSchema: string, snapshot: readonly RoleExpirySnapshot[]) {
  for (const row of snapshot) {
    await prisma.$executeRawUnsafe(
      `
        UPDATE "${tenantSchema}".user_role
        SET expires_at = $2::timestamptz
        WHERE id = $1::uuid
      `,
      row.id,
      row.expiresAt
    );
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const startedAt = new Date().toISOString();
  const acLogin = await login(options.baseUrl, {
    tenantCode: env('TCRN_AC_TENANT_CODE'),
    login: env('TCRN_AC_USERNAME'),
    password: env('TCRN_AC_PASSWORD'),
  });
  const standardLogin = await login(options.baseUrl, {
    tenantCode: env('TCRN_STANDARD_TENANT_CODE'),
    login: env('TCRN_STANDARD_USERNAME'),
    password: env('TCRN_STANDARD_PASSWORD'),
  });
  const targetTenant = await findTenant(options.baseUrl, acLogin.token, options.targetTenantCode);
  const steps: Record<string, unknown> = {};
  let standardTenantWasDisabled = false;
  let standardUserWasDisabled = false;
  let standardRolesWereExpired = false;
  let standardOriginalCapabilityCodes: string[] | null = null;
  let standardRoleExpirySnapshot: RoleExpirySnapshot[] = [];

  try {
    steps.registryRead = await requestJson(
      options.baseUrl,
      'GET',
      '/api/v1/module-capabilities/registry',
      acLogin.token
    );

    const initialRead = await requestJson(
      options.baseUrl,
      'GET',
      `/api/v1/tenants/${targetTenant.id}/capabilities`,
      acLogin.token
    );
    steps.assignmentRead = initialRead;

    const initialVersion = (initialRead.data as { version?: number } | undefined)?.version ?? 1;
    const validReplace = await requestJson(
      options.baseUrl,
      'PUT',
      `/api/v1/tenants/${targetTenant.id}/capabilities`,
      acLogin.token,
      {
        enabledCapabilityCodes: ['public_presence.homepage', 'marshmallow.mailbox'],
        version: initialVersion,
        note: 'Phase 1 HTTP acceptance matrix valid replace',
      }
    );
    steps.validReplace = validReplace;

    const currentVersion = (validReplace.data as { version?: number } | undefined)?.version;
    const beforeStaleAudit = await readAuditSummary(targetTenant.id);

    steps.staleVersion = await requestJson(
      options.baseUrl,
      'PUT',
      `/api/v1/tenants/${targetTenant.id}/capabilities`,
      acLogin.token,
      {
        enabledCapabilityCodes: ['public_presence.homepage'],
        version: initialVersion,
        note: 'Phase 1 HTTP acceptance stale no-mutation',
      }
    );
    steps.afterStaleRead = await requestJson(
      options.baseUrl,
      'GET',
      `/api/v1/tenants/${targetTenant.id}/capabilities`,
      acLogin.token
    );
    const afterStaleAudit = await readAuditSummary(targetTenant.id);
    steps.staleNoMutation = {
      versionBefore: currentVersion,
      versionAfter: (steps.afterStaleRead as { data?: { version?: number } }).data?.version,
      auditCountBefore: beforeStaleAudit.length,
      auditCountAfter: afterStaleAudit.length,
    };

    steps.invalidCode = await requestJson(
      options.baseUrl,
      'PUT',
      `/api/v1/tenants/${targetTenant.id}/capabilities`,
      acLogin.token,
      {
        enabledCapabilityCodes: ['not.a.capability'],
        version: currentVersion,
      }
    );
    steps.nonAssignableCode = await requestJson(
      options.baseUrl,
      'PUT',
      `/api/v1/tenants/${targetTenant.id}/capabilities`,
      acLogin.token,
      {
        enabledCapabilityCodes: ['platform.ac_management'],
        version: currentVersion,
      }
    );
    steps.legacySettingsWrite = await requestJson(
      options.baseUrl,
      'PATCH',
      `/api/v1/tenants/${targetTenant.id}`,
      acLogin.token,
      {
        settings: { features: ['homepage'] },
      }
    );
    steps.nonAcRegistryDeniedByRbac = await requestJson(
      options.baseUrl,
      'GET',
      '/api/v1/module-capabilities/registry',
      standardLogin.token
    );
    steps.nonAcCrossTenantReplaceDenied = await requestJson(
      options.baseUrl,
      'PUT',
      `/api/v1/tenants/${targetTenant.id}/capabilities`,
      standardLogin.token,
      {
        enabledCapabilityCodes: ['public_presence.homepage'],
        version: currentVersion,
      }
    );
    steps.standardEffectiveBeforeDisable = await requestJson(
      options.baseUrl,
      'GET',
      '/api/v1/module-capabilities/effective',
      standardLogin.token
    );

    const standardCapabilityRead = await readTenantCapabilityCodes(
      options.baseUrl,
      acLogin.token,
      standardLogin.tenantId
    );
    steps.standardCapabilityReadForBusinessMatrix = standardCapabilityRead.read;
    standardOriginalCapabilityCodes = standardCapabilityRead.enabledCapabilityCodes;

    steps.reportCatalogAllowedBeforeCapabilityDisable = await requestJson(
      options.baseUrl,
      'GET',
      '/api/v1/reports/catalog',
      standardLogin.token
    );
    steps.disableReportsCapability = await replaceTenantCapabilityCodes(
      options.baseUrl,
      acLogin.token,
      standardLogin.tenantId,
      standardOriginalCapabilityCodes.filter((code) => code !== 'reports.mfr'),
      'Phase 1 HTTP acceptance disable reports capability for business endpoint proof'
    );
    steps.reportCatalogDeniedByCapability = await requestJson(
      options.baseUrl,
      'GET',
      '/api/v1/reports/catalog',
      standardLogin.token
    );
    steps.restoreReportsCapability = await replaceTenantCapabilityCodes(
      options.baseUrl,
      acLogin.token,
      standardLogin.tenantId,
      standardOriginalCapabilityCodes,
      'Phase 1 HTTP acceptance restore reports capability after proof'
    );

    steps.reportCatalogAllowedBeforeRoleExpiry = await requestJson(
      options.baseUrl,
      'GET',
      '/api/v1/reports/catalog',
      standardLogin.token
    );
    standardRoleExpirySnapshot = await readUserRoleExpirySnapshot(
      standardLogin.tenantSchema,
      standardLogin.userId
    );
    await expireUserRoles(standardLogin.tenantSchema, standardLogin.userId);
    standardRolesWereExpired = true;
    steps.reportCatalogDeniedAfterRoleExpiry = await requestJson(
      options.baseUrl,
      'GET',
      '/api/v1/reports/catalog',
      standardLogin.token
    );
    await restoreUserRoles(standardLogin.tenantSchema, standardRoleExpirySnapshot);
    standardRolesWereExpired = false;
    steps.reportCatalogAllowedAfterRoleRestore = await requestJson(
      options.baseUrl,
      'GET',
      '/api/v1/reports/catalog',
      standardLogin.token
    );

    await setSystemUserActive(standardLogin.tenantSchema, standardLogin.userId, false);
    standardUserWasDisabled = true;
    steps.disabledUserEffectiveDenied = await requestJson(
      options.baseUrl,
      'GET',
      '/api/v1/module-capabilities/effective',
      standardLogin.token
    );
    await setSystemUserActive(standardLogin.tenantSchema, standardLogin.userId, true);
    standardUserWasDisabled = false;
    steps.reactivatedUserEffectiveAllowed = await requestJson(
      options.baseUrl,
      'GET',
      '/api/v1/module-capabilities/effective',
      standardLogin.token
    );

    steps.disableStandardTenant = await requestJson(
      options.baseUrl,
      'POST',
      `/api/v1/tenants/${standardLogin.tenantId}/deactivate`,
      acLogin.token,
      {
        reason: 'Phase 1 HTTP acceptance disabled tenant proof',
      }
    );
    standardTenantWasDisabled = (steps.disableStandardTenant as HttpResult).ok;
    steps.disabledTenantEffectiveDenied = await requestJson(
      options.baseUrl,
      'GET',
      '/api/v1/module-capabilities/effective',
      standardLogin.token
    );
    steps.auditReadback = await readAuditSummary(targetTenant.id);
  } finally {
    if (standardUserWasDisabled) {
      await setSystemUserActive(standardLogin.tenantSchema, standardLogin.userId, true);
      steps.reactivateStandardUserFinally = true;
    }

    if (standardRolesWereExpired) {
      await restoreUserRoles(standardLogin.tenantSchema, standardRoleExpirySnapshot);
      steps.restoreStandardRolesFinally = true;
    }

    if (standardOriginalCapabilityCodes) {
      steps.restoreStandardCapabilitiesFinally = await replaceTenantCapabilityCodes(
        options.baseUrl,
        acLogin.token,
        standardLogin.tenantId,
        standardOriginalCapabilityCodes,
        'Phase 1 HTTP acceptance final standard capability restore'
      );
    }

    if (standardTenantWasDisabled) {
      steps.reactivateStandardTenant = await requestJson(
        options.baseUrl,
        'POST',
        `/api/v1/tenants/${standardLogin.tenantId}/activate`,
        acLogin.token
      );
    }
  }

  const expectations = {
    registryRead: (steps.registryRead as HttpResult).status === 200,
    assignmentRead: (steps.assignmentRead as HttpResult).status === 200,
    validReplace: (steps.validReplace as HttpResult).status === 200,
    staleVersionRejected: (steps.staleVersion as HttpResult).status === 409,
    staleNoMutation:
      (steps.staleNoMutation as { versionBefore?: number; versionAfter?: number }).versionBefore ===
      (steps.staleNoMutation as { versionBefore?: number; versionAfter?: number }).versionAfter,
    invalidCodeRejected: (steps.invalidCode as HttpResult).status === 400,
    nonAssignableCodeRejected: (steps.nonAssignableCode as HttpResult).status === 400,
    legacySettingsRejected: (steps.legacySettingsWrite as HttpResult).status === 400,
    nonAcRegistryDeniedByRbac: (steps.nonAcRegistryDeniedByRbac as HttpResult).status === 403,
    nonAcCrossTenantReplaceDenied:
      (steps.nonAcCrossTenantReplaceDenied as HttpResult).status === 403,
    standardEffectiveBeforeDisable:
      (steps.standardEffectiveBeforeDisable as HttpResult).status === 200,
    reportCatalogAllowedBeforeCapabilityDisable:
      (steps.reportCatalogAllowedBeforeCapabilityDisable as HttpResult).status === 200,
    reportCatalogDeniedByCapability:
      (steps.reportCatalogDeniedByCapability as HttpResult).status === 403 &&
      (steps.reportCatalogDeniedByCapability as HttpResult).code === 'TENANT_CAPABILITY_DISABLED',
    reportCatalogAllowedBeforeRoleExpiry:
      (steps.reportCatalogAllowedBeforeRoleExpiry as HttpResult).status === 200,
    reportCatalogDeniedAfterRoleExpiry:
      (steps.reportCatalogDeniedAfterRoleExpiry as HttpResult).status === 403 &&
      (steps.reportCatalogDeniedAfterRoleExpiry as HttpResult).code === 'PERM_ACCESS_DENIED',
    reportCatalogAllowedAfterRoleRestore:
      (steps.reportCatalogAllowedAfterRoleRestore as HttpResult).status === 200,
    disabledUserEffectiveDenied:
      (steps.disabledUserEffectiveDenied as HttpResult).status === 403 &&
      (steps.disabledUserEffectiveDenied as HttpResult).code === 'AUTH_ACCOUNT_DISABLED',
    reactivatedUserEffectiveAllowed:
      (steps.reactivatedUserEffectiveAllowed as HttpResult).status === 200,
    disabledTenantEffectiveDenied:
      (steps.disabledTenantEffectiveDenied as HttpResult).status === 403,
    standardTenantReactivated: (steps.reactivateStandardTenant as HttpResult | undefined)?.status ===
      201 || (steps.reactivateStandardTenant as HttpResult | undefined)?.status === 200,
    auditReadbackPresent: (steps.auditReadback as unknown[]).length > 0,
  };
  const failed = Object.entries(expectations)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  const payload = {
    startedAt,
    completedAt: new Date().toISOString(),
    baseUrl: options.baseUrl,
    targetTenantCode: options.targetTenantCode,
    targetTenantId: targetTenant.id,
    standardTenantId: standardLogin.tenantId,
    expectations,
    failed,
    steps,
  };

  writeEvidence(options.evidenceJson, payload);
  console.log(JSON.stringify(payload, null, 2));

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

void main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
