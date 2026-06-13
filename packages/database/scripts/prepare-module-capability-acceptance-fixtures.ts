// SPDX-License-Identifier: Apache-2.0
// Disposable public-schema fixtures for Phase 1 Module / Capability acceptance.

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { PrismaClient } from '../src/platform/prisma/client';
import { loadRepoEnvFiles } from './load-repo-env';

loadRepoEnvFiles(import.meta.url);

const prisma = new PrismaClient();

interface CliOptions {
  command: 'setup' | 'resolve' | 'cleanup';
  dataMode: string;
  prefix: string;
  evidenceJson?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const [commandRaw, ...rest] = argv;
  const command = commandRaw as CliOptions['command'];

  if (command !== 'setup' && command !== 'resolve' && command !== 'cleanup') {
    throw new Error('Usage: prepare-module-capability-acceptance-fixtures.ts <setup|resolve|cleanup> --prefix <PREFIX> [--data-mode disposable_fixture] [--evidence-json path]');
  }

  const options: CliOptions = {
    command,
    dataMode: 'disposable_fixture',
    prefix: 'TEST_P1_CAP',
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    const next = rest[index + 1];

    if (arg === '--data-mode' && next) {
      options.dataMode = next;
      index += 1;
    } else if (arg === '--prefix' && next) {
      options.prefix = next;
      index += 1;
    } else if (arg === '--evidence-json' && next) {
      options.evidenceJson = next;
      index += 1;
    }
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

async function upsertFixtureTenant(input: {
  code: string;
  schemaName: string;
  name: string;
  tier: 'ac' | 'standard';
  isActive: boolean;
  enabledCapabilityCodes: readonly string[];
}) {
  const tenant = await prisma.tenant.upsert({
    where: { code: input.code },
    update: {
      name: input.name,
      tier: input.tier,
      isActive: input.isActive,
      settings: {
        timezone: 'UTC',
        defaultLanguage: 'en',
      },
    },
    create: {
      code: input.code,
      name: input.name,
      schemaName: input.schemaName,
      tier: input.tier,
      isActive: input.isActive,
      settings: {
        timezone: 'UTC',
        defaultLanguage: 'en',
      },
    },
  });

  const enabledSet = new Set(input.enabledCapabilityCodes);

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO public.tenant_capability_state (tenant_id, version, updated_at)
      VALUES ($1::uuid, 1, now())
      ON CONFLICT (tenant_id) DO UPDATE SET updated_at = now()
    `,
    tenant.id
  );

  for (const [capabilityCode, enabled] of [
    ['public_presence.homepage', enabledSet.has('public_presence.homepage')],
    ['marshmallow.mailbox', enabledSet.has('marshmallow.mailbox')],
    ['reports.mfr', enabledSet.has('reports.mfr')],
    ['integration.webhooks', enabledSet.has('integration.webhooks')],
  ] as const) {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO public.tenant_capability_assignment (
          id,
          tenant_id,
          capability_code,
          enabled,
          source,
          assigned_at,
          updated_at,
          note
        )
        VALUES (gen_random_uuid(), $1::uuid, $2, $3, 'seed', now(), now(), 'Phase 1 disposable fixture')
        ON CONFLICT (tenant_id, capability_code) DO UPDATE SET
          enabled = EXCLUDED.enabled,
          source = EXCLUDED.source,
          updated_at = now(),
          note = EXCLUDED.note
      `,
      tenant.id,
      capabilityCode,
      enabled
    );
  }

  return {
    tenantId: tenant.id,
    code: tenant.code,
    schemaName: tenant.schemaName,
    tier: tenant.tier,
    isActive: tenant.isActive,
    enabledCapabilityCodes: input.enabledCapabilityCodes,
  };
}

