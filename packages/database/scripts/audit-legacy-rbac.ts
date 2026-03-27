// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Read-only audit for legacy RBAC resources that still exist in tenant schemas.

import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'node:url';

import { getSchemaSyncFailureReason } from './sync-rbac-contract';

export interface CliOptions {
  schemas: string[];
  legacyCodes: string[];
  skipTemplate: boolean;
  includeHistoricalRoles: boolean;
  includeCompatResources: boolean;
  excludeRoles: string[];
  json: boolean;
}

export interface LegacyResourceTarget {
  legacyCode: string;
  canonicalCode: string | null;
  canonicalCodes?: readonly string[];
  note: string;
}

export interface ResourceGrantEntry {
  roleCode: string;
  action: string;
  effect: string;
}

export interface ResourceAudit {
  code: string;
  present: boolean;
  isActive: boolean | null;
  policyCount: number;
  rolePolicyCount: number;
  assignedRoleCount: number;
  affectedUserCount: number;
  roleCodes: string[];
  grants: ResourceGrantEntry[];
}

export type PruneReadiness =
  | 'absent'
  | 'legacy_unmapped'
  | 'blocked_by_canonical_gap'
  | 'covered_requires_snapshot_refresh'
  | 'covered_assigned_verified'
  | 'covered_unassigned';

export interface LegacyTargetAudit {
  legacyCode: string;
  canonicalCode: string | null;
  canonicalCodes: string[];
  note: string;
  legacy: ResourceAudit;
  canonical: ResourceAudit | null;
  canonicalResources: ResourceAudit[];
  missingCanonicalCodes: string[];
  legacyOnlyGrants: string[];
  ignoredLegacyOnlyGrants: string[];
  excludedLegacyOnlyGrants: string[];
  canonicalOnlyGrants: string[];
  readiness: PruneReadiness;
  reason: string;
}

export interface HistoricalRoleAudit {
  roleCode: string;
  present: boolean;
  isActive: boolean | null;
  assignedUsers: number;
}

export interface CompatResourceTarget {
  code: string;
  note: string;
}

export interface CompatResourceAudit {
  code: string;
  note: string;
  resource: ResourceAudit;
}

export interface SchemaLegacyAudit {
  schemaName: string;
  targets: LegacyTargetAudit[];
  historicalRoles: HistoricalRoleAudit[];
  compatResources: CompatResourceAudit[];
}

export interface SkippedSchemaAudit {
  schemaName: string;
  reason: string;
}

export interface LegacyRbacAuditSummary {
  audited: SchemaLegacyAudit[];
  skipped: SkippedSchemaAudit[];
}

const LEGACY_RESOURCE_TARGETS: readonly LegacyResourceTarget[] = [
  {
    legacyCode: 'config.platform',
    canonicalCode: 'config.platform_settings',
    canonicalCodes: ['config.platform_settings', 'config.platform_registry'],
    note: 'Legacy platform config resource; current runtime surface is primarily guarded by split platform settings and registry resources.',
  },
  {
    legacyCode: 'homepage',
    canonicalCode: 'talent.homepage',
    note: 'Legacy external-page resource.',
  },
  {
    legacyCode: 'log.change',
    canonicalCode: 'log.change_log',
    note: 'Legacy log resource name.',
  },
  {
    legacyCode: 'log.integration',
    canonicalCode: 'log.integration_log',
    note: 'Legacy log resource name.',
  },
  {
    legacyCode: 'log.security',
    canonicalCode: 'log.tech_log',
    canonicalCodes: ['log.tech_log', 'log.search'],
    note: 'Legacy security-log resource; current security event viewing surface is guarded by tech-event log and log-search read access.',
  },
  {
    legacyCode: 'marshmallow',
    canonicalCode: 'talent.marshmallow',
    note: 'Legacy external-page resource.',
  },
  {
    legacyCode: 'system',
    canonicalCode: 'tenant.manage',
    note: 'Legacy tenant/platform management resource.',
  },
] as const;

