// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Read-only audit for Redis permission snapshot fields.
//
// Goal:
// - classify current snapshot fields as canonical, reserved wildcard, or drift
// - surface legacy/unsupported keys without changing runtime authorization
// - provide evidence before tightening internal snapshot calculation paths

import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { fileURLToPath } from 'node:url';
import {
  getRbacResourceDefinition,
  isCanonicalPermissionAction,
} from '@tcrn/shared';

import { REDIS_URL } from './refresh-permission-snapshots';
import { getSchemaSyncFailureReason } from './sync-rbac-contract';

interface CliOptions {
  schemas: string[];
  users: string[];
  json: boolean;
}

type FieldClassification =
  | 'canonical_valid'
  | 'reserved_wildcard'
  | 'legacy_resource'
  | 'invalid_action'
  | 'unsupported_action'
  | 'non_reserved_wildcard'
  | 'malformed_key';

interface ClassificationCounts {
  canonicalValid: number;
  reservedWildcard: number;
  legacyResource: number;
  invalidAction: number;
  unsupportedAction: number;
  nonReservedWildcard: number;
  malformedKey: number;
  invalidEffect: number;
}

interface SnapshotFieldAnomaly {
  field: string;
  value: string;
  classification: Exclude<FieldClassification, 'canonical_valid' | 'reserved_wildcard'> | 'invalid_effect';
  reason: string;
  effectValid: boolean;
}

interface SnapshotFieldAnalysis {
  classification: FieldClassification;
  reason: string;
  effectValid: boolean;
}

interface SnapshotKeyInfo {
  snapshotKey: string;
  userId: string;
  scopeType: string | null;
  scopeId: string | null;
}

interface SnapshotAudit {
  snapshotKey: string;
  userId: string;
  username: string | null;
  scopeType: string | null;
  scopeId: string | null;
  totalFields: number;
  anomalyFieldCount: number;
  counts: ClassificationCounts;
  anomalies: SnapshotFieldAnomaly[];
}

type SnapshotDriftReadiness =
  | 'clean'
  | 'legacy_resource_only'
  | 'unsupported_action_only'
  | 'mixed_drift'
  | 'invalid_snapshot_fields';

interface UserSnapshotAudit {
  userId: string;
  username: string | null;
  readiness: SnapshotDriftReadiness;
  snapshotCount: number;
  totalFields: number;
  anomalyFieldCount: number;
  counts: ClassificationCounts;
  snapshots: SnapshotAudit[];
}

interface SchemaSnapshotAudit {
  schemaName: string;
  readiness: SnapshotDriftReadiness;
  snapshotCount: number;
  userCount: number;
  totalFields: number;
  anomalyFieldCount: number;
  counts: ClassificationCounts;
  unmatchedUserFilters: string[];
  users: UserSnapshotAudit[];
}

interface SkippedSchemaAudit {
  schemaName: string;
  reason: string;
}

interface SnapshotAuditSummary {
  filters: {
    schemas: string[];
    users: string[];
  };
  audited: SchemaSnapshotAudit[];
  skipped: SkippedSchemaAudit[];
}

function createEmptyCounts(): ClassificationCounts {
  return {
    canonicalValid: 0,
    reservedWildcard: 0,
    legacyResource: 0,
    invalidAction: 0,
    unsupportedAction: 0,
    nonReservedWildcard: 0,
    malformedKey: 0,
    invalidEffect: 0,
  };
}

function mergeCounts(target: ClassificationCounts, source: ClassificationCounts): void {
  target.canonicalValid += source.canonicalValid;
  target.reservedWildcard += source.reservedWildcard;
  target.legacyResource += source.legacyResource;
  target.invalidAction += source.invalidAction;
  target.unsupportedAction += source.unsupportedAction;
  target.nonReservedWildcard += source.nonReservedWildcard;
  target.malformedKey += source.malformedKey;
  target.invalidEffect += source.invalidEffect;
}

function cloneCounts(source: ClassificationCounts): ClassificationCounts {
  return {
    canonicalValid: source.canonicalValid,
    reservedWildcard: source.reservedWildcard,
    legacyResource: source.legacyResource,
    invalidAction: source.invalidAction,
    unsupportedAction: source.unsupportedAction,
    nonReservedWildcard: source.nonReservedWildcard,
    malformedKey: source.malformedKey,
    invalidEffect: source.invalidEffect,
  };
}

