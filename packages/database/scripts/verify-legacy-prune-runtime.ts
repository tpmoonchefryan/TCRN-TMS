// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Read-only runtime proof for legacy RBAC prune targets with live affected users.
//
// This verifier is intentionally narrow:
// - requires exactly one schema
// - requires exactly one legacy resource
// - requires explicit affected-user allowlisting
// - proves current Redis snapshots already contain the canonical resource fields
//   that would carry the runtime behavior after prune

import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { fileURLToPath } from 'node:url';

import {
  auditLegacyRbac,
  formatCanonicalLabel,
  getCanonicalCodes,
  type LegacyTargetAudit,
} from './audit-legacy-rbac';
import {
  REDIS_URL,
  calculateEffectivePermissions,
  getScopeChain,
  getSnapshotKey,
  getUserRoleAssignments,
  getUserScopes,
  type ScopeDescriptor,
} from './refresh-permission-snapshots';

export interface CliOptions {
  schemas: string[];
  legacyCodes: string[];
  allowUsers: string[];
  json: boolean;
}

type RuntimeVerificationStatus =
  | 'verified'
  | 'not_required'
  | 'blocked_target_not_covered'
  | 'blocked_missing_allowlist'
  | 'blocked_unlisted_affected_users'
  | 'blocked_unmatched_allowlist'
  | 'blocked_runtime_mismatch';

interface AffectedUser {
  userId: string;
  username: string;
}

interface ScopeRuntimeProof {
  snapshotKey: string;
  expectedFieldCount: number;
  mismatches: Array<{
    field: string;
    expected: 'grant' | 'deny';
    actual: string | null;
  }>;
}

export interface UserRuntimeProof {
  userId: string;
  username: string;
  allowlisted: boolean;
  expectedFieldCount: number;
  verified: boolean;
  scopes: ScopeRuntimeProof[];
  reason: string;
}

export interface RuntimeProofTargetSummary {
  schemaName: string;
  legacyCode: string;
  canonicalCode: string | null;
  canonicalCodes: string[];
  readinessBefore: LegacyTargetAudit['readiness'];
  verificationStatus: RuntimeVerificationStatus;
  verified: boolean;
  reason: string;
  affectedUsers: AffectedUser[];
  unallowlistedAffectedUsers: AffectedUser[];
  unmatchedAllowlistEntries: string[];
  users: UserRuntimeProof[];
}

export interface RuntimeProofSummary {
  filters: {
    schemas: string[];
    legacyCodes: string[];
    allowUsers: string[];
  };
  target: RuntimeProofTargetSummary;
}

function parseCliArgs(argv: string[]): CliOptions {
  const schemas: string[] = [];
  const legacyCodes: string[] = [];
  const allowUsers: string[] = [];
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

    if (arg === '--allow-user') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --allow-user');
      }

      allowUsers.push(value);
      index += 1;
      continue;
    }

    if (arg === '--json') {
      json = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (schemas.length !== 1) {
    throw new Error('Runtime proof requires exactly one explicit --schema.');
  }

  if (legacyCodes.length !== 1) {
    throw new Error('Runtime proof requires exactly one explicit --resource.');
  }

  return {
    schemas: [...new Set(schemas)],
    legacyCodes: [...new Set(legacyCodes)],
    allowUsers: [...new Set(allowUsers)],
    json,
  };
}

function matchesUserFilter(user: AffectedUser, filters: string[]): boolean {
  return filters.includes(user.userId) || filters.includes(user.username);
}

async function getAffectedUsersForResource(
  prisma: PrismaClient,
  schemaName: string,
  resourceCode: string,
): Promise<AffectedUser[]> {
  return prisma.$queryRawUnsafe<AffectedUser[]>(
    `
      SELECT DISTINCT
        su.id AS "userId",
        su.username AS username
      FROM "${schemaName}".user_role ur
      JOIN "${schemaName}".role_policy rp ON rp.role_id = ur.role_id
      JOIN "${schemaName}".policy p ON p.id = rp.policy_id
      JOIN "${schemaName}".resource r ON r.id = p.resource_id
      JOIN "${schemaName}".system_user su ON su.id = ur.user_id
      WHERE r.code = $1
        AND su.is_active = true
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      ORDER BY su.username, su.id
    `,
    resourceCode,
  );
}