export const HISTORICAL_ROLE_CODES = [
  'SUPER_ADMIN',
  'INTEGRATION_ADMIN',
  'INTEGRATION_VIEWER',
  'TENANT_ADMIN',
] as const;

const COMPAT_RESOURCE_TARGETS: readonly CompatResourceTarget[] = [
  {
    code: 'system_user.manage',
    note: 'Legacy user-management fallback checked by UserRoleService.',
  },
  {
    code: 'system_user.self',
    note: 'Legacy self-profile resource from pre-catalog RBAC shape.',
  },
  {
    code: 'role.manage',
    note: 'Legacy role-management resource from pre-catalog RBAC shape.',
  },
  {
    code: 'config.entity',
    note: 'Legacy generic config resource from pre-catalog RBAC shape.',
  },
  {
    code: 'config.blocklist',
    note: 'Legacy blocklist config resource from pre-catalog RBAC shape.',
  },
] as const;

interface LegacyOvergrantRule {
  ignoredLegacyOnlyGrants: readonly string[];
  reason: string;
}

const LEGACY_OVERGRANT_RULES: ReadonlyMap<string, LegacyOvergrantRule> = new Map([
  [
    'config.platform',
    {
      ignoredLegacyOnlyGrants: [
        'ADMIN:delete:grant',
        'PLATFORM_ADMIN:delete:grant',
        'TENANT_ADMIN:delete:grant',
      ],
      reason:
        'Legacy config.platform delete grants are retired over-grants; current platform configuration surface uses split read/write/admin resources, and TENANT_ADMIN is a compatibility alias of ADMIN.',
    },
  ],
  [
    'homepage',
    {
      ignoredLegacyOnlyGrants: [
        'ADMIN:delete:grant',
        'CONTENT_MANAGER:delete:grant',
        'PLATFORM_ADMIN:delete:grant',
        'TENANT_ADMIN:delete:grant',
      ],
      reason:
        'Legacy homepage delete grants are retired over-grants; current controller-facing surface only requires read/update semantics, and TENANT_ADMIN is a compatibility alias of ADMIN.',
    },
  ],
  [
    'log.security',
    {
      ignoredLegacyOnlyGrants: [
        'ADMIN:admin:grant',
        'ADMIN:delete:grant',
        'ADMIN:write:grant',
        'PLATFORM_ADMIN:admin:grant',
        'PLATFORM_ADMIN:delete:grant',
        'PLATFORM_ADMIN:write:grant',
        'TENANT_ADMIN:admin:grant',
        'TENANT_ADMIN:delete:grant',
        'TENANT_ADMIN:write:grant',
      ],
      reason:
        'Legacy log.security write/admin/delete grants are retired over-grants; current security-event viewing surface is read-only, and TENANT_ADMIN is a compatibility alias of ADMIN.',
    },
  ],
  [
    'marshmallow',
    {
      ignoredLegacyOnlyGrants: [
        'ADMIN:delete:grant',
        'CONTENT_MANAGER:delete:grant',
        'PLATFORM_ADMIN:delete:grant',
        'TENANT_ADMIN:delete:grant',
      ],
      reason:
        'Legacy marshmallow delete grants are retired over-grants; current controller-facing surface uses read/write/execute semantics, and TENANT_ADMIN is a compatibility alias of ADMIN.',
    },
  ],
  [
    'log.change',
    {
      ignoredLegacyOnlyGrants: [
        'ADMIN:admin:grant',
        'ADMIN:delete:grant',
        'ADMIN:write:grant',
        'PLATFORM_ADMIN:admin:grant',
        'PLATFORM_ADMIN:delete:grant',
        'PLATFORM_ADMIN:write:grant',
        'TALENT_MANAGER:admin:grant',
        'TALENT_MANAGER:write:grant',
        'TENANT_ADMIN:admin:grant',
        'TENANT_ADMIN:delete:grant',
        'TENANT_ADMIN:write:grant',
      ],
      reason:
        'Legacy log.change write/admin/delete grants are retired over-grants; current change-log controllers are read-only, and TENANT_ADMIN is a compatibility alias of ADMIN.',
    },
  ],
  [
    'log.integration',
    {
      ignoredLegacyOnlyGrants: [
        'ADMIN:admin:grant',
        'ADMIN:delete:grant',
        'ADMIN:write:grant',
        'PLATFORM_ADMIN:admin:grant',
        'PLATFORM_ADMIN:delete:grant',
        'PLATFORM_ADMIN:write:grant',
        'TENANT_ADMIN:admin:grant',
        'TENANT_ADMIN:delete:grant',
        'TENANT_ADMIN:write:grant',
      ],
      reason:
        'Legacy log.integration write/admin/delete grants are retired over-grants; current integration-log controllers are read-only, and TENANT_ADMIN is a compatibility alias of ADMIN.',
    },
  ],
]);