function getReadiness(counts: ClassificationCounts): SnapshotDriftReadiness {
  const hasInvalidFields =
    counts.invalidAction > 0 ||
    counts.nonReservedWildcard > 0 ||
    counts.malformedKey > 0 ||
    counts.invalidEffect > 0;

  if (hasInvalidFields) {
    return 'invalid_snapshot_fields';
  }

  const hasLegacyResources = counts.legacyResource > 0;
  const hasUnsupportedActions = counts.unsupportedAction > 0;

  if (!hasLegacyResources && !hasUnsupportedActions) {
    return 'clean';
  }

  if (hasLegacyResources && !hasUnsupportedActions) {
    return 'legacy_resource_only';
  }

  if (!hasLegacyResources && hasUnsupportedActions) {
    return 'unsupported_action_only';
  }

  return 'mixed_drift';
}

function parseCliArgs(argv: string[]): CliOptions {
  const schemas: string[] = [];
  const users: string[] = [];
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

    if (arg === '--user') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('Missing value for --user');
      }

      users.push(value);
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
    schemas: [...new Set(schemas)],
    users: [...new Set(users)],
    json,
  };
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

async function getSchemaAuditFailureReason(
  prisma: PrismaClient,
  schemaName: string,
): Promise<string | null> {
  const syncFailureReason = await getSchemaSyncFailureReason(prisma, schemaName);

  if (syncFailureReason) {
    return syncFailureReason;
  }

  if (!(await tableExists(prisma, schemaName, 'system_user'))) {
    return `Schema ${schemaName} is missing system_user.`;
  }

  return null;
}

async function getTargetSchemas(
  prisma: PrismaClient,
  options: CliOptions,
): Promise<string[]> {
  if (options.schemas.length > 0) {
    return options.schemas;
  }

  const tenants = await prisma.$queryRaw<Array<{ schemaName: string | null }>>`
    SELECT schema_name AS "schemaName"
    FROM public.tenant
    WHERE is_active = true
      AND schema_name IS NOT NULL
      AND schema_name != ''
    ORDER BY schema_name
  `;

  return tenants
    .map((tenant) => tenant.schemaName)
    .filter((schemaName): schemaName is string => Boolean(schemaName));
}

async function scanKeys(redis: Redis, pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';

  do {
    const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
    cursor = nextCursor;
    keys.push(...batch);
  } while (cursor !== '0');

  return keys;
}

function parseSnapshotKey(snapshotKey: string, schemaName: string): SnapshotKeyInfo | null {
  const parts = snapshotKey.split(':');

  if (parts.length === 3 && parts[0] === 'perm' && parts[1] === schemaName) {
    return {
      snapshotKey,
      userId: parts[2],
      scopeType: null,
      scopeId: null,
    };
  }

  if (parts.length === 5 && parts[0] === 'perm' && parts[1] === schemaName) {
    return {
      snapshotKey,
      userId: parts[2],
      scopeType: parts[3],
      scopeId: parts[4] === 'null' ? null : parts[4],
    };
  }

  return null;
}

async function getUsernameMap(
  prisma: PrismaClient,
  schemaName: string,
  userIds: string[],
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();

  if (userIds.length === 0) {
    return result;
  }

  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; username: string | null }>>(
    `
      SELECT id::text AS id, username
      FROM "${schemaName}".system_user
      WHERE id::text = ANY($1::text[])
    `,
    userIds,
  );

  for (const row of rows) {
    result.set(row.id, row.username);
  }

  return result;
}

function analyzeSnapshotField(field: string, value: string): SnapshotFieldAnalysis {
  const effectValid = value === 'grant' || value === 'deny';
  const [resourceCode, action, ...rest] = field.split(':');

  if (!resourceCode || !action || rest.length > 0) {
    return {
      classification: 'malformed_key',
      reason: 'Permission key must have exactly one ":" separator.',
      effectValid,
    };
  }

  if (resourceCode === '*') {
    if (action === 'admin' || action === '*') {
      return {
        classification: 'reserved_wildcard',
        reason: 'Reserved wildcard key remains part of the outward/runtime contract.',
        effectValid,
      };
    }

    return {
      classification: 'non_reserved_wildcard',
      reason: 'Only *:admin and *:* are reserved wildcard keys.',
      effectValid,
    };
  }

  if (action === '*') {
    return {
      classification: 'non_reserved_wildcard',
      reason: 'Resource-scoped wildcard keys are not part of the canonical snapshot contract.',
      effectValid,
    };
  }

  const resourceDefinition = getRbacResourceDefinition(resourceCode);

  if (!resourceDefinition) {
    return {
      classification: 'legacy_resource',
      reason: 'Resource code is not present in the shared RBAC catalog.',
      effectValid,
    };
  }

  if (!isCanonicalPermissionAction(action)) {
    return {
      classification: 'invalid_action',
      reason: 'Action is not one of the canonical stored RBAC actions.',
      effectValid,
    };
  }

  if (!resourceDefinition.supportedActions.includes(action)) {
    return {
      classification: 'unsupported_action',
      reason: 'Resource exists, but this action is not supported by its catalog definition.',
      effectValid,
    };
  }

  return {
    classification: 'canonical_valid',
    reason: 'Catalog-backed canonical permission key.',
    effectValid,
  };
}

