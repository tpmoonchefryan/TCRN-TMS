// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Disposable Phase 3 SSO fixture setup/readback/cleanup for local acceptance runs.

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { PrismaClient } from '../src/platform/prisma/client';
import { loadRepoEnvFiles } from './load-repo-env';

loadRepoEnvFiles(import.meta.url);

type Command = 'setup' | 'resolve' | 'cleanup';

interface CliOptions {
  command: Command;
  prefix: string;
  tenantCode: string;
  userEmail: string;
  evidenceJson?: string;
}

interface TenantRow {
  id: string;
  code: string;
  schemaName: string;
  tier: string;
  isActive: boolean;
}

interface UserRow {
  id: string;
  email: string;
  username: string;
  isActive: boolean;
}

interface ProviderRow {
  id: string;
  tenantId: string;
  code: string;
  providerIssuer: string;
  ownerScope: string;
  providerType: string;
  isEnabled: boolean;
  clientSecretConfigured: boolean;
}

interface LinkRow {
  id: string;
  userId: string;
  providerId: string;
  providerCode: string;
  providerIssuer: string;
  subject: string;
  email: string | null;
  displayName: string | null;
  revokedAt: string | null;
}

const prisma = new PrismaClient();

function parseArgs(argv: string[]): CliOptions {
  const [commandRaw, ...rest] = argv;
  const command = commandRaw as Command;

  if (command !== 'setup' && command !== 'resolve' && command !== 'cleanup') {
    throw new Error(
      'Usage: prepare-sso-acceptance-fixtures.ts <setup|resolve|cleanup> --tenant-code <CODE> --user-email <EMAIL> [--prefix TEST_P3_SSO] [--evidence-json path]'
    );
  }

  const options: CliOptions = {
    command,
    prefix: 'TEST_P3_SSO',
    tenantCode: '',
    userEmail: '',
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    const next = rest[index + 1];

    if (arg === '--prefix' && next) {
      options.prefix = next;
      index += 1;
    } else if (arg === '--tenant-code' && next) {
      options.tenantCode = next;
      index += 1;
    } else if (arg === '--user-email' && next) {
      options.userEmail = next;
      index += 1;
    } else if (arg === '--evidence-json' && next) {
      options.evidenceJson = next;
      index += 1;
    }
  }

  if (!options.tenantCode || !options.userEmail) {
    throw new Error('--tenant-code and --user-email are required.');
  }

  return options;
}

function writeEvidence(filePath: string | undefined, payload: unknown) {
  if (!filePath) {
    return;
  }

  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function assertDisposableFixtureSafety(prefix: string) {
  if (!prefix.startsWith('TEST_')) {
    throw new Error('Disposable fixture prefix must start with TEST_.');
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Disposable fixture script cannot run with NODE_ENV=production.');
  }

  if (process.env.TCRN_ALLOW_DISPOSABLE_FIXTURES === '1') {
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for disposable fixture safety checks.');
  }

  const host = new URL(databaseUrl).hostname;
  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);

  if (!localHosts.has(host)) {
    throw new Error(
      'Disposable fixture script only runs against local databases unless TCRN_ALLOW_DISPOSABLE_FIXTURES=1 is set.'
    );
  }
}

function quoteIdent(identifier: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }

  return `"${identifier}"`;
}

function providerCode(prefix: string) {
  return `${prefix.toLowerCase().replace(/_/g, '-')}-mock`;
}

function subject(prefix: string) {
  return `${prefix}_ACTIVE_SUBJECT`;
}

async function resolveTenant(tenantCode: string) {
  const rows = await prisma.$queryRawUnsafe<TenantRow[]>(
    `
      SELECT
        id::text,
        code,
        schema_name AS "schemaName",
        tier,
        is_active AS "isActive"
      FROM public.tenant
      WHERE code = $1
      LIMIT 1
    `,
    tenantCode
  );

  if (rows.length === 0) {
    throw new Error(`Tenant ${tenantCode} was not found.`);
  }

  return rows[0];
}

async function resolveUser(tenantSchema: string, userEmail: string) {
  const schema = quoteIdent(tenantSchema);
  const rows = await prisma.$queryRawUnsafe<UserRow[]>(
    `
      SELECT
        id::text,
        email,
        username,
        is_active AS "isActive"
      FROM ${schema}.system_user
      WHERE email = $1
      LIMIT 1
    `,
    userEmail
  );

  if (rows.length === 0) {
    throw new Error(`User ${userEmail} was not found in ${tenantSchema}.`);
  }

  return rows[0];
}