function getVerificationScopes(scopes: ScopeDescriptor[]): ScopeDescriptor[] {
  const ordered: ScopeDescriptor[] = [{ type: 'tenant', id: null }];
  const seen = new Set(['tenant:null']);

  for (const scope of scopes) {
    const key = `${scope.type}:${scope.id}`;

    if (scope.type === 'tenant' || seen.has(key)) {
      continue;
    }

    ordered.push(scope);
    seen.add(key);
  }

  return ordered;
}

async function verifyUserRuntimeProof(
  prisma: PrismaClient,
  redis: Redis,
  schemaName: string,
  canonicalCodes: string[],
  user: AffectedUser,
  allowlisted: boolean,
): Promise<UserRuntimeProof> {
  if (!allowlisted) {
    return {
      userId: user.userId,
      username: user.username,
      allowlisted,
      expectedFieldCount: 0,
      verified: false,
      scopes: [],
      reason: 'Affected user is not explicitly allowlisted for runtime proof.',
    };
  }

  const assignments = await getUserRoleAssignments(prisma, schemaName, user.userId);
  const scopes = getVerificationScopes(await getUserScopes(prisma, schemaName, user.userId));
  const proofs: ScopeRuntimeProof[] = [];
  let expectedFieldCount = 0;

  for (const scope of scopes) {
    const scopeChain = await getScopeChain(prisma, schemaName, scope.type, scope.id);
    const permissions = await calculateEffectivePermissions(
      prisma,
      schemaName,
      assignments,
      scopeChain,
      scope.type,
      scope.id,
    );

    const expectedEntries = Object.entries(permissions).filter(([key]) =>
      canonicalCodes.some((canonicalCode) => key.startsWith(`${canonicalCode}:`)),
    );

    if (expectedEntries.length === 0) {
      continue;
    }

    const snapshotKey = getSnapshotKey(schemaName, user.userId, scope.type, scope.id);
    const actualValues = await redis.hmget(
      snapshotKey,
      ...expectedEntries.map(([field]) => field),
    );
    const mismatches = expectedEntries.flatMap(([field, expected], index) => {
      const actual = actualValues[index];

      if (actual === expected) {
        return [];
      }

      return [{ field, expected, actual }];
    });

    expectedFieldCount += expectedEntries.length;
    proofs.push({
      snapshotKey,
      expectedFieldCount: expectedEntries.length,
      mismatches,
    });
  }

  if (expectedFieldCount === 0) {
    return {
      userId: user.userId,
      username: user.username,
      allowlisted,
      expectedFieldCount: 0,
      verified: false,
      scopes: [],
      reason:
        `No canonical ${canonicalCodes.join(', ')} snapshot fields were expected for this user.`,
    };
  }

  const mismatchCount = proofs.reduce((sum, scope) => sum + scope.mismatches.length, 0);

  return {
    userId: user.userId,
    username: user.username,
    allowlisted,
    expectedFieldCount,
    verified: mismatchCount === 0,
    scopes: proofs,
    reason:
      mismatchCount === 0
        ? 'Canonical snapshot fields match Redis for all relevant scopes.'
        : `Found ${mismatchCount} canonical snapshot mismatches in Redis.`,
  };
}

function findTargetOrThrow(
  targetAudits: LegacyTargetAudit[],
  legacyCode: string,
): LegacyTargetAudit {
  const target = targetAudits.find((item) => item.legacyCode === legacyCode);

  if (!target) {
    throw new Error(`Legacy target ${legacyCode} was not returned by the audit.`);
  }

  return target;
}