function incrementCounts(counts: ClassificationCounts, analysis: SnapshotFieldAnalysis): void {
  switch (analysis.classification) {
    case 'canonical_valid':
      counts.canonicalValid += 1;
      break;
    case 'reserved_wildcard':
      counts.reservedWildcard += 1;
      break;
    case 'legacy_resource':
      counts.legacyResource += 1;
      break;
    case 'invalid_action':
      counts.invalidAction += 1;
      break;
    case 'unsupported_action':
      counts.unsupportedAction += 1;
      break;
    case 'non_reserved_wildcard':
      counts.nonReservedWildcard += 1;
      break;
    case 'malformed_key':
      counts.malformedKey += 1;
      break;
  }

  if (!analysis.effectValid) {
    counts.invalidEffect += 1;
  }
}

function matchesUserFilter(
  userId: string,
  username: string | null,
  filters: string[],
): boolean {
  if (filters.length === 0) {
    return true;
  }

  return filters.includes(userId) || (username !== null && filters.includes(username));
}

async function auditSchemaSnapshots(
  prisma: PrismaClient,
  redis: Redis,
  schemaName: string,
  options: CliOptions,
): Promise<SchemaSnapshotAudit> {
  const parsedKeys = (await scanKeys(redis, `perm:${schemaName}:*`))
    .map((snapshotKey) => parseSnapshotKey(snapshotKey, schemaName))
    .filter((snapshot): snapshot is SnapshotKeyInfo => snapshot !== null);

  const uniqueUserIds = [...new Set(parsedKeys.map((snapshot) => snapshot.userId))];
  const usernameMap = await getUsernameMap(prisma, schemaName, uniqueUserIds);

  const filteredKeys = parsedKeys.filter((snapshot) =>
    matchesUserFilter(snapshot.userId, usernameMap.get(snapshot.userId) ?? null, options.users),
  ).sort((left, right) => left.snapshotKey.localeCompare(right.snapshotKey));

  const matchedUserFilters = new Set<string>();
  for (const snapshot of filteredKeys) {
    matchedUserFilters.add(snapshot.userId);

    const username = usernameMap.get(snapshot.userId);
    if (username) {
      matchedUserFilters.add(username);
    }
  }

  const users = new Map<string, UserSnapshotAudit>();
  const schemaCounts = createEmptyCounts();
  let totalFields = 0;
  let anomalyFieldCount = 0;

  for (const snapshot of filteredKeys) {
    const hash = await redis.hgetall(snapshot.snapshotKey);
    const counts = createEmptyCounts();
    const anomalies: SnapshotFieldAnomaly[] = [];

    for (const [field, value] of Object.entries(hash)) {
      totalFields += 1;
      const analysis = analyzeSnapshotField(field, value);
      incrementCounts(counts, analysis);

      const isAnomalous =
        (analysis.classification !== 'canonical_valid' &&
          analysis.classification !== 'reserved_wildcard') ||
        !analysis.effectValid;

      if (isAnomalous) {
        anomalyFieldCount += 1;
      }

      if (
        analysis.classification !== 'canonical_valid' &&
        analysis.classification !== 'reserved_wildcard'
      ) {
        anomalies.push({
          field,
          value,
          classification: analysis.classification,
          reason: analysis.reason,
          effectValid: analysis.effectValid,
        });
      } else if (!analysis.effectValid) {
        anomalies.push({
          field,
          value,
          classification: 'invalid_effect',
          reason: 'Effect must be grant or deny.',
          effectValid: false,
        });
      }
    }

    mergeCounts(schemaCounts, counts);

    const username = usernameMap.get(snapshot.userId) ?? null;
    const snapshotAudit: SnapshotAudit = {
      snapshotKey: snapshot.snapshotKey,
      userId: snapshot.userId,
      username,
      scopeType: snapshot.scopeType,
      scopeId: snapshot.scopeId,
      totalFields: Object.keys(hash).length,
      anomalyFieldCount: anomalies.length,
      counts: cloneCounts(counts),
      anomalies,
    };

    const existingUserAudit = users.get(snapshot.userId);
    if (existingUserAudit) {
      existingUserAudit.snapshotCount += 1;
      existingUserAudit.totalFields += snapshotAudit.totalFields;
      existingUserAudit.anomalyFieldCount += snapshotAudit.anomalyFieldCount;
      mergeCounts(existingUserAudit.counts, counts);
      existingUserAudit.snapshots.push(snapshotAudit);
    } else {
      users.set(snapshot.userId, {
        userId: snapshot.userId,
        username,
        readiness: getReadiness(counts),
        snapshotCount: 1,
        totalFields: snapshotAudit.totalFields,
        anomalyFieldCount: snapshotAudit.anomalyFieldCount,
        counts: cloneCounts(counts),
        snapshots: [snapshotAudit],
      });
    }
  }

  return {
    schemaName,
    readiness: getReadiness(schemaCounts),
    snapshotCount: filteredKeys.length,
    userCount: users.size,
    totalFields,
    anomalyFieldCount,
    counts: schemaCounts,
    unmatchedUserFilters: options.users.filter((filter) => !matchedUserFilters.has(filter)),
    users: [...users.values()].sort((left, right) => {
      const leftName = left.username ?? left.userId;
      const rightName = right.username ?? right.userId;
      return leftName.localeCompare(rightName);
    }),
  };
}