async function upsertProvider(options: CliOptions, tenant: TenantRow) {
  const rows = await prisma.$queryRawUnsafe<ProviderRow[]>(
    `
      INSERT INTO public.tms_sso_provider (
        tenant_id,
        code,
        display_name,
        provider_type,
        owner_scope,
        scopes,
        claim_mapping_policy,
        is_enabled,
        updated_at
      )
      VALUES (
        $1::uuid,
        $2,
        $3::jsonb,
        'mock',
        'tenant_product',
        ARRAY['openid', 'profile', 'email']::varchar(64)[],
        '{"subject":"sub","email":"email","displayName":"name","emailVerified":"email_verified"}'::jsonb,
        true,
        now()
      )
      ON CONFLICT (tenant_id, code) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        provider_type = EXCLUDED.provider_type,
        owner_scope = EXCLUDED.owner_scope,
        is_enabled = EXCLUDED.is_enabled,
        updated_at = now(),
        version = tms_sso_provider.version + 1
      RETURNING
        id::text,
        tenant_id::text AS "tenantId",
        code,
        COALESCE(issuer_url, authorization_url, jwks_url, provider_type || ':' || code)
          AS "providerIssuer",
        owner_scope AS "ownerScope",
        provider_type AS "providerType",
        is_enabled AS "isEnabled",
        client_secret_ref IS NOT NULL AS "clientSecretConfigured"
    `,
    tenant.id,
    providerCode(options.prefix),
    JSON.stringify({ en: 'Phase 3 Mock SSO', zh_HANS: 'Phase 3 Mock SSO' })
  );

  return rows[0];
}

async function upsertLink(options: CliOptions, tenant: TenantRow, user: UserRow, provider: ProviderRow) {
  const schema = quoteIdent(tenant.schemaName);
  const activeRows = await prisma.$queryRawUnsafe<LinkRow[]>(
    `
      SELECT
        id::text,
        user_id::text AS "userId",
        provider_id::text AS "providerId",
        provider_code AS "providerCode",
        provider_issuer AS "providerIssuer",
        subject,
        email,
        display_name AS "displayName",
        revoked_at::text AS "revokedAt"
      FROM ${schema}.tms_sso_account_link
      WHERE provider_id = $1::uuid
        AND provider_issuer = $2
        AND subject = $3
        AND revoked_at IS NULL
      LIMIT 1
    `,
    provider.id,
    provider.providerIssuer,
    subject(options.prefix)
  );

  if (activeRows.length > 0) {
    const [row] = await prisma.$queryRawUnsafe<LinkRow[]>(
      `
        UPDATE ${schema}.tms_sso_account_link
        SET user_id = $2::uuid,
            email = $3,
            display_name = $4,
            claims_hash = repeat('0', 64),
            updated_at = now(),
            version = version + 1
        WHERE id = $1::uuid
        RETURNING
          id::text,
          user_id::text AS "userId",
          provider_id::text AS "providerId",
          provider_code AS "providerCode",
          provider_issuer AS "providerIssuer",
          subject,
          email,
          display_name AS "displayName",
          revoked_at::text AS "revokedAt"
      `,
      activeRows[0].id,
      user.id,
      `${options.prefix.toLowerCase()}@idp.test`,
      'Phase 3 SSO Fixture'
    );

    return row;
  }

  const [row] = await prisma.$queryRawUnsafe<LinkRow[]>(
    `
      INSERT INTO ${schema}.tms_sso_account_link (
        user_id,
        provider_id,
        provider_code,
        provider_issuer,
        subject,
        email,
        display_name,
        claims_hash,
        created_by,
        updated_at
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        $4,
        $5,
        $6,
        $7,
        repeat('0', 64),
        $1::uuid,
        now()
      )
      RETURNING
        id::text,
        user_id::text AS "userId",
        provider_id::text AS "providerId",
        provider_code AS "providerCode",
        provider_issuer AS "providerIssuer",
        subject,
        email,
        display_name AS "displayName",
        revoked_at::text AS "revokedAt"
    `,
    user.id,
    provider.id,
    provider.code,
    provider.providerIssuer,
    subject(options.prefix),
    `${options.prefix.toLowerCase()}@idp.test`,
    'Phase 3 SSO Fixture'
  );

  return row;
}

