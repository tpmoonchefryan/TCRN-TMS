// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface RequiredColumn {
  tableName: string;
  columnName: string;
}

export interface InferredRolloutArtifacts {
  sourceMigrations: string[];
  requiredTables: string[];
  requiredColumns: RequiredColumn[];
  requiredIndexes: string[];
  requiredAbsentTables: string[];
  requiredAbsentColumns: RequiredColumn[];
  requiredAbsentIndexes: string[];
}

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MIGRATIONS_DIR = path.join(CURRENT_DIR, '../prisma/migrations');
const TENANT_SCHEMA_PATTERN = String.raw`(?:"?tenant_template"?|%I)`;
const TENANT_OBJECT_PATTERN = String.raw`${TENANT_SCHEMA_PATTERN}\s*\.\s*"?([A-Za-z_][A-Za-z0-9_]*)"?`;

const CREATE_TABLE_REGEX = new RegExp(
  String.raw`CREATE TABLE IF NOT EXISTS\s+${TENANT_OBJECT_PATTERN}`,
  'gi'
);
const DROP_TABLE_REGEX = new RegExp(
  String.raw`DROP TABLE(?: IF EXISTS)?\s+${TENANT_OBJECT_PATTERN}`,
  'gi'
);
const CREATE_INDEX_REGEX = new RegExp(
  String.raw`CREATE(?: UNIQUE)? INDEX(?: IF NOT EXISTS)?\s+"?([A-Za-z_][A-Za-z0-9_]*)"?\s+ON\s+${TENANT_OBJECT_PATTERN}`,
  'gi'
);
const DROP_INDEX_REGEX = new RegExp(
  String.raw`DROP INDEX(?: IF EXISTS)?\s+${TENANT_OBJECT_PATTERN}`,
  'gi'
);
const ALTER_INDEX_RENAME_REGEX = new RegExp(
  String.raw`ALTER INDEX\s+${TENANT_OBJECT_PATTERN}\s+RENAME TO\s+"?([A-Za-z_][A-Za-z0-9_]*)"?`,
  'gi'
);
const ALTER_TABLE_REGEX = new RegExp(
  String.raw`ALTER TABLE\s+${TENANT_OBJECT_PATTERN}([\s\S]*?);`,
  'gi'
);
const ADD_COLUMN_REGEX = /ADD COLUMN(?: IF NOT EXISTS)?\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/gi;
const DROP_COLUMN_REGEX = /DROP COLUMN(?: IF EXISTS)?\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/gi;

type ArtifactKind = 'table' | 'column' | 'index';
type ArtifactPresence = 'present' | 'absent';

interface ArtifactOperation {
  kind: ArtifactKind;
  presence: ArtifactPresence;
  tableName?: string;
  columnName?: string;
  name: string;
  position: number;
}

