// SPDX-License-Identifier: Apache-2.0
// Sanitized runtime readback for the permission-governance Owner gap remediation.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  INITIAL_ADMIN_ROLE_CODE,
  LEGACY_ADMIN_COMPATIBILITY_ROLE_CODES,
} from '../../shared/src/rbac/catalog';
import { PrismaClient } from '../src/platform/prisma/client';
import { loadRepoEnvFiles } from './load-repo-env';

loadRepoEnvFiles(import.meta.url);

type NoLastAdminStatus = 'passed' | 'blocked' | 'not_applicable';

interface PermissionGovernanceReadback {
  ok: boolean;
  generatedAt: string;
  schemas: Array<{
    schemaName: string;
    tenantCode: string | null;
    tenantTier: string | null;
    ok: boolean;
    systemRoleCodes: string[];
    initialAdminAssignmentCount: number;
    activeLegacyAdminAssignmentCount: number;
    legacyBuiltInSystemRoleCount: number;
    legacyCompatibilityRoleCount: number;
    customFixtureRoleCodes: string[];
    rejectedAssignmentRoleCodes: string[];
    permissionEffectSamples: {
      grantPreserved: boolean;
      denyPreserved: boolean;
      unsetHasNoExplicitRolePolicy: boolean;
    };
    snapshotFreshness: {
      checked: boolean;
      staleGrantAfterContraction: boolean;
      versionAdvancedAfterMutation: boolean;
    };
    noLastAdminInvariant: {
      status: NoLastAdminStatus;
      reason: string;
    };
    failures: string[];
  }>;
  summary: {
    checkedSchemaCount: number;
    failedSchemaCount: number;
  };
}

interface CliOptions {
  schemas: string[];
  json: boolean;
}

function parseCliArgs(argv: string[]): CliOptions {
  const schemas: string[] = [];
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--schema') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --schema');
      }

      schemas.push(value);
      index += 1;
      continue;
    }

    if (arg === '--json') {
      json = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { schemas, json };
}