async function readback(options: CliOptions, tenant: TenantRow) {
  const schema = quoteIdent(tenant.schemaName);
  const providers = await prisma.$queryRawUnsafe<ProviderRow[]>(
    `
      SELECT
        id::text,
        tenant_id::text AS "tenantId",
        code,
        COALESCE(issuer_url, authorization_url, jwks_url, provider_type || ':' || code)
          AS "providerIssuer",
        owner_scope AS "ownerScope",
        provider_type AS "providerType",
        is_enabled AS "isEnabled",
        client_secret_ref IS NOT NULL AS "clientSecretConfigured"
      FROM public.tms_sso_provider
      WHERE tenant_id = $1::uuid
        AND code = $2
      ORDER BY code
    `,
    tenant.id,
    providerCode(options.prefix)
  );
  const links = await prisma.$queryRawUnsafe<LinkRow[]>(
    `
      SELECT
        id::text,
        user_id::text AS "userId",
        provider_id::text AS "providerId",
        provider_code AS "providerCode",
        provider_issuer AS "providerIssuer",
        subject,
        email,
        display_name AS "displayName",
        revoked_at::text AS "revokedAt"
      FROM ${schema}.tms_sso_account_link
      WHERE provider_code = $1
         OR subject LIKE $2
      ORDER BY provider_code, subject
    `,
    providerCode(options.prefix),
    `${options.prefix}%`
  );

  return {
    tenant: {
      id: tenant.id,
      code: tenant.code,
      schemaName: tenant.schemaName,
      tier: tenant.tier,
      isActive: tenant.isActive,
    },
    providers,
    links,
  };
}

async function cleanup(options: CliOptions, tenant: TenantRow) {
  const schema = quoteIdent(tenant.schemaName);
  const providers = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `
      SELECT id::text
      FROM public.tms_sso_provider
      WHERE tenant_id = $1::uuid
        AND code = $2
    `,
    tenant.id,
    providerCode(options.prefix)
  );
  const providerIds = providers.map((provider) => provider.id);

  let deletedLinks = 0;
  for (const providerId of providerIds) {
    deletedLinks += Number(
      await prisma.$executeRawUnsafe(
        `
          DELETE FROM ${schema}.tms_sso_account_link
          WHERE provider_id = $1::uuid
             OR subject LIKE $2
        `,
        providerId,
        `${options.prefix}%`
      )
    );
  }

  const deletedProviders = Number(
    await prisma.$executeRawUnsafe(
      `
        DELETE FROM public.tms_sso_provider
        WHERE tenant_id = $1::uuid
          AND code = $2
      `,
      tenant.id,
      providerCode(options.prefix)
    )
  );

  return {
    deletedProviders,
    deletedLinks,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  assertDisposableFixtureSafety(options.prefix);

  const tenant = await resolveTenant(options.tenantCode);
  const user = await resolveUser(tenant.schemaName, options.userEmail);
  let payload: Record<string, unknown>;

  if (options.command === 'setup') {
    const provider = await upsertProvider(options, tenant);
    const link = await upsertLink(options, tenant, user, provider);
    payload = {
      checkedAt: new Date().toISOString(),
      test_layer: 'api_integration',
      data_mode: 'disposable_fixture',
      target_scope: 'profile_account_link',
      command: options.command,
      prefix: options.prefix,
      created_resources: {
        providerCode: provider.code,
        providerId: provider.id,
        linkId: link.id,
      },
      mutated_resources: [],
      mock_idp_material: {
        issuer: 'mock-provider-query-callback',
        subject: link.subject,
        token_redaction_policy: 'no raw token material is generated or written by this fixture',
      },
      readback: await readback(options, tenant),
      passed: true,
    };
  } else if (options.command === 'cleanup') {
    payload = {
      checkedAt: new Date().toISOString(),
      test_layer: 'api_integration',
      data_mode: 'disposable_fixture',
      target_scope: 'profile_account_link',
      command: options.command,
      prefix: options.prefix,
      cleanup: await cleanup(options, tenant),
      readback: await readback(options, tenant),
    };
    payload.passed =
      (payload.readback as Awaited<ReturnType<typeof readback>>).providers.length === 0 &&
      (payload.readback as Awaited<ReturnType<typeof readback>>).links.length === 0;
  } else {
    payload = {
      checkedAt: new Date().toISOString(),
      test_layer: 'manual_readback',
      data_mode: 'disposable_fixture',
      target_scope: 'profile_account_link',
      command: options.command,
      prefix: options.prefix,
      readback: await readback(options, tenant),
    };
    payload.passed =
      (payload.readback as Awaited<ReturnType<typeof readback>>).providers.length <= 1;
  }

  writeEvidence(options.evidenceJson, payload);
  console.log(JSON.stringify(payload, null, 2));

  if (!payload.passed) {
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