interface CanonicalTargetLike {
  canonicalCode: string | null;
  canonicalCodes?: readonly string[];
}

export function getCanonicalCodes(target: CanonicalTargetLike): string[] {
  const codes = target.canonicalCodes ?? (target.canonicalCode ? [target.canonicalCode] : []);

  return [...new Set(codes.filter((code): code is string => Boolean(code)))];
}

export function formatCanonicalLabel(target: CanonicalTargetLike): string {
  const canonicalCodes = getCanonicalCodes(target);

  if (canonicalCodes.length === 0) {
    return 'no canonical replacement';
  }

  const primaryCode = target.canonicalCode ?? canonicalCodes[0]!;
  const secondaryCodes = canonicalCodes.filter((code) => code !== primaryCode);

  if (secondaryCodes.length === 0) {
    return primaryCode;
  }

  return `${primaryCode} (+ ${secondaryCodes.join(', ')})`;
}

function parseCliArgs(argv: string[]): CliOptions {
  const schemas: string[] = [];
  const legacyCodes: string[] = [];
  let skipTemplate = false;
  let includeHistoricalRoles = false;
  let includeCompatResources = false;
  const excludeRoles: string[] = [];
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

    if (arg === '--resource') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --resource');
      }

      legacyCodes.push(value);
      index += 1;
      continue;
    }

    if (arg === '--skip-template') {
      skipTemplate = true;
      continue;
    }

    if (arg === '--include-historical-roles') {
      includeHistoricalRoles = true;
      continue;
    }

    if (arg === '--include-compat-resources') {
      includeCompatResources = true;
      continue;
    }

    if (arg === '--exclude-role') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --exclude-role');
      }

      excludeRoles.push(value);
      index += 1;
      continue;
    }

    if (arg === '--json') {
      json = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    schemas,
    legacyCodes: [...new Set(legacyCodes)],
    skipTemplate,
    includeHistoricalRoles,
    includeCompatResources,
    excludeRoles: [...new Set(excludeRoles)],
    json,
  };
}

function matchesSelectedResources(legacyCode: string, selectedLegacyCodes: string[]): boolean {
  if (selectedLegacyCodes.length === 0) {
    return true;
  }

  return selectedLegacyCodes.includes(legacyCode);
}

async function getTenantSchemasFromPublic(prisma: PrismaClient): Promise<string[]> {
  const tenants = await prisma.$queryRawUnsafe<Array<{ schema_name: string | null }>>(`
    SELECT schema_name
    FROM public.tenant
    WHERE schema_name IS NOT NULL
      AND schema_name != ''
    ORDER BY schema_name
  `);

  return tenants
    .map((tenant) => tenant.schema_name)
    .filter((schemaName): schemaName is string => Boolean(schemaName));
}

async function getTargetSchemas(
  prisma: PrismaClient,
  options: CliOptions,
): Promise<string[]> {
  if (options.schemas.length > 0) {
    return [...new Set(options.schemas)];
  }

  const schemas = await getTenantSchemasFromPublic(prisma);

  if (!options.skipTemplate) {
    schemas.unshift('tenant_template');
  }

  return [...new Set(schemas)];
}