function compareRequiredColumns(a: RequiredColumn, b: RequiredColumn): number {
  const tableComparison = a.tableName.localeCompare(b.tableName);

  if (tableComparison !== 0) {
    return tableComparison;
  }

  return a.columnName.localeCompare(b.columnName);
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function uniqueSortedColumns(values: Iterable<RequiredColumn>): RequiredColumn[] {
  return [...values]
    .filter(
      (value, currentIndex, items) =>
        items.findIndex(
          (candidate) =>
            candidate.tableName === value.tableName && candidate.columnName === value.columnName
        ) === currentIndex
    )
    .sort(compareRequiredColumns);
}

function applyArtifactState(
  operations: readonly ArtifactOperation[]
): Omit<InferredRolloutArtifacts, 'sourceMigrations'> {
  const presentTables = new Set<string>();
  const absentTables = new Set<string>();
  const presentColumns = new Map<string, RequiredColumn>();
  const absentColumns = new Map<string, RequiredColumn>();
  const presentIndexes = new Set<string>();
  const absentIndexes = new Set<string>();

  const sortedOperations = [...operations].sort((left, right) => left.position - right.position);

  for (const operation of sortedOperations) {
    if (operation.kind === 'table') {
      if (operation.presence === 'present') {
        absentTables.delete(operation.name);
        presentTables.add(operation.name);
      } else {
        presentTables.delete(operation.name);
        absentTables.add(operation.name);
      }

      continue;
    }

    if (operation.kind === 'index') {
      if (operation.presence === 'present') {
        absentIndexes.delete(operation.name);
        presentIndexes.add(operation.name);
      } else {
        presentIndexes.delete(operation.name);
        absentIndexes.add(operation.name);
      }

      continue;
    }

    const columnKey = `${operation.tableName}.${operation.columnName}`;
    const column = {
      tableName: operation.tableName ?? '',
      columnName: operation.columnName ?? '',
    };

    if (operation.presence === 'present') {
      absentColumns.delete(columnKey);
      presentColumns.set(columnKey, column);
    } else {
      presentColumns.delete(columnKey);
      absentColumns.set(columnKey, column);
    }
  }

  return {
    requiredTables: uniqueSorted(presentTables),
    requiredColumns: uniqueSortedColumns(presentColumns.values()),
    requiredIndexes: uniqueSorted(presentIndexes),
    requiredAbsentTables: uniqueSorted(absentTables),
    requiredAbsentColumns: uniqueSortedColumns(absentColumns.values()),
    requiredAbsentIndexes: uniqueSorted(absentIndexes),
  };
}

export function inferRolloutArtifactsFromSql(
  sql: string
): Omit<InferredRolloutArtifacts, 'sourceMigrations'> {
  const operations: ArtifactOperation[] = [];

  for (const match of sql.matchAll(CREATE_TABLE_REGEX)) {
    operations.push({
      kind: 'table',
      presence: 'present',
      name: match[1],
      position: match.index ?? 0,
    });
  }

  for (const match of sql.matchAll(DROP_TABLE_REGEX)) {
    operations.push({
      kind: 'table',
      presence: 'absent',
      name: match[1],
      position: match.index ?? 0,
    });
  }

  for (const match of sql.matchAll(CREATE_INDEX_REGEX)) {
    operations.push({
      kind: 'index',
      presence: 'present',
      name: match[1],
      position: match.index ?? 0,
    });
  }

  for (const match of sql.matchAll(DROP_INDEX_REGEX)) {
    operations.push({
      kind: 'index',
      presence: 'absent',
      name: match[1],
      position: match.index ?? 0,
    });
  }

  for (const match of sql.matchAll(ALTER_INDEX_RENAME_REGEX)) {
    operations.push({
      kind: 'index',
      presence: 'present',
      name: match[2],
      position: match.index ?? 0,
    });
  }

  for (const match of sql.matchAll(ALTER_TABLE_REGEX)) {
    const tableName = match[1];
    const alterBody = match[2];
    const alterTablePosition = match.index ?? 0;

    for (const columnMatch of alterBody.matchAll(ADD_COLUMN_REGEX)) {
      operations.push({
        kind: 'column',
        presence: 'present',
        tableName,
        columnName: columnMatch[1],
        name: `${tableName}.${columnMatch[1]}`,
        position: alterTablePosition + (columnMatch.index ?? 0),
      });
    }

    for (const columnMatch of alterBody.matchAll(DROP_COLUMN_REGEX)) {
      operations.push({
        kind: 'column',
        presence: 'absent',
        tableName,
        columnName: columnMatch[1],
        name: `${tableName}.${columnMatch[1]}`,
        position: alterTablePosition + (columnMatch.index ?? 0),
      });
    }
  }

  return applyArtifactState(operations);
}

export function inferRolloutArtifactsFromMigrations(
  migrationNames: string[],
  migrationsDir = DEFAULT_MIGRATIONS_DIR
): InferredRolloutArtifacts {
  const normalizedMigrationNames = uniqueSorted(migrationNames);
  const operations: ArtifactOperation[] = [];

  normalizedMigrationNames.forEach((migrationName, migrationIndex) => {
    const migrationPath = path.join(migrationsDir, migrationName, 'migration.sql');

    if (!fs.existsSync(migrationPath)) {
      throw new Error(
        `Unable to infer rollout artifacts. Missing migration file: ${migrationPath}`
      );
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    const inferred = inferRolloutArtifactsFromSql(sql);

    operations.push(
      ...inferred.requiredTables.map((tableName) => ({
        kind: 'table' as const,
        presence: 'present' as const,
        name: tableName,
        position: migrationIndex,
      })),
      ...inferred.requiredAbsentTables.map((tableName) => ({
        kind: 'table' as const,
        presence: 'absent' as const,
        name: tableName,
        position: migrationIndex,
      })),
      ...inferred.requiredColumns.map((column) => ({
        kind: 'column' as const,
        presence: 'present' as const,
        tableName: column.tableName,
        columnName: column.columnName,
        name: `${column.tableName}.${column.columnName}`,
        position: migrationIndex,
      })),
      ...inferred.requiredAbsentColumns.map((column) => ({
        kind: 'column' as const,
        presence: 'absent' as const,
        tableName: column.tableName,
        columnName: column.columnName,
        name: `${column.tableName}.${column.columnName}`,
        position: migrationIndex,
      })),
      ...inferred.requiredIndexes.map((indexName) => ({
        kind: 'index' as const,
        presence: 'present' as const,
        name: indexName,
        position: migrationIndex,
      })),
      ...inferred.requiredAbsentIndexes.map((indexName) => ({
        kind: 'index' as const,
        presence: 'absent' as const,
        name: indexName,
        position: migrationIndex,
      }))
    );
  });

  const mergedArtifacts = applyArtifactState(operations);

  return {
    sourceMigrations: normalizedMigrationNames,
    ...mergedArtifacts,
  };
}