async function auditPermissionSnapshots(options: CliOptions): Promise<SnapshotAuditSummary> {
  const prisma = new PrismaClient();
  const redis = new Redis(REDIS_URL);

  try {
    const schemaNames = await getTargetSchemas(prisma, options);
    const audited: SchemaSnapshotAudit[] = [];
    const skipped: SkippedSchemaAudit[] = [];

    for (const schemaName of schemaNames) {
      const failureReason = await getSchemaAuditFailureReason(prisma, schemaName);

      if (failureReason) {
        skipped.push({ schemaName, reason: failureReason });
        continue;
      }

      audited.push(await auditSchemaSnapshots(prisma, redis, schemaName, options));
    }

    return {
      filters: {
        schemas: options.schemas,
        users: options.users,
      },
      audited,
      skipped,
    };
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

function printCounts(prefix: string, counts: ClassificationCounts): void {
  console.log(`${prefix}canonical valid: ${counts.canonicalValid}`);
  console.log(`${prefix}reserved wildcard: ${counts.reservedWildcard}`);
  console.log(`${prefix}legacy resource: ${counts.legacyResource}`);
  console.log(`${prefix}invalid action: ${counts.invalidAction}`);
  console.log(`${prefix}unsupported action: ${counts.unsupportedAction}`);
  console.log(`${prefix}non-reserved wildcard: ${counts.nonReservedWildcard}`);
  console.log(`${prefix}malformed key: ${counts.malformedKey}`);
  console.log(`${prefix}invalid effect: ${counts.invalidEffect}`);
}

function printSummary(summary: SnapshotAuditSummary): void {
  console.log('🔎 Auditing Redis permission snapshot fields...\n');

  if (summary.filters.schemas.length > 0) {
    console.log(`Schema filter: ${summary.filters.schemas.join(', ')}`);
  }

  if (summary.filters.users.length > 0) {
    console.log(`User filter: ${summary.filters.users.join(', ')}`);
  }

  for (const schemaAudit of summary.audited) {
    console.log(`\nSchema: ${schemaAudit.schemaName}`);
    console.log(`- snapshots audited: ${schemaAudit.snapshotCount}`);
    console.log(`- users matched: ${schemaAudit.userCount}`);
    console.log(`- total fields: ${schemaAudit.totalFields}`);
    console.log(`- anomalous fields: ${schemaAudit.anomalyFieldCount}`);
    console.log(`- readiness: ${schemaAudit.readiness}`);
    printCounts('- ', schemaAudit.counts);

    if (schemaAudit.unmatchedUserFilters.length > 0) {
      console.log(`- unmatched user filters: ${schemaAudit.unmatchedUserFilters.join(', ')}`);
    }

    const anomalousUsers = schemaAudit.users.filter((userAudit) => userAudit.anomalyFieldCount > 0);

    if (anomalousUsers.length === 0) {
      console.log('  No anomalous snapshot fields detected.');
      continue;
    }

    for (const userAudit of anomalousUsers) {
      console.log(`  User: ${userAudit.username ?? 'unknown'} (${userAudit.userId})`);
      console.log(`  - readiness: ${userAudit.readiness}`);
      console.log(`  - snapshots: ${userAudit.snapshotCount}`);
      console.log(`  - anomalous fields: ${userAudit.anomalyFieldCount}`);

      for (const snapshot of userAudit.snapshots.filter((item) => item.anomalyFieldCount > 0)) {
        console.log(`    Snapshot: ${snapshot.snapshotKey}`);

        for (const anomaly of snapshot.anomalies) {
          console.log(
            `    - ${anomaly.field}=${anomaly.value} [${anomaly.classification}]${anomaly.effectValid ? '' : ' [invalid effect]'}: ${anomaly.reason}`,
          );
        }
      }
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
  const options = parseCliArgs(process.argv.slice(2));
  const summary = await auditPermissionSnapshots(options);

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  printSummary(summary);
}

function isDirectExecution(): boolean {
  if (!process.argv[1]) {
    return false;
  }

  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectExecution()) {
  main().catch((error) => {
    console.error('Error auditing permission snapshots:', error);
    process.exit(1);
  });
}