function emptyResourceAudit(code: string): ResourceAudit {
  return {
    code,
    present: false,
    isActive: null,
    policyCount: 0,
    rolePolicyCount: 0,
    assignedRoleCount: 0,
    affectedUserCount: 0,
    roleCodes: [],
    grants: [],
  };
}

interface ResourceRow {
  id: string;
  is_active: boolean;
}

interface CountRow {
  count: bigint;
}

interface AssignmentCountRow {
  assignedRoleCount: bigint;
  affectedUserCount: bigint;
}

interface HistoricalRoleRow {
  roleCode: string;
  isActive: boolean;
  assignedUsers: bigint;
}

async function tableExists(
  prisma: PrismaClient,
  schemaName: string,
  tableName: string,
): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = $1
          AND table_name = $2
      ) AS exists
    `,
    schemaName,
    tableName,
  );

  return rows[0]?.exists ?? false;
}

async function getResourceAudit(
  prisma: PrismaClient,
  schemaName: string,
  resourceCode: string,
): Promise<ResourceAudit> {
  const resourceRows = await prisma.$queryRawUnsafe<ResourceRow[]>(
    `SELECT id, is_active FROM "${schemaName}".resource WHERE code = $1`,
    resourceCode,
  );

  if (resourceRows.length === 0) {
    return emptyResourceAudit(resourceCode);
  }

  const resource = resourceRows[0];
  const hasUserRoleTable = await tableExists(prisma, schemaName, 'user_role');

  const [policyRows, rolePolicyRows, assignmentRows, grants] = await Promise.all([
    prisma.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*)::bigint AS count FROM "${schemaName}".policy WHERE resource_id = CAST($1 AS uuid)`,
      resource.id,
    ),
    prisma.$queryRawUnsafe<CountRow[]>(
      `
        SELECT COUNT(*)::bigint AS count
        FROM "${schemaName}".role_policy rp
        JOIN "${schemaName}".policy p ON p.id = rp.policy_id
        WHERE p.resource_id = CAST($1 AS uuid)
      `,
      resource.id,
    ),
    hasUserRoleTable
      ? prisma.$queryRawUnsafe<AssignmentCountRow[]>(
          `
            SELECT
              COUNT(DISTINCT ur.id)::bigint AS "assignedRoleCount",
              COUNT(DISTINCT ur.user_id)::bigint AS "affectedUserCount"
            FROM "${schemaName}".user_role ur
            JOIN "${schemaName}".role_policy rp ON rp.role_id = ur.role_id
            JOIN "${schemaName}".policy p ON p.id = rp.policy_id
            WHERE p.resource_id = CAST($1 AS uuid)
          `,
          resource.id,
        )
      : Promise.resolve([{ assignedRoleCount: 0n, affectedUserCount: 0n }]),
    prisma.$queryRawUnsafe<ResourceGrantEntry[]>(
      `
        SELECT
          r.code AS "roleCode",
          p.action AS action,
          COALESCE(rp.effect, 'grant') AS effect
        FROM "${schemaName}".role_policy rp
        JOIN "${schemaName}".role r ON r.id = rp.role_id
        JOIN "${schemaName}".policy p ON p.id = rp.policy_id
        WHERE p.resource_id = CAST($1 AS uuid)
        GROUP BY r.code, p.action, COALESCE(rp.effect, 'grant')
        ORDER BY r.code, p.action, COALESCE(rp.effect, 'grant')
      `,
      resource.id,
    ),
  ]);

  const roleCodes = [...new Set(grants.map((grant) => grant.roleCode))];

  return {
    code: resourceCode,
    present: true,
    isActive: resource.is_active,
    policyCount: Number(policyRows[0]?.count ?? 0n),
    rolePolicyCount: Number(rolePolicyRows[0]?.count ?? 0n),
    assignedRoleCount: Number(assignmentRows[0]?.assignedRoleCount ?? 0n),
    affectedUserCount: Number(assignmentRows[0]?.affectedUserCount ?? 0n),
    roleCodes,
    grants,
  };
}

function emptyHistoricalRoleAudit(roleCode: string): HistoricalRoleAudit {
  return {
    roleCode,
    present: false,
    isActive: null,
    assignedUsers: 0,
  };
}