export async function verifyLegacyPruneRuntime(
  prisma: PrismaClient,
  options: CliOptions,
): Promise<RuntimeProofSummary> {
  const auditSummary = await auditLegacyRbac(prisma, {
    schemas: options.schemas,
    skipTemplate: false,
    includeHistoricalRoles: false,
    includeCompatResources: false,
    json: false,
  });

  if (auditSummary.skipped.length > 0) {
    throw new Error(
      `Runtime proof refused because some schemas were skipped: ${auditSummary.skipped.map((item) => `${item.schemaName} (${item.reason})`).join(', ')}`,
    );
  }

  const schemaAudit = auditSummary.audited[0];
  const target = findTargetOrThrow(schemaAudit.targets, options.legacyCodes[0]);
  const canonicalCodes = getCanonicalCodes(target);
  const canonicalLabel = formatCanonicalLabel(target);
  const affectedUsers = await getAffectedUsersForResource(
    prisma,
    options.schemas[0],
    options.legacyCodes[0],
  );
  const unallowlistedAffectedUsers = affectedUsers.filter(
    (user) => !matchesUserFilter(user, options.allowUsers),
  );
  const unmatchedAllowlistEntries = options.allowUsers.filter(
    (value) => !affectedUsers.some((user) => matchesUserFilter(user, [value])),
  );

  if (canonicalCodes.length === 0) {
    return {
      filters: {
        schemas: options.schemas,
        legacyCodes: options.legacyCodes,
        allowUsers: options.allowUsers,
      },
      target: {
        schemaName: options.schemas[0],
        legacyCode: target.legacyCode,
        canonicalCode: target.canonicalCode,
        canonicalCodes,
        readinessBefore: target.readiness,
        verificationStatus: 'blocked_target_not_covered',
        verified: false,
        reason: 'Selected legacy target does not have a canonical replacement.',
        affectedUsers,
        unallowlistedAffectedUsers,
        unmatchedAllowlistEntries,
        users: [],
      },
    };
  }

  if (!['covered_requires_snapshot_refresh', 'covered_unassigned'].includes(target.readiness)) {
    return {
      filters: {
        schemas: options.schemas,
        legacyCodes: options.legacyCodes,
        allowUsers: options.allowUsers,
      },
      target: {
        schemaName: options.schemas[0],
        legacyCode: target.legacyCode,
        canonicalCode: target.canonicalCode,
        canonicalCodes,
        readinessBefore: target.readiness,
        verificationStatus: 'blocked_target_not_covered',
        verified: false,
        reason: `Selected target is ${target.readiness}, not a canonical-covered candidate.`,
        affectedUsers,
        unallowlistedAffectedUsers,
        unmatchedAllowlistEntries,
        users: [],
      },
    };
  }

  if (affectedUsers.length === 0) {
    return {
      filters: {
        schemas: options.schemas,
        legacyCodes: options.legacyCodes,
        allowUsers: options.allowUsers,
      },
      target: {
        schemaName: options.schemas[0],
        legacyCode: target.legacyCode,
        canonicalCode: target.canonicalCode,
        canonicalCodes,
        readinessBefore: target.readiness,
        verificationStatus: 'not_required',
        verified: true,
        reason: 'Selected target has no currently affected users; runtime proof is not required.',
        affectedUsers,
        unallowlistedAffectedUsers,
        unmatchedAllowlistEntries,
        users: [],
      },
    };
  }

  if (options.allowUsers.length === 0) {
    return {
      filters: {
        schemas: options.schemas,
        legacyCodes: options.legacyCodes,
        allowUsers: options.allowUsers,
      },
      target: {
        schemaName: options.schemas[0],
        legacyCode: target.legacyCode,
        canonicalCode: target.canonicalCode,
        canonicalCodes,
        readinessBefore: target.readiness,
        verificationStatus: 'blocked_missing_allowlist',
        verified: false,
        reason: 'Affected users exist, so runtime proof requires explicit --allow-user entries.',
        affectedUsers,
        unallowlistedAffectedUsers,
        unmatchedAllowlistEntries,
        users: [],
      },
    };
  }

  if (unallowlistedAffectedUsers.length > 0) {
    return {
      filters: {
        schemas: options.schemas,
        legacyCodes: options.legacyCodes,
        allowUsers: options.allowUsers,
      },
      target: {
        schemaName: options.schemas[0],
        legacyCode: target.legacyCode,
        canonicalCode: target.canonicalCode,
        canonicalCodes,
        readinessBefore: target.readiness,
        verificationStatus: 'blocked_unlisted_affected_users',
        verified: false,
        reason: 'Some affected users were not explicitly allowlisted for runtime proof.',
        affectedUsers,
        unallowlistedAffectedUsers,
        unmatchedAllowlistEntries,
        users: [],
      },
    };
  }

  if (unmatchedAllowlistEntries.length > 0) {
    return {
      filters: {
        schemas: options.schemas,
        legacyCodes: options.legacyCodes,
        allowUsers: options.allowUsers,
      },
      target: {
        schemaName: options.schemas[0],
        legacyCode: target.legacyCode,
        canonicalCode: target.canonicalCode,
        canonicalCodes,
        readinessBefore: target.readiness,
        verificationStatus: 'blocked_unmatched_allowlist',
        verified: false,
        reason: 'Some --allow-user entries do not map to currently affected users for this target.',
        affectedUsers,
        unallowlistedAffectedUsers,
        unmatchedAllowlistEntries,
        users: [],
      },
    };
  }

  const redis = new Redis(REDIS_URL);

  try {
    const users = await Promise.all(
      affectedUsers.map((user) =>
        verifyUserRuntimeProof(
          prisma,
          redis,
          options.schemas[0],
          canonicalCodes,
          user,
          true,
        ),
      ),
    );

    const verified = users.every((user) => user.verified);

    return {
      filters: {
        schemas: options.schemas,
        legacyCodes: options.legacyCodes,
        allowUsers: options.allowUsers,
      },
      target: {
        schemaName: options.schemas[0],
        legacyCode: target.legacyCode,
        canonicalCode: target.canonicalCode,
        canonicalCodes,
        readinessBefore: target.readiness,
        verificationStatus: verified ? 'verified' : 'blocked_runtime_mismatch',
        verified,
        reason: verified
          ? `All allowlisted affected users already have matching canonical Redis snapshot fields for ${canonicalLabel}.`
          : `Some allowlisted affected users still have canonical Redis snapshot mismatches for ${canonicalLabel}.`,
        affectedUsers,
        unallowlistedAffectedUsers,
        unmatchedAllowlistEntries,
        users,
      },
    };
  } finally {
    await redis.quit();
  }
}