async function readSchema(prisma: PrismaClient, schemaName: string) {
  const legacyCodes = [...LEGACY_ADMIN_COMPATIBILITY_ROLE_CODES];
  const tenantRows = await prisma.$queryRawUnsafe<Array<{ code: string; tier: string | null }>>(
    `
      SELECT code, tier
      FROM public.tenant
      WHERE schema_name = $1
      LIMIT 1
    `,
    schemaName,
  );

  const [
    systemRoles,
    initialAdminAssignments,
    activeLegacyAssignments,
    legacyBuiltInRoles,
    legacyCompatibilityRoles,
    customFixtureRoles,
    grantRows,
    denyRows,
    explicitRolePolicyRows,
    possibleRolePolicyRows,
  ] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ code: string }>>(
      `
        SELECT code
        FROM "${schemaName}".role
        WHERE is_system = true
        ORDER BY code
      `,
    ),
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*)::bigint AS count
        FROM "${schemaName}".user_role ur
        JOIN "${schemaName}".role r ON r.id = ur.role_id
        WHERE r.code = $1
          AND ur.scope_type = 'tenant'
          AND (ur.expires_at IS NULL OR ur.expires_at > now())
      `,
      INITIAL_ADMIN_ROLE_CODE,
    ),
    prisma.$queryRawUnsafe<Array<{ roleCode: string; count: bigint }>>(
      `
        SELECT r.code as "roleCode", COUNT(*)::bigint AS count
        FROM "${schemaName}".user_role ur
        JOIN "${schemaName}".role r ON r.id = ur.role_id
        WHERE r.code = ANY($1::text[])
          AND (ur.expires_at IS NULL OR ur.expires_at > now())
        GROUP BY r.code
        ORDER BY r.code
      `,
      legacyCodes,
    ),
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*)::bigint AS count
        FROM "${schemaName}".role
        WHERE code = ANY($1::text[])
          AND is_system = true
      `,
      legacyCodes,
    ),
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT COUNT(*)::bigint AS count
        FROM "${schemaName}".role
        WHERE code = ANY($1::text[])
          AND is_system = false
      `,
      legacyCodes,
    ),
    prisma.$queryRawUnsafe<Array<{ code: string }>>(
      `
        SELECT code
        FROM "${schemaName}".role
        WHERE is_system = false
          AND code <> $1
          AND NOT (code = ANY($2::text[]))
        ORDER BY code
      `,
      INITIAL_ADMIN_ROLE_CODE,
      legacyCodes,
    ),
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM "${schemaName}".role_policy WHERE effect = 'grant'`,
    ),
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM "${schemaName}".role_policy WHERE effect = 'deny'`,
    ),
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM "${schemaName}".role_policy`,
    ),
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
        SELECT (SELECT COUNT(*)::bigint FROM "${schemaName}".role)
             * (SELECT COUNT(*)::bigint FROM "${schemaName}".policy) AS count
      `,
    ),
  ]);

  const systemRoleCodes = systemRoles.map((role) => role.code);
  const initialAdminAssignmentCount = Number(initialAdminAssignments[0]?.count ?? 0);
  const rejectedAssignmentRoleCodes = activeLegacyAssignments.map((row) => row.roleCode);
  const activeLegacyAdminAssignmentCount = activeLegacyAssignments.reduce(
    (sum, row) => sum + Number(row.count),
    0,
  );
  const legacyBuiltInSystemRoleCount = Number(legacyBuiltInRoles[0]?.count ?? 0);
  const grantPreserved = Number(grantRows[0]?.count ?? 0) > 0;
  const denyPreserved = Number(denyRows[0]?.count ?? 0) > 0;
  const explicitCount = Number(explicitRolePolicyRows[0]?.count ?? 0);
  const possibleCount = Number(possibleRolePolicyRows[0]?.count ?? 0);
  const failures: string[] = [];

  if (systemRoleCodes.length !== 1 || systemRoleCodes[0] !== INITIAL_ADMIN_ROLE_CODE) {
    failures.push(
      `Expected exactly one system role ${INITIAL_ADMIN_ROLE_CODE}; found ${systemRoleCodes.join(', ') || 'none'}.`,
    );
  }

  if (initialAdminAssignmentCount < 1) {
    failures.push('Expected at least one active tenant-scope Initial Admin assignment.');
  }

  if (activeLegacyAdminAssignmentCount !== 0) {
    failures.push(
      `Expected zero active legacy admin assignments; found ${activeLegacyAdminAssignmentCount}.`,
    );
  }

  if (legacyBuiltInSystemRoleCount !== 0) {
    failures.push(
      `Expected zero legacy admin rows with is_system=true; found ${legacyBuiltInSystemRoleCount}.`,
    );
  }

  if (!grantPreserved) {
    failures.push('Expected grant role_policy rows for Initial Admin.');
  }

  const noLastAdminInvariant =
    initialAdminAssignmentCount > 0
      ? {
          status: 'passed' as const,
          reason: 'At least one active tenant-scope Initial Admin assignment exists.',
        }
      : {
          status: 'blocked' as const,
          reason: 'No active tenant-scope Initial Admin assignment exists.',
        };

  const schemaReadback = {
    schemaName,
    tenantCode: tenantRows[0]?.code ?? null,
    tenantTier: tenantRows[0]?.tier ?? null,
    ok: failures.length === 0,
    systemRoleCodes,
    initialAdminAssignmentCount,
    activeLegacyAdminAssignmentCount,
    legacyBuiltInSystemRoleCount,
    legacyCompatibilityRoleCount: Number(legacyCompatibilityRoles[0]?.count ?? 0),
    customFixtureRoleCodes: customFixtureRoles.map((role) => role.code),
    rejectedAssignmentRoleCodes,
    permissionEffectSamples: {
      grantPreserved,
      denyPreserved,
      unsetHasNoExplicitRolePolicy: explicitCount < possibleCount,
    },
    snapshotFreshness: {
      checked: false,
      staleGrantAfterContraction: false,
      versionAdvancedAfterMutation: false,
    },
    noLastAdminInvariant,
    failures,
  };

  return schemaReadback;
}

async function main(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    const schemas =
      options.schemas.length > 0
        ? [...new Set(options.schemas)]
        : ['tenant_ac', 'tenant_uat_corp', 'tenant_uat_solo'];
    const schemaReadbacks = await Promise.all(schemas.map((schema) => readSchema(prisma, schema)));
    const failedSchemaCount = schemaReadbacks.filter((schema) => !schema.ok).length;
    const readback: PermissionGovernanceReadback = {
      ok: failedSchemaCount === 0,
      generatedAt: new Date().toISOString(),
      schemas: schemaReadbacks,
      summary: {
        checkedSchemaCount: schemaReadbacks.length,
        failedSchemaCount,
      },
    };

    if (options.json) {
      console.log(JSON.stringify(readback, null, 2));
      return;
    }

    console.log(`Permission-governance readback: ${readback.ok ? 'ok' : 'failed'}`);
    for (const schema of readback.schemas) {
      console.log(
        `- ${schema.schemaName}: system=${schema.systemRoleCodes.join(',') || 'none'}, Initial Admin assignments=${schema.initialAdminAssignmentCount}, active legacy=${schema.activeLegacyAdminAssignmentCount}`,
      );
      for (const failure of schema.failures) {
        console.log(`  • ${failure}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

function isDirectExecution(): boolean {
  if (!process.argv[1]) {
    return false;
  }

  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectExecution()) {
  main().catch((error) => {
    console.error('Permission-governance readback failed:', error);
    process.exit(1);
  });
}