async function getHistoricalRoleAudits(
  prisma: PrismaClient,
  schemaName: string,
): Promise<HistoricalRoleAudit[]> {
  const hasRoleTable = await tableExists(prisma, schemaName, 'role');

  if (!hasRoleTable) {
    return HISTORICAL_ROLE_CODES.map((roleCode) => emptyHistoricalRoleAudit(roleCode));
  }

  const hasUserRoleTable = await tableExists(prisma, schemaName, 'user_role');
  const rows = await prisma.$queryRawUnsafe<HistoricalRoleRow[]>(
    `
      SELECT
        r.code AS "roleCode",
        r.is_active AS "isActive",
        ${hasUserRoleTable ? 'COUNT(DISTINCT ur.user_id)::bigint' : '0::bigint'} AS "assignedUsers"
      FROM "${schemaName}".role r
      ${hasUserRoleTable ? `LEFT JOIN "${schemaName}".user_role ur ON ur.role_id = r.id` : ''}
      WHERE r.code = ANY($1::text[])
      GROUP BY r.code, r.is_active
      ORDER BY r.code
    `,
    [...HISTORICAL_ROLE_CODES],
  );

  const rowMap = new Map(rows.map((row) => [row.roleCode, row]));

  return HISTORICAL_ROLE_CODES.map((roleCode) => {
    const row = rowMap.get(roleCode);

    if (!row) {
      return emptyHistoricalRoleAudit(roleCode);
    }

    return {
      roleCode,
      present: true,
      isActive: row.isActive,
      assignedUsers: Number(row.assignedUsers),
    };
  });
}

async function getCompatResourceAudits(
  prisma: PrismaClient,
  schemaName: string,
): Promise<CompatResourceAudit[]> {
  return Promise.all(
    COMPAT_RESOURCE_TARGETS.map(async (target) => ({
      code: target.code,
      note: target.note,
      resource: await getResourceAudit(prisma, schemaName, target.code),
    })),
  );
}

function formatGrant(grant: ResourceGrantEntry): string {
  return `${grant.roleCode}:${grant.action}:${grant.effect}`;
}

function getGrantRoleCode(grant: string): string {
  return grant.split(':', 1)[0] ?? grant;
}

function splitExcludedRoleLegacyOnlyGrants(
  legacyOnlyGrants: string[],
  excludeRoles: string[],
): {
  blockingLegacyOnlyGrants: string[];
  excludedLegacyOnlyGrants: string[];
  excludedRoles: string[];
} {
  if (excludeRoles.length === 0) {
    return {
      blockingLegacyOnlyGrants: legacyOnlyGrants,
      excludedLegacyOnlyGrants: [],
      excludedRoles: [],
    };
  }

  const excludedRoleSet = new Set(excludeRoles);
  const excludedLegacyOnlyGrants = legacyOnlyGrants.filter((grant) =>
    excludedRoleSet.has(getGrantRoleCode(grant)),
  );

  return {
    blockingLegacyOnlyGrants: legacyOnlyGrants.filter(
      (grant) => !excludedRoleSet.has(getGrantRoleCode(grant)),
    ),
    excludedLegacyOnlyGrants,
    excludedRoles: [...new Set(excludedLegacyOnlyGrants.map(getGrantRoleCode))],
  };
}

function splitLegacyOnlyGrants(
  legacyCode: string,
  legacyOnlyGrants: string[],
): {
  blockingLegacyOnlyGrants: string[];
  ignoredLegacyOnlyGrants: string[];
  ignoredReason: string | null;
} {
  const overgrantRule = LEGACY_OVERGRANT_RULES.get(legacyCode);

  if (!overgrantRule) {
    return {
      blockingLegacyOnlyGrants: legacyOnlyGrants,
      ignoredLegacyOnlyGrants: [],
      ignoredReason: null,
    };
  }

  const ignoredGrantSet = new Set(overgrantRule.ignoredLegacyOnlyGrants);
  const ignoredLegacyOnlyGrants = legacyOnlyGrants.filter((grant) => ignoredGrantSet.has(grant));

  return {
    blockingLegacyOnlyGrants: legacyOnlyGrants.filter((grant) => !ignoredGrantSet.has(grant)),
    ignoredLegacyOnlyGrants,
    ignoredReason: ignoredLegacyOnlyGrants.length > 0 ? overgrantRule.reason : null,
  };
}