function printSummary(summary: RuntimeProofSummary): void {
  const target = summary.target;

  console.log(`Schema: ${target.schemaName}`);
  console.log(`Legacy resource: ${target.legacyCode}`);
  console.log(`Canonical resources: ${formatCanonicalLabel(target)}`);
  console.log(`Readiness before proof: ${target.readinessBefore}`);
  console.log(`Verification status: ${target.verificationStatus}`);
  console.log(`Verified: ${String(target.verified)}`);
  console.log(`Reason: ${target.reason}`);

  if (summary.filters.allowUsers.length > 0) {
    console.log(`Allowlisted users: ${summary.filters.allowUsers.join(', ')}`);
  }

  if (target.affectedUsers.length > 0) {
    console.log('Affected users:');

    for (const user of target.affectedUsers) {
      console.log(`- ${user.username} (${user.userId})`);
    }
  }

  if (target.unallowlistedAffectedUsers.length > 0) {
    console.log('Unallowlisted affected users:');

    for (const user of target.unallowlistedAffectedUsers) {
      console.log(`- ${user.username} (${user.userId})`);
    }
  }

  if (target.unmatchedAllowlistEntries.length > 0) {
    console.log(`Unmatched allowlist entries: ${target.unmatchedAllowlistEntries.join(', ')}`);
  }

  for (const user of target.users) {
    console.log(`\nUser: ${user.username} [verified=${String(user.verified)}]`);
    console.log(`- reason: ${user.reason}`);
    console.log(`- expected canonical fields: ${user.expectedFieldCount}`);

    for (const scope of user.scopes) {
      console.log(`  ${scope.snapshotKey}: expected=${scope.expectedFieldCount} mismatches=${scope.mismatches.length}`);

      for (const mismatch of scope.mismatches) {
        console.log(`    ${mismatch.field}: expected=${mismatch.expected} actual=${mismatch.actual ?? 'NULL'}`);
      }
    }
  }
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const options = parseCliArgs(process.argv.slice(2));

  try {
    const summary = await verifyLegacyPruneRuntime(prisma, options);

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
    console.error('Legacy prune runtime proof failed:', error);
    process.exit(1);
  });
}