async function setup(prefix: string) {
  return {
    tenants: await Promise.all([
      upsertFixtureTenant({
        code: `${prefix}_STD_ENABLED`,
        schemaName: `tenant_${prefix.toLowerCase()}_std_enabled`,
        name: 'Phase 1 Capability Fixture Enabled',
        tier: 'standard',
        isActive: true,
        enabledCapabilityCodes: ['public_presence.homepage', 'marshmallow.mailbox'],
      }),
      upsertFixtureTenant({
        code: `${prefix}_STD_DISABLED`,
        schemaName: `tenant_${prefix.toLowerCase()}_std_disabled`,
        name: 'Phase 1 Capability Fixture Disabled Tenant',
        tier: 'standard',
        isActive: false,
        enabledCapabilityCodes: ['public_presence.homepage', 'marshmallow.mailbox'],
      }),
      upsertFixtureTenant({
        code: `${prefix}_STD_CONFLICT`,
        schemaName: `tenant_${prefix.toLowerCase()}_std_conflict`,
        name: 'Phase 1 Capability Fixture Conflict Version',
        tier: 'standard',
        isActive: true,
        enabledCapabilityCodes: ['public_presence.homepage'],
      }),
      upsertFixtureTenant({
        code: `${prefix}_STD_NO_PUBLIC`,
        schemaName: `tenant_${prefix.toLowerCase()}_std_no_public`,
        name: 'Phase 1 Capability Fixture No Public Modules',
        tier: 'standard',
        isActive: true,
        enabledCapabilityCodes: [],
      }),
      upsertFixtureTenant({
        code: `${prefix}_AC_DISABLED`,
        schemaName: `tenant_${prefix.toLowerCase()}_ac_disabled`,
        name: 'Phase 1 Capability Fixture Disabled AC',
        tier: 'ac',
        isActive: false,
        enabledCapabilityCodes: [],
      }),
    ]),
  };
}

async function resolve(prefix: string) {
  const tenants = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      code: string;
      tier: string;
      isActive: boolean;
      settings: Record<string, unknown>;
      enabledCodes: string[];
    }>
  >(
    `
      SELECT
        t.id::text,
        t.code,
        t.tier,
        t.is_active AS "isActive",
        t.settings,
        COALESCE(
          array_agg(a.capability_code ORDER BY a.capability_code)
            FILTER (WHERE a.enabled = true),
          ARRAY[]::varchar[]
        ) AS "enabledCodes"
      FROM public.tenant t
      LEFT JOIN public.tenant_capability_assignment a ON a.tenant_id = t.id
      WHERE t.code LIKE $1
      GROUP BY t.id, t.code, t.settings
      ORDER BY t.code ASC
    `,
    `${prefix}%`
  );

  return {
    tenants: tenants.map((tenant) => ({
      code: tenant.code,
      tier: tenant.tier,
      isActive: tenant.isActive,
      enabledCapabilityCodes: tenant.enabledCodes,
      retiredFeatureKeyAbsent: !Object.prototype.hasOwnProperty.call(tenant.settings, 'features'),
    })),
  };
}

async function cleanup(prefix: string) {
  const deleted = await prisma.$executeRawUnsafe(
    `
      DELETE FROM public.tenant
      WHERE code LIKE $1
    `,
    `${prefix}%`
  );

  return { deletedTenants: deleted };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const startedAt = new Date().toISOString();

  if (options.dataMode !== 'disposable_fixture') {
    throw new Error('Only --data-mode disposable_fixture is supported by this script.');
  }

  assertDisposableFixtureSafety(options.prefix);

  const result =
    options.command === 'setup'
      ? await setup(options.prefix)
      : options.command === 'resolve'
        ? await resolve(options.prefix)
        : await cleanup(options.prefix);

  const payload = {
    command: options.command,
    dataMode: options.dataMode,
    prefix: options.prefix,
    startedAt,
    completedAt: new Date().toISOString(),
    result,
  };

  writeEvidence(options.evidenceJson, payload);
  console.log(JSON.stringify(payload, null, 2));
}

void main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