function compareTarget(
  target: LegacyResourceTarget,
  legacy: ResourceAudit,
  canonicalResources: ResourceAudit[],
  options: Pick<CliOptions, 'excludeRoles'>,
): LegacyTargetAudit {
  const canonicalCodes = getCanonicalCodes(target);
  const primaryCanonical = canonicalResources[0] ?? null;
  const missingCanonicalCodes = canonicalResources
    .filter((resource) => !resource.present)
    .map((resource) => resource.code);
  const canonicalGrantSet = new Set(
    canonicalResources.flatMap((resource) => resource.grants.map(formatGrant)),
  );

  if (!legacy.present) {
    return {
      legacyCode: target.legacyCode,
      canonicalCode: target.canonicalCode,
      canonicalCodes,
      note: target.note,
      legacy,
      canonical: primaryCanonical,
      canonicalResources,
      missingCanonicalCodes,
      legacyOnlyGrants: [],
      ignoredLegacyOnlyGrants: [],
      excludedLegacyOnlyGrants: [],
      canonicalOnlyGrants: [...canonicalGrantSet],
      readiness: 'absent',
      reason: 'Legacy resource is already absent in this schema.',
    };
  }

  if (canonicalCodes.length === 0) {
    return {
      legacyCode: target.legacyCode,
      canonicalCode: target.canonicalCode,
      canonicalCodes,
      note: target.note,
      legacy,
      canonical: primaryCanonical,
      canonicalResources,
      missingCanonicalCodes,
      legacyOnlyGrants: legacy.grants.map(formatGrant),
      ignoredLegacyOnlyGrants: [],
      excludedLegacyOnlyGrants: [],
      canonicalOnlyGrants: [],
      readiness: 'legacy_unmapped',
      reason: target.note,
    };
  }

  if (missingCanonicalCodes.length > 0) {
    return {
      legacyCode: target.legacyCode,
      canonicalCode: target.canonicalCode,
      canonicalCodes,
      note: target.note,
      legacy,
      canonical: primaryCanonical,
      canonicalResources,
      missingCanonicalCodes,
      legacyOnlyGrants: legacy.grants.map(formatGrant),
      ignoredLegacyOnlyGrants: [],
      excludedLegacyOnlyGrants: [],
      canonicalOnlyGrants: [...canonicalGrantSet],
      readiness: 'blocked_by_canonical_gap',
      reason: `Canonical resources missing in this schema: ${missingCanonicalCodes.join(', ')}.`,
    };
  }

  const legacyGrantSet = new Set(legacy.grants.map(formatGrant));
  const legacyOnlyGrants = [...legacyGrantSet].filter((grant) => !canonicalGrantSet.has(grant));
  const {
    blockingLegacyOnlyGrants: exclusionFilteredLegacyOnlyGrants,
    excludedLegacyOnlyGrants,
    excludedRoles,
  } = splitExcludedRoleLegacyOnlyGrants(legacyOnlyGrants, options.excludeRoles);
  const canonicalOnlyGrants = [...canonicalGrantSet].filter((grant) => !legacyGrantSet.has(grant));
  const {
    blockingLegacyOnlyGrants,
    ignoredLegacyOnlyGrants,
    ignoredReason,
  } = splitLegacyOnlyGrants(target.legacyCode, exclusionFilteredLegacyOnlyGrants);
  const exclusionReason =
    excludedRoles.length > 0
      ? `Explicit exclusion ignored legacy-only grants from roles: ${excludedRoles.join(', ')}.`
      : null;
  const combinedIgnoredReason = [exclusionReason, ignoredReason].filter(Boolean).join(' ');

  if (blockingLegacyOnlyGrants.length > 0) {
    return {
      legacyCode: target.legacyCode,
      canonicalCode: target.canonicalCode,
      canonicalCodes,
      note: target.note,
      legacy,
      canonical: primaryCanonical,
      canonicalResources,
      missingCanonicalCodes,
      legacyOnlyGrants: blockingLegacyOnlyGrants,
      ignoredLegacyOnlyGrants,
      excludedLegacyOnlyGrants,
      canonicalOnlyGrants,
      readiness: 'blocked_by_canonical_gap',
      reason: 'Canonical grant set does not yet cover all legacy role/action/effect entries.',
    };
  }

  if (legacy.assignedRoleCount > 0 || legacy.affectedUserCount > 0) {
    return {
      legacyCode: target.legacyCode,
      canonicalCode: target.canonicalCode,
      canonicalCodes,
      note: target.note,
      legacy,
      canonical: primaryCanonical,
      canonicalResources,
      missingCanonicalCodes,
      legacyOnlyGrants: blockingLegacyOnlyGrants,
      ignoredLegacyOnlyGrants,
      excludedLegacyOnlyGrants,
      canonicalOnlyGrants,
      readiness: 'covered_requires_snapshot_refresh',
      reason: combinedIgnoredReason
        ? `${combinedIgnoredReason} Assigned roles/users still exist and would require runtime verification plus snapshot refresh after prune.`
        : 'Canonical grant set covers legacy entries, but assigned roles/users still exist and would require runtime verification plus snapshot refresh after prune.',
    };
  }

  return {
    legacyCode: target.legacyCode,
    canonicalCode: target.canonicalCode,
    canonicalCodes,
    note: target.note,
    legacy,
    canonical: primaryCanonical,
    canonicalResources,
    missingCanonicalCodes,
    legacyOnlyGrants: blockingLegacyOnlyGrants,
    ignoredLegacyOnlyGrants,
    excludedLegacyOnlyGrants,
    canonicalOnlyGrants,
    readiness: 'covered_unassigned',
    reason: combinedIgnoredReason
      ? `${combinedIgnoredReason} No assigned roles/users currently depend on this legacy resource.`
      : 'Canonical grant set covers legacy entries and no assigned roles/users currently depend on this legacy resource.',
  };
}

export async function auditSchema(
  prisma: PrismaClient,
  schemaName: string,
  options: CliOptions,
): Promise<SchemaLegacyAudit> {
  const targets = await Promise.all(
    LEGACY_RESOURCE_TARGETS
      .filter((target) => matchesSelectedResources(target.legacyCode, options.legacyCodes))
      .map(async (target) => {
      const legacy = await getResourceAudit(prisma, schemaName, target.legacyCode);
      const canonicalResources = await Promise.all(
        getCanonicalCodes(target).map((canonicalCode) =>
          getResourceAudit(prisma, schemaName, canonicalCode),
        ),
      );

      return compareTarget(target, legacy, canonicalResources, options);
    }),
  );
  const historicalRoles = options.includeHistoricalRoles
    ? await getHistoricalRoleAudits(prisma, schemaName)
    : [];
  const compatResources = options.includeCompatResources
    ? await getCompatResourceAudits(prisma, schemaName)
    : [];

  return {
    schemaName,
    targets,
    historicalRoles,
    compatResources,
  };
}

export async function auditLegacyRbac(
  prisma: PrismaClient,
  options: CliOptions,
): Promise<LegacyRbacAuditSummary> {
  const schemas = await getTargetSchemas(prisma, options);
  const audited: SchemaLegacyAudit[] = [];
  const skipped: SkippedSchemaAudit[] = [];

  for (const schemaName of schemas) {
    const failureReason = await getSchemaSyncFailureReason(prisma, schemaName);

    if (failureReason) {
      skipped.push({ schemaName, reason: failureReason });
      continue;
    }

    audited.push(await auditSchema(prisma, schemaName, options));
  }

  return {
    audited,
    skipped,
  };
}

function printSummary(summary: LegacyRbacAuditSummary): void {
  for (const schemaAudit of summary.audited) {
    console.log(`\nSchema: ${schemaAudit.schemaName}`);

    if (schemaAudit.historicalRoles.length > 0) {
      console.log(
        'Historical roles (separate from resource-level assignedRoles/affectedUsers counts):',
      );

      for (const role of schemaAudit.historicalRoles) {
        if (!role.present) {
          console.log(`- ${role.roleCode}: absent`);
          continue;
        }

        console.log(
          `- ${role.roleCode}: active=${String(role.isActive)} assignedUsers=${role.assignedUsers}`,
        );
      }
    }

    if (schemaAudit.compatResources.length > 0) {
      console.log('Compat resources (legacy fallback / pre-catalog codes):');

      for (const compatResource of schemaAudit.compatResources) {
        if (!compatResource.resource.present) {
          console.log(`- ${compatResource.code}: absent`);
          continue;
        }

        console.log(
          `- ${compatResource.code}: active=${String(compatResource.resource.isActive)} policies=${compatResource.resource.policyCount} rolePolicies=${compatResource.resource.rolePolicyCount} assignedRoles=${compatResource.resource.assignedRoleCount} affectedUsers=${compatResource.resource.affectedUserCount}`,
        );

        if (compatResource.resource.roleCodes.length > 0) {
          console.log(`  roles: ${compatResource.resource.roleCodes.join(', ')}`);
        }

        console.log(`  note: ${compatResource.note}`);
      }
    }

    for (const target of schemaAudit.targets) {
      const canonicalLabel = formatCanonicalLabel(target);
      console.log(`- ${target.legacyCode} -> ${canonicalLabel} [${target.readiness}]`);

      if (target.legacy.present) {
        console.log(
          `  legacy active=${String(target.legacy.isActive)} policies=${target.legacy.policyCount} rolePolicies=${target.legacy.rolePolicyCount} assignedRoles=${target.legacy.assignedRoleCount} affectedUsers=${target.legacy.affectedUserCount}`,
        );
      } else {
        console.log('  legacy resource absent');
      }

      if (target.legacy.roleCodes.length > 0) {
        console.log(`  legacy roles: ${target.legacy.roleCodes.join(', ')}`);
      }

      for (const canonical of target.canonicalResources) {
        if (!canonical.present) {
          continue;
        }

        console.log(
          `  canonical ${canonical.code} active=${String(canonical.isActive)} policies=${canonical.policyCount} rolePolicies=${canonical.rolePolicyCount} assignedRoles=${canonical.assignedRoleCount} affectedUsers=${canonical.affectedUserCount}`,
        );
      }

      if (target.missingCanonicalCodes.length > 0) {
        console.log(`  missing canonical resources: ${target.missingCanonicalCodes.join(', ')}`);
      }

      if (target.legacyOnlyGrants.length > 0) {
        console.log(`  legacy-only grants: ${target.legacyOnlyGrants.join(', ')}`);
      }

      if (target.ignoredLegacyOnlyGrants.length > 0) {
        console.log(`  ignored legacy-only grants: ${target.ignoredLegacyOnlyGrants.join(', ')}`);
      }

      if (target.excludedLegacyOnlyGrants.length > 0) {
        console.log(`  excluded-role legacy-only grants: ${target.excludedLegacyOnlyGrants.join(', ')}`);
      }

      if (target.canonicalOnlyGrants.length > 0) {
        console.log(`  canonical-only grants: ${target.canonicalOnlyGrants.join(', ')}`);
      }

      console.log(`  note: ${target.reason}`);
    }
  }

  if (summary.skipped.length > 0) {
    console.log('\nSkipped schemas:');

    for (const skipped of summary.skipped) {
      console.log(`- ${skipped.schemaName}: ${skipped.reason}`);
    }
  }
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const options = parseCliArgs(process.argv.slice(2));

  try {
    const summary = await auditLegacyRbac(prisma, options);

    if (options.json) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    printSummary(summary);
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
    console.error('Legacy RBAC audit failed:', error);
    process.exit(1);
  });
}
